// Pure scoring for the swipe quiz. Right swipes ("hexes") are counted per archetype;
// the most-hexed archetype is your match, and a tie goes to whoever is listed first in data.json.
export const ZERO_HEX_CHEMISTRY = 42;

export function tally(cards, hexedIndexes) {
  return hexedIndexes.reduce((counts, i) => ({ ...counts, [cards[i].by]: (counts[cards[i].by] ?? 0) + 1 }), {});
}

export function winner(archetypes, counts) {
  return archetypes.reduce((best, a) => ((counts[a.id] ?? 0) > (counts[best.id] ?? 0) ? a : best), archetypes[0]);
}

// A playful number, not a measurement: more hexes on your match means more "chemistry".
export function chemistry(counts, matchId) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  if (total === 0) return ZERO_HEX_CHEMISTRY;
  return Math.min(99, 88 + 3 * (counts[matchId] ?? 0) + (total % 3));
}

export function cleanName(raw) {
  return String(raw ?? "").replace(/[^\p{L}\p{N} '-]/gu, "").trim().slice(0, 20);
}
