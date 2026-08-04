(function () {
  "use strict";
  const data = window.AMINA_EXAM_DATA.makeExam(window.EXAM_VERSION || new URLSearchParams(location.search).get("version") || 1);
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const normalize = data.normalize;
  const resultKey = "aminaIntegratedExamResults";
  const profileKey = "aminaStudentProfile";
  const databaseURL = "https://fonetica-completa-default-rtdb.firebaseio.com";
  let selectedChip = null;
  let activated = false;

  function optionList(name, options) {
    return `<div class="options">${options.map(option => `<label class="option"><input type="radio" name="${esc(name)}" value="${esc(option)}"><span>${esc(option)}</span></label>`).join("")}</div>`;
  }
  function qBlock(index, title, content, extra="") {
    return `<article class="question" data-item="${index}"><div class="question-title">${index + 1}. ${title}</div>${content}<div class="feedback"></div>${extra}</article>`;
  }
  function render() {
    document.title = `Examen integrado ${data.version} | Amina`;
    $("#examNumber").textContent = data.version;
    $("#titleNumber").textContent = data.version;
    $("#featuredPhrasals").textContent = data.featuredPhrasals.join(" · ");
    $("#phoneticChoice").innerHTML = data.phoneticChoice.map((q,i) => qBlock(i, `Escoge la palabra que contiene ${q.sound}.`, optionList(`pc${i}`,q.options))).join("");
    $("#oddOneOut").innerHTML = data.oddOneOut.map((q,i) => qBlock(i, `Tres palabras comparten ${q.sound}. Escoge la diferente.`, optionList(`odd${i}`,q.options))).join("");
    $("#wordBank").innerHTML = data.sorting.map((item,i) => `<button type="button" class="wordchip" draggable="true" data-word="${esc(item.word)}" data-sound="${esc(item.sound)}" id="word-${i}">${esc(item.word)}</button>`).join("");
    $("#soundBuckets").innerHTML = data.sortSounds.map(sound => `<div class="bucket" data-sound="${esc(sound)}" tabindex="0"><h4>${esc(sound)}</h4><div class="bucket-items"></div></div>`).join("");
    $("#listeningWords").innerHTML = data.listening.map((q,i) => qBlock(i,"Escucha la palabra y selecciona el sonido que contiene.",optionList(`listen${i}`,q.options),`<button type="button" class="audio" data-speak="${esc(q.word)}">🔊 Escuchar palabra</button>`)).join("");
    $("#patterns").innerHTML = data.patterns.map((q,i) => qBlock(i,`¿Qué grupo comparte el sonido de “${esc(q.example)}” (${q.sound})?`,optionList(`pattern${i}`,q.options))).join("");
    $("#transforms").innerHTML = data.transforms.map((q,i) => qBlock(i,`${esc(q.instruction)}: <em>${esc(q.positive)}</em>`,`<input class="text-answer" data-answer="${esc(q.answer)}" placeholder="Escribe la oración completa">`)).join("");
    $("#ordering").innerHTML = data.ordering.map((q,i) => qBlock(i,`Ordena la oración en ${esc(q.tense)}.`,`<div class="tokenbox">${q.tokens.map(token=>`<button type="button" class="token">${esc(token)}</button>`).join("")}</div><div class="answerline" data-answer="${esc(q.answer)}"></div><button type="button" class="secondary clear-order">Borrar orden</button>`)).join("");
    $("#dictation").innerHTML = data.dictation.map((q,i) => qBlock(i,`Escucha y escribe la oración (${esc(q.tense)}).`,`<button type="button" class="audio" data-speak="${esc(q.answer)}">🔊 Escuchar oración</button><input class="dictation-answer" data-answer="${esc(q.answer)}" placeholder="Escribe exactamente lo que escuchas">`)).join("");
    $("#translations").innerHTML = data.translation.map((q,i) => qBlock(i,`Traduce al inglés (${esc(q.tense)} · verbo: ${esc(q.verb)}): <em>${esc(q.spanish)}</em>`,`<input class="translation-answer" data-answer="${esc(q.answer)}" placeholder="Escribe la traducción completa">`)).join("");
    $("#sentences").innerHTML = data.sentenceVerbs.map((q,i) => qBlock(i,`Escribe una oración con <strong>${esc(q.verb)}</strong> en ${esc(q.tense)}.`,`<textarea class="sentence-answer" data-verb="${esc(q.verb)}" data-past="${esc(q.past)}" data-tense="${esc(q.tense)}" placeholder="Escribe una oración completa"></textarea>`)).join("");
    loadProfile(); bind(); setExamLocked(true);
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) return alert("El lector de voz no está disponible en este navegador.");
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US"; utterance.rate = .78; utterance.pitch = 1.04;
    const voices = speechSynthesis.getVoices();
    utterance.voice = voices.find(v => /^en-(US|GB)/.test(v.lang) && /female|samantha|zira|aria|ava|serena/i.test(v.name)) || voices.find(v => /^en-(US|GB)/.test(v.lang)) || null;
    speechSynthesis.speak(utterance);
  }
  function bind() {
    document.addEventListener("click", event => {
      const audio = event.target.closest("[data-speak]"); if (audio) speak(audio.dataset.speak);
      const token = event.target.closest(".token");
      if (token) {
        const question = token.closest(".question"), line = question.querySelector(".answerline");
        line.appendChild(token); return;
      }
      const clear = event.target.closest(".clear-order");
      if (clear) {
        const q = clear.closest(".question"), box = q.querySelector(".tokenbox"), line = q.querySelector(".answerline");
        [...line.querySelectorAll(".token")].forEach(t => box.appendChild(t)); return;
      }
      const chip = event.target.closest(".wordchip");
      if (chip) { selectChip(chip); return; }
      const bucket = event.target.closest(".bucket");
      if (bucket && selectedChip) moveChip(selectedChip,bucket);
    });
    document.addEventListener("dragstart", event => { const chip=event.target.closest(".wordchip"); if(chip) event.dataTransfer.setData("text/plain",chip.id); });
    document.querySelectorAll(".bucket").forEach(bucket => {
      bucket.addEventListener("dragover", e => {e.preventDefault();bucket.classList.add("over")});
      bucket.addEventListener("dragleave",()=>bucket.classList.remove("over"));
      bucket.addEventListener("drop", e => {e.preventDefault();bucket.classList.remove("over");const chip=document.getElementById(e.dataTransfer.getData("text/plain"));if(chip)moveChip(chip,bucket)});
      bucket.addEventListener("keydown", e => {if((e.key==="Enter"||e.key===" ")&&selectedChip){e.preventDefault();moveChip(selectedChip,bucket)}});
    });
    $("#saveProfile").addEventListener("click", saveProfile);
    $("#gradeExam").addEventListener("click", gradeExam);
    $("#resetExam").addEventListener("click",()=>{if(confirm("¿Deseas borrar todas las respuestas de este examen?"))location.reload()});
    $("#openResults").addEventListener("click",()=>{$("#resultsDialog").showModal();renderHistory()});
    $("#closeResults").addEventListener("click",()=>$("#resultsDialog").close());
  }
  function selectChip(chip) { document.querySelectorAll(".wordchip.selected").forEach(x=>x.classList.remove("selected"));selectedChip=chip;chip.classList.add("selected"); }
  function moveChip(chip,bucket) { bucket.querySelector(".bucket-items").appendChild(chip);chip.classList.remove("selected");selectedChip=null; }

  function profile() { return {carnet:$("#studentCard").value.trim(),name:$("#studentName").value.trim(),career:$("#studentCareer").value,year:$("#studentYear").value,group:$("#studentGroup").value.trim()}; }
  function carnetKey(value) { return String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,""); }
  function loadProfile() { try {const p=JSON.parse(localStorage.getItem(profileKey))||{};$("#studentCard").value=p.carnet||"";$("#studentName").value=p.name||"";$("#studentCareer").value=p.career||"";$("#studentYear").value=p.year||"";$("#studentGroup").value=p.group||"";} catch(_){} }
  function setExamLocked(locked) { activated=!locked; document.querySelectorAll("#phonetics input,#phonetics button,#grammar input,#grammar button,#grammar textarea,#gradeExam,#gradeExamFloating").forEach(el=>el.disabled=locked); document.body.classList.toggle("exam-locked",locked); }
  function saveProfile() { const p=profile();if(!p.carnet||!p.name||!p.career||!p.year||!p.group)return alert("Completa carnet, nombre, carrera, año académico y grupo o sección.");if(carnetKey(p.carnet).length<5)return alert("Escribe un número de carnet válido.");localStorage.setItem(profileKey,JSON.stringify(p));setExamLocked(false);$("#profileMessage").className="feedback good";$("#profileMessage").textContent="✅ Examen activado para "+p.name+" · "+p.carnet;$("#phonetics").scrollIntoView({behavior:"smooth"}); }
  function mark(question, correct, correctText) { const feedback=question.querySelector(".feedback");question.dataset.correct=correct?"1":"0";feedback.className=`feedback ${correct?"good":"bad"}`;feedback.textContent=correct?"✅ Correcto":`❌ Respuesta correcta: ${correctText}`; }
  function selected(name) { return document.querySelector(`input[name="${name}"]:checked`)?.value || ""; }
  function textCorrect(value, answer) { return normalize(value)===normalize(answer); }
  function sentenceCorrect(field) {
    const value=normalize(field.value), verb=normalize(field.dataset.verb), past=normalize(field.dataset.past).split("/")[0], tense=field.dataset.tense;
    if(value.split(" ").length<4)return false;
    const hasVerb=value.includes(verb)||value.includes(past)||value.includes(verb.replace(/e$/,"")+"ing");
    const patterns={"Present Continuous":/\b(am|is|are)\b.*ing\b/,"Past Continuous":/\b(was|were)\b.*ing\b/,"Future Continuous":/\bwill be\b.*ing\b/,"Present Perfect":/\b(has|have)\b/,"Past Perfect":/\bhad\b/};
    return hasVerb&&patterns[tense].test(value);
  }
  async function gradeExam() {
    const p=profile(); if(!activated||!p.carnet||!p.name||!p.career||!p.year||!p.group){$("#identification").scrollIntoView();return alert("Primero completa tus datos y activa el examen.");}
    let earned=0,total=0;
    function radioSection(id,prefix,questions,answerKey="answer") { questions.forEach((q,i)=>{total++;const value=selected(prefix+i),ok=value===q[answerKey];if(ok)earned++;mark($(`#${id} [data-item="${i}"]`),ok,q[answerKey]);}); }
    radioSection("phoneticChoice","pc",data.phoneticChoice);
    radioSection("oddOneOut","odd",data.oddOneOut);
    data.sorting.forEach(item=>{total++;const chip=document.querySelector(`.wordchip[data-word="${CSS.escape(item.word)}"]`),ok=chip?.closest(".bucket")?.dataset.sound===item.sound;if(ok)earned++;});
    const sortFeedback=$("#sortingFeedback");sortFeedback.className=`feedback ${data.sorting.every(item=>document.querySelector(`.wordchip[data-word="${CSS.escape(item.word)}"]`)?.closest(".bucket")?.dataset.sound===item.sound)?"good":"bad"}`;sortFeedback.textContent=`Clasificación: ${data.sorting.filter(item=>document.querySelector(`.wordchip[data-word="${CSS.escape(item.word)}"]`)?.closest(".bucket")?.dataset.sound===item.sound).length}/${data.sorting.length} correctas.`;
    radioSection("listeningWords","listen",data.listening,"sound");
    radioSection("patterns","pattern",data.patterns);
    [["transforms",".text-answer"],["dictation",".dictation-answer"],["translations",".translation-answer"]].forEach(([id,selector])=>{
      document.querySelectorAll(`#${id} ${selector}`).forEach(field=>{total++;const ok=textCorrect(field.value,field.dataset.answer);if(ok)earned++;mark(field.closest(".question"),ok,field.dataset.answer);});
    });
    document.querySelectorAll("#ordering .answerline").forEach(line=>{total++;const value=[...line.querySelectorAll(".token")].map(t=>t.textContent).join(" "),ok=textCorrect(value,line.dataset.answer);if(ok)earned++;mark(line.closest(".question"),ok,line.dataset.answer);});
    document.querySelectorAll("#sentences .sentence-answer").forEach(field=>{total++;const ok=sentenceCorrect(field);if(ok)earned++;mark(field.closest(".question"),ok,"Revisa que uses el auxiliar y el verbo en el tiempo solicitado.");});
    const percentage=Math.round(earned*10000/total)/100,score=Math.round(earned*5000/total)/100,state=percentage>=90?"AA":percentage>=75?"AS":percentage>=50?"AF":"AI";
    $("#scoreValue").textContent=score;$("#progressBar").style.width=`${percentage}%`;$("#earnedMetric").textContent=earned;$("#totalMetric").textContent=total;$("#percentMetric").textContent=`${percentage}%`;$("#stateMetric").textContent=state;
    $("#finalMessage").textContent=`Resultado: ${score}/50 · ${percentage}% · ${state}. Enviando a la plataforma docente…`;
    const record={...p,carnetKey:carnetKey(p.carnet),exam:data.version,examTitle:`Examen integrado ${data.version}`,score,maxScore:50,percentage,earned,total,state,submittedAt:Date.now(),date:new Date().toISOString(),source:"Amina · Exámenes integrados"};
    const records=readResults();records.push(record);localStorage.setItem(resultKey,JSON.stringify(records.slice(-500)));localStorage.setItem(profileKey,JSON.stringify(p));
    try { await sendToCloud(record); $("#finalMessage").textContent=`✅ Resultado enviado: ${score}/50 · ${percentage}% · ${state}. El docente podrá consultarlo con tu carnet.`; }
    catch(error) { $("#finalMessage").textContent=`⚠️ Resultado guardado en este dispositivo, pero no llegó a la nube: ${error.message}. Avísale al docente.`; }
    $("#results").scrollIntoView({behavior:"smooth"});
  }
  async function sendToCloud(record) { const response=await fetch(`${databaseURL}/examResults/${encodeURIComponent(record.carnetKey)}.json`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(record)});if(!response.ok){let detail=await response.text();throw new Error(`Firebase ${response.status}: ${detail}`)}return response.json(); }
  function readResults(){try{return JSON.parse(localStorage.getItem(resultKey))||[]}catch(_){return[]}}
  function renderHistory(){const rows=readResults().filter(r=>r.exam===data.version).reverse();$("#historyBody").innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(r.name)}<br><small>${esc(r.carnet||"")}</small></td><td>${esc(r.career)}</td><td>${esc(r.year)}</td><td>${esc(r.group||"—")}</td><td>${new Date(r.date).toLocaleString()}</td><td><strong>${r.score}/50</strong></td><td>${r.state}</td></tr>`).join(""):`<tr><td colspan="7">Todavía no hay resultados guardados.</td></tr>`;}
  render();
})();
