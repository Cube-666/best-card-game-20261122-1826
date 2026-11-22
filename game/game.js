// game.js — the rules of Ember Court: turns, mana, life, block, suit surges,
// drawing, and the win / loss conditions. No DOM here; render.js draws state.

import { buildDeck, makeRng, shuffle } from './cards.js';
import { chooseAiPlays } from './ai.js';

export const MAX_LIFE = 30;
export const MAX_MANA = 10;
export const HAND_SIZE = 5;
export const MAX_HAND = 7;

export function createGame(seed) {
  const rng = makeRng(seed == null ? (Date.now() % 2147483647) : seed);
  const state = {
    rng,
    seed,
    phase: 'title', // title | playing | ai | over
    round: 1,
    you: freshFighter(rng),
    foe: freshFighter(rng),
    lastSuitYou: null,
    lastSuitFoe: null,
    log: [],
    damageDealt: 0,
    cardsPlayed: 0,
    turnsTaken: 0,
    winner: null,
    endReason: '',
  };
  return state;
}

function freshFighter(rng) {
  return {
    life: MAX_LIFE,
    mana: 3,
    maxMana: 3,
    block: 0,
    deck: buildDeck(rng),
    hand: [],
    discard: [],
  };
}

export function drawUpTo(fighter, count) {
  while (fighter.hand.length < count) {
    if (fighter.deck.length === 0) {
      if (fighter.discard.length === 0) return;
      fighter.deck = shuffle(fighter.discard, Math.random);
      fighter.discard = [];
    }
    fighter.hand.push(fighter.deck.pop());
  }
}

export function startDuel(state) {
  state.phase = 'playing';
  state.round = 1;
  state.you = freshFighter(state.rng);
  state.foe = freshFighter(state.rng);
  state.lastSuitYou = null;
  state.lastSuitFoe = null;
  state.log = [];
  state.damageDealt = 0;
  state.cardsPlayed = 0;
  state.turnsTaken = 0;
  state.winner = null;
  state.endReason = '';
  drawUpTo(state.you, HAND_SIZE);
  drawUpTo(state.foe, HAND_SIZE);
  pushLog(state, 'The duel begins. You hold the first turn.', 'info');
}

function pushLog(state, text, kind) {
  state.log.push({ text, kind: kind || 'info' });
  if (state.log.length > 40) state.log.shift();
}

// Resolve one played card. Returns a short description for the log.
export function playCard(state, side, card) {
  const me = state[side];
  const foe = state[side === 'you' ? 'foe' : 'you'];
  const idx = me.hand.indexOf(card);
  if (idx < 0 || me.mana < card.cost) return null;
  me.hand.splice(idx, 1);
  me.discard.push(card);
  me.mana -= card.cost;
  state.cardsPlayed += 1;

  const lastSuit = side === 'you' ? state.lastSuitYou : state.lastSuitFoe;
  const surging = card.kind === 'surge' && lastSuit === card.suit;
  let power = card.power + (surging ? 2 : 0);
  let note = '';

  if (card.kind === 'strike' || card.kind === 'surge') {
    const blocked = Math.min(foe.block, power);
    foe.block -= blocked;
    const dealt = power - blocked;
    foe.life = Math.max(0, foe.life - dealt);
    if (side === 'you') state.damageDealt += dealt;
    note = `${card.name} hits for ${dealt}` + (blocked ? ` (${blocked} blocked)` : '') + (surging ? ' — SURGE!' : '');
    if (surging) drawUpTo(me, me.hand.length + 1);
  } else if (card.kind === 'guard') {
    me.block += power;
    note = `${card.name} raises ${power} block.`;
  } else if (card.kind === 'mend') {
    const healed = Math.min(MAX_LIFE - me.life, power);
    me.life += healed;
    note = `${card.name} heals ${healed} life.`;
  }

  if (side === 'you') state.lastSuitYou = card.suit;
  else state.lastSuitFoe = card.suit;
  return { card, note, surging };
}

export function checkEnd(state) {
  if (state.foe.life <= 0) {
    state.phase = 'over';
    state.winner = 'you';
    state.endReason = 'Rook crumbles to dust — the court is yours.';
    return true;
  }
  if (state.you.life <= 0) {
    state.phase = 'over';
    state.winner = 'foe';
    state.endReason = 'Your last ember gutters out. Rook keeps the court.';
    return true;
  }
  return false;
}

// End the player's turn: Rook plans openly, plays, then a fresh round begins.
export function endPlayerTurn(state, onFoePlay, onTurnDone) {
  if (state.phase !== 'playing') return;
  state.phase = 'ai';
  state.you.block = 0;
  const plays = chooseAiPlays(state.foe.hand, state.foe.mana, state.foe.life, state.you.life, state.lastSuitFoe);
  let i = 0;
  const step = () => {
    if (state.phase !== 'ai') return;
    if (i >= plays.length) {
      state.foe.block = 0;
      state.round += 1;
      state.turnsTaken += 1;
      state.you.maxMana = Math.min(MAX_MANA, state.you.maxMana + 1);
      state.you.mana = state.you.maxMana;
      state.foe.maxMana = Math.min(MAX_MANA, state.foe.maxMana + 1);
      state.foe.mana = state.foe.maxMana;
      state.lastSuitYou = null;
      state.lastSuitFoe = null;
      drawUpTo(state.you, HAND_SIZE);
      drawUpTo(state.foe, HAND_SIZE);
      if (checkEnd(state)) { onTurnDone(); return; }
      state.phase = 'playing';
      pushLog(state, `Round ${state.round} — your turn. Mana refilled to ${state.you.mana}.`, 'info');
      onTurnDone();
      return;
    }
    const card = plays[i++];
    const result = playCard(state, 'foe', card);
    if (result) {
      pushLog(state, `Rook plays ${result.note}`, 'bad');
      onFoePlay(result);
    }
    if (checkEnd(state)) { onTurnDone(); return; }
    setTimeout(step, 650);
  };
  setTimeout(step, 500);
}

// Build a fixed, readable mid-game table for screenshots (?scene=table).
export function stageTableScene(state) {
  startDuel(state);
  state.round = 4;
  state.you.life = 24; state.foe.life = 19;
  state.you.mana = 5; state.you.maxMana = 5;
  state.foe.mana = 4; state.foe.maxMana = 5;
  state.you.block = 3;
  state.damageDealt = 27;
  state.cardsPlayed = 9;
  state.turnsTaken = 3;
  state.log = [
    { text: 'Round 3 — you played Fireburst for 6.', kind: 'good' },
    { text: 'Rook played Tide Wall, blocking 5.', kind: 'bad' },
    { text: 'Round 4 — your turn. Mana refilled to 5.', kind: 'info' },
  ];
  pushLog(state, 'Your move — match a suit twice in a row to surge.', 'info');
}

// Build a fixed victory / defeat screen for screenshots (?scene=win|loss).
export function stageEndScene(state, winner) {
  startDuel(state);
  state.round = 7;
  state.damageDealt = 41;
  state.cardsPlayed = 18;
  state.turnsTaken = 6;
  if (winner === 'you') {
    state.foe.life = 0;
    state.you.life = 11;
    state.winner = 'you';
    state.endReason = 'Rook crumbles to dust — the court is yours.';
  } else {
    state.you.life = 0;
    state.foe.life = 8;
    state.winner = 'foe';
    state.endReason = 'Your last ember gutters out. Rook keeps the court.';
  }
  state.phase = 'over';
}
