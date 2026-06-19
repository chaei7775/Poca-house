
import { auth, onAuthStateChanged } from "./firebase.js";
import { loadUser, saveUser } from "./dataManager.js";

let uid = null;
let userData = null;

function showSaveToast() {
  const old = document.getElementById("save-toast");
  if (old) old.remove();

  const el = document.createElement("div");
  el.id = "save-toast";
  el.innerText = "저장 중...";

  el.style.cssText = `
    position:fixed;
    top:10px;
    left:50%;
    transform:translateX(-50%);
    font-size:11px;
    padding:4px 10px;
    background:rgba(0,0,0,0.6);
    color:#fff;
    border-radius:8px;
    z-index:9999;
  `;

  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function syncServer() {
  if (!uid || !userData) return;
  saveUser(uid, userData);
  showSaveToast();
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  uid = user.uid;
  userData = await loadUser(uid);
  initGame();
});

function initGame() {
  console.log("game start", userData);
}

function getCoins() {
  return userData?.coins || 0;
}

function setCoins(v) {
  userData.coins = v;
  syncServer();
}

function addItem(item) {
  if (!userData.inventory) userData.inventory = {};
  userData.inventory[item] = (userData.inventory[item] || 0) + 1;
  syncServer();
}

function setRoom(roomId) {
  userData.room = roomId;
  syncServer();
}

function finishAlba(result) {
  userData.alba = userData.alba || {};
  userData.alba.last = result;
  syncServer();
}

function finishExplore(result) {
  userData.explore = userData.explore || {};
  userData.explore.last = result;
  syncServer();
}

function addTimeline(entry) {
  userData.timeline = userData.timeline || [];
  userData.timeline.push({ ...entry, time: Date.now() });
  syncServer();
}

window.GameAPI = {
  getCoins,
  setCoins,
  addItem,
  setRoom,
  finishAlba,
  finishExplore,
  addTimeline
};
