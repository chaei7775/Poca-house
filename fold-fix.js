// 📱 폴드/태블릿처럼 화면이 넓을 때, 화면 가장자리에 붙는 떠 있는 버튼들이 게임 영역(최대 430px) 밖으로 튀어나가지 않게 안쪽으로 당긴다
//  · 폰(430px 이하)에서는 offset 이 0 이라 달라지는 게 없다
//  · 대상: 스태미나 박스(오른쪽) / ? 도움말 버튼(오른쪽) / 🔊 소리 탭(왼쪽) / 소리 설정창(왼쪽)
(function () {
  'use strict';
  var O = 'max(0px, calc((100vw - 430px) / 2))';
  var st = document.createElement('style');
  st.textContent =
    '#stamina-floating{right:calc(' + O + ' + 10px) !important;}' +
    '#ph-help-btn{right:calc(' + O + ' + 10px) !important;}' +
    '#bgm-toggle-btn{left:' + O + ' !important;}' +
    '#sfx-panel{left:calc(' + O + ' + 10px) !important;}';
  document.head.appendChild(st);
})();
