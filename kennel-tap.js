// ════════════════════════════════
// 👆 분양소 타이밍 게이지 "화면 아무 데나 탭" (kennel-tap.js)
// 분양소에서 맞는 먹이를 놓으면 클로즈업 화면에 게이지가 왔다갔다하는데,
// 원래는 아래 작은 "지금이다!" 버튼만 눌러야 멈췄다. (게이지 바나 화면을 눌러도 반응 없음)
// → 이 파일을 넣으면 클로즈업 화면 아무 데나 탭해도 "지금이다!"로 처리된다.
// (kennel.js는 건드리지 않음 / 버튼도 그대로 눌러짐)
// ════════════════════════════════
(function () {
  'use strict';
  if (window.__kennelTapLoaded) return;
  window.__kennelTapLoaded = true;

  var LABEL = '지금이다! (화면 아무 데나 탭)';
  var tries = 0;

  function attach() {
    var box = document.getElementById('kn-close');
    if (!box) {
      if (++tries > 200) return;            // 약 20초 기다려도 없으면 포기 (원래 버튼 방식은 그대로 동작)
      setTimeout(attach, 100);
      return;
    }
    if (window.__kennelTapApplied) return;
    window.__kennelTapApplied = true;

    // 게이지 단계에서만 존재하는 #kn-grab 버튼이 있을 때, 화면 어디를 탭해도 그 버튼을 누른 것으로 처리
    box.addEventListener('click', function (e) {
      var grab = document.getElementById('kn-grab');
      if (!grab) return;                     // 게이지 단계가 아님 (결과 화면 / 틀린 먹이 등)
      if (e.target === grab) return;         // 버튼을 직접 누른 건 원래 동작이 처리
      grab.click();
    });

    // 버튼 글자에 "아무 데나 탭"을 알려줌 (새로 그려질 때마다)
    function label() {
      var g = document.getElementById('kn-grab');
      if (g && !g.getAttribute('data-tapfix')) {
        g.setAttribute('data-tapfix', '1');
        g.textContent = LABEL;
      }
    }
    try { new MutationObserver(label).observe(box, { childList: true, subtree: true }); } catch (e) {}
    label();
  }
  attach();
})();
