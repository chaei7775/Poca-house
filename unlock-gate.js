// ════════════════════════════════
// 🔒 콘텐츠 해금 레벨 정리 (unlock-gate.js)
// 초반엔 [학교 · 데뷔 · 드라마 · 팬] 위주로만 보이게, 나머지 콘텐츠는 플레이어 레벨로 늦게 연다.
//  · 메뉴 버튼/타일을 누르면 레벨이 모자랄 때 🔒 안내만 뜨고 안 열린다. 잠긴 버튼엔 🔒Lv.N 표시.
//  · 기획사(데뷔)는 agency-unlock.js 가 Lv.5, 인베스트는 invest.js 가 Lv.20, 고급뽑기·팬 러시는 각자 파일에서 따로 관리.
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
    { lv: 12, re: /^로드 매니저/,             name: '로드 매니저' },
    { lv: 15, re: /작곡 테이블|작곡 스튜디오|작곡스튜디오/, name: '작곡 스튜디오' },
    { lv: 15, re: /통발/,                    name: '통발' },
    { lv: 18, re: /^[^가-힣A-Za-z0-9]*팬클럽( 의뢰소)?$/,                  name: '팬클럽 의뢰소' },
    { lv: 18, re: /음원차트/,                name: '음원차트' },
    { lv: 20, re: /인베스트/,                name: '포카 인베스트' },
    // ── 초반 구간: 처음엔 [뽑기 · 인연 · 알바]만, 레벨이 오를수록 더보기 메뉴가 하나씩 열림 ──
    { lv: 2,  re: /스케줄 가기/,            name: '스케줄 가기' },
    { lv: 4,  re: /^히든카드 도감$/,        name: '히든카드 도감' },
    { lv: 4,  re: /^친구$/,                 name: '친구' },
    { lv: 4,  re: /^게시판$/,               name: '게시판' },
    { lv: 8,  re: /^칭호$/,                 name: '칭호' },
    { lv: 8,  re: /^내 컬렉션$/,            name: '내 컬렉션' },
    { lv: 10, re: /^트레이닝룸$/,           name: '트레이닝룸' },
    { lv: 10, re: /^팬 스킬 상점$/,         name: '팬 스킬 상점' },
    { lv: 12, re: /^카드 재조합기$/,        name: '카드 재조합기' },
    { lv: 12, re: /^프리미엄 카드$/,        name: '프리미엄 카드' },
    { lv: 12, re: /^해프닝 카드/,           name: '해프닝 카드' }
  ];
  // 아래 탭 (id 로 찾음): 홈 · 뽑기 · 인연은 처음부터, 나머지는 Lv.2 (첫 만남 퀘스트를 깨면 바로 열려요)
  var NAV_LV = { 'nav-quest': { lv: 2, name: '퀘스트' }, 'nav-bag': { lv: 2, name: '가방' }, 'nav-map': { lv: 2, name: '맵' }, 'nav-shop': { lv: 2, name: '더보기' } };
  // 맵 장소 (맵 화면의 openPlace('...') 버튼): 포카버거·카페거리는 Lv.2, 나머지는 Lv.3
  var PLACE_LV = {
    'cafe-street': { lv: 2, name: '카페거리' },
    school: { lv: 3, name: '연성고등학교' }, beach: { lv: 3, name: '뷰티 살롱' }, forest: { lv: 3, name: '촬영 세트장' }, shopping: { lv: 3, name: '상점거리' },
    housing: { lv: 3, name: '연습생 숙소촌' }, mystery: { lv: 3, name: '신비의 섬' }, square: { lv: 3, name: '중앙광장' }, lake: { lv: 3, name: '워크숍 캠프' },
    room: { lv: 3, name: '내 집' }, park: { lv: 3, name: '꽃길공원' }
  };
  function attrRule(e) {
    if (!e || e.nodeType !== 1) return null;
    if (e.id && NAV_LV[e.id]) return NAV_LV[e.id];
    var oc = e.getAttribute && e.getAttribute('onclick');
    if (oc) { var m = /^\s*openPlace\('([^']+)'\)/.exec(oc); if (m && PLACE_LV[m[1]]) return PLACE_LV[m[1]]; }
    return null;
  }
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
      var r = attrRule(e);
      if (!r) {
        // 버튼처럼 눌리는 칸의 글자만 본다. (예전엔 [알바하기]+[스케줄 가기]를 감싼 상자 글자까지 읽어서, 알바하기를 눌러도 "스케줄 가기 잠김"이 떴음)
        var btnLike = e.tagName === 'BUTTON' || e.tagName === 'A' || (e.getAttribute && (e.getAttribute('onclick') || e.getAttribute('role') === 'button'));
        if (btnLike) r = ruleFor(e.textContent);
        else if (n === 0) r = ruleFor(e.textContent);   // 눌린 자리 자체(글자 한 조각)는 그대로 확인
        else continue;
      }
      if (r) return plv() < r.lv ? r : null;
      if (e.tagName === 'BUTTON') return null;   // 버튼인데 규칙이 없으면 더 올라가지 않음 (바깥 상자 오인 방지)
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
  st.textContent = '.ug-nav{position:relative;} .ug-nav::after{content:"🔒" attr(data-ug);position:absolute;top:1px;left:50%;transform:translateX(-50%);font-size:8px;font-weight:900;color:#c2415c;background:rgba(255,255,255,.92);border-radius:8px;padding:0 4px;white-space:nowrap;} .ug-locked{opacity:.55;filter:grayscale(.5);} .ug-b{display:inline-block;margin-left:4px;font-size:10px;font-weight:900;color:#ffb3c1;white-space:nowrap;}';
  document.head.appendChild(st);
  var timer = null;
  function paint() {
    timer = null;
    var cur = plv();
    document.querySelectorAll('button, .more-tile, [onclick]').forEach(function (el) {
      if (el.closest('#unlock-gate-pop')) return;
      var ar = attrRule(el), r = ar || ruleFor(el.textContent);
      var isNav = !!(el.id && NAV_LV[el.id]);
      var badge = el.querySelector(':scope > .ug-b');
      if (r && cur < r.lv) {
        el.classList.add('ug-locked');
        if (isNav) { el.classList.add('ug-nav'); el.setAttribute('data-ug', 'Lv.' + r.lv); }
        else if (!badge) { var b = document.createElement('span'); b.className = 'ug-b'; b.textContent = '🔒Lv.' + r.lv; el.appendChild(b); }
        else badge.textContent = '🔒Lv.' + r.lv;
      } else {
        if (el.classList.contains('ug-locked')) el.classList.remove('ug-locked');
        if (isNav) { el.classList.remove('ug-nav'); el.removeAttribute('data-ug'); }
        if (badge) badge.remove();
      }
    });
  }
  function sched() { if (!timer) timer = setTimeout(paint, 500); }
  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) { var t = muts[i].target; if (t && t.nodeType === 1 && (t.classList.contains('ug-b') || (t.closest && t.closest('#fr-view')))) continue; sched(); return; }
  }).observe(document.body, { childList: true, subtree: true });
  setTimeout(paint, 1500);
  // 레벨이 오르면 새로 열린 곳을 알려줌 (뭐부터 할지 길잡이 역할)
  var lastLv = plv();
  setInterval(function () {
    var cur = plv(); if (cur <= lastLv) { lastLv = cur; return; }
    var names = [], seen = {};
    function add(r) { if (r && r.lv > lastLv && r.lv <= cur && !seen[r.name]) { seen[r.name] = 1; names.push(r.name); } }
    RULES.forEach(add); Object.keys(NAV_LV).forEach(function (k) { add(NAV_LV[k]); }); Object.keys(PLACE_LV).forEach(function (k) { add(PLACE_LV[k]); });
    lastLv = cur; paint();
    if (names.length) setTimeout(function () { toast('🔓 새로 열렸어요: ' + names.slice(0, 3).join(' · ') + (names.length > 3 ? ' 외 ' + (names.length - 3) + '곳' : '')); }, 2600);
  }, 1200);
  window.__unlockGate = { rules: RULES, ruleFor: ruleFor, repaint: paint };
})();
