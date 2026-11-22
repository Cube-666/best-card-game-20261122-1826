// ai.js — Rook, the Stone Golem opponent. He plays openly: his next move is
// always announced as an intent first, so the player can read him and counter.

import { SUITS } from './cards.js';

// Pick the cards Rook will play this turn, in order, given his hand and mana.
// He prefers finishing the player, then big strikes, then healing when hurt,
// then guarding when the player threatens a big turn.
export function chooseAiPlays(hand, mana, myLife, foeLife, foeLastSuit) {
  const plays = [];
  let remaining = mana;
  const playable = hand.filter((c) => c.cost <= remaining);
  if (playable.length === 0) return plays;

  // A lethal strike ends the duel at once.
  const lethal = playable.find((c) => (c.kind === 'strike' || c.kind === 'surge') && c.power >= foeLife);
  if (lethal) return [lethal];

  // Score every card in context, then take the best affordable one, repeat.
  let lastSuit = foeLastSuit;
  const pool = hand.slice();
  while (remaining > 0) {
    let best = null;
    let bestScore = 0;
    for (const card of pool) {
      if (card.cost > remaining) continue;
      let score = card.power;
      if (card.kind === 'strike') score += 2;
      if (card.kind === 'surge') score += card.suit === lastSuit ? 5 : 3;
      if (card.kind === 'mend') score = myLife <= 12 ? card.power + 4 : card.power - 6;
      if (card.kind === 'guard') score = foeLife >= myLife ? card.power - 2 : card.power - 7;
      if (card.kind === 'strike' && card.power + 0 >= foeLife) score += 50;
      if (score > bestScore) { best = card; bestScore = score; }
    }
    if (!best) break;
    plays.push(best);
    pool.splice(pool.indexOf(best), 1);
    remaining -= best.cost;
    lastSuit = best.suit;
  }
  return plays;
}

// One-line, human-readable description of what Rook is about to do.
export function describeIntent(plays, foeLife) {
  if (plays.length === 0) return 'Rook passes — he has nothing to play.';
  const first = plays[0];
  const suit = SUITS[first.suit].name;
  if (first.kind === 'strike' || first.kind === 'surge') {
    const total = plays
      .filter((c) => c.kind === 'strike' || c.kind === 'surge')
      .reduce((sum, c) => sum + c.power, 0);
    if (total >= foeLife) return `Rook is about to finish you — ${total} damage incoming! Guard now!`;
    return `Rook plans a ${suit} strike for ${total} damage.`;
  }
  if (first.kind === 'guard') return `Rook raises a ${suit} guard — save your strikes.`;
  return `Rook reaches for a ${suit} remedy — he means to heal.`;
}
