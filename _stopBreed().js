// ==UserScript==
// @name         PokéBot Breed
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

  function ovoProntoReal(i) {
    try { const e = App.game.breeding.eggList[i](); return e.type !== -1 && e.stepsRemaining() <= 0; }
    catch(e) { return false; }
  }
  function temSlotVazio() {
    try { return App.game.breeding.eggList.some(e => e().type === -1); } catch(e) { return false; }
  }
  function modalAberto() {
    const m = document.querySelector('.scrolling-div-breeding-list');
    return m && m.offsetParent !== null;
  }
  function fecharModal() {
    if (!modalAberto()) return;
    try { $('#breedingModal').modal('hide'); } catch(e) {}
  }
  async function hatch() {
    let n = 0;
    document.querySelectorAll('.clickable[data-bind*="progress() >= 100"]').forEach((btn, i) => {
      if (!ovoProntoReal(i)) return;
      window.PokeBot.simulateClick(btn); n++;
    });
    return n;
  }
  async function preencherUmSlot() {
    if (modalAberto()) { fecharModal(); await sleep(400); }
    if (!temSlotVazio()) return;
    const listBtn = document.querySelector('#breedingDisplay button.btn-primary');
    if (!listBtn) return;
    window.PokeBot.simulateClick(listBtn);
    await sleep(600);
    if (!temSlotVazio()) { fecharModal(); await sleep(400); return; }
    const first = document.querySelector('li.col-sm-4.col-md-3.col-lg-2.pokedexEntry a.overlay');
    if (!first) { fecharModal(); await sleep(400); return; }
    window.PokeBot.simulateClick(first);
    await sleep(400);
    fecharModal();
    await sleep(400);
  }
  async function loop() {
    while (running) {
      try {
        if (modalAberto()) { fecharModal(); await sleep(400); }
        const n = await hatch();
        if (n > 0) await sleep(1500);
        let v = 0;
        while (temSlotVazio() && running) {
          v++; await preencherUmSlot(); await sleep(500);
          if (v >= 4) break;
        }
      } catch(e) { fecharModal(); }
      await sleep(3000);
    }
  }
  function toggle() {
    running = !running;
    window.PokeBot?.showToast(`Breed ${running ? 'ON ✅' : 'OFF ❌'}`);
    if (running) loop();
  }

  const check = setInterval(() => {
    if (window.PokeBot?.registrar) {
      clearInterval(check);
      window.PokeBot.registrar({ key: 'breed', label: '🥚 Breed', shortcut: 'Ctrl+2', toggle, state: () => running });
    }
  }, 200);

})();