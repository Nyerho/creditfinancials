import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js';
import {
  getAuth,
  applyActionCode,
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = { 
  apiKey: "AIzaSyAo-ZYMA_OoiuzQEqCS3xGL3xTFTnYpIuk", 
  authDomain: "creditfinancials-5c56c.firebaseapp.com", 
  projectId: "creditfinancials-5c56c", 
  storageBucket: "creditfinancials-5c56c.firebasestorage.app", 
  messagingSenderId: "453204384940", 
  appId: "1:453204384940:web:2047c9493384277b7c9309", 
  measurementId: "G-MPHLEHZ5PM" 
}; 

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
let secondaryApp = null;
let secondaryAuth = null;

function getSecondaryAuth() {
  if (!secondaryApp) secondaryApp = initializeApp(firebaseConfig, 'nb-secondary');
  if (!secondaryAuth) secondaryAuth = getAuth(secondaryApp);
  return secondaryAuth;
}

async function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

async function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

async function sendVerifyEmail(user) {
  return sendEmailVerification(user);
}

async function sendPasswordReset(email) {
  return sendPasswordResetEmail(auth, email);
}

async function adminCreateAuthUser(email, password) {
  const a = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(a, email, password);
  try { await sendEmailVerification(cred.user); } catch (_) {}
  try { await signOut(a); } catch (_) {}
  return { uid: cred.user.uid };
}

async function reloadCurrentUser() {
  if (!auth.currentUser) return null;
  await reload(auth.currentUser);
  return auth.currentUser;
}

async function applyEmailVerificationCode(oobCode) {
  await applyActionCode(auth, oobCode);
}

async function signOutUser() {
  return signOut(auth);
}

async function queueEmail(to, subject, text, html) {
  const payload = {
    to,
    message: {
      subject: subject || '',
      text: text || '',
      html: html || ''
    }
  };
  await addDoc(collection(db, 'mail'), payload);
}

async function saveLoginOtp(userId, email, hash, expiresAt) {
  await setDoc(doc(db, 'login_otps', userId), { userId, email, hash, expiresAt, createdAt: serverTimestamp() });
}

async function getLoginOtp(userId) {
  const snap = await getDoc(doc(db, 'login_otps', userId));
  if (!snap.exists()) return null;
  return snap.data();
}

async function deleteLoginOtp(userId) {
  await deleteDoc(doc(db, 'login_otps', userId));
}

async function upsert(collectionName, id, data) {
  await setDoc(doc(db, collectionName, id), data, { merge: true });
}

async function remove(collectionName, id) {
  await deleteDoc(doc(db, collectionName, id));
}

async function list(collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function listWhere(collectionName, field, op, value) {
  const snap = await getDocs(query(collection(db, collectionName), where(field, op, value)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getById(collectionName, id) {
  const snap = await getDoc(doc(db, collectionName, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

async function existsDoc(collectionName, id) {
  const snap = await getDoc(doc(db, collectionName, id));
  return snap.exists();
}

async function findOneByField(collectionName, field, value) {
  const snap = await getDocs(query(collection(db, collectionName), where(field, '==', value)));
  const docSnap = snap.docs[0];
  if (!docSnap) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

function subscribeAll(collectionName, cb) {
  const q = collection(db, collectionName);
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

function subscribeWhere(collectionName, field, op, value, cb) {
  const q = query(collection(db, collectionName), where(field, op, value));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

function subscribeDoc(collectionName, id, cb) {
  const ref = doc(db, collectionName, id);
  return onSnapshot(ref, snap => cb(snap.exists() ? ({ id: snap.id, ...snap.data() }) : null));
}

window.NB_FIREBASE = {
  app,
  auth,
  db,
  signIn,
  signUp,
  sendVerifyEmail,
  sendPasswordReset,
  adminCreateAuthUser,
  reloadCurrentUser,
  applyEmailVerificationCode,
  signOutUser,
  queueEmail,
  saveLoginOtp,
  getLoginOtp,
  deleteLoginOtp,
  upsert,
  remove,
  list,
  listWhere,
  getById,
  existsDoc,
  findOneByField,
  subscribeAll,
  subscribeWhere,
  subscribeDoc
};

export { app, auth, db, signIn, signUp, sendVerifyEmail, sendPasswordReset, adminCreateAuthUser, reloadCurrentUser, applyEmailVerificationCode, signOutUser, queueEmail, saveLoginOtp, getLoginOtp, deleteLoginOtp, upsert, remove, list, listWhere, getById, existsDoc, findOneByField, subscribeAll, subscribeWhere, subscribeDoc };
