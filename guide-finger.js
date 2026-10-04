// ════════════════════════════════
// 👆 길잡이 손가락 — quest-guide.js의 노란 테두리 대신 손가락 이모지가 통통 깜빡임
// quest-guide.js 는 안 건드림. 등록: loader.js NEW_CONTENT_FILES 맨 끝(quest-guide.js 뒤)에 'guide-finger.js' 추가
// ════════════════════════════════
(function () {
  // 노란 테두리/펄스 끄기 (.qg-pulse 클래스는 그대로 두고 모양만 없앰)
  var st = document.createElement('style');
  st.textContent =
    'html body .qg-pulse{animation:none !important;outline:none !important;box-shadow:none !important;}' +
    '@keyframes qgFingerTap{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,-10px)}}' +
    '#qg-finger{position:fixed;z-index:99999;font-size:34px;line-height:1;pointer-events:none;' +
    'display:none;animation:qgFingerTap .7s ease-in-out infinite;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));}';
  document.head.appendChild(st);

  var f = document.createElement('div');
  f.id = 'qg-finger';
  f.textContent = '👆';
  document.body.appendChild(f);

  function place() {
    var t = document.querySelector('.qg-pulse');
    if (!t) { f.style.display = 'none'; return; }
    var r = t.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > window.innerHeight) {
      f.style.display = 'none';
      return;
    }
    // 넓은 버튼(알바하기 등)은 오른쪽 쪽에, 좁은 버튼(하단 메뉴)은 가운데에
    var x = r.width > 200 ? r.left + r.width * 0.85 : r.left + r.width / 2;
    // 손가락 끝이 버튼 위에 걸치도록 버튼 중간쯤에 배치
    var y = r.top + r.height * 0.5;
    f.style.left = x + 'px';
    f.style.top = y + 'px';
    f.style.display = 'block';
  }

  setInterval(place, 250);
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
})();
