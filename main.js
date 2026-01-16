const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { processAudioFile, batchProcessDirectory } = require('./src/audioProcessor');

let mainWindow;
let splashWindow;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: true, // Show splash immediately
    backgroundColor: '#121212',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const splashPath = path.join(__dirname, 'splash.html');
  splashWindow.loadFile(splashPath);
  splashWindow.center();
  splashWindow.setSkipTaskbar(true);
  
  // Log errors
  splashWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Splash screen failed to load:', errorCode, errorDescription);
  });
  
  splashWindow.webContents.on('did-finish-load', () => {
    console.log('Splash screen loaded successfully');
  });
  
  // Debug: Open DevTools for splash (remove in production)
  if (process.argv.includes('--dev')) {
    splashWindow.webContents.openDevTools();
  }
  
  // Return a promise that resolves when splash is ready
  return new Promise((resolve) => {
    splashWindow.webContents.once('did-finish-load', () => {
      resolve();
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    show: false, // Keep hidden until ready - DO NOT SHOW YET
    title: "Track Trimmer Pro",
    icon: path.join(__dirname, 'build/icon.ico'),
    backgroundColor: '#121212',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Hide menu bar for cleaner, professional look
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile('index.html');

  // Open DevTools in development (or always for debugging)
  // Uncomment the line below to always show DevTools
  // mainWindow.webContents.openDevTools();
  
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
  
  // Log errors to console
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // Show main window and close splash when ready
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      mainWindow.show(); // Show main window first
      setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close(); // Close splash 100ms later
        }
      }, 100);
    }, 2000);
  });
}

app.whenReady().then(async () => {
  // Create and show splash window first
  await createSplashWindow();
  // Then create main window (hidden)
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma', 'mp4'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('save-file', async (event, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultPath,
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma', 'mp4'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePath) {
    return result.filePath;
  }
  return null;
});

ipcMain.handle('process-audio', async (event, options) => {
  try {
    // Check if output would overwrite input
    if (options.inputPath === options.outputPath) {
      return { success: false, error: 'Output file would overwrite input file. Please choose a different output location.' };
    }
    
    const result = await processAudioFile(
      options.inputPath,
      options.outputPath,
      options.startTime,
      options.endTime,
      options.fadeInDuration || 0,
      options.fadeOutDuration || 0,
      options.normalizeVolume || false,
      options.outputFormat || 'same',
      options.audioBitrate || 'auto',
      options.sampleRate || 'auto'
    );
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('scan-folder', async (event, folderPath) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma', '.mp4'];
    const files = await fs.readdir(folderPath);
    
    const audioFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return audioExtensions.includes(ext);
      })
      .map(file => ({
        name: file,
        ext: path.extname(file).toLowerCase().substring(1).toUpperCase()
      }));
    
    return { success: true, files: audioFiles };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('batch-process', async (event, options) => {
  try {
    const results = await batchProcessDirectory(
      options.inputDir,
      options.outputDir,
      options.startTime,
      options.endTime,
      options.fadeInDuration || 0,
      options.fadeOutDuration || 0,
      options.normalizeVolume || false,
      options.outputFormat || 'same',
      options.audioBitrate || 'auto',
      options.sampleRate || 'auto',
      (options.filenamePrefix !== undefined && options.filenamePrefix !== null) ? String(options.filenamePrefix) : '',
      (options.filenameSuffix !== undefined && options.filenameSuffix !== null) ? String(options.filenameSuffix) : '',
      (progress) => {
        // Send progress updates to renderer
        mainWindow.webContents.send('batch-progress', progress);
      }
    );
    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-output-folder', async (event, folderPath) => {
  try {
    await shell.openPath(folderPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


