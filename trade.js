// ════════════════════════════════
// 🏪 유저 거래소 (trade.js) — game.js / auth.js / enhance.js / recombine.js 는 건드리지 않음
// 거래 품목: 🔹재조합석 💠에픽 재조합석 🔨강화석 🛡️방지권 💎초월석  (코인으로만 거래)
// 방식: 게시판형. 판매자가 등록(재료 먼저 빠짐) → 구매자가 사면 Firestore 트랜잭션으로 "아직 안 팔렸나" 확인
//       → 구매자는 재료를 받고, 판매자는 다음 접속(또는 거래소 열 때)에 코인을 받음 (수수료 FEE)
// 필요: 로그인(게스트는 불가) + window.pocaFirebase 에 runTransaction 이 들어있어야 함
// 저장: Firestore 'trades' 컬렉션 + localStorage 'ph_trade' (중복 지급 방지용 기록)
// 등록: loader.js NEW_CONTENT_FILES 맨 끝에 'trade.js' 한 줄 추가 → 더보기 메뉴에 🏪 거래소 타일이 생김
// ※ Firebase 콘솔의 Firestore 규칙(rules)에 trades 블록을 꼭 추가해야 동작함 (아래 TRADE_RULES.txt 참고)
// ════════════════════════════════
(function () {
  'use strict';

  // ───────── ⚙️ 설정 (여기 숫자만 고치면 됨 — 규칙(rules) 파일의 가격 범위도 같이 맞춰야 함) ─────────
  var COL = 'trades';
  var FEE = 0.05;            // 판매 수수료 5% (판매자가 받는 코인에서 뺌 → 코인 소각)
  var DAILY_LIST = 100;       // 하루 등록 횟수 제한
  var DAILY_BUY = 100;        // 하루 구매 횟수 제한
  var MAX_QTY = 99;          // 한 번에 등록 가능한 수량
  var ITEMS = {              // min/max = 개당 가격 범위 (코인)
    recomb:  { name: '재조합석',      emoji: '🔹', kind: 'bag', desc: '카드 재조합에 필요한 재료',         min: 100,   max: 150000 },
    ws:      { name: '공방의 원석',  emoji: '🔶', kind: 'bag', desc: '굿즈 공방 제작에 필요한 재료',       min: 500,   max: 100000 },
    epic:    { name: '에픽 재조합석', emoji: '💠', kind: 'bag', desc: 'SSR/UR 카드 재조합에 필요한 재료', min: 2000,  max: 1000000 },
    stone:   { name: '강화석',        emoji: '🔨', kind: 'enh', field: 'stone',   min: 1000,  max: 1000000 },
    protect: { name: '방지권',        emoji: '🛡️', kind: 'enh', field: 'protect', min: 2000,  max: 3000000 },
    trans:   { name: '초월석',        emoji: '💎', kind: 'enh', field: 'trans',   min: 10000, max: 20000000 },
    slotx:   { name: '슬롯 확장권',  emoji: '🎟️', kind: 'bag', desc: '드라마 촬영 카드의 스킬 슬롯을 영구로 +1', min: 30000, max: 5000000 },
    dev:     { name: '현상액',        emoji: '🧪', kind: 'bag', type: 'film', desc: '포토랩 옵션 강화 재료 · 공연장에서 얻어요', min: 1000, max: 2000000 },
    // 📚 드라마 촬영 스킬북 (종류별) — 이름은 skillbook.js 와 같아야 함. 규칙(rules)은 'bk_.*' 한 줄로 묶음
    bk_emotion: { name: '감정 스킬북',     emoji: '📕', kind: 'bag', type: 'skillbook', desc: '드라마 촬영 감정 스킬 숙련도 +5',     min: 2000, max: 5000000 },
    bk_action:  { name: '액션 스킬북',     emoji: '📙', kind: 'bag', type: 'skillbook', desc: '드라마 촬영 액션 스킬 숙련도 +5',     min: 2000, max: 5000000 },
    bk_adlib:   { name: '애드리브 스킬북', emoji: '📗', kind: 'bag', type: 'skillbook', desc: '드라마 촬영 애드리브 스킬 숙련도 +5', min: 2000, max: 5000000 },
    bk_aux:     { name: '보조 스킬북',     emoji: '📘', kind: 'bag', type: 'skillbook', desc: '드라마 촬영 보조 스킬 숙련도 +5',     min: 2000, max: 5000000 }
  };
  var ORDER = ['recomb', 'ws', 'epic', 'stone', 'protect', 'trans', 'slotx', 'dev', 'bk_emotion', 'bk_action', 'bk_adlib', 'bk_aux'];
  // 🌿 탐험 재료도 거래 가능 (품목 키는 'mat_' + 재료이름 → Firebase 규칙에서 한 줄로 묶음)
  var MAT_MIN = 100, MAT_MAX = 50000;   // 재료 공통 가격 범위 (규칙 파일과 같아야 함)
  var MAT_ORDER = [];
  (function () {
    try {
      if (typeof MATERIAL_EMOJI_MAP === 'undefined') return;
      Object.keys(MATERIAL_EMOJI_MAP).forEach(function (n) {
        var k = 'mat_' + n;
        ITEMS[k] = { name: n, emoji: MATERIAL_EMOJI_MAP[n], kind: 'bag', desc: '탐험 재료', min: MAT_MIN, max: MAT_MAX };
        MAT_ORDER.push(k);
      });
    } catch (e) {}
  })();
  var STATE_KEY = 'ph_trade';
  var ENH_KEY = 'ph_enhance';

  // ───────── 공통 도우미 ─────────
  function fmt(n) { return Number(n).toLocaleString(); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // 거래소 화면(z-index 955) 위에 보이도록 자체 알림창을 씀 (게임 기본 토스트는 화면 뒤에 가려짐)
  function toast(m) {
    try {
      var old = document.getElementById('trade-toast'); if (old) old.remove();
      var el = document.createElement('div');
      el.id = 'trade-toast';
      el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(26,26,46,0.97);border:1.5px solid #34D399;color:#fff;padding:11px 20px;border-radius:20px;font-size:13px;font-weight:700;z-index:1300;max-width:88vw;text-align:center;line-height:1.5;font-family:"Noto Sans KR",sans-serif;';
      el.textContent = m;
      document.body.appendChild(el);
      setTimeout(function () { if (el.parentNode) el.remove(); }, 3500);
    } catch (e) { try { if (typeof showBagToast === 'function') showBagToast(m); } catch (e2) {} }
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function F() { return window.pocaFirebase || null; }
  function uid() { return window.pocaLoggedInUid || null; }
  function myNick() { try { return localStorage.getItem('ph_nickname') || '익명'; } catch (e) { return '익명'; } }
  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }

  // 이 기능을 쓸 수 있는 상태인지 (null 이면 OK, 아니면 안내 문구)
  function notReady() {
    if (!uid()) return '로그인한 계정에서만 거래할 수 있어요 (☁️ 계정에서 로그인)';
    var f = F();
    if (!window.pocaFirebaseReady || !f || !f.db) return '서버 연결을 기다리는 중이에요. 잠시 후 다시 해주세요';
    var need = ['collection', 'doc', 'getDocs', 'query', 'where', 'runTransaction'];
    var miss = need.filter(function (k) { return typeof f[k] !== 'function'; });
    if (miss.length) return '거래소에 필요한 서버 기능이 빠져 있어요: ' + miss.join(', ') + ' (index.html 의 Firebase 부분에 추가 필요)';
    return null;
  }

  // ───────── 로컬 기록 (중복 지급 방지) ─────────
  function loadState() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!Array.isArray(s.credited)) s.credited = [];   // 판매 대금/반환 재료를 이미 받은 거래 id
    if (!Array.isArray(s.received)) s.received = [];   // 구매 재료를 이미 받은 거래 id
    if (!s.daily || s.daily.date !== today()) s.daily = { date: today(), list: 0, buy: 0 };
    if (!('pendingList' in s)) s.pendingList = null;   // 등록 도중 앱이 꺼졌을 때 복구용
    if (!Array.isArray(s.log)) s.log = [];              // 정산 내역 (화면에 최근 것만 보여줌)
    return s;
  }
  function addLog(s, msg) { s.log.push({ t: Date.now(), m: msg }); }
  function saveState(s) {
    if (s.log.length > 30) s.log = s.log.slice(-20);
    if (s.credited.length > 150) s.credited = s.credited.slice(-100);
    if (s.received.length > 150) s.received = s.received.slice(-100);
    try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  // ───────── 재료 보유 / 증감 ─────────
  function loadEnh() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(ENH_KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    return s;
  }
  function have(key) {
    var it = ITEMS[key];
    if (it.kind === 'bag') {
      var b = null;
      try { b = bagItems.filter(function (i) { return i.name === it.name; })[0]; } catch (e) {}
      return b ? (b.qty || 0) : 0;
    }
    return Math.max(0, Math.floor(Number(loadEnh()[it.field]) || 0));
  }
  function take(key, qty) {                       // 보유량이 충분할 때만 차감 (true/false)
    var it = ITEMS[key];
    if (have(key) < qty) return false;
    if (it.kind === 'bag') return !!useFromBag(it.name, qty);
    var s = loadEnh();
    s[it.field] = have(key) - qty;
    try { localStorage.setItem(ENH_KEY, JSON.stringify(s)); } catch (e) { return false; }
    return true;
  }
  function canReceive(key) {
    var it = ITEMS[key];
    if (it.kind !== 'bag') return true;
    try { return bagItems.some(function (i) { return i.name === it.name; }) || bagItems.length < bagSlots; } catch (e) { return false; }
  }
  function give(key, qty) {
    var it = ITEMS[key];
    if (it.kind === 'bag') return !!addToBag(it.emoji, it.name, it.type || 'material', qty, it.desc);
    var s = loadEnh();
    s[it.field] = have(key) + qty;
    try { localStorage.setItem(ENH_KEY, JSON.stringify(s)); } catch (e) { return false; }
    return true;
  }
  function addCoins(n) {
    coins = Math.max(0, coins + n);
    try { if (typeof saveAll === 'function') saveAll(); if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); } catch (e) {}
  }
  function persist() { try { if (typeof saveAll === 'function') saveAll(); } catch (e) {} }

  function errText(e) {
    var m = (e && e.message) || '';
    if (m === 'gone') return '이미 팔렸거나 취소된 물건이에요';
    if (m === 'mine') return '내가 올린 물건은 살 수 없어요';
    if (e && e.code === 'permission-denied') return '서버 규칙(rules)이 아직 적용되지 않았어요';
    return '오류가 발생했어요: ' + ((e && (e.code || e.message)) || e);
  }

  // ───────── 서버 작업 ─────────
  async function listItem(key, qty, unitPrice) {
    var bad = notReady(); if (bad) throw new Error(bad);
    var it = ITEMS[key];
    if (!it) throw new Error('알 수 없는 품목이에요');
    if (!isInt(qty) || qty < 1 || qty > MAX_QTY) throw new Error('수량은 1~' + MAX_QTY + ' 사이로 해주세요');
    if (!isInt(unitPrice) || unitPrice < it.min || unitPrice > it.max) throw new Error(it.name + ' 가격은 개당 ' + fmt(it.min) + '~' + fmt(it.max) + ' 코인이에요');
    var S = loadState();
    if (S.daily.list >= DAILY_LIST) throw new Error('오늘 등록 가능 횟수(' + DAILY_LIST + '번)를 다 썼어요');
    if (have(key) < qty) throw new Error(it.name + '이(가) 부족해요');

    var f = F();
    var ref = f.doc(f.collection(f.db, COL));
    var data = {
      sellerUid: uid(), sellerNick: myNick(), item: key, qty: qty, unitPrice: unitPrice, total: qty * unitPrice,
      status: 'open', claimed: false, createdAt: Date.now()
    };
    // 재료를 먼저 빼고 기록 → 서버에 올림 (실패하면 되돌림)
    if (!take(key, qty)) throw new Error(it.name + '을(를) 꺼내지 못했어요');
    S.pendingList = { id: ref.id, key: key, qty: qty };
    saveState(S); persist();
    try {
      await f.runTransaction(f.db, async function (tx) { tx.set(ref, data); });
    } catch (e) {
      give(key, qty);
      var S2 = loadState(); S2.pendingList = null; saveState(S2); persist();
      throw e;
    }
    var S3 = loadState(); S3.pendingList = null; S3.daily.list += 1; saveState(S3); persist();
    return ref.id;
  }

  async function listOpen(key) {
    var bad = notReady(); if (bad) throw new Error(bad);
    var f = F();
    var snap = await f.getDocs(f.query(f.collection(f.db, COL), f.where('item', '==', key), f.where('status', '==', 'open')));
    var out = [];
    snap.forEach(function (d) { var x = d.data(); x.id = d.id; out.push(x); });
    out.sort(function (a, b) { return (a.unitPrice - b.unitPrice) || (a.createdAt - b.createdAt); });
    return out.slice(0, 60);
  }

  async function myListings() {
    var bad = notReady(); if (bad) throw new Error(bad);
    var f = F();
    var snap = await f.getDocs(f.query(f.collection(f.db, COL), f.where('sellerUid', '==', uid()), f.where('claimed', '==', false)));
    var out = [];
    snap.forEach(function (d) { var x = d.data(); x.id = d.id; out.push(x); });
    out.sort(function (a, b) { return b.createdAt - a.createdAt; });
    return out;
  }

  async function buy(id) {
    var bad = notReady(); if (bad) throw new Error(bad);
    var f = F();
    var S = loadState();
    if (S.daily.buy >= DAILY_BUY) throw new Error('오늘 구매 가능 횟수(' + DAILY_BUY + '번)를 다 썼어요');
    var ref = f.doc(f.db, COL, id);
    var snap0 = await f.getDoc(ref);
    if (!snap0.exists() || snap0.data().status !== 'open') throw new Error('gone');
    var d0 = snap0.data();
    if (d0.sellerUid === uid()) throw new Error('mine');
    if (coins < d0.total) throw new Error('코인이 부족해요 (🍔 ' + fmt(d0.total) + ' 필요)');
    if (!canReceive(d0.item)) throw new Error('가방이 꽉 찼어요! 🎒 슬롯을 확장해주세요');

    var sold = await f.runTransaction(f.db, async function (tx) {
      var s = await tx.get(ref);
      if (!s.exists() || s.data().status !== 'open') throw new Error('gone');
      var d = s.data();
      if (d.sellerUid === uid()) throw new Error('mine');
      tx.update(ref, { status: 'sold', buyerUid: uid(), buyerNick: myNick(), soldAt: Date.now(), delivered: false });
      return d;
    });
    var S2 = loadState(); S2.daily.buy += 1; saveState(S2);
    await deliverOne(id, sold);
    return sold;
  }

  async function cancel(id) {
    var bad = notReady(); if (bad) throw new Error(bad);
    var f = F();
    var ref = f.doc(f.db, COL, id);
    await f.runTransaction(f.db, async function (tx) {
      var s = await tx.get(ref);
      if (!s.exists() || s.data().status !== 'open') throw new Error('gone');
      if (s.data().sellerUid !== uid()) throw new Error('mine');
      tx.update(ref, { status: 'cancelled' });
    });
    await settleMine();                            // 재료 바로 돌려받기
  }

  // 구매한 재료를 내 기기에 넣고(코인 차감) 서버에 "받았음" 표시
  async function deliverOne(id, x) {
    var S = loadState();
    if (S.received.indexOf(id) === -1) {
      if (!canReceive(x.item)) { toast('가방이 꽉 찼어요! 🎒 자리를 만들면 자동으로 받아져요'); return false; }
      addCoins(-x.total);
      give(x.item, x.qty);
      S.received.push(id);
      addLog(S, '🛒 ' + ITEMS[x.item].name + ' x' + x.qty + ' 구매  🍔-' + fmt(x.total));
      saveState(S); persist();
      toast('🛒 ' + ITEMS[x.item].emoji + ' ' + ITEMS[x.item].name + ' x' + x.qty + ' 구매! 🍔-' + fmt(x.total));
    }
    try { await markFlag(id, 'delivered'); } catch (e) {}
    return true;
  }

  async function markFlag(id, field) {
    var f = F(); var ref = f.doc(f.db, COL, id);
    await f.runTransaction(f.db, async function (tx) {
      var s = await tx.get(ref);
      if (!s.exists() || s.data()[field] === true) return;
      var patch = {}; patch[field] = true;
      tx.update(ref, patch);
    });
  }

  // 판매 대금 / 취소된 재료 정산
  var hasOpenListings = false;
  async function settleMine() {
    if (notReady()) return;
    var f = F();
    var snap = await f.getDocs(f.query(f.collection(f.db, COL), f.where('sellerUid', '==', uid()), f.where('claimed', '==', false)));
    var docs = []; snap.forEach(function (d) { docs.push({ id: d.id, x: d.data() }); });
    var open = false, gotCoins = 0;
    for (var i = 0; i < docs.length; i++) {
      var id = docs[i].id, x = docs[i].x;
      if (x.status === 'open') { open = true; continue; }
      var S = loadState();
      if (S.credited.indexOf(id) === -1) {
        if (x.status === 'sold') {
          var gain = Math.floor(x.total * (1 - FEE));
          addCoins(gain);
          S.credited.push(id);
          addLog(S, '💰 ' + (ITEMS[x.item] ? ITEMS[x.item].name : x.item) + ' x' + x.qty + ' 판매  🍔+' + fmt(gain) + ' (수수료 ' + fmt(x.total - gain) + ')');
          saveState(S); persist();
          gotCoins += gain;
        } else if (x.status === 'cancelled') {
          if (!canReceive(x.item)) { toast('가방이 꽉 찼어요! 취소한 재료는 자리가 나면 돌려받아요'); continue; }
          give(x.item, x.qty);
          S.credited.push(id);
          addLog(S, '↩️ ' + ITEMS[x.item].name + ' x' + x.qty + ' 등록 취소 · 돌려받음');
          saveState(S); persist();
          toast('↩️ ' + ITEMS[x.item].emoji + ' ' + ITEMS[x.item].name + ' x' + x.qty + ' 돌려받았어요');
        } else continue;
      }
      try { await markFlag(id, 'claimed'); } catch (e) {}
    }
    hasOpenListings = open;
    if (gotCoins > 0) toast('🏪 판매 완료! 🍔+' + fmt(gotCoins) + ' (수수료 ' + Math.round(FEE * 100) + '% 제외)');
  }

  // 아직 못 받은 구매분 + 등록 도중 꺼진 경우 복구
  async function settleBuys() {
    if (notReady()) return;
    var f = F();
    var snap = await f.getDocs(f.query(f.collection(f.db, COL), f.where('buyerUid', '==', uid()), f.where('delivered', '==', false)));
    var docs = []; snap.forEach(function (d) { docs.push({ id: d.id, x: d.data() }); });
    for (var i = 0; i < docs.length; i++) { if (docs[i].x.status === 'sold') await deliverOne(docs[i].id, docs[i].x); }
  }
  async function recoverPendingList() {
    if (notReady()) return;
    var S = loadState(); var p = S.pendingList;
    if (!p) return;
    var f = F();
    try {
      var snap = await f.getDoc(f.doc(f.db, COL, p.id));
      if (!snap.exists()) give(p.key, p.qty);          // 서버에 안 올라갔으면 재료 되돌려줌
      var S2 = loadState(); S2.pendingList = null; saveState(S2); persist();
    } catch (e) {}
  }
  async function settleAll() {
    try { await recoverPendingList(); await settleBuys(); await settleMine(); } catch (e) { try { console.warn('trade settle', e); } catch (e2) {} }
  }

  // ───────── 화면 ─────────
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var BTN = 'border:none;border-radius:12px;font-weight:900;cursor:pointer;' + FONT;
  var ACC = '#34D399';
  var tab = 'buy', pick = 'recomb', sellKey = 'recomb', busy = false, cat = 'item';
  function keysOf() { return cat === 'mat' && MAT_ORDER.length ? MAT_ORDER : ORDER; }
  function catBar(ov, redraw) {
    if (!MAT_ORDER.length) return '';
    function b(id, label) {
      var on = cat === id;
      return '<button data-cat="' + id + '" style="flex:1;' + BTN + 'padding:8px;font-size:13px;color:#fff;background:' + (on ? 'linear-gradient(135deg,#FFD700,#F59E0B)' : 'rgba(255,255,255,0.08)') + ';' + (on ? 'color:#1a1405;' : '') + '">' + label + '</button>';
    }
    return '<div style="display:flex;gap:8px;margin-bottom:10px;">' + b('item', '🔹 재료·아이템') + b('mat', '🌿 탐험 재료') + '</div>';
  }
  function bindCat(box, redraw) {
    box.querySelectorAll('[data-cat]').forEach(function (b) {
      b.onclick = function () { cat = b.getAttribute('data-cat'); pick = sellKey = keysOf()[0]; redraw(); };
    });
  }

  function openTrade() {
    var old = document.getElementById('trade-overlay'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'trade-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:955;background:linear-gradient(180deg,#06231a,#050a10);overflow-y:auto;' + FONT;
    document.body.appendChild(ov);
    draw(ov);
    settleAll().then(function () { if (document.getElementById('trade-overlay')) draw(); });
  }

  function chip(k, on, attr) {
    var it = ITEMS[k];
    return '<button ' + attr + '="' + k + '" style="' + BTN + 'padding:7px 10px;font-size:12px;background:' + (on ? 'linear-gradient(135deg,#34D399,#60A5FA)' : 'rgba(255,255,255,0.1)') + ';color:#fff;">' + it.emoji + ' ' + it.name + '</button>';
  }
  function tabBtn(id, label) {
    var on = tab === id;
    return '<button data-tab="' + id + '" style="flex:1;' + BTN + 'padding:10px;font-size:14px;color:#fff;background:' + (on ? 'linear-gradient(135deg,#34D399,#60A5FA)' : 'rgba(255,255,255,0.1)') + ';">' + label + '</button>';
  }

  function draw(ov) {
    ov = ov || document.getElementById('trade-overlay'); if (!ov) return;
    var bad = notReady();
    var S = loadState();
    var head = '<div style="position:sticky;top:0;z-index:2;background:rgba(5,10,16,0.95);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;">' +
      '<div style="color:#fff;font-size:17px;font-weight:900;">🏪 거래소</div>' +
      '<div style="display:flex;gap:8px;align-items:center;"><span style="color:#FFD700;font-size:13px;font-weight:900;">🍔 ' + fmt(coins) + '</span>' +
      '<button id="tr-close" style="' + BTN + 'background:rgba(255,255,255,0.12);color:#fff;padding:7px 12px;">닫기</button></div></div>';
    if (bad) {
      ov.innerHTML = head + '<div style="padding:40px 20px;text-align:center;color:#ff8a8a;font-size:14px;line-height:1.7;">' + esc(bad) + '</div>';
      ov.querySelector('#tr-close').onclick = function () { ov.remove(); };
      return;
    }
    var body = '<div style="padding:0 16px 40px;"><div style="display:flex;gap:8px;margin-bottom:10px;">' + tabBtn('buy', '🛒 사기') + tabBtn('sell', '💰 팔기') + tabBtn('mine', '📋 내 등록') + '</div>' +
      '<div style="font-size:11px;color:#8aa;line-height:1.6;margin-bottom:10px;">코인으로만 거래해요 · 판매 수수료 ' + Math.round(FEE * 100) + '% · 오늘 등록 ' + S.daily.list + '/' + DAILY_LIST + ' · 구매 ' + S.daily.buy + '/' + DAILY_BUY + '</div>' +
      '<div id="tr-body"><div style="color:#aaa;text-align:center;padding:30px 0;">불러오는 중...</div></div></div>';
    ov.innerHTML = head + body;
    ov.querySelector('#tr-close').onclick = function () { ov.remove(); };
    ov.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { tab = b.getAttribute('data-tab'); draw(ov); }; });
    if (tab === 'buy') drawBuy(ov);
    else if (tab === 'sell') drawSell(ov);
    else drawMine(ov);
  }

  async function drawBuy(ov) {
    var box = ov.querySelector('#tr-body'); if (!box) return;
    if (keysOf().indexOf(pick) === -1) pick = keysOf()[0];
    var chips = catBar() + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">' + keysOf().map(function (k) { return chip(k, pick === k, 'data-pick'); }).join('') + '</div>';
    box.innerHTML = chips + '<div id="tr-list" style="color:#aaa;text-align:center;padding:24px 0;">불러오는 중...</div>';
    bindCat(box, function () { drawBuy(ov); });
    box.querySelectorAll('[data-pick]').forEach(function (b) { b.onclick = function () { pick = b.getAttribute('data-pick'); drawBuy(ov); }; });
    var rows;
    try { rows = await listOpen(pick); } catch (e) { var l0 = box.querySelector('#tr-list'); if (l0) l0.innerHTML = '<span style="color:#ff8a8a;">' + esc(errText(e)) + '</span>'; return; }
    var list = box.querySelector('#tr-list'); if (!list) return;
    if (!rows.length) { list.innerHTML = '올라온 ' + ITEMS[pick].name + '이(가) 없어요'; return; }
    var it = ITEMS[pick];
    list.style.cssText = '';
    list.innerHTML = rows.map(function (x) {
      var mineRow = x.sellerUid === uid();
      return '<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:10px;margin-bottom:8px;">' +
        '<div style="font-size:26px;">' + it.emoji + '</div><div style="flex:1;min-width:0;">' +
        '<div style="font-size:13px;font-weight:900;color:#fff;">' + it.name + ' x' + x.qty + '</div>' +
        '<div style="font-size:11px;color:#9ab;">개당 🍔' + fmt(x.unitPrice) + ' · 판매자 ' + esc(x.sellerNick || '익명') + '</div></div>' +
        '<button data-buy="' + x.id + '" data-total="' + x.total + '" ' + (mineRow ? 'disabled' : '') + ' style="' + BTN + 'padding:9px 12px;font-size:12px;background:' + (mineRow ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#FFD700,#F59E0B)') + ';color:' + (mineRow ? '#777' : '#1a1a2e') + ';">' + (mineRow ? '내 물건' : '🍔 ' + fmt(x.total)) + '</button></div>';
    }).join('');
    list.querySelectorAll('[data-buy]').forEach(function (b) {
      b.onclick = async function () {
        if (busy) return;
        var total = Number(b.getAttribute('data-total'));
        if (!confirm(it.name + ' 구매할까요?\n🍔 ' + fmt(total) + ' 코인')) return;
        busy = true;
        try { await buy(b.getAttribute('data-buy')); } catch (e) { toast('❌ ' + errText(e)); }
        busy = false;
        draw();
      };
    });
  }

  function drawSell(ov) {
    var box = ov.querySelector('#tr-body'); if (!box) return;
    if (keysOf().indexOf(sellKey) === -1) sellKey = keysOf()[0];
    var it = ITEMS[sellKey];
    box.innerHTML = catBar() + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">' + keysOf().map(function (k) { return chip(k, sellKey === k, 'data-sk'); }).join('') + '</div>' +
      '<div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:12px;">' +
      '<div style="font-size:13px;color:#fff;font-weight:900;margin-bottom:8px;">' + it.emoji + ' ' + it.name + ' <span style="color:#9ab;font-weight:400;">보유 ' + fmt(have(sellKey)) + '개</span></div>' +
      '<label style="font-size:11px;color:#9ab;">수량 (1~' + MAX_QTY + ')</label>' +
      '<input id="tr-qty" type="number" inputmode="numeric" value="1" min="1" max="' + MAX_QTY + '" style="width:100%;padding:10px;border-radius:10px;border:none;margin:4px 0 10px;font-size:15px;">' +
      '<label style="font-size:11px;color:#9ab;">개당 가격 (' + fmt(it.min) + '~' + fmt(it.max) + ' 코인)</label>' +
      '<input id="tr-price" type="number" inputmode="numeric" value="' + it.min + '" style="width:100%;padding:10px;border-radius:10px;border:none;margin:4px 0 8px;font-size:15px;">' +
      '<div id="tr-sum" style="font-size:12px;color:#FFD700;margin-bottom:6px;"></div>' +
      '<div id="tr-err" style="font-size:12px;color:#ff8a8a;min-height:16px;margin-bottom:6px;"></div>' +
      '<button id="tr-list-go" style="' + BTN + 'width:100%;padding:13px;background:linear-gradient(135deg,#34D399,#60A5FA);color:#fff;font-size:15px;">거래소에 등록</button>' +
      '<div style="font-size:11px;color:#8aa;line-height:1.6;margin-top:8px;">등록하면 재료가 먼저 빠져요. 안 팔리면 [내 등록]에서 취소하고 돌려받을 수 있어요.</div></div>';
    bindCat(box, function () { drawSell(ov); });
    box.querySelectorAll('[data-sk]').forEach(function (b) { b.onclick = function () { sellKey = b.getAttribute('data-sk'); drawSell(ov); }; });
    var qEl = box.querySelector('#tr-qty'), pEl = box.querySelector('#tr-price'), sEl = box.querySelector('#tr-sum');
    function sum() {
      var q = parseInt(qEl.value, 10) || 0, p = parseInt(pEl.value, 10) || 0;
      sEl.textContent = '총 🍔 ' + fmt(q * p) + ' → 수수료 제외 받는 코인 🍔 ' + fmt(Math.floor(q * p * (1 - FEE)));
    }
    qEl.oninput = sum; pEl.oninput = sum; sum();
    box.querySelector('#tr-list-go').onclick = async function () {
      if (busy) return;
      var q = parseInt(qEl.value, 10), p = parseInt(pEl.value, 10);
      busy = true;
      try { await listItem(sellKey, q, p); toast('🏪 ' + it.name + ' x' + q + ' 등록 완료!'); tab = 'mine'; }
      catch (e) {
        // 실패하면 입력한 수량/가격을 그대로 두고 이유만 알려줌 (화면을 다시 그리면 가격이 최저가로 돌아가 버림)
        toast('❌ ' + errText(e));
        var msg = box.querySelector('#tr-err'); if (msg) msg.textContent = errText(e);
        busy = false;
        return;
      }
      busy = false;
      draw();
    };
  }

  function timeText(t) {
    var d = new Date(t);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  async function drawMine(ov) {
    var box = ov.querySelector('#tr-body'); if (!box) return;
    var rows;
    try { await settleAll(); rows = await myListings(); } catch (e) { box.innerHTML = '<div style="color:#ff8a8a;text-align:center;padding:24px 0;">' + esc(errText(e)) + '</div>'; return; }
    box = ov.querySelector('#tr-body'); if (!box) return;

    var head = '<button id="tr-settle" style="' + BTN + 'width:100%;padding:13px;margin-bottom:12px;font-size:14px;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#1a1a2e;">💰 정산하기 <span style="font-size:11px;font-weight:400;">(판매 대금 · 구매 물품 받기)</span></button>';
    var list = rows.length ? rows.map(function (x) {
      var it = ITEMS[x.item] || { name: x.item, emoji: '📦' };
      var st = x.status === 'open' ? '<button data-cancel="' + x.id + '" style="' + BTN + 'padding:8px 12px;font-size:12px;background:rgba(239,68,68,0.2);color:#ff8a8a;">취소</button>' : '<span style="font-size:11px;color:#34D399;">정산 대기</span>';
      return '<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:10px;margin-bottom:8px;">' +
        '<div style="font-size:26px;">' + it.emoji + '</div><div style="flex:1;min-width:0;">' +
        '<div style="font-size:13px;font-weight:900;color:#fff;">' + it.name + ' x' + x.qty + '</div>' +
        '<div style="font-size:11px;color:#9ab;">개당 🍔' + fmt(x.unitPrice) + ' · 총 🍔' + fmt(x.total) + ' · ' + (x.status === 'open' ? '판매 중' : (x.status === 'sold' ? '팔렸어요! 받을 코인 🍔' + fmt(Math.floor(x.total * (1 - FEE))) : '취소됨')) + '</div></div>' + st + '</div>';
    }).join('') : '<div style="color:#aaa;text-align:center;padding:22px 0;">등록한 물건이 없어요</div>';

    var log = loadState().log.slice(-8).reverse();
    var logHtml = '<div style="font-size:12px;font-weight:900;color:#9ab;margin:16px 0 6px;">📜 최근 거래 내역</div>' +
      (log.length ? log.map(function (l) {
        return '<div style="font-size:12px;color:#ddd;padding:6px 0;border-top:1px solid rgba(255,255,255,0.08);">' + esc(l.m) + ' <span style="color:#778;font-size:10px;">' + timeText(l.t) + '</span></div>';
      }).join('') : '<div style="font-size:12px;color:#667;">아직 거래 내역이 없어요</div>');

    box.innerHTML = head + list + logHtml;
    box.querySelectorAll('[data-cancel]').forEach(function (b) {
      b.onclick = async function () {
        if (busy) return; busy = true;
        try { await cancel(b.getAttribute('data-cancel')); } catch (e) { toast('❌ ' + errText(e)); }
        busy = false; draw();
      };
    });
    var sb = box.querySelector('#tr-settle');
    if (sb) sb.onclick = async function () {
      if (busy) return; busy = true;
      var before = loadState().log.length;
      try { await settleAll(); } catch (e) { toast('❌ ' + errText(e)); busy = false; return; }
      var n = loadState().log.length - before;
      if (n <= 0) toast('정산할 내역이 없어요');
      busy = false; draw();
    };
  }

  window.openTrade = openTrade;
  window.__tradeTest = { listItem: listItem, listOpen: listOpen, myListings: myListings, buy: buy, cancel: cancel, settleAll: settleAll, settleMine: settleMine, settleBuys: settleBuys, loadState: loadState, have: have, ITEMS: ITEMS, FEE: FEE };

  // ───────── 기존 화면에 연결 ─────────
  function whenReady(test, fn) {
    var tries = 0;
    (function attempt() {
      var ok = false;
      try { ok = test(); } catch (e) {}
      if (ok) { fn(); return; }
      if (++tries < 200) setTimeout(attempt, 100);
    })();
  }

  // 더보기 메뉴에 🏪 거래소 타일
  whenReady(function () { return typeof window.openMoreMenu === 'function' && typeof window.moreMenuTileHtml === 'function'; }, function () {
    var original = window.openMoreMenu;
    if (original.__tradeWrapped) return;
    var wrapped = function () {
      var r = original.apply(this, arguments);
      var grid = document.getElementById('more-menu-grid');
      if (grid && !document.getElementById('more-trade-tile')) {
        grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('🏪', '거래소', ACC, 'openTrade()'));
        if (grid.lastElementChild) grid.lastElementChild.id = 'more-trade-tile';
      }
      return r;
    };
    wrapped.__tradeWrapped = true;
    window.openMoreMenu = wrapped;
  });

  // 로그인 상태가 되면 한 번 정산 (판매 대금 / 못 받은 구매분 / 등록 복구)
  var startTries = 0;
  (function boot() {
    if (!notReady()) { settleAll(); return; }
    if (++startTries < 120) setTimeout(boot, 1000);
  })();
  // 내 등록이 남아 있는 동안만 5분마다 판매 대금 확인 (서버 읽기 횟수 절약)
  setInterval(function () {
    if (document.hidden || !hasOpenListings || notReady()) return;
    settleMine().catch(function () {});
  }, 5 * 60 * 1000);
})();
