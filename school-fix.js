// 🎫 등교권: 포카 1명당 1장 (세 과목 다 들어도 1장만 소모)
// 원래 함수를 그대로 실행(스토리 퀘스트·일일퀘 등 다른 파일의 후킹도 그대로 동작)하고, 같은 포카가 이미 등교권을 냈다면 깎인 1장만 돌려줌
(function () {
  'use strict';
  function paid(cd) {
    return !!(cd.paid || (cd.done && Object.keys(cd.done).some(function (k) { return cd.done[k]; })));
  }
  function install() {
    if (typeof canStartSchoolSubject !== 'function' || typeof completeSchoolSubject !== 'function' || typeof schoolSubjectCard !== 'function') return false;
    if (window.__schoolFixed) return true;
    window.__schoolFixed = true;

    window.canStartSchoolSubject = function (subject) {
      normalizeSchoolDaily();
      var cd = getSchoolCardDaily();
      if (cd.done[subject]) { showBagToast('이 포카는 오늘 이미 완료한 수업이에요! 다른 포카는 수업할 수 있어요 🎒'); return false; }
      if (!paid(cd) && schoolDaily.tickets <= 0) { showBagToast('등교티켓이 부족해요! 🎫 내일 다시 충전돼요'); return false; }
      return true;
    };

    var origComplete = window.completeSchoolSubject;
    window.completeSchoolSubject = function (subject, score) {
      normalizeSchoolDaily();
      var cd = getSchoolCardDaily();
      var wasPaid = paid(cd), before = schoolDaily.tickets;
      var r = origComplete.apply(this, arguments);
      try {
        if (wasPaid) { schoolDaily.tickets = before; }       // 이미 낸 포카면 원래 깎인 1장을 되돌림
        var cd2 = getSchoolCardDaily(); cd2.paid = true;
        if (typeof saveSchoolDaily === 'function') saveSchoolDaily();
      } catch (e) {}
      return r;
    };

    var orig = schoolSubjectCard;
    window.schoolSubjectCard = function (icon, title, desc, score, action) {
      normalizeSchoolDaily();
      var cd = getSchoolCardDaily();
      var html = orig(icon, title, desc, score, action);
      if (paid(cd)) {
        html = html.replace(' · 🎫1<', ' · 🎫0<');
        if (schoolDaily.tickets <= 0) {
          var subject = action.indexOf('Dictation') >= 0 ? 'korean' : action.indexOf('Memory') >= 0 ? 'memory' : 'pe';
          if (!cd.done[subject]) {
            html = html.replace(' disabled style', ' style').replace('onclick=""', 'onclick="' + action + '"')
                       .replace('cursor:not-allowed', 'cursor:pointer').replace(/opacity:0\.62/, 'opacity:1');
          }
        }
      }
      return html;
    };
    return true;
  }
  var n = 0;
  (function t() { if (!install() && n++ < 300) setTimeout(t, 200); })();
})();
