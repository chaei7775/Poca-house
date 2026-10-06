// ════════════════════════════════
// 🔒 콘텐츠 해금 레벨 정리 (unlock-gate.js)
// 초반엔 [학교 · 데뷔 · 드라마 · 팬] 위주로만 보이게, 나머지 콘텐츠는 플레이어 레벨로 늦게 연다.
//  · 메뉴 버튼/타일을 누르면 레벨이 모자랄 때 🔒 안내만 뜨고 안 열린다. 잠긴 버튼엔 🔒Lv.N 표시.
//  · 기획사(데뷔)는 agency-unlock.js 가 Lv.7, 인베스트는 invest.js 가 Lv.20, 고급뽑기·팬 러시는 각자 파일에서 따로 관리.
// 값을 바꾸고 싶으면 아래 RULES 의 lv 숫자만 고치면 됨 (re = 버튼 글자에서 찾을 말).
// ════════════════════════════════
(function () {
  'use strict';
  var RULES = [
    { lv: 8,  re: /드라마 촬영/,            name: '드라마 촬영' },
    { lv: 10, re: /CF 촬영/,                name: 'CF 촬영' },
    { lv: 12, re: /스케줄 · 식사|스케줄·식사/, name: '스케줄 · 식사' },
    { lv: 12, re: /팬카페/,                  name: '팬카페' },
    { lv: 15, re: /분양소/,                  name: '분양소' },
    { lv: 15, re: /굿즈 공방/,               name: '굿즈 공방' },
    { lv: 15, re: /의상실/,                  name: '의상실' },
    { lv: 15, re: /거래소/,                  name: '거래소' },
    { lv: 15, re: /작곡 테이블|작곡 스튜디오|작곡스튜디오/, name: '작곡 스튜디오' },
    { lv: 15, re: /통발/,                    name: '통발' },
    { lv: 18, re: /^[^가-힣A-Za-z0-9]*팬클럽( 의뢰소)?$/,                  name: '팬클럽 의뢰소' },
    { lv: 20, re: /인베스트/,                name: '포카 인베스트' }
  ];
  var MAXLEN = 34;
  function plv() { try { return Number(playerLevel) || 1; } catch (e) { return 1; } }
  function ruleFor(text) {
    text = String(text || '').replace(/🔒\s*Lv\.\d+/g, '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > MAXLEN) return null;
    for (var i = 0; i < RULES.length; i++) if (RULES[i].re.test(text)) return RULES[i];
    return null;
  }
  function lockedRule(el) {          // 누른 곳에서 위로 최대 4단계까지 올라가며 짧은 버튼 글자에서 찾음
    for (var n = 0, e = el; e && e !== document.body && n < 5; e = e.parentElement, n++) {
      if (e.id === 'first-hidden-pop' || e.closest && e.closest('#unlock-gate-pop')) return null;
      var r = ruleFor(e.textContent);
      if (r) return plv() < r.lv ? r : null;
    }
    return null;
  }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }

  document.addEventListener('click', function (ev) {
    var r = lockedRule(ev.target);
    if (!r) return;
    ev.stopImmediatePropagation(); ev.preventDefault();
    toast('🔒 ' + r.name + '은(는) 플레이어 Lv.' + r.lv + '부터 열려요 (지금 Lv.' + plv() + ')');
  }, true);

  // 잠긴 버튼에 🔒Lv.N 표시 (화면이 바뀔 때마다 가볍게 다시 칠함)
  var st = document.createElement('style');
  st.textContent = '.ug-locked{opacity:.55;filter:grayscale(.5);} .ug-b{display:inline-block;margin-left:4px;font-size:10px;font-weight:900;color:#ffb3c1;white-space:nowrap;}';
  document.head.appendChild(st);
  var timer = null;
  function paint() {
    timer = null;
    var cur = plv();
    document.querySelectorAll('button, .more-tile, [onclick]').forEach(function (el) {
      if (el.closest('#unlock-gate-pop')) return;
      var r = ruleFor(el.textContent);
      var badge = el.querySelector(':scope > .ug-b');
      if (r && cur < r.lv) {
        el.classList.add('ug-locked');
        if (!badge) { var b = document.createElement('span'); b.className = 'ug-b'; b.textContent = '🔒Lv.' + r.lv; el.appendChild(b); }
        else badge.textContent = '🔒Lv.' + r.lv;
      } else {
        if (el.classList.contains('ug-locked')) el.classList.remove('ug-locked');
        if (badge) badge.remove();
      }
    });
  }
  function sched() { if (!timer) timer = setTimeout(paint, 500); }
  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) { var t = muts[i].target; if (t && t.nodeType === 1 && (t.classList.contains('ug-b') || (t.closest && t.closest('#fr-view')))) continue; sched(); return; }
  }).observe(document.body, { childList: true, subtree: true });
  setTimeout(paint, 1500);
  window.__unlockGate = { rules: RULES, ruleFor: ruleFor, repaint: paint };
})();
