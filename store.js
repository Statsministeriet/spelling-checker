const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// --- Metadata om de understøttede sprogmodel-udbydere ---

const PROVIDERS = {
  languagetool: {
    label: 'LanguageTool (gratis, kun stavefejl)',
    needsApiKey: false,
    supportsPolish: false,
    modelSuggestions: []
  },
  openai: {
    label: 'OpenAI',
    needsApiKey: true,
    supportsPolish: true,
    modelSuggestions: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini']
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    needsApiKey: true,
    supportsPolish: true,
    modelSuggestions: ['claude-sonnet-5', 'claude-opus-4-8', 'claude-haiku-4-5-20251001']
  },
  google: {
    label: 'Google (Gemini)',
    needsApiKey: true,
    supportsPolish: true,
    modelSuggestions: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
  },
  groq: {
    label: 'Groq',
    needsApiKey: true,
    supportsPolish: true,
    modelSuggestions: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
  }
};

const DEFAULT_SETTINGS = {
  activeProvider: 'languagetool',
  providers: {
    openai: { apiKey: '', model: 'gpt-4o-mini' },
    anthropic: { apiKey: '', model: 'claude-sonnet-5' },
    google: { apiKey: '', model: 'gemini-2.0-flash' },
    groq: { apiKey: '', model: 'llama-3.3-70b-versatile' }
  }
};

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      providers: { ...DEFAULT_SETTINGS.providers, ...parsed.providers }
    };
  } catch (err) {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
}

function saveSettings(settings) {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
}

module.exports = { PROVIDERS, DEFAULT_SETTINGS, loadSettings, saveSettings };
