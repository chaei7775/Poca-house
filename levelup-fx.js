// ════════════════════════════════
// ✨ 레벨업 연출 (levelup-fx.js)
// 플레이어 레벨이 오를 때: ① 알림(⭐ 레벨 업!)이 맵 위에서도 보이게 맨 위로 올리고
//   ② 맵에 "카드"가 보이면(지금은 📺 팬덤 원정의 캐릭터 얼굴+카드) 그 카드에 반짝 연출 + 'LEVEL UP!' 글자를 띄운다.
//   카드가 안 보이는 화면은 연출 없이 작은 알림만.
// - 카드가 나오는 맵을 더 만들면 아래 TARGETS 에 선택자 한 줄 추가하면 됨 (또는 window.__levelUpTargets.push('#내카드')).
// - game.js 는 건드리지 않고 showLevelUpPopup 을 감싼다. 원래 알림은 그대로 뜬다.
// ════════════════════════════════
(function () {
  'use strict';
  var TARGETS = ['#bc-player'];            // 연출을 붙일 카드(캐릭터) 요소 선택자
  window.__levelUpTargets = window.__levelUpTargets || [];
  var FX_MS = 1900;

  function injectStyle() {
    if (document.getElementById('lvfx-style')) return;
    var st = document.createElement('style'); st.id = 'lvfx-style';
    st.textContent =
      '@keyframes lvfxRing{0%{transform:translate(-50%,-50%) scale(.3);opacity:.95}100%{transform:translate(-50%,-50%) scale(2.6);opacity:0}}' +
      '@keyframes lvfxRise{0%{transform:translate(-50%,0) scale(.6);opacity:0}15%{transform:translate(-50%,-14px) scale(1.15);opacity:1}100%{transform:translate(-50%,-70px) scale(1);opacity:0}}' +
      '@keyframes lvfxStar{0%{transform:translate(-50%,-50%) scale(.2);opacity:1}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1);opacity:0}}' +
      '@keyframes lvfxGlow{0%,100%{filter:none}30%{filter:brightness(1.5) drop-shadow(0 0 12px #FFD700)}60%{filter:brightness(1.25) drop-shadow(0 0 18px #FFD700)}}' +
      '.lvfx-glow{animation:lvfxGlow ' + FX_MS + 'ms ease-in-out 1;}';
    document.head.appendChild(st);
  }
  function visible(el) {
    if (!el || !el.isConnected) return false;
    var r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    return !!r && (r.width > 0 || r.height > 0);
  }
  function burst(target, level) {
    var host = target.parentNode; if (!host) return;
    var cs = window.getComputedStyle(host);
    if (cs.position === 'static') host.style.position = 'relative';
    // 카드(캐릭터) 위치 = 대상 요소의 중심 (맵 안에서 left/top 으로 움직이는 요소라 같은 부모 좌표를 쓴다)
    var centered = /translate\(\s*-50%/.test(target.style.transform || '');       // left/top 이 중심점인 요소(원정 캐릭터)는 그대로, 아니면 절반 더함
    var x = target.offsetLeft + (centered ? 0 : target.offsetWidth / 2), y = target.offsetTop + (centered ? 0 : target.offsetHeight / 2);
    if (!isFinite(x) || !isFinite(y)) return;
    var layer = document.createElement('div');
    layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:60;pointer-events:none;';
    var h = '';
    h += '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:80px;height:80px;border-radius:50%;border:3px solid #FFD700;box-shadow:0 0 18px #FFD700;animation:lvfxRing 1.1s ease-out 1;"></div>';
    h += '<div style="position:absolute;left:' + x + 'px;top:' + y + 'px;width:80px;height:80px;border-radius:50%;border:2px solid #fff;animation:lvfxRing 1.1s ease-out .25s 1 both;"></div>';
    for (var i = 0; i < 10; i++) {
      var a = (Math.PI * 2 * i) / 10, d = 46 + (i % 3) * 14;
      h += '<div style="--dx:' + Math.round(Math.cos(a) * d) + 'px;--dy:' + Math.round(Math.sin(a) * d) + 'px;position:absolute;left:' + x + 'px;top:' + y + 'px;font-size:' + (14 + (i % 3) * 4) + 'px;color:#FFE27A;text-shadow:0 0 6px #FFD700;animation:lvfxStar 1.2s ease-out ' + (i * 0.04) + 's 1 both;">✦</div>';
    }
    h += '<div style="position:absolute;left:' + x + 'px;top:' + (y - 36) + 'px;white-space:nowrap;font-size:15px;font-weight:900;color:#FFE27A;-webkit-text-stroke:1px #6b3a00;text-shadow:0 2px 6px rgba(0,0,0,.7);animation:lvfxRise 1.7s ease-out 1;">LEVEL UP! Lv.' + level + '</div>';
    layer.innerHTML = h;
    host.appendChild(layer);
    target.classList.add('lvfx-glow');
    setTimeout(function () { try { layer.remove(); target.classList.remove('lvfx-glow'); } catch (e) {} }, FX_MS + 300);
  }
  function play() {
    try {
      injectStyle();
      var lv = (typeof playerLevel !== 'undefined') ? playerLevel : '';
      var sels = TARGETS.concat(window.__levelUpTargets || []);
      sels.forEach(function (sel) {
        var list = document.querySelectorAll(sel);
        for (var i = 0; i < list.length; i++) if (visible(list[i])) burst(list[i], lv);
      });
    } catch (e) {}
  }
  function raiseToast() {                                    // 맵(탐험 화면) 위에서도 알림이 보이게
    var t = document.getElementById('levelup-toast');
    if (t) t.style.zIndex = '100000';
  }
  (function hook() {
    if (typeof window.showLevelUpPopup !== 'function') { setTimeout(hook, 150); return; }
    if (window.showLevelUpPopup.__lvfx) return;
    var orig = window.showLevelUpPopup;
    var w = function () { var r = orig.apply(this, arguments); raiseToast(); play(); return r; };
    w.__lvfx = true; window.showLevelUpPopup = w;
  })();
  window.__levelUpFx = { play: play, TARGETS: TARGETS };
})();
