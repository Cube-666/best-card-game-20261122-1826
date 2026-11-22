// main.js — boots Ember Court: wires buttons and keys, runs the turn flow,
// and stages fixed scenes (?scene=title|table|win|loss) for screenshots.

import { createGame, startDuel, playCard, checkEnd, endPlayerTurn, stageTableScene, stageEndScene } from './game.js';
import { createRenderer } from './render.js';
import { chooseAiPlays } from './ai.js';

const params = new URLSearchParams(location.search);
const scene = params.get('scene');
const seed = Number(params.get('seed') || '20261123');

const state = createGame(seed);
const renderer = createRenderer(state, { onCardClick });

function onCardClick(i) {
  if (state.phase !== 'playing') return;
  const card = state.you.hand[i];
  if (!card) return;
  if (renderer.selectedCard() === card) {
    tryPlayCard(i);
    return;
  }
  renderer.selectCard(i);
  if (card.cost > state.you.mana) {
    state.log.push({ text: `${card.name} costs ${card.cost} mana — you have ${state.you.mana}.`, kind: 'info' });
    renderer.render();
  }
}

function tryPlayCard(i) {
  const card = state.you.hand[i];
  if (!card || state.phase !== 'playing') return;
  const result = playCard(state, 'you', card);
  if (!result) {
    state.log.push({ text: `Not enough mana for ${card.name}.`, kind: 'info' });
    renderer.render();
    return;
  }
  renderer.clearSelection();
  renderer.notePlayed(result);
  state.log.push({ text: `You play ${result.note}`, kind: 'good' });
  if (checkEnd(state)) { renderer.render(); return; }
  renderer.render();
}

function endTurn() {
  if (state.phase !== 'playing') return;
  renderer.clearSelection();
  renderer.clearPlayed();
  const preview = chooseAiPlays(state.foe.hand, state.foe.mana, state.foe.life, state.you.life, null);
  renderer.showIntent(preview);
  state.log.push({ text: 'You end your turn. Rook takes the table…', kind: 'info' });
  renderer.render();
  endPlayerTurn(
    state,
    (played) => { renderer.notePlayed(played); renderer.render(); },
    () => { renderer.clearPlayed(); renderer.render(); },
  );
}

function newDuel() {
  startDuel(state);
  renderer.clearSelection();
  renderer.clearPlayed();
  renderer.render();
}

document.getElementById('startBtn').addEventListener('click', newDuel);
document.getElementById('againBtn').addEventListener('click', newDuel);
document.getElementById('endTurnBtn').addEventListener('click', endTurn);
document.getElementById('helpBtn').addEventListener('click', () => {
  document.getElementById('helpScreen').classList.remove('hidden');
});
document.getElementById('closeHelpBtn').addEventListener('click', () => {
  document.getElementById('helpScreen').classList.add('hidden');
});

document.addEventListener('keydown', (event) => {
  if (state.phase === 'title' && (event.key === 'Enter' || event.key === ' ')) { newDuel(); return; }
  if (state.phase === 'over' && (event.key === 'r' || event.key === 'R' || event.key === 'Enter')) { newDuel(); return; }
  if (state.phase !== 'playing') return;
  if (event.key >= '1' && event.key <= '7') {
    const i = Number(event.key) - 1;
    if (state.you.hand[i]) { renderer.selectCard(i); renderer.render(); }
    return;
  }
  if (event.key === 'Enter') {
    const card = renderer.selectedCard();
    if (card) tryPlayCard(state.you.hand.indexOf(card));
    return;
  }
  if (event.key === 'e' || event.key === 'E') endTurn();
});

// Screenshot scenes: fixed, readable states of the real game.
if (scene === 'table') {
  stageTableScene(state);
  // Play two real cards through the rules so the midfield shows them.
  const yourCard = state.you.hand.find((c) => c.cost <= state.you.mana);
  if (yourCard) { const r = playCard(state, 'you', yourCard); if (r) renderer.notePlayed(r); }
  const foeCard = state.foe.hand.find((c) => c.cost <= state.foe.mana);
  if (foeCard) { const r = playCard(state, 'foe', foeCard); if (r) renderer.notePlayed(r); }
  // Restore the staged, readable table numbers after those real plays.
  state.you.life = 24; state.foe.life = 19;
  state.you.mana = 5; state.foe.mana = 4;
  state.you.block = 3; state.foe.block = 0;
  const preview = chooseAiPlays(state.foe.hand, state.foe.mana, state.foe.life, state.you.life, null);
  renderer.showIntent(preview);
  renderer.render();
} else if (scene === 'win' || scene === 'loss') {
  stageEndScene(state, scene === 'win' ? 'you' : 'foe');
  renderer.render();
} else {
  renderer.render();
}
