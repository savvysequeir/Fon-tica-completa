
(() => {
  'use strict';
  const KEY = 'fonetica_resultados_v2';

  function getGlobal(name, fallback) {
    try {
      return eval(`typeof ${name} !== 'undefined' ? ${name} : undefined`) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function category() {
    const file = location.pathname.toLowerCase();
    if (file.includes('consonantes_')) return 'Consonantes';
    if (file.includes('blends_')) return 'Blends';
    if (/aia_aua|eia_oia_oua/.test(file)) return 'Triptongos';
    if (/vocal_(ai|ei|ia|oi|ua|au|ea|ou|ju|rcolored)/.test(file)) return 'Diptongos';
    return 'Vocales';
  }

  function topic() {
    return document.querySelector('h1')?.textContent?.trim() || document.title;
  }

  function getWords() {
    let words =
      getGlobal('WORDS_IN_PATH', null) ||
      getGlobal('PATH_WORDS', null) ||
      getGlobal('ALL_WORDS', []) ||
      [];

    if (!Array.isArray(words)) words = [];

    const sounds = getGlobal('WORD_SOUNDS', {});
    const titleSound = (topic().match(/\/[^/]+\//) || [''])[0];

    return [...new Set(words.map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item.word === 'string') return item.word;
      return String(item || '');
    }).filter(Boolean))].map(word => ({
      word,
      ipa: sounds[word] || sounds[word.toUpperCase()] || titleSound
    }));
  }

  function getSentences() {
    const items = getGlobal('SENTENCES', []);
    return Array.isArray(items) ? items.map(String) : [];
  }

  function sentenceVocabulary(sentences) {
    const excluded = new Set([
      'a','an','the','and','or','but','in','on','at','to','of','for','with',
      'is','are','was','were','be','been','being','it','its','this','that',
      'these','those','my','your','his','her','our','their','i','you','he',
      'she','we','they'
    ]);
    const output = [];

    sentences.forEach(sentence => {
      const words = sentence.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) || [];
      words.forEach(word => {
        const normalized = word.toLowerCase();
        if (!excluded.has(normalized) &&
            !output.some(saved => saved.toLowerCase() === normalized)) {
          output.push(word);
        }
      });
    });
    return output;
  }

  function stats() {
    const text = id => document.getElementById(id)?.textContent?.trim() || '';
    let mazeCompleted = Boolean(getGlobal('completedMaze', false));
    let sentencesCompleted = Boolean(getGlobal('lockedSentences', false));

    if (!mazeCompleted) mazeCompleted = Boolean(document.querySelector('.cell.finish'));

    if (!sentencesCompleted) {
      const message = document.getElementById('sentenceMessage')?.textContent || '';
      sentencesCompleted = /excelente|desbloqueó|complet/i.test(message);
    }

    return {
      mazeCompleted,
      sentencesCompleted,
      mazeErrors: text('mistakePill'),
      progress: text('progressPill'),
      sentenceProgress: text('sentenceProgressPill'),
      score: (mazeCompleted ? 50 : 0) + (sentencesCompleted ? 50 : 0)
    };
  }

  function studentName() {
    return (
      document.getElementById('studentName')?.value ||
      getGlobal('student', '') ||
      'Estudiante sin identificar'
    ).trim();
  }

  function saveResult(showMessage = true) {
    const sentences = getSentences();
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      student: studentName(),
      category: category(),
      topic: topic(),
      title: document.title,
      date: new Date().toISOString(),
      words: getWords(),
      sentenceVocabulary: sentenceVocabulary(sentences),
      sentences,
      stats: stats(),
      page: location.pathname
    };

    let records = [];
    try {
      records = JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      records = [];
    }

    records.unshift(record);
    localStorage.setItem(KEY, JSON.stringify(records.slice(0, 300)));

    if (showMessage) {
      document.getElementById('resultsSavedToast')?.remove();
      const toast = document.createElement('div');
      toast.id = 'resultsSavedToast';
      toast.textContent = '✅ Resultado guardado';
      toast.style.cssText =
        'position:fixed;right:18px;bottom:88px;z-index:10001;' +
        'background:#166534;color:white;padding:12px 16px;border-radius:14px;' +
        'font-weight:900;box-shadow:0 10px 30px rgba(0,0,0,.28)';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2200);
    }
  }

  function installButtons() {
    if (document.getElementById('foneticaResultsTools')) return;

    const container = document.createElement('div');
    container.id = 'foneticaResultsTools';
    container.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:9999;display:flex;' +
      'gap:8px;flex-wrap:wrap;justify-content:flex-end;max-width:95vw';

    const saveButton = document.createElement('button');
    saveButton.textContent = '💾 Guardar resultado';
    saveButton.style.cssText =
      'background:#0f766e;color:white;border:0;border-radius:14px;' +
      'padding:11px 14px;font-weight:900;cursor:pointer;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.25)';
    saveButton.addEventListener('click', () => saveResult(true));

    const resultsButton = document.createElement('button');
    resultsButton.textContent = '📊 Ver resultados';
    resultsButton.style.cssText =
      'background:#7c3aed;color:white;border:0;border-radius:14px;' +
      'padding:11px 14px;font-weight:900;cursor:pointer;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.25)';
    resultsButton.addEventListener('click', () => {
      saveResult(false);
      location.href = '../RESULTADOS/index.html';
    });

    container.append(saveButton, resultsButton);
    document.body.appendChild(container);

    const sentenceMessage = document.getElementById('sentenceMessage');
    if (sentenceMessage) {
      new MutationObserver(() => {
        if (/excelente|desbloqueó|complet/i.test(sentenceMessage.textContent || '')) {
          setTimeout(() => saveResult(false), 250);
        }
      }).observe(sentenceMessage, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installButtons);
  } else {
    installButtons();
  }
})();
