// ─── services/claudeApi.js ───────────────────────────────────────────────────

const CATEGORIES = [
  'Islamic History',
  'Quranic Insights',
  'Islamic Science & Scholars',
  'Prophetic Traditions',
  'Islamic Art & Architecture',
  'Islamic Civilisation',
];

function randomCategory() {
  return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
}

function buildPrompt(seed, category) {
  return `Give me one fascinating, lesser-known Islamic fact (seed: ${seed}), category: ${category}.
Make it genuinely interesting and specific — avoid generic statements.
Include:
- A brief source reference (e.g. a hadith collection, historical scholar, or book)
- A real, working URL where a user can verify this fact (e.g. a Wikipedia article, sunnah.com hadith link, quran.com ayah, or a reputable Islamic studies site)

Respond ONLY with valid JSON in this exact shape, no markdown, no extra text:
{"category":"...","fact":"...","source":"...","sourceUrl":"https://..."}`;
}

export async function fetchIslamicFact(isBonus = false) {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86_400_000);
  const seed = isBonus ? Math.random().toString(36).slice(2) : `day-${dayOfYear}`;
  const category = randomCategory();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: buildPrompt(seed, category) }],
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = await response.json();
  const raw = data.content?.[0]?.text ?? '';
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export const FALLBACK_FACT = {
  category: 'Islamic History',
  fact: "The House of Wisdom (Bayt al-Hikmah) in 9th-century Baghdad housed scholars who translated Greek, Persian, and Indian texts into Arabic — preserving and advancing human knowledge for centuries before Europe's Renaissance.",
  source: 'Wikipedia — House of Wisdom',
  sourceUrl: 'https://en.wikipedia.org/wiki/House_of_Wisdom',
};
