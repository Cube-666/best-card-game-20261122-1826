// cards.js — the four suits, the card pool and deck building for Ember Court.
// Suits are told apart by colour AND shape, never by text alone:
//   Ember = red flame, Tide = blue droplet, Thorn = green leaf, Stone = grey diamond.

export const SUITS = {
  ember: { name: 'Ember', color: '#d63c2f', light: '#ff6a4d', shape: 'flame' },
  tide: { name: 'Tide', color: '#2f7fe0', light: '#5aa5ff', shape: 'droplet' },
  thorn: { name: 'Thorn', color: '#2e9e54', light: '#4ecb7d', shape: 'leaf' },
  stone: { name: 'Stone', color: '#7d838d', light: '#aab0ba', shape: 'diamond' },
};

// Inline SVG art per suit shape, drawn once and reused by every card.
export function suitSvg(suit, color) {
  const c = color || SUITS[suit].color;
  if (suit === 'ember') {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="${c}" d="M32 4 C40 18 52 24 52 40 a20 20 0 1 1 -40 0 C12 28 20 24 24 14 c4 6 6 8 8 12 2-8 0-16 0-22z"/></svg>`;
  }
  if (suit === 'tide') {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="${c}" d="M32 4 C44 24 54 34 54 46 a22 22 0 1 1 -44 0 C10 34 20 24 32 4z"/></svg>`;
  }
  if (suit === 'thorn') {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="${c}" d="M52 6 C24 8 8 26 8 46 c0 6 2 10 6 12 C14 36 28 22 52 6z M14 58 C26 44 38 34 50 28 c-2 14 -14 26 -30 30z"/></svg>`;
  }
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="${c}" d="M32 4 L58 32 L32 60 L6 32 Z"/><path fill="#ffffff55" d="M32 4 L58 32 L32 32 Z"/></svg>`;
}

// kind: strike deals damage, guard blocks, mend heals, surge deals damage + draws on a suit match.
export const CARD_POOL = [
  { id: 'ember-spark', name: 'Spark', suit: 'ember', kind: 'strike', cost: 1, power: 3, text: 'Deal 3 damage.' },
  { id: 'ember-burst', name: 'Fireburst', suit: 'ember', kind: 'strike', cost: 2, power: 6, text: 'Deal 6 damage.' },
  { id: 'ember-surge', name: 'Wildfire', suit: 'ember', kind: 'surge', cost: 2, power: 5, text: 'Deal 5. Same suit again: +2 and draw 1.' },
  { id: 'ember-ward', name: 'Cinder Ward', suit: 'ember', kind: 'guard', cost: 1, power: 4, text: 'Block 4 damage.' },
  { id: 'ember-mend', name: 'Warm Hearth', suit: 'ember', kind: 'mend', cost: 2, power: 5, text: 'Heal 5 life.' },
  { id: 'tide-splash', name: 'Splash', suit: 'tide', kind: 'strike', cost: 1, power: 3, text: 'Deal 3 damage.' },
  { id: 'tide-wave', name: 'Breaker Wave', suit: 'tide', kind: 'strike', cost: 3, power: 8, text: 'Deal 8 damage.' },
  { id: 'tide-surge', name: 'Undertow', suit: 'tide', kind: 'surge', cost: 2, power: 5, text: 'Deal 5. Same suit again: +2 and draw 1.' },
  { id: 'tide-ward', name: 'Tide Wall', suit: 'tide', kind: 'guard', cost: 1, power: 5, text: 'Block 5 damage.' },
  { id: 'tide-mend', name: 'Spring Water', suit: 'tide', kind: 'mend', cost: 1, power: 4, text: 'Heal 4 life.' },
  { id: 'thorn-thorn', name: 'Thorn Whip', suit: 'thorn', kind: 'strike', cost: 1, power: 4, text: 'Deal 4 damage.' },
  { id: 'thorn-bloom', name: 'Bloom Strike', suit: 'thorn', kind: 'strike', cost: 2, power: 6, text: 'Deal 6 damage.' },
  { id: 'thorn-surge', name: 'Vine Snare', suit: 'thorn', kind: 'surge', cost: 2, power: 4, text: 'Deal 4. Same suit again: +2 and draw 1.' },
  { id: 'thorn-ward', name: 'Bark Shield', suit: 'thorn', kind: 'guard', cost: 2, power: 7, text: 'Block 7 damage.' },
  { id: 'thorn-mend', name: 'Root Remedy', suit: 'thorn', kind: 'mend', cost: 2, power: 6, text: 'Heal 6 life.' },
  { id: 'stone-pebble', name: 'Pebble Toss', suit: 'stone', kind: 'strike', cost: 1, power: 2, text: 'Deal 2 damage.' },
  { id: 'stone-boulder', name: 'Boulder Slam', suit: 'stone', kind: 'strike', cost: 3, power: 9, text: 'Deal 9 damage.' },
  { id: 'stone-surge', name: 'Avalanche', suit: 'stone', kind: 'surge', cost: 3, power: 7, text: 'Deal 7. Same suit again: +2 and draw 1.' },
  { id: 'stone-ward', name: 'Granite Wall', suit: 'stone', kind: 'guard', cost: 1, power: 6, text: 'Block 6 damage.' },
  { id: 'stone-mend', name: 'Quarry Rest', suit: 'stone', kind: 'mend', cost: 3, power: 8, text: 'Heal 8 life.' },
];

// Deterministic RNG (mulberry32) so screenshot scenes shuffle the same way every time.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(deck, rng) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// A duel deck: 24 cards, two copies of twelve pool cards picked by the rng.
export function buildDeck(rng) {
  const picked = shuffle(CARD_POOL, rng).slice(0, 12);
  const deck = [];
  for (const card of picked) deck.push({ ...card }, { ...card });
  return shuffle(deck, rng);
}

export function cardById(id) {
  return CARD_POOL.find((c) => c.id === id);
}
