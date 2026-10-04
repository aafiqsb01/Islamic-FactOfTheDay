import { createClient } from '@supabase/supabase-js';
import { getUkDateString, getUkDayBoundsUtc } from './ukDate.js';

/** Facts shown as the daily fact within this window are ineligible for re-selection. */
export const HISTORY_WINDOW_DAYS = 60;

const FACT_SELECT = 'id, text, category, source_title, source_url';

const env = (key) => process.env[key]?.trim();

/**
 * Server-only Supabase client with service-role privileges.
 * Required for fact_history writes (RLS blocks the anon key).
 */
export function createSupabaseAdmin() {
  const supabaseUrl = env('VITE_SUPABASE_URL') || env('SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl) {
    throw new Error('Missing Supabase URL (VITE_SUPABASE_URL or SUPABASE_URL)');
  }

  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (required for fact_history writes)');
  }

  return {
    supabase: createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    usingServiceRole: true,
  };
}

export function normalizeFact(row) {
  if (!row) return null;
  return {
    id: row.id,
    fact: row.text,
    category: row.category,
    source: row.source_title,
    sourceUrl: row.source_url,
  };
}

export function historyWindowCutoff(now = new Date(), windowDays = HISTORY_WINDOW_DAYS) {
  return new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
}

/**
 * Pure selection helper: pick a random eligible fact, falling back to all facts
 * when every fact was used inside the history window.
 */
export function pickEligibleFact(facts, recentFactIds, random = Math.random) {
  if (!facts?.length) {
    throw new Error('No facts found in database');
  }

  const recent = new Set(recentFactIds);
  const eligible = facts.filter((fact) => !recent.has(fact.id));
  const pool = eligible.length > 0 ? eligible : facts;
  const index = Math.floor(random() * pool.length);
  return pool[index];
}

async function fetchAllFacts(supabase) {
  const { data, error } = await supabase
    .from('facts')
    .select(FACT_SELECT)
    .order('id', { ascending: true });

  if (error) throw error;
  if (!data?.length) throw new Error('No facts found in database');
  return data;
}

async function fetchFactById(supabase, factId) {
  const { data, error } = await supabase
    .from('facts')
    .select(FACT_SELECT)
    .eq('id', factId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchRecentFactIds(supabase, cutoffIso) {
  const { data, error } = await supabase
    .from('fact_history')
    .select('fact_id')
    .gte('shown_at', cutoffIso);

  if (error) throw error;
  return (data || []).map((row) => row.fact_id);
}

/**
 * Returns the authoritative fact_history row for a UK calendar day (earliest if duplicates),
 * with the related fact row attached as `fact`.
 */
export async function getTodaysHistoryRecord(supabase, dateStr = getUkDateString()) {
  const { start, end } = getUkDayBoundsUtc(dateStr);
  const { data, error } = await supabase
    .from('fact_history')
    .select('id, fact_id, shown_at')
    .gte('shown_at', start)
    .lt('shown_at', end)
    .order('shown_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1);

  if (error) throw error;

  const history = data?.[0];
  if (!history) return null;

  const fact = await fetchFactById(supabase, history.fact_id);
  if (!fact) return null;

  return { ...history, fact };
}

async function insertHistoryRecord(supabase, factId, shownAt = new Date()) {
  const { data, error } = await supabase
    .from('fact_history')
    .insert({
      fact_id: factId,
      shown_at: shownAt.toISOString(),
    })
    .select('id, fact_id, shown_at')
    .single();

  if (error) {
    if (error.code === '42501') {
      throw new Error(
        'Unable to write fact_history (RLS). Set SUPABASE_SERVICE_ROLE_KEY on the server.',
      );
    }
    throw error;
  }

  return data;
}

/**
 * Keep only the authoritative history row for a UK day.
 * Removes any concurrent/duplicate inserts so they cannot pollute the 60-day window
 * or create ambiguity about today's fact.
 */
export async function removeNonAuthoritativeHistory(supabase, dateStr, keepHistoryId) {
  if (!keepHistoryId) return;

  const { start, end } = getUkDayBoundsUtc(dateStr);
  const { error } = await supabase
    .from('fact_history')
    .delete()
    .gte('shown_at', start)
    .lt('shown_at', end)
    .neq('id', keepHistoryId);

  if (error) {
    console.error('[dailyFact] failed to clean duplicate history rows', error);
  }
}

function toDailyResult(date, record, created) {
  return {
    date,
    created,
    historyId: record.id,
    factId: record.fact_id,
    fact: normalizeFact(record.fact),
    shownAt: record.shown_at,
  };
}

/**
 * Idempotent daily selection:
 * - If today's UK fact_history row exists, reuse it.
 * - Otherwise select an eligible fact, insert history, then re-read today's row
 *   so concurrent inserts still converge on one authoritative record.
 * - Deletes any non-authoritative same-day rows after resolution.
 */
export async function ensureTodaysDailyFact(supabase, options = {}) {
  const now = options.now ?? new Date();
  const date = getUkDateString(now);
  const random = options.random ?? Math.random;

  const existing = await getTodaysHistoryRecord(supabase, date);
  if (existing?.fact) {
    await removeNonAuthoritativeHistory(supabase, date, existing.id);
    return toDailyResult(date, existing, false);
  }

  const facts = await fetchAllFacts(supabase);
  const recentIds = await fetchRecentFactIds(
    supabase,
    historyWindowCutoff(now).toISOString(),
  );
  const selected = pickEligibleFact(facts, recentIds, random);

  // Narrow the race window: another request may have inserted while we selected.
  const raced = await getTodaysHistoryRecord(supabase, date);
  if (raced?.fact) {
    await removeNonAuthoritativeHistory(supabase, date, raced.id);
    return toDailyResult(date, raced, false);
  }

  await insertHistoryRecord(supabase, selected.id, now);

  const authoritative = await getTodaysHistoryRecord(supabase, date);
  if (!authoritative?.fact) {
    // Extremely unlikely fallback: return the fact we just selected.
    return {
      date,
      created: true,
      historyId: null,
      factId: selected.id,
      fact: normalizeFact(selected),
      shownAt: now.toISOString(),
    };
  }

  await removeNonAuthoritativeHistory(supabase, date, authoritative.id);
  return toDailyResult(date, authoritative, true);
}
