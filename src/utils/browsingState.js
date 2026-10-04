import { getUkDateString } from './ukDate.js';

export const BROWSING_STORAGE_KEY = 'ifotd.browsing.v1';
export const ANOTHER_FACT_COOLDOWN_MS = 15 * 60 * 1000;

export function readBrowsingState() {
  try {
    const raw = localStorage.getItem(BROWSING_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeBrowsingState(state) {
  try {
    localStorage.setItem(BROWSING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / private-mode failures; browsing remains session-only.
  }
}

export function clearBrowsingState() {
  try {
    localStorage.removeItem(BROWSING_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Decide whether temporary "Another Fact" browsing should still be shown.
 * New calendar day always wins over the 15-minute cooldown.
 */
export function resolveDisplayedFact({
  dailyFact,
  browsingState,
  now = new Date(),
  cooldownMs = ANOTHER_FACT_COOLDOWN_MS,
}) {
  if (!dailyFact) {
    return { fact: null, usingBrowsing: false };
  }

  const currentDate = getUkDateString(now);
  if (!browsingState?.displayedFact || !browsingState.lastAnotherFactAt) {
    return { fact: dailyFact, usingBrowsing: false };
  }

  if (browsingState.displayedFactDate !== currentDate) {
    return { fact: dailyFact, usingBrowsing: false, clear: true };
  }

  const elapsed = now.getTime() - Number(browsingState.lastAnotherFactAt);
  if (!Number.isFinite(elapsed) || elapsed >= cooldownMs) {
    return { fact: dailyFact, usingBrowsing: false, clear: true };
  }

  if (!browsingState.displayedFact.id) {
    return { fact: dailyFact, usingBrowsing: false, clear: true };
  }

  return {
    fact: browsingState.displayedFact,
    usingBrowsing: true,
  };
}

export function pickAnotherFact(facts, {
  dailyFactId,
  currentFactId,
  random = Math.random,
} = {}) {
  if (!facts?.length) {
    throw new Error('No facts found in database');
  }

  const exclude = new Set([dailyFactId, currentFactId].filter(Boolean));
  let pool = facts.filter((fact) => !exclude.has(fact.id));
  if (pool.length === 0) {
    pool = facts.filter((fact) => fact.id !== currentFactId);
  }
  if (pool.length === 0) {
    pool = facts;
  }

  return pool[Math.floor(random() * pool.length)];
}

export function normalizeFactRow(row) {
  return {
    id: row.id,
    fact: row.text,
    category: row.category,
    source: row.source_title,
    sourceUrl: row.source_url,
  };
}
