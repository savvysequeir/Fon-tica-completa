import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  serverTimestamp
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const cloudPath = "amina/shared/workspace";
const exactKeys = new Set([
  "planCompetencias",
  "eneSelected",
  "planArchive",
  "dailyObservationArchive",
  "didacticExports",
  "didacticCellEdits",
  "didacticManualRows",
  "didacticMeta",
  "attendanceMeta",
  "gradesMeta",
  "gradesV36Migration",
  "gradesModelImported"
]);
const keyPrefixes = [
  "attendance:",
  "audit:",
  "gradeDates:",
  "grades:",
  "gradesV36:",
  "controlNotas:",
  "observations:"
];

let currentUser = null;
let cloudReady = false;
let saveTimer = null;
let remoteUpdatedAt = 0;
let lastLocalSaveAt = 0;

function relevantKey(key) {
  return exactKeys.has(key) || keyPrefixes.some(prefix => key.startsWith(prefix));
}

function collectLocalData() {
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && relevantKey(key)) entries.push({ key, value: localStorage.getItem(key) });
  }
  return entries.sort((a, b) => a.key.localeCompare(b.key));
}

function restoreLocalData(entries) {
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && relevantKey(key)) toRemove.push(key);
  }
  toRemove.forEach(key => localStorage.removeItem(key));
  (entries || []).forEach(item => {
    if (item?.key && relevantKey(item.key) && typeof item.value === "string") {
      localStorage.setItem(item.key, item.value);
    }
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildInterface() {
  const style = document.createElement("style");
  style.textContent = `
    #aminaCloudButton{position:fixed;right:18px;bottom:18px;z-index:2147483000;border:0;border-radius:999px;padding:13px 18px;background:#155eef;color:#fff;font:700 15px Arial;box-shadow:0 8px 28px #001c4d55;cursor:pointer}
    #aminaCloudButton.online{background:#167547}#aminaCloudButton.warning{background:#b54708}
    #aminaCloudPanel{position:fixed;inset:0;z-index:2147483001;background:#07111fcc;display:none;align-items:center;justify-content:center;padding:20px;font-family:Arial,sans-serif}
    #aminaCloudPanel.open{display:flex}.amina-cloud-card{width:min(520px,100%);background:#fff;color:#10233f;border-radius:22px;padding:26px;box-shadow:0 24px 80px #0007}
    .amina-cloud-card h2{margin:0 0 8px;color:#0b2a52}.amina-cloud-card p{line-height:1.5}.amina-cloud-card label{display:block;font-weight:700;margin:14px 0 6px}
    .amina-cloud-card input{width:100%;box-sizing:border-box;border:1px solid #aab8ca;border-radius:11px;padding:12px;font-size:16px}
    .amina-cloud-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.amina-cloud-actions button{border:0;border-radius:10px;padding:11px 15px;font-weight:700;cursor:pointer}
    .amina-primary{background:#155eef;color:#fff}.amina-green{background:#167547;color:#fff}.amina-soft{background:#e8eef7;color:#17345d}.amina-red{background:#fee4e2;color:#b42318}
    #aminaCloudStatus{margin-top:15px;padding:11px;border-radius:10px;background:#f2f6fb;min-height:20px}.amina-cloud-user{padding:10px;border-radius:10px;background:#ecfdf3;color:#12663c;font-weight:700}
  `;
  document.head.appendChild(style);

  const button = document.createElement("button");
  button.id = "aminaCloudButton";
  button.type = "button";
  button.textContent = "☁️ Nube";
  button.addEventListener("click", () => panel.classList.add("open"));

  const panel = document.createElement("div");
  panel.id = "aminaCloudPanel";
  panel.innerHTML = `
    <div class="amina-cloud-card" role="dialog" aria-modal="true" aria-labelledby="aminaCloudTitle">
      <h2 id="aminaCloudTitle">☁️ Amina en la nube</h2>
      <p>Inicia sesión para guardar y recuperar los planes, asistencias y notas desde otros dispositivos.</p>
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
        <div class="amina-cloud-actions">
          <button id="aminaCloudSave" class="amina-green" type="button">Guardar en la nube</button>
          <button id="aminaCloudLoad" class="amina-primary" type="button">Recuperar de la nube</button>
          <button id="aminaCloudLogout" class="amina-red" type="button">Cerrar sesión</button>
          <button class="amina-soft aminaCloudClose" type="button">Cerrar</button>
        </div>
      </div>
      <div id="aminaCloudStatus">Esperando inicio de sesión.</div>
    </div>
  `;
  document.body.append(button, panel);

  panel.querySelectorAll(".aminaCloudClose").forEach(element => {
    element.addEventListener("click", () => panel.classList.remove("open"));
  });
  panel.addEventListener("click", event => {
    if (event.target === panel) panel.classList.remove("open");
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") panel.classList.remove("open");
  });
  panel.querySelector("#aminaCloudLogin").addEventListener("click", login);
  panel.querySelector("#aminaCloudSave").addEventListener("click", () => saveCloud(true));
  panel.querySelector("#aminaCloudLoad").addEventListener("click", loadCloud);
  panel.querySelector("#aminaCloudLogout").addEventListener("click", () => signOut(auth));
  return { button, panel };
}

const ui = buildInterface();
const element = id => document.getElementById(id);

function status(message, error = false) {
  const box = element("aminaCloudStatus");
  if (box) {
    box.textContent = message;
    box.style.color = error ? "#b42318" : "#17345d";
  }
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
  if (!currentUser || !cloudReady) return;
  clearTimeout(saveTimer);
  const entries = collectLocalData();
  try {
    await set(ref(db, cloudPath), {
      version: 1,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.email || currentUser.uid,
      entries
    });
    lastLocalSaveAt = Date.now();
    ui.button.className = "online";
    ui.button.textContent = "☁️ Guardado";
    if (showMessage) status(`Información guardada en la nube: ${entries.length} registros.`);
    setTimeout(() => {
      if (currentUser) ui.button.textContent = "☁️ En línea";
    }, 1800);
  } catch (error) {
    ui.button.className = "warning";
    ui.button.textContent = "⚠️ Nube";
    status(`No se pudo guardar: ${error.code || error.message}`, true);
  }
}

async function loadCloud() {
  if (!currentUser) return status("Primero inicia sesión.", true);
  try {
    const snapshot = await get(ref(db, cloudPath));
    if (!snapshot.exists()) return status("Todavía no existen datos guardados en la nube.", true);
    const cloud = snapshot.val();
    if (!confirm(`Se recuperarán ${cloud.entries?.length || 0} registros y se reemplazarán los datos locales de Amina. ¿Continuar?`)) return;
    restoreLocalData(cloud.entries);
    sessionStorage.setItem("aminaCloudRestored", "1");
    status("Información recuperada. Actualizando la página…");
    setTimeout(() => location.reload(), 500);
  } catch (error) {
    status(`No se pudo recuperar: ${error.code || error.message}`, true);
  }
}

function scheduleCloudSave() {
  if (!currentUser || !cloudReady) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveCloud(false), 2200);
}

async function initializeCloudForUser(user) {
  currentUser = user;
  element("aminaCloudLoggedOut").hidden = true;
  element("aminaCloudLoggedIn").hidden = false;
  element("aminaCloudUser").textContent = `Sesión activa: ${user.email || user.uid}`;
  ui.button.className = "online";
  ui.button.textContent = "☁️ En línea";
  status("Comprobando los datos guardados…");
  try {
    const snapshot = await get(ref(db, cloudPath));
    if (!snapshot.exists()) {
      cloudReady = true;
      status("La nube está vacía. Se guardará la información actual de este dispositivo.");
      await saveCloud(true);
    } else {
      const cloud = snapshot.val();
      remoteUpdatedAt = Number(cloud.updatedAt) || 0;
      const restored = sessionStorage.getItem("aminaCloudRestored") === "1";
      if (!restored && collectLocalData().length === 0 && cloud.entries?.length) {
        restoreLocalData(cloud.entries);
        sessionStorage.setItem("aminaCloudRestored", "1");
        location.reload();
        return;
      }
      cloudReady = true;
      status(`Conexión activa. Hay ${cloud.entries?.length || 0} registros disponibles en la nube.`);
    }
    onValue(ref(db, cloudPath), snapshotValue => {
      const value = snapshotValue.val();
      const updated = Number(value?.updatedAt) || 0;
      if (updated && updated !== remoteUpdatedAt && Date.now() - lastLocalSaveAt > 3000) {
        remoteUpdatedAt = updated;
        ui.button.className = "warning";
        ui.button.textContent = "☁️ Actualización";
        status("Hay cambios nuevos en la nube. Pulsa “Recuperar de la nube” para aplicarlos.");
      }
    });
  } catch (error) {
    cloudReady = false;
    ui.button.className = "warning";
    status(`La cuenta inició sesión, pero la base rechazó la conexión: ${error.code || error.message}`, true);
  }
}

onAuthStateChanged(auth, user => {
  if (user) {
    initializeCloudForUser(user);
  } else {
    currentUser = null;
    cloudReady = false;
    element("aminaCloudLoggedOut").hidden = false;
    element("aminaCloudLoggedIn").hidden = true;
    ui.button.className = "";
    ui.button.textContent = "☁️ Nube";
    status("Inicia sesión para activar el guardado compartido.");
  }
});

document.addEventListener("input", scheduleCloudSave, true);
document.addEventListener("change", scheduleCloudSave, true);
document.addEventListener("click", event => {
  if (!event.target.closest("#aminaCloudPanel,#aminaCloudButton")) {
    setTimeout(scheduleCloudSave, 100);
  }
}, true);
window.addEventListener("online", scheduleCloudSave);

window.AminaCloud = {
  save: () => saveCloud(true),
  load: loadCloud,
  user: () => currentUser
};
