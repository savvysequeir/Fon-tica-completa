(function () {
  "use strict";

  function readConfig() {
    try {
      return JSON.parse(localStorage.getItem("grammarAssignmentConfig") || "null");
    } catch (_) {
      return null;
    }
  }

  function fileName(path) {
    return String(path || "").split("/").pop();
  }

  function showBlocked(title, message) {
    document.addEventListener("DOMContentLoaded", function () {
      const layer = document.createElement("div");
      layer.setAttribute("role", "alertdialog");
      layer.setAttribute("aria-modal", "true");
      layer.style.cssText =
        "position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;" +
        "padding:20px;background:rgba(2,6,23,.92);font-family:Arial,sans-serif";
      layer.innerHTML =
        '<section style="width:min(560px,100%);padding:25px;border:1px solid #475569;' +
        'border-radius:20px;background:#0f172a;color:#e5e7eb;box-shadow:0 25px 80px #000">' +
        '<h2 style="margin:0 0 12px;color:#f8fafc">' + title + "</h2>" +
        '<p style="line-height:1.6;color:#cbd5e1">' + message + "</p>" +
        '<a href="estudiante.html" style="display:inline-block;margin-top:10px;padding:12px 16px;' +
        'border-radius:12px;background:#38bdf8;color:#082f49;text-decoration:none;font-weight:900">' +
        "Volver al portal estudiante</a></section>";
      document.body.appendChild(layer);
    });
  }

  const params = new URLSearchParams(location.search);
  if (params.get("preview") === "docente") return;

  const config = readConfig();
  if (!config || !Array.isArray(config.modules)) {
    showBlocked(
      "Esta actividad todavía no está cargada",
      "Abre primero el enlace de tarea que te envió el docente. Ese enlace cargará únicamente las actividades asignadas."
    );
    return;
  }

  const current = fileName(location.pathname);
  const allowed = config.modules.some(function (modulePath) {
    return fileName(modulePath) === current;
  });
  if (!allowed) {
    showBlocked(
      "Actividad no incluida en esta tarea",
      "El docente no seleccionó esta actividad para la asignación que está cargada actualmente."
    );
  }
})();
