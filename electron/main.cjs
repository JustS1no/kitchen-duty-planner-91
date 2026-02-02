const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

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
    const outlook = new WinaxModule.Object('Outlook.Application');
    const results = [];

    for (const item of items) {
      try {
        // CreateItem(1) = olAppointmentItem
        const appointment = outlook.CreateItem(1);
        
        // Set basic properties
        appointment.Subject = item.subject || 'Küchendienst';
        appointment.Body = item.body || '';
        if (item.location) {
          appointment.Location = item.location;
        }
        
        // Configure as all-day event
        appointment.AllDayEvent = true;
        
        // Set start date (midnight of the duty date)
        const startDate = new Date(item.startISO);
        appointment.Start = startDate;
        
        // Set end date (midnight of the next day for all-day events)
        const endDate = new Date(item.endISO);
        appointment.End = endDate;
        
        // Set as Meeting Request (MeetingStatus = 1 = olMeeting)
        appointment.MeetingStatus = 1;
        
        // Add attendees
        if (item.attendees && item.attendees.length > 0) {
          for (const email of item.attendees) {
            if (email) {
              const recipient = appointment.Recipients.Add(email);
              // Type 1 = olRequired (required attendee)
              recipient.Type = 1;
            }
          }
          
          // Resolve all recipients
          const resolved = appointment.Recipients.ResolveAll();
          if (!resolved) {
            console.warn('Not all recipients could be resolved for:', item.subject);
          }
        }
        
        if (displayOnly) {
          // Just display the meeting, don't send
          appointment.Display();
          results.push({ 
            date: item.date, 
            success: true, 
            action: 'displayed' 
          });
        } else {
          // Send the meeting request
          appointment.Send();
          results.push({ 
            date: item.date, 
            success: true, 
            action: 'sent' 
          });
        }
        
        // Small delay between items to not overwhelm Outlook
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (itemError) {
        results.push({ 
          date: item.date, 
          success: false, 
          error: itemError.message 
        });
      }
    }
    
    return { 
      success: results.every(r => r.success), 
      results 
    };
    
  } catch (error) {
    console.error('Outlook COM error:', error);
    return { 
      success: false, 
      error: `Outlook COM Fehler: ${error.message}. Stellen Sie sicher, dass Outlook Desktop installiert und geöffnet ist.` 
    };
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
