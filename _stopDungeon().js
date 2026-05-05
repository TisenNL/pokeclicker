// ==UserScript==
// @name         PokéBot Dungeon
// @namespace    pokeclicker-bot
// @version      1.0
// @match        https://www.pokeclicker.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function() {
  'use strict';

  let running = false, busy = false, chests = 0;
  const TOTAL = 5;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function isDungeonMapVisible() { const m = document.querySelector('#dungeonMap'); return m && m.offsetParent !== null; }
  function getPos() { try { return DungeonRunner.map.playerPosition(); } catch(e) { return null; } }
  function getTileCoords(td) { const row = td.closest('tr'); return row ? { x: td.cellIndex, y: row.rowIndex } : null; }
  function getTileAt(x, y) { return document.querySelector(`#dungeonMap tr:nth-child(${y+1}) td:nth-child(${x+1})`); }
  function dist(a, b) { return Math.abs(a.x-b.x) + Math.abs(a.y-b.y); }

  function bfs(start, goal) {
    const key = p => `${p.x},${p.y}`;
    const q = [start], vis = new Set([key(start)]), par = { [key(start)]: null };
    while (q.length) {
      const cur = q.shift();
      if (cur.x === goal.x && cur.y === goal.y) {
        let s = cur;
        while (par[key(s)] && key(par[key(s)]) !== key(start)) s = par[key(s)];
        return key(par[key(s)]) === key(start) ? s : s;
      }
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const n = { x: cur.x+dx, y: cur.y+dy }, nk = key(n);
        if (vis.has(nk)) continue;
        const td = getTileAt(n.x, n.y);
        if (!td || td.classList.contains('tile-invisible')) continue;
        vis.add(nk); par[nk] = cur; q.push(n);
      }
    }
    return null;
  }

  function getTarget() {
    const pos = getPos(); if (!pos) return null;
    const inv = Array.from(document.querySelectorAll('#dungeonMap td.tile-invisible'));
    const adj = inv.find(td => { const c = getTileCoords(td); return c && dist(pos,c) === 1; });
    if (adj) return getTileCoords(adj);
    if (chests < TOTAL) {
      let best = null, bd = Infinity;
      for (const c of Array.from(document.querySelectorAll('#dungeonMap td.tile-chest'))) {
        const cc = getTileCoords(c);
        if (bfs(pos,cc)) { const d = dist(pos,cc); if (d < bd) { bd=d; best=cc; } }
      }
      if (best) return best;
      let best2 = null, bd2 = Infinity;
      for (const iv of inv) {
        const ic = getTileCoords(iv);
        for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const vc = { x:ic.x+dx, y:ic.y+dy };
          const td = getTileAt(vc.x, vc.y);
          if (!td || td.classList.contains('tile-invisible')) continue;
          const here = pos.x===vc.x && pos.y===vc.y;
          if (!bfs(pos,vc) && !here) continue;
          const d = dist(pos,vc); if (d < bd2) { bd2=d; best2=vc; }
        }
      }
      if (best2) return best2;
    }
    const boss = document.querySelector('#dungeonMap td.tile-boss');
    return boss ? getTileCoords(boss) : null;
  }

  async function loop() {
    if (!running || busy) return;
    busy = true;
    try {
      if (!isDungeonMapVisible()) {
        for (const btn of document.querySelectorAll('#townView .btn-success')) {
          if (btn.offsetParent === null || !/\d+/.test(btn.innerText.trim())) continue;
          btn.click();
          for (let i = 0; i < 20; i++) { if (isDungeonMapVisible()) break; await sleep(300); }
          chests = 0; break;
        }
        busy = false; setTimeout(loop, 300); return;
      }
      if (document.querySelector('#battleContainer .chest-button')) {
        for (let i = 0; i < 30; i++) {
          const b = document.querySelector('#battleContainer .chest-button');
          if (!b || b.offsetParent === null) break;
          b.click(); await sleep(150);
        }
        chests++;
        busy = false; setTimeout(loop, 50); return;
      }
      if (document.querySelector('#battleContainer button.dungeon-button') && chests >= TOTAL) {
        const bt = document.querySelector('#dungeonMap td.tile-boss');
        if (bt) { bt.click(); await sleep(300); }
        for (let i = 0; i < 30; i++) {
          const b = document.querySelector('#battleContainer button.dungeon-button');
          if (b && b.innerText.includes('Start Bossfight')) { b.click(); break; }
          if (i%5===0 && bt) bt.click();
          await sleep(100);
        }
        for (let i = 0; i < 60 && isDungeonMapVisible() && running; i++) await sleep(500);
        chests = 0; busy = false; setTimeout(loop, 1000); return;
      }
      const pos = getPos();
      if (pos) {
        const target = getTarget();
        if (target) {
          const next = dist(pos,target)===1 ? target : bfs(pos,target);
          if (next) { DungeonRunner.map.moveToCoordinates(next.x, next.y); await sleep(20); }
        }
      }
    } catch(e) {}
    busy = false; setTimeout(loop, 50);
  }

  function toggle() {
    running = !running; chests = 0;
    window.PokeBot?.showToast(`Dungeon ${running ? 'ON ✅' : 'OFF ❌'}`);
    if (running) loop();
  }

  const check = setInterval(() => {
    if (window.PokeBot?.registrar && document.getElementById('bot-btn-container')) {
      clearInterval(check);
      window.PokeBot.registrar({ key: 'dungeon', label: '🏰 Dungeon', shortcut: 'Ctrl+3', toggle, state: () => running });
    }
  }, 200);
  
  // Se ainda não conseguiu registrar em 30 segundos, tenta forçar
  setTimeout(() => {
    if (!window.PokeBot?.modules?.dungeon) {
      if (window.PokeBot?.registrar) {
        window.PokeBot.registrar({ key: 'dungeon', label: '🏰 Dungeon', shortcut: 'Ctrl+3', toggle, state: () => running });
      }
    }
  }, 30000);

})();