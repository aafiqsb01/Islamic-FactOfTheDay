import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysToDateString,
  getUkDateString,
  getUkDayBoundsUtc,
  zonedMidnightToUtc,
} from './ukDate.js';

test('getUkDateString formats YYYY-MM-DD in Europe/London', () => {
  // 2026-10-04 00:30 BST = 2026-10-03 23:30 UTC → still 4 Oct in UK
  const bstMorning = new Date('2026-10-03T23:30:00.000Z');
  assert.equal(getUkDateString(bstMorning), '2026-10-04');

  // 2026-10-04 00:30 UTC = 01:30 BST → 4 Oct UK
  assert.equal(getUkDateString(new Date('2026-10-04T00:30:00.000Z')), '2026-10-04');
});

test('UTC midnight near UK boundary does not use raw UTC date', () => {
  // Immediately before UK midnight on 5 Oct 2026 (BST, UTC+1):
  // UK local 2026-10-04 23:30 = 2026-10-04 22:30 UTC
  assert.equal(getUkDateString(new Date('2026-10-04T22:30:00.000Z')), '2026-10-04');
  // UK local 2026-10-05 00:30 = 2026-10-04 23:30 UTC
  assert.equal(getUkDateString(new Date('2026-10-04T23:30:00.000Z')), '2026-10-05');
});

test('getUkDayBoundsUtc covers the full UK civil day', () => {
  const { start, end } = getUkDayBoundsUtc('2026-10-04');
  const startDate = new Date(start);
  const endDate = new Date(end);

  assert.equal(getUkDateString(startDate), '2026-10-04');
  assert.equal(getUkDateString(new Date(endDate.getTime() - 1)), '2026-10-04');
  assert.equal(getUkDateString(endDate), '2026-10-05');
  assert.equal(zonedMidnightToUtc('2026-10-04').toISOString(), start);
  assert.equal(addDaysToDateString('2026-10-04', 1), '2026-10-05');
});

test('GMT winter bounds use UTC+0 offset', () => {
  // 2026-01-15 is GMT (UTC+0)
  const { start, end } = getUkDayBoundsUtc('2026-01-15');
  assert.equal(start, '2026-01-15T00:00:00.000Z');
  assert.equal(end, '2026-01-16T00:00:00.000Z');
});

test('BST spring-forward day bounds remain contiguous', () => {
  // 2026-03-29: clocks jump 01:00 GMT → 02:00 BST
  const { start, end } = getUkDayBoundsUtc('2026-03-29');
  assert.equal(start, '2026-03-29T00:00:00.000Z');
  assert.equal(end, '2026-03-29T23:00:00.000Z'); // next UK midnight is 23:00 UTC
  assert.equal(getUkDateString(new Date(start)), '2026-03-29');
  assert.equal(getUkDateString(new Date(new Date(end).getTime() - 1)), '2026-03-29');
  assert.equal(getUkDateString(new Date(end)), '2026-03-30');
});

test('GMT autumn-back day bounds remain contiguous', () => {
  // 2026-10-25: clocks fall back 02:00 BST → 01:00 GMT
  const { start, end } = getUkDayBoundsUtc('2026-10-25');
  assert.equal(start, '2026-10-24T23:00:00.000Z'); // UK midnight is 23:00 UTC previous day
  assert.equal(end, '2026-10-26T00:00:00.000Z'); // next UK midnight is GMT
  assert.equal(getUkDateString(new Date(start)), '2026-10-25');
  assert.equal(getUkDateString(new Date(new Date(end).getTime() - 1)), '2026-10-25');
});
