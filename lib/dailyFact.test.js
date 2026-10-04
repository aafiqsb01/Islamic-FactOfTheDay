import test from 'node:test';
import assert from 'node:assert/strict';
import { pickEligibleFact, historyWindowCutoff, HISTORY_WINDOW_DAYS } from './dailyFact.js';

test('pickEligibleFact prefers facts outside the recent history set', () => {
  const facts = [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
    { id: 'c', text: 'C' },
  ];

  const chosen = pickEligibleFact(facts, ['a', 'b'], () => 0);
  assert.equal(chosen.id, 'c');
});

test('pickEligibleFact falls back to all facts when every fact was recent', () => {
  const facts = [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
  ];

  const chosen = pickEligibleFact(facts, ['a', 'b'], () => 0.99);
  assert.ok(['a', 'b'].includes(chosen.id));
});

test('pickEligibleFact throws when there are no facts', () => {
  assert.throws(() => pickEligibleFact([], []), /No facts found/);
});

test('historyWindowCutoff is about 60 days earlier', () => {
  const now = new Date('2026-10-04T09:00:00.000Z');
  const cutoff = historyWindowCutoff(now);
  const diffDays = (now - cutoff) / (24 * 60 * 60 * 1000);
  assert.equal(diffDays, HISTORY_WINDOW_DAYS);
});
