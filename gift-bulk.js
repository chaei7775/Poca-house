// ════════════════════════════════
// 💝 아이돌 선물 하루 한도 (gift-bulk.js)
//  · 아이돌 한 명당 하루에 DAILY_MAX 개까지만 선물할 수 있다 (날짜가 바뀌면 0으로 돌아감)
//  · 선물 선택창 위에 "오늘 N/20개 줬어요" 표시
//  · (한 번에 여러 개 주기는 일단 뺐음 — 선물은 1개씩. 필요하면 git 기록에서 되살릴 수 있음)
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

  // ── 선물 선택창 위에 오늘 준 개수 표시 ──
  function hookMenu() {
    if (typeof window.showGiftMenu !== 'function') { setTimeout(hookMenu, 100); return; }
    if (window.showGiftMenu.__gbHooked) return;
    var orig = window.showGiftMenu;
    var w = function (charId) {
      var r = orig.apply(this, arguments);
      try {
        var ov = document.getElementById('meet-overlay'); if (!ov) return r;
        var panel = ov.firstElementChild, head = panel && panel.firstElementChild;
        if (head && !ov.querySelector('#gb-left')) {
          var d = document.createElement('div'); d.id = 'gb-left';
          d.style.cssText = 'font-size:11px;color:#c9b8e8;margin:-4px 0 10px;' + FONT;
          d.textContent = '오늘 ' + nameOf(charId) + '에게 ' + used(charId) + '/' + DAILY_MAX + '개 줬어요 (하루 ' + DAILY_MAX + '개까지)';
          panel.insertBefore(d, head.nextSibling);
        }
      } catch (e) {}
      return r;
    };
    w.__gbHooked = true;
    window.showGiftMenu = w;
  }

  hookGive(); hookMenu();
  window.__giftBulkTest = { DAILY_MAX: DAILY_MAX, used: used, left: left, KEY: KEY };
})();
