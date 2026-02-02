const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require("child_process");

// Note: electron-squirrel-startup is not needed for NSIS installers

// Lazy-load winax only on Windows when needed
let winax = null;
function getWinax() {
  if (process.platform !== 'win32') {
    throw new Error('Outlook COM is only available on Windows');
  }
  if (!winax) {
    try {
      winax = require('winax');
    } catch (err) {
      throw new Error('winax module not available. Please install: npm install winax');
    }
  }
  return winax;
}

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    title: 'Küchendienst-Planer',
  });

  // In development, load from Vite dev server
  // In production, load from built files
  if (process.env.NODE_ENV === "development") {
   mainWindow.loadURL("http://localhost:8080");
   mainWindow.webContents.openDevTools();
 } else {
   mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
 }

};

// IPC Handler: Save ICS file to temp directory and open with default app (Outlook)
ipcMain.handle('open-ics-in-outlook', async (event, { icsContent, fileName }) => {
  try {
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, fileName);
    
    // Write the ICS file
    fs.writeFileSync(filePath, icsContent, 'utf8');
    
    // Open with default application (Outlook for .ics files)
    await shell.openPath(filePath);
    
    return { success: true, filePath };
  } catch (error) {
    console.error('Error opening ICS file:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler: Open multiple ICS files for batch processing
ipcMain.handle('open-multiple-ics-in-outlook', async (event, files) => {
  const results = [];
  const tempDir = os.tmpdir();
  
  for (const { icsContent, fileName } of files) {
    try {
      const filePath = path.join(tempDir, fileName);
      fs.writeFileSync(filePath, icsContent, 'utf8');
      await shell.openPath(filePath);
      results.push({ fileName, success: true, filePath });
      
      // Small delay between opening files to not overwhelm Outlook
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      results.push({ fileName, success: false, error: error.message });
    }
  }
  
  return results;
});

// IPC Handler: Check if running in Electron
ipcMain.handle('is-electron', () => true);

// IPC Handler: Check if Windows platform
ipcMain.handle('is-windows', () => process.platform === 'win32');

// IPC Handler: Send Outlook meeting requests via COM/OOM (Windows only)
ipcMain.handle('send-outlook-meeting-requests', async (event, payload) => {
  const { displayOnly = false, items } = payload;
  
  if (process.platform !== 'win32') {
    return { 
      success: false, 
      error: 'Diese Funktion ist nur unter Windows mit Outlook Desktop verfügbar.' 
    };
  }

  if (!items || items.length === 0) {
    return { success: false, error: 'Keine Termine zum Senden.' };
  }

  try {
    const WinaxModule = getWinax();
    
    // Create Outlook Application object via COM
    function runPowerShell(script) {
      return new Promise((resolve, reject) => {
        const ps = spawn(
          "powershell.exe",
          ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
          { windowsHide: true }
        );

        let stdout = "";
        let stderr = "";

        ps.stdout.on("data", (d) => (stdout += d.toString()));
        ps.stderr.on("data", (d) => (stderr += d.toString()));

        ps.on("close", (code) => {
          if (code === 0) resolve({ stdout, stderr });
          else reject(new Error(stderr || stdout));
        });
      });
    }

    function psEscape(s) {
      return String(s ?? "").replace(/'/g, "''");
    }

    ipcMain.handle("send-outlook-meeting-requests", async (_event, payload) => {
      try {
        if (process.platform !== "win32") {
          return {
            success: false,
            error: "Outlook Versand ist nur unter Windows möglich.",
          };
        }

        const items = payload.items || [];
        const displayOnly = !!payload.displayOnly;

        const results = [];

        for (const item of items) {
          const subject = psEscape(item.subject || "Küchendienst");
          const body = psEscape(item.body || "");
          const startISO = psEscape(item.startISO);
          const endISO = psEscape(item.endISO);

          const attendees = (item.attendees || []).filter(Boolean).map(psEscape);

          if (!attendees.length) {
            results.push({
              success: false,
              date: item.date,
              error: "Keine Empfänger-Mailadresse",
            });
            continue;
          }

          const psScript = `
    $ErrorActionPreference = "Stop";
    $outlook = New-Object -ComObject Outlook.Application;

    $appt = $outlook.CreateItem(1);
    $appt.Subject = '${subject}';
    $appt.Body = '${body}';

    $appt.AllDayEvent = $true;
    $appt.Start = [DateTime]::Parse('${startISO}');
    $appt.End   = [DateTime]::Parse('${endISO}');

    $appt.MeetingStatus = 1;

    ${attendees
      .map(
        (a) => `$r = $appt.Recipients.Add('${a}'); $r.Type = 1;`
      )
      .join("\n")}

    $null = $appt.Recipients.ResolveAll();

    if (${displayOnly ? "$true" : "$false"}) {
      $appt.Display();
    } else {
      $appt.Send();
    }

    "OK";
    `;

          try {
            await runPowerShell(psScript);

            results.push({
              success: true,
              date: item.date,
              attendee: attendees[0],
            });
          } catch (err) {
            results.push({
              success: false,
              date: item.date,
              error: String(err.message || err),
            });
          }
        }

        return { success: true, results };
      } catch (error) {
        return { success: false, error: String(error.message || error) };
      }
    });


app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
