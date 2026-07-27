
(() => {
  'use strict';
  const KEY = 'fonetica_resultados_uniformes_v1';

  function safeEval(name, fallback) {
    try {
      const value = eval(`typeof ${name} !== 'undefined' ? ${name} : undefined`);
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function inferCategory() {
    const file = location.pathname.toLowerCase();
    if (file.includes('/consonants/') || file.includes('consonantes_')) return 'Consonantes';
    if (file.includes('blends_')) return 'Blends';
    if (/aia|aua|eia|oia|oua/.test(file)) return 'Triptongos';
    if (/vocal_(ai|ei|ia|oi|ua|au|ea|ou|ju|rcolored)/.test(file)) return 'Diptongos';
    return 'Vocales';
  }

  function pageTopic() {
    const h1 = document.querySelector('h1');
    return (h1?.textContent || document.title || 'Actividad de fonética').trim();
  }

  function unique(list) {
    return [...new Set(list.filter(Boolean).map(v => String(v).trim()).filter(Boolean))];
  }

  function getMainWords() {
    const candidates = [
      safeEval('WORDS_IN_PATH', []),
      safeEval('PATH_WORDS', []),
      safeEval('ALL_WORDS', []),
      safeEval('WORDS', []),
      safeEval('VOCABULARY', [])
    ];
    const flat = candidates.flatMap(v => Array.isArray(v) ? v : []);
    const words = flat.map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item.word === 'string') return item.word;
      if (item && typeof item.text === 'string') return item.text;
      return '';
    });
    return unique(words);
  }

  function getSentences() {
    const candidates = [
      safeEval('SENTENCES', []),
      safeEval('PHRASES', []),
      safeEval('EXAMPLE_SENTENCES', [])
    ];
    const flat = candidates.flatMap(v => Array.isArray(v) ? v : []);
    return unique(flat.map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item.sentence === 'string') return item.sentence;
      if (item && typeof item.text === 'string') return item.text;
      return '';
    }));
  }

  function extractSentenceVocabulary(sentences) {
    const stop = new Set([
      'a','an','the','and','or','but','so','for','nor','yet','in','on','at','to','of',
      'from','with','by','as','is','are','was','were','be','been','being','am','do',
      'does','did','have','has','had','it','its','this','that','these','those','i','you',
      'he','she','we','they','my','your','his','her','our','their','me','him','us','them'
    ]);
    const words = [];
    sentences.forEach(sentence => {
      const found = sentence.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) || [];
      found.forEach(word => {
        const normalized = word.toLowerCase();
        if (!stop.has(normalized)) words.push(word);
      });
    });
    return unique(words);
  }

  function getIpaMap(words) {
    const sounds = safeEval('WORD_SOUNDS', {});
    const titleIpa = (pageTopic().match(/\/[^/]+\//) || [''])[0];
    return words.map(word => ({
      word,
      ipa: sounds[word] || sounds[word.toUpperCase()] || sounds[word.toLowerCase()] || titleIpa || ''
    }));
  }

  function getStudent() {
    const selectors = ['#studentName','#nombreEstudiante','#nameInput','input[name="student"]'];
    for (const selector of selectors) {
      const value = document.querySelector(selector)?.value?.trim();
      if (value) return value;
    }
    return localStorage.getItem('studentName') || 'Estudiante';
  }

  function textOf(ids) {
    for (const id of ids) {
      const value = document.getElementById(id)?.textContent?.trim();
      if (value) return value;
    }
    return '';
  }

  function collectStats() {
    const mazeDone = Boolean(
      safeEval('completedMaze', false) ||
      document.querySelector('.finish.completed,.cell.finish.completed,[data-finished="true"]')
    );
    const sentenceMessage = textOf(['sentenceMessage','messageSentences','oracionesMensaje']);
    const sentencesDone = Boolean(
      safeEval('lockedSentences', false) ||
      /excelente|complet|finaliz|desbloque/i.test(sentenceMessage)
    );
    return {
      mazeDone,
      sentencesDone,
      progress: textOf(['progressPill','progress','mazeProgress']),
      mistakes: textOf(['mistakePill','mistakes','errorCount']),
      sentenceProgress: textOf(['sentenceProgressPill','sentenceProgress']),
      score: (mazeDone ? 50 : 0) + (sentencesDone ? 50 : 0)
    };
  }

  function saveResult(showToast = true) {
    const sentences = getSentences();
    const mainWords = getMainWords();
    const record = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      student: getStudent(),
      category: inferCategory(),
      topic: pageTopic(),
      date: new Date().toISOString(),
      words: getIpaMap(mainWords),
      sentenceVocabulary: extractSentenceVocabulary(sentences),
      sentences,
      stats: collectStats(),
      source: location.pathname
    };

    let history = [];
    try { history = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch {}
    history.unshift(record);
    localStorage.setItem(KEY, JSON.stringify(history.slice(0, 300)));

    if (showToast) {
      const old = document.getElementById('foneticaSavedToast');
      if (old) old.remove();
      const toast = document.createElement('div');
      toast.id = 'foneticaSavedToast';
      toast.textContent = '✅ Resultado guardado';
      toast.style.cssText = 'position:fixed;right:16px;bottom:84px;z-index:99999;background:#166534;color:#fff;padding:12px 16px;border-radius:14px;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.28)';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2200);
    }
  }

  function addControls() {
    if (document.getElementById('foneticaResultsControls')) return;
    const box = document.createElement('div');
    box.id = 'foneticaResultsControls';
    box.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:99998;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end';

    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = '💾 Guardar resultado';
    save.style.cssText = 'border:0;border-radius:14px;padding:11px 14px;background:#0f766e;color:#fff;font-weight:800;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.24)';
    save.onclick = () => saveResult(true);

    const view = document.createElement('button');
    view.type = 'button';
    view.textContent = '📊 Ver resultados';
    view.style.cssText = 'border:0;border-radius:14px;padding:11px 14px;background:#7c3aed;color:#fff;font-weight:800;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.24)';
    view.onclick = () => {
      saveResult(false);
      location.href = '../RESULTADOS/index.html';
    };

    box.append(save, view);
    document.body.appendChild(box);
  }

  function addSpeechButtons() {
    const selectors = [
      '[data-word]','[data-sentence]','.word','.vocab-word','.sentence',
      '.example-sentence','.mini-test-word','.mini-word'
    ];
    const seen = new Set();
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (seen.has(el) || el.querySelector('.foneticaSpeakBtn')) return;
        seen.add(el);
        const text = (el.dataset.word || el.dataset.sentence || el.textContent || '').trim();
        if (!text || text.length > 220) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'foneticaSpeakBtn';
        btn.textContent = '🔊';
        btn.title = 'Escuchar';
        btn.style.cssText = 'margin-left:7px;border:0;border-radius:9px;padding:4px 8px;background:#e0f2fe;color:#075985;font-weight:800;cursor:pointer';
        btn.onclick = ev => {
          ev.preventDefault();
          ev.stopPropagation();
          speechSynthesis.cancel();
          const msg = new SpeechSynthesisUtterance(text);
          msg.lang = 'en-US';
          msg.rate = 0.82;
          const voices = speechSynthesis.getVoices();
          msg.voice = voices.find(v => /^en[-_](US|GB)/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang)) || null;
          speechSynthesis.speak(msg);
        };
        el.appendChild(btn);
      });
    });
  }

  function replaceUploadAudioText() {
    document.querySelectorAll('button,label,a').forEach(el => {
      const text = (el.textContent || '').trim();
      if (/subir\s+audio/i.test(text)) {
        const clone = el.cloneNode(true);
        clone.textContent = '🔊 Escuchar';
        clone.removeAttribute('for');
        clone.onclick = ev => {
          ev.preventDefault();
          ev.stopPropagation();
          const holder = el.closest('[data-word],[data-sentence],.word,.vocab-word,.sentence,.example-sentence,.mini-test-word,.mini-word') || el.parentElement;
          const spoken = (holder?.dataset?.word || holder?.dataset?.sentence || holder?.textContent || '').replace(/🔊\s*Escuchar/gi,'').trim();
          if (!spoken) return;
          speechSynthesis.cancel();
          const msg = new SpeechSynthesisUtterance(spoken);
          msg.lang = 'en-US';
          msg.rate = 0.82;
          const voices = speechSynthesis.getVoices();
          msg.voice = voices.find(v => /^en[-_](US|GB)/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang)) || null;
          speechSynthesis.speak(msg);
        };
        el.replaceWith(clone);
      }
    });
    document.querySelectorAll('input[type="file"][accept*="audio"]').forEach(input => {
      input.style.display = 'none';
      input.disabled = true;
    });
  }

  function init() {
    replaceUploadAudioText();
    addSpeechButtons();
    addControls();
    setTimeout(() => {
      replaceUploadAudioText();
      addSpeechButtons();
    }, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
