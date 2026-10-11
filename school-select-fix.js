// ════════════════════════════════
// 🎒 등교 선택 화면 보정 (school-select-fix.js)
//  · 🎒 등교시킬 포카 선택 목록이 수업을 다 마친 포카도 "등교 가능"이라고 보여주던 것을 고친다
//  · 오늘 세 과목을 다 마친 포카: "오늘 수업 완료 · 내일 등교 가능" + 흐리게 + 선택 막음 (지금 등교 중인 포카는 선택 가능)
//  · 일부만 마친 포카: "오늘 수업 중 (n/3) · 등교 가능"
//  · game.js 는 건드리지 않고, renderSchoolSelect 를 감싸서 그린 뒤에 글씨만 바꾼다 (번들로 배포되어 바로 반영됨)
// ════════════════════════════════
(function () {
  'use strict';
  function stateOf(id) {
    try {
      normalizeSchoolDaily();
      var cd = (schoolDaily.cards && schoolDaily.cards[id]) || { done: {} };
      var n = ['korean', 'memory', 'pe'].filter(function (k) { return cd.done && cd.done[k]; }).length;
      return { n: n, finished: n >= 3 };
    } catch (e) { return { n: 0, finished: false }; }
  }
  function tune() {
    var ov = document.getElementById('school-overlay') || (typeof ensureSchoolOverlay === 'function' ? ensureSchoolOverlay() : null);
    if (!ov) return;
    Array.prototype.forEach.call(ov.querySelectorAll('button[onclick^="selectSchoolCard("]'), function (b) {
      var m = /selectSchoolCard\('([^']+)'\)/.exec(b.getAttribute('onclick') || ''); if (!m) return;
      var id = m[1], st = stateOf(id), cur = (typeof schoolSelectedCardId !== 'undefined') && id === schoolSelectedCardId;
      var sub = b.querySelector('div > div:nth-child(2)'), icon = b.lastElementChild;
      if (sub) sub.textContent = sub.textContent.replace(/연성고등학교 등교 가능/, st.finished ? '오늘 수업 완료 · 내일 등교 가능' : st.n > 0 ? '오늘 수업 중 (' + st.n + '/3) · 등교 가능' : '연성고등학교 등교 가능');
      if (st.finished && !cur) {
        b.disabled = true; b.removeAttribute('onclick');
        b.style.opacity = '.6'; b.style.cursor = 'not-allowed'; b.style.background = '#f1f5f9';
        if (icon && !/✅/.test(icon.textContent)) icon.textContent = '🏠';
      }
    });
  }
  function install() {
    if (typeof window.renderSchoolSelect !== 'function') return false;
    if (window.renderSchoolSelect.__fit) return true;
    var orig = window.renderSchoolSelect;
    var w = function () { var r = orig.apply(this, arguments); try { tune(); } catch (e) {} return r; };
    w.__fit = true; window.renderSchoolSelect = w;
    return true;
  }
  var tries = 0, t = setInterval(function () { if (install() || ++tries > 40) clearInterval(t); }, 250);
})();
