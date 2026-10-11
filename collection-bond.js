// ════════════════════════════════
// 📁 내 컬렉션 카드 → 호감도 + 💓 설렘 이벤트 (collection-bond.js)
//  · 내 컬렉션에서 카드를 눌러 크게 보면 아래에 그 아이돌의 호감도와 설렘 이벤트 버튼이 같이 나온다
//    (설렘 이벤트를 열 수 있으면 카드 모서리와 더보기에 뜨는 빨간 점이 여기로 이어짐)
//  · 이벤트 내용·조건은 romance.js 가 그대로 처리 / 여기는 보여주고 누르게만 한다
// ════════════════════════════════
(function () {
  'use strict';
  function R() { return window.PhRomance; }
  function cidOfCard(item) {
    try {
      var grid = document.getElementById('collection-grid'), i = Array.prototype.indexOf.call(grid.children, item);
      return i >= 0 && CARDS[i] ? CARDS[i].charId : null;
    } catch (e) { return null; }
  }
  function panel(cid) {
    var html = '', r = R(), nm = '';
    try { nm = (CHARS[cid] && CHARS[cid].name) || ''; } catch (e) {}
    try {
      var info = getAffectionInfo(cid);
      html += '<div style="font-size:13px;font-weight:900;color:#ffd2e6;">💗 ' + nm + ' 호감도 · ' + info.stage + ' ' + info.level + '단계 <span style="color:#aab4d6;font-weight:700;">(' + info.totalExp + ')</span></div>';
    } catch (e) {}
    var btn = '';
    try {
      var st = r && r.EV[cid] ? r.status(cid) : null;
      if (st) {
        if (!st.next) btn = '<div style="font-size:12px;color:#FF9EC4;margin-top:6px;">💓 설렘 이벤트를 모두 봤어요</div>';
        else if (st.ready) btn = '<button id="cb-rom" style="margin-top:8px;width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#FF4D88,#FF9EC4);color:#fff;font-size:14px;font-weight:800;font-family:inherit;cursor:pointer;">💓 설렘 이벤트 — ' + st.next.t + '</button>';
        else if (!st.expOk) btn = '<div style="font-size:12px;color:#aab4d6;margin-top:6px;">🔒 호감도 ' + st.next.min + '이 되면 설렘 이벤트가 열려요</div>';
        else btn = '<div style="font-size:12px;color:#aab4d6;margin-top:6px;">💓 데이트 티켓 ' + st.have + '/' + st.need + ' — 인연 화면에서 선물해요</div>';
      }
    } catch (e) {}
    html += btn + '<button id="cb-bond" style="margin-top:8px;width:100%;padding:10px;border:1px solid rgba(255,255,255,.25);border-radius:12px;background:rgba(255,255,255,.08);color:#fff;font-size:12.5px;font-weight:700;font-family:inherit;cursor:pointer;">💞 인연 화면 열기</button>';
    var d = document.createElement('div'); d.id = 'cb-panel';
    d.style.cssText = 'position:absolute;left:12px;right:12px;bottom:34px;max-width:380px;margin:0 auto;padding:12px 14px;border-radius:16px;background:rgba(20,10,34,.92);border:1.5px solid #FF9EC4aa;text-align:center;color:#fff;';
    d.innerHTML = html;
    d.onclick = function (e) { e.stopPropagation(); };
    var z = document.getElementById('card-zoom'); if (!z) return;
    z.appendChild(d);
    var b1 = d.querySelector('#cb-rom'), b2 = d.querySelector('#cb-bond');
    if (b1) b1.onclick = function (e) { e.stopPropagation(); var st = r.status(cid); z.remove(); r.play(cid, st.next); };
    if (b2) b2.onclick = function (e) { e.stopPropagation(); z.remove(); try { openBondDetail(cid); } catch (x) {} };
  }
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || t.tagName !== 'IMG') return;
    var item = t.closest && t.closest('#collection-grid > .card-item'); if (!item) return;
    var cid = cidOfCard(item); if (!cid) return;
    setTimeout(function () { if (document.getElementById('card-zoom') && !document.getElementById('cb-panel')) panel(cid); }, 30);
  }, true);

  // 열 수 있는 설렘 이벤트가 있는 아이돌의 컬렉션 카드 모서리에 빨간 점
  function dots() {
    try {
      var grid = document.getElementById('collection-grid'), r = R(); if (!grid || !r) return;
      Array.prototype.forEach.call(grid.children, function (item, i) {
        var cid = CARDS[i] && CARDS[i].charId, d = item.querySelector('.cb-dot'), on = false;
        try { on = !!cid && owned.indexOf(CARDS[i].id) >= 0 && r.EV[cid] && r.status(cid).ready; } catch (e) {}
        if (on && !d) {
          if (getComputedStyle(item).position === 'static') item.style.position = 'relative';
          d = document.createElement('span'); d.className = 'cb-dot';
          d.style.cssText = 'position:absolute;top:4px;right:4px;width:12px;height:12px;border-radius:50%;background:#ff3b5c;border:2px solid #fff;pointer-events:none;z-index:3;';
          item.appendChild(d);
        } else if (!on && d) d.remove();
      });
    } catch (e) {}
  }
  setInterval(dots, 1500);
})();
