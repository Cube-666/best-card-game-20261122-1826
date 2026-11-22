// render.js — draws Ember Court's state into the DOM: hands, life, mana,
// the played-card row, the log, and the title / end screens.

import { SUITS, suitSvg } from './cards.js';
import { MAX_LIFE, MAX_MANA } from './game.js';
import { describeIntent } from './ai.js';

const $ = (id) => document.getElementById(id);

export function createRenderer(state, hooks) {
  const els = {
    table: $('table'), titleScreen: $('titleScreen'), endScreen: $('endScreen'),
    helpScreen: $('helpScreen'), scoreboard: $('scoreboard'),
    roundNo: $('roundNo'), dmgDealt: $('dmgDealt'), cardsPlayed: $('cardsPlayed'),
    foeLifeFill: $('foeLifeFill'), foeLifeText: $('foeLifeText'), foeMana: $('foeMana'),
    youLifeFill: $('youLifeFill'), youLifeText: $('youLifeText'), youMana: $('youMana'),
    foeHand: $('foeHand'), youHand: $('youHand'), playedRow: $('playedRow'),
    log: $('log'), foeIntent: $('foeIntent'), endTurnBtn: $('endTurnBtn'),
    endTitle: $('endTitle'), endText: $('endText'), endStats: $('endStats'),
    titleSuits: $('titleSuits'),
  };

  let selectedIndex = -1;
  let lastPlayed = [];
  let lastPlays = [];

  function manaPips(el, mana, maxMana) {
    el.innerHTML = '';
    for (let i = 0; i < MAX_MANA; i++) {
      const pip = document.createElement('span');
      pip.className = 'mana-pip' + (i < mana ? ' full' : '');
      if (i >= maxMana) pip.style.visibility = 'hidden';
      el.appendChild(pip);
    }
    const label = document.createElement('span');
    label.className = 'mana-label';
    label.textContent = `${mana} / ${maxMana} mana`;
    el.appendChild(label);
  }

  function cardElement(card, opts) {
    const o = opts || {};
    const suit = SUITS[card.suit];
    const div = document.createElement('div');
    div.className = `card suit-${card.suit}` + (o.extraClass ? ` ${o.extraClass}` : '');
    const verb = card.kind === 'guard' ? 'Block' : card.kind === 'mend' ? 'Heal' : 'Damage';
    div.innerHTML =
      `<div class="cost" title="Mana cost">${card.cost}</div>` +
      `<div class="suit-mark" title="${suit.name} suit">${suitSvg(card.suit)}</div>` +
      `<div class="art">${suitSvg(card.suit)}</div>` +
      `<div class="power">${card.power} <small>${verb}</small></div>` +
      `<div class="cname">${card.name}</div>` +
      `<div class="ceffect">${card.text}</div>` +
      (o.keyHint != null ? `<div class="keyhint">${o.keyHint + 1}</div>` : '');
    if (o.onClick) div.addEventListener('click', o.onClick);
    return div;
  }

  function cardBackElement() {
    const div = document.createElement('div');
    div.className = 'card card-back';
    div.innerHTML = '<div class="back-mark">?</div>';
    return div;
  }

  function renderHands() {
    els.foeHand.innerHTML = '';
    for (const _card of state.foe.hand) els.foeHand.appendChild(cardBackElement());
    els.youHand.innerHTML = '';
    state.you.hand.forEach((card, i) => {
      const playable = state.phase === 'playing' && card.cost <= state.you.mana;
      const el = cardElement(card, {
        keyHint: i,
        extraClass: (i === selectedIndex ? 'selected ' : '') + (playable ? '' : 'unplayable'),
        onClick: () => hooks.onCardClick(i),
      });
      els.youHand.appendChild(el);
    });
  }

  function renderPlayed() {
    els.playedRow.innerHTML = '';
    if (lastPlayed.length === 0) {
      const note = document.createElement('div');
      note.className = 'empty-note';
      note.textContent = 'No cards played yet this round — play one from your hand.';
      els.playedRow.appendChild(note);
      return;
    }
    for (const played of lastPlayed) {
      els.playedRow.appendChild(cardElement(played.card, { extraClass: 'played' }));
    }
  }

  function renderLog() {
    els.log.innerHTML = '';
    for (const entry of state.log.slice(-8)) {
      const div = document.createElement('div');
      div.className = entry.kind;
      div.textContent = entry.text;
      els.log.appendChild(div);
    }
    els.log.scrollTop = els.log.scrollHeight;
  }

  function render() {
    const over = state.phase === 'over';
    els.table.classList.toggle('hidden', state.phase === 'title');
    els.titleScreen.classList.toggle('hidden', state.phase !== 'title');
    els.scoreboard.classList.toggle('hidden', state.phase === 'title');
    els.endScreen.classList.toggle('hidden', !over);
    els.endScreen.querySelector('.end-panel').classList.toggle('win', state.winner === 'you');
    els.endScreen.querySelector('.end-panel').classList.toggle('loss', state.winner === 'foe');

    els.roundNo.textContent = state.round;
    els.dmgDealt.textContent = state.damageDealt;
    els.cardsPlayed.textContent = state.cardsPlayed;

    els.foeLifeFill.style.width = `${(state.foe.life / MAX_LIFE) * 100}%`;
    els.foeLifeText.textContent = `${state.foe.life} / ${MAX_LIFE}${state.foe.block ? ` · ${state.foe.block} block` : ''}`;
    els.youLifeFill.style.width = `${(state.you.life / MAX_LIFE) * 100}%`;
    els.youLifeText.textContent = `${state.you.life} / ${MAX_LIFE}${state.you.block ? ` · ${state.you.block} block` : ''}`;
    manaPips(els.foeMana, state.foe.mana, state.foe.maxMana);
    manaPips(els.youMana, state.you.mana, state.you.maxMana);

    els.endTurnBtn.disabled = state.phase !== 'playing';
    renderHands();
    renderPlayed();
    renderLog();

    if (over) {
      els.endTitle.textContent = state.winner === 'you' ? 'VICTORY' : 'DEFEAT';
      els.endText.textContent = state.endReason;
      els.endStats.innerHTML =
        stat(state.round, 'Rounds played') +
        stat(state.damageDealt, 'Damage dealt') +
        stat(state.cardsPlayed, 'Cards played') +
        stat(state.you.life, 'Life remaining');
    }
  }

  function stat(value, label) {
    return `<div class="stat"><b>${value}</b><span>${label}</span></div>`;
  }

  function renderTitleSuits() {
    els.titleSuits.innerHTML = '';
    for (const key of Object.keys(SUITS)) {
      const chip = document.createElement('div');
      chip.className = 'suit-chip';
      chip.innerHTML = `${suitSvg(key)}<span>${SUITS[key].name}</span>`;
      els.titleSuits.appendChild(chip);
    }
  }

  function showIntent(plays) {
    els.foeIntent.textContent = describeIntent(plays, state.you.life);
  }

  function notePlayed(played) {
    lastPlayed = [played, ...lastPlayed].slice(0, 3);
    lastPlays = lastPlayed;
    renderPlayed();
  }

  function clearPlayed() {
    lastPlayed = [];
  }

  function selectCard(i) {
    selectedIndex = i;
    renderHands();
  }

  function selectedCard() {
    return selectedIndex >= 0 ? state.you.hand[selectedIndex] : null;
  }

  function clearSelection() {
    selectedIndex = -1;
  }

  renderTitleSuits();
  return { render, showIntent, notePlayed, clearPlayed, selectCard, selectedCard, clearSelection, els };
}
