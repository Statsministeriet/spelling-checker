function formatProviderLabel(settings, providers) {
  const providerId = settings.activeProvider;
  const meta = providers[providerId];
  if (!meta) return '';
  if (!meta.needsApiKey) return meta.label;
  const model = (settings.providers[providerId] || {}).model;
  return meta.label + ' · ' + (model || 'ingen model valgt');
}

window.api.getSettingsData().then(({ settings, providers }) => {
  document.getElementById('activeModel').textContent = formatProviderLabel(settings, providers);
});

window.api.onData(({ original, corrected, matches, mode }) => {
  document.getElementById('title').textContent = mode === 'polish' ? 'Tekst finpudset' : 'Stavefejl rettet';
  document.getElementById('count').textContent =
    matches && matches.length > 0 ? matches.length + ' rettelse(r) fundet' : 'Klar til at indsætte';
  document.getElementById('corrected').value = corrected;
});

document.getElementById('accept').addEventListener('click', () => {
  const text = document.getElementById('corrected').value;
  window.api.accept(text);
});

document.getElementById('cancel').addEventListener('click', () => {
  window.api.close();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.api.close();
  }
});
