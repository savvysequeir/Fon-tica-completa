(function () {
  "use strict";
  if (window.__aminaPhoneticsQuizInstalled) return;
  window.__aminaPhoneticsQuizInstalled = true;

  const QUIZ_SIZE = 10;
  const moduleFile = location.pathname.replace(/^\/+/, "");
  const moduleTitle =
    (document.querySelector("h1")?.textContent || document.title || "Pronunciación")
      .replace(/\s+/g, " ").trim();
  const studiedSounds = unique(
    (document.querySelector("h1")?.textContent || document.title || "")
      .match(/\/[^/]+\//g) || []
  );
  const NOT_STUDIED = "No contiene el sonido estudiado";
  const IPA_DISTRACTORS = [
    "/iː/", "/ɪ/", "/e/", "/æ/", "/ɑː/", "/ɒ/", "/ɔː/", "/ʊ/", "/uː/",
    "/ʌ/", "/ɜː/", "/ə/", "/eɪ/", "/aɪ/", "/ɔɪ/", "/aʊ/", "/oʊ/",
    "/ʃ/", "/tʃ/", "/θ/", "/ð/", "/ŋ/", "/ʒ/", "/dʒ/"
  ];

  function shuffle(items) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  function unique(items) { return [...new Set(items.filter(Boolean))]; }
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (_) { return fallback; }
  }
  function makeQuestions() {
    let entries = [];
    let mode = "sound";
    try {
      if (typeof WORD_SOUNDS !== "undefined" && WORD_SOUNDS) {
        entries = Object.entries(WORD_SOUNDS).map(([word, answer]) => ({ word, answer }));
      } else if (typeof PRON !== "undefined" && PRON) {
        mode = "phoneme";
        const correct = Object.entries(PRON).map(([word, ipa]) => {
          const answer = studiedSounds.find(sound =>
            String(ipa).includes(sound.replaceAll("/", ""))
          ) || studiedSounds[0] || ipa;
          return { word, ipa, answer };
        });
        let distractorWords = [];
        if (typeof DISTRACTOR_WORDS !== "undefined") distractorWords = DISTRACTOR_WORDS;
        else if (typeof MAZE !== "undefined") distractorWords = MAZE.flat();
        const correctSet = new Set(correct.map(x => String(x.word).toUpperCase()));
        const distractors = unique(distractorWords)
          .filter(word => !correctSet.has(String(word).toUpperCase()))
          .map(word => ({ word, ipa: "", answer: NOT_STUDIED }));
        entries = [
          ...shuffle(correct).slice(0, 7),
          ...shuffle(distractors).slice(0, 3)
        ];
      } else if (typeof DATA !== "undefined" && DATA?.blends) {
        mode = "blend";
        entries = DATA.blends.flatMap(b =>
          (b.words || []).map(pair => ({ word: pair[0], ipa: pair[1], answer: b.name }))
        );
      }
    } catch (_) {}

    const answers = mode === "phoneme"
      ? unique([
          ...studiedSounds,
          ...shuffle(IPA_DISTRACTORS.filter(x => !studiedSounds.includes(x))).slice(0, 3),
          NOT_STUDIED
        ])
      : unique(entries.map(x => x.answer));
    const selected = mode === "phoneme"
      ? shuffle(entries).slice(0, Math.min(QUIZ_SIZE, entries.length))
      : shuffle(entries).slice(0, Math.min(QUIZ_SIZE, entries.length));
    return selected.map((item, index) => {
      const distractors = shuffle(answers.filter(x => x !== item.answer)).slice(0, 3);
      const options = shuffle(unique([item.answer, ...distractors]));
      return {
        id: index,
        word: item.word,
        ipa: item.ipa || "",
        answer: item.answer,
        prompt: mode === "blend"
          ? `¿A qué blend o combinación pertenece “${item.word}”?`
          : mode === "phoneme"
            ? `Escucha “${item.word}”. ¿Qué sonido estudiado puedes identificar?`
            : `Escucha “${item.word}”. ¿Qué sonido fonético puedes identificar?`,
        options
      };
    });
  }
  function speak(word) {
    try {
      if (!("speechSynthesis" in window)) return alert("El lector de voz no está disponible.");
      speechSynthesis.cancel();
      const utterance = typeof createAminaUtterance === "function"
        ? createAminaUtterance(word, .78)
        : new SpeechSynthesisUtterance(word);
      if (!utterance.lang) utterance.lang = "en-US";
      utterance.rate = .78;
      speechSynthesis.speak(utterance);
    } catch (_) {}
  }
  function stateFor(percent) {
    if (percent >= 90) return "AA";
    if (percent >= 75) return "AS";
    if (percent >= 50) return "AF";
    return "AI";
  }
  function profile() {
    const p = read("aminaStudentProfile", {});
    const pageName = document.getElementById("studentName")?.value?.trim() || "";
    return {
      name: p.name || pageName || "Estudiante sin identificar",
      career: p.career || "Sin registrar",
      year: p.year || "Sin registrar",
      group: p.group || ""
    };
  }
  function saveQuizResult(correct, total) {
    const maxScore = 100;
    const score = total ? Math.round(correct * maxScore / total) : 0;
    const percentage = score;
    const p = profile();
    const cfg = read("grammarAssignmentConfig", {});
    const now = new Date();
    const record = {
      assignmentId: cfg.id || "actividad-individual",
      name: p.name, student: p.name, career: p.career, year: p.year, group: p.group,
      date: now.toISOString().slice(0, 10),
      moduleTitle, moduleFile, score, maxScore,
      total: `${score}/${maxScore}`, percentage,
      state: stateFor(percentage),
      note: `Mini prueba: ${correct}/${total} respuestas correctas`,
      updatedAt: now.toISOString(),
      source: "Mini prueba de pronunciación"
    };
    const data = read("grammarResults", {});
    data[`${record.assignmentId}::${moduleFile}::${p.name}`] = record;
    localStorage.setItem("grammarResults", JSON.stringify(data));
    const history = read("aminaActivityResults", []);
    history.push(record);
    localStorage.setItem("aminaActivityResults", JSON.stringify(history.slice(-1000)));

    const scoreInput = document.getElementById("amina-result-score");
    const maxInput = document.getElementById("amina-result-max");
    if (scoreInput && maxInput) {
      scoreInput.value = String(score);
      maxInput.value = String(maxScore);
      scoreInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return record;
  }

  let questions = makeQuestions();
  if (!questions.length) return;
  let unlocked = false;
  let quizOpened = false;

  const style = document.createElement("style");
  style.textContent = `
    #amina-mini-quiz{max-width:1180px;margin:18px auto 92px;padding:20px;border:1px solid #c4b5fd;
      border-radius:22px;background:linear-gradient(145deg,#faf5ff,#eff6ff);color:#0f172a;
      box-shadow:0 12px 30px rgba(76,29,149,.12);font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif}
    #amina-mini-quiz h2{margin:0 0 8px;color:#4c1d95;font-size:1.45rem}
    #amina-mini-quiz.amina-q-locked{border-color:#94a3b8;background:linear-gradient(145deg,#f8fafc,#e2e8f0)}
    .amina-q-lock{margin:14px 0;padding:13px;border:1px solid #f59e0b;border-radius:13px;background:#fffbeb;color:#78350f;font-weight:800}
    .amina-q-open{width:100%;border:0;border-radius:14px;padding:14px 18px;background:#94a3b8;color:#0f172a;
      font-size:1rem;font-weight:900;cursor:not-allowed}
    .amina-q-open.ready{background:#16a34a;color:#fff;cursor:pointer;box-shadow:0 10px 24px rgba(22,163,74,.25)}
    .amina-q-content{display:none}.amina-q-content.open{display:block}
    .amina-q-intro{color:#475569;line-height:1.55}.amina-q-list{display:grid;gap:14px;margin-top:16px}
    .amina-q{padding:15px;border:1px solid #ddd6fe;border-radius:16px;background:#fff}
    .amina-q-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;font-weight:850}
    .amina-q-audio{border:0;border-radius:10px;background:#0e7490;color:#fff;padding:8px 11px;font-weight:800;cursor:pointer}
    .amina-q-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .amina-q-option{display:flex;gap:8px;align-items:center;padding:10px;border:1px solid #cbd5e1;border-radius:11px;background:#f8fafc;cursor:pointer}
    .amina-q-option input{width:auto}.amina-q.good{border-color:#22c55e;background:#f0fdf4}
    .amina-q.bad{border-color:#ef4444;background:#fef2f2}.amina-q-feedback{margin-top:9px;font-weight:800}
    .amina-q-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:17px}
    .amina-q-check,.amina-q-reset{border:0;border-radius:12px;padding:11px 16px;font-weight:850;cursor:pointer}
    .amina-q-check{background:#7c3aed;color:#fff}.amina-q-reset{background:#e2e8f0;color:#0f172a}
    #amina-q-result{display:none;margin-top:15px;padding:14px;border-radius:14px;background:#0f172a;color:#fff;font-weight:800;line-height:1.5}
    @media(max-width:650px){#amina-mini-quiz{margin:14px 12px 88px;padding:15px}.amina-q-options{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const section = document.createElement("section");
  section.id = "amina-mini-quiz";
  section.className = "amina-q-locked";
  section.innerHTML = `
    <h2>8. Mini prueba · ¿Has entendido?</h2>
    <p class="amina-q-intro">La prueba evalúa si puedes <strong>escuchar una palabra e identificar el sonido estudiado</strong>.</p>
    <div class="amina-q-lock">🔒 Completa el laberinto, las palabras, las oraciones y la explicación final para activar la mini prueba.</div>
    <button type="button" class="amina-q-open" disabled>🔒 ¿Has entendido? · Completa primero las actividades</button>
    <div class="amina-q-content">
      <p class="amina-q-intro">Escucha cada palabra y selecciona su sonido. Son
        <strong>${questions.length} preguntas</strong>; el resultado se calcula sobre 100 puntos y se guarda automáticamente.</p>
      <div class="amina-q-list"></div>
      <div class="amina-q-actions">
        <button type="button" class="amina-q-check">Comprobar mini prueba</button>
        <button type="button" class="amina-q-reset">Intentar nuevamente</button>
      </div>
      <div id="amina-q-result" role="status"></div>
    </div>
  `;

  const footer = document.querySelector(".footer");
  if (footer?.parentNode) footer.parentNode.insertBefore(section, footer);
  else document.body.appendChild(section);

  function render() {
    const list = section.querySelector(".amina-q-list");
    list.innerHTML = questions.map((q, index) => `
      <article class="amina-q" data-question="${index}">
        <div class="amina-q-title">
          <span>${index + 1}. ${esc(q.prompt)}</span>
          <button type="button" class="amina-q-audio" data-speak="${esc(q.word)}">🔊 Escuchar</button>
        </div>
        <div class="amina-q-options">
          ${q.options.map(option => `
            <label class="amina-q-option">
              <input type="radio" name="amina-q-${index}" value="${esc(option)}">
              <span>${esc(option)}</span>
            </label>`).join("")}
        </div>
        <div class="amina-q-feedback"></div>
      </article>`).join("");
    section.querySelector("#amina-q-result").style.display = "none";
  }
  function studentIdentified() {
    const pageName = document.getElementById("studentName")?.value?.trim();
    const saved = read("aminaStudentProfile", {});
    return Boolean(pageName || saved.name);
  }
  function activitiesCompleted() {
    const progress = document.getElementById("progressPill")?.textContent || "";
    const blendMatch = progress.match(/Progreso:\s*(\d+)\s*\/\s*(\d+)/i);
    if (blendMatch) {
      return Number(blendMatch[1]) > 0 && Number(blendMatch[1]) === Number(blendMatch[2]);
    }
    const finalPanel =
      document.getElementById("finalPatternPanel") ||
      document.getElementById("patternPanel");
    return Boolean(finalPanel && !finalPanel.classList.contains("hidden"));
  }
  function updateUnlockState() {
    const identified = studentIdentified();
    const completed = activitiesCompleted();
    unlocked = identified && completed;
    const openButton = section.querySelector(".amina-q-open");
    const lockBox = section.querySelector(".amina-q-lock");
    openButton.disabled = !unlocked;
    openButton.classList.toggle("ready", unlocked);
    section.classList.toggle("amina-q-locked", !unlocked);
    const setText = (element, value) => {
      if (element.textContent !== value) element.textContent = value;
    };
    if (unlocked) {
      if (!quizOpened) setText(openButton, "✅ ¿Has entendido? · Iniciar mini prueba");
      setText(lockBox,
        `✅ Actividades completadas. Ahora identifica ${studiedSounds.join(", ") || "el sonido estudiado"} en las palabras.`);
    } else if (!identified) {
      setText(openButton, "🔒 ¿Has entendido? · Identifícate primero");
      setText(lockBox, "🔒 Escribe y guarda tu nombre; después completa todas las actividades.");
      quizOpened = false;
      section.querySelector(".amina-q-content").classList.remove("open");
    } else {
      setText(openButton, "🔒 ¿Has entendido? · Completa primero las actividades");
      setText(lockBox,
        "🔒 Completa el laberinto, las palabras, las oraciones y la explicación final para activar la mini prueba.");
      quizOpened = false;
      section.querySelector(".amina-q-content").classList.remove("open");
    }
  }
  function grade() {
    let correct = 0;
    let answered = 0;
    questions.forEach((q, index) => {
      const card = section.querySelector(`[data-question="${index}"]`);
      const selected = card.querySelector(`input[name="amina-q-${index}"]:checked`);
      const feedback = card.querySelector(".amina-q-feedback");
      card.classList.remove("good", "bad");
      if (!selected) {
        feedback.textContent = "Selecciona una respuesta.";
        card.classList.add("bad");
        return;
      }
      answered++;
      if (selected.value === q.answer) {
        correct++;
        feedback.textContent = "✅ Correcto";
        card.classList.add("good");
      } else {
        feedback.textContent = `❌ Respuesta correcta: ${q.answer}`;
        card.classList.add("bad");
      }
    });
    if (answered < questions.length) {
      section.querySelector("#amina-q-result").style.display = "block";
      section.querySelector("#amina-q-result").textContent =
        `Faltan ${questions.length - answered} pregunta(s) por responder.`;
      return;
    }
    const record = saveQuizResult(correct, questions.length);
    const result = section.querySelector("#amina-q-result");
    result.style.display = "block";
    result.innerHTML =
      `Mini prueba finalizada: <strong>${correct}/${questions.length}</strong> respuestas correctas ·
       <strong>${record.score}/100</strong> puntos · Estado <strong>${record.state}</strong>.
       El puntaje ya fue enviado a Resultados.`;
    result.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  section.addEventListener("click", event => {
    if (event.target.closest(".amina-q-open")) {
      if (!unlocked) return;
      quizOpened = !quizOpened;
      section.querySelector(".amina-q-content").classList.toggle("open", quizOpened);
      event.target.textContent = quizOpened
        ? "▲ Ocultar mini prueba"
        : "✅ ¿Has entendido? · Iniciar mini prueba";
      if (quizOpened) section.querySelector(".amina-q-content")
        .scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const audio = event.target.closest("[data-speak]");
    if (audio) return speak(audio.dataset.speak);
    if (event.target.closest(".amina-q-check")) return grade();
    if (event.target.closest(".amina-q-reset")) {
      questions = makeQuestions();
      render();
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  render();
  updateUnlockState();
  document.addEventListener("input", updateUnlockState);
  document.addEventListener("click", () => setTimeout(updateUnlockState, 0));
  const gateTimer = window.setInterval(updateUnlockState, 800);
  window.addEventListener("pagehide", () => window.clearInterval(gateTimer), { once: true });
})();
