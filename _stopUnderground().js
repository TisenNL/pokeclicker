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

  let waitingForRecharge = false;

  async function loop() {
    while (running) {
      try {
        const batteryReady = App.game.underground.battery.canDischarge();

        if (batteryReady && !waitingForRecharge) {
          // Open Underground modal if not open
          const modal = document.getElementById('mineModal');
          if (!modal || !modal.classList.contains('show')) {
            const openBtn = document.querySelector('.btn.btn-block.btn-primary.m-0');
            if (openBtn) {
              openBtn.click();
              await sleep(800); // Wait for modal to open
            }
          }

          // Array of tools to use (in order of preference)
          const tools = ['hammer', 'bomb', 'mira', 'chisel'];
          
          for (const toolName of tools) {
            const toolBtn = document.querySelector(`.underground-tool-container.underground-tool-color__${toolName}.clickable`);
            if (toolBtn) {
              window.PokeBot.simulateClick(toolBtn);
              await sleep(300);
              
              // Click multiple rock tiles with this tool
              const tiles = document.querySelectorAll('#mineModal .mineSquare > .rock');
              let tilesClicked = 0;
              for (const tile of tiles) {
                if (tilesClicked >= 5) break; // Click max 5 tiles per tool
                if (!tile || tile.style.display === 'none') continue;
                const rect = tile.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) continue;
                window.PokeBot.simulateClick(tile);
                await sleep(120);
                tilesClicked++;
              }
            }
          }

          // If still can discharge after using tools, discharge
          if (App.game.underground.battery.canDischarge()) {
            const dischargeBtn = document.querySelector('.underground-tool-color__discharge');
            if (dischargeBtn) {
              window.PokeBot.simulateClick(dischargeBtn);
              await sleep(200);
            }
          }

          // Close the Underground modal after using the tools
          const closeBtn = document.querySelector('#mineModal button.btn.btn-danger');
          if (closeBtn) {
            closeBtn.click();
            await sleep(300);
          }

          waitingForRecharge = true;
        }

        if (!batteryReady) {
          waitingForRecharge = false;
        }
      } catch(e) {
        console.error('Underground automation error:', e);
      }
      await sleep(1000);
    }
  }

  function toggle() {
    running = !running;
    window.PokeBot?.showToast(`Underground ${running ? 'ON ✅' : 'OFF ❌'}`);
    if (running) loop();
  }

  const check = setInterval(() => {
    if (window.PokeBot?.registrar && document.getElementById('bot-btn-container')) {
      clearInterval(check);
      window.PokeBot.registrar({ key: 'underground', label: '⛏️ Underground', shortcut: 'Ctrl+5', toggle, state: () => running });
    }
  }, 200);
  
  // Se ainda não conseguiu registrar em 30 segundos, tenta forçar
  setTimeout(() => {
    if (!window.PokeBot?.modules?.underground) {
      if (window.PokeBot?.registrar) {
        window.PokeBot.registrar({ key: 'underground', label: '⛏️ Underground', shortcut: 'Ctrl+5', toggle, state: () => running });
      }
    }
  }, 30000);

})();