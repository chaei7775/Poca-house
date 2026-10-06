// 🔊 소리 버튼을 화면 왼쪽 가장자리에 붙는 작은 탭으로 바꿔서 아래 글씨를 안 가리게 함
(function () {
  'use strict';
  var st = document.createElement('style');
  st.textContent =
    '#bgm-toggle-btn{left:0 !important;bottom:112px !important;width:20px !important;height:34px !important;border-radius:0 12px 12px 0 !important;' +
    'font-size:11px !important;opacity:.5;box-shadow:none !important;padding:0 !important;background:rgba(26,26,46,.7) !important;}' +
    '#bgm-toggle-btn:active{opacity:1;}';
  document.head.appendChild(st);
})();
