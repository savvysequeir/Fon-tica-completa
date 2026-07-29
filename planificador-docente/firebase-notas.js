import { getApps, getApp, initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getDatabase, ref, set, get, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBzvSc6hbV32HWamDIPf9pFSRMqUiqRaFA",
  authDomain: "fon-tica-completa.firebaseapp.com",
  databaseURL: "https://fon-tica-completa-default-rtdb.firebaseio.com",
  projectId: "fon-tica-completa",
  storageBucket: "fon-tica-completa.firebasestorage.app",
  messagingSenderId: "813731807059",
  appId: "1:813731807059:web:bda325a76429d44f4c6ba6"
};

const TEACHER_UID = "aqks8iG8JDT4caWNXqnRyWGYaaG2";
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

function cleanCode(code) {
  return String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function publishRecords(records) {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sesión mediante el botón Nube antes de publicar.");
  if (user.uid !== TEACHER_UID) throw new Error("Esta cuenta no tiene permiso para publicar notas.");
  if (!Array.isArray(records) || !records.length) throw new Error("No hay notas para publicar.");
  const token = await user.getIdToken(true);

  let published = 0;
  for (const record of records) {
    const code = cleanCode(record?.code);
    if (!code) continue;
    const response = await fetch(`${firebaseConfig.databaseURL}/amina/admin/publishedGrades/${code}.json?auth=${encodeURIComponent(token)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
      ...record,
      code,
      publishedBy: user.uid,
      publishedAt: Date.now()
      })
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Firebase rechazó la publicación (${response.status}): ${detail}`);
    }
    published++;
  }
  if (!published) throw new Error("Los estudiantes no tienen códigos válidos.");
  return { published };
}

async function lookupCode(code) {
  const clean = cleanCode(code);
  if (!clean) throw new Error("Escriba el código proporcionado por el docente.");
  const snapshot = await get(ref(db, `amina/admin/publishedGrades/${clean}`));
  if (!snapshot.exists()) throw new Error("Código no encontrado. Verifique e intente nuevamente.");
  return snapshot.val();
}

window.AminaFirebaseGrades = {
  publishRecords,
  lookupCode,
  teacherReady: () => auth.currentUser?.uid === TEACHER_UID
};
window.dispatchEvent(new Event("amina-firebase-grades-ready"));
