const { app, BrowserWindow, globalShortcut, clipboard, Tray, Menu, ipcMain, screen, dialog } = require('electron');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');
const { PROVIDERS, loadSettings, saveSettings } = require('./store');
const { correctWithAI, listModels } = require('./aiProvider');

let tray = null;
let popupWindow = null;
let trayWindow = null;
let settingsWindow = null;

// --- macOS keystroke simulation via System Events (kræver Accessibility-tilladelse) ---

function simulateCopy() {
  execFileSync('osascript', ['-e', 'tell application "System Events" to keystroke "c" using command down']);
}

function simulatePaste() {
  execFileSync('osascript', ['-e', 'tell application "System Events" to keystroke "v" using command down']);
}

// --- LanguageTool (gratis grammatik-/stavekontrol API - standard-udbyder, kræver ingen nøgle) ---

function checkGrammar(text) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      text,
      language: 'auto'
    }).toString();

    const options = {
      hostname: 'api.languagetool.org',
      path: '/v2/check',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function applyCorrections(text, matches) {
  let result = text;
  const sorted = [...matches].sort((a, b) => b.offset - a.offset);
  for (const m of sorted) {
    if (m.replacements && m.replacements.length > 0) {
      const replacement = m.replacements[0].value;
      result = result.slice(0, m.offset) + replacement + result.slice(m.offset + m.length);
    }
  }
  return result;
}

// --- Fælles tekstretning: vælger udbyder (LanguageTool eller en AI-udbyder via ai-sdk.dev) ---
// mode: 'spelling' (ret kun stavefejl, bevar formatering/budskab) eller 'polish' (giv teksten en rød tråd)

async function correctText(text, mode) {
  const settings = loadSettings();
  const providerId = settings.activeProvider;

  if (providerId === 'languagetool') {
    if (mode === 'polish') {
      throw new Error('Finpudsning kræver en AI-udbyder. Vælg en i Indstillinger.');
    }
    const result = await checkGrammar(text);
    const matches = result.matches || [];
    const corrected = applyCorrections(text, matches);
    return { corrected, matches };
  }

  const providerMeta = PROVIDERS[providerId];
  const providerSettings = settings.providers[providerId];

  if (!providerMeta || !providerSettings) {
    throw new Error('Ukendt sprogmodel-udbyder: ' + providerId);
  }
  if (!providerSettings.apiKey) {
    throw new Error('Der mangler en API-nøgle til ' + providerMeta.label + '. Tilføj den i Indstillinger.');
  }
  if (!providerSettings.model) {
    throw new Error('Der mangler en model for ' + providerMeta.label + '. Vælg en i Indstillinger.');
  }

  const corrected = await correctWithAI(providerId, providerSettings, text, mode);
  return { corrected, matches: [] };
}

// --- Popup-vindue med rettelser (bruges af genvejene paa markeret tekst) ---

function createPopup(original, corrected, matches, mode) {
  if (popupWindow) {
    popupWindow.close();
  }

  const cursor = screen.getCursorScreenPoint();

  popupWindow = new BrowserWindow({
    width: 480,
    height: 380,
    x: Math.max(0, cursor.x - 240),
    y: Math.max(0, cursor.y - 20),
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  popupWindow.loadFile('popup.html');

  popupWindow.once('ready-to-show', () => {
    popupWindow.show();
    popupWindow.webContents.send('data', { original, corrected, matches, mode });
  });

  popupWindow.on('blur', () => {
    if (popupWindow) popupWindow.close();
  });

  popupWindow.on('closed', () => {
    popupWindow = null;
  });
}

// --- Lille vindue i menu-baren til manuel tekstretning ---

function createTrayWindow() {
  trayWindow = new BrowserWindow({
    width: 380,
    height: 360,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  trayWindow.loadFile('trayWindow.html');

  trayWindow.on('blur', () => {
    if (trayWindow) trayWindow.hide();
  });
}

function toggleTrayWindow() {
  if (!trayWindow) {
    createTrayWindow();
  }

  if (trayWindow.isVisible()) {
    trayWindow.hide();
    return;
  }

  const trayBounds = tray.getBounds();
  const windowBounds = trayWindow.getBounds();
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
  const y = Math.round(trayBounds.y + trayBounds.height);
  trayWindow.setPosition(x, y, false);
  trayWindow.show();
  trayWindow.focus();
  trayWindow.webContents.send('refresh-active-model');
}

// --- Indstillingsvindue: vælg udbyder/model og indsæt API-nøgler ---

function createOrShowSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 440,
    height: 520,
    resizable: false,
    title: 'Indstillinger',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadFile('settings.html');

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

ipcMain.handle('correct-text', async (event, { text, mode }) => {
  if (!text || text.trim().length === 0) {
    return { corrected: '', matches: [] };
  }
  return correctText(text, mode);
});

ipcMain.handle('get-settings-data', () => {
  return { settings: loadSettings(), providers: PROVIDERS };
});

ipcMain.handle('save-settings', (event, newSettings) => {
  saveSettings(newSettings);
  return true;
});

ipcMain.handle('list-models', async (event, { providerId, apiKey }) => {
  try {
    const models = await listModels(providerId, apiKey);
    return { models };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.on('open-settings', () => {
  createOrShowSettingsWindow();
});

ipcMain.on('accept', (event, correctedText) => {
  clipboard.writeText(correctedText);
  if (popupWindow) popupWindow.close();
  // Giv fokus tilbage til forrige app, sæt derefter paste
  setTimeout(() => {
    try {
      simulatePaste();
    } catch (err) {
      console.error('Paste fejlede:', err);
    }
  }, 200);
});

ipcMain.on('close-popup', () => {
  if (popupWindow) popupWindow.close();
});

ipcMain.on('hide-tray-window', () => {
  if (trayWindow) trayWindow.hide();
});

async function handleShortcut(mode) {
  try {
    simulateCopy();
  } catch (err) {
    console.error('Kopiering fejlede - har appen Accessibility-tilladelse?', err);
    return;
  }

  // Vent til udklipsholderen er opdateret
  await new Promise((resolve) => setTimeout(resolve, 200));

  const selectedText = clipboard.readText();

  if (!selectedText || selectedText.trim().length === 0) {
    return;
  }

  try {
    const { corrected, matches } = await correctText(selectedText, mode);
    if (corrected.trim() === selectedText.trim()) {
      return; // ingen ændringer - gør ikke noget
    }
    createPopup(selectedText, corrected, matches, mode);
  } catch (err) {
    console.error('Tekstretning fejlede:', err);
    dialog.showErrorBox('Kunne ikke rette teksten', err.message);
  }
}

app.whenReady().then(() => {
  app.dock.hide();

  tray = new Tray(path.join(__dirname, 'iconTemplate.png'));
  tray.setToolTip('AI Værktøj v' + app.getVersion() + ' (Cmd+Shift+G)');
  const menu = Menu.buildFromTemplate([
    { label: 'AI Værktøj v' + app.getVersion(), enabled: false },
    { type: 'separator' },
    { label: 'Ret stavefejl i markeret tekst (Cmd+Shift+G)', click: () => handleShortcut('spelling') },
    { label: 'Finpuds markeret tekst (Cmd+Shift+F)', click: () => handleShortcut('polish') },
    { type: 'separator' },
    { label: 'Åbn vindue', click: toggleTrayWindow },
    { label: 'Indstillinger...', click: createOrShowSettingsWindow },
    { type: 'separator' },
    { label: 'Afslut', click: () => app.quit() }
  ]);
  tray.on('click', toggleTrayWindow);
  tray.on('right-click', () => tray.popUpContextMenu(menu));

  const registeredSpelling = globalShortcut.register('Command+Shift+G', () => handleShortcut('spelling'));
  if (!registeredSpelling) {
    console.error('Kunne ikke registrere Cmd+Shift+G - tasten er måske optaget af en anden app');
  }

  const registeredPolish = globalShortcut.register('Command+Shift+F', () => handleShortcut('polish'));
  if (!registeredPolish) {
    console.error('Kunne ikke registrere Cmd+Shift+F - tasten er måske optaget af en anden app');
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e) => {
  e.preventDefault(); // bliv kørende i menu-baren
});
