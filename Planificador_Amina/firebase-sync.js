import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence,
  signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getDatabase, ref, set, get, onValue, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBzvSc6hbV32HWamDIPf9pFSRMqUiqRaFA",
  authDomain: "fon-tica-completa.firebaseapp.com",
  databaseURL: "https://fon-tica-completa-default-rtdb.firebaseio.com",
  projectId: "fon-tica-completa",
  storageBucket: "fon-tica-completa.firebasestorage.app",
  messagingSenderId: "813731807059",
  appId: "1:813731807059:web:bda325a76429d44f4c6ba6",
  measurementId: "G-66MKN5Y8MC"
};

const USERS = {
  "aqks8iG8JDT4caWNXqnRyWGYaaG2": {
    role: "teacher", label: "Docente administrador", careers: ["*"]
  },
  "ZL3onztbjNcj8Fm2zzjk4MRVJbE3": {
    role: "coordinator", label: "Coordinación de Química Farmacéutica", careers: ["farmacia"]
  },
  "x9ZQBH3qLZatTpn57pg8mKQC2vG3": {
    role: "coordinator", label: "Coordinación de Odontología", careers: ["odontologia", "odontologia_ii"]
  },
  "My14GI2IIJVZsiXJBgYwBG6RnpP2": {
    role: "coordinator", label: "Coordinación de Medicina", careers: ["medicina"]
  },
  "rUOtRwIWGjSg0o9IoxXV7HmNemz1": {
    role: "coordinator", label: "Coordinación de Enfermería", careers: ["enfermeria"]
  }
};

const CAREERS = {
  farmacia: ["Farmacia", "Química Farmacéutica"],
  odontologia: ["Odontología"],
  odontologia_ii: ["Odontología II"],
  medicina: ["Medicina"],
  enfermeria: ["Enfermería"]
};

const exactKeys = new Set([
  "planCompetencias", "eneSelected", "planArchive", "dailyObservationArchive",
  "didacticExports", "didacticCellEdits", "didacticManualRows", "didacticMeta",
  "attendanceMeta", "gradesMeta", "gradesV36Migration", "gradesModelImported"
]);
const prefixes = [
  "attendance:", "audit:", "gradeDates:", "grades:", "gradesV36:",
  "controlNotas:", "observations:"
];
const arrayKeys = new Set([
  "planArchive", "dailyObservationArchive", "didacticExports", "didacticManualRows"
]);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
let currentUser = null;
let access = null;
let cloudReady = false;
let saveTimer = null;
let lastLocalSaveAt = 0;
let remoteUpdatedAt = 0;
let listeners = [];

const relevantKey = key => exactKeys.has(key) || prefixes.some(prefix => key.startsWith(prefix));
const parse = (value, fallback) => {
  try { return JSON.parse(value ?? ""); } catch { return fallback; }
};

function allLocalEntries() {
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && relevantKey(key)) entries.push({ key, value: localStorage.getItem(key) });
  }
  return entries.sort((a, b) => a.key.localeCompare(b.key));
}

function recordCareer(record) {
  return String(
    record?.career ?? record?.carrera ?? record?.observationCareer ??
    record?.snapshot?.carrera ?? record?.snapshot?.career ?? ""
  ).trim();
}

function matchesCareer(value, names) {
  const normalized = String(value || "").toLocaleLowerCase("es");
  return names.some(name => normalized.includes(name.toLocaleLowerCase("es")));
}

function filteredEntries(careerKey) {
  const names = CAREERS[careerKey];
  const source = new Map(allLocalEntries().map(item => [item.key, item.value]));
  const plans = parse(source.get("planArchive"), []).filter(item => names.includes(recordCareer(item)));
  const manual = parse(source.get("didacticManualRows"), []).filter(item => names.includes(recordCareer(item)));
  const allowedIds = new Set([...plans, ...manual].map(item => item.id));
  const result = [];

  for (const [key, value] of source) {
    if (key === "planArchive") {
      result.push({ key, value: JSON.stringify(plans) });
    } else if (key === "dailyObservationArchive") {
      result.push({
        key,
        value: JSON.stringify(parse(value, []).filter(item => names.includes(recordCareer(item))))
      });
    } else if (key === "didacticManualRows") {
      result.push({ key, value: JSON.stringify(manual) });
    } else if (key === "didacticExports") {
      result.push({
        key,
        value: JSON.stringify(parse(value, []).filter(id => allowedIds.has(id)))
      });
    } else if (key === "didacticCellEdits") {
      const edits = parse(value, {});
      result.push({
        key,
        value: JSON.stringify(Object.fromEntries(
          Object.entries(edits).filter(([id]) => allowedIds.has(id))
        ))
      });
    } else if (["planCompetencias", "attendanceMeta", "gradesMeta", "didacticMeta"].includes(key)) {
      const meta = parse(value, {});
      const selected = meta.career ?? meta.carrera ?? "";
      if (matchesCareer(selected, names)) result.push({ key, value });
    } else if (key === "eneSelected") {
      result.push({ key, value });
    } else if (prefixes.some(prefix => key.startsWith(prefix)) && matchesCareer(key, names)) {
      result.push({ key, value });
    }
  }
  return result;
}

function mergeEntries(groups) {
  const merged = new Map();
  for (const entries of groups) {
    for (const item of entries || []) {
      if (!item?.key || typeof item.value !== "string") continue;
      if (arrayKeys.has(item.key)) {
        const previous = parse(merged.get(item.key), []);
        const incoming = parse(item.value, []);
        const values = [...previous, ...incoming];
        const unique = item.key === "didacticExports"
          ? [...new Set(values)]
          : [...new Map(values.map((value, index) => [value?.id || `${item.key}-${index}-${JSON.stringify(value)}`, value])).values()];
        merged.set(item.key, JSON.stringify(unique));
      } else if (item.key === "didacticCellEdits") {
        merged.set(item.key, JSON.stringify({
          ...parse(merged.get(item.key), {}),
          ...parse(item.value, {})
        }));
      } else {
        merged.set(item.key, item.value);
      }
    }
  }
  return [...merged].map(([key, value]) => ({ key, value }));
}

function restoreEntries(entries) {
  const remove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && relevantKey(key)) remove.push(key);
  }
  remove.forEach(key => localStorage.removeItem(key));
  (entries || []).forEach(item => {
    if (item?.key && relevantKey(item.key) && typeof item.value === "string") {
      localStorage.setItem(item.key, item.value);
    }
  });
}

function buildInterface() {
  const style = document.createElement("style");
  style.textContent = `
    #aminaCloudButton{position:fixed;right:18px;bottom:18px;z-index:2147483000;border:0;border-radius:999px;padding:13px 18px;background:#155eef;color:#fff;font:700 15px Arial;box-shadow:0 8px 28px #001c4d55;cursor:pointer}
    #aminaCloudButton.online{background:#167547}#aminaCloudButton.warning{background:#b54708}
    #aminaCloudPanel{position:fixed;inset:0;z-index:2147483001;background:#07111fcc;display:none;align-items:center;justify-content:center;padding:20px;font-family:Arial,sans-serif}
    #aminaCloudPanel.open{display:flex}.amina-cloud-card{width:min(540px,100%);background:#fff;color:#10233f;border-radius:22px;padding:26px;box-shadow:0 24px 80px #0007}
    .amina-cloud-card h2{margin:0 0 8px;color:#0b2a52}.amina-cloud-card p{line-height:1.5}.amina-cloud-card label{display:block;font-weight:700;margin:14px 0 6px}
    .amina-cloud-card input{width:100%;box-sizing:border-box;border:1px solid #aab8ca;border-radius:11px;padding:12px;font-size:16px}
    .amina-cloud-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.amina-cloud-actions button{border:0;border-radius:10px;padding:11px 15px;font-weight:700;cursor:pointer}
    .amina-primary{background:#155eef;color:#fff}.amina-green{background:#167547;color:#fff}.amina-soft{background:#e8eef7;color:#17345d}.amina-red{background:#fee4e2;color:#b42318}
    #aminaCloudStatus{margin-top:15px;padding:11px;border-radius:10px;background:#f2f6fb;min-height:20px}.amina-cloud-user{padding:10px;border-radius:10px;background:#ecfdf3;color:#12663c;font-weight:700}
    .amina-readonly{margin-top:10px;padding:10px;border-radius:10px;background:#fff4e5;color:#8a4b08;font-weight:700}
  `;
  document.head.appendChild(style);
  const button = document.createElement("button");
  button.id = "aminaCloudButton";
  button.type = "button";
  button.textContent = "☁️ Nube";
  const panel = document.createElement("div");
  panel.id = "aminaCloudPanel";
  panel.innerHTML = `
    <div class="amina-cloud-card" role="dialog" aria-modal="true">
      <h2>☁️ Amina en la nube</h2>
      <p>Acceso seguro para el docente y las coordinaciones autorizadas.</p>
      <div id="aminaCloudLoggedOut">
        <label for="aminaCloudEmail">Correo electrónico</label>
        <input id="aminaCloudEmail" type="email" autocomplete="username">
        <label for="aminaCloudPassword">Contraseña</label>
        <input id="aminaCloudPassword" type="password" autocomplete="current-password">
        <div class="amina-cloud-actions">
          <button id="aminaCloudLogin" class="amina-primary" type="button">Iniciar sesión</button>
          <button class="amina-soft aminaCloudClose" type="button">Cancelar</button>
        </div>
      </div>
      <div id="aminaCloudLoggedIn" hidden>
        <div id="aminaCloudUser" class="amina-cloud-user"></div>
        <div id="aminaCloudReadOnly" class="amina-readonly" hidden>Acceso de coordinación: solo lectura y descarga.</div>
        <div class="amina-cloud-actions">
          <button id="aminaCloudSave" class="amina-green" type="button">Guardar en la nube</button>
          <button id="aminaCloudLoad" class="amina-primary" type="button">Actualizar desde la nube</button>
          <button id="aminaCloudLogout" class="amina-red" type="button">Cerrar sesión</button>
          <button class="amina-soft aminaCloudClose" type="button">Cerrar</button>
        </div>
      </div>
      <div id="aminaCloudStatus">Esperando inicio de sesión.</div>
    </div>`;
  document.body.append(button, panel);
  button.addEventListener("click", () => panel.classList.add("open"));
  panel.querySelectorAll(".aminaCloudClose").forEach(item => item.addEventListener("click", () => panel.classList.remove("open")));
  panel.addEventListener("click", event => { if (event.target === panel) panel.classList.remove("open"); });
  panel.querySelector("#aminaCloudLogin").addEventListener("click", login);
  panel.querySelector("#aminaCloudSave").addEventListener("click", () => saveCloud(true));
  panel.querySelector("#aminaCloudLoad").addEventListener("click", loadCloud);
  panel.querySelector("#aminaCloudLogout").addEventListener("click", () => signOut(auth));
  document.addEventListener("keydown", event => { if (event.key === "Escape") panel.classList.remove("open"); });
  return { button, panel };
}

const ui = buildInterface();
const element = id => document.getElementById(id);
function status(message, error = false) {
  element("aminaCloudStatus").textContent = message;
  element("aminaCloudStatus").style.color = error ? "#b42318" : "#17345d";
}

async function login() {
  const email = element("aminaCloudEmail").value.trim();
  const password = element("aminaCloudPassword").value;
  if (!email || !password) return status("Escribe el correo y la contraseña.", true);
  status("Comprobando la cuenta…");
  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    element("aminaCloudPassword").value = "";
  } catch (error) {
    const messages = {
      "auth/invalid-credential": "Correo o contraseña incorrectos.",
      "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
      "auth/network-request-failed": "No hay conexión con Firebase."
    };
    status(messages[error.code] || `No se pudo iniciar sesión: ${error.code || error.message}`, true);
  }
}

async function saveCloud(showMessage = false) {
  if (!currentUser || !cloudReady || access?.role !== "teacher") return;
  clearTimeout(saveTimer);
  try {
    const now = serverTimestamp();
    await set(ref(db, "amina/admin/workspace"), {
      version: 2, updatedAt: now, updatedBy: currentUser.email, entries: allLocalEntries()
    });
    for (const careerKey of Object.keys(CAREERS)) {
      await set(ref(db, `amina/carreras/${careerKey}/workspace`), {
        version: 2, updatedAt: serverTimestamp(), updatedBy: currentUser.email,
        entries: filteredEntries(careerKey)
      });
    }
    lastLocalSaveAt = Date.now();
    ui.button.className = "online";
    ui.button.textContent = "☁️ Guardado";
    if (showMessage) status("Información general y carpetas de coordinación guardadas correctamente.");
    setTimeout(() => { if (currentUser) ui.button.textContent = "☁️ En línea"; }, 1800);
  } catch (error) {
    ui.button.className = "warning";
    status(`No se pudo guardar: ${error.code || error.message}`, true);
  }
}

async function readAllowedCloud() {
  if (access.role === "teacher") {
    const snapshot = await get(ref(db, "amina/admin/workspace"));
    return snapshot.exists() ? snapshot.val() : null;
  }
  const clouds = [];
  for (const careerKey of access.careers) {
    const snapshot = await get(ref(db, `amina/carreras/${careerKey}/workspace`));
    if (snapshot.exists()) clouds.push(snapshot.val());
  }
  if (!clouds.length) return null;
  return {
    updatedAt: Math.max(...clouds.map(item => Number(item.updatedAt) || 0)),
    entries: mergeEntries(clouds.map(item => item.entries))
  };
}

async function loadCloud() {
  if (!currentUser || !access) return status("Primero inicia sesión.", true);
  try {
    const cloud = await readAllowedCloud();
    if (!cloud) return status("Todavía no existen datos para este acceso.", true);
    const label = access.role === "teacher" ? "todos los datos" : access.label;
    if (!confirm(`Se recuperará la información autorizada para ${label}. ¿Continuar?`)) return;
    restoreEntries(cloud.entries);
    sessionStorage.setItem(`aminaCloudRestored:${currentUser.uid}`, "1");
    status("Información recuperada. Actualizando la página…");
    setTimeout(() => location.reload(), 450);
  } catch (error) {
    status(`No se pudo recuperar: ${error.code || error.message}`, true);
  }
}

function scheduleCloudSave() {
  if (!currentUser || !cloudReady || access?.role !== "teacher") return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveCloud(false), 2400);
}

async function initializeUser(user) {
  currentUser = user;
  access = USERS[user.uid] || null;
  element("aminaCloudLoggedOut").hidden = true;
  element("aminaCloudLoggedIn").hidden = false;
  if (!access) {
    element("aminaCloudSave").hidden = true;
    element("aminaCloudLoad").hidden = true;
    element("aminaCloudUser").textContent = user.email || user.uid;
    return status("Esta cuenta existe, pero no tiene una carrera asignada.", true);
  }
  const coordinator = access.role === "coordinator";
  element("aminaCloudUser").textContent = `${access.label} · ${user.email || ""}`;
  element("aminaCloudReadOnly").hidden = !coordinator;
  element("aminaCloudSave").hidden = coordinator;
  ui.button.className = "online";
  ui.button.textContent = coordinator ? "☁️ Coordinación" : "☁️ Docente";
  try {
    const cloud = await readAllowedCloud();
    if (!cloud && access.role === "teacher") {
      cloudReady = true;
      status("La nube institucional está vacía. Guardando la información actual.");
      await saveCloud(true);
      return;
    }
    if (!cloud) {
      cloudReady = true;
      return status("El docente todavía no ha publicado información para esta coordinación.");
    }
    remoteUpdatedAt = Number(cloud.updatedAt) || 0;
    cloudReady = true;
    const restored = sessionStorage.getItem(`aminaCloudRestored:${user.uid}`) === "1";
    if (coordinator && !restored) {
      restoreEntries(cloud.entries);
      sessionStorage.setItem(`aminaCloudRestored:${user.uid}`, "1");
      location.reload();
      return;
    }
    status(coordinator
      ? `${access.label}: ${cloud.entries?.length || 0} registros disponibles en modo de consulta.`
      : `${cloud.entries?.length || 0} registros disponibles. Administración completa activa.`);
    const watchPaths = coordinator
      ? access.careers.map(careerKey => `amina/carreras/${careerKey}/workspace`)
      : ["amina/admin/workspace"];
    watchPaths.forEach(watchPath => listeners.push(onValue(ref(db, watchPath), snapshot => {
      const updated = Number(snapshot.val()?.updatedAt) || 0;
      if (updated && updated !== remoteUpdatedAt && Date.now() - lastLocalSaveAt > 3000) {
        remoteUpdatedAt = updated;
        ui.button.className = "warning";
        ui.button.textContent = "☁️ Actualización";
        status("Hay cambios nuevos. Pulsa “Actualizar desde la nube”.");
      }
    })));
  } catch (error) {
    cloudReady = false;
    ui.button.className = "warning";
    status(`Firebase rechazó el acceso: ${error.code || error.message}`, true);
  }
}

onAuthStateChanged(auth, user => {
  listeners.forEach(unsubscribe => unsubscribe());
  listeners = [];
  if (user) initializeUser(user);
  else {
    currentUser = null;
    access = null;
    cloudReady = false;
    element("aminaCloudLoggedOut").hidden = false;
    element("aminaCloudLoggedIn").hidden = true;
    ui.button.className = "";
    ui.button.textContent = "☁️ Nube";
    status("Inicia sesión para acceder a la información autorizada.");
  }
});

document.addEventListener("input", scheduleCloudSave, true);
document.addEventListener("change", scheduleCloudSave, true);
document.addEventListener("click", event => {
  if (!event.target.closest("#aminaCloudPanel,#aminaCloudButton")) setTimeout(scheduleCloudSave, 100);
}, true);
window.addEventListener("online", scheduleCloudSave);

window.AminaCloud = {
  save: () => saveCloud(true),
  load: loadCloud,
  user: () => currentUser,
  access: () => access
};
