(function () {
  "use strict";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function waitApi() { return new Promise((resolve,reject)=>{if(window.AminaFirebaseGrades)return resolve(window.AminaFirebaseGrades);let tries=0,t=setInterval(()=>{if(window.AminaFirebaseGrades){clearInterval(t);resolve(window.AminaFirebaseGrades)}else if(++tries>80){clearInterval(t);reject(new Error("No se pudo conectar con Firebase."))}},100)}); }
  function target() { let el=document.getElementById("examCloudResults");if(!el){el=document.createElement("div");el.id="examCloudResults";el.style.marginTop="18px";document.getElementById("searchResult")?.after(el)}return el; }
  async function loadExamResults() {
    const carnet=document.getElementById("searchCard")?.value.trim();
    const out=target();
    if(!carnet){out.innerHTML="";return}
    out.innerHTML="<p>Consultando exámenes enviados a la nube…</p>";
    try {
      const api=await waitApi(),rows=await api.lookupExamResults(carnet);
      if(!rows.length){out.innerHTML='<div class="panel"><h3>Resultados de exámenes Amina</h3><p>No hay intentos enviados para este carnet.</p></div>';return}
      out.innerHTML=`<div class="panel"><h3>Resultados de exámenes Amina · ${esc(carnet)}</h3><div class="sheet"><table class="audit-table"><thead><tr><th>Fecha</th><th>Examen</th><th>Estudiante</th><th>Carrera / grupo</th><th>Puntaje</th><th>Porcentaje</th><th>Estado</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${new Date(r.submittedAt||r.date).toLocaleString("es-NI")}</td><td>${esc(r.examTitle||`Examen ${r.exam}`)}</td><td>${esc(r.name)}</td><td>${esc(r.career)} · ${esc(r.year)} · ${esc(r.group)}</td><td><strong>${esc(r.score)}/50</strong></td><td>${esc(r.percentage)}%</td><td>${esc(r.state)}</td></tr>`).join("")}</tbody></table></div></div>`;
    } catch(error) { out.innerHTML=`<p style="color:#b42318"><b>No se pudieron consultar los exámenes:</b> ${esc(error.message)}</p>`; }
  }
  const original=window.searchStudent;
  window.searchStudent=function(){if(typeof original==="function")original();loadExamResults()};
})();
