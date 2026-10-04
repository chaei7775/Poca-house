// ════════════════════════════════
// 🎬 방송국 앞 원정 (broadcast-expedition.js)
//
// 특별탐험 장소 목록에 '방송국 앞'을 하나 더 넣는다.
// 이 장소만 생물/먹이 대신 새 방식으로 진행하고, 천공성 유적·달빛 회랑·공방 지하는 그대로다.
//
// 방식
//  - 지도 아무 데나 누르면 캐릭터(얼굴 + 얼굴에 붙은 카드)가 그쪽으로 걸어간다.
//  - 지도 곳곳에 ❗가 떠 있고, 걸어가서 닿으면 이벤트가 시작된다 (뭐가 나올지는 닿아봐야 안다).
//      📸 셔터 찬스(타이밍 게이지) / 💌 팬레터(3번 탭) / 🎁 굿즈 상자(3개 중 고르기)
//  - 이벤트가 끝날 때마다 가끔 특별 이벤트가 뜬다 (제한시간 있음, 놓치면 사라짐)
//      🌟 황금 셔터(레어 목격정보) / 🔥 레전드 순간(5초 연타)
//  - 이벤트 1번 = 스태미나 30 (맵에서 걷는 건 공짜)
//  - 보상: 코인 / 카드 경험치 / 특별탐험 재료 / 촬영 소품 / 🖼️ 프리미엄 조각
//    프리미엄 조각은 가방에 쌓인다 (100개 = 프리미엄 카드 1장, 교환은 다음 단계에서 만든다)
//
// 값을 바꾸고 싶으면 아래 [설정]만 고치면 된다. game.js / special-explore.js는 건드리지 않는다.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var LOC_ID = 'broadcast_front';
  var BG_URL = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/special-broadcast_front.png';
  var IMG_W = 941, IMG_H = 1672;      // 배경 이미지 크기 (불러오면 실제 크기로 갱신)
  var STAMINA_COST = 30;              // 이벤트 1번당 스태미나
  var SPEED = 200;                    // 걷는 속도 (px/초)
  var HIT_R = 36;                     // 이 거리 안으로 들어가면 이벤트 시작 (px)
  var NORMAL_MAX = 2;                 // 지도에 동시에 떠 있는 ❗ 수
  var RARE_CHANCE = 0.08;             // 이벤트 끝날 때 황금 셔터가 뜰 확률
  var LEGEND_CHANCE = 0.02;           // 이벤트 끝날 때 레전드 순간이 뜰 확률
  var RARE_TTL = 30, LEGEND_TTL = 25; // 특별 이벤트 제한시간 (초)
  var LEGEND_NEED = 22, LEGEND_SEC = 5; // 레전드: 5초 안에 22번 탭
  var WEIGHTS = { shutter: 45, letter: 25, goods: 30 };   // 일반 이벤트가 나올 비율
  var HIDE_OLD_SPECIAL = true;        // true: 기존 특별 탐험(배너·3곳·도감 버튼)을 맵 화면에서 숨김. 되돌리려면 false
  // 등교권/등교권 조각 드랍 확률 (기존 특별탐험: 일반 0.2%/5%, 변종 3%/15% 를 이벤트 등급에 맞춰 옮김)
  var TICKET = {
    shutter: [0.002, 0.05], letter: [0.002, 0.05], goods: [0.002, 0.05],
    golden: [0.03, 0.15], legend: [0.05, 0.25]
  };
  // 특별 NPC (이미지 npc-xxx.png 를 repo 맨 위 폴더에 올리면 자동 적용, 없으면 이모지로 표시)
  // weak = 좋아하는 촬영도구(net 카메라 / spray 무드조명 / scent 분위기 향수)
  var NPCS = [
    { id: 'paparazzi', name: '열혈 파파라치', emoji: '🕶️', img: 'npc-paparazzi.png', weak: 'scent' },
    { id: 'pd',        name: '깐깐한 PD',     emoji: '🎙️', img: 'npc-pd.png',        weak: 'net' },
    { id: 'star',      name: '월드스타 게스트', emoji: '🌟', img: 'npc-star.png',      weak: 'spray' }
  ];
  var NPC_GAUGE = 120;          // NPC 경계 게이지
  var NPC_HIT_RIGHT = 40;       // 좋아하는 도구를 썼을 때 깎이는 양
  var NPC_HIT_WRONG = 20;       // 다른 도구를 썼을 때 깎이는 양
  var NPC_FLEE = 0.12;          // 도구 한 번 쓸 때 NPC가 떠날 기본 확률 (소품 '도망확률 감소' 적용)
  var NPC_CATCH = 0.50;         // 게이지를 다 깎은 뒤 촬영 성공 기본 확률 (소품 '촬영확률 증가' 적용)
  var PIECE_NAME = '프리미엄 조각', OLD_PIECE_NAME = '화보 조각', PIECE_EMOJI = '🖼️', PIECE_GOAL = 100;
  var IMG_BASE = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/';
  var BUST = '?v=' + Date.now();   // 이미지를 올리기 전에 한 번 404가 났어도 옛 결과가 캐시에서 안 나오게
  var FACE_FILES = {      // 걸어다니는 얼굴 이미지 (repo 맨 위 폴더에 올리면 자동 적용)
    minjun: 'face-minjun.png', sion: 'face-sion.png', doyun: 'face-doyun.png',
    harin: 'face-harin.png', yuna: 'face-yuna.png', ara: 'face-ara.png'
  };
  var FACE_POS = '50% 14%', FACE_ZOOM = '250%';           // 얼굴 동그라미에 카드 이미지를 어떻게 잘라 보여줄지

  // 지도 위 위치 (이미지 가로/세로를 0~1로 본 값)
  var START = { x: 0.51, y: 0.80 };
  var NORMAL_SPOTS = [
    { x: 0.84, y: 0.61 },  // 포토존 앞
    { x: 0.77, y: 0.42 },  // 카페 테라스
    { x: 0.32, y: 0.43 },  // 분수 왼쪽
    { x: 0.21, y: 0.62 },  // 굿즈 천막 앞
    { x: 0.24, y: 0.47 },  // 정원 파고라 앞
    { x: 0.29, y: 0.32 },  // 방송차 앞
    { x: 0.50, y: 0.59 },  // 광장 별 타일
    { x: 0.28, y: 0.74 },  // 벚나무 키오스크
    { x: 0.51, y: 0.26 }   // 정문 보라 카펫
  ];
  var RARE_SPOTS = [
    { x: 0.24, y: 0.27, label: '방송차 앞' },
    { x: 0.78, y: 0.40, label: '카페 테라스' },
    { x: 0.84, y: 0.61, label: '포토존' }
  ];
  var LEGEND_SPOT = { x: 0.51, y: 0.235, label: '정문 앞' };
  var BOUNDS = { x0: 0.06, x1: 0.94, y0: 0.21, y1: 0.85 };

  // 평균 조각 계산용 (실제 플레이어가 이 정도 비율로 성공한다고 가정)
  var GRADE_DIST = {
    shutter: { PERFECT: 0.28, GREAT: 0.37, GOOD: 0.10, MISS: 0.25 },
    golden:  { PERFECT: 0.15, GREAT: 0.32, GOOD: 0.13, MISS: 0.40 },
    legend:  { SUCCESS: 0.60, PARTIAL: 0.25, FAIL: 0.15 }
  };

  var S = null;   // 지금 진행 중인 원정 상태
  var NPC_READY = {};   // 미리 불러온 NPC 이미지 (불러오기 끝난 것만 true)
  function preloadNpcs() {
    NPCS.forEach(function (n) {
      if (NPC_READY[n.id] !== undefined) return;
      NPC_READY[n.id] = false;
      var im = new Image();
      im.onload = function () { NPC_READY[n.id] = true; };
      im.src = IMG_BASE + n.img + BUST;
    });
  }

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function toast(msg) { if (typeof showBagToast === 'function') showBagToast(msg); }

  // ════════ 순수 로직 (보상 표) ════════
  function pickNormal(rnd) {
    rnd = rnd || Math.random;
    var total = WEIGHTS.shutter + WEIGHTS.letter + WEIGHTS.goods;
    var r = rnd() * total;
    if (r < WEIGHTS.shutter) return 'shutter';
    if (r < WEIGHTS.shutter + WEIGHTS.letter) return 'letter';
    return 'goods';
  }

  function rewardFor(type, grade, rnd) {
    rnd = rnd || Math.random;
    var r = { coins: 0, exp: 0, pieces: 0, mats: 0, gear: 0 };
    var jitter = 0.8 + rnd() * 0.4;
    var mult = { PERFECT: 2, GREAT: 1.5, GOOD: 1, MISS: 0 }[grade] || 0;
    if (type === 'shutter') {
      r.coins = Math.round(40 * mult * jitter);
      r.exp = { PERFECT: 90, GREAT: 60, GOOD: 40, MISS: 0 }[grade] || 0;
      var pc = { PERFECT: 0.45, GREAT: 0.30, GOOD: 0.12, MISS: 0 }[grade] || 0;
      if (rnd() < pc) r.pieces = 1;
      r.mats = (mult > 0 && rnd() < 0.5) ? 1 : 0;
      r.gear = mult > 0 ? 0.02 : 0;
    } else if (type === 'golden') {
      r.coins = Math.round(120 * mult * jitter);
      r.exp = { PERFECT: 180, GREAT: 120, GOOD: 80, MISS: 0 }[grade] || 0;
      r.pieces = grade === 'PERFECT' ? 2 : grade === 'GREAT' ? 1 : (grade === 'GOOD' && rnd() < 0.5) ? 1 : 0;
      r.mats = mult > 0 ? 1 : 0;
      r.gear = mult > 0 ? 0.10 : 0;
    } else if (type === 'letter') {
      r.coins = Math.round(30 + rnd() * 50);
      r.exp = 30;
      r.mats = rnd() < 0.6 ? 1 : 0;
      r.gear = 0.02;
    } else if (type === 'goods') {
      r.coins = Math.round(20 + rnd() * 40);
      r.exp = 30;
      r.mats = rnd() < 0.6 ? 1 : 0;
      r.gear = 0.03;
      if (rnd() < 0.06) r.pieces = 1;
    } else if (type === 'legend') {
      if (grade === 'SUCCESS')      { r.coins = 300; r.exp = 300; r.pieces = 5; r.mats = 2; r.gear = 1; r.gearMin = 'great'; }
      else if (grade === 'PARTIAL') { r.coins = 120; r.exp = 150; r.pieces = 2; r.mats = 1; r.gear = 0.08; }
      else                          { r.coins = 30;  r.exp = 30; }
    }
    return r;
  }

  function pickGrade(table, rnd) {
    var r = rnd(), acc = 0, last = null;
    for (var k in table) { last = k; acc += table[k]; if (r < acc) return k; }
    return last;
  }

  // 이벤트 n번 했을 때 프리미엄 조각 평균 (특별 이벤트가 뜨면 항상 잡는다고 가정)
  function simulate(n, rnd) {
    rnd = rnd || Math.random;
    var total = 0, special = null;
    for (var i = 0; i < n; i++) {
      var type = special || pickNormal(rnd);
      special = null;
      var grade = (type === 'letter' || type === 'goods') ? 'OPEN' : pickGrade(GRADE_DIST[type], rnd);
      total += rewardFor(type, grade, rnd).pieces;
      var r = rnd();
      if (r < LEGEND_CHANCE) special = 'legend';
      else if (r < LEGEND_CHANCE + RARE_CHANCE) special = 'golden';
    }
    return total / n;
  }

  // ════════ 스타일 ════════
  function injectStyle() {
    if ($('bc-style')) return;
    var st = document.createElement('style');
    st.id = 'bc-style';
    st.textContent =
      '@keyframes bcPulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.18)}}' +
      '@keyframes bcBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}' +
      '@keyframes bcRipple{0%{opacity:.9;transform:translate(-50%,-50%) scale(.3)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.5)}}' +
      '@keyframes bcShake{0%,100%{transform:rotate(0)}25%{transform:rotate(-10deg) scale(1.1)}75%{transform:rotate(10deg) scale(1.1)}}' +
      '@keyframes bcPop{0%{opacity:0;transform:translateY(12px) scale(.7)}60%{opacity:1;transform:translateY(-2px) scale(1.05)}100%{opacity:1;transform:translateY(0) scale(1)}}' +
      '@keyframes bcFlash{0%{opacity:.85}100%{opacity:0}}' +
      '.bc-moving .bc-face{animation:bcBob .35s ease-in-out infinite}';
    document.head.appendChild(st);
  }

  // ════════ 화면 ════════
  function layout() {
    var view = $('bc-view'), world = $('bc-world');
    if (!view || !world) return;
    var cw = view.clientWidth, ch = view.clientHeight;
    if (!cw || !ch) return;
    var scale = Math.max(cw / IMG_W, ch / IMG_H);
    var w = IMG_W * scale, h = IMG_H * scale;
    world.style.width = w + 'px';
    world.style.height = h + 'px';
    world.style.left = ((cw - w) / 2) + 'px';
    world.style.top = ((ch - h) / 2) + 'px';
  }

  function worldSize() {
    var w = $('bc-world');
    return { w: (w && w.offsetWidth) || 1, h: (w && w.offsetHeight) || 1 };
  }

  function pxDist(ax, ay, bx, by) {
    var ws = worldSize();
    var dx = (ax - bx) * ws.w, dy = (ay - by) * ws.h;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function buildPlayer(ch) {
    var url = 'url("' + encodeURI(ch.img || '') + '")';
    var wrap = document.createElement('div');
    wrap.id = 'bc-player';
    wrap.style.cssText = 'position:absolute;transform:translate(-50%,-50%);z-index:20;pointer-events:none;';
    var face = document.createElement('div');
    face.className = 'bc-face';
    var cropCss = 'background-color:#222;background-image:' + url + ';background-repeat:no-repeat;background-size:' + FACE_ZOOM + ' auto;background-position:' + FACE_POS + ';';
    face.style.cssText = 'width:50px;height:50px;border-radius:50%;border:3px solid ' + (ch.gradeColor || '#fff') + ';overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,.55);' + cropCss;
    var faceFile = FACE_FILES[ch.id || ''];
    if (faceFile) {
      // 얼굴 전용 이미지가 있으면 그걸 쓰고, 파일이 없으면 카드 이미지 크롭 그대로 보여줌
      var fi = new Image();
      fi.onload = function () {
        face.style.backgroundImage = 'url("' + encodeURI(IMG_BASE + faceFile + BUST) + '")';
        face.style.backgroundSize = '112% auto';
        face.style.backgroundPosition = 'center';
        face.style.backgroundColor = '#fff';
      };
      fi.src = IMG_BASE + faceFile + BUST;
    }
    var card = document.createElement('div');
    card.style.cssText = 'position:absolute;right:-22px;top:-32px;width:28px;height:40px;border-radius:5px;border:2px solid #fff;' +
      'background-image:' + url + ';background-size:cover;background-position:center;transform:rotate(12deg);box-shadow:0 2px 8px rgba(0,0,0,.6);';
    wrap.appendChild(face);
    wrap.appendChild(card);
    return wrap;
  }

  function placePlayer() {
    var p = $('bc-player');
    if (!p || !S) return;
    p.style.left = (S.px * 100) + '%';
    p.style.top = (S.py * 100) + '%';
    p.classList.toggle('bc-moving', !!S.moving);
  }

  function hud() {
    var el = $('bc-stam');
    if (el && typeof stamina !== 'undefined') el.textContent = '⚡ ' + stamina + '/' + (typeof STAMINA_MAX !== 'undefined' ? STAMINA_MAX : '') + ' · 이벤트 ⚡' + STAMINA_COST;
  }

  var bannerTimer = null;
  function banner(text) {
    var b = $('bc-banner');
    if (!b) return;
    b.textContent = text;
    b.style.display = 'block';
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { var bb = $('bc-banner'); if (bb) bb.style.display = 'none'; }, 4800);
  }

  function panel(html) {
    var p = $('bc-panel');
    if (!p) {
      p = document.createElement('div');
      p.id = 'bc-panel';
      p.style.cssText = 'position:absolute;left:10px;right:10px;bottom:14px;z-index:40;background:linear-gradient(135deg,rgba(26,26,46,.97),rgba(45,27,78,.97));' +
        'border:2px solid #C084FC;border-radius:20px;padding:16px 14px;text-align:center;color:#fff;box-shadow:0 8px 30px rgba(0,0,0,.65);font-family:\'Noto Sans KR\',sans-serif;';
      $('bc-view').appendChild(p);
    }
    p.innerHTML = html;
    return p;
  }
  function closePanel() { var p = $('bc-panel'); if (p) p.remove(); }

  var BTN = 'width:100%;padding:13px;border:none;border-radius:13px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;background:linear-gradient(135deg,#FF6B9D,#C084FC);';

  function flash() {
    var v = $('bc-view');
    if (!v) return;
    var f = document.createElement('div');
    f.style.cssText = 'position:absolute;inset:0;background:#fff;z-index:35;pointer-events:none;animation:bcFlash .35s ease-out forwards;';
    v.appendChild(f);
    setTimeout(function () { f.remove(); }, 380);
  }

  // ════════ 이벤트(마커) ════════
  function markerFor(ev) {
    var el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:' + (ev.x * 100) + '%;top:' + (ev.y * 100) + '%;transform:translate(-50%,-50%);z-index:10;pointer-events:none;animation:bcPulse 1s ease-in-out infinite;text-align:center;';
    if (ev.kind === 'normal') {
      el.innerHTML = '<div style="width:34px;height:34px;border-radius:50%;background:#fff;border:3px solid #FF6B9D;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 14px #FF6B9D;">❗</div>';
    } else {
      var legend = ev.type === 'legend';
      el.innerHTML = '<div style="width:48px;height:48px;border-radius:50%;background:' + (legend ? 'linear-gradient(135deg,#ff5a36,#ffb703)' : 'linear-gradient(135deg,#FFD700,#FF9F43)') +
        ';border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 0 20px #FFD700;">' + (legend ? ((ev.npc && !NPC_READY[ev.npc.id] && ev.npc.emoji) || (ev.npc ? '' : '🔥')) : '🌟') + '</div>' +
        '<div class="bc-ttl" style="margin-top:2px;font-size:11px;font-weight:900;color:#fff;text-shadow:0 1px 4px #000;"></div>';
    }
    $('bc-layer').appendChild(el);
    ev.el = el;
    if (ev.type === 'legend' && ev.npc) {
      var mk = el.firstChild, pi = new Image();
      var showPhoto = function () {
        if (!mk) return;
        mk.textContent = '';
        mk.style.backgroundImage = 'url("' + IMG_BASE + ev.npc.img + BUST + '")';
        mk.style.backgroundSize = 'cover';
        mk.style.backgroundPosition = '50% 20%';
        mk.style.borderColor = '#ff3b30';
      };
      if (NPC_READY[ev.npc.id]) showPhoto(); else { pi.onload = showPhoto; pi.src = IMG_BASE + ev.npc.img + BUST; }
    }
  }

  function removeEvent(ev) {
    if (ev.el && ev.el.parentNode) ev.el.parentNode.removeChild(ev.el);
    var i = S.events.indexOf(ev);
    if (i !== -1) S.events.splice(i, 1);
  }

  function spawnNormal() {
    var used = S.events.map(function (e) { return e.spot; });
    var cand = NORMAL_SPOTS.filter(function (s) { return used.indexOf(s) === -1; });
    var far = cand.filter(function (s) { return pxDist(s.x, s.y, S.px, S.py) > 90; });
    if (far.length) cand = far;
    cand.sort(function (a, b) { return pxDist(a.x, a.y, S.px, S.py) - pxDist(b.x, b.y, S.px, S.py); });
    var spot = cand[Math.floor(Math.random() * Math.min(4, cand.length))];
    if (!spot) return;
    var ev = { kind: 'normal', type: pickNormal(), x: spot.x, y: spot.y, spot: spot, skip: false };
    S.events.push(ev);
    markerFor(ev);
  }

  function fillNormals() {
    var n = S.events.filter(function (e) { return e.kind === 'normal'; }).length;
    var guard = 0;
    while (n < NORMAL_MAX && guard++ < 6) { spawnNormal(); n++; }
  }

  function hasSpecial() { return S.events.some(function (e) { return e.kind === 'special'; }); }

  function spawnSpecial(type) {
    var legend = type === 'legend';
    var spot = legend ? LEGEND_SPOT : RARE_SPOTS[Math.floor(Math.random() * RARE_SPOTS.length)];
    var ttl = legend ? LEGEND_TTL : RARE_TTL;
    var ev = { kind: 'special', type: legend ? 'legend' : 'golden', x: spot.x, y: spot.y, spot: spot, ttl: ttl, skip: false };
    if (legend) ev.npc = NPCS[Math.floor(Math.random() * NPCS.length)];
    S.events.push(ev);
    markerFor(ev);
    var name = (typeof CHARS !== 'undefined' && CHARS[S.charId]) ? CHARS[S.charId].name : '아이돌';
    banner(legend ? ('🚨 특별 NPC 출현! ' + ev.npc.emoji + ' ' + ev.npc.name + '이(가) ' + spot.label + '에 나타났어요! (' + ttl + '초)')
                  : ('🚨 레어 목격정보! ' + spot.label + '에서 ' + name + ' 포착! (' + ttl + '초)'));
  }

  function afterEvent() {
    fillNormals();
    if (!hasSpecial()) {
      var r = Math.random();
      var npcChance = LEGEND_CHANCE * (1 + gearVal(S.charId, 'variant') / 100);   // 소품 '변종 출현' = NPC 출현 확률 증가
      if (r < npcChance) spawnSpecial('legend');
      else if (r < npcChance + RARE_CHANCE) spawnSpecial('golden');
    }
  }

  // ════════ 보상 지급 ════════
  function giveCardExp(charId, amt) {
    if (amt <= 0) return;
    if (typeof addCardExp === 'function') { addCardExp(charId, amt); return; }
    try {
      var d = JSON.parse(localStorage.getItem('ph_cardExp') || '{}');
      d[charId] = (d[charId] || 0) + amt;
      localStorage.setItem('ph_cardExp', JSON.stringify(d));
    } catch (e) {}
  }

  function pieceCount() {
    if (typeof bagItems === 'undefined') return 0;
    var it = bagItems.find(function (i) { return i.name === PIECE_NAME; });
    return it ? it.qty : 0;
  }

  function dropGear(minGrade) {
    if (typeof SPECIAL_GEAR === 'undefined' || typeof SPECIAL_GEAR_GRADES === 'undefined') return null;
    var roll = Math.random();
    var grade = roll < 0.001 ? 'legend' : roll < 0.01 ? 'rare' : roll < 0.05 ? 'great' : 'common';
    if (minGrade === 'great' && grade === 'common') grade = 'great';   // 특별 NPC 성공: 고급 이상 확정
    var g = SPECIAL_GEAR[Math.floor(Math.random() * SPECIAL_GEAR.length)];
    var label = SPECIAL_GEAR_GRADES[grade];
    var eff = gearEffectText(g.effect, gearScaledValue(g, grade));
    if (!addToBag(g.emoji, '[' + label + '] ' + g.name, 'gear', 1, '특별탐험 촬영 소품 · ' + eff)) return null;
    return { icon: g.emoji, text: '[' + label + '] ' + g.name + ' (' + eff + ')', color: '#C084FC' };
  }

  function gearOf(charId) {
    try { return (typeof getEquippedGearFor === 'function') ? getEquippedGearFor(charId) : null; } catch (e) { return null; }
  }
  function gearVal(charId, effect) {
    var g = gearOf(charId);
    return (g && g.effect === effect) ? g.value : 0;
  }
  function toolQty(tool) {
    if (typeof bagItems === 'undefined') return 0;
    var it = bagItems.find(function (i) { return i.name === tool.name && i.type === 'tool'; });
    return it ? it.qty : 0;
  }

  function addTicket() {
    if (typeof schoolDaily === 'undefined') return;
    schoolDaily.tickets = (schoolDaily.tickets || 0) + 1;
    if (typeof saveSchoolDaily === 'function') saveSchoolDaily();
  }

  // 기존 특별탐험과 같은 방식: 등교권 직접 드랍, 아니면 조각(10개 = 등교권 1장)
  function ticketDrop(type) {
    var t = TICKET[type];
    if (!t) return null;
    if (Math.random() < t[0]) { addTicket(); return { icon: '🎫', text: '등교권 +1', color: '#60A5FA' }; }
    if (Math.random() < t[1]) {
      if (typeof addToBag === 'function') addToBag('🎫', '등교권 조각', 'ticket_fragment', 1, '10개 모으면 등교권 1장으로 교환!');
      var cnt = 0;
      try { var st = JSON.parse(localStorage.getItem('ph_ticketFragments') || '0'); cnt = (typeof st === 'number' ? st : 0) + 1; } catch (e) { cnt = 1; }
      if (cnt >= 10) {
        cnt = 0; addTicket();
        try { localStorage.setItem('ph_ticketFragments', JSON.stringify(0)); } catch (e) {}
        return { icon: '🎫', text: '등교권 +1 (조각 10개 완성!)', color: '#60A5FA' };
      }
      try { localStorage.setItem('ph_ticketFragments', JSON.stringify(cnt)); } catch (e) {}
      return { icon: '🎫', text: '등교권 조각 +1', color: '#60A5FA' };
    }
    return null;
  }

  function grant(r) {
    var lines = [];
    if (r.coins > 0) {
      coins += r.coins;
      lines.push({ icon: '🍔', text: '+' + r.coins + ' 코인', color: '#FFD700' });
    }
    if (r.exp > 0) {
      giveCardExp(S.charId, r.exp);
      var nm = (typeof CHARS !== 'undefined' && CHARS[S.charId]) ? CHARS[S.charId].name : '';
      lines.push({ icon: '⭐', text: nm + ' +' + r.exp + ' EXP', color: '#FFD700' });
    }
    if (r.pieces > 0) {
      if (addToBag(PIECE_EMOJI, PIECE_NAME, 'piece', r.pieces, '프리미엄 카드 조각 · ' + PIECE_GOAL + '개를 모으면 프리미엄 카드 1장 (교환은 곧 열려요)')) {
        var have = pieceCount();
        lines.push({ icon: PIECE_EMOJI, text: PIECE_NAME + ' +' + r.pieces + ' (' + have + '/' + PIECE_GOAL + ')', color: '#7dd3fc' });
        if (have >= PIECE_GOAL) toast('🖼️ 프리미엄 조각 ' + PIECE_GOAL + '개 달성! 프리미엄 카드 교환은 곧 열려요');
      }
    }
    for (var i = 0; i < r.mats; i++) {
      if (typeof SPECIAL_JAPTEM === 'undefined') break;
      var m = SPECIAL_JAPTEM[Math.floor(Math.random() * SPECIAL_JAPTEM.length)];
      if (addToBag(m.emoji, m.name, 'material', 1, '특별탐험 재료')) lines.push({ icon: m.emoji, text: m.name + ' x1', color: '#fff' });
    }
    if (r.gear > 0 && Math.random() < r.gear) {
      var g = dropGear(r.gearMin);
      if (g) lines.push(g);
    }
    var tix = r.ticketOf ? ticketDrop(r.ticketOf) : null;
    if (tix) lines.push(tix);
    if (typeof saveAll === 'function') saveAll();
    if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
    hud();
    return lines;
  }

  function finish(ev, type, grade) {
    var r = rewardFor(type, grade);
    if (grade !== 'MISS' && grade !== 'FAIL') r.ticketOf = type;
    var lines = grant(r);
    var heads = {
      PERFECT: '✨ PERFECT!', GREAT: '👍 GREAT!', GOOD: '😊 GOOD', MISS: '💦 MISS…',
      OPEN: type === 'letter' ? '💌 팬레터 도착!' : '🎁 굿즈 획득!',
      SUCCESS: '🎉 특별 NPC 촬영 성공!', PARTIAL: '😮 아깝다!', FAIL: '💨 놓쳤어요…'
    };
    var head = (type === 'golden' ? '🌟 ' : type === 'shutter' ? '📸 ' : '') + (heads[grade] || '');
    var chips = lines.map(function (l, i) {
      return '<div style="opacity:0;animation:bcPop .45s ease-out forwards;animation-delay:' + (i * 0.18) + 's;display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.1);border:1.5px solid ' + l.color +
        ';border-radius:999px;padding:7px 14px;font-size:13px;font-weight:900;margin:3px;"><span style="font-size:16px;">' + l.icon + '</span>' + l.text + '</div>';
    }).join('');
    panel('<div style="font-size:19px;font-weight:900;margin-bottom:8px;">' + head + '</div>' +
      '<div style="margin-bottom:10px;">' + (chips || '<div style="font-size:12px;color:#aaa;">얻은 게 없어요</div>') + '</div>' +
      '<button id="bc-next" style="' + BTN + '">계속 탐험하기</button>');
    $('bc-next').onclick = function () { closeEvent(ev); };
  }

  function closeEvent(ev) {
    if (!S) return;
    closePanel();
    removeEvent(ev);
    S.current = null;
    S.paused = false;
    afterEvent();
  }

  // ════════ 미니게임 ════════
  function band(c, half, color) {
    return '<div style="position:absolute;top:0;bottom:0;left:' + (c - half) + '%;width:' + (half * 2) + '%;background:' + color + ';"></div>';
  }

  function gaugeGame(ev, golden) {
    var c = 30 + Math.random() * 40;
    var Z = golden ? { p: 3, g: 7, o: 10 } : { p: 5, g: 11, o: 14 };
    var spd = golden ? 150 : 105;
    var pos = 0, dir = 1, raf = 0, last = 0, locked = false;
    panel('<div style="font-size:17px;font-weight:900;margin-bottom:3px;">' + (golden ? '🌟 황금 셔터!' : '📸 셔터 찬스!') + '</div>' +
      '<div style="font-size:12px;color:#ddd;margin-bottom:10px;">' + (golden ? '칸이 아주 좁아요! ' : '') + '노란 칸에 맞춰 찰칵!</div>' +
      '<div id="bc-gauge" style="position:relative;height:30px;border-radius:15px;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.25);overflow:hidden;margin-bottom:12px;">' +
      band(c, Z.o, 'rgba(244,114,182,.35)') + band(c, Z.g, 'rgba(251,191,36,.5)') + band(c, Z.p, 'rgba(255,215,0,.98)') +
      '<div id="bc-mark" style="position:absolute;top:3px;bottom:3px;width:5px;margin-left:-2px;background:#fff;border-radius:3px;box-shadow:0 0 8px #fff;left:0%;"></div></div>' +
      '<button id="bc-shot" style="' + BTN + '">📸 찰칵!</button>');

    function loop(ts) {
      var m = $('bc-mark');
      if (!m || locked) return;
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
      last = ts;
      pos += dir * spd * dt;
      if (pos >= 100) { pos = 100; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      m.style.left = pos + '%';
      raf = requestAnimationFrame(loop);
    }
    function shoot() {
      if (locked) return;
      locked = true;
      cancelAnimationFrame(raf);
      var d = Math.abs(pos - c);
      var grade = d <= Z.p ? 'PERFECT' : d <= Z.g ? 'GREAT' : d <= Z.o ? 'GOOD' : 'MISS';
      flash();
      setTimeout(function () { if ($('bc-panel')) finish(ev, golden ? 'golden' : 'shutter', grade); }, 380);
    }
    $('bc-shot').onpointerdown = shoot;
    $('bc-gauge').onpointerdown = shoot;
    raf = requestAnimationFrame(loop);
  }

  function letterGame(ev) {
    var taps = 0, need = 3;
    panel('<div style="font-size:17px;font-weight:900;margin-bottom:3px;">💌 팬레터 꾸러미</div>' +
      '<div id="bc-letter-n" style="font-size:12px;color:#ddd;margin-bottom:6px;">탭해서 열어봐요! 0/' + need + '</div>' +
      '<div id="bc-letter" style="font-size:66px;line-height:1.2;cursor:pointer;margin-bottom:6px;user-select:none;">💌</div>');
    $('bc-letter').onpointerdown = function () {
      taps++;
      var el = $('bc-letter');
      el.style.animation = 'none'; void el.offsetWidth; el.style.animation = 'bcShake .25s';
      var n = $('bc-letter-n');
      if (n) n.textContent = '탭해서 열어봐요! ' + Math.min(taps, need) + '/' + need;
      if (taps >= need) finish(ev, 'letter', 'OPEN');
    };
  }

  function goodsGame(ev) {
    var boxes = '';
    for (var i = 0; i < 3; i++) {
      boxes += '<button class="bc-box" style="flex:1;padding:14px 0;font-size:40px;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.3);border-radius:16px;cursor:pointer;">🎁</button>';
    }
    panel('<div style="font-size:17px;font-weight:900;margin-bottom:3px;">🎁 굿즈 부스</div>' +
      '<div style="font-size:12px;color:#ddd;margin-bottom:10px;">상자 하나를 골라요!</div>' +
      '<div style="display:flex;gap:10px;">' + boxes + '</div>');
    var done = false;
    Array.prototype.forEach.call(document.querySelectorAll('.bc-box'), function (b) {
      b.onpointerdown = function () { if (done) return; done = true; finish(ev, 'goods', 'OPEN'); };
    });
  }

  function npcImgHtml(npc, size) {
    var id = 'bc-npcimg-' + npc.id;
    if (NPC_READY[npc.id]) {
      return '<div id="' + id + '"><img src="' + IMG_BASE + npc.img + BUST + '" style="height:' + size + 'px;max-width:100%;object-fit:contain;filter:drop-shadow(0 4px 10px rgba(0,0,0,.6));"></div>';
    }
    var h = '<div id="' + id + '" style="font-size:' + Math.round(size * 0.8) + 'px;line-height:1;">' + npc.emoji + '</div>';
    setTimeout(function () {
      var im = new Image();
      im.onload = function () {
        var el = $(id);
        if (el) el.innerHTML = '<img src="' + IMG_BASE + npc.img + BUST + '" style="height:' + size + 'px;max-width:100%;object-fit:contain;filter:drop-shadow(0 4px 10px rgba(0,0,0,.6));">';
      };
      im.src = IMG_BASE + npc.img + BUST;
    }, 0);
    return h;
  }

  function npcGame(ev) {
    var npc = ev.npc || NPCS[0];
    var cid = S.charId;
    var gauge = NPC_GAUGE;
    var fleeP = Math.max(0.01, NPC_FLEE * (1 - gearVal(cid, 'flee') / 100));
    var catchP = Math.min(0.95, NPC_CATCH + gearVal(cid, 'chance') / 100);
    var retries = gearVal(cid, 'retry');
    var ended = false, msg = '좋아하는 도구를 쓰면 경계심이 더 많이 풀려요!';
    var tools = (typeof CAPTURE_TOOLS !== 'undefined') ? CAPTURE_TOOLS : [];
    var weakTool = tools.find(function (t) { return t.id === npc.weak; });

    function draw() {
      if (ended) return;
      var pct = Math.max(0, Math.round(gauge / NPC_GAUGE * 100));
      var body;
      if (gauge > 0) {
        body = tools.map(function (t) {
          var q = toolQty(t);
          var right = t.id === npc.weak;
          var label = q > 0 ? (t.emoji + ' ' + t.name + ' <span style="font-size:10px;opacity:.8;">x' + q + '</span>')
                            : (t.emoji + ' ' + t.name + ' <span style="font-size:10px;opacity:.8;">구매 ' + t.price + '🍔</span>');
          return '<button class="bc-tool" data-id="' + t.id + '" style="flex:1;padding:10px 4px;border-radius:12px;font-size:12px;font-weight:900;cursor:pointer;color:#fff;font-family:\'Noto Sans KR\',sans-serif;' +
            'background:' + (right ? 'rgba(255,215,0,.18)' : 'rgba(255,255,255,.08)') + ';border:1.5px solid ' + (right ? '#FFD700' : 'rgba(255,255,255,.3)') + ';">' + label + '</button>';
        }).join('');
        body = '<div style="display:flex;gap:6px;">' + body + '</div>';
      } else {
        body = '<div style="font-size:12px;color:#FFE27A;margin-bottom:8px;">경계심이 다 풀렸어요! 지금이 기회!' + (retries > 0 ? ' (재도전 ' + retries + '회)' : '') + '</div>' +
          '<button id="bc-catch" style="' + BTN + 'background:linear-gradient(135deg,#ff5a36,#ffb703);">📸 촬영하기! (성공 ' + Math.round(catchP * 100) + '%)</button>';
      }
      panel('<div style="font-size:15px;font-weight:900;margin-bottom:2px;">🚨 ' + npc.name + '</div>' +
        '<div style="height:96px;display:flex;align-items:center;justify-content:center;margin:2px 0 6px;">' + npcImgHtml(npc, 90) + '</div>' +
        '<div style="height:16px;border-radius:8px;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.25);overflow:hidden;margin-bottom:4px;">' +
        '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#ff5a36,#ffb703);transition:width .3s;"></div></div>' +
        '<div style="font-size:10px;color:#ddd;margin-bottom:8px;">경계심 ' + pct + '% · 도구 쓸 때마다 ' + Math.round(fleeP * 100) + '% 확률로 떠나요' +
        (weakTool ? ' · 💡 ' + weakTool.name + ' 좋아함' : '') + '</div>' +
        '<div style="font-size:12px;color:#fff;margin-bottom:8px;min-height:16px;">' + msg + '</div>' + body);
      Array.prototype.forEach.call(document.querySelectorAll('.bc-tool'), function (b) { b.onpointerdown = function () { useTool(b.getAttribute('data-id')); }; });
      var cb = $('bc-catch');
      if (cb) cb.onpointerdown = tryCatch;
    }

    function leave(text) {
      ended = true;
      msg = text;
      finish(ev, 'legend', 'FAIL');
    }

    function useTool(id) {
      if (ended) return;
      var t = tools.find(function (x) { return x.id === id; });
      if (!t) return;
      if (toolQty(t) <= 0) {
        if (typeof coins === 'undefined' || coins < t.price) { msg = '코인이 부족해요! 🍔 ' + t.price + ' 필요'; draw(); return; }
        coins -= t.price;
        if (typeof addToBag === 'function') addToBag(t.emoji, t.name, 'tool', 1, '특별 NPC · 레어 변종 촬영 마무리용');
        if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
      }
      if (typeof useFromBag === 'function') useFromBag(t.name, 1);
      if (typeof saveAll === 'function') saveAll();
      var right = id === npc.weak;
      gauge -= right ? NPC_HIT_RIGHT : NPC_HIT_WRONG;
      if (Math.random() < fleeP) { leave('💨 ' + npc.name + '이(가) 떠나버렸어요…'); return; }
      msg = right ? ('👍 ' + t.name + '을(를) 아주 좋아해요!') : ('🙂 ' + t.name + ' 효과가 조금 있었어요');
      draw();
    }

    function tryCatch() {
      if (ended) return;
      if (Math.random() < catchP) { ended = true; flash(); setTimeout(function () { finish(ev, 'legend', 'SUCCESS'); }, 380); return; }
      if (retries > 0) { retries--; msg = '💦 아깝다! 소품 효과로 한 번 더!'; draw(); return; }
      leave('💨 놓쳤어요… ' + npc.name + '이(가) 떠났어요');
    }

    draw();
  }

  function openEvent(ev) {
    S.paused = true;
    S.moving = false;
    S.tx = S.px; S.ty = S.py;
    placePlayer();
    S.current = ev;
    if (ev.type === 'shutter') gaugeGame(ev, false);
    else if (ev.type === 'golden') gaugeGame(ev, true);
    else if (ev.type === 'letter') letterGame(ev);
    else if (ev.type === 'goods') goodsGame(ev);
    else npcGame(ev);
  }

  function tryStart(ev) {
    if (typeof stamina === 'undefined' || stamina < STAMINA_COST) {
      ev.skip = true;
      toast('스태미나가 부족해요! ⚡ 음료를 마셔봐요 (이벤트 1번 ' + STAMINA_COST + ')');
      return;
    }
    stamina -= STAMINA_COST;
    if (typeof saveStamina === 'function') saveStamina();
    hud();
    openEvent(ev);
  }

  // ════════ 메인 루프 ════════
  function tick(ts) {
    var me = S;
    if (!me || !$('bc-view')) return;
    var dt = me.last ? Math.min(0.05, (ts - me.last) / 1000) : 0;
    me.last = ts;
    if (!me.paused) {
      // 걷기
      var ws = worldSize();
      var dx = (me.tx - me.px) * ws.w, dy = (me.ty - me.py) * ws.h;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < 2) { me.moving = false; }
      else {
        var step = SPEED * dt;
        if (step >= d) { me.px = me.tx; me.py = me.ty; me.moving = false; }
        else { me.px += dx / d * step / ws.w; me.py += dy / d * step / ws.h; me.moving = true; }
      }
      placePlayer();

      // 이벤트 닿았는지 / 제한시간
      for (var i = me.events.length - 1; i >= 0; i--) {
        var ev = me.events[i];
        if (ev.kind === 'special') {
          ev.ttl -= dt;
          var lab = ev.el && ev.el.querySelector('.bc-ttl');
          if (lab) lab.textContent = Math.max(0, Math.ceil(ev.ttl)) + '초';
          if (ev.ttl <= 0) {
            removeEvent(ev);
            banner('⌛ 특별 이벤트를 놓쳤어요…');
            fillNormals();
            continue;
          }
        }
        var dist = pxDist(ev.x, ev.y, me.px, me.py);
        if (dist < HIT_R + (ev.kind === 'special' ? 10 : 0)) {
          if (!ev.skip) { tryStart(ev); break; }
        } else if (dist > HIT_R * 2) {
          ev.skip = false;
        }
      }
      me.hudT = (me.hudT || 0) + dt;
      if (me.hudT > 0.5) { me.hudT = 0; hud(); }
    }
    me.raf = requestAnimationFrame(tick);
  }

  function onMapTap(e) {
    if (!S || S.paused) return;
    var w = $('bc-world');
    if (!w) return;
    var rc = w.getBoundingClientRect();
    var nx = (e.clientX - rc.left) / rc.width, ny = (e.clientY - rc.top) / rc.height;
    S.tx = clamp(nx, BOUNDS.x0, BOUNDS.x1);
    S.ty = clamp(ny, BOUNDS.y0, BOUNDS.y1);
    var rip = document.createElement('div');
    rip.style.cssText = 'position:absolute;left:' + (S.tx * 100) + '%;top:' + (S.ty * 100) + '%;width:34px;height:34px;border-radius:50%;border:3px solid #fff;z-index:5;pointer-events:none;animation:bcRipple .5s ease-out forwards;';
    $('bc-layer').appendChild(rip);
    setTimeout(function () { rip.remove(); }, 520);
  }

  function startBroadcast(charId) {
    var overlay = $('special-overlay');
    if (!overlay) return;
    var ch = (typeof CHARS !== 'undefined' && CHARS[charId]) ? CHARS[charId] : { name: '', img: '', gradeColor: '#fff', emoji: '🎬' };
    try { specialExploreState = { locationId: LOC_ID, charId: charId, creature: null, foodChosen: null }; } catch (e) {}
    if (S && S.raf) cancelAnimationFrame(S.raf);
    injectStyle();
    preloadNpcs();

    overlay.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;background:rgba(0,0,0,.6);position:relative;z-index:50;">' +
      '<div style="color:#fff;font-size:15px;font-weight:900;white-space:nowrap;">🎬 방송국 앞</div>' +
      '<div id="bc-stam" style="color:#FFE27A;font-size:11px;font-weight:900;text-align:center;flex:1;"></div>' +
      '<button onclick="document.getElementById(\'special-overlay\').remove()" style="background:rgba(255,255,255,.15);border:none;border-radius:10px;color:#fff;padding:7px 12px;cursor:pointer;white-space:nowrap;">나가기</button></div>' +
      '<div id="bc-view" style="position:relative;flex:1;min-height:0;overflow:hidden;background:#0d0820;touch-action:manipulation;user-select:none;-webkit-user-select:none;">' +
      '<div id="bc-world" style="position:absolute;">' +
      '<img id="bc-img" src="' + BG_URL + '" draggable="false" style="width:100%;height:100%;display:block;pointer-events:none;">' +
      '<div id="bc-layer" style="position:absolute;inset:0;"></div></div>' +
      '<div id="bc-banner" style="display:none;position:absolute;top:8px;left:10px;right:10px;z-index:30;background:rgba(26,26,46,.92);border:1.5px solid #FFD700;border-radius:14px;padding:9px 12px;color:#fff;font-size:12px;font-weight:900;text-align:center;pointer-events:none;"></div>' +
      '</div>';

    var view = $('bc-view');
    var img = $('bc-img');
    img.onload = function () { if (img.naturalWidth) { IMG_W = img.naturalWidth; IMG_H = img.naturalHeight; } layout(); };
    img.onerror = function () {
      img.style.display = 'none';
      var w = $('bc-world');
      if (w) w.style.background = 'linear-gradient(180deg,#3b2a6b 0%,#6d5bb5 45%,#c4b5fd 100%)';
    };
    layout();
    window.addEventListener('resize', layout);
    view.addEventListener('pointerdown', onMapTap);

    S = { charId: charId, px: START.x, py: START.y, tx: START.x, ty: START.y, moving: false, events: [], paused: false, current: null, last: 0, raf: 0, hudT: 0 };
    $('bc-layer').appendChild(buildPlayer(ch));
    placePlayer();
    hud();
    fillNormals();
    banner('❗를 찾아 걸어가 보세요! 이벤트 1번에 ⚡' + STAMINA_COST);
    S.raf = requestAnimationFrame(tick);
  }

  // ════════ 설치 ════════
  function install() {
    if (typeof window.startSpecialExplore !== 'function' || typeof SPECIAL_LOCATIONS === 'undefined' || typeof window.renderSpecialExploreList !== 'function') {
      setTimeout(install, 50);
      return;
    }
    if (window.__bcInstalled) return;
    window.__bcInstalled = true;
    if (!SPECIAL_LOCATIONS.some(function (l) { return l.id === LOC_ID; })) {
      SPECIAL_LOCATIONS.push({ id: LOC_ID, name: '방송국 앞', emoji: '🎬', color: '#A78BFA', bg: BG_URL });
    }
    var orig = window.startSpecialExplore;
    window.startSpecialExplore = function (locationId, charId) {
      if (locationId === LOC_ID) { startBroadcast(charId); return; }
      return orig.apply(this, arguments);
    };

    // 맵 화면: 특별 탐험 목록에서 방송국 앞을 빼고, 그 아래에 '팬덤 원정' 칸을 따로 만든다
    var origRender = window.renderSpecialExploreList;
    window.renderSpecialExploreList = function () {
      var r = origRender.apply(this, arguments);
      try { decorateList(); } catch (e) {}
      return r;
    };
    window.renderSpecialExploreList();

    // special-explore.js가 로드 직후 원래 함수로 목록을 다시 그려서 꾸민 게 지워지므로,
    // 목록이 바뀔 때마다(다시 그려질 때마다) 팬덤 원정 칸을 다시 붙인다
    (function watchList() {
      var host = $('special-explore-list');
      if (!host) { setTimeout(watchList, 200); return; }
      try {
        new MutationObserver(function () { try { decorateList(); } catch (e) {} }).observe(host, { childList: true });
      } catch (e) {}
      try { decorateList(); } catch (e) {}
    })();
  }

  function decorateList() {
    var el = $('special-explore-list');
    if (!el || el.querySelector('#bc-fandom-section')) return;
    // 기존 목록 안의 버튼 정리 (카드 선택 화면은 SPECIAL_LOCATIONS에 남겨둬서 그대로 동작)
    Array.prototype.forEach.call(el.querySelectorAll('button'), function (b) {
      var oc = b.getAttribute('onclick') || '';
      if (oc.indexOf("'" + LOC_ID + "'") !== -1) { b.remove(); return; }
      if (HIDE_OLD_SPECIAL) b.remove();   // 기존 3곳 + 도감 버튼 숨김 (데이터·코드는 그대로 남음)
    });
    if (HIDE_OLD_SPECIAL) {
      var oldImg = document.querySelector('#screen-map img[src*="special-explore-main-bg"]');
      if (oldImg && oldImg.parentElement) oldImg.parentElement.style.display = 'none';
    }
    var sec = document.createElement('div');
    sec.id = 'bc-fandom-section';
    sec.style.cssText = 'margin:18px 0 10px;';
    var have = pieceCount();
    sec.innerHTML =
      '<div id="bc-banner-box" style="position:relative;border-radius:18px;overflow:hidden;margin-bottom:12px;height:130px;' +
        'background-color:#2a1d4e;background-image:url(\'' + BG_URL + '\');background-size:100% auto;background-position:50% 26%;">' +
        '<div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(20,10,40,.05) 20%,rgba(20,10,40,.88) 100%);"></div>' +
        '<div style="position:absolute;bottom:10px;left:14px;right:14px;display:flex;align-items:flex-end;justify-content:space-between;gap:8px;">' +
          '<div><div style="font-size:14px;font-weight:900;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.8);">🎬 팬덤 원정</div>' +
          '<div style="font-size:10px;color:#e4d7ff;text-shadow:0 1px 4px rgba(0,0,0,.8);">현장을 돌아다니며 프리미엄 조각을 모아요</div></div>' +
          '<div style="font-size:11px;font-weight:900;color:#7dd3fc;background:rgba(0,0,0,.55);border-radius:10px;padding:4px 9px;white-space:nowrap;">' + PIECE_EMOJI + ' ' + have + '/' + PIECE_GOAL + '</div>' +
        '</div></div>' +
      '<button onclick="openSpecialCardSelect(\'' + LOC_ID + '\')" style="width:100%;display:flex;align-items:center;gap:12px;padding:13px 14px;background:#A78BFA1f;border:1.5px solid #A78BFA;border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;text-align:left;">' +
        '<span style="font-size:24px;">🎬</span><span>방송국 앞</span><span style="margin-left:auto;color:#888;font-size:16px;">›</span></button>';
    // 도감 버튼(맨 마지막 칸) 앞에 끼워 넣기
    var last = el.lastElementChild;
    if (last) el.insertBefore(sec, last); else el.appendChild(sec);
    // 전용 배너 이미지(fandom-banner.png)를 repo에 올리면 자동으로 그걸 쓴다
    var im = new Image();
    im.onload = function () {
      var box = $('bc-banner-box');
      if (box) { box.style.backgroundImage = 'url("' + IMG_BASE + 'fandom-banner.png' + BUST + '")'; box.style.backgroundSize = 'cover'; box.style.backgroundPosition = 'center'; }
    };
    im.src = IMG_BASE + 'fandom-banner.png' + BUST;
  }

  // 이름이 바뀐 아이템: 이미 가방에 있는 '화보 조각'을 '프리미엄 조각'으로 합쳐 옮김 (가방은 이름으로 찾기 때문)
  function migratePieceName() {
    if (typeof bagItems === 'undefined' || !Array.isArray(bagItems)) { setTimeout(migratePieceName, 300); return; }
    var oi = bagItems.findIndex(function (i) { return i.name === OLD_PIECE_NAME; });
    if (oi === -1) return;
    var old = bagItems[oi];
    var ni = bagItems.find(function (i) { return i.name === PIECE_NAME; });
    if (ni) { ni.qty += old.qty; bagItems.splice(oi, 1); }
    else { old.name = PIECE_NAME; old.emoji = PIECE_EMOJI; old.desc = '프리미엄 카드 조각 · ' + PIECE_GOAL + '개를 모으면 프리미엄 카드 1장'; }
    if (typeof saveBag === 'function') saveBag();
    if (typeof saveAll === 'function') saveAll();
  }
  migratePieceName();

  window.__bcTest = { rewardFor: rewardFor, pickNormal: pickNormal, simulate: simulate,
    spawnNpc: function () { if (S) spawnSpecial('legend'); } };   // 테스트용: 원정 화면에서 콘솔에 __bcTest.spawnNpc() 입력하면 특별 NPC가 바로 나옴
  install();
})();
