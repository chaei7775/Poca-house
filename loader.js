// ════════════════════════════════
// 🧩 신규 콘텐츠 로더
// 새 기능 추가할 때, 여기 NEW_CONTENT_FILES 배열에 파일명 한 줄만 추가하면 됨.
// index.html / game.js는 더 이상 안 건드려도 됨.
// ════════════════════════════════



const NEW_CONTENT_FILES = [
  'save-guard.js',
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
  'item-source.js',
  'expedition-gear.js',
  'romance.js',
  'wardrobe-home.js',
  'quest-new.js',
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
  'gift-bulk.js',
  'clue-note.js',
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
  'sweets.js',
  'spa.js',
  'quest-sub.js',
  'levelup-fx.js',
  'trade.js',
  'gift.js',
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
  'lesson.js',
  'idol-board.js', 'signature.js',
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
  'map-icons.js',
  'map-pin-pos.js',
  'card-zoom.js',
  'bond-view.js',
  'expedition-gate.js',
  'toast-wrap.js',
  'test-reset.js',
  'school-popup.js',
  'manager.js',
  'manager-events.js',
  'road-manager.js',
  'mobile-fit.js',
  'issue-news.js',
  'fx-icons.js',
  'emoji-skin.js',
  'expedition-kit.js',
  'rhythm-map.js',
  'paparazzi-map.js',
  'worldtour-map.js',
  'flower-granny.js',
  'help.js',
  'compensation.js',
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
// 📦 묶음 로딩: build-bundle.py 가 만든 bundle.json 에 파일 전체가 순서대로 들어 있다.
//    한 번에 받아서 배열 순서 그대로 실행하므로, 파일 100여 개를 따로 받던 때보다 훨씬 빠르고 더보기 같은 메뉴 칸이 매번 똑같이 나온다.
//    ⚠️ NEW_CONTENT_FILES 의 파일을 고치거나 추가했으면 `python3 build-bundle.py` 로 bundle.json 을 다시 만들어 같이 올릴 것.
var BUNDLE_V = '60e5fe960a';
function __loadOne(filename) {   // 묶음에 없는 파일이나 묶음을 못 받았을 때 예전 방식으로 하나씩
  const s = document.createElement('script');
  s.src = filename + '?v=' + Date.now(); // 같은 사이트(GitHub Pages) 경로에서 직접 로드 - raw.githubusercontent.com은 JS 실행이 막힐 수 있음
  s.onload = __bootOne; s.onerror = __bootOne;
  document.body.appendChild(s);
}
function __loadAllSeparately() { NEW_CONTENT_FILES.forEach(__loadOne); }
(function loadBundle() {
  if (typeof fetch !== 'function') { __loadAllSeparately(); return; }
  fetch('bundle.json?v=' + BUNDLE_V).then(function (r) { if (!r.ok) throw new Error('bundle ' + r.status); return r.json(); }).then(function (b) {
    var have = {};
    (b.files || []).forEach(function (f) {
      have[f[0]] = 1;
      try {
        var s = document.createElement('script');
        s.textContent = f[1] + '\n//# sourceURL=' + f[0];
        document.body.appendChild(s);   // 안에 든 글자가 바로, 순서대로 실행됨
      } catch (e) { try { console.error('[bundle]', f[0], e); } catch (x) {} }
    });
    var rest = NEW_CONTENT_FILES.filter(function (n) { return !have[n]; });
    __bootLeft = rest.length;
    if (rest.length) rest.forEach(__loadOne); else { __bootLeft = 1; __bootOne(); }
  }).catch(function (e) { try { console.warn('[bundle] 묶음 로딩 실패, 하나씩 불러와요', e); } catch (x) {} __loadAllSeparately(); });
})();
