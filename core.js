// ==UserScript==
// @name         PokéBot Core
// @namespace    pokeclicker-bot
// @version      1.0
// @match        https://www.pokeclicker.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(function() {
  'use strict';

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  function simulateClick(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 10;
    const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * 10;
    const o = {
      bubbles: true, cancelable: true, view: window,
      clientX: x, clientY: y, screenX: window.screenX + x, screenY: window.screenY + y,
      buttons: 1, button: 0, movementX: 0, movementY: 0, relatedTarget: null
    };
    el.dispatchEvent(new MouseEvent('mouseover', o));
    el.dispatchEvent(new MouseEvent('mouseenter', { ...o, bubbles: false }));
    el.dispatchEvent(new MouseEvent('mousemove', o));
    el.dispatchEvent(new MouseEvent('mousedown', o));
    el.dispatchEvent(new MouseEvent('mouseup', o));
    el.dispatchEvent(new MouseEvent('click', o));
    el.dispatchEvent(new MouseEvent('mouseleave', { ...o, bubbles: false }));
    el.dispatchEvent(new MouseEvent('mouseout', o));
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
      position:fixed; bottom:80px; right:20px; z-index:99999;
      background:#333; color:#fff; padding:8px 16px;
      border-radius:8px; font-size:14px; font-weight:bold;
      opacity:1; transition:opacity 1s;
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 1000); }, 2000);
  }

  // Registro global de módulos
  window.PokeBot = { sleep, simulateClick, showToast, modules: {} };
  
  // Cria o painel IMEDIATAMENTE (não espera o App)
  function criarPainel() {
    
    const btnMostrar = document.createElement('button');
    btnMostrar.textContent = '🤖';
    btnMostrar.style.cssText = `
      position:fixed; bottom:20px; right:20px; z-index:99999;
      background:#1a1a2e; color:#fff; border:1px solid #444;
      border-radius:50%; width:40px; height:40px; font-size:18px;
      cursor:pointer; display:none; align-items:center; justify-content:center;
    `;
    document.body.appendChild(btnMostrar);

    const painel = document.createElement('div');
    painel.id = 'bot-painel';
    painel.style.cssText = `
      position:fixed; bottom:20px; right:20px; z-index:99999;
      background:#1a1a2e; border:1px solid #444; border-radius:12px;
      padding:10px; display:flex; flex-direction:column; gap:6px;
      font-family:monospace; font-size:12px; min-width:150px;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;';
    const titulo = document.createElement('div');
    titulo.textContent = '🤖 PokéBot';
    titulo.style.cssText = 'color:#fff; font-weight:bold;';
    const btnMin = document.createElement('button');
    btnMin.textContent = '−';
    btnMin.style.cssText = `
      background:none; border:1px solid #555; color:#aaa;
      border-radius:4px; width:20px; height:20px; cursor:pointer;
      font-size:14px; line-height:1; padding:0;
    `;
    btnMin.onclick = () => { painel.style.display = 'none'; btnMostrar.style.display = 'flex'; };
    btnMostrar.onclick = () => { painel.style.display = 'flex'; btnMostrar.style.display = 'none'; };
    header.appendChild(titulo);
    header.appendChild(btnMin);
    painel.appendChild(header);

    // Container dos botões dos módulos
    const btnContainer = document.createElement('div');
    btnContainer.id = 'bot-btn-container';
    btnContainer.style.cssText = 'display:flex; flex-direction:column; gap:6px;';
    painel.appendChild(btnContainer);

    const hint = document.createElement('div');
    hint.textContent = 'Ctrl+1/2/3/4/5';
    hint.style.cssText = 'color:#555; font-size:10px; text-align:center; margin-top:2px;';
    painel.appendChild(hint);

    document.body.appendChild(painel);

    // Atualiza botões registrados pelos módulos
    setInterval(() => {
      Object.values(window.PokeBot.modules).forEach(m => {
        if (m.btn && m.state) {
          const ativo = m.state();
          m.btn.style.background  = ativo ? '#1a4a1a' : '#2d2d44';
          m.btn.style.color       = ativo ? '#4eff4e' : '#aaa';
          m.btn.style.borderColor = ativo ? '#4eff4e' : '#555';
        }
      });
    }, 500);

    window.PokeBot.painel = painel;
    window.PokeBot.btnContainer = btnContainer;
    console.log('PokéBot: Painel criado com sucesso!');
  }

  // Tenta criar o painel assim que possível
  if (document.body) {
    criarPainel();
  } else {
    document.addEventListener('DOMContentLoaded', criarPainel);
  }

  // Função usada pelos módulos para se registrar no painel
  window.PokeBot.registrar = function({ key, label, shortcut, toggle, state }) {
    const container = document.getElementById('bot-btn-container');
    if (!container) return;

    const btn = document.createElement('button');
    btn.style.cssText = `
      background:#2d2d44; color:#aaa; border:1px solid #555;
      border-radius:6px; padding:6px 10px; cursor:pointer;
      display:flex; justify-content:space-between; align-items:center;
      font-family:monospace; font-size:12px;
    `;
    btn.innerHTML = `<span>${label}</span><span style="font-size:10px;color:#666">${shortcut}</span>`;
    btn.onclick = () => toggle();
    container.appendChild(btn);

    window.PokeBot.modules[key] = { btn, state };

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === shortcut.replace('Ctrl+', '')) {
        e.preventDefault();
        toggle();
      }
    });
  };

  // Aguarda App e depois anuncia que está pronto
  function waitForApp(callback) {
    const check = setInterval(() => {
      try {
        if (typeof App !== 'undefined' && App.game) {
          console.log('PokéBot: App encontrado!');
          clearInterval(check);
          setTimeout(callback, 100);
        }
      } catch(e) {
        console.log('PokéBot: Aguardando App...');
      }
    }, 1000);
  }

  waitForApp(() => {
    showToast('🤖 PokéBot Core carregado!');
    console.log('PokéBot Core: Sistema pronto para módulos');
  });

})();