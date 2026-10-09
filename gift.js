// ════════════════════════════════
// 🎁 친구에게 선물하기 (gift.js) — 카드는 못 보냄 (재료·강화 재료·스킬북·간식·코인만)
// 친구 목록(더보기 → 친구)의 각 친구 옆 "🎁 선물" 버튼 → 보낼 물건·수량 고르기 → 내 가방에서 바로 빠짐
// 받는 친구는 게임을 켜면(또는 5분마다) 자동으로 받음. 가방이 꽉 차 있으면 자리가 날 때까지 서버에서 기다림.
// 안전장치: 로그인 필수 · 친구끼리만 · 하루 보내기 횟수 · 코인 수수료 · 중복 지급 방지(서버에서 한 번만 받음)
// 서버: Firestore 'gifts' 컬렉션 (규칙은 GIFT_RULES.txt 를 Firebase 콘솔 rules 에 추가해야 동작)
// 저장: localStorage 'ph_gift' (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// trade.js 의 품목·가방 도우미(window.__tradeCore)를 같이 쓴다 → loader.js 에서 trade.js 뒤에 둘 것
// ════════════════════════════════
(function () {
  'use strict';

  // ───────── ⚙️ 설정 (규칙 파일의 한도와 같이 맞출 것) ─────────
  var COL = 'gifts';
  var DAILY_SEND = 10;            // 하루에 보낼 수 있는 선물 횟수
  var MAX_QTY = 99;               // 물건 1번에 보낼 수 있는 개수
  var COIN_MIN = 10000, COIN_MAX = 10000000;   // 코인 1번 보낼 수 있는 범위
  var COIN_DAILY = 30000000;      // 하루에 보낼 수 있는 코인 합계
  var COIN_FEE = 0.05;            // 코인 선물 수수료 (받는 사람이 95%만 받음 → 5%는 사라짐)
  var STATE_KEY = 'ph_gift';
  var ACC = '#FFD700';
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var COIN = { name: '코인', emoji: '🍔' };

  function core() { return window.__tradeCore || null; }
  function fmt(n) { return Number(n).toLocaleString(); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }
  function toast(m) {
    try {
      var old = document.getElementById('gift-toast'); if (old) old.remove();
      var el = document.createElement('div');
      el.id = 'gift-toast';
      el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(26,26,46,0.97);border:1.5px solid ' + ACC + ';color:#fff;padding:11px 20px;border-radius:20px;font-size:13px;font-weight:800;z-index:9990;max-width:88vw;text-align:center;' + FONT;
      el.textContent = m;
      document.body.appendChild(el);
      setTimeout(function () { if (el.parentNode) el.remove(); }, 3800);
    } catch (e) { try { if (typeof showBagToast === 'function') showBagToast(m); } catch (e2) {} }
  }
  function nameOf(key) { if (key === 'coin') return COIN.name; var C = core(); return C && C.ITEMS[key] ? C.ITEMS[key].name : key; }
  function iconOf(key, px) {                                // 화면용: 탐험 재료는 그림, 나머지는 이모지(emoji-skin 이 그림으로 바꿔줌)
    if (key.indexOf('mat_') === 0) {
      var e = emojiOf(key);
      try { if (typeof window.matIcon === 'function') return window.matIcon(nameOf(key), px || 20, e) || e; } catch (x) {}
    }
    if (key.indexOf('bk_sweet_') === 0) {                    // 디저트 공방 간식 → meal-assets/sweets/<id>.png (없으면 이모지)
      var px2 = px || 20, em = emojiOf(key);
      return '<span style="position:relative;display:inline-block;width:' + px2 + 'px;height:' + px2 + 'px;font-size:' + Math.round(px2 * 0.8) + 'px;line-height:' + px2 + 'px;text-align:center;vertical-align:middle;">' + em +
        '<img src="meal-assets/sweets/' + esc(key.slice(9)) + '.png" alt="" loading="lazy" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:transparent;" onload="var p=this.parentNode;if(p&&p.firstChild&&p.firstChild.nodeType===3)p.firstChild.nodeValue=\'\';" onerror="this.remove()"></span>';
    }
    return emojiOf(key);
  }
  function emojiOf(key) { if (key === 'coin') return COIN.emoji; var C = core(); return C && C.ITEMS[key] ? C.ITEMS[key].emoji : '🎁'; }

  function notReady() {
    var C = core(); if (!C) return '선물 기능을 준비하는 중이에요';
    if (!C.uid()) return '로그인한 계정에서만 선물할 수 있어요 (☁️ 계정에서 로그인)';
    var f = C.F();
    if (!window.pocaFirebaseReady || !f || !f.db) return '서버 연결을 기다리는 중이에요. 잠시 후 다시 해주세요';
    var need = ['collection', 'doc', 'getDoc', 'getDocs', 'query', 'where', 'runTransaction'];
    var miss = need.filter(function (k) { return typeof f[k] !== 'function'; });
    if (miss.length) return '선물에 필요한 서버 기능이 빠져 있어요: ' + miss.join(', ');
    return null;
  }

  // ───────── 로컬 기록 ─────────
  function loadState() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    var t = core() ? core().today() : '';
    if (!s.daily || s.daily.date !== t) s.daily = { date: t, n: 0, coin: 0 };
    if (!s.pendingSend) s.pendingSend = null;                 // 보내는 도중 앱이 꺼졌을 때 복구용
    if (!s.pending || typeof s.pending !== 'object') s.pending = {};   // 받는 도중 앱이 꺼졌을 때 복구용 { id: {item, qty, from} }
    if (!Array.isArray(s.received)) s.received = [];
    if (!Array.isArray(s.log)) s.log = [];
    return s;
  }
  function saveState(s) {
    if (s.log.length > 40) s.log = s.log.slice(-30);
    if (s.received.length > 200) s.received = s.received.slice(-150);
    try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function addLog(s, m) { s.log.push({ t: Date.now(), m: m }); }

  // ───────── 보유량 / 가감 (코인은 따로) ─────────
  function haveOf(key) {
    if (key === 'coin') { try { return Math.max(0, Math.floor(coins)); } catch (e) { return 0; } }
    return core().have(key);
  }
  function takeOf(key, qty) {
    if (key === 'coin') { if (haveOf('coin') < qty) return false; core().addCoins(-qty); return true; }
    return core().take(key, qty);
  }
  function giveOf(key, qty) {
    if (key === 'coin') { core().addCoins(qty); return true; }
    return core().give(key, qty);
  }
  function limitsOf(key) { return key === 'coin' ? { min: COIN_MIN, max: COIN_MAX } : { min: 1, max: MAX_QTY }; }

  // ───────── 보내기 ─────────
  async function sendGift(toUid, toNick, key, qty) {
    var bad = notReady(); if (bad) throw new Error(bad);
    var C = core();
    if (!toUid || toUid === C.uid()) throw new Error('보낼 친구를 다시 골라주세요');
    if (key !== 'coin' && !C.ITEMS[key]) throw new Error('보낼 수 없는 물건이에요');
    var L = limitsOf(key);
    if (!isInt(qty) || qty < L.min || qty > L.max) throw new Error((key === 'coin' ? '코인은 ' + fmt(L.min) + '~' + fmt(L.max) + '개씩' : '수량은 1~' + L.max + ' 사이로') + ' 보낼 수 있어요');
    var S = loadState();
    if (S.daily.n >= DAILY_SEND) throw new Error('오늘 선물 가능 횟수(' + DAILY_SEND + '번)를 다 썼어요');
    if (key === 'coin' && S.daily.coin + qty > COIN_DAILY) throw new Error('오늘 보낼 수 있는 코인은 ' + fmt(Math.max(0, COIN_DAILY - S.daily.coin)) + '개 남았어요');
    if (haveOf(key) < qty) throw new Error(nameOf(key) + '이(가) 부족해요');

    var f = C.F();
    var ref = f.doc(f.collection(f.db, COL));
    var data = { fromUid: C.uid(), fromNick: C.myNick(), toUid: toUid, toNick: String(toNick || ''), item: key, qty: qty, status: 'sent', createdAt: Date.now() };
    if (!takeOf(key, qty)) throw new Error(nameOf(key) + '을(를) 꺼내지 못했어요');
    S.pendingSend = { id: ref.id, key: key, qty: qty };
    saveState(S); C.persist();
    try {
      await f.runTransaction(f.db, async function (tx) { tx.set(ref, data); });
    } catch (e) {
      giveOf(key, qty);
      var S2 = loadState(); S2.pendingSend = null; saveState(S2); C.persist();
      throw e;
    }
    var S3 = loadState(); S3.pendingSend = null; S3.daily.n += 1; if (key === 'coin') S3.daily.coin += qty;
    addLog(S3, '🎁 ' + (toNick || '친구') + '에게 ' + nameOf(key) + ' x' + fmt(qty) + ' 선물');
    saveState(S3); C.persist();
    return ref.id;
  }

  // 보내는 도중 꺼졌다면: 서버에 안 올라갔으면 물건을 돌려줌
  async function recoverPendingSend() {
    if (notReady()) return;
    var S = loadState(), p = S.pendingSend; if (!p) return;
    var f = core().F();
    try {
      var snap = await f.getDoc(f.doc(f.db, COL, p.id));
      if (!snap.exists()) giveOf(p.key, p.qty);
      var S2 = loadState(); S2.pendingSend = null; saveState(S2); core().persist();
    } catch (e) {}
  }

  // ───────── 받기 ─────────
  function gotAmount(x) { return x.item === 'coin' ? Math.floor(x.qty * (1 - COIN_FEE)) : x.qty; }
  function finishReceive(id, x) {
    var S = loadState();
    if (S.received.indexOf(id) !== -1) { delete S.pending[id]; saveState(S); return; }
    var n = gotAmount(x);
    giveOf(x.item, n);
    S.received.push(id); delete S.pending[id];
    addLog(S, '🎁 ' + (x.fromNick || '친구') + '님이 ' + nameOf(x.item) + ' x' + fmt(n) + ' 선물');
    saveState(S); core().persist();
    toast('🎁 ' + (x.fromNick || '친구') + '님의 선물! ' + (x.item.indexOf('mat_') === 0 || x.item.indexOf('bk_sweet_') === 0 ? '' : emojiOf(x.item) + ' ') + nameOf(x.item) + ' x' + fmt(n));
  }
  async function receiveAll() {
    if (notReady()) return 0;
    var C = core(), f = C.F(), got = 0;
    // 1) 받다가 꺼진 것 복구: 서버에서 이미 '받음'이면 지급
    var S0 = loadState();
    for (var pid in S0.pending) {
      try {
        var ps = await f.getDoc(f.doc(f.db, COL, pid));
        if (ps.exists() && ps.data().status === 'received' && ps.data().toUid === C.uid()) { finishReceive(pid, S0.pending[pid]); got++; }
        else { var Sx = loadState(); delete Sx.pending[pid]; saveState(Sx); }
      } catch (e) {}
    }
    // 2) 새로 온 선물
    var snap = await f.getDocs(f.query(f.collection(f.db, COL), f.where('toUid', '==', C.uid()), f.where('status', '==', 'sent')));
    var docs = []; snap.forEach(function (d) { docs.push({ id: d.id, x: d.data() }); });
    docs.sort(function (a, b) { return (a.x.createdAt || 0) - (b.x.createdAt || 0); });
    var full = false;
    for (var i = 0; i < docs.length; i++) {
      var id = docs[i].id, x = docs[i].x;
      if (x.item !== 'coin' && !C.ITEMS[x.item]) continue;
      if (loadState().received.indexOf(id) !== -1) continue;
      if (x.item !== 'coin' && !C.canReceive(x.item)) { full = true; continue; }
      var S = loadState(); S.pending[id] = { item: x.item, qty: x.qty, fromNick: x.fromNick }; saveState(S);
      var ref = f.doc(f.db, COL, id), ok = false;
      try {
        ok = await f.runTransaction(f.db, async function (tx) {
          var s = await tx.get(ref);
          if (!s.exists() || s.data().status !== 'sent' || s.data().toUid !== C.uid()) return false;
          tx.update(ref, { status: 'received', receivedAt: Date.now() });
          return true;
        });
      } catch (e) { ok = false; }
      if (ok) { finishReceive(id, x); got++; }
      else { var S2 = loadState(); delete S2.pending[id]; saveState(S2); }
    }
    if (full) toast('🎒 가방이 꽉 차서 못 받은 선물이 있어요. 자리를 만들면 자동으로 받아져요');
    return got;
  }

  // ───────── 화면: 선물 보내기 ─────────
  function sendableKeys() {
    var C = core(), keys = ['coin'];
    C.ORDER.concat(C.MAT_ORDER || []).forEach(function (k) { if (keys.indexOf(k) === -1 && C.ITEMS[k] && C.have(k) > 0) keys.push(k); });
    return keys;
  }
  function openGiftTo(toUid, toNick) {
    var bad = notReady(); if (bad) { toast(bad); return; }
    var old = document.getElementById('gift-overlay'); if (old) old.remove();
    var S = loadState();
    var ov = document.createElement('div');
    ov.id = 'gift-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:985;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:14px;' + FONT;
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    function chip(k) {
      return '<button data-k="' + esc(k) + '" style="border:1.5px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.06);color:#fff;border-radius:12px;padding:9px 11px;font-size:12px;font-weight:900;cursor:pointer;' + FONT + '">' +
        iconOf(k, 20) + ' ' + esc(nameOf(k)) + ' <span style="color:#aab4d6;font-weight:700;">' + (k === 'coin' ? fmt(haveOf(k)) : fmt(haveOf(k))) + '</span></button>';
    }
    ov.innerHTML = '<div style="background:#1a1233;border:1.5px solid ' + ACC + ';border-radius:18px;width:100%;max-width:380px;max-height:88vh;display:flex;flex-direction:column;">' +
      '<div style="padding:14px 16px 6px;display:flex;align-items:center;"><div style="font-size:16px;font-weight:900;color:#FFE27A;">🎁 ' + esc(toNick) + '에게 선물</div>' +
      '<button id="gf-x" style="margin-left:auto;border:none;border-radius:10px;background:rgba(255,255,255,0.1);color:#fff;padding:6px 12px;font-size:12px;font-weight:900;cursor:pointer;' + FONT + '">닫기</button></div>' +
      '<div style="padding:0 16px 8px;font-size:11px;color:#aab4d6;line-height:1.5;">보낼 물건을 누르면 개수를 정할 수 있어요. 카드는 보낼 수 없어요. 오늘 남은 선물 ' + (DAILY_SEND - S.daily.n) + '번</div>' +
      '<div style="padding:0 16px 16px;overflow-y:auto;"><div style="display:flex;flex-wrap:wrap;gap:6px;">' + sendableKeys().map(chip).join('') + '</div></div></div>';
    ov.querySelector('#gf-x').onclick = function () { ov.remove(); };
    Array.prototype.forEach.call(ov.querySelectorAll('[data-k]'), function (b) { b.onclick = function () { openQty(toUid, toNick, b.getAttribute('data-k'), ov); }; });
    document.body.appendChild(ov);
  }

  // 개수 정하는 팝업 (슬라이더 + −/+ + 최대 + 직접 입력)
  function openQty(toUid, toNick, key, parent) {
    var old = document.getElementById('gift-qty'); if (old) old.remove();
    var L = limitsOf(key), have = haveOf(key), max = Math.min(L.max, have);
    if (max < L.min) { toast(nameOf(key) + '이(가) 부족해요'); return; }
    var step = key === 'coin' ? 10000 : 1, qty = L.min;
    var q = document.createElement('div');
    q.id = 'gift-qty';
    q.style.cssText = 'position:fixed;inset:0;z-index:990;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:14px;' + FONT;
    q.onclick = function (e) { if (e.target === q) q.remove(); };
    q.innerHTML = '<div style="background:#241945;border:1.5px solid ' + ACC + ';border-radius:18px;width:100%;max-width:340px;padding:16px;text-align:center;">' +
      '<div style="font-size:30px;">' + iconOf(key, 40) + '</div>' +
      '<div style="font-size:15px;font-weight:900;color:#fff;margin:2px 0;">' + esc(nameOf(key)) + ' 몇 개 보낼까요?</div>' +
      '<div style="font-size:11px;color:#aab4d6;margin-bottom:10px;">보유 ' + fmt(have) + (key === 'coin' ? ' · 수수료 ' + Math.round(COIN_FEE * 100) + '%' : '') + '</div>' +
      '<div style="font-size:24px;font-weight:900;color:#FFE27A;"><span id="gq-n"></span></div>' +
      '<div id="gq-recv" style="font-size:11px;color:#aab4d6;min-height:15px;margin-bottom:6px;"></div>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<button id="gq-m" style="border:none;border-radius:10px;width:36px;height:36px;background:rgba(255,255,255,0.12);color:#fff;font-size:18px;font-weight:900;cursor:pointer;">−</button>' +
        '<input id="gq-r" type="range" min="' + L.min + '" max="' + max + '" step="' + step + '" value="' + L.min + '" style="flex:1;min-width:0;accent-color:#FFD700;">' +
        '<button id="gq-p" style="border:none;border-radius:10px;width:36px;height:36px;background:rgba(255,255,255,0.12);color:#fff;font-size:18px;font-weight:900;cursor:pointer;">+</button>' +
        '<button id="gq-max" style="border:none;border-radius:10px;height:36px;padding:0 10px;background:rgba(255,215,0,0.2);color:#FFE27A;font-size:12px;font-weight:900;cursor:pointer;' + FONT + '">최대</button></div>' +
      '<div style="display:flex;gap:8px;margin-top:14px;"><button id="gq-no" style="flex:1;border:none;border-radius:12px;padding:12px;background:rgba(255,255,255,0.12);color:#fff;font-size:13px;font-weight:900;cursor:pointer;' + FONT + '">취소</button>' +
      '<button id="gq-send" style="flex:2;border:none;border-radius:12px;padding:12px;background:linear-gradient(135deg,#FFD700,#ff9f45);color:#2a1a00;font-size:14px;font-weight:900;cursor:pointer;' + FONT + '">🎁 보내기</button></div></div>';
    document.body.appendChild(q);
    var r = q.querySelector('#gq-r');
    function draw() {
      q.querySelector('#gq-n').textContent = fmt(qty) + (key === 'coin' ? ' 코인' : '개');
      q.querySelector('#gq-recv').textContent = key === 'coin' ? '받는 사람은 ' + fmt(Math.floor(qty * (1 - COIN_FEE))) + ' 코인' : '';
      r.value = qty;
    }
    function set(v) { v = Math.floor(Number(v) || 0); qty = Math.max(L.min, Math.min(max, v)); draw(); }
    r.oninput = function () { set(r.value); };
    q.querySelector('#gq-m').onclick = function () { set(qty - step); };
    q.querySelector('#gq-p').onclick = function () { set(qty + step); };
    q.querySelector('#gq-max').onclick = function () { set(max); };
    q.querySelector('#gq-no').onclick = function () { q.remove(); };
    q.querySelector('#gq-send').onclick = async function () {
      var btn = this; btn.disabled = true; btn.style.opacity = '0.6';
      try {
        await sendGift(toUid, toNick, key, qty);
        toast('🎁 ' + toNick + '에게 ' + (key.indexOf('mat_') === 0 || key.indexOf('bk_sweet_') === 0 ? '' : emojiOf(key) + ' ') + nameOf(key) + ' x' + fmt(qty) + ' 보냈어요!');
        q.remove(); if (parent) parent.remove();
      } catch (e) {
        toast((e && e.message) || '보내지 못했어요');
        btn.disabled = false; btn.style.opacity = '1';
      }
    };
    draw();
  }
  window.openGiftTo = openGiftTo;

  // ───────── 선물함: 지금 받기 + 최근 받은/보낸 기록 ─────────
  function ago(t) {
    var m = Math.max(0, Math.floor((Date.now() - t) / 60000));
    if (m < 1) return '방금'; if (m < 60) return m + '분 전';
    var h = Math.floor(m / 60); if (h < 24) return h + '시간 전';
    return Math.floor(h / 24) + '일 전';
  }
  function openGiftBox() {
    var old = document.getElementById('gift-box'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'gift-box';
    ov.style.cssText = 'position:fixed;inset:0;z-index:986;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:14px;' + FONT;
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    function draw(msg) {
      var log = loadState().log.slice().reverse();
      ov.innerHTML = '<div style="background:#1a1233;border:1.5px solid ' + ACC + ';border-radius:18px;width:100%;max-width:380px;max-height:84vh;display:flex;flex-direction:column;">' +
        '<div style="padding:14px 16px 8px;display:flex;align-items:center;"><div style="font-size:16px;font-weight:900;color:#FFE27A;">🎁 선물함</div>' +
        '<button id="gb-x" style="margin-left:auto;border:none;border-radius:10px;background:rgba(255,255,255,0.1);color:#fff;padding:6px 12px;font-size:12px;font-weight:900;cursor:pointer;' + FONT + '">닫기</button></div>' +
        '<div style="padding:0 16px 8px;"><button id="gb-get" style="width:100%;border:none;border-radius:12px;padding:12px;font-size:14px;font-weight:900;cursor:pointer;background:linear-gradient(135deg,#FFD700,#ff9a3c);color:#2b1a00;' + FONT + '">🎁 선물 받기</button>' +
        '<div style="font-size:11px;color:#ffe27a;margin-top:6px;min-height:15px;text-align:center;">' + (msg || '') + '</div></div>' +
        '<div style="padding:0 16px 16px;overflow-y:auto;font-size:12px;color:#dfe6ff;line-height:1.6;">' +
        (log.length ? log.map(function (l) { return '<div style="padding:6px 0;border-top:1px solid rgba(255,255,255,0.08);">' + esc(l.m) + ' <span style="color:#8d96c0;">· ' + ago(l.t) + '</span></div>'; }).join('') : '<div style="color:#8d96c0;text-align:center;padding:16px 0;">아직 기록이 없어요</div>') +
        '</div></div>';
      ov.querySelector('#gb-x').onclick = function () { ov.remove(); };
      ov.querySelector('#gb-get').onclick = async function () {
        var bad = notReady(); if (bad) { draw(bad); return; }
        this.disabled = true; this.textContent = '확인 중…';
        var n = 0; try { n = await receiveAll(); } catch (e) { draw('확인하지 못했어요. 잠시 뒤 다시 해봐요'); return; }
        draw(n ? '🎉 ' + n + '개의 선물을 받았어요!' : '새로 온 선물이 없어요');
      };
    }
    document.body.appendChild(ov); draw();
  }
  window.openGiftBox = openGiftBox;
  (function hookFriend() {                                   // 친구 화면 위쪽에 선물함 버튼 달기
    var orig = window.openFriendOverlay;
    if (typeof orig !== 'function' || orig.__gift) return;
    var w = function () {
      var r = orig.apply(this, arguments);
      try {
        var ov = document.getElementById('friend-overlay');
        if (ov && !ov.querySelector('#fr-giftbox')) {
          var head = ov.firstChild, close = head && head.lastChild;
          var b = document.createElement('button'); b.id = 'fr-giftbox'; b.textContent = '🎁 선물함';
          b.style.cssText = 'background:linear-gradient(135deg,#FFD700,#ff9a3c);border:none;border-radius:10px;color:#2b1a00;padding:7px 12px;font-size:12px;font-weight:900;cursor:pointer;margin-left:auto;margin-right:8px;' + FONT;
          b.onclick = openGiftBox;
          head.insertBefore(b, close);
        }
      } catch (e) {}
      return r;
    };
    w.__gift = true; window.openFriendOverlay = w;
  })();

  window.__giftTest = { sendGift: sendGift, receiveAll: receiveAll, recoverPendingSend: recoverPendingSend, loadState: loadState, sendableKeys: sendableKeys, openGiftTo: openGiftTo, openQty: openQty, CFG: { DAILY_SEND: DAILY_SEND, MAX_QTY: MAX_QTY, COIN_MIN: COIN_MIN, COIN_MAX: COIN_MAX, COIN_DAILY: COIN_DAILY, COIN_FEE: COIN_FEE } };

  // ───────── 켜면 받기 / 이후 5분마다 ─────────
  var tries = 0;
  (function boot() {
    if (!notReady()) { recoverPendingSend().then(receiveAll).catch(function () {}); return; }
    if (++tries < 120) setTimeout(boot, 1000);
  })();
  setInterval(function () { if (document.hidden || notReady()) return; receiveAll().catch(function () {}); }, 5 * 60 * 1000);
})();
