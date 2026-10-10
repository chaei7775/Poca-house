// ════════════════════════════════
// 💝 아이돌에게 선물 여러 개 한 번에 (gift-bulk.js)
//  · 인연 → 아이돌 → 💝 선물하기 에서 선물을 누르면 "몇 개 줄까요?" 팝업 (슬라이더 / − / + / 최대)
//  · 하루 한도: 아이돌 한 명당 DAILY_MAX 개 (선물 1개씩 줄 때도 똑같이 센다). 날짜가 바뀌면 0으로 돌아감
//  · 실제 선물은 기존 giveGift 를 개수만큼 불러서 처리 → 호감도 보너스/퀘스트/의상 효과가 그대로 적용됨
// 저장: localStorage 'ph_giftDaily' ({d:'YYYY-MM-DD', n:{아이돌id:오늘 준 개수}}) — ph_ 로 시작해서 클라우드 저장에 포함
// 한도를 바꾸고 싶으면 아래 DAILY_MAX 만 고치면 된다.
// ════════════════════════════════
(function () {
  'use strict';
  var DAILY_MAX = 20;                       // 아이돌 1명당 하루에 줄 수 있는 선물 개수
  var KEY = 'ph_giftDaily';
  var FONT = "font-family:'Noto Sans KR',sans-serif;";

  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function load() {
    var r = null; try { r = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!r || r.d !== today() || !r.n || typeof r.n !== 'object') r = { d: today(), n: {} };
    return r;
  }
  function save(r) { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch (e) {} }
  function used(cid) { return load().n[cid] || 0; }
  function left(cid) { return Math.max(0, DAILY_MAX - used(cid)); }
  function add(cid, n) { var r = load(); r.n[cid] = (r.n[cid] || 0) + n; save(r); }
  function toast(m) { try { if (typeof showBagToast === 'function') showBagToast(m); } catch (e) {} }
  function nameOf(cid) { try { return CHARS[cid].name; } catch (e) { return '아이돌'; } }
  function haveOf(name, fromBag) {
    try {
      if (fromBag) { var b = bagItems.find(function (i) { return i.name === name; }); return b ? b.qty : 0; }
      return inventory[name] || 0;
    } catch (e) { return 0; }
  }

  // ── 한도 걸기: giveGift 한 번 = 선물 1개 ──
  function hookGive() {
    if (typeof window.giveGift !== 'function') { setTimeout(hookGive, 100); return; }
    if (window.giveGift.__gbHooked) return;
    var orig = window.giveGift;
    var w = function (charId) {
      if (left(charId) <= 0) { toast('🎁 ' + nameOf(charId) + '에게는 오늘 선물을 다 줬어요 (하루 ' + DAILY_MAX + '개). 내일 또 줘요!'); return; }
      var before = null; try { before = haveOf(arguments[1], arguments[2]); } catch (e) {}
      var r = orig.apply(this, arguments);
      try { if (before !== null && haveOf(arguments[1], arguments[2]) < before) add(charId, 1); } catch (e) {}   // 실제로 줬을 때만 센다
      return r;
    };
    w.__gbHooked = true;
    window.giveGift = w;
  }

  // ── 여러 개 주기 ──
  function giveMany(charId, name, fromBag, n) {
    var total = 0, given = 0;
    var origFloat = window.showAffectionGainFloat;
    window.showAffectionGainFloat = function (cn, gain) { total += Number(gain) || 0; };   // 개수만큼 뜨는 걸 모아서 한 번만
    try {
      for (var i = 0; i < n; i++) {
        var b = haveOf(name, fromBag), u = used(charId);
        window.giveGift(charId, name, fromBag);
        if (haveOf(name, fromBag) < b) given++; else break;
        if (used(charId) <= u) break;
      }
    } finally { window.showAffectionGainFloat = origFloat; }
    try { if (typeof origFloat === 'function' && total > 0) origFloat(nameOf(charId), total); } catch (e) {}
    try {   // 결과 화면 맨 위에 개수 표시
      var ov = document.getElementById('meet-overlay'), p = ov && ov.querySelector('div');
      if (p && given > 1) {
        var d = document.createElement('div');
        d.style.cssText = 'text-align:center;color:#FFE27A;font-size:13px;font-weight:900;margin-bottom:6px;' + FONT;
        d.textContent = '💝 ' + given + '개를 한 번에 선물! (호감도 합계 +' + total + ' · 오늘 ' + used(charId) + '/' + DAILY_MAX + ')';
        p.insertBefore(d, p.firstChild);
      }
    } catch (e) {}
    return given;
  }

  function openQty(charId, name, fromBag, display) {
    var old = document.getElementById('gb-qty'); if (old) old.remove();
    var have = haveOf(name, fromBag), lim = left(charId), max = Math.min(have, lim);
    if (lim <= 0) { toast('🎁 오늘은 ' + nameOf(charId) + '에게 다 줬어요 (하루 ' + DAILY_MAX + '개)'); return; }
    if (max < 1) return;
    var qty = Math.min(max, 1);
    var ov = document.createElement('div'); ov.id = 'gb-qty';
    ov.style.cssText = 'position:fixed;inset:0;z-index:620;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:16px;' + FONT;
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    ov.innerHTML = '<div style="background:#1a1233;border:1.5px solid #FF6B9D;border-radius:18px;width:100%;max-width:320px;padding:18px 16px;color:#fff;">' +
      '<div style="font-size:15px;font-weight:900;text-align:center;margin-bottom:4px;">' + display + '</div>' +
      '<div style="font-size:11.5px;color:#c9b8e8;text-align:center;margin-bottom:12px;">보유 ' + have + '개 · 오늘 ' + nameOf(charId) + '에게 ' + used(charId) + '/' + DAILY_MAX + '개 줬어요</div>' +
      '<div id="gbq-n" style="font-size:30px;font-weight:900;text-align:center;color:#FFE27A;">1</div>' +
      '<input id="gbq-r" type="range" min="1" max="' + max + '" value="1" style="width:100%;margin:8px 0;accent-color:#FF6B9D;">' +
      '<div style="display:flex;gap:8px;margin-bottom:12px;">' +
      '<button id="gbq-m" style="flex:1;padding:9px;border:none;border-radius:10px;background:rgba(255,255,255,0.1);color:#fff;font-size:16px;font-weight:900;cursor:pointer;">−</button>' +
      '<button id="gbq-p" style="flex:1;padding:9px;border:none;border-radius:10px;background:rgba(255,255,255,0.1);color:#fff;font-size:16px;font-weight:900;cursor:pointer;">+</button>' +
      '<button id="gbq-x" style="flex:1.4;padding:9px;border:none;border-radius:10px;background:rgba(255,255,255,0.1);color:#FFE27A;font-size:12px;font-weight:900;cursor:pointer;">최대 ' + max + '</button></div>' +
      '<div style="display:flex;gap:8px;"><button id="gbq-no" style="flex:1;padding:12px;border:none;border-radius:12px;background:rgba(255,255,255,0.08);color:#aaa;font-size:13px;cursor:pointer;">취소</button>' +
      '<button id="gbq-ok" style="flex:2;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:14px;font-weight:900;cursor:pointer;">💝 선물하기</button></div></div>';
    document.body.appendChild(ov);
    var r = ov.querySelector('#gbq-r'), nEl = ov.querySelector('#gbq-n'), ok = ov.querySelector('#gbq-ok');
    function set(v) { v = Math.floor(Number(v) || 1); qty = Math.max(1, Math.min(max, v)); r.value = qty; nEl.textContent = qty; ok.textContent = '💝 ' + qty + '개 선물하기'; }
    r.oninput = function () { set(r.value); };
    ov.querySelector('#gbq-m').onclick = function () { set(qty - 1); };
    ov.querySelector('#gbq-p').onclick = function () { set(qty + 1); };
    ov.querySelector('#gbq-x').onclick = function () { set(max); };
    ov.querySelector('#gbq-no').onclick = function () { ov.remove(); };
    ok.onclick = function () { ov.remove(); giveMany(charId, name, fromBag, qty); };
    set(1);
  }

  // ── 선물 선택창의 버튼을 '개수 정하기'로 바꾸기 ──
  function hookMenu() {
    if (typeof window.showGiftMenu !== 'function') { setTimeout(hookMenu, 100); return; }
    if (window.showGiftMenu.__gbHooked) return;
    var orig = window.showGiftMenu;
    var w = function (charId) {
      var r = orig.apply(this, arguments);
      try {
        var ov = document.getElementById('meet-overlay'); if (!ov) return r;
        var btns = ov.querySelectorAll('button[onclick^="giveGift("]');
        Array.prototype.forEach.call(btns, function (b) {
          var m = /^giveGift\('([^']+)','(.*)',(true|false)\)$/.exec(b.getAttribute('onclick') || '');
          if (!m) return;
          var cid = m[1], name = m[2], fromBag = m[3] === 'true', disp = b.textContent.trim();
          b.removeAttribute('onclick');
          b.onclick = function () {
            if (left(cid) <= 0) { toast('🎁 오늘은 ' + nameOf(cid) + '에게 다 줬어요 (하루 ' + DAILY_MAX + '개)'); return; }
            if (haveOf(name, fromBag) <= 1) { window.giveGift(cid, name, fromBag); return; }
            openQty(cid, name, fromBag, disp);
          };
        });
        var panel = ov.firstElementChild, head = panel && panel.firstElementChild;
        if (head && !ov.querySelector('#gb-left')) {
          var d = document.createElement('div'); d.id = 'gb-left';
          d.style.cssText = 'font-size:11px;color:#c9b8e8;margin:-4px 0 10px;' + FONT;
          d.textContent = '오늘 ' + nameOf(charId) + '에게 ' + used(charId) + '/' + DAILY_MAX + '개 줬어요 · 선물을 누르면 개수를 정할 수 있어요';
          panel.insertBefore(d, head.nextSibling);
        }
      } catch (e) {}
      return r;
    };
    w.__gbHooked = true;
    window.showGiftMenu = w;
  }

  hookGive(); hookMenu();
  window.__giftBulkTest = { DAILY_MAX: DAILY_MAX, used: used, left: left, giveMany: giveMany, openQty: openQty, KEY: KEY };
})();
