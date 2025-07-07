const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // Ensure this path is correct
            contextIsolation: false, // Disable for communication between renderer and preload
            enableRemoteModule: true, // Enable remote module if needed
            nodeIntegration: false, // Disables Node.js in renderer for security
            webSecurity: false, // Disable web security to access external resources
            sandbox: false // Allows inline scripts if needed
        }
    });

    // Verify `preload.js` exists
    const preloadPath = path.join(__dirname, 'preload.js');
    if (!fs.existsSync(preloadPath)) {
        console.error(`preload.js not found at ${preloadPath}`);
    }

    // Load Google or any external URL instead of a local HTML file
    win.loadURL('https://www.google.com')
        .then(() => console.log("Page loaded successfully"))
        .catch((error) => console.error("Failed to load page:", error));

    // Log console messages from the renderer for easier debugging
    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer] ${message} (Level: ${level}, Line: ${line}, Source: ${sourceId})`);
    });
}

// Handle Electron lifecycle events
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
