import { createSupabaseAdmin, ensureTodaysDailyFact } from '../lib/dailyFact.js';

/**
 * Public endpoint used by the app to load today's authoritative daily fact.
 * Ensures a fact_history row exists for the current UK calendar day (idempotent).
 * Does NOT send a notification.
 * Does NOT accept a client-provided fact_id.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { supabase } = createSupabaseAdmin();
    const daily = await ensureTodaysDailyFact(supabase);

    return res.status(200).json({
      success: true,
      date: daily.date,
      created: daily.created,
      fact: daily.fact,
    });
  } catch (error) {
    console.error('[daily-fact]', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load daily fact',
    });
  }
}
