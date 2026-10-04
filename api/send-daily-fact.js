import { createSupabaseAdmin, ensureTodaysDailyFact } from '../lib/dailyFact.js';

const env = (key) => process.env[key]?.trim();

const APP_ID =
  env('VITE_ONESIGNAL_APP_ID') || '14996b7d-30b9-4a71-8f1c-cae2395e750e';
const SITE_URL = 'https://islamic-factoftheday.vercel.app';

async function sendOneSignalNotification(fact, date) {
  const restApiKey = env('ONESIGNAL_REST_API_KEY');
  if (!restApiKey) {
    throw new Error('Missing ONESIGNAL_REST_API_KEY environment variable');
  }

  const factText = fact.fact?.trim();
  if (!factText) {
    throw new Error('Selected daily fact has empty text');
  }

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${restApiKey}`,
    },
    body: JSON.stringify({
      app_id: APP_ID,
      included_segments: ['Total Subscriptions'],
      headings: { en: 'Islamic Fact of the Day 🌙' },
      contents: { en: factText },
      url: SITE_URL,
      data: {
        factId: fact.id,
        date,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.errors?.join?.(', ') || data?.error || response.statusText;
    throw new Error(`OneSignal API error (${response.status}): ${message}`);
  }

  return data;
}

function isAuthorized(req) {
  const cronSecret = env('CRON_SECRET');
  if (!cronSecret) return true;

  const auth = req.headers.authorization || '';
  return auth === `Bearer ${cronSecret}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { supabase } = createSupabaseAdmin();
    const daily = await ensureTodaysDailyFact(supabase);
    const data = await sendOneSignalNotification(daily.fact, daily.date);

    return res.status(200).json({
      success: true,
      data,
      meta: {
        date: daily.date,
        factId: daily.factId,
        created: daily.created,
        historyId: daily.historyId,
        factPreview: daily.fact.fact.slice(0, 120),
      },
    });
  } catch (error) {
    console.error('[send-daily-fact]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send daily fact notification',
    });
  }
}
