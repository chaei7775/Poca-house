// ════════════════════════════════
// 🐾 CF 촬영 게스트 = 분양소 동물만 (cf-guest-fix.js)
// CF 촬영 준비 화면의 "③ 게스트" 목록에서 특별탐험 생물(무지개 나비, 은빛 참새, 수정 사슴 등)을 빼고,
// 분양소에서 분양받은 동물(강아지/고양이/아기돼지/새)만 보이게 한다. (cf-shoot.js는 건드리지 않음)
// - 제목은 "③ 동물 게스트"로, 희귀 보너스 문구는 지움 (동물은 전부 일반 보너스)
// - 분양받은 동물이 없으면 분양소로 안내하는 문구를 보여줌
// - 예전에 찍어 둔 포스터(생물이 같이 찍힌 것)는 그대로 보임
// ════════════════════════════════
(function () {
  'use strict';
  if (window.__cfGuestFixLoaded) return;
  window.__cfGuestFixLoaded = true;

  var EMPTY_HTML = '분양받은 동물이 없어요.<br>연습생 숙소촌 🐾 분양소에서 동물을 분양받으면 게스트로 쓸 수 있어요!';
  var EMPTY_STYLE = 'font-size:12px;color:#888;line-height:1.5;';
  var obs = null;

  function apply(ov) {
    // 1) 분양소 동물(k_로 시작)이 아닌 게스트 버튼 제거
    var btns = ov.querySelectorAll('[data-guest]');
    var kept = 0;
    Array.prototype.forEach.call(btns, function (b) {
      var id = b.getAttribute('data-guest') || '';
      if (id.indexOf('k_') === 0) kept++;
      else if (b.parentNode) b.parentNode.removeChild(b);
    });

    // 2) "③ ... 게스트" 제목 찾기
    var header = null;
    Array.prototype.forEach.call(ov.querySelectorAll('div'), function (d) {
      if (!header && d.firstChild && d.firstChild.nodeType === 3 && /^③\s*생물 게스트/.test(d.firstChild.nodeValue)) header = d;
    });
    if (!header) return;
    header.firstChild.nodeValue = header.firstChild.nodeValue.replace('생물 게스트', '동물 게스트');
    var sub = header.querySelector('span');
    if (sub) sub.textContent = sub.textContent.replace(/\s*·\s*희귀 \+\d+%p/, '');

    // 3) 보여줄 동물이 하나도 없으면 안내 문구
    if (kept === 0) {
      var content = header.nextElementSibling;
      if (content && content.getAttribute('data-gf') !== 'empty') {
        content.innerHTML = EMPTY_HTML;
        content.setAttribute('style', EMPTY_STYLE);
        content.setAttribute('data-gf', 'empty');
      }
    }
  }

  function onMutate() {
    var ov = document.getElementById('cf-setup-overlay');
    if (!ov) return;
    if (!ov.querySelector('[data-guest]') && !/③\s*생물 게스트/.test(ov.textContent)) return;   // 아직 안 그려졌거나 이미 처리됨
    obs.disconnect();                        // 내가 고친 것 때문에 또 호출되지 않게 잠깐 끔
    try { apply(ov); } catch (e) {}
    start();
  }
  function start() {
    try { obs.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  }

  function init() {
    if (!document.body) { setTimeout(init, 50); return; }
    obs = new MutationObserver(onMutate);
    start();
  }
  init();
})();
