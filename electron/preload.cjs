const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Open a single ICS file in Outlook
  openIcsInOutlook: (icsContent, fileName) => 
    ipcRenderer.invoke('open-ics-in-outlook', { icsContent, fileName }),
  
  // Open multiple ICS files in Outlook (batch processing)
  openMultipleIcsInOutlook: (files) => 
    ipcRenderer.invoke('open-multiple-ics-in-outlook', files),
  
  // Check if running in Electron environment
  isElectron: () => ipcRenderer.invoke('is-electron'),
});
