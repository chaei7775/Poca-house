// ════════════════════════════════
// 🧩 신규 콘텐츠 로더
// 새 기능 추가할 때, 여기 NEW_CONTENT_FILES 배열에 파일명 한 줄만 추가하면 됨.
// index.html / game.js는 더 이상 안 건드려도 됨.
// ════════════════════════════════



const NEW_CONTENT_FILES = [
  'special-explore.js',
  'recombine-patch.js',
  'fishing.js',
  'sparkle-dust.js',
  'qty-picker.js',
  'forest-explore.js',
  'beach-explore.js',
  'park-explore.js',
  'mystery-explore.js',
  'agency.js',
  'wish-hidden-patch.js',
  'cf-shoot.js',
  'sfx.js',
  'coupon-patch.js',
  'quest-guide.js',
  'ticket-popup.js',
  'fancafe.js',
  'enhance.js',
];
NEW_CONTENT_FILES.forEach(function(filename) {
  const s = document.createElement('script');
  s.src = filename; // 같은 사이트(GitHub Pages) 경로에서 직접 로드 - raw.githubusercontent.com은 JS 실행이 막힐 수 있음
  document.body.appendChild(s);
});
