// ════════════════════════════════
// 🔒 아직 못 여는 퀘스트 숨기기 (quest-lock.js)
//  · 퀘스트 목록에서 설명이 "(Lv.N~)" 로 시작하는데 내 레벨이 N 보다 낮은 퀘스트는 카드를 숨기고,
//    목록 맨 아래에 "🔒 앞으로 열릴 퀘스트" 한 칸으로 합쳐서 보여준다. (처음 보는 유저가 숙제 목록에 질리지 않게)
//  · 이미 완료한 퀘스트는 레벨과 상관없이 그대로 보인다. 레벨이 되면 자동으로 카드가 나타난다.
//  · 퀘스트 목록을 그리는 파일이 여럿이라, 목록(#quest-list)이 바뀔 때마다 정리한다 (MutationObserver).
// ════════════════════════════════
(function () {
  'use strict';
  var RE = /\(Lv\.(\d+)~\)/;
  var mo = null;
  function lvNow() { try { return typeof playerLevel === 'number' ? playerLevel : 99; } catch (e) { return 99; } }
  function titleOf(card) {
    var f = card.firstElementChild, d = f && f.firstElementChild ? f.firstElementChild : f;   // 카드 맨 위 줄의 첫 칸 = 제목 (보상 숫자 제외)
    var t = (d ? d.textContent : card.textContent) || '';
    return t.replace(/[✅🔒]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  }
  function tidy() {
    var el = document.getElementById('quest-list'); if (!el) return;
    if (mo) mo.disconnect();
    try {
      var old = el.querySelector('#ql-lock'); if (old) old.remove();
      var lv = lvNow(), groups = {};
      Array.prototype.slice.call(el.children).forEach(function (card) {
        if (card.id === 'ql-lock' || card.style.display === 'none' && !card.__qlHidden) return;
        var m = RE.exec(card.textContent || '');
        var locked = m && Number(m[1]) > lv && (card.textContent || '').indexOf('✅') === -1;
        if (locked) { card.style.display = 'none'; card.__qlHidden = 1; var n = Number(m[1]); (groups[n] = groups[n] || []).push(titleOf(card)); }
        else if (card.__qlHidden) { card.style.display = ''; card.__qlHidden = 0; }   // 레벨이 올라서 열린 퀘스트
      });
      // 숨긴 카드 중 레벨이 되어서 다시 보여야 하는 것도 위에서 처리됨. 아직 잠긴 카드의 제목은 다시 모아야 함
      Array.prototype.slice.call(el.children).forEach(function (card) {
        if (!card.__qlHidden) return;
        var m = RE.exec(card.textContent || ''); if (!m) return;
        var n = Number(m[1]); groups[n] = groups[n] || [];
        var t = titleOf(card); if (groups[n].indexOf(t) < 0) groups[n].push(t);
      });
      var lvs = Object.keys(groups).map(Number).sort(function (a, b) { return a - b; });
      if (lvs.length) {
        var total = 0; lvs.forEach(function (n) { total += groups[n].length; });
        var next = lvs[0], rest = total - groups[next].length;
        var box = document.createElement('div'); box.id = 'ql-lock';
        box.style.cssText = 'background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.2);border-radius:12px;padding:12px;margin:12px 0 8px;';
        box.innerHTML = '<div style="font-size:13px;font-weight:700;color:#cfc4ee;">🔒 앞으로 열릴 퀘스트 ' + total + '개</div>' +
          '<div style="font-size:12px;color:#aaa;margin-top:5px;line-height:1.5;">다음은 <b style="color:#FFB3CC;">Lv.' + next + '</b>에 열려요<br>' + groups[next].join(' · ') + '</div>' +
          (rest > 0 ? '<div style="font-size:11px;color:#778;margin-top:4px;">그 뒤로 ' + rest + '개 더 있어요</div>' : '');
        el.appendChild(box);
      }
    } catch (e) {}
    if (mo) mo.observe(el, { childList: true });
  }
  var t = 0;
  function boot() {
    var el = document.getElementById('quest-list');
    if (!el) { if (t++ < 100) setTimeout(boot, 300); return; }
    mo = new MutationObserver(function () { clearTimeout(boot.d); boot.d = setTimeout(tidy, 30); });
    mo.observe(el, { childList: true });
    tidy();
  }
  boot();
  window.__questLockTest = { tidy: tidy };
})();
