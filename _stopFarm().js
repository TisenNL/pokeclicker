// ==UserScript==
// @name         PokéBot Farm
// @namespace    pokeclicker-bot
// @version      1.0
// @match        https://www.pokeclicker.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function() {
  'use strict';

  let running = false;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  async function loop() {
    while (running) {
      try {
        const plots = App.game.farming.plotList;
        for (let i = 0; i < plots.length; i++) {
          if (!running) break;
          const p = plots[i];
          if (!p._isUnlocked()) continue;
          const isEmpty = p.isEmpty ? p.isEmpty() : (p._berry() === -1);
          const stage = p.stage ? p.stage() : 0;
          if (isEmpty || (!isEmpty && stage >= 4)) {
            FarmController.plotClickMini(i, new MouseEvent('click', { bubbles: true, cancelable: true }));
            await sleep(1000);
          }
        }
      } catch(e) {}
      await sleep(2000);
    }
  }

  function toggle() {
    running = !running;
    window.PokeBot?.showToast(`Farm ${running ? 'ON ✅' : 'OFF ❌'}`);
    if (running) loop();
  }

  const check = setInterval(() => {
    if (window.PokeBot?.registrar && document.getElementById('bot-btn-container')) {
      clearInterval(check);
      window.PokeBot.registrar({ key: 'farm', label: '🌱 Farm', shortcut: 'Ctrl+4', toggle, state: () => running });
    }
  }, 200);
  
  // Se ainda não conseguiu registrar em 30 segundos, tenta forçar
  setTimeout(() => {
    if (!window.PokeBot?.modules?.farm) {
      if (window.PokeBot?.registrar) {
        window.PokeBot.registrar({ key: 'farm', label: '🌱 Farm', shortcut: 'Ctrl+4', toggle, state: () => running });
      }
    }
  }, 30000);

})();