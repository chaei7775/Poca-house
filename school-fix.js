// 🎫 등교권: 포카 1명당 1장 (세 과목 다 들어도 1장만 소모)
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

    window.completeSchoolSubject = function (subject, score) {
      normalizeSchoolDaily();
      var cd = getSchoolCardDaily();
      if (cd.done[subject]) return false;
      if (!paid(cd)) schoolDaily.tickets = Math.max(0, schoolDaily.tickets - 1);
      cd.paid = true;
      cd.done[subject] = true;
      saveSchoolDaily();
      setSchoolScore(subject, score);
      return true;
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
