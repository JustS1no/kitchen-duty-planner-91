const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
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
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    title: 'Küchendienst-Planer',
  });

  // In development, load from Vite dev server
  // In production, load from built files
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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
