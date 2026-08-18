/* AMINA · Actividades de gramática con palabras movibles
   Compatible con ratón, pantalla táctil y teclado. Conserva los comprobadores,
   puntajes, límites de errores y envío de resultados de cada actividad. */
(function () {
  'use strict';

  const STYLE_ID = 'amina-word-order-style';
  const mounted = new WeakMap();

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .amina-order-wrap{margin:16px 0;display:grid;gap:12px}
      .amina-order-label{font-weight:800;color:inherit;margin:0}
      .amina-word-bank,.amina-answer-zone{display:flex;flex-wrap:wrap;gap:9px;align-items:center;min-height:64px;padding:12px;border:2px dashed rgba(84,214,255,.55);border-radius:16px;background:rgba(0,0,0,.16)}
      .amina-answer-zone{border-style:solid;background:rgba(84,214,255,.09)}
      .amina-answer-zone:empty::before{content:'Toca o arrastra aquí las palabras en el orden correcto';opacity:.72;font-weight:650}
      .amina-word-tile{appearance:none;border:1px solid rgba(255,255,255,.26);border-radius:12px;padding:10px 13px;background:#f7fbff;color:#10243c;font:inherit;font-weight:800;cursor:grab;box-shadow:0 5px 13px rgba(0,0,0,.18);touch-action:manipulation;user-select:none}
      .amina-word-tile:active{cursor:grabbing;transform:scale(.98)}
      .amina-word-tile:focus-visible{outline:3px solid #ffd166;outline-offset:2px}
      .amina-word-tile[aria-pressed='true']{background:#54d6ff}
      .amina-drag-over{outline:3px solid #9af079;outline-offset:2px}
      .amina-hidden-answer{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}
      .amina-help{font-size:.92rem;opacity:.82;margin:0}
      @media (max-width:640px){.amina-word-tile{padding:12px 14px;min-height:46px}.amina-word-bank,.amina-answer-zone{min-height:70px}}
    `;
    document.head.appendChild(style);
  }

  function normalizeWords(text) {
    return String(text || '').trim().split(/\s+/).filter(Boolean);
  }

  function shuffle(words) {
    const copy = words.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    if (copy.length > 2 && copy.join(' ') === words.join(' ')) {
      copy.push(copy.shift());
    }
    return copy;
  }

  function currentItem(kind) {
    try {
      if (typeof activity1 === 'undefined' || typeof activity2 === 'undefined') return null;
      const list = kind === 1 ? activity1 : activity2;
      let index = 0;
      if (typeof state !== 'undefined' && state && state['a' + kind]) index = state['a' + kind].index || 0;
      else if (kind === 1 && typeof idx1 !== 'undefined') index = idx1;
      else if (kind === 2 && typeof idx2 !== 'undefined') index = idx2;
      return list && list[index] ? list[index] : null;
    } catch (_) { return null; }
  }

  function answerFor(kind) {
    const item = currentItem(kind);
    if (!item) return '';
    if (Array.isArray(item.answers) && item.answers.length) return item.answers[0];
    return item.answer || item.en || item.english || '';
  }

  function sync(input, answerZone) {
    input.value = Array.from(answerZone.querySelectorAll('.amina-word-tile')).map(x => x.dataset.word).join(' ');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function mount(input, kind) {
    if (!input || mounted.has(input)) return;
    addStyles();
    input.classList.add('amina-hidden-answer');
    input.setAttribute('aria-hidden', 'true');
    input.tabIndex = -1;

    const wrap = document.createElement('div');
    wrap.className = 'amina-order-wrap';
    wrap.dataset.aminaKind = String(kind);
    wrap.innerHTML = `<p class="amina-order-label">Banco de palabras</p><div class="amina-word-bank" role="list" aria-label="Palabras disponibles"></div><p class="amina-order-label">Tu oración en inglés</p><div class="amina-answer-zone" role="list" aria-label="Oración ordenada"></div><p class="amina-help">Toca una palabra para moverla. También puedes arrastrarla; toca una palabra de tu oración para devolverla.</p>`;
    input.parentNode.insertBefore(wrap, input);
    const bank = wrap.querySelector('.amina-word-bank');
    const zone = wrap.querySelector('.amina-answer-zone');
    let signature = '';
    let dragged = null;

    function move(tile, destination, before) {
      if (!tile) return;
      destination.insertBefore(tile, before || null);
      tile.setAttribute('aria-pressed', destination === zone ? 'true' : 'false');
      sync(input, zone);
    }

    function makeTile(word, id) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'amina-word-tile';
      tile.dataset.word = word;
      tile.dataset.id = id;
      tile.textContent = word;
      tile.draggable = true;
      tile.setAttribute('role', 'listitem');
      tile.setAttribute('aria-pressed', 'false');
      tile.title = 'Toca para mover';
      tile.addEventListener('click', () => move(tile, tile.parentNode === bank ? zone : bank));
      tile.addEventListener('dragstart', e => { dragged = tile; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); });
      tile.addEventListener('dragend', () => { dragged = null; bank.classList.remove('amina-drag-over'); zone.classList.remove('amina-drag-over'); });
      return tile;
    }

    [bank, zone].forEach(container => {
      container.addEventListener('dragover', e => { e.preventDefault(); container.classList.add('amina-drag-over'); });
      container.addEventListener('dragleave', () => container.classList.remove('amina-drag-over'));
      container.addEventListener('drop', e => {
        e.preventDefault(); container.classList.remove('amina-drag-over');
        if (!dragged) return;
        let before = null;
        if (container === zone) {
          const tiles = Array.from(zone.querySelectorAll('.amina-word-tile:not(:active)'));
          before = tiles.find(t => e.clientX < t.getBoundingClientRect().left + t.offsetWidth / 2) || null;
        }
        move(dragged, container, before);
      });
    });

    function render(force) {
      const answer = answerFor(kind);
      const item = currentItem(kind);
      if (!answer || !item) return;
      const itemSignature = JSON.stringify(item) + '|' + answer;
      if (!force && itemSignature === signature) return;
      signature = itemSignature;
      bank.innerHTML = '';
      zone.innerHTML = '';
      input.value = '';
      const words = shuffle(normalizeWords(answer));
      words.forEach((word, i) => bank.appendChild(makeTile(word, kind + '-' + i + '-' + word)));
      if (kind === 2) {
        const prompt = document.getElementById('a2Prompt');
        if (prompt) prompt.setAttribute('aria-label', 'Oración fija en español: ' + prompt.textContent);
      }
    }

    mounted.set(input, { render });
    render(true);
    const observer = new MutationObserver(() => setTimeout(() => render(false), 0));
    const prompt = document.getElementById(kind === 1 ? 'a1Scramble' : 'a2Prompt') || document.getElementById(kind === 1 ? 'a1Prompt' : 'a2ProgressText');
    if (prompt) observer.observe(prompt, { childList: true, subtree: true, characterData: true });

    const checkButton = document.getElementById(kind === 1 ? 'a1Check' : 'a2Check') || document.getElementById(kind === 1 ? 'checkA1' : 'checkA2');
    if (checkButton) checkButton.addEventListener('click', () => setTimeout(() => render(false), 40));
    document.querySelectorAll(kind === 1 ? '[onclick*="resetActivity1"],#restartA1' : '[onclick*="resetActivity2"],#restartA2').forEach(b => b.addEventListener('click', () => setTimeout(() => render(true), 40)));
  }

  function start() {
    mount(document.getElementById('a1Answer'), 1);
    mount(document.getElementById('translationInput') || document.getElementById('a2Answer'), 2);
    const a2 = document.getElementById('activity2') || document.getElementById('actividad2');
    if (a2) {
      const intro = a2.querySelector('p');
      if (intro) intro.innerHTML = '<b>Instrucciones:</b> Lee la oración fija en español y ordena las palabras en inglés. Puedes tocarlas o arrastrarlas.';
    }
    const a1 = document.getElementById('activity1') || document.getElementById('actividad1');
    if (a1 && document.getElementById('a1Answer')) {
      const intro = a1.querySelector('p');
      if (intro) intro.innerHTML = '<b>Instrucciones:</b> Ordena las palabras movibles para formar la oración correcta. Puedes tocarlas o arrastrarlas.';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
