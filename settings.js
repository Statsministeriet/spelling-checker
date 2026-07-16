const providerEl = document.getElementById('provider');
const apiKeyEl = document.getElementById('apiKey');
const modelEl = document.getElementById('model');
const modelCustomInputEl = document.getElementById('modelCustomInput');
const apiKeyRow = document.getElementById('apiKeyRow');
const modelRow = document.getElementById('modelRow');
const noteEl = document.getElementById('note');
const modelStatusEl = document.getElementById('modelStatus');
const statusEl = document.getElementById('status');
const saveBtn = document.getElementById('save');
const refreshModelsBtn = document.getElementById('refreshModels');

let providersMeta = {};
let providersData = {};
let currentProvider = 'languagetool';
let fetchedModels = {}; // providerId -> string[], hentet live fra udbyderens API

function populateModelList(models, currentValue) {
  modelEl.innerHTML = '';
  const allModels = [...models];
  // If the current saved model isn't in the list, add it at the top
  if (currentValue && !allModels.includes(currentValue)) {
    allModels.unshift(currentValue);
  }
  allModels.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    modelEl.appendChild(opt);
  });
  // Add "Skriv selv..." option at the end
  const customOpt = document.createElement('option');
  customOpt.value = '__custom__';
  customOpt.textContent = 'Skriv selv...';
  modelEl.appendChild(customOpt);

  if (currentValue) {
    modelEl.value = allModels.includes(currentValue) ? currentValue : currentValue;
  }
  syncCustomInput();
}

function getModelValue() {
  if (modelEl.value === '__custom__') {
    return modelCustomInputEl.value.trim();
  }
  return modelEl.value;
}

function syncCustomInput() {
  const isCustom = modelEl.value === '__custom__';
  modelCustomInputEl.style.display = isCustom ? 'block' : 'none';
  if (isCustom) {
    modelCustomInputEl.focus();
  }
}

modelEl.addEventListener('change', syncCustomInput);

async function fetchModelsForCurrentProvider() {
  const providerId = currentProvider;
  const meta = providersMeta[providerId];
  if (!meta.needsApiKey) {
    return;
  }

  const apiKey = apiKeyEl.value;
  if (!apiKey) {
    modelStatusEl.textContent = 'Indsæt en API-nøgle for at hente den fulde modelliste.';
    return;
  }

  modelStatusEl.textContent = 'Henter modeller...';
  const result = await window.api.listModels(providerId, apiKey);

  // Undgaa at opdatere UI'et hvis brugeren naaede at skifte udbyder, mens vi ventede
  if (providerId !== currentProvider) {
    return;
  }

  if (result.error) {
    modelStatusEl.textContent = 'Kunne ikke hente modelliste: ' + result.error;
    return;
  }

  fetchedModels[providerId] = result.models;
  populateModelList(result.models, getModelValue());
  modelStatusEl.textContent = result.models.length + ' modeller fundet hos ' + meta.label + '.';
}

function renderProviderFields(providerId) {
  const meta = providersMeta[providerId];
  const data = providersData[providerId] || { apiKey: '', model: '' };

  apiKeyRow.style.display = meta.needsApiKey ? 'block' : 'none';
  modelRow.style.display = meta.needsApiKey ? 'block' : 'none';
  noteEl.textContent = meta.needsApiKey
    ? ''
    : 'Gratis og klar til brug uden opsætning. Retter kun stavefejl - understøtter ikke finpudsning.';

  apiKeyEl.value = data.apiKey || '';
  modelCustomInputEl.value = '';
  modelCustomInputEl.style.display = 'none';
  populateModelList(fetchedModels[providerId] || meta.modelSuggestions || [], data.model || '');
  if (data.model) {
    modelEl.value = data.model;
    if (!modelEl.value || modelEl.value !== data.model) {
      // value not in list, should have been added by populateModelList
      modelEl.value = data.model;
    }
  }
  modelStatusEl.textContent = '';

  if (meta.needsApiKey && data.apiKey && !fetchedModels[providerId]) {
    fetchModelsForCurrentProvider();
  }
}

function persistCurrentFieldsIntoData() {
  if (providersMeta[currentProvider] && providersMeta[currentProvider].needsApiKey) {
    providersData[currentProvider] = { apiKey: apiKeyEl.value, model: getModelValue() };
  }
}

providerEl.addEventListener('change', () => {
  persistCurrentFieldsIntoData();
  currentProvider = providerEl.value;
  renderProviderFields(currentProvider);
});

apiKeyEl.addEventListener('change', () => {
  delete fetchedModels[currentProvider];
  fetchModelsForCurrentProvider();
});

refreshModelsBtn.addEventListener('click', () => {
  delete fetchedModels[currentProvider];
  fetchModelsForCurrentProvider();
});

saveBtn.addEventListener('click', async () => {
  persistCurrentFieldsIntoData();
  const settings = { activeProvider: currentProvider, providers: providersData };
  await window.api.saveSettings(settings);
  statusEl.textContent = 'Gemt!';
  setTimeout(() => {
    statusEl.textContent = '';
  }, 2000);
});

(async () => {
  const { settings, providers } = await window.api.getSettingsData();
  providersMeta = providers;
  providersData = settings.providers || {};
  currentProvider = settings.activeProvider || 'languagetool';

  providerEl.innerHTML = '';
  Object.keys(providersMeta).forEach((id) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = providersMeta[id].label;
    providerEl.appendChild(opt);
  });
  providerEl.value = currentProvider;
  renderProviderFields(currentProvider);
})();
