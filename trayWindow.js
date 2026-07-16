const inputEl = document.getElementById('input');
const statusEl = document.getElementById('status');
const activeModelEl = document.getElementById('activeModel');
const settingsBtn = document.getElementById('settings');

const allButtons = document.querySelectorAll('.split-main, .split-caret, .split-menu button');

function setBusy(busy) {
  allButtons.forEach((btn) => {
    btn.disabled = busy;
  });
}

// --- Vis tydeligt hvilken udbyder/model der bliver brugt lige nu ---

function formatProviderLabel(settings, providers) {
  const providerId = settings.activeProvider;
  const meta = providers[providerId];
  if (!meta) return '';
  if (!meta.needsApiKey) return meta.label;
  const model = (settings.providers[providerId] || {}).model;
  return meta.label + ' · ' + (model || 'ingen model valgt');
}

async function updateActiveModelLabel() {
  const { settings, providers } = await window.api.getSettingsData();
  activeModelEl.textContent = formatProviderLabel(settings, providers);
}

updateActiveModelLabel();
window.api.onRefreshActiveModel(updateActiveModelLabel);

// --- Rettelse af tekst ---

async function runCorrection(mode, { copyOutput }) {
  const text = inputEl.value;
  if (!text || text.trim().length === 0) {
    return;
  }

  const modeLabel = mode === 'polish' ? 'Tekst finpudset' : 'Stavefejl rettet';
  statusEl.textContent = 'Arbejder...';
  setBusy(true);

  try {
    const { corrected, matches } = await window.api.correctText(text, mode);
    inputEl.value = corrected;

    let message = matches && matches.length > 0 ? matches.length + ' rettelse(r) fundet' : modeLabel;

    if (copyOutput) {
      await navigator.clipboard.writeText(corrected);
      message += ' - kopieret til udklipsholder';
    }

    statusEl.textContent = message;
  } catch (err) {
    statusEl.textContent = err.message || 'Noget gik galt';
  } finally {
    setBusy(false);
  }
}

// --- Split-knapper: husker om "...og kopiér" var det seneste valg, og gør det til standard ---

function closeAllMenus() {
  document.querySelectorAll('.split-menu.open').forEach((m) => m.classList.remove('open'));
}

function getDefaultVariant(mode) {
  return localStorage.getItem('defaultVariant_' + mode) === 'copy' ? 'copy' : 'plain';
}

function setDefaultVariant(mode, variant) {
  localStorage.setItem('defaultVariant_' + mode, variant);
}

function setupSplitButton(prefix, mode, baseLabel) {
  const mainBtn = document.getElementById(prefix + 'Btn');
  const caretBtn = document.getElementById(prefix + 'Caret');
  const menuEl = document.getElementById(prefix + 'Menu');
  const altBtn = menuEl.querySelector('button');

  function sync() {
    const copyIsDefault = getDefaultVariant(mode) === 'copy';
    mainBtn.textContent = copyIsDefault ? baseLabel + ' og kopiér' : baseLabel;
    altBtn.textContent = copyIsDefault ? baseLabel + ' (uden kopiering)' : baseLabel + ' og kopiér output';
    mainBtn.dataset.copy = copyIsDefault ? 'true' : 'false';
    altBtn.dataset.copy = copyIsDefault ? 'false' : 'true';
  }

  sync();

  mainBtn.addEventListener('click', () => {
    runCorrection(mode, { copyOutput: mainBtn.dataset.copy === 'true' });
  });

  caretBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = menuEl.classList.contains('open');
    closeAllMenus();
    if (!wasOpen) menuEl.classList.add('open');
  });

  altBtn.addEventListener('click', () => {
    closeAllMenus();
    const chosenVariant = altBtn.dataset.copy === 'true' ? 'copy' : 'plain';
    setDefaultVariant(mode, chosenVariant);
    sync();
    runCorrection(mode, { copyOutput: chosenVariant === 'copy' });
  });
}

setupSplitButton('spelling', 'spelling', 'Ret stavefejl');
setupSplitButton('polish', 'polish', 'Finpuds tekst');

document.addEventListener('click', closeAllMenus);

settingsBtn.addEventListener('click', () => {
  window.api.openSettings();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAllMenus();
    window.api.hideTrayWindow();
  }
});
