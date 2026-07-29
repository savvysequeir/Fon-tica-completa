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

function cardKey(card) {
  const bytes = new TextEncoder().encode(String(card || "").trim().toLowerCase());
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function randomSessionId() {
  const random = crypto.getRandomValues(new Uint32Array(4));
  return `qr_${Date.now().toString(36)}_${[...random].map(value => value.toString(36)).join("")}`;
}

async function startSession(payload) {
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sesión en el botón Nube antes de generar el QR.");
  if (user.uid !== TEACHER_UID) throw new Error("Solo el docente administrador puede iniciar una asistencia QR.");
  if (!payload?.students?.length) throw new Error("La lista no contiene estudiantes.");

  const cloudSessionId = randomSessionId();
  const students = {};
  payload.students.forEach(student => {
    if (!student.card) return;
    students[cardKey(student.card)] = {
      card: String(student.card).trim().toLowerCase(),
      studentId: String(student.id || "")
    };
  });
  if (!Object.keys(students).length) throw new Error("Los estudiantes no tienen carnets válidos.");

  await set(ref(db, `qrAttendance/sessions/${cloudSessionId}`), {
    sourceSessionId: String(payload.sessionId || ""),
    date: String(payload.date || ""),
    createdAt: serverTimestamp(),
    expiresAt: Number(payload.expiresAt),
    createdBy: user.uid,
    students
  });
  return { cloudSessionId };
}

async function getCheckins(cloudSessionId) {
  const user = auth.currentUser;
  if (!user || user.uid !== TEACHER_UID) return {};
  const snapshot = await get(ref(db, `qrAttendance/checkins/${cloudSessionId}`));
  return snapshot.exists() ? snapshot.val() : {};
}

async function studentCheckin(cloudSessionId, card) {
  const cleanCard = String(card || "").trim().toLowerCase();
  if (!cloudSessionId || !cleanCard) throw new Error("Escribe tu carnet.");
  const key = cardKey(cleanCard);
  await set(ref(db, `qrAttendance/checkins/${cloudSessionId}/${key}`), {
    card: cleanCard,
    at: serverTimestamp(),
    method: "QR Internet"
  });
}

window.AminaFirebaseQR = {
  startSession,
  getCheckins,
  studentCheckin,
  cardKey,
  teacherReady: () => auth.currentUser?.uid === TEACHER_UID
};
window.dispatchEvent(new Event("amina-firebase-qr-ready"));
