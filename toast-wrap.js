// 안내 토스트(#bag-toast)가 길면 화면 밖으로 튀어나가던 것 → 줄바꿈해서 화면 안에 들어오게
(function () {
  'use strict';
  var st = document.createElement('style');
  st.id = 'toast-wrap-css';
  st.textContent = '#bag-toast{white-space:normal !important;width:max-content;max-width:min(88vw,400px) !important;line-height:1.5;word-break:keep-all;box-sizing:border-box;padding:10px 18px !important;}';
  document.head.appendChild(st);
})();
