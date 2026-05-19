require('dotenv/config');

const apiKey = process.env.GEMINI_API_KEY?.trim();
const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash-lite';
const fallbackModels = (process.env.GEMINI_FALLBACK_MODELS?.split(',') ?? ['gemini-2.5-flash'])
  .map((item) => item.trim())
  .filter(Boolean);
const models = [model, ...fallbackModels].filter((item, index, list) => list.indexOf(item) === index);

async function main() {
  if (!apiKey) {
    console.error('GEMINI_API_KEY bulunamadı. api/.env dosyasına ekleyin.');
    process.exit(1);
  }

  let lastError = '';

  for (const modelName of models) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Return only JSON: {"ok":true,"source":"gemini"}' }],
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    const body = await response.text();

    if (response.ok) {
      const payload = JSON.parse(body);
      const text = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter(Boolean)
        .join('');

      console.log(`Gemini test başarılı. Model: ${modelName}`);
      console.log(text || 'Yanıtta metin yok.');
      return;
    }

    try {
      lastError = JSON.parse(body).error?.message || body;
    } catch {
      lastError = body;
    }

    if (![429, 500, 502, 503, 504].includes(response.status)) {
      console.error(`Gemini test başarısız. HTTP ${response.status}`);
      console.error(lastError);
      process.exit(1);
    }
  }

  console.error('Gemini test başarısız. Denenen modeller geçici olarak cevap vermedi.');
  console.error(lastError);
  process.exit(1);
}

main().catch((error) => {
  console.error('Gemini test çalıştırılamadı.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
