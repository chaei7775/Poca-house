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
  'housing-explore.js',
  'set-explore.js',
  'beach-explore.js',
  'beauty-explore.js',
  'park-explore.js',
  'mystery-explore.js',
  'agency.js',
  'wish-hidden-patch.js',
  'wish-sync.js',
  'bag-delete.js',
  'viral-hit.js',
  'cf-shoot.js',
  'cf-photo.js',
  'cf-guest-fix.js',
  'sfx.js',
  'coupon-patch.js',
  'quest-guide.js',
  'ticket-popup.js',
  'fancafe.js',
  'live.js',
  'rising.js',
  'happening.js',
  'enhance.js',
  'fan-skills.js',
  'skill-tome.js',
  'cloud-extra.js',
  'stamina-balance.js',
  'drink-bulk.js',
  'broadcast-expedition.js',
  'fan-rush.js',
  'vip-rush.js',
  'mat-where.js',
  'mat-icons.js',
  'goods-gear.js',
  'stone-toast.js',
  'premium-gacha.js',
  'home-clean.js',
  'broadcast-fix.js',
  'premium-cards.js',
  'guide-finger.js',
  'quest-extra.js',
  'shop-coin-sync.js',
  'bond-gift.js',
  'starter-boost.js',
  'newbie-tickets.js',
  'app-resume.js',
  'bgm-btn-fix.js',
  'economy-boost.js',
  'ticket-fragment-fix.js',
  'photolab.js',
  'premium-equip.js',
  'trial-card.js',
  'concert-farm.js',
  'concert-tutorial.js',
  'studio-explore.js',
  'album-studio.js',
  'equip-panel.js',
  'room-themes.js',
  'mystery-unlock.js',
  'quest-concert.js',
  'quest-boost.js',
  'invest.js',
  'stamina-fix.js',
  'square-explore.js',
  'daily-quest.js',
  'trade.js',
  'trap.js',
  'school-fix.js',
  'agency-unlock.js',
  'poca-exp-popup.js',
  'card-exp-boost.js',
  'house-exp-share.js',
  'fan-marker.js',
  'drama.js',
  'kennel.js',
  'kennel-tap.js',
  'kennel-qty.js',
  'kennel-bond.js',
  'meal.js',
  'story-quest.js',
  'clothes-equip.js',
  'skillbook.js',
  'big-drop-popup.js',
  'transcend-aura.js',
  'first-hidden.js',
  'unlock-gate.js',
  'level-pace.js',
  'hidden-effects.js',
  'music-chart.js',
  'music-chart-ui.js',
  'music-stage.js',
  'manager.js',
  'manager-events.js',
  'road-manager.js',
  'mobile-fit.js',
  'issue-news.js',
];
// 🎬 첫 화면 깜빡임 방지: 새 콘텐츠 파일이 다 불러와질 때까지 예전 홈화면을 가리고(index.html의 boot-veil/boot-splash), 끝나면 부드럽게 보여줌
var __bootLeft = NEW_CONTENT_FILES.length, __bootDone = false;
function __bootReveal() {
  if (__bootDone) return; __bootDone = true;
  var v = document.getElementById('boot-veil'); if (v) v.remove();
  var sp = document.getElementById('boot-splash');
  if (sp) { sp.style.opacity = '0'; setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 350); }
}
function __bootOne() {
  __bootLeft--; if (__bootLeft > 0) return;
  var t0 = Date.now();   // 다 불러온 뒤에도 길잡이/일일퀘스트 카드가 1~2초 늦게 붙으니, 카드가 합쳐질 때까지(최대 2.4초) 더 기다림
  (function wait() {
    var g = document.getElementById('qg-home-card'), d = document.getElementById('dq-home-card');
    var ready = g && d && g.classList.contains('qg-merged') && d.classList.contains('dq-merged');
    if (ready || Date.now() - t0 > 2400) setTimeout(__bootReveal, 120); else setTimeout(wait, 100);
  })();
}
setTimeout(__bootReveal, 6000);   // 안전장치: 아무리 늦어도 6초 뒤엔 보여줌
NEW_CONTENT_FILES.forEach(function(filename) {
  const s = document.createElement('script');
  s.src = filename + '?v=' + Date.now(); // 같은 사이트(GitHub Pages) 경로에서 직접 로드 - raw.githubusercontent.com은 JS 실행이 막힐 수 있음
  s.onload = __bootOne; s.onerror = __bootOne;
  document.body.appendChild(s);
});
