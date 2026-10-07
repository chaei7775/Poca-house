// ════════════════════════════════
// 🗑️ 가방 아이템 버리기 (bag-delete.js) — game.js 는 건드리지 않음
// 가방에서 아이템을 눌렀을 때 뜨는 창 맨 아래에 [🗑️ 버리기] 버튼이 생긴다. 누르면 한 번 더 물어보고 지운다.
//  · 여러 개 쌓인 아이템은 '1개 버리기' / '전부 버리기' 중에서 고름
//  · 소원의 조각은 개수 기록(wishFragments)도 같이 줄임
// 등록: loader.js NEW_CONTENT_FILES 에 'bag-delete.js' 한 줄
// ════════════════════════════════
(function () {
  'use strict';
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function removeItem(name, n) {   // n = 'all' 또는 개수
    var i = bagItems.findIndex(function (x) { return x && x.name === name; });
    if (i < 0) return 0;
    var have = bagItems[i].qty == null ? 1 : bagItems[i].qty;
    var cut = n === 'all' ? have : Math.min(have, n);
    if (cut >= have) bagItems.splice(i, 1); else bagItems[i].qty = have - cut;
    if (name === '소원의 조각') {
      try { wishFragments = Math.max(0, wishFragments - cut); localStorage.setItem('ph_wish', wishFragments); } catch (e) {}
    }
    try { if (typeof saveBag === 'function') saveBag(); } catch (e) {}
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    return cut;
  }

  function confirmDelete(item) {
    var old = document.getElementById('bag-del-confirm'); if (old) old.remove();
    var name = item.name, qty = item.qty == null ? 1 : item.qty;
    var ov = document.createElement('div'); ov.id = 'bag-del-confirm';
    ov.style.cssText = 'position:fixed;inset:0;z-index:1500;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;' + FONT;
    var btn = 'width:100%;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:900;cursor:pointer;margin-top:8px;' + FONT;
    ov.innerHTML = '<div style="background:#1a1a2e;border:2px solid #ef4444;border-radius:18px;padding:22px 20px;width:84%;max-width:290px;text-align:center;color:#fff;">' +
      '<div style="font-size:34px;">🗑️</div>' +
      '<div style="font-size:15px;font-weight:900;margin:6px 0 4px;">' + esc(name) + (qty > 1 ? ' <span style="color:#aaa;">x' + qty + '</span>' : '') + '</div>' +
      '<div style="font-size:12px;color:#fca5a5;margin-bottom:6px;">버리면 되돌릴 수 없어요.</div>' +
      (qty > 1 ? '<button id="bd-one" style="' + btn + 'background:#374151;color:#fff;">1개 버리기</button>' : '') +
      '<button id="bd-all" style="' + btn + 'background:#ef4444;color:#fff;">' + (qty > 1 ? '전부 버리기 (' + qty + '개)' : '버리기') + '</button>' +
      '<button id="bd-no" style="' + btn + 'background:transparent;color:#aaa;">취소</button></div>';
    document.body.appendChild(ov);
    function done(n) {
      var cut = removeItem(name, n);
      ov.remove();
      var d = document.getElementById('bag-detail-overlay'); if (d) d.remove();
      try { if (typeof renderBag === 'function') renderBag(); } catch (e) {}
      try { if (typeof showBagToast === 'function') showBagToast('🗑️ ' + name + (cut > 1 ? ' ' + cut + '개' : '') + ' 버렸어요'); } catch (e) {}
    }
    ov.querySelector('#bd-all').onclick = function () { done('all'); };
    var one = ov.querySelector('#bd-one'); if (one) one.onclick = function () { done(1); };
    ov.querySelector('#bd-no').onclick = function () { ov.remove(); };
  }

  function install() {
    if (typeof window.showBagItemDetail !== 'function') return false;
    if (window.showBagItemDetail.__bagDel) return true;
    var orig = window.showBagItemDetail;
    var wrapped = function (idx) {
      var r = orig.apply(this, arguments);
      try {
        var item = bagItems[idx], ov = document.getElementById('bag-detail-overlay');
        if (!item || !ov || !ov.firstElementChild || ov.querySelector('#bag-del-btn')) return r;
        var b = document.createElement('button');
        b.id = 'bag-del-btn'; b.textContent = '🗑️ 버리기';
        b.style.cssText = 'width:100%;padding:9px;margin-top:8px;background:transparent;border:1px solid rgba(239,68,68,.6);border-radius:12px;color:#fca5a5;font-size:12px;font-weight:700;cursor:pointer;' + FONT;
        b.onclick = function (e) { e.stopPropagation(); confirmDelete(item); };
        ov.firstElementChild.appendChild(b);
      } catch (e) {}
      return r;
    };
    wrapped.__bagDel = true;
    window.showBagItemDetail = wrapped;
    return true;
  }
  // 다른 파일이 나중에 또 감싸도 우리 버튼이 남도록 주기적으로 다시 확인
  setInterval(install, 2000);
  install();
})();
