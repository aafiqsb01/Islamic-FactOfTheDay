import { createClient } from '@supabase/supabase-js';

const env = (key) => process.env[key]?.trim();

const APP_ID =
  env('VITE_ONESIGNAL_APP_ID') || '14996b7d-30b9-4a71-8f1c-cae2395e750e';
const SITE_URL = 'https://islamic-factoftheday.vercel.app';

function getDayOfYear(date = new Date()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((now - start) / (1000 * 60 * 60 * 24));
}

async function fetchFacts() {
  const supabaseUrl = env('VITE_SUPABASE_URL') || env('SUPABASE_URL');
  const supabaseKey = env('VITE_SUPABASE_ANON_KEY') || env('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from('facts')
    .select('text, category, source_title, source_url')
    .order('id', { ascending: true });

  if (error) throw error;
  if (!data?.length) throw new Error('No facts found in database');

  return data;
}

function selectTodaysFact(facts) {
  const index = getDayOfYear() % facts.length;
  return { fact: facts[index], index };
}

async function sendOneSignalNotification(factText) {
  const restApiKey = env('ONESIGNAL_REST_API_KEY');
  if (!restApiKey) {
    throw new Error('Missing ONESIGNAL_REST_API_KEY environment variable');
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
    const facts = await fetchFacts();
    const { fact, index } = selectTodaysFact(facts);
    const factText = fact.text?.trim();

    if (!factText) {
      throw new Error(`Selected fact at index ${index} has empty text`);
    }

    const data = await sendOneSignalNotification(factText);

    return res.status(200).json({
      success: true,
      data,
      meta: {
        dayOfYear: getDayOfYear(),
        factIndex: index,
        factPreview: factText.slice(0, 120),
      },
    });
  } catch (error) {
    console.error('[send-daily-fact]', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send daily fact notification',
    });
  }
}
