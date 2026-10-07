// ════════════════════════════════
// 🔍 중앙광장 숨은 팬 찾기 탐험 (square-explore.js)
// 광장의 "탐험" 버튼(startExplore('square'))만 새 방식으로 바꾼다. 다른 지역 탐험은 그대로.
//
// 흐름: 스태미나 10 소모 → 팬 찾기 의뢰 3건
//   광장 그림 속에 팬이 8명 서 있고, 단서(옷 색 + 소품 + 근처 장소)에 딱 맞는 한 명을 찾아 탭!
//   그림은 손가락으로 밀어서 움직이고, 🔎 버튼으로 확대할 수 있어요 (반응 속도는 필요 없음)
//   의뢰 1건당 기회 2번. 맞히면 재료 3개, 3건 다 맞히면 희귀 재료 보너스
//   막히면 🔍힌트(코인) : 틀린 팬 3명이 흐려져요
// 외울 수 없게: 서 있는 자리(후보지 중 랜덤) · 팬 모습 · 단서가 매번 새로 만들어져요.
// 재조합석 15% 판정은 기존 탐험과 동일.
//
// 값을 바꾸고 싶으면 아래 설정만 고치면 됨.
// 팬이 서 있는 자리가 어색하면 아래 SPOTS 의 좌표(그림 크기 1672x941 기준)만 고치면 돼요.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var STAMINA_COST = 10;      // 기존 탐험과 동일
  var STONE_DROP = 0.25;      // 끝났을 때 재조합석 확률 (기존 탐험과 동일)
  var ROUNDS = 3;             // 의뢰 개수
  var TRIES = 2;              // 의뢰 1건당 기회
  var FAN_COUNT = 8;          // 한 의뢰에 서 있는 팬 수 (정답 1 + 가짜 7)
  var DROPS_PER_FAN = 3;      // 맞힐 때마다 받는 재료 수
  var HINT_COST = 1000;       // 힌트 비용(코인)
  var HINT_REMOVE = 3;        // 힌트 한 번에 흐려지는 가짜 수
  var ZOOMS = [1, 1.6, 2.4];  // 확대 단계
  var BG_FILE = 'map-square.png';
  var IMG_W = 1672, IMG_H = 941;

  // 팬이 설 수 있는 자리 [x, y, 근처 장소 이름]  (그림 좌표)
  var SPOTS = [
    [700, 560, '분수'], [1130, 545, '분수'], [900, 655, '분수'],
    [520, 640, '벤치'], [1255, 570, '벤치'],
    [330, 640, '환영 간판'], [250, 760, '환영 간판'],
    [1250, 735, '풍선 가판대'], [1340, 800, '풍선 가판대'], [1520, 690, '풍선 가판대'],
    [330, 480, '아이스크림 카트'], [540, 470, '아이스크림 카트'],
    [1180, 440, '회전목마'], [1370, 445, '회전목마'],
    [1090, 405, '시계탑'], [1230, 395, '시계탑'],
    [1400, 540, '가로등'], [120, 560, '가로등'],
    [330, 830, '꽃밭'], [470, 870, '꽃밭'], [150, 860, '꽃밭'],
    [240, 440, '파라솔'], [1600, 470, '파라솔'], [680, 440, '파라솔'],
    [800, 810, '산책로'], [1010, 840, '산책로'], [650, 730, '산책로'], [1120, 745, '산책로'],
    [900, 485, '나무 그늘'], [1050, 470, '나무 그늘']
  ];

  var OUTFITS = [
    { id: 'red', name: '빨강', hex: '#ef4444' }, { id: 'blue', name: '파랑', hex: '#3b82f6' },
    { id: 'green', name: '초록', hex: '#22c55e' }, { id: 'yellow', name: '노랑', hex: '#facc15' },
    { id: 'purple', name: '보라', hex: '#a855f7' }, { id: 'pink', name: '분홍', hex: '#ec4899' },
    { id: 'white', name: '하양', hex: '#f1f5f9' }
  ];
  // 팬 얼굴 8종 (fan-1.png ~ fan-8.png). name은 의뢰 문구에 들어가는 설명
  var CHARS = [
    { id: 1, name: '초록 머리띠 웨이브머리 팬' }, { id: 2, name: '비니 쓴 팬' },
    { id: 3, name: '안경 쓴 할머니 팬' }, { id: 4, name: '핑크 리본 양갈래 팬' },
    { id: 5, name: '곱슬머리 안경 팬' }, { id: 6, name: '남색 모자 쓴 금발 팬' },
    { id: 7, name: '윙크하는 짧은 머리 팬' }, { id: 8, name: '똥머리 팬' }
  ];

  // ════════ 순수 로직 (화면 없이도 테스트 가능) ════════
  function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function josaEul(word) {
    var c = word.charCodeAt(word.length - 1);
    if (c < 0xAC00 || c > 0xD7A3) return '를';
    return ((c - 0xAC00) % 28) ? '을' : '를';
  }
  function otherThan(arr, cur, rng) {
    var cand = arr.filter(function (x) { return x !== cur; });
    return pick(cand, rng);
  }

  // 한 의뢰의 팬 명단을 만든다. 정답은 (옷 색, 소품, 장소) 세 개가 모두 맞는 한 명뿐.
  function makeRound(rng) {
    rng = rng || Math.random;
    var spots = shuffle(SPOTS, rng);
    var tSpot = spots[0];
    var target = { outfit: pick(OUTFITS, rng), ch: pick(CHARS, rng), spot: tSpot, answer: true };
    var fans = [target];
    var used = [tSpot];
    // 같은 장소 이름의 다른 자리 (가짜가 정답과 같은 장소에 서 있을 수 있게)
    var sameLabel = spots.filter(function (s) { return s !== tSpot && s[2] === tSpot[2]; });
    var diffLabel = spots.filter(function (s) { return s[2] !== tSpot[2]; });

    for (var i = 1; i < FAN_COUNT; i++) {
      // 정답과 비슷하게: 옷/소품/장소 중 1~2개만 다르게 (정답과 완전히 같은 조합은 절대 없음)
      var masks = [1, 2, 4, 3, 5, 6, 7];
      var mask = (i <= 3) ? pick([1, 2, 4], rng) : pick(masks, rng);
      var f = { outfit: target.outfit, ch: target.ch, spot: null, answer: false };
      if (mask & 1) f.outfit = otherThan(OUTFITS, target.outfit, rng);
      if (mask & 2) f.ch = otherThan(CHARS, target.ch, rng);
      var wantDiffSpot = !!(mask & 4);
      var pool = (wantDiffSpot ? diffLabel : sameLabel).filter(function (s) { return used.indexOf(s) === -1; });
      if (!pool.length) {   // 자리가 모자라면 다른 쪽에서 뽑되, 정답과 같아지지 않게 옷을 바꿈
        pool = (wantDiffSpot ? sameLabel : diffLabel).filter(function (s) { return used.indexOf(s) === -1; });
        if (!wantDiffSpot || pool.length === 0) {
          if (!(mask & 3)) f.outfit = otherThan(OUTFITS, target.outfit, rng);
        }
        if (!pool.length) pool = spots.filter(function (s) { return used.indexOf(s) === -1; });
      }
      var spot = pick(pool, rng);
      f.spot = spot; used.push(spot);
      // 안전장치: 세 개가 다 같아지면 옷을 바꿈
      if (f.outfit === target.outfit && f.ch === target.ch && f.spot[2] === target.spot[2]) f.outfit = otherThan(OUTFITS, target.outfit, rng);
      fans.push(f);
    }
    fans.forEach(function (f) {
    });
    return { fans: shuffle(fans, rng), target: target, clue: clueText(target, rng) };
  }

  function clueText(t, rng) {
    var o = t.outfit.name + ' 옷을 입은', d = t.ch.name, p = t.spot[2];
    var tpl = pick([
      function () { return p + ' 근처에서 ' + o + ' ' + d + josaEul(d) + ' 찾아주세요! 포카를 떨어뜨렸대요.'; },
      function () { return '포카를 떨어뜨린 건 ' + o + ' ' + d + '! ' + p + ' 쪽에 있대요.'; },
      function () { return p + ' 옆에 있는 ' + o + ' ' + d + ', 어디 있을까요?'; }
    ], rng || Math.random);
    return tpl();
  }

  // 판정: 탭한 팬이 정답인가
  function judge(fan) { return !!(fan && fan.answer); }

  // ════════ 재료 뽑기 (기존 탐험과 같은 방식) ════════
  var POOLS = { normal: ['해바라기', '별빛모래', '빛나는돌', '네잎클로버'], rare: ['구름조각', '무지개수정'] };
  function pools() {
    if (typeof EXPLORE_MATERIALS !== 'undefined' && EXPLORE_MATERIALS.square) return EXPLORE_MATERIALS.square;
    return POOLS;
  }
  function rollDrop(luck, forceRare, rng) {
    rng = rng || Math.random;
    var p = pools();
    var rareChance = Math.min(0.80, 0.30 + (luck || 0) / 100);
    var isRare = forceRare || rng() < rareChance;
    var pool = isRare ? p.rare : p.normal;
    var mat = pool[Math.floor(rng() * pool.length)];
    var isWish = !forceRare && rng() < 0.005;
    return { name: isWish ? null : mat, isWish: isWish, isRare: isRare };
  }

  // ════════ 화면 ════════
  var S = null;
  function $(id) { return document.getElementById(id); }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }

  function fanSvg(f) {
    var hex = f.outfit.hex;
    var src = (typeof B !== 'undefined' ? B : '') + 'fan-' + f.ch.id + '.png';
    return '<svg viewBox="0 0 40 62" width="100%" style="display:block;overflow:visible;">' +
      '<ellipse cx="20" cy="59" rx="11" ry="3" fill="rgba(0,0,0,.28)"/>' +
      '<rect x="14" y="48" width="5" height="11" rx="2" fill="#4b3b5a"/><rect x="21" y="48" width="5" height="11" rx="2" fill="#4b3b5a"/>' +
      '<rect x="10" y="31" width="20" height="20" rx="6" fill="' + hex + '" stroke="#fff" stroke-width="1"/>' +
      '<ellipse cx="8" cy="39" rx="3" ry="7" fill="' + hex + '" stroke="#fff" stroke-width=".8"/><ellipse cx="32" cy="39" rx="3" ry="7" fill="' + hex + '" stroke="#fff" stroke-width=".8"/>' +
      '<image href="' + src + '" x="2" y="0" width="36" height="36" preserveAspectRatio="xMidYMid meet"/></svg>';
  }

  function baseScale() {
    // 폰 브라우저 주소창이 접혔다 펴지면 화면 높이가 계속 바뀌어서 지도가 커졌다 작아졌다 했음
    // → 배율은 한 번 정하면 고정 (가로폭이 크게 바뀔 때만 다시 계산, 높이가 커져서 모자랄 때만 한 번 키움)
    var v = S.view, need = Math.max(v.clientHeight / IMG_H, v.clientWidth / IMG_W);
    if (!S.bs || Math.abs(v.clientWidth - (S.bsW || 0)) > 60) { S.bs = need; S.bsW = v.clientWidth; }
    else if (need > S.bs) S.bs = need;
    return S.bs;
  }
  function worldSize() { var s = baseScale() * ZOOMS[S.zoom]; return { w: IMG_W * s, h: IMG_H * s, s: s }; }
  function applyPan() {
    var v = S.view, ws = worldSize();
    S.px = Math.min(0, Math.max(v.clientWidth - ws.w, S.px));
    S.py = Math.min(0, Math.max(v.clientHeight - ws.h, S.py));
    S.world.style.width = ws.w + 'px'; S.world.style.height = ws.h + 'px';
    S.world.style.transform = 'translate(' + S.px + 'px,' + S.py + 'px)';
  }
  function setZoom(z) {
    if (z < 0 || z >= ZOOMS.length || z === S.zoom) return;
    var v = S.view, old = worldSize();
    var cx = (v.clientWidth / 2 - S.px) / old.w, cy = (v.clientHeight / 2 - S.py) / old.h;   // 화면 가운데가 가리키는 그림 위치(0~1)
    S.zoom = z;
    var ws = worldSize();
    S.px = v.clientWidth / 2 - cx * ws.w; S.py = v.clientHeight / 2 - cy * ws.h;
    applyPan();
    var zb = $('sq-zoom'); if (zb) zb.textContent = '🔎 x' + ZOOMS[S.zoom];
  }

  function startSquare() {
    if ($('square-overlay')) return;
    if (typeof stamina !== 'undefined' && stamina < STAMINA_COST) { toast('스태미나가 부족해요! ⚡ 음료를 마셔봐요'); return; }
    stamina -= STAMINA_COST;
    if (typeof saveStamina === 'function') saveStamina();
    exploreCollected = [];

    var ov = document.createElement('div');
    ov.id = 'square-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:700;background:#2b1f3a;color:#fff;font-family:\'Noto Sans KR\',sans-serif;display:flex;flex-direction:column;user-select:none;-webkit-user-select:none;touch-action:none;overscroll-behavior:none;';
    ov.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(0,0,0,.6);z-index:5;">' +
        '<button id="sq-exit" style="background:rgba(255,255,255,.15);border:none;border-radius:14px;color:#fff;padding:8px 12px;font-size:13px;font-weight:700;cursor:pointer;">← 나가기</button>' +
        '<div id="sq-round" style="flex:1;text-align:center;font-size:13px;font-weight:900;color:#FFE27A;"></div>' +
        '<button id="sq-zoom" style="background:rgba(255,255,255,.15);border:none;border-radius:14px;color:#fff;padding:8px 12px;font-size:13px;font-weight:700;cursor:pointer;">🔎 x1</button></div>' +
      '<div id="sq-view" style="position:relative;flex:1;min-height:0;overflow:hidden;touch-action:none;background:#6b8f5a;">' +
        '<div id="sq-world" style="position:absolute;left:0;top:0;transform-origin:0 0;">' +
          '<img id="sq-img" draggable="false" style="width:100%;height:100%;display:block;pointer-events:none;">' +
          '<div id="sq-fans" style="position:absolute;inset:0;"></div></div></div>' +
      '<div id="sq-panel" style="padding:12px 14px 16px;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border-top:2px solid #FF6B9D;z-index:5;"></div>';
    document.body.appendChild(ov);

    var luck = typeof getEquippedStat === 'function' ? getEquippedStat('luck') : 0;
    S = {
      ov: ov, view: $('sq-view'), world: $('sq-world'), fansEl: $('sq-fans'),
      zoom: 0, px: 0, py: 0, luck: luck, round: 0, tries: TRIES, rd: null, okCount: 0,
      collected: [], busy: false, ended: false, hinted: false, drag: null, hp: 0
    };
    var img = $('sq-img');
    img.onload = function () { if (img.naturalWidth) { IMG_W = img.naturalWidth; IMG_H = img.naturalHeight; } if (S) { fit(); renderFans(); } };
    img.onerror = function () { img.style.display = 'none'; if (S) S.world.style.background = 'linear-gradient(180deg,#9fd0ff,#e6d8ff 55%,#b9e3b0)'; };
    img.src = (typeof B !== 'undefined' ? B : '') + BG_FILE;

    $('sq-exit').onclick = function () {
      if (!S || S.ended) return;
      if (window.confirm('지금 나가면 남은 의뢰는 사라져요. 나갈까요?')) finish(true);
    };
    $('sq-zoom').onclick = function () { setZoom((S.zoom + 1) % ZOOMS.length); };
    S.view.addEventListener('pointerdown', onDown);
    S.view.addEventListener('pointermove', onMove);
    S.view.addEventListener('pointerup', onUp);
    S.view.addEventListener('pointercancel', function () { if (S) S.drag = null; });
    window.addEventListener('resize', onResize);
    nextRound();
    setTimeout(function () { if (S) { S.bs = null; fit(); } }, 0);
  }

  function onResize() { if (S) { fit(); } }
  function fit() {
    if (!S) return;
    var ws = worldSize();
    if (!S.hp) { S.hp = 1; S.px = (S.view.clientWidth - ws.w) / 2; S.py = (S.view.clientHeight - ws.h) / 2; }
    applyPan();
  }

  // ── 밀어서 움직이기 / 탭해서 고르기 ──
  function onDown(e) { if (!S || S.ended) return; S.drag = { x: e.clientX, y: e.clientY, px: S.px, py: S.py, moved: false, target: e.target }; try { S.view.setPointerCapture(e.pointerId); } catch (err) {} }
  function onMove(e) {
    if (!S || !S.drag) return;
    var dx = e.clientX - S.drag.x, dy = e.clientY - S.drag.y;
    if (!S.drag.moved && Math.abs(dx) + Math.abs(dy) > 9) S.drag.moved = true;
    if (S.drag.moved) { S.px = S.drag.px + dx; S.py = S.drag.py + dy; applyPan(); }
  }
  function onUp(e) {
    if (!S || !S.drag) return;
    var d = S.drag; S.drag = null;
    if (d.moved) return;
    var el = d.target && d.target.closest ? d.target.closest('.sq-fan') : null;
    if (el) onPick(+el.getAttribute('data-i'), el);
  }

  // ── 의뢰 진행 ──
  function nextRound() {
    S.round++;
    S.tries = TRIES; S.hinted = false; S.busy = false;
    S.rd = makeRound();
    renderFans();
    renderPanel();
    $('sq-round').textContent = '🔍 의뢰 ' + S.round + '/' + ROUNDS + ' · 찾은 팬 ' + S.okCount;
  }

  function renderFans() {
    if (!S || !S.rd) return;
    var ws = worldSize();
    S.fansEl.innerHTML = '';
    S.rd.fans.forEach(function (f, i) {
      var sz = 34 + Math.max(0, Math.min(1, (f.spot[1] - 400) / 540)) * 26;    // 아래쪽(가까운 곳)일수록 크게
      var el = document.createElement('div');
      el.className = 'sq-fan';
      el.setAttribute('data-i', i);
      el.style.cssText = 'position:absolute;left:' + (f.spot[0] / IMG_W * 100) + '%;top:' + (f.spot[1] / IMG_H * 100) + '%;width:' + (sz * 1.5 / IMG_W * 100) + '%;transform:translate(-50%,-92%);cursor:pointer;touch-action:none;';
      el.innerHTML = fanSvg(f);
      f.el = el;
      S.fansEl.appendChild(el);
    });
    applyPan();
  }

  function renderPanel() {
    var p = $('sq-panel');
    var hearts = '';
    for (var i = 0; i < TRIES; i++) hearts += (i < S.tries ? '❤️' : '🖤');
    p.innerHTML =
      '<div style="font-size:11px;color:#FFB3CC;font-weight:700;margin-bottom:4px;">📋 팬 찾기 의뢰</div>' +
      '<div style="font-size:14px;font-weight:700;line-height:1.55;margin-bottom:10px;">' + S.rd.clue + '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<div style="font-size:15px;letter-spacing:2px;">' + hearts + '</div>' +
        '<div style="flex:1;font-size:10px;color:#aaa;">그림을 밀어서 움직여요 · 팬을 탭!</div>' +
        '<button id="sq-hint" style="background:' + (S.hinted ? 'rgba(255,255,255,.08)' : 'rgba(255,215,0,.18)') + ';border:1.5px solid ' + (S.hinted ? 'rgba(255,255,255,.2)' : '#FFD700') + ';border-radius:12px;color:#fff;padding:8px 12px;font-size:12px;font-weight:900;cursor:pointer;font-family:inherit;">' + (S.hinted ? '힌트 사용함' : '💡 힌트 🍔' + HINT_COST) + '</button></div>';
    $('sq-hint').onclick = useHint;
  }

  function useHint() {
    if (!S || S.busy || S.hinted) return;
    if (typeof coins === 'undefined' || coins < HINT_COST) { toast('코인이 부족해요! 🍔 ' + HINT_COST + ' 필요'); return; }
    coins -= HINT_COST;
    if (typeof saveAll === 'function') saveAll();
    if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
    S.hinted = true;
    var wrong = S.rd.fans.filter(function (f) { return !f.answer && !f.dim; });
    shuffle(wrong, Math.random).slice(0, HINT_REMOVE).forEach(function (f) { f.dim = true; f.el.style.opacity = '.28'; f.el.style.pointerEvents = 'none'; });
    renderPanel();
    toast('💡 틀린 팬 ' + HINT_REMOVE + '명이 흐려졌어요!');
  }

  function ring(el, color) {
    var r = document.createElement('div');
    r.style.cssText = 'position:absolute;left:50%;top:50%;width:140%;aspect-ratio:1;border-radius:50%;border:3px solid ' + color + ';transform:translate(-50%,-50%);box-shadow:0 0 14px ' + color + ';pointer-events:none;';
    el.appendChild(r);
  }
  function say(text, color) {
    var m = document.createElement('div');
    m.style.cssText = 'position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);z-index:8;background:rgba(0,0,0,.75);border:2px solid ' + color + ';border-radius:16px;padding:12px 18px;font-size:16px;font-weight:900;text-align:center;pointer-events:none;';
    m.innerHTML = text;
    S.view.appendChild(m);
    setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 1500);
  }

  function onPick(i, el) {
    if (!S || S.busy || S.ended) return;
    var f = S.rd.fans[i];
    if (!f || f.dim) return;
    if (judge(f)) {
      S.busy = true;
      ring(el, '#4ade80');
      S.okCount++;
      var lines = giveFanReward(S.okCount === ROUNDS && S.round === ROUNDS && S.okCount === ROUNDS);
      say('🎉 찾았어요!<br><span style="font-size:12px;color:#FFD700;">' + lines.join(' · ') + '</span>', '#4ade80');
      setTimeout(advance, 1600);
    } else {
      S.tries--;
      ring(el, '#f87171');
      el.style.opacity = '.4'; el.style.pointerEvents = 'none';
      if (S.tries <= 0) {
        S.busy = true;
        var ans = S.rd.fans.filter(function (x) { return x.answer; })[0];
        if (ans) ring(ans.el, '#facc15');
        say('😢 이 팬이 아니었어요…<br><span style="font-size:12px;color:#ddd;">정답은 노란 원 안의 팬!</span>', '#f87171');
        setTimeout(advance, 1900);
      } else {
        say('앗, 다른 팬이에요! 기회 ' + S.tries + '번 남음', '#f87171');
        renderPanel();
      }
    }
  }

  function advance() {
    if (!S || S.ended) return;
    if (S.round >= ROUNDS) finish(false); else nextRound();
  }

  // 보상: 재료 3개 (기존 탐험 보상 로직 그대로). 3건 다 맞히면 마지막 보상에 희귀 재료 보너스
  function giveFanReward(allClear) {
    var lines = [];
    var drops = [];
    for (var i = 0; i < DROPS_PER_FAN; i++) drops.push(rollDrop(S.luck, false));
    if (allClear) drops.push(rollDrop(S.luck, true));
    drops.forEach(function (d) {
      var dummy = document.createElement('div');
      S.ov.appendChild(dummy);
      var before = exploreCollected.length;
      collectExploreItem(0, { name: d.name, isWish: d.isWish, isRare: d.isRare }, dummy);
      var label = d.isWish ? '🧩 소원의 조각' : (exploreCollected.length > before ? exploreCollected[exploreCollected.length - 1] : d.name);
      S.collected.push(label);
      lines.push(label);
    });
    if (allClear) lines.push('✨보너스');
    return lines;
  }

  // ── 종료 / 결과 ──
  function finish(early) {
    if (!S || S.ended) return;
    S.ended = true;
    window.removeEventListener('resize', onResize);
    var got = S.collected.slice(), ov = S.ov, ok = S.okCount;

    if (Math.random() < STONE_DROP && typeof addToBag === 'function') {
      if (addToBag('🔹', '재조합석', 'material', 1, '카드 재조합에 필요한 재료')) { got.push('🔹 재조합석'); exploreCollected.push('🔹 재조합석'); }
    }
    if (typeof saveAll === 'function') saveAll();
    var counts = {}, order = [];
    got.forEach(function (n) { if (!(n in counts)) { counts[n] = 0; order.push(n); } counts[n]++; });
    var list = order.length ? order.map(function (n) { return n + (counts[n] > 1 ? ' ×' + counts[n] : ''); }).join('<br>') : '아무것도 못 얻었어요 😢';
    var left = (typeof stamina !== 'undefined') ? stamina : '?';
    S = null;
    ov.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.78);">' +
      '<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FF6B9D;border-radius:20px;padding:26px 22px;text-align:center;width:85%;max-width:300px;">' +
      '<div style="font-size:36px;margin-bottom:6px;">🔍</div>' +
      '<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:6px;">팬 찾기 끝!</div>' +
      '<div style="font-size:13px;color:#FFB3CC;margin-bottom:6px;">찾은 팬 ' + ok + '/' + ROUNDS + (ok === ROUNDS ? ' · 전부 성공! 🎉' : '') + '</div>' +
      '<div style="font-size:12px;color:#aaa;margin-bottom:8px;">스태미나 -' + STAMINA_COST + ' (잔여: ' + left + ')</div>' +
      '<div style="font-size:14px;color:#FFD700;line-height:1.7;margin-bottom:16px;">' + list + '</div>' +
      '<button id="sq-again" style="width:100%;padding:13px;margin-bottom:8px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">한 번 더! (⚡' + STAMINA_COST + ')</button>' +
      '<button id="sq-close" style="width:100%;padding:12px;background:rgba(255,255,255,0.1);border:none;border-radius:12px;color:#ccc;font-size:14px;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">확인</button>' +
      '</div></div>';
    $('sq-close').onclick = function () { ov.remove(); };
    $('sq-again').onclick = function () { ov.remove(); startSquare(); };
  }

  window.startSquare = startSquare;
  window.__squareTest = { makeRound: makeRound, judge: judge, rollDrop: rollDrop, SPOTS: SPOTS, get S() { return S; } };

  // ── 광장 "탐험" 버튼만 새 탐험으로 연결 (game.js는 건드리지 않음) ──
  (function hookStartExplore() {
    if (typeof window.startExplore !== 'function' || typeof window.collectExploreItem !== 'function') { setTimeout(hookStartExplore, 50); return; }
    if (window.__squareHooked) return;
    window.__squareHooked = true;
    var original = window.startExplore;
    window.startExplore = function (placeId) {
      if (placeId === 'square') { startSquare(); return; }
      return original.apply(this, arguments);
    };
  })();
})();
