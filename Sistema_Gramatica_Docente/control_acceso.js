
(function(){
  const PUBLIC_FILES = new Set(['index.html','docente.html','estudiante.html','']);
  const currentFile = decodeURIComponent((location.pathname.split('/').pop() || 'index.html'));
  const isPublic = PUBLIC_FILES.has(currentFile);
  const params = new URLSearchParams(location.search);
  const isTeacherPreview = params.get('preview') === 'docente';
  function readJSON(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch(e){ return fallback; }
  }
  function saveJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
  function escapeHTML(str){ return String(str ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
  function getAssignment(){ return readJSON('grammarAssignmentConfig', null); }
  function isExpired(cfg){
    if(!cfg || !cfg.dueDate) return false;
    const end = new Date(cfg.dueDate + 'T23:59:59');
    return Date.now() > end.getTime();
  }
  function blockPage(reason, cfg){
    const title = cfg?.title || 'Tarea de gramática';
    const due = cfg?.dueDate ? `<p><b>Fecha límite:</b> ${escapeHTML(cfg.dueDate)}</p>` : '';
    const html = `
      <main style="min-height:100vh;display:grid;place-items:center;background:linear-gradient(135deg,#07111f,#111827,#1e1b4b);color:#e5e7eb;font-family:Arial, sans-serif;padding:24px;">
        <section style="max-width:760px;width:100%;background:rgba(15,23,42,.92);border:1px solid rgba(148,163,184,.25);border-radius:22px;padding:28px;box-shadow:0 22px 60px rgba(0,0,0,.45);">
          <div style="font-size:46px">🔒</div>
          <h1 style="margin:10px 0;color:#f8fafc">Actividad restringida</h1>
          <p style="line-height:1.6;color:#cbd5e1">${escapeHTML(reason)}</p>
          <p><b>Tarea activa:</b> ${escapeHTML(title)}</p>
          ${due}
          <a href="estudiante.html" style="display:inline-block;margin-top:14px;padding:12px 16px;border-radius:14px;background:#38bdf8;color:#07111f;text-decoration:none;font-weight:800">Ir al panel del estudiante</a>
        </section>
      </main>`;
    if(document.body){ document.body.innerHTML = html; }
    else document.addEventListener('DOMContentLoaded', () => { document.body.innerHTML = html; });
  }
  if(!isPublic && !isTeacherPreview){
    const cfg = getAssignment();
    if(!cfg || !Array.isArray(cfg.modules) || cfg.modules.length === 0){
      blockPage('No hay una tarea asignada en este navegador. Debes entrar primero desde el enlace generado por la página docente.', cfg);
      window.__GRAMMAR_BLOCKED__ = true;
    } else if(isExpired(cfg)){
      blockPage('La fecha límite de esta tarea ya venció. Pide al docente una nueva asignación.', cfg);
      window.__GRAMMAR_BLOCKED__ = true;
    } else if(!cfg.modules.includes(currentFile)){
      blockPage('Este módulo no fue asignado por el docente para esta tarea.', cfg);
      window.__GRAMMAR_BLOCKED__ = true;
    }
  }
  function getText(id){ const el=document.getElementById(id); return el ? el.textContent.trim() : ''; }
  function collectResult(){
    if(isPublic || window.__GRAMMAR_BLOCKED__) return;
    const cfg = getAssignment();
    if(!cfg) return;
    const title = (document.querySelector('h1')?.textContent || currentFile.replace('.html','')).trim();
    const result = {
      assignmentId: cfg.id || 'sin-id',
      assignmentTitle: cfg.title || 'Tarea sin título',
      moduleFile: currentFile,
      moduleTitle: title,
      name: getText('rName') || 'Pendiente',
      career: getText('rCareer') || 'Pendiente',
      year: getText('rYear') || 'Pendiente',
      a1: getText('rA1'),
      a2: getText('rA2'),
      a3: getText('rA3'),
      a4: getText('rA4'),
      a5: getText('rA5'),
      quiz: getText('rQuiz'),
      total: getText('rTotal'),
      state: getText('rState'),
      date: getText('rDate'),
      updatedAt: new Date().toISOString()
    };
    const key = 'grammarResults';
    const data = readJSON(key, {});
    const person = (result.name || 'sin_nombre').toLowerCase().replace(/\s+/g,'_');
    data[(cfg.id || 'sin-id') + '::' + currentFile + '::' + person] = result;
    saveJSON(key, data);
  }
  window.GrammarAccess = { collectResult };
  document.addEventListener('DOMContentLoaded', () => {
    collectResult();
    setInterval(collectResult, 4000);
    window.addEventListener('beforeunload', collectResult);
  });
})();
