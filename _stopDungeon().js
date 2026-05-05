// ==UserScript==
// @name         PokéBot Dungeon
// @namespace    pokeclicker-bot
// @version      7.0
// @match        https://www.pokeclicker.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function() {
  'use strict';

  let running = false, busy = false, chestsOpened = 0, TOTAL = 0;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function isDungeonMapVisible() {
    const m = document.querySelector('#dungeonMap');
    return m && m.offsetParent !== null;
  }

  function getPos() {
    try { return DungeonRunner.map.playerPosition(); } catch(e) { return null; }
  }

  function getTotalChests() {
    try { return DungeonRunner.map.totalChests(); } catch(e) { return 0; }
  }

  function getBoard() {
    try { return DungeonRunner.map.board()?.[0]; } catch(e) { return null; }
  }

  function getBoardSize() {
    const board = getBoard();
    if (!board) return { w: 0, h: 0 };
    return { w: board[0]?.length || 0, h: board.length };
  }

  function getTileType(x, y) {
    const board = getBoard();
    if (!board || !board[y] || !board[y][x]) return -1;
    try { return board[y][x].type(); } catch(e) { return -1; }
  }

  function isTileVisible(x, y) {
    const board = getBoard();
    if (!board || !board[y] || !board[y][x]) return false;
    return board[y][x]._isVisible === true;
  }

  function isTileVisited(x, y) {
    const board = getBoard();
    if (!board || !board[y] || !board[y][x]) return true;
    return board[y][x]._isVisited === true;
  }

  // 🔍 NOVA FUNÇÃO: Encontra o Boss lendo as classes CSS do DOM (como você identificou)
  function findBossTile() {
    // Procura por qualquer célula (td) que tenha a classe 'tile-boss'
    const bossEls = document.querySelectorAll('#dungeonMap td.tile-boss');
    if (bossEls.length > 0) {
      const el = bossEls[0]; // Pega o primeiro encontrado
      // cellIndex é o X, rowIndex do pai (tr) é o Y
      return { x: el.cellIndex, y: el.parentElement.rowIndex };
    }
    return null;
  }

  function bfsVisible(start, goalFn) {
    const { w, h } = getBoardSize();
    const allChestsOpen = chestsOpened >= TOTAL;
    const key = p => `${p.x},${p.y}`;
    const q = [{ ...start }];
    const vis = new Set([key(start)]);
    const par = { [key(start)]: null };

    while (q.length) {
      const cur = q.shift();
      if (goalFn(cur)) {
        let s = cur;
        while (par[key(s)] !== null && key(par[key(s)]) !== key(start)) {
          s = par[key(s)];
        }
        return s;
      }
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = cur.x + dx, ny = cur.y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nk = key({ x: nx, y: ny });
        if (vis.has(nk)) continue;

        const tType = getTileType(nx, ny);
        // 🛑 Bloqueia navegação pelo boss enquanto há baús pendentes
        if (!allChestsOpen && tType === 1) continue; // Evita sair pela tile de saída (tipo 1)

        const visible = isTileVisible(nx, ny);
        const isGoal = goalFn({ x: nx, y: ny });
        if (!visible && !isGoal) continue;

        vis.add(nk);
        par[nk] = cur;
        q.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  function getNextStep() {
    const pos = getPos();
    if (!pos) return null;
    const { w, h } = getBoardSize();
    const allChestsOpen = chestsOpened >= TOTAL;
    
    // Identifica onde está o Boss real via DOM
    const bossCoords = findBossTile();
    const onBoss = bossCoords && pos.x === bossCoords.x && pos.y === bossCoords.y;

    // 🚨 Se está no Boss mas AINDA FALTAM BAÚS, saia imediatamente para um vizinho visível
    if (onBoss && !allChestsOpen) {
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = pos.x + dx, ny = pos.y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && isTileVisible(nx, ny)) {
          return { x: nx, y: ny };
        }
      }
    }

    // ✅ Se já está no Boss e todos os baús estão abertos, não navegue. Deixe o loop clicar.
    if (onBoss && allChestsOpen) return null;

    // 1️⃣ Baú diretamente adjacente (prioridade máxima)
    if (!allChestsOpen) {
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = pos.x + dx, ny = pos.y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (getTileType(nx, ny) === 2 && !isTileVisited(nx, ny)) return { x: nx, y: ny };
      }
    }

    // 2️ Tile não visitada adjacente
    const adjUnvisited = [];
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = pos.x + dx, ny = pos.y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const tType = getTileType(nx, ny);
      if (!isTileVisited(nx, ny)) {
        // Se ainda tem baús, evita o Boss (que pode ser tipo 1 ou outro)
        if (!allChestsOpen && onBoss) continue; 
        adjUnvisited.push({ x: nx, y: ny, type: tType });
      }
    }
    if (adjUnvisited.length > 0) {
      adjUnvisited.sort((a, b) => (a.type === 2 ? 0 : 1) - (b.type === 2 ? 0 : 1));
      return adjUnvisited[0];
    }

    // 3️⃣ BFS para tile não visitada acessível
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (isTileVisited(x, y)) continue;
        const tType = getTileType(x, y);
        if (!allChestsOpen && tType === 1) continue; // Evita sair pela tile de saída

        let reachable = false;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          if (isTileVisible(x + dx, y + dy)) { reachable = true; break; }
        }
        if (!reachable) continue;

        const step = bfsVisible(pos, p => p.x === x && p.y === y);
        if (step) return step;
      }
    }

    // 4️⃣ Todos os baús abertos: ir AO BOSS REAL (coordenadas do DOM)
    if (allChestsOpen && bossCoords) {
      // BFS direto para as coordenadas do Boss encontradas via classe .tile-boss
      return bfsVisible(pos, p => p.x === bossCoords.x && p.y === bossCoords.y);
    }

    return null;
  }

  async function loop() {
    if (!running || busy) return;
    busy = true;

    try {
      // Inicialização da dungeon
      if (!isDungeonMapVisible()) {
        for (const btn of document.querySelectorAll('#townView .btn-success')) {
          if (btn.offsetParent === null || !/\d+/.test(btn.innerText.trim())) continue;
          btn.click();
          for (let i = 0; i < 20; i++) {
            if (isDungeonMapVisible()) break;
            await sleep(300);
          }
          if (isDungeonMapVisible()) {
            chestsOpened = 0;
            await sleep(500);
            TOTAL = getTotalChests();
            console.log(`[PokéBot] Dungeon iniciada. Baús totais: ${TOTAL}`);
          }
          break;
        }
        busy = false;
        setTimeout(loop, 300);
        return;
      }

      if (TOTAL === 0) TOTAL = getTotalChests();

      // 📦 Abrir baú ativo
      const chestBtn = document.querySelector('#battleContainer .chest-button');
      if (chestBtn && chestBtn.offsetParent !== null) {
        for (let i = 0; i < 30; i++) {
          const b = document.querySelector('#battleContainer .chest-button');
          if (!b || b.offsetParent === null) break;
          b.click();
          await sleep(150);
        }
        chestsOpened++;
        console.log(`[PokéBot] Baú aberto (${chestsOpened}/${TOTAL})`);
        busy = false;
        setTimeout(loop, 50);
        return;
      }

      // 🗡️ Lógica do Boss
      const btn = document.querySelector('#battleContainer button.dungeon-button');
      if (btn && btn.offsetParent !== null) {
        const txt = btn.innerText.trim();

        // ✅ Condição exata para iniciar a luta
        if (txt === 'Start Bossfight' && chestsOpened >= TOTAL) {
          console.log('[PokéBot] ⚔️ Iniciando bossfight!');
          btn.click();
          for (let i = 0; i < 60 && isDungeonMapVisible() && running; i++) await sleep(500);
          busy = false;
          setTimeout(loop, 800);
          return;
        }
        // Se o botão for "Leave Dungeon" ou "Start" com baús pendentes, IGNORA e continua explorando
      }

      // 🧭 Navegação
      const next = getNextStep();
      if (next) {
        try { DungeonRunner.map.moveToCoordinates(next.x, next.y); } catch(e) {}
        await sleep(100);
      } else {
        await sleep(200);
      }

    } catch(e) {
      console.warn('[PokéBot] Erro no loop:', e);
    }

    busy = false;
    setTimeout(loop, 50);
  }

  function toggle() {
    running = !running;
    chestsOpened = 0;
    TOTAL = 0;
    window.PokeBot?.showToast?.(`Dungeon ${running ? 'ON ✅' : 'OFF ❌'}`);
    if (running) loop();
  }

  const check = setInterval(() => {
    if (window.PokeBot?.registrar && document.getElementById('bot-btn-container')) {
      clearInterval(check);
      window.PokeBot.registrar({ key: 'dungeon', label: '🏰 Dungeon', shortcut: 'Ctrl+3', toggle, state: () => running });
    }
  }, 200);

  setTimeout(() => {
    if (!window.PokeBot?.modules?.dungeon && window.PokeBot?.registrar) {
      window.PokeBot.registrar({ key: 'dungeon', label: '🏰 Dungeon', shortcut: 'Ctrl+3', toggle, state: () => running });
    }
  }, 30000);

})();