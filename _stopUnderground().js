// ==UserScript==
// @name         PokéBot Underground
// @namespace    pokeclicker-bot
// @version      3.0
// @match        https://www.pokeclicker.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function () {
  'use strict';

  let running = false;

  // ── Helpers ──────────────────────────────────────────────────────────────

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // ── Lógica do jogo ────────────────────────────────────────────────────────

  /**
   * Retorna o ID da ferramenta Bomb via enum do jogo.
   * Evita hardcodar o número do ID.
   */
  function getBombId() {
    try {
      return UndergroundToolType.Bomb;
    } catch {
      return null;
    }
  }

  /**
   * Chama a bomba diretamente pela API do jogo.
   * Só dispara se a ferramenta puder ser usada.
   */
  function useBomb() {
    try {
      const id = getBombId();
      if (id === null) return;

      const tool = App.game.underground.tools.tools.find(t => t.id === id);
      if (!tool) return;

      const settingOk = Settings.getSetting('enableUndergroundModuleMineControls').observableValue();
      if (!settingOk) return;

      if (tool.canUseTool()) {
        App.game.underground.tools.useTool(id, 0, 0);
      }
    } catch (e) {
      console.error('[Underground] Erro ao usar bomba:', e);
    }
  }

  /**
   * Verifica dinamicamente se a bateria está cheia (charges >= maxCharges)
   * e dispara o discharge diretamente pela API do jogo.
   */
  function tryDischarge() {
    try {
      const bat = App.game.underground.battery;
      const settingOk = Settings.getSetting('enableUndergroundModuleMineControls').observableValue();
      if (!settingOk) return;

      if (bat.canDischarge()) {
        bat.discharge();
      }
    } catch (e) {
      console.error('[Underground] Erro ao descarregar bateria:', e);
    }
  }

  // ── Loop principal ────────────────────────────────────────────────────────

  async function loop() {
    while (running) {
      // 1) Descarrega a bateria se estiver cheia
      tryDischarge();

      // 2) Usa a bomba constantemente
      useBomb();

      // Intervalo humanizado entre cada iteração (~200–450 ms)
      await sleep(randInt(200, 450));
    }
  }

  // ── Registro no PokéBot ───────────────────────────────────────────────────

  function toggle() {
    running = !running;
    window.PokeBot?.showToast(`Underground ${running ? 'ON ✅' : 'OFF ❌'}`);
    if (running) loop();
  }

  const check = setInterval(() => {
    if (window.PokeBot?.registrar && document.getElementById('bot-btn-container')) {
      clearInterval(check);
      window.PokeBot.registrar({
        key: 'underground',
        label: '⛏️ Underground',
        shortcut: 'Ctrl+5',
        toggle,
        state: () => running,
      });
    }
  }, 200);

  setTimeout(() => {
    if (!window.PokeBot?.modules?.underground && window.PokeBot?.registrar) {
      window.PokeBot.registrar({
        key: 'underground',
        label: '⛏️ Underground',
        shortcut: 'Ctrl+5',
        toggle,
        state: () => running,
      });
    }
  }, 30_000);

})();