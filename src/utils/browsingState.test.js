import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANOTHER_FACT_COOLDOWN_MS,
  pickAnotherFact,
  resolveDisplayedFact,
} from './browsingState.js';

const dailyFact = {
  id: 'daily',
  fact: 'Daily',
  category: 'History',
  source: 'Source',
  sourceUrl: 'https://example.com',
};

const browsingFact = {
  id: 'browse',
  fact: 'Browse',
  category: 'Hadith',
  source: 'Source',
  sourceUrl: 'https://example.com',
};

test('resolveDisplayedFact returns daily fact when no browsing state', () => {
  const result = resolveDisplayedFact({ dailyFact, browsingState: null });
  assert.equal(result.fact.id, 'daily');
  assert.equal(result.usingBrowsing, false);
});

test('resolveDisplayedFact keeps browsing within 15 minutes on the same UK day', () => {
  const now = new Date('2026-10-04T12:00:00.000Z');
  const result = resolveDisplayedFact({
    dailyFact,
    browsingState: {
      displayedFactDate: '2026-10-04',
      lastAnotherFactAt: now.getTime() - 5 * 60 * 1000,
      displayedFact: browsingFact,
    },
    now,
  });

  assert.equal(result.fact.id, 'browse');
  assert.equal(result.usingBrowsing, true);
});

test('resolveDisplayedFact expires browsing after 15 minutes', () => {
  const now = new Date('2026-10-04T12:00:00.000Z');
  const result = resolveDisplayedFact({
    dailyFact,
    browsingState: {
      displayedFactDate: '2026-10-04',
      lastAnotherFactAt: now.getTime() - (ANOTHER_FACT_COOLDOWN_MS + 1000),
      displayedFact: browsingFact,
    },
    now,
  });

  assert.equal(result.fact.id, 'daily');
  assert.equal(result.clear, true);
});

test('new UK calendar day clears browsing even inside the cooldown', () => {
  const now = new Date('2026-10-05T00:30:00.000Z'); // still early 5 Oct UK during BST
  const result = resolveDisplayedFact({
    dailyFact,
    browsingState: {
      displayedFactDate: '2026-10-04',
      lastAnotherFactAt: now.getTime() - 2 * 60 * 1000,
      displayedFact: browsingFact,
    },
    now,
  });

  assert.equal(result.fact.id, 'daily');
  assert.equal(result.clear, true);
});

test('pickAnotherFact avoids the daily and current facts when possible', () => {
  const facts = [
    { id: 'daily', fact: 'Daily' },
    { id: 'current', fact: 'Current' },
    { id: 'other', fact: 'Other' },
  ];

  const chosen = pickAnotherFact(facts, {
    dailyFactId: 'daily',
    currentFactId: 'current',
    random: () => 0,
  });

  assert.equal(chosen.id, 'other');
});
