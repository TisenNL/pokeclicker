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
  let noEggsAvailable = false;
  let lastEggCheck = 0;

  function getListButton() {
    return Array.from(document.querySelectorAll('#breedingDisplay button.btn-primary'))
      .find(btn => btn.offsetParent !== null && !btn.disabled && !btn.closest('.modal') && /list|egg|add|adicionar/i.test(btn.innerText));
  }

  function getQueueCount() {
    try {
      const list = App.game.breeding._queueList();
      return Array.isArray(list) ? list.length : 0;
    } catch(e) {
      return 0;
    }
  }

  function getQueueCapacity() {
    try {
      return App.game.breeding.queueSlots();
    } catch(e) {
      return 4;
    }
  }

  function hasQueueSpace() {
    return getQueueCount() < getQueueCapacity();
  }

  function temSlotVazio() {
    try {
      if (!hasQueueSpace()) return false;
      if (noEggsAvailable && Date.now() - lastEggCheck < 5000) return false;
      return !!getListButton();
    } catch(e) { return false; }
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
    if (n > 0) {
      noEggsAvailable = false;
    }
    return n;
  }
  async function preencherUmSlot() {
    if (!hasQueueSpace()) return;
    if (modalAberto()) { fecharModal(); await sleep(400); }
    const listBtn = getListButton();
    if (!listBtn) return;
    window.PokeBot.simulateClick(listBtn);
    await sleep(600);
    const overlayButtons = Array.from(document.querySelectorAll('.scrolling-div-breeding-list a.overlay'))
      .filter(el => el.offsetParent !== null);
    if (overlayButtons.length === 0) {
      fecharModal(); await sleep(400);
      noEggsAvailable = true;
      lastEggCheck = Date.now();
      return;
    }
    window.PokeBot.simulateClick(overlayButtons[0]);
    await sleep(400);
    fecharModal();
    noEggsAvailable = false;
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
          if (v >= 8) break;
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
    if (window.PokeBot?.registrar && document.getElementById('bot-btn-container')) {
      clearInterval(check);
      window.PokeBot.registrar({ key: 'breed', label: '🥚 Breed', shortcut: 'Ctrl+2', toggle, state: () => running });
    }
  }, 200);
  
  // Se ainda não conseguiu registrar em 30 segundos, tenta forçar
  setTimeout(() => {
    if (!window.PokeBot?.modules?.breed) {
      if (window.PokeBot?.registrar) {
        window.PokeBot.registrar({ key: 'breed', label: '🥚 Breed', shortcut: 'Ctrl+2', toggle, state: () => running });
      }
    }
  }, 30000);

})();