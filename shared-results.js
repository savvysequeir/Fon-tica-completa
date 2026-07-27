(function () {
  "use strict";
  if (window.__aminaResultsInstalled) return;
  window.__aminaResultsInstalled = true;

  const STORE = "grammarResults";
  const PROFILE = "aminaStudentProfile";
  const moduleFile = location.pathname.replace(/^\/+/, "");
  const moduleTitle =
    (document.querySelector("h1")?.textContent || document.title || "Actividad")
      .replace(/\s+/g, " ")
      .trim();

  const careers = [
    "Odontología", "Medicina", "Química Farmacéutica", "Enfermería",
    "Mecánica Dental", "Veterinaria", "Zootecnia", "Agronomía", "Agrícola",
    "Ingeniería Forestal", "Ingeniería en Agroindustria de los Alimentos",
    "Agronegocios", "Inglés"
  ];
  const academicYears = ["I año", "II año", "III año", "IV año", "V año"];

  function normalizeSpeechText(text) {
    const exactWords = {
      ART: "art",
      ARC: "arc"
    };
    const raw = String(text ?? "").trim();
    return exactWords[raw.toUpperCase()] || raw;
  }
  if (typeof window.createAminaUtterance === "function" && !window.__aminaSpeechCorrections) {
    const originalCreateUtterance = window.createAminaUtterance;
    window.createAminaUtterance = function (text, rate) {
      return originalCreateUtterance.call(this, normalizeSpeechText(text), rate);
    };
    window.__aminaSpeechCorrections = true;
  }

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (_) { return fallback; }
  }
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }
  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function statusFor(percent) {
    if (percent >= 90) return "AA";
    if (percent >= 75) return "AS";
    if (percent >= 50) return "AF";
    return "AI";
  }
  function findExistingProfile() {
    const preferred = [
      read(PROFILE, null), read("studentDeliveryProfile", null),
      read("listeningStudent", null), read("speakingStudent", null),
      read("writingStudent", null), read("readingStudent", null),
      read("pc_student", null)
    ].filter(Boolean);
    const p = preferred.find(x => x.name || x.student || x.nombre) || {};
    return {
      name: p.name || p.student || p.nombre || "",
      career: p.career || p.carrera || "",
      year: p.year || p.año || p.academicYear || "",
      group: p.group || p.grupo || ""
    };
  }
  function syncProfileToActivity(profile) {
    const nameInput = document.getElementById("studentName");
    if (nameInput) {
      nameInput.value = profile.name;
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      nameInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const fieldMap = [
      ["careerSelect", profile.career], ["career", profile.career],
      ["studentCareer", profile.career], ["yearSelect", profile.year],
      ["year", profile.year], ["studentYear", profile.year],
      ["group", profile.group], ["studentGroup", profile.group],
      ["section", profile.group]
    ];
    fieldMap.forEach(([id, value]) => {
      const field = document.getElementById(id);
      if (!field || !value) return;
      const option = field.tagName === "SELECT"
        ? [...field.options].find(item => item.value === value || item.textContent.trim() === value)
        : null;
      field.value = option ? option.value : value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
  function records() {
    return Object.values(read(STORE, {}))
      .filter(r => r && r.moduleFile === moduleFile)
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }
  function renderHistory() {
    const body = document.getElementById("amina-results-history");
    if (!body) return;
    const rows = records();
    body.innerHTML = rows.length ? rows.map(r => `
      <tr>
        <td>${esc(r.name)}</td>
        <td>${esc(r.career)}</td>
        <td>${esc(r.year)}</td>
        <td>${esc(r.group || "—")}</td>
        <td>${esc(r.date)}</td>
        <td><strong>${esc(r.score)}/${esc(r.maxScore)}</strong></td>
        <td>${esc(r.percentage)}%</td>
        <td><strong>${esc(r.state)}</strong></td>
      </tr>`).join("") :
      '<tr><td colspan="8">Todavía no hay resultados guardados en esta actividad.</td></tr>';
  }
  function updateCalculation() {
    const score = Number(document.getElementById("amina-result-score").value || 0);
    const max = Math.max(1, Number(document.getElementById("amina-result-max").value || 100));
    const percent = Math.max(0, Math.round(score * 100 / max));
    document.getElementById("amina-result-percent").value = `${percent}%`;
    document.getElementById("amina-result-state").value = statusFor(percent);
  }
  function saveResult(event) {
    event.preventDefault();
    const get = id => document.getElementById(id).value.trim();
    const name = get("amina-result-name");
    const career = get("amina-result-career");
    const year = get("amina-result-year");
    const group = get("amina-result-group");
    const date = get("amina-result-date") || today();
    const score = Number(get("amina-result-score"));
    const maxScore = Math.max(1, Number(get("amina-result-max")));
    if (!name || !career || !year || !Number.isFinite(score)) {
      alert("Completa nombre, carrera, año y puntaje.");
      return;
    }
    const percentage = Math.max(0, Math.round(score * 100 / maxScore));
    const cfg = read("grammarAssignmentConfig", {});
    const record = {
      assignmentId: cfg.id || "actividad-individual",
      name, student: name, career, year, group, date,
      moduleTitle, moduleFile, score, maxScore,
      total: `${score}/${maxScore}`, percentage,
      state: statusFor(percentage),
      note: get("amina-result-note"),
      updatedAt: new Date().toISOString(),
      source: "Amina Portal Educativo"
    };
    localStorage.setItem(PROFILE, JSON.stringify({ name, career, year, group }));
    const data = read(STORE, {});
    data[`${record.assignmentId}::${moduleFile}::${name}`] = record;
    localStorage.setItem(STORE, JSON.stringify(data));
    const history = read("aminaActivityResults", []);
    history.push(record);
    localStorage.setItem("aminaActivityResults", JSON.stringify(history.slice(-1000)));
    document.getElementById("amina-result-message").textContent =
      `Resultado guardado: ${score}/${maxScore} · ${percentage}% · ${record.state}`;
    renderHistory();
  }

  const style = document.createElement("style");
  style.textContent = `
    #amina-results-button{position:fixed;right:18px;bottom:18px;z-index:2147483000;border:0;
      border-radius:999px;padding:13px 18px;background:#0ea5e9;color:#031522;font:800 15px/1 Arial,sans-serif;
      box-shadow:0 12px 35px rgba(2,132,199,.38);cursor:pointer}
    #amina-results-button:hover{transform:translateY(-2px);background:#38bdf8}
    #amina-results-dialog{width:min(920px,calc(100% - 24px));max-height:90vh;border:1px solid #334155;
      border-radius:22px;padding:0;background:#07111f;color:#e5e7eb;box-shadow:0 30px 90px #000b}
    #amina-results-dialog::backdrop{background:rgba(2,6,23,.78);backdrop-filter:blur(3px)}
    .amina-r-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:20px 22px;
      border-bottom:1px solid #334155;background:linear-gradient(135deg,#0c4a6e,#312e81)}
    .amina-r-head h2{margin:0 0 5px;font:800 25px/1.15 Arial,sans-serif;color:#fff}
    .amina-r-head p{margin:0;color:#cbd5e1;font:14px/1.4 Arial,sans-serif}
    .amina-r-close{border:1px solid #94a3b8;border-radius:10px;background:#0f172a;color:#fff;padding:8px 11px;cursor:pointer}
    #amina-profile-dialog{width:min(760px,calc(100% - 24px));border:1px solid #38bdf8;border-radius:22px;
      padding:0;background:#07111f;color:#e5e7eb;box-shadow:0 30px 90px #000c}
    #amina-profile-dialog::backdrop{background:rgba(2,6,23,.86);backdrop-filter:blur(4px)}
    .amina-p-intro{margin:0 0 17px;color:#cbd5e1;line-height:1.5}
    .amina-p-save{width:100%;border:0;border-radius:12px;background:#22c55e;color:#052e16;
      padding:13px 17px;font-size:16px;font-weight:900;cursor:pointer}
    #amina-profile-message{min-height:22px;margin-top:9px;color:#fca5a5;font-weight:700}
    .amina-r-body{padding:20px 22px;font-family:Arial,sans-serif}
    .amina-r-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
    .amina-r-field{display:flex;flex-direction:column;gap:6px}
    .amina-r-field label{font-weight:700;color:#cbd5e1}
    .amina-r-field input,.amina-r-field textarea{width:100%;box-sizing:border-box;border:1px solid #475569;
      border-radius:11px;background:#020617;color:#fff;padding:11px;font:15px Arial,sans-serif}
    .amina-r-field textarea{min-height:75px;resize:vertical}.amina-r-wide{grid-column:1/-1}
    .amina-r-actions{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}
    .amina-r-save{border:0;border-radius:12px;background:#22c55e;color:#052e16;padding:11px 16px;font-weight:800;cursor:pointer}
    #amina-result-message{min-height:22px;color:#86efac;font-weight:700}
    .amina-r-table{overflow:auto;border:1px solid #334155;border-radius:12px}
    .amina-r-table table{width:100%;border-collapse:collapse;min-width:720px;background:#0f172a;color:#e5e7eb}
    .amina-r-table th,.amina-r-table td{padding:9px;border-bottom:1px solid #334155;text-align:left;font-size:13px}
    .amina-r-table th{background:#1e293b;color:#fff}
    @media(max-width:620px){.amina-r-grid{grid-template-columns:1fr}.amina-r-wide{grid-column:auto}
      #amina-results-button{right:10px;bottom:10px}.amina-r-body,.amina-r-head{padding:16px}}
  `;
  document.head.appendChild(style);

  const profile = findExistingProfile();
  const button = document.createElement("button");
  button.id = "amina-results-button";
  button.type = "button";
  button.textContent = "📊 Resultados";
  button.setAttribute("aria-label", "Abrir resultados de la actividad");

  const dialog = document.createElement("dialog");
  dialog.id = "amina-results-dialog";
  dialog.innerHTML = `
    <div class="amina-r-head">
      <div><h2>Resultados de la actividad</h2><p>${esc(moduleTitle)}</p></div>
      <button type="button" class="amina-r-close" aria-label="Cerrar">✕</button>
    </div>
    <div class="amina-r-body">
      <form id="amina-results-form">
        <div class="amina-r-grid">
          <div class="amina-r-field"><label for="amina-result-name">Nombre completo</label>
            <input id="amina-result-name" required value="${esc(profile.name)}"></div>
          <div class="amina-r-field"><label for="amina-result-career">Carrera</label>
            <input id="amina-result-career" list="amina-careers" required value="${esc(profile.career)}">
            <datalist id="amina-careers">${careers.map(c => `<option value="${esc(c)}">`).join("")}</datalist></div>
          <div class="amina-r-field"><label for="amina-result-year">Año académico</label>
            <input id="amina-result-year" required placeholder="Ejemplo: II año" value="${esc(profile.year)}"></div>
          <div class="amina-r-field"><label for="amina-result-group">Grupo o sección</label>
            <input id="amina-result-group" placeholder="Ejemplo: A" value="${esc(profile.group)}"></div>
          <div class="amina-r-field"><label for="amina-result-date">Fecha</label>
            <input id="amina-result-date" type="date" required value="${today()}"></div>
          <div class="amina-r-field"><label for="amina-result-score">Puntaje obtenido</label>
            <input id="amina-result-score" type="number" min="0" step="0.01" required placeholder="Ejemplo: 85"></div>
          <div class="amina-r-field"><label for="amina-result-max">Puntaje máximo</label>
            <input id="amina-result-max" type="number" min="1" step="0.01" required value="100"></div>
          <div class="amina-r-field"><label for="amina-result-percent">Porcentaje</label>
            <input id="amina-result-percent" readonly value="0%"></div>
          <div class="amina-r-field"><label for="amina-result-state">Estado</label>
            <input id="amina-result-state" readonly value="AI"></div>
          <div class="amina-r-field amina-r-wide"><label for="amina-result-note">Observaciones</label>
            <textarea id="amina-result-note" placeholder="Actividad realizada, dificultades o comentarios"></textarea></div>
        </div>
        <div class="amina-r-actions"><button class="amina-r-save" type="submit">Guardar resultado</button></div>
        <div id="amina-result-message" role="status"></div>
      </form>
      <h3>Historial de esta actividad</h3>
      <div class="amina-r-table"><table>
        <thead><tr><th>Nombre</th><th>Carrera</th><th>Año</th><th>Grupo/sección</th><th>Fecha</th><th>Puntaje</th><th>%</th><th>Estado</th></tr></thead>
        <tbody id="amina-results-history"></tbody>
      </table></div>
    </div>`;

  document.body.append(button, dialog);
  button.addEventListener("click", () => { renderHistory(); dialog.showModal(); });
  dialog.querySelector(".amina-r-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
  dialog.querySelector("#amina-results-form").addEventListener("submit", saveResult);
  dialog.querySelector("#amina-result-score").addEventListener("input", updateCalculation);
  dialog.querySelector("#amina-result-max").addEventListener("input", updateCalculation);
  renderHistory();

  const profileDialog = document.createElement("dialog");
  profileDialog.id = "amina-profile-dialog";
  profileDialog.innerHTML = `
    <div class="amina-r-head">
      <div><h2>Identificación y resultados</h2>
        <p>Completa tus datos antes de comenzar la actividad.</p></div>
    </div>
    <div class="amina-r-body">
      <p class="amina-p-intro">Estos datos aparecerán automáticamente en tus resultados y se conservarán para las demás actividades.</p>
      <form id="amina-profile-form">
        <div class="amina-r-grid">
          <div class="amina-r-field"><label for="amina-profile-name">Nombre completo</label>
            <input id="amina-profile-name" autocomplete="name" required value="${esc(profile.name)}"></div>
          <div class="amina-r-field"><label for="amina-profile-career">Carrera</label>
            <input id="amina-profile-career" list="amina-profile-careers" required value="${esc(profile.career)}">
            <datalist id="amina-profile-careers">${careers.map(c => `<option value="${esc(c)}">`).join("")}</datalist></div>
          <div class="amina-r-field"><label for="amina-profile-year">Año académico</label>
            <input id="amina-profile-year" list="amina-academic-years" required value="${esc(profile.year)}">
            <datalist id="amina-academic-years">${academicYears.map(y => `<option value="${esc(y)}">`).join("")}</datalist></div>
          <div class="amina-r-field"><label for="amina-profile-group">Grupo o sección</label>
            <input id="amina-profile-group" required placeholder="Ejemplo: A, B o Único" value="${esc(profile.group)}"></div>
        </div>
        <div class="amina-r-actions">
          <button class="amina-p-save" type="submit">Guardar datos y comenzar</button>
        </div>
        <div id="amina-profile-message" role="alert"></div>
      </form>
    </div>`;
  document.body.appendChild(profileDialog);

  profileDialog.querySelector("#amina-profile-form").addEventListener("submit", event => {
    event.preventDefault();
    const current = {
      name: profileDialog.querySelector("#amina-profile-name").value.trim(),
      career: profileDialog.querySelector("#amina-profile-career").value.trim(),
      year: profileDialog.querySelector("#amina-profile-year").value.trim(),
      group: profileDialog.querySelector("#amina-profile-group").value.trim()
    };
    if (!current.name || !current.career || !current.year || !current.group) {
      profileDialog.querySelector("#amina-profile-message").textContent =
        "Completa nombre, carrera, año y grupo o sección.";
      return;
    }
    localStorage.setItem(PROFILE, JSON.stringify(current));
    dialog.querySelector("#amina-result-name").value = current.name;
    dialog.querySelector("#amina-result-career").value = current.career;
    dialog.querySelector("#amina-result-year").value = current.year;
    dialog.querySelector("#amina-result-group").value = current.group;
    syncProfileToActivity(current);
    profileDialog.close();
  });
  syncProfileToActivity(profile);
  requestAnimationFrame(() => {
    if (!profileDialog.open) profileDialog.showModal();
  });
})();
