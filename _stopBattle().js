// ==UserScript==
// @name         PokéBot Battle
// @namespace    pokeclicker-bot
// @version      1.0
// @match        https://www.pokeclicker.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function() {
  'use strict';

  let running = false;

  function battleTick() {
    if (!running) return;
    try {
      const state = App.game.gameState;
      const G = GameConstants.GameState;
      if (state === G.fighting) Battle.clickAttack();
      else if (state === G.gym) GymBattle.clickAttack();
      else if (state === G.dungeon) {
        try { if (DungeonBattle.enemyPokemon()?.id > 0) DungeonRunner.handleInteraction(); } catch(e) {}
      }
    } catch(e) {}
    const base = 71;
    const pause = Math.random() < 0.03;
    const burst = Math.random() < 0.08;
    let delay = base + (Math.random() - 0.5) * 40;
    if (pause) delay = base * (8 + Math.random() * 10);
    if (burst) delay = base * 0.4;
    setTimeout(battleTick, Math.max(20, delay));
  }

  function toggle() {
    running = !running;
    window.PokeBot?.showToast(`Battle ${running ? 'ON ✅' : 'OFF ❌'}`);
    if (running) battleTick();
  }

  function init() {
    window.PokeBot.registrar({
      key: 'battle',
      label: '⚔️ Battle',
      shortcut: 'Ctrl+1',
      toggle,
      state: () => running
    });
  }

  // Aguarda Core carregar
  const check = setInterval(() => {
    if (window.PokeBot?.registrar && document.getElementById('bot-btn-container')) { 
      clearInterval(check); 
      init(); 
    }
  }, 200);
  
  // Se ainda não conseguiu registrar em 30 segundos, tenta forçar
  setTimeout(() => {
    if (!window.PokeBot?.modules?.battle) {
      if (window.PokeBot?.registrar) init();
    }
  }, 30000);

})();