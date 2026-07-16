// AI SDK (https://ai-sdk.dev) er kun ESM, og main.js er CommonJS,
// saa pakkerne hentes via dynamisk import() i stedet for require().

const https = require('https');

function httpGetJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'GET', headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          reject(new Error('Uventet svar fra udbyderens server.'));
          return;
        }
        if (res.statusCode >= 400) {
          const errBody = parsed && parsed.error;
          const message = (errBody && (errBody.message || errBody)) || 'HTTP ' + res.statusCode;
          reject(new Error(typeof message === 'string' ? message : JSON.stringify(message)));
          return;
        }
        resolve(parsed);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Filtrerer OpenAI's modelliste, saa kun tekst-/chat-modeller vises (ikke lyd, billeder, embeddings,
// realtime, transskription, billedgenerering osv.)
const OPENAI_EXCLUDE_PATTERNS = [
  'whisper',
  'tts',
  'dall-e',
  'gpt-image',
  'embedding',
  'moderation',
  'davinci',
  'babbage',
  'curie',
  'ada',
  'audio',
  'realtime',
  'transcribe',
  'computer-use'
];

// Filtrerer Groq's modelliste - udelukker ikke-chat-modeller
const GROQ_EXCLUDE_PATTERNS = ['whisper', 'distil-whisper'];

async function listModels(providerId, apiKey) {
  if (!apiKey) {
    throw new Error('Indsæt en API-nøgle først.');
  }

  if (providerId === 'openai') {
    const json = await httpGetJson('https://api.openai.com/v1/models', {
      Authorization: 'Bearer ' + apiKey
    });
    return (json.data || [])
      .map((m) => m.id)
      .filter((id) => !OPENAI_EXCLUDE_PATTERNS.some((p) => id.includes(p)))
      .sort();
  }

  if (providerId === 'anthropic') {
    const json = await httpGetJson('https://api.anthropic.com/v1/models?limit=1000', {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    });
    return (json.data || []).map((m) => m.id).sort();
  }

  if (providerId === 'google') {
    const json = await httpGetJson(
      'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(apiKey),
      {}
    );
    return (json.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .sort();
  }

  if (providerId === 'groq') {
    const json = await httpGetJson('https://api.groq.com/openai/v1/models', {
      Authorization: 'Bearer ' + apiKey
    });
    return (json.data || [])
      .map((m) => m.id)
      .filter((id) => !GROQ_EXCLUDE_PATTERNS.some((p) => id.includes(p)))
      .sort();
  }

  throw new Error('Ukendt sprogmodel-udbyder: ' + providerId);
}

const SYSTEM_PROMPTS = {
  spelling:
    'Du er en dansk korrekturlæser. Ret KUN stave- og grammatikfejl i teksten nedenfor. ' +
    'Bevar formatering, linjeskift, tegnsætning, tone, ordvalg og betydning fuldstændig uændret. ' +
    'Tilføj eller fjern intet indhold. Svar udelukkende med den rettede tekst - ' +
    'ingen forklaring, ingen anførselstegn, ingen indledning.',
  polish:
    'Du er en tekstredaktør. Ryd op i teksten nedenfor, så den får en klar rød tråd og logisk sammenhæng. ' +
    'Behold samme sprog som teksten er skrevet i, og genbrug så vidt muligt de samme udtryk og ord, ' +
    'som brugeren selv har valgt. Tilføj ikke nyt indhold, og ændr ikke budskabet. ' +
    'Svar udelukkende med den omskrevne tekst - ingen forklaring, ingen anførselstegn, ingen indledning.'
};

async function buildModel(providerId, providerSettings) {
  const { apiKey, model } = providerSettings;

  if (providerId === 'openai') {
    const { createOpenAI } = await import('@ai-sdk/openai');
    return createOpenAI({ apiKey })(model);
  }
  if (providerId === 'anthropic') {
    const { createAnthropic } = await import('@ai-sdk/anthropic');
    return createAnthropic({ apiKey })(model);
  }
  if (providerId === 'google') {
    const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
    return createGoogleGenerativeAI({ apiKey })(model);
  }
  if (providerId === 'groq') {
    const { createGroq } = await import('@ai-sdk/groq');
    return createGroq({ apiKey })(model);
  }

  throw new Error('Ukendt sprogmodel-udbyder: ' + providerId);
}

async function correctWithAI(providerId, providerSettings, text, mode) {
  const { generateText } = await import('ai');
  const model = await buildModel(providerId, providerSettings);

  const { text: resultText } = await generateText({
    model,
    system: SYSTEM_PROMPTS[mode],
    prompt: text
  });

  return resultText.trim();
}

module.exports = { correctWithAI, listModels };
