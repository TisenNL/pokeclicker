// ==UserScript==
// @name         PokéBot Underground
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
        if (App.game.underground.battery.canDischarge()) {
          const btn = document.querySelector('.underground-tool-color__discharge');
          if (btn) window.PokeBot.simulateClick(btn);
        }
      } catch(e) {}
      await sleep(1000);
    }
  }

  function toggle() {
    running = !running;
    window.PokeBot?.showToast(`Underground ${running ? 'ON ✅' : 'OFF ❌'}`);
    if (running) loop();
  }

  const check = setInterval(() => {
    if (window.PokeBot?.registrar) {
      clearInterval(check);
      window.PokeBot.registrar({ key: 'underground', label: '⛏️ Underground', shortcut: 'Ctrl+5', toggle, state: () => running });
    }
  }, 200);

})();