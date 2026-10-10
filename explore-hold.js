// ════════════════════════════════
// ⏸ 탐험 시간 멈춤 (explore-hold.js)
// 탐험(숲·집·해변·공원·뷰티·세트장·스튜디오) 중에 아이돌 기사/돌발 사건/매니저 사건 같은 팝업이 위에 뜨면
// 팝업이 닫힐 때까지 남은 시간이 줄어들지 않는다. (각 탐험 파일에서 window.__phHold() 를 부름)
// 멈추게 할 팝업을 늘리려면 아래 IDS 에 요소 id 만 추가하면 됨.
// ════════════════════════════════
(function () {
  'use strict';
  var IDS = ['issue-pop', 'happening-pop', 'mgr-event', 'mgr-story', 'meal-event'];
  window.__phHold = function () {
    for (var i = 0; i < IDS.length; i++) if (document.getElementById(IDS[i])) return true;
    return false;
  };
})();
