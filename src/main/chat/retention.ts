/**
 * Age-based retention: dropping messages the user no longer wants kept.
 *
 * # Off by default, and a pure decision
 *
 * Retention is opt-in (SPEC §5.8): the default window is zero, which means "keep everything". Only when
 * the user chooses a positive number of days does anything get dropped. The rule itself is pure and the
 * clock is INJECTED, so "older than N" is a decision a test can pin rather than a wall-clock race — the
 * store and the periodic sweep both call this with their own `now`, so memory and disk age by one rule.
 */

import type { ChatMessage } from './conversation';

/**
 * Keep only messages younger than `maxAgeMs`, measured against `now`.
 *
 * A window of zero or less disables retention and returns the input unchanged, so "disabled" is not a
 * special case the callers each re-implement. A message exactly at the boundary (age === window) is
 * KEPT — the window is inclusive, so a 7-day setting does not evict a message on the stroke of day 7.
 * Pure and total: the input array is never mutated.
 */
export function pruneAged(
  messages: readonly ChatMessage[],
  maxAgeMs: number,
  now: number,
): ChatMessage[] {
  if (maxAgeMs <= 0) return [...messages];
  return messages.filter((message) => now - message.at <= maxAgeMs);
}
