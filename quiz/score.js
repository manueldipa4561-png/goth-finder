// Highest tally wins; a tie goes to whichever archetype comes first in data.json.
export function winner(archetypes, tally) {
  return archetypes.reduce((best, a) => ((tally[a.id] ?? 0) > (tally[best.id] ?? 0) ? a : best), archetypes[0]);
}
