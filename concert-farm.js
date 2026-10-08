// ════════════════════════════════
// 🎪 콘서트 파밍 (concert-farm.js) — 탑스타 세연과 함께 하는 첫 무대
//
// 위에서 내려다보는 큰 콘서트장을 돌아다니며(화면이 플레이어를 따라감) 관객석 팬들의 하트 게이지를 채우고,
// 마지막에 "앵콜 폭죽"으로 하트가 가득 찬 팬들이 재료를 터뜨리게 하는 파밍. 튜토리얼 전용이라 스태미나는 안 든다.
//
// 시작 전에 세연이 "같이 무대에 설 포카를 골라봐!" 하고 가지고 있는 카드(등급 무관) 중 한 장을 고르게 한다.
//   고른 카드의 멤버 얼굴(face-멤버.png)이 걸어 다닌다. startConcertFarm({ charId: 'yuna' }) 로 미리 정해 주면 고르기를 건너뜀.
// 조작: 화면을 누르거나 끌면 그쪽으로 걸어간다. 아래 스킬 버튼 3개를 누르면 범위 안 팬들의 하트가 찬다.
//   🎤 하이라이트 부르기 : 내 주변(작은 범위) 하트 +50
//   💖 윙크 샤워         : 넓은 범위 하트 +30
//   ✨ 앵콜 폭죽         : 하트가 가득 찬 팬 전원이 재료를 떨어뜨림 (한 번 터뜨린 팬은 끝). 시간이 끝나면 자동으로 한 번 더 터짐
// 재료는 신비의 섬 재료(별·수정 계열) 그대로: 달빛수정, 별의파편, 천사의깃털, 무지개수정 / 희귀: 벚꽃결정, 구름조각, 행운의잎.
//
// 시작하는 법:  window.startConcertFarm({ grantCard: true })   ← 끝나고 세연의 체험용 히든카드를 지급 (trial-card.js)
// 테스트용 주소 파라미터:  ?concert=1 (체험카드 지급까지)  /  ?concert=2 (카드 없이 파밍만)
// 그림은 없어도 동작한다 (색 칸으로 대신 그림). 그림을 올리면 자동 적용:
//   map-concert.jpg   콘서트장 탑뷰 배경 (세로로 긴 그림, 가로:세로 = 2:3. 월드 1000x1500 에 맞춰 그려짐)
//   face-seyeon.png   세연 얼굴 (원형으로 잘려서 표시, 200px 정도)
//   fan-1.png ~ fan-8.png  관객 (이미 게임에 있는 팬 이미지)
// 값을 바꾸고 싶으면 아래 [설정]만 고치면 된다.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var FAT_REGEN = 2.5;         // 피로도는 가만히 있어도 초당 이만큼 내려감
  var DRINK_HEAL = 60;         // 🥤 피로회복 드링크 한 병이 내려주는 피로도
  var DRINK_NAME = '피로회복 드링크', DRINK_EMOJI = '🥤';   // 상점에서 사는 가방 아이템 이름 (broadcast-expedition.js POTIONS 와 같아야 함)
  var FREE_DRINKS = 5;         // 튜토리얼에서는 처음부터 이만큼 들고 들어감
  var RING_T = 1.2;            // 스킬 버튼 위 링이 한 번 모이는 시간(초)
  var PERFECT_FROM = 0.78;     // 링 진행도가 이 값 이상(마지막 약 0.26초)일 때 누르면 PERFECT
  var PERFECT_MULT = 1.5, PERFECT_FAT = 10;   // PERFECT: 하트 1.5배, 피로도 -10
  var SESSION_SEC = 75;        // 무대 시간
  var FAN_DROP_P = 0.33;       // 앵콜 때 하트 가득 찬 팬 한 명이 재료를 떨어뜨릴 확률 (팬 30명 기준 봇 시뮬레이션 평균 약 10개)
  var EXTRA_DROP = 0.0;        // (예비) 재료가 2개 나올 확률
  var STONE_DROP = 0.25;       // 끝났을 때 재조합석 확률 (기존 탐험과 동일)
  var WORLD_W = 1000, WORLD_H = 1500;      // 월드 크기 (화면 픽셀이 아니라 그림 좌표)
  var VIEW_W = 520;            // 화면 가로로 보이는 월드 폭 (작을수록 확대)
  var SPEED = 270;             // 걷는 속도 (월드 단위/초)
  var BG_FILE = 'map-concert.jpg';
  var SEYEON_FACE = 'face-seyeon.png';
  var FAN_FILES = ['fan-1.png', 'fan-2.png', 'fan-3.png', 'fan-4.png', 'fan-5.png', 'fan-6.png', 'fan-7.png', 'fan-8.png'];
  var START = { x: 500, y: 725 };
  var STAGE = { x0: 100, x1: 900, y0: 30, y1: 430 };
  // 관객석: 왼쪽/오른쪽 블록, 가운데는 통로
  var BLOCK_X = [[150, 250, 350], [650, 750, 850]];
  var ROW_Y = [535, 640, 830, 940, 1040];     // 위 블록 2줄 + 아래 블록 3줄 (map-concert.jpg 그림의 객석 위치에 맞춤)
  var FAN_R = 28;              // 팬 크기(반지름)
  var SKILLS = [
    { id: 'highlight', name: '하이라이트 부르기', short: '하이라이트', desc: '주변 팬 하트 +50', icon: '🎤', radius: 250, gain: 50, fat: 30, cd: 3.5,  rgb: '255,120,170', sfx: 'concertHigh' },
    { id: 'wink',      name: '윙크 샤워',         short: '윙크 샤워', desc: '넓은 범위 하트 +30', icon: '💖', radius: 430, gain: 30, fat: 40, cd: 5.5,  rgb: '255,205,90',  sfx: 'concertWink' },
    { id: 'encore',    name: '앵콜 폭죽',         short: '앵콜 폭죽', desc: '하트 가득 찬 팬 전원 선물!', icon: '✨', radius: 0,   gain: 0,  cd: 10, rgb: '190,140,255', sfx: 'concertEncore', finale: true }
  ];
  var INTRO = [
    '어? 이제 막 데뷔한 신인이구나! 오늘 내 무대 같이 볼래? 따라와!',
    '객석 위에 하트 게이지가 보이지? 스킬로 팬들의 하트를 가득 채워봐.',
    '하트가 가득 찬 팬들은 ✨앵콜 폭죽으로 선물을 터뜨려 줘! 화면을 눌러서 움직이고, 아래 스킬을 써봐!',
    '자, 같이 무대에 설 포카를 골라봐! 누가 좋을까?'
  ];
  var PICK_COLORS = { N: '#9ca3af', R: '#60a5fa', SR: '#a78bfa', SSR: '#f472b6', UR: '#fbbf24' };
  var CHEERS = ['좋아, 더 크게!', '팬들 반응 봐!', '그렇지!', '앵콜 타이밍!', '오늘 무대 최고야!', '조금만 더!'];

  // ════════ 순수 로직 (화면 없이도 테스트 가능) ════════
  var POOLS = {
    normal: ['달빛수정', '별의파편', '천사의깃털', '무지개수정'],
    rare: ['벚꽃결정', '구름조각', '행운의잎']
  };
  function pools() {
    if (typeof EXPLORE_MATERIALS !== 'undefined' && EXPLORE_MATERIALS.mystery) return EXPLORE_MATERIALS.mystery;
    return POOLS;
  }
  // 기존 탐험과 같은 방식으로 재료 하나 뽑기
  function rollDrop(luck, rng) {
    rng = rng || Math.random;
    var p = pools();
    var rareChance = Math.min(0.80, 0.30 + (luck || 0) / 100);
    var isRare = rng() < rareChance;
    var pool = isRare ? p.rare : p.normal;
    var mat = pool[Math.floor(rng() * pool.length)];
    var isWish = rng() < 0.005;
    return { name: isWish ? null : mat, isWish: isWish, isRare: isRare };
  }
  function makeFans(rng) {
    rng = rng || Math.random;
    var fans = [];
    BLOCK_X.forEach(function (cols) {
      ROW_Y.forEach(function (y) {
        cols.forEach(function (x) {
          fans.push({ x: x + (rng() - 0.5) * 30, y: y + (rng() - 0.5) * 30, g: 0, vis: 0, done: false, img: Math.floor(rng() * FAN_FILES.length), pulse: rng() * 6.28, wasFull: false });
        });
      });
    });
    return fans;
  }
  // 스킬 범위 안의 (아직 안 끝난) 팬 번호들
  function inRange(fans, x, y, r) {
    var out = [];
    fans.forEach(function (f, i) { if (!f.done && Math.hypot(f.x - x, f.y - y) <= r) out.push(i); });
    return out;
  }
  function applyGain(fans, x, y, skill, mult) {
    var hit = inRange(fans, x, y, skill.radius), add = Math.round(skill.gain * (mult || 1));
    hit.forEach(function (i) { fans[i].g = Math.min(100, fans[i].g + add); });
    return hit;
  }
  // 앵콜: 하트 가득 찬 팬을 끝내고, 재료를 떨어뜨리는 팬 번호와 재료를 돌려줌
  function encore(fans, luck, rng) {
    rng = rng || Math.random;
    var res = { fulls: [], drops: [] };
    fans.forEach(function (f, i) {
      if (f.done || f.g < 100) return;
      f.done = true; res.fulls.push(i);
      if (rng() < FAN_DROP_P) {
        res.drops.push({ fan: i, d: rollDrop(luck, rng) });
        if (rng() < EXTRA_DROP) res.drops.push({ fan: i, d: rollDrop(luck, rng) });
      }
    });
    return res;
  }

  var S = null;
  var IMGS = {};
  function loadImg(name) {
    if (IMGS[name]) return IMGS[name];
    var im = new Image(); var rec = { im: im, ok: false };
    im.onload = function () { rec.ok = true; };
    im.src = (typeof B !== 'undefined' ? B : '') + name;
    IMGS[name] = rec; return rec;
  }
  function sfx(name) { try { if (window.pocaSfx) window.pocaSfx.play(name); } catch (e) {} }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function easeOutBack(t) { var c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  var FIRE_COLORS = ['255,120,170', '255,210,90', '190,140,255', '120,220,255', '255,255,255', '255,150,90'];

  // ════════ 화면 ════════
  function startConcert(opts) {
    if (document.getElementById('concert-overlay')) return;
    opts = opts || {};
    if (!document.getElementById('concert-style')) { var st = document.createElement('style'); st.id = 'concert-style'; st.textContent = 'body:has(#concert-overlay) #bgm-toggle-btn{display:none!important;}'; document.head.appendChild(st); }   // 콘서트 중엔 🔊 버튼이 대사를 가리지 않게 숨김
    var overlay = document.createElement('div');
    overlay.id = 'concert-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:#140a24;touch-action:none;user-select:none;-webkit-user-select:none;';
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;';
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);
    exploreCollected = [];
    FAN_FILES.forEach(loadImg); loadImg(BG_FILE); loadImg(SEYEON_FACE);

    S = {
      opts: opts, overlay: overlay, canvas: canvas, ctx: canvas.getContext('2d'),
      W: 0, H: 0, dpr: 1, s: 1,
      charId: opts.charId || null, faceFile: null, charName: '나',
      fans: makeFans(), px: START.x, py: START.y, tx: START.x, ty: START.y, moving: false,
      nx: START.x - 70, ny: START.y + 20,                       // 세연
      camX: START.x, camY: START.y,
      perfects: 0, judge: null, fat: 0, fatShake: 0, drinks: 0, drinkBag: false, cd: [0, 0, 0], phase: 'intro', introIdx: 0, timeLeft: SESSION_SEC, t: 0,
      rings: [], parts: [], floats: [], sparks: [], confetti: [], petals: [], fly: [], pops: [],
      banner: null, flash: 0, flashRgb: '255,255,255', shake: 0, zoomP: 0, ts: 1, slowT: 0, slowScale: 1,
      cut: null, nJump: 0, giftBump: 0, trailT: 0, tapRip: 0, hintT: 7,
      collected: [], drops: 0, finaleT: 0, bubble: null, bubbleT: 4, dragging: false, exitDown: false,
      last: performance.now(), raf: 0, ended: false
    };
    if (opts.freeDrinks) S.drinks = opts.freeDrinks;
    else { S.drinkBag = true; S.drinks = bagDrinkQty(); }
    for (var i = 0; i < 16; i++) S.petals.push(newPetal(true));
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    S.raf = requestAnimationFrame(loop);
  }
  function newPetal(anywhere) {
    return { x: rnd(0, 420), y: anywhere ? rnd(-50, 820) : -30, vx: rnd(-14, 14), vy: rnd(28, 60), rot: rnd(0, 6.28), vr: rnd(-2, 2), sz: rnd(10, 20), ch: ['🌸', '✨', '💖', '⭐', '🌸'][Math.floor(rnd(0, 5))], a: rnd(0.35, 0.8) };
  }

  function resize() {
    if (!S) return;
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.W = window.innerWidth; S.H = window.innerHeight;
    S.canvas.width = Math.round(S.W * S.dpr); S.canvas.height = Math.round(S.H * S.dpr);
    S.s = S.W / VIEW_W;
  }
  function toWorld(sx, sy) { return [S.camX + (sx - S.W / 2) / S.s, S.camY + (sy - S.H / 2) / S.s]; }
  function toScreen(x, y) { return [S.W / 2 + (x - S.camX) * S.s, S.H / 2 + (y - S.camY) * S.s]; }
  function pos(e) { var r = S.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

  // 스킬 버튼 (화면 좌표)
  function bagDrinkQty() {
    try { var it = bagItems.find(function (x) { return x.name === DRINK_NAME; }); return it ? Math.max(0, Math.floor(Number(it.qty) || 0)) : 0; } catch (e) { return 0; }
  }
  function drinkRect() { var sz = 54; return { x: S.W - sz - 8, y: S.H - 76 - 18 + 11, w: sz, h: sz }; }
  function hitDrink(x, y) { var r = drinkRect(); return x >= r.x - 6 && x <= r.x + r.w + 6 && y >= r.y - 6 && y <= r.y + r.h + 6; }
  function useDrink() {
    if (S.cut) return;
    if (S.drinks <= 0) { floatText(S.px, S.py - 60, DRINK_EMOJI + ' 드링크가 없어요!', '#ffb4c8'); return; }
    if (S.fat <= 0) { floatText(S.px, S.py - 60, '아직 하나도 안 피곤해요!', '#ddd'); return; }
    if (S.drinkBag) { try { if (typeof useFromBag === 'function') useFromBag(DRINK_NAME, 1); } catch (e) {} }
    S.drinks--; S.fat = Math.max(0, S.fat - DRINK_HEAL);
    floatText(S.px, S.py - 70, DRINK_EMOJI + ' 피로도 -' + DRINK_HEAL + '!', '#9ff0b8', 22);
    ringAt(S.px, S.py, 160, '120,240,170', 0, 0.6); burstAt(S.px, S.py - 10, 18, '140,255,190', 220, 60);
    S.flash = 0.2; S.flashRgb = '140,255,190'; sfx('reward');
  }
  function btnRect(i) {
    var size = 76, gap = 14, total = size * 3 + gap * 2, x0 = (S.W - total) / 2;
    return { x: x0 + i * (size + gap), y: S.H - size - 18, w: size, h: size };
  }
  function hitBtn(x, y) {
    for (var i = 0; i < 3; i++) { var b = btnRect(i); if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return i; }
    return -1;
  }

  function onDown(e) {
    if (!S || S.ended) return;
    e.preventDefault();
    var p = pos(e);
    try { S.canvas.setPointerCapture(e.pointerId); } catch (err) {}
    if (S.phase === 'intro') { advanceIntro(); return; }
    if (S.phase !== 'play') return;
    if (p[0] < 110 && p[1] < 56) { S.exitDown = true; return; }
    if (hitDrink(p[0], p[1])) { useDrink(); return; }
    var b = hitBtn(p[0], p[1]);
    if (b >= 0) { castSkill(b); return; }
    S.dragging = true; setTarget(p); S.tapRip = 0.001;
  }
  function onMove(e) { if (!S || S.ended || !S.dragging) return; e.preventDefault(); setTarget(pos(e)); }
  function onUp(e) {
    if (!S || S.ended) return;
    if (S.exitDown) { var p = pos(e); S.exitDown = false; if (p[0] < 110 && p[1] < 56) { endNow(false); } return; }
    S.dragging = false;
  }
  function setTarget(p) {
    var w = toWorld(p[0], p[1]);
    S.tx = clamp(w[0], 40, WORLD_W - 40); S.ty = clamp(w[1], STAGE.y1 + 40, WORLD_H - 260);
    S.moving = true;
  }
  function advanceIntro() {
    S.introIdx++;
    sfx('concertDrop');
    if (S.introIdx >= INTRO.length - 1 && S.charId) { beginPlay(); return; }          // 이미 정해져 있으면 고르기 생략
    if (S.introIdx >= INTRO.length) openPicker();
  }
  function beginPlay() {
    if (S.charId) {
      S.faceFile = 'face-' + S.charId + '.png'; loadImg(S.faceFile);
      S.charName = (typeof CHARS !== 'undefined' && CHARS[S.charId]) ? CHARS[S.charId].name : '나';
    }
    S.phase = 'play'; showBanner('🎪 무대 시작!', '255,205,90'); sfx('cheer');
    S.flash = 0.4; S.flashRgb = '255,230,150'; S.zoomP = 0.8;
    burstAt(S.px, S.py - 20, 26, '255,220,120', 260);
  }

  // 가지고 있는 카드 중에서 같이 갈 한 장 고르기 (등급 상관 없음, 얼굴은 그 멤버의 얼굴 이미지를 재활용)
  var FACE_CHARS = ['minjun', 'sion', 'doyun', 'harin', 'yuna', 'ara'];
  var GRADE_RANK = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4, '레어히든': 5, '에픽히든': 6 };
  function ownedCardList() {
    var out = [];
    try {
      if (typeof CARDS !== 'undefined' && typeof owned !== 'undefined') CARDS.forEach(function (c) { if (owned.indexOf(c.id) >= 0 && FACE_CHARS.indexOf(c.charId) >= 0) out.push({ id: c.id, charId: c.charId, name: c.name, grade: c.grade, img: c.img }); });
    } catch (e) {}
    try {
      if (typeof HIDDEN_CARDS !== 'undefined' && typeof ownedHiddenCards !== 'undefined') HIDDEN_CARDS.forEach(function (h) { if (ownedHiddenCards.indexOf(h.id) >= 0 && FACE_CHARS.indexOf(h.charId) >= 0) out.push({ id: h.id, charId: h.charId, name: h.name, grade: h.grade, img: h.img }); });
    } catch (e) {}
    out.sort(function (a, b) { return (GRADE_RANK[b.grade] || 0) - (GRADE_RANK[a.grade] || 0); });
    if (!out.length) {          // 카드를 못 읽었으면 멤버 6명을 그대로 보여줌
      FACE_CHARS.forEach(function (id) {
        var nm = (typeof CHARS !== 'undefined' && CHARS[id]) ? CHARS[id].name : id;
        out.push({ id: id, charId: id, name: nm, grade: 'R', img: (typeof B !== 'undefined' ? B : '') + 'face-' + id + '.png' });
      });
    }
    return out;
  }
  function openPicker() {
    var list = ownedCardList();
    S.phase = 'pick';
    var box = document.createElement('div');
    box.id = 'concert-pick';
    box.style.cssText = 'position:absolute;inset:0;z-index:5;background:rgba(10,5,20,0.9);overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;font-family:\'Noto Sans KR\',sans-serif;padding:16px 14px 30px;';
    box.innerHTML = '<div style="text-align:center;color:#f59e0b;font-weight:900;font-size:16px;margin:6px 0 4px;">🌟 같이 무대에 설 포카를 골라요!</div>' +
      '<div style="text-align:center;color:#ddd;font-size:12px;margin-bottom:14px;">가지고 있는 카드라면 어떤 등급이든 괜찮아요</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">' + list.map(function (c, i) {
        var col = PICK_COLORS[c.grade] || '#f59e0b';
        return '<div data-i="' + i + '" style="cursor:pointer;background:rgba(255,255,255,0.06);border:2px solid ' + col + ';border-radius:12px;overflow:hidden;">' +
          '<div style="aspect-ratio:3/4;background:#222;"><img src="' + c.img + '" style="width:100%;height:100%;object-fit:cover;display:block;"></div>' +
          '<div style="padding:5px 4px;text-align:center;font-size:11px;font-weight:900;color:#fff;line-height:1.3;">' + c.name + '</div></div>';
      }).join('') + '</div>';
    box.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    S.overlay.appendChild(box);
    var openedAt = performance.now(), sel = -1;
    var bar = document.createElement('div');
    bar.style.cssText = 'position:sticky;bottom:0;margin:14px -14px -30px;padding:12px 14px 18px;background:linear-gradient(to top,rgba(10,5,20,0.97) 70%,rgba(10,5,20,0));';
    bar.innerHTML = '<button id="concert-go" style="width:100%;padding:14px;border:none;border-radius:14px;font-size:15px;font-weight:900;color:#fff;background:#555;font-family:\'Noto Sans KR\',sans-serif;">카드를 먼저 골라주세요</button>';
    box.appendChild(bar);
    var go = bar.firstChild;
    Array.prototype.forEach.call(box.querySelectorAll('[data-i]'), function (el) {
      el.onclick = function () {
        if (performance.now() - openedAt < 700) return;          // 열리자마자 들어온 탭은 무시
        sel = Number(el.getAttribute('data-i'));
        Array.prototype.forEach.call(box.querySelectorAll('[data-i]'), function (o) { o.style.transform = ''; o.style.boxShadow = ''; o.style.opacity = '0.55'; });
        el.style.opacity = '1'; el.style.transform = 'scale(1.05)'; el.style.boxShadow = '0 0 16px 3px #f59e0b';
        go.textContent = '✨ ' + list[sel].name + ' 로 시작!'; go.style.background = 'linear-gradient(135deg,#f59e0b,#ec4899)';
        sfx('concertDrop');
      };
    });
    go.onclick = function () {
      if (sel < 0 || !S || S.phase !== 'pick') return;
      S.charId = list[sel].charId; box.remove(); beginPlay();
    };
  }

  // ── 효과 도우미 ──
  // 불꽃 터뜨리기 (월드 좌표, 더하기 합성으로 그려짐)
  function burstAt(x, y, n, rgb, speed, grav) {
    if (S.sparks.length > 1100) return;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, v = rnd(0.35, 1) * (speed || 220);
      S.sparks.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: grav === undefined ? 160 : grav, life: 0, max: rnd(0.5, 1.0), sz: rnd(2.2, 4.2), rgb: rgb || FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)] });
    }
  }
  function ringAt(x, y, r1, rgb, delay, dur) { S.rings.push({ x: x, y: y, r0: 14, r1: r1, t: -(delay || 0), dur: dur || 0.6, rgb: rgb }); }
  function showBanner(text, rgb) { S.banner = { text: text, rgb: rgb, t: 0, dur: 1.2 }; }
  function floatText(x, y, text, color, size) { S.floats.push({ x: x, y: y, text: text, color: color || '#fff', size: size || 18, t: 0, dur: 1.4 }); }
  function slowmo(sec, scale) { S.slowT = sec; S.slowScale = scale; }

  // ── 스킬 ──
  function castSkill(i) {
    if (S.cut) return;
    var k = SKILLS[i];
    if (S.cd[i] > 0) { floatText(S.px, S.py - 60, '재사용 대기 ' + Math.ceil(S.cd[i]) + '초', '#ddd'); return; }
    if (k.finale) {
      var any = S.fans.some(function (f) { return !f.done && f.g >= 100; });
      if (!any) { floatText(S.px, S.py - 60, '하트가 가득 찬 팬이 없어요', '#ffb4c8'); return; }
    }
    if (k.fat && S.fat + k.fat > 100) {
      S.fatShake = 0.5; sfx('concertDrop');
      floatText(S.px, S.py - 60, '😵 피로도가 가득! ' + (S.drinks > 0 ? DRINK_EMOJI + ' 드링크를 마셔요' : '조금 쉬어야 해요'), '#ffb4c8', 18);
      return;
    }
    var perfect = !k.finale && ringPhase() >= PERFECT_FROM;
    S.cd[i] = k.cd; if (k.fat) S.fat += perfect ? Math.max(0, k.fat - PERFECT_FAT) : k.fat;
    if (perfect) { S.perfects++; S.judge = { text: 'PERFECT!', t: 0 }; sfx('concertFull'); }
    startCut(k, i, perfect ? PERFECT_MULT : 1);
  }
  // 스킬 컷인: 화면이 어두워지고 멤버 얼굴이 크게 튀어나오며 스킬 이름이 날아온다 → 그 순간에 효과가 터짐
  function ringPhase() { return (S.t % RING_T) / RING_T; }
  function startCut(k, i, mult) {
    var dur = k.finale ? 1.25 : 0.95;
    var lines = []; for (var n = 0; n < 26; n++) lines.push({ a: Math.random() * 6.283, l: rnd(0.4, 1), w: rnd(1, 3.5) });
    S.cut = { mult: mult || 1, k: k, i: i, t: 0, dur: dur, fireAt: dur * 0.46, fired: false, lines: lines };
    slowmo(dur * 0.9, 0.12);
    sfx('concertCut');
    S.nJump = 1;
    S.zoomP = 0.5;
    burstAt(S.px, S.py - 10, 14, k.rgb, 180, -20);
  }
  function fireCut() {
    var k = S.cut.k, i = S.cut.i;
    S.cut.fired = true;
    if (k.finale) { doEncore(k); return; }
    var hit = applyGain(S.fans, S.px, S.py, k, S.cut.mult), added = Math.round(k.gain * S.cut.mult);
    ringAt(S.px, S.py, k.radius, k.rgb, 0, 0.7);
    ringAt(S.px, S.py, k.radius * 0.72, '255,255,255', 0.08, 0.6);
    ringAt(S.px, S.py, k.radius * 0.45, k.rgb, 0.16, 0.55);
    burstAt(S.px, S.py, 40, k.rgb, 340, 40);
    hit.forEach(function (n, idx) {
      var f = S.fans[n];
      f.hop = 1; f.vis = Math.max(0, f.vis - 0);
      f.pop = { t: 0, text: '+' + added, gold: S.cut.mult > 1 };
      for (var q = 0; q < 4; q++) S.parts.push({ x: S.px, y: S.py, tx: f.x, ty: f.y - 14, t: -q * 0.07 - idx * 0.012, dur: 0.6, ch: k.id === 'wink' ? '💖' : '✨', sz: 22 + (q === 0 ? 6 : 0), rgb: k.rgb });
    });
    S.flash = 0.55; S.flashRgb = k.rgb; S.shake = 0.45; S.zoomP = 1;
    slowmo(0.28, 0.35);
    sfx(k.sfx);
    if (navigator.vibrate) { try { navigator.vibrate(18); } catch (e) {} }
    if (hit.length === 0) floatText(S.px, S.py - 60, '근처에 팬이 없어요 — 객석 쪽으로!', '#ffb4c8');
    else floatText(S.px, S.py - 70, k.icon + ' ' + hit.length + '명 두근!', '#ffe3f0', 22);
  }
  function doEncore(k) {
    var luck = typeof getEquippedStat === 'function' ? getEquippedStat('luck') : 0;
    var res = encore(S.fans, luck);
    S.flash = 0.85; S.flashRgb = '255,245,220'; S.shake = 0.8; S.zoomP = 1.3;
    slowmo(1.0, 0.4);
    sfx(k.sfx); sfx('cheer');
    ringAt(S.px, S.py, 1100, '255,230,150', 0, 1.0);
    ringAt(S.px, S.py, 900, '190,140,255', 0.12, 1.0);
    ringAt(S.px, S.py, 700, '255,120,170', 0.24, 1.0);
    res.fulls.forEach(function (n, idx) {
      var f = S.fans[n], d = idx * 0.07;
      // 로켓처럼 솟았다가 평 하고 터지는 폭죽
      S.sparks.push({ rocket: true, x: f.x, y: f.y - 20, vx: rnd(-20, 20), vy: -rnd(280, 380), g: 120, life: -d, max: rnd(0.42, 0.55), sz: 3.5, rgb: '255,240,200', fx: FIRE_COLORS[idx % FIRE_COLORS.length] });
      S.parts.push({ x: f.x, y: f.y - 20, burst: true, t: -d, dur: 0.9, ch: '😍', sz: 30 });
      f.hop = 1;
    });
    for (var c = 0; c < 70; c++) S.confetti.push({ x: rnd(0, S.W), y: rnd(-S.H * 0.6, -10), vx: rnd(-40, 40), vy: rnd(90, 230), rot: rnd(0, 6.28), vr: rnd(-8, 8), col: FIRE_COLORS[Math.floor(rnd(0, FIRE_COLORS.length))], sz: rnd(6, 12), w: rnd(0.4, 1) });
    res.drops.forEach(function (dr, idx) {
      var f = S.fans[dr.fan];
      setTimeout(function () { if (S && !S.ended) giveDrop(dr.d, f.x, f.y); }, 700 + idx * 130);
    });
    if (res.fulls.length) floatText(S.px, S.py - 100, '💖 ' + res.fulls.length + '명 대만족!!', '#fff2c4', 26);
    if (navigator.vibrate) { try { navigator.vibrate([30, 40, 60]); } catch (e) {} }
  }
  function giveDrop(d, x, y) {
    var label = null, emoji = '✨', before = exploreCollected.length;
    var el = { style: {}, parentNode: { removeChild: function () {} } };
    // 무대에서 줍는 재료는 '스케줄(탐험)'이 아니므로 첫 탐험 퀘스트·스토리는 켜지 않고, 경험치도 작게(10→2)
    var _cq = window.checkQuestProgress, _ae = window.addPlayerExp;
    window.checkQuestProgress = function (c) { if (c === 'first_explore') return; return _cq.apply(this, arguments); };
    window.addPlayerExp = function (n) { return _ae.call(this, Math.min(Number(n) || 0, 2)); };
    try { collectExploreItem(0, { name: d.name, isWish: d.isWish, isRare: d.isRare }, el); }
    finally { window.checkQuestProgress = _cq; window.addPlayerExp = _ae; }
    if (d.isWish) { label = '🧩 소원의 조각'; emoji = '🧩'; }
    else {
      label = exploreCollected.length > before ? exploreCollected[exploreCollected.length - 1] : d.name;
      emoji = typeof getMaterialEmoji === 'function' ? getMaterialEmoji(d.name) : '✨';
    }
    S.collected.push(label); S.drops++;
    S.fly.push({ ch: emoji, wx: x, wy: y - 20, t: 0, dur: 0.95, rare: !!d.isRare });
    floatText(x, y - 44, (d.isRare ? '🌟 ' : '') + label.replace(/^[^ ]+ /, ''), d.isRare ? '#ffd700' : '#fff', d.isRare ? 22 : 17);
    burstAt(x, y - 20, d.isRare ? 22 : 10, d.isRare ? '255,215,90' : '255,255,255', 200, 60);
    sfx(d.isRare ? 'reward' : 'concertDrop');
  }

  // ── 진행 ──
  function loop(now) {
    if (!S || S.ended) return;
    var dt = Math.min(0.05, (now - S.last) / 1000); S.last = now; S.t += dt;
    update(dt);
    if (!S || S.ended) return;
    draw();
    if (S && !S.ended) S.raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    // 슬로모션: 게임 시간(g)만 느려지고 컷인과 화면 효과는 실제 시간
    if (S.slowT > 0) { S.slowT -= dt; S.ts += (S.slowScale - S.ts) * Math.min(1, dt * 18); }
    else S.ts += (1 - S.ts) * Math.min(1, dt * 7);
    var g = dt * S.ts;

    if (S.flash > 0) S.flash -= dt;
    if (S.shake > 0) S.shake -= dt;
    if (S.zoomP > 0) S.zoomP = Math.max(0, S.zoomP - dt * 2.6);
    if (S.nJump > 0) S.nJump = Math.max(0, S.nJump - dt * 2.2);
    if (S.giftBump > 0) S.giftBump = Math.max(0, S.giftBump - dt * 3);
    if (S.hintT > 0 && S.phase === 'play') S.hintT -= dt;
    if (S.banner) { S.banner.t += dt; if (S.banner.t > S.banner.dur) S.banner = null; }
    if (S.cut) {
      S.cut.t += dt;
      if (!S.cut.fired && S.cut.t >= S.cut.fireAt) fireCut();
      if (S.cut && S.cut.t >= S.cut.dur) S.cut = null;
    }
    S.rings = S.rings.filter(function (r) { r.t += g; return r.t < r.dur; });
    S.parts = S.parts.filter(function (q) { q.t += g; return q.t < q.dur; });
    S.floats = S.floats.filter(function (f) { f.t += dt; return f.t < f.dur; });
    S.fly = S.fly.filter(function (f) { f.t += dt; if (f.t >= f.dur) { S.giftBump = 1; return false; } return true; });
    S.confetti = S.confetti.filter(function (q) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx += Math.sin(S.t * 3 + q.rot) * 30 * dt; q.rot += q.vr * dt; return q.y < S.H + 20; });
    S.petals.forEach(function (p, i) { p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (p.y > S.H + 30 || p.x < -40 || p.x > S.W + 40) { var n = newPetal(false); n.x = rnd(0, S.W); S.petals[i] = n; } });
    // 불꽃: 로켓이 솟다가 터지면 알록달록 불꽃이 퍼짐
    var born = [];
    S.sparks = S.sparks.filter(function (sp) {
      sp.life += g;
      if (sp.life < 0) return true;
      sp.x += sp.vx * g; sp.y += sp.vy * g; sp.vy += (sp.g || 0) * g;
      if (sp.rocket) {
        if (Math.random() < 0.5) born.push({ x: sp.x, y: sp.y, vx: rnd(-20, 20), vy: rnd(10, 50), g: 0, life: 0, max: 0.35, sz: 2.2, rgb: '255,220,150' });
        if (sp.life >= sp.max) {
          for (var q = 0; q < 26; q++) { var a = q / 26 * 6.283 + rnd(-0.1, 0.1), v = rnd(120, 300); born.push({ x: sp.x, y: sp.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 140, life: 0, max: rnd(0.7, 1.15), sz: rnd(2.6, 4.4), rgb: Math.random() < 0.5 ? sp.fx : FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)] }); }
          born.push({ ring: true, x: sp.x, y: sp.y, vx: 0, vy: 0, g: 0, life: 0, max: 0.4, sz: 0, rgb: sp.fx });
          return false;
        }
        return true;
      }
      return sp.life < sp.max;
    });
    if (born.length && S.sparks.length < 1400) S.sparks = S.sparks.concat(born);

    S.fans.forEach(function (f) {
      f.vis += (f.g - f.vis) * Math.min(1, dt * 8);
      if (f.hop > 0) f.hop = Math.max(0, f.hop - dt * 2.8);
      if (f.pop) { f.pop.t += dt; if (f.pop.t > 0.9) f.pop = null; }
      if (!f.done && f.g >= 100 && !f.wasFull) {
        f.wasFull = true; f.hop = 1; sfx('concertFull');
        f.pop = { t: 0, text: 'MAX!', gold: true };
        ringAt(f.x, f.y, 70, '255,215,90', 0, 0.5);
        burstAt(f.x, f.y - 10, 16, '255,215,90', 190, 30);
      }
    });

    if (S.phase === 'play' || S.phase === 'finale') {
      // 이동
      var dx = S.tx - S.px, dy = S.ty - S.py, d = Math.hypot(dx, dy);
      if (S.moving && d > 6) {
        var st = Math.min(d, SPEED * g); S.px += dx / d * st; S.py += dy / d * st;
        S.trailT -= dt;
        if (S.trailT <= 0) { S.trailT = 0.05; S.sparks.push({ x: S.px + rnd(-8, 8), y: S.py + 20, vx: rnd(-18, 18), vy: rnd(-30, -6), g: -10, life: 0, max: 0.55, sz: rnd(2.4, 4), rgb: Math.random() < 0.5 ? '255,170,210' : '255,240,200' }); }
      } else S.moving = false;
      if (S.tapRip > 0) S.tapRip += dt;
      // 세연은 플레이어를 살짝 뒤따라옴
      var gx = S.px - 64, gy = S.py + 28, nd = Math.hypot(gx - S.nx, gy - S.ny);
      if (nd > 4) { var ns = Math.min(nd, Math.max(nd * 4, 60) * g); S.nx += (gx - S.nx) / nd * ns; S.ny += (gy - S.ny) / nd * ns; }
    }
    if (S.phase === 'play') {
      if (!S.cut) S.timeLeft -= g;
      for (var i = 0; i < 3; i++) if (S.cd[i] > 0) S.cd[i] = Math.max(0, S.cd[i] - dt);
      if (!S.cut) S.fat = Math.max(0, S.fat - FAT_REGEN * g);
      if (S.fatShake > 0) S.fatShake -= dt;
      if (S.judge) { S.judge.t += dt; if (S.judge.t > 1) S.judge = null; }
      S.bubbleT -= dt;
      if (S.bubbleT <= 0) { S.bubble = CHEERS[Math.floor(Math.random() * CHEERS.length)]; S.bubbleT = 5 + Math.random() * 3; S.bubbleShow = 2.2; }
      if (S.bubbleShow > 0) { S.bubbleShow -= dt; if (S.bubbleShow <= 0) S.bubble = null; }
      if (S.timeLeft <= 0 && !S.cut) { S.timeLeft = 0; startFinale(); }
      if (!S.cut && S.fans.every(function (f) { return f.done; })) startFinale();
    } else if (S.phase === 'finale') {
      S.finaleT -= dt;
      if (S.finaleT <= 0 && !S.cut) endNow(true);
    }
    if (!S || S.ended) return;
    // 카메라
    var tx = clamp(S.px, VIEW_W / 2, WORLD_W - VIEW_W / 2);
    var viewH = S.H / S.s;
    var ty = clamp(S.py - viewH * 0.08, viewH / 2, Math.max(viewH / 2, WORLD_H - viewH / 2));
    S.camX += (tx - S.camX) * Math.min(1, dt * 6); S.camY += (ty - S.camY) * Math.min(1, dt * 6);
  }

  // 시간이 끝나면 자동으로 마지막 앵콜
  function startFinale() {
    if (S.phase !== 'play') return;
    S.phase = 'finale';
    var any = S.fans.some(function (f) { return !f.done && f.g >= 100; });
    if (any) { S.finaleT = 4.2; startCut(SKILLS[2], 2); }
    else { showBanner('🎉 공연 완료!', '255,205,90'); S.finaleT = 1.3; }
  }

  // ── 그리기 ──
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function outlined(c, text, x, y, size, fill, stroke) {
    c.font = '900 ' + size + 'px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = Math.max(3, size / 5); c.strokeStyle = stroke || 'rgba(40,0,50,0.9)'; c.lineJoin = 'round';
    c.strokeText(text, x, y); c.fillStyle = fill || '#fff'; c.fillText(text, x, y);
  }
  function star4(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot); c.beginPath();
    for (var i = 0; i < 8; i++) { var rr = i % 2 ? r * 0.28 : r, a = i * Math.PI / 4; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill(); c.restore();
  }

  function drawWorld(c) {
    var bg = IMGS[BG_FILE];
    if (bg && bg.ok) { c.drawImage(bg.im, 0, 0, WORLD_W, WORLD_H); }
    else {
      var g = c.createLinearGradient(0, 0, 0, WORLD_H);
      g.addColorStop(0, '#2a1450'); g.addColorStop(0.3, '#3a1c66'); g.addColorStop(1, '#1d1038');
      c.fillStyle = g; c.fillRect(0, 0, WORLD_W, WORLD_H);
      c.fillStyle = 'rgba(255,255,255,0.05)';
      BLOCK_X.forEach(function (cols) { c.fillRect(cols[0] - 70, ROW_Y[0] - 80, cols[2] - cols[0] + 140, ROW_Y[ROW_Y.length - 1] - ROW_Y[0] + 160); });
      c.fillStyle = 'rgba(255,200,120,0.10)'; c.fillRect(400, STAGE.y1, 200, WORLD_H - STAGE.y1);
      var sg = c.createLinearGradient(0, STAGE.y0, 0, STAGE.y1);
      sg.addColorStop(0, '#5b2a9a'); sg.addColorStop(1, '#a04cd0');
      c.fillStyle = sg; roundRect(c, STAGE.x0, STAGE.y0, STAGE.x1 - STAGE.x0, STAGE.y1 - STAGE.y0, 30); c.fill();
      c.font = '900 56px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillText('🎪 STAGE', WORLD_W / 2, (STAGE.y0 + STAGE.y1) / 2 + 18);
    }
  }
  // 무대 조명 빔: 천천히 좌우로 쓸고 지나가는 색색의 빛줄기
  function drawBeams(c) {
    var cols = ['255,120,200', '170,130,255', '255,215,120', '120,220,255', '255,150,200'];
    var boost = S.cut ? 1.6 : 1;
    c.save(); c.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 5; i++) {
      var ox = 200 + i * 150, sw = Math.sin(S.t * 0.7 + i * 1.7) * 150, tipX = ox + sw, baseX = ox + sw * 1.6;
      var len = 760 + Math.sin(S.t * 0.9 + i) * 80;
      var g = c.createLinearGradient(ox, 50, baseX, 50 + len);
      g.addColorStop(0, 'rgba(' + cols[i] + ',' + (0.30 * boost).toFixed(2) + ')'); g.addColorStop(1, 'rgba(' + cols[i] + ',0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(ox - 14, 50); c.lineTo(ox + 14, 50); c.lineTo(baseX + 110, 50 + len); c.lineTo(baseX - 110, 50 + len); c.closePath(); c.fill();
    }
    c.restore();
  }
  function drawFan(c, f, idx) {
    var rec = IMGS[FAN_FILES[f.img]];
    var hop = f.hop > 0 ? Math.sin((1 - f.hop) * Math.PI) * 22 : 0;
    var sway = Math.sin(S.t * 3 + f.pulse) * 2;
    var scale = 1 + (f.hop > 0 ? Math.sin((1 - f.hop) * Math.PI) * 0.22 : 0);
    var full = !f.done && f.g >= 100;
    // 응원봉 (게이지가 찰수록 밝아짐)
    if (!f.done) {
      var glow = 0.25 + f.vis / 100 * 0.75, ang = -0.5 + Math.sin(S.t * 4 + f.pulse * 2) * 0.35;
      c.save(); c.translate(f.x + 26, f.y + 6 - hop); c.rotate(ang);
      c.globalCompositeOperation = 'lighter';
      var rg = c.createRadialGradient(0, -18, 2, 0, -18, 26 + glow * 16); rg.addColorStop(0, 'rgba(' + (full ? '255,220,110' : '255,120,190') + ',' + (0.55 * glow).toFixed(2) + ')'); rg.addColorStop(1, 'rgba(255,120,190,0)');
      c.fillStyle = rg; c.fillRect(-50, -70, 100, 100);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = full ? '#ffe9a0' : '#ff9fd0'; roundRect(c, -3.5, -34, 7, 36, 3.5); c.fill();
      c.restore();
    }
    if (full) {      // 가득 찬 팬은 금빛으로 맥동
      var pu = 1 + Math.sin(S.t * 7 + f.pulse) * 0.18;
      c.save(); c.globalCompositeOperation = 'lighter';
      var ag = c.createRadialGradient(f.x, f.y, 6, f.x, f.y, 52 * pu); ag.addColorStop(0, 'rgba(255,225,120,0.55)'); ag.addColorStop(1, 'rgba(255,200,80,0)');
      c.fillStyle = ag; c.beginPath(); c.arc(f.x, f.y, 52 * pu, 0, 6.283); c.fill(); c.restore();
    }
    c.save(); c.translate(f.x + sway * 0.2, f.y - hop); c.scale(scale, scale);
    c.globalAlpha = f.done ? 0.5 : 1;
    if (rec && rec.ok) c.drawImage(rec.im, -FAN_R, -FAN_R, FAN_R * 2, FAN_R * 2);
    else { c.fillStyle = f.done ? '#7a6a8c' : '#e9d5ff'; c.beginPath(); c.arc(0, 0, FAN_R * 0.8, 0, 6.283); c.fill(); c.font = '30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(f.done ? '😍' : '🙂', 0, 2); }
    c.restore();
    if (f.done) return;
    // 하트 게이지
    var w = 56, h = 10, x = f.x - w / 2, y = f.y - FAN_R - 22 - hop * 0.6, p = clamp(f.vis / 100, 0, 1);
    c.fillStyle = 'rgba(20,6,36,0.8)'; roundRect(c, x - 2.5, y - 2.5, w + 5, h + 5, 7); c.fill();
    if (p > 0) {
      var gg = c.createLinearGradient(x, 0, x + w, 0);
      if (full) { gg.addColorStop(0, '#ffb300'); gg.addColorStop(0.5, '#fff1a8'); gg.addColorStop(1, '#ffb300'); }
      else { gg.addColorStop(0, '#ff8fc4'); gg.addColorStop(1, '#ff4f9a'); }
      c.fillStyle = gg; roundRect(c, x, y, Math.max(h, w * p), h, 5); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.35)'; roundRect(c, x + 2, y + 1.5, Math.max(4, w * p - 4), 3, 2); c.fill();
    }
    c.lineWidth = 1.5; c.strokeStyle = full ? 'rgba(255,230,140,0.95)' : 'rgba(255,255,255,0.55)'; roundRect(c, x - 2.5, y - 2.5, w + 5, h + 5, 7); c.stroke();
    c.font = '15px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    var hs = full ? 1 + Math.sin(S.t * 9 + f.pulse) * 0.18 : 1;
    c.save(); c.translate(x - 9, y + 5); c.scale(hs, hs); c.fillText(full ? '💖' : '🤍', 0, 0); c.restore();
    if (f.pop) {
      var pp = f.pop.t / 0.9;
      c.globalAlpha = 1 - Math.pow(pp, 2);
      outlined(c, f.pop.text, f.x, y - 12 - easeOutCubic(pp) * 34, f.pop.gold ? 20 : 18, f.pop.gold ? '#ffe27a' : '#fff', f.pop.gold ? 'rgba(120,60,0,0.95)' : 'rgba(180,20,100,0.95)');
      c.globalAlpha = 1;
    }
  }
  function drawToken(c, x, y, rec, emoji, color, label, opt) {
    opt = opt || {};
    var bob = opt.moving ? Math.abs(Math.sin(S.t * 14)) * 6 : Math.sin(S.t * 2.4 + (opt.ph || 0)) * 2;
    var sq = opt.moving ? 1 + Math.sin(S.t * 14) * 0.07 : 1 + Math.sin(S.t * 2.4 + (opt.ph || 0)) * 0.02;
    var jump = (opt.jump || 0) > 0 ? Math.sin((1 - opt.jump) * Math.PI) * 34 : 0;
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(0, 28, 24 - jump * 0.2, 9 - jump * 0.1, 0, 0, 6.283); c.fill();
    c.translate(0, -bob - jump); c.scale(1 / sq, sq);
    // 후광
    c.save(); c.globalCompositeOperation = 'lighter';
    var gl = c.createRadialGradient(0, 0, 10, 0, 0, 56 + Math.sin(S.t * 5) * 4); gl.addColorStop(0, 'rgba(' + (opt.glow || '255,150,210') + ',0.5)'); gl.addColorStop(1, 'rgba(255,150,210,0)');
    c.fillStyle = gl; c.beginPath(); c.arc(0, 0, 60, 0, 6.283); c.fill(); c.restore();
    c.beginPath(); c.arc(0, 0, 28, 0, 6.283); c.fillStyle = color; c.fill();
    if (rec && rec.ok) { c.save(); c.beginPath(); c.arc(0, 0, 25, 0, 6.283); c.clip(); c.drawImage(rec.im, -30, -29, 60, 60); c.restore(); }
    else { c.font = '32px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(emoji, 0, 2); }
    c.lineWidth = 4; c.strokeStyle = '#fff'; c.beginPath(); c.arc(0, 0, 28, 0, 6.283); c.stroke();
    c.restore();
    outlined(c, label, x, y + 46, 16, '#fff');
  }
  function drawFaceCircle(c, x, y, r, rec, emoji, color) {
    c.save(); c.translate(x, y);
    c.shadowColor = 'rgba(' + color + ',0.9)'; c.shadowBlur = 22;
    c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.fillStyle = 'rgb(' + color + ')'; c.fill(); c.shadowBlur = 0;
    if (rec && rec.ok) { c.save(); c.beginPath(); c.arc(0, 0, r - 4, 0, 6.283); c.clip(); c.drawImage(rec.im, -r * 1.12, -r * 1.1, r * 2.24, r * 2.24); c.restore(); }
    else { c.font = (r * 1.1) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(emoji, 0, 3); }
    c.lineWidth = 5; c.strokeStyle = '#fff'; c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.stroke();
    c.restore();
  }

  function draw() {
    var c = S.ctx, W = S.W, H = S.H, s = S.s;
    c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    c.fillStyle = '#140a24'; c.fillRect(0, 0, W, H);
    var amp = S.shake > 0 ? Math.min(1, S.shake * 2.2) : 0;
    var shx = (Math.random() - 0.5) * 14 * amp, shy = (Math.random() - 0.5) * 14 * amp;
    var zoom = 1 + S.zoomP * 0.07;
    c.save();
    c.translate(W / 2 + shx, H / 2 + shy); c.scale(s * zoom, s * zoom); c.translate(-S.camX, -S.camY);
    drawWorld(c);
    drawBeams(c);
    // 스킬 범위 미리보기: 쓸 수 있는 스킬만 은은하게 맥동
    if (S.phase === 'play' && !S.cut) {
      SKILLS.forEach(function (k, i) {
        if (k.finale || S.cd[i] > 0) return;
        var pu = 0.22 + Math.sin(S.t * 4 + i) * 0.08;
        c.strokeStyle = 'rgba(' + k.rgb + ',' + pu.toFixed(2) + ')'; c.lineWidth = 3; c.setLineDash([14, 12]); c.lineDashOffset = -S.t * 30;
        c.beginPath(); c.arc(S.px, S.py, k.radius, 0, 6.283); c.stroke(); c.setLineDash([]);
      });
    }
    // 이동 목표 표시 (물결)
    if (S.moving) {
      var tr = (S.t * 1.6) % 1; c.strokeStyle = 'rgba(255,255,255,' + (0.8 - tr * 0.8).toFixed(2) + ')'; c.lineWidth = 3;
      c.beginPath(); c.arc(S.tx, S.ty, 8 + tr * 26, 0, 6.283); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(S.tx, S.ty, 4, 0, 6.283); c.fill();
    }
    // 팬 (위에서 아래 순서)
    S.fans.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (f, i) { drawFan(c, f, i); });
    // 스킬 링 (더하기 합성)
    c.save(); c.globalCompositeOperation = 'lighter';
    S.rings.forEach(function (r) {
      if (r.t < 0) return;
      var p = r.t / r.dur, rad = r.r0 + (r.r1 - r.r0) * easeOutCubic(p);
      c.strokeStyle = 'rgba(' + r.rgb + ',' + (1 - p).toFixed(2) + ')'; c.lineWidth = 22 * (1 - p) + 3;
      c.beginPath(); c.arc(r.x, r.y, rad, 0, 6.283); c.stroke();
      var rg = c.createRadialGradient(r.x, r.y, rad * 0.55, r.x, r.y, rad); rg.addColorStop(0, 'rgba(' + r.rgb + ',0)'); rg.addColorStop(1, 'rgba(' + r.rgb + ',' + ((1 - p) * 0.28).toFixed(3) + ')');
      c.fillStyle = rg; c.beginPath(); c.arc(r.x, r.y, rad, 0, 6.283); c.fill();
    });
    c.restore();
    // 세연 / 나 (아래에 있는 쪽이 앞)
    var toks = [{ y: S.ny, f: function () { drawToken(c, S.nx, S.ny, IMGS[SEYEON_FACE], '🌟', '#f59e0b', '세연', { ph: 1.5, jump: S.nJump, glow: '255,210,110' }); if (S.bubble) bubble(c, S.nx, S.ny - 56, S.bubble); } },
                { y: S.py, f: function () { drawToken(c, S.px, S.py, S.faceFile ? IMGS[S.faceFile] : null, '🙋', '#ec4899', S.charName, { moving: S.moving, jump: S.cut ? 0.5 : 0 }); } }].sort(function (a, b) { return a.y - b.y; });
    toks.forEach(function (t) { t.f(); });
    // 하트·별이 날아가는 파티클
    S.parts.forEach(function (q) {
      if (q.t < 0) return;
      var p = q.t / q.dur; c.globalAlpha = 1 - Math.pow(p, 3); c.font = q.sz + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (q.burst) { var sc = 0.6 + p * 1.2; c.save(); c.translate(q.x, q.y - p * 60); c.scale(sc, sc); c.fillText(q.ch, 0, 0); c.restore(); }
      else {
        var e = 1 - Math.pow(1 - p, 2), px = q.x + (q.tx - q.x) * e, py = q.y + (q.ty - q.y) * e - Math.sin(p * 3.14) * 40;
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(' + (q.rgb || '255,150,200') + ',0.35)'; c.beginPath(); c.arc(px, py, q.sz * 0.8, 0, 6.283); c.fill(); c.restore();
        c.fillText(q.ch, px, py);
      }
      c.globalAlpha = 1;
    });
    // 불꽃·반짝이 (더하기 합성)
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    S.sparks.forEach(function (sp) {
      if (sp.life < 0) return;
      if (sp.ring) { var pr = sp.life / sp.max; c.strokeStyle = 'rgba(' + sp.rgb + ',' + (0.7 * (1 - pr)).toFixed(2) + ')'; c.lineWidth = 5 * (1 - pr) + 1; c.beginPath(); c.arc(sp.x, sp.y, 8 + pr * 90, 0, 6.283); c.stroke(); return; }
      var a = sp.rocket ? 1 : clamp(1 - sp.life / sp.max, 0, 1);
      c.strokeStyle = 'rgba(' + sp.rgb + ',' + a.toFixed(2) + ')'; c.lineWidth = sp.sz * (sp.rocket ? 1.2 : (0.4 + a * 0.6));
      c.beginPath(); c.moveTo(sp.x - sp.vx * 0.035, sp.y - sp.vy * 0.035); c.lineTo(sp.x, sp.y); c.stroke();
    });
    c.restore();
    // 떠오르는 글씨
    S.floats.forEach(function (f) { var p = f.t / f.dur; c.globalAlpha = 1 - Math.pow(p, 2); outlined(c, f.text, f.x, f.y - p * 50, f.size, f.color); c.globalAlpha = 1; });
    c.restore();

    // ── 화면 고정 효과 ──
    // 가장자리 어둡게 (비네트)
    var vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(10,2,24,0)'); vg.addColorStop(1, 'rgba(10,2,24,0.55)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    // 떠다니는 꽃잎·별
    S.petals.forEach(function (p) { c.save(); c.globalAlpha = p.a * 0.8; c.translate(p.x, p.y); c.rotate(p.rot); c.font = p.sz + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.ch, 0, 0); c.restore(); });
    // 종이 꽃가루
    S.confetti.forEach(function (q) { c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.scale(1, Math.abs(Math.sin(q.rot * 1.3)) * 0.8 + 0.2); c.fillStyle = 'rgb(' + q.col + ')'; c.fillRect(-q.sz / 2, -q.sz / 4, q.sz, q.sz / 2); c.restore(); });
    if (S.flash > 0) { c.fillStyle = 'rgba(' + S.flashRgb + ',' + clamp(S.flash * 0.9, 0, 0.9).toFixed(2) + ')'; c.fillRect(0, 0, W, H); }
    drawHud(c);
    // 날아가는 재료 → 🎁 카운터
    S.fly.forEach(function (f) {
      var p = easeOutCubic(f.t / f.dur), a = toScreen(f.wx, f.wy), tx = W / 2 + 46, ty = 29;
      var x = a[0] + (tx - a[0]) * p, y = a[1] + (ty - a[1]) * p - Math.sin(p * 3.14) * 90;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (var k = 1; k <= 4; k++) { var pk = Math.max(0, p - k * 0.04), xk = a[0] + (tx - a[0]) * pk, yk = a[1] + (ty - a[1]) * pk - Math.sin(pk * 3.14) * 90; c.fillStyle = 'rgba(' + (f.rare ? '255,215,90' : '255,255,255') + ',' + (0.35 - k * 0.07).toFixed(2) + ')'; c.beginPath(); c.arc(xk, yk, 12 - k * 2, 0, 6.283); c.fill(); }
      c.restore();
      c.font = (f.rare ? 34 : 28) * (1.3 - p * 0.5) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(f.ch, x, y);
    });
    if (S.banner) {
      var b = S.banner, p = b.t / b.dur, sc = 1 + (1 - Math.min(1, p * 4)) * 0.6, a = p > 0.7 ? (1 - p) / 0.3 : 1;
      c.save(); c.globalAlpha = Math.max(0, a); c.translate(W / 2, H * 0.3); c.scale(sc, sc);
      var bs = Math.min(40, W / 9); c.font = '900 ' + bs + 'px "Noto Sans KR",sans-serif';
      var tw = c.measureText(b.text).width; if (tw > (W - 40) / sc) bs = Math.floor(bs * (W - 40) / sc / tw);
      outlined(c, b.text, 0, 0, bs, '#fff', 'rgba(' + b.rgb + ',0.95)'); c.restore();
    }
    if (S.cut) drawCut(c);
    if (S.phase === 'intro') drawIntro(c);
    if (S.phase === 'pick') { c.fillStyle = 'rgba(10,5,20,0.55)'; c.fillRect(0, 0, W, H); }
    if (S.phase === 'play' && S.hintT > 0 && !S.cut) {
      var ha = Math.min(1, S.hintT / 1.2);
      c.save(); c.globalAlpha = ha; var hy = H * 0.5 + Math.sin(S.t * 5) * 6;
      outlined(c, '👆 눌러서 객석으로 이동!', W / 2, hy, 20, '#fff', 'rgba(120,20,100,0.95)');
      outlined(c, '링이 딱 모일 때 누르면 PERFECT!', W / 2, hy + 30, 16, '#ffe3f0', 'rgba(120,20,100,0.95)'); c.restore();
    }
  }

  // 스킬 컷인: 어두워진 화면 위로 띠가 펼쳐지고 멤버 얼굴이 튀어나오며 스킬 이름이 날아온다
  function drawCut(c) {
    var k = S.cut.k, W = S.W, H = S.H, t = S.cut.t, dur = S.cut.dur;
    var inP = clamp(t / 0.2, 0, 1), outP = clamp((t - (dur - 0.22)) / 0.22, 0, 1), e = easeOutBack(inP), a = 1 - outP;
    c.fillStyle = 'rgba(8,2,22,' + (0.62 * a * inP).toFixed(2) + ')'; c.fillRect(0, 0, W, H);
    var cy = H * 0.38, bh = Math.min(190, H * 0.24);
    // 띠
    c.save(); c.translate(W / 2, cy); c.scale(1, Math.max(0.01, e * (1 - outP * 0.7))); c.globalAlpha = a;
    c.transform(1, 0, -0.2, 1, 0, 0);
    var g = c.createLinearGradient(-W / 2, 0, W / 2, 0);
    g.addColorStop(0, 'rgba(25,8,50,0.95)'); g.addColorStop(0.35, 'rgba(' + k.rgb + ',0.92)'); g.addColorStop(0.75, 'rgba(' + k.rgb + ',0.78)'); g.addColorStop(1, 'rgba(25,8,50,0.95)');
    c.fillStyle = g; c.fillRect(-W, -bh / 2, W * 2, bh);
    c.save(); c.beginPath(); c.rect(-W, -bh / 2, W * 2, bh); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.13)';
    for (var i = -12; i < 12; i++) { var sx = i * 70 + (t * 260) % 70; c.save(); c.translate(sx, 0); c.transform(1, 0, 0.7, 1, 0, 0); c.fillRect(0, -bh / 2, 26, bh); c.restore(); }
    c.restore();
    c.fillStyle = '#fff'; c.shadowColor = 'rgb(' + k.rgb + ')'; c.shadowBlur = 18; c.fillRect(-W, -bh / 2 - 3, W * 2, 5); c.fillRect(-W, bh / 2 - 2, W * 2, 5); c.shadowBlur = 0;
    c.restore();
    // 속도선
    c.save(); c.globalAlpha = 0.5 * a * inP; c.strokeStyle = 'rgba(255,255,255,0.9)';
    S.cut.lines.forEach(function (ln) {
      var r1 = bh * 0.8 + Math.sin(t * 40 + ln.a * 9) * 10, r2 = r1 + ln.l * W * 0.55;
      c.lineWidth = ln.w; c.beginPath(); c.moveTo(W / 2 + Math.cos(ln.a) * r1, cy + Math.sin(ln.a) * r1 * 0.55); c.lineTo(W / 2 + Math.cos(ln.a) * r2, cy + Math.sin(ln.a) * r2 * 0.55); c.stroke();
    });
    c.restore();
    // 반짝이
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,255,255,' + (0.9 * a).toFixed(2) + ')';
    for (var q = 0; q < 12; q++) { var qx = (q * 97 + t * 60 * (q % 2 ? 1 : -1)) % W; if (qx < 0) qx += W; star4(c, qx, cy + Math.sin(q * 3.1 + t * 6) * bh * 0.6, 5 + (q % 3) * 4 * Math.abs(Math.sin(t * 8 + q)), t * 4 + q); }
    c.restore();
    // 멤버 얼굴 (왼쪽에서 튀어나옴)
    var fr = bh * 0.62, fx = W * 0.2 - (1 - e) * W * 0.5 - outP * W * 0.3;
    c.save(); c.globalAlpha = a; drawFaceCircle(c, fx, cy - bh * 0.06, fr, S.faceFile ? IMGS[S.faceFile] : null, '🙋', k.rgb); c.restore();
    if (k.finale) { c.save(); c.globalAlpha = a; drawFaceCircle(c, W - fx, cy - bh * 0.06, fr * 0.8, IMGS[SEYEON_FACE], '🌟', '255,210,110'); c.restore(); }
    // 스킬 이름 (오른쪽에서 날아옴)
    var tx = W * (k.finale ? 0.5 : 0.6) + (1 - e) * W * 0.8 + outP * W * 0.5, size = Math.min(40, W / 9.5);
    c.save(); c.globalAlpha = a; c.translate(tx, cy - 10); c.transform(1, 0, -0.2, 1, 0, 0);
    c.font = '900 ' + size + 'px "Noto Sans KR",sans-serif'; var label = k.icon + ' ' + k.name; var tw = c.measureText(label).width, maxW = W * (k.finale ? 0.52 : 0.62);
    if (tw > maxW) size = Math.floor(size * maxW / tw);
    c.shadowColor = 'rgb(' + k.rgb + ')'; c.shadowBlur = 24;
    outlined(c, label, 0, 0, size, '#fff', 'rgba(' + k.rgb + ',1)'); c.shadowBlur = 0;
    outlined(c, k.desc, 0, size * 0.85, Math.max(13, size * 0.42), '#ffe9f4', 'rgba(60,10,70,0.95)');
    c.restore();
  }

  function bubble(c, x, y, text) {
    c.font = '900 16px "Noto Sans KR",sans-serif'; var w = c.measureText(text).width + 22;
    c.fillStyle = 'rgba(255,255,255,0.95)'; roundRect(c, x - w / 2, y - 18, w, 30, 12); c.fill();
    c.fillStyle = '#4a1d6e'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y - 3);
  }

  function drawHud(c) {
    var W = S.W, H = S.H;
    c.fillStyle = 'rgba(20,10,36,0.72)'; roundRect(c, 10, 10, 96, 36, 18); c.fill();
    c.fillStyle = '#fff'; c.font = '900 14px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('← 나가기', 58, 29);
    var full = S.fans.filter(function (f) { return !f.done && f.g >= 100; }).length, done = S.fans.filter(function (f) { return f.done; }).length;
    c.fillStyle = 'rgba(20,10,36,0.72)'; roundRect(c, W / 2 - 74, 10, 148, 36, 18); c.fill();
    c.fillStyle = S.timeLeft <= 10 ? '#ff7a7a' : '#fff'; c.font = '900 16px "Noto Sans KR",sans-serif';
    c.fillText('⏱ ' + Math.ceil(S.timeLeft) + '초', W / 2 - 20, 29);
    c.save(); c.translate(W / 2 + 46, 29); var gb = 1 + S.giftBump * 0.5; c.scale(gb, gb); c.fillStyle = S.giftBump > 0 ? '#fff6c0' : '#ffd700'; c.fillText('🎁 ' + S.drops, 0, 0); c.restore();
    c.fillStyle = 'rgba(20,10,36,0.72)'; roundRect(c, W - 126, 10, 116, 36, 18); c.fill();
    c.fillStyle = '#ff9ccf'; c.font = '900 16px "Noto Sans KR",sans-serif'; c.fillText('💖 ' + full + ' · 😍 ' + done, W - 68, 29);
    if (S.phase === 'play') {
      var b0 = btnRect(0), b2 = btnRect(2), fx = b0.x, fw = b2.x + b2.w - b0.x, fy = b0.y - 22, p = clamp(S.fat / 100, 0, 1), hot = p > 0.7;
      var sh = S.fatShake > 0 ? Math.sin(S.t * 90) * 4 : 0;
      c.save(); c.translate(sh, 0);
      c.fillStyle = 'rgba(20,10,36,0.85)'; roundRect(c, fx - 2, fy - 2, fw + 4, 16, 8); c.fill();
      var fg = c.createLinearGradient(fx, 0, fx + fw, 0); fg.addColorStop(0, '#6ee7b7'); fg.addColorStop(0.6, '#fcd34d'); fg.addColorStop(1, '#f87171');
      if (p > 0) { c.fillStyle = fg; c.save(); roundRect(c, fx, fy, fw, 12, 6); c.clip(); c.fillRect(fx, fy, fw * p, 12); c.restore(); }
      c.lineWidth = 1.5; c.strokeStyle = hot ? 'rgba(255,120,120,' + (0.6 + Math.sin(S.t * 10) * 0.4).toFixed(2) + ')' : 'rgba(255,255,255,0.4)'; roundRect(c, fx - 2, fy - 2, fw + 4, 16, 8); c.stroke();
      c.font = '900 10px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText('😮‍💨 피로도 ' + Math.round(S.fat) + '%', fx + fw / 2, fy + 6.5);
      c.restore();
      var d = drinkRect(), canDrink = S.drinks > 0 && S.fat > 0;
      c.save(); if (canDrink && hot) { var dp = 1 + Math.sin(S.t * 8) * 0.06; c.translate(d.x + d.w / 2, d.y + d.h / 2); c.scale(dp, dp); c.translate(-d.x - d.w / 2, -d.y - d.h / 2); c.shadowColor = '#6ee7b7'; c.shadowBlur = 16; }
      c.fillStyle = 'rgba(20,10,36,0.85)'; roundRect(c, d.x, d.y, d.w, d.h, 16); c.fill(); c.shadowBlur = 0;
      c.lineWidth = canDrink && hot ? 4 : 2; c.strokeStyle = canDrink ? '#6ee7b7' : 'rgba(255,255,255,0.25)'; c.stroke();
      c.globalAlpha = canDrink ? 1 : 0.45; c.font = '26px sans-serif'; c.fillStyle = '#fff'; c.fillText(DRINK_EMOJI, d.x + d.w / 2, d.y + 22);
      c.font = '900 12px "Noto Sans KR",sans-serif'; c.fillText('×' + S.drinks, d.x + d.w / 2, d.y + 44); c.restore();
    }
    if (S.judge) { var jp = S.judge.t; c.save(); c.globalAlpha = 1 - jp * jp; var js = 1 + (1 - Math.min(1, jp * 6)) * 0.5; c.translate(W / 2, H * 0.55 - jp * 30); c.scale(js, js); outlined(c, S.judge.text, 0, 0, 34, '#ffe27a', 'rgba(120,50,0,0.95)'); c.restore(); }
    for (var i = 0; i < 3; i++) {
      var k = SKILLS[i], b = btnRect(i), cd = S.cd[i], ready = cd <= 0;
      var canEncore = !k.finale || full > 0, lit = ready && canEncore && (!k.fat || S.fat + k.fat <= 100);
      c.save();
      if (lit) { var pu = 1 + Math.sin(S.t * 6 + i) * 0.04; c.translate(b.x + b.w / 2, b.y + b.h / 2); c.scale(pu, pu); c.translate(-(b.x + b.w / 2), -(b.y + b.h / 2)); c.shadowColor = 'rgb(' + k.rgb + ')'; c.shadowBlur = 18; }
      c.fillStyle = 'rgba(20,10,36,0.85)'; roundRect(c, b.x, b.y, b.w, b.h, 18); c.fill();
      c.shadowBlur = 0;
      if (lit && !k.finale && !S.cut) {          // 모이는 링: 버튼 테두리에 딱 맞을 때(금색) 누르면 PERFECT
        var rp = ringPhase(), inW = rp >= PERFECT_FROM, grow = (1 - rp) * 20;
        c.save(); c.lineWidth = inW ? 5 : 3; c.strokeStyle = inW ? '#ffe27a' : 'rgba(255,255,255,0.75)';
        if (inW) { c.shadowColor = '#ffd54a'; c.shadowBlur = 14; }
        roundRect(c, b.x - grow, b.y - grow, b.w + grow * 2, b.h + grow * 2, 18 + grow); c.stroke(); c.restore();
      }
      c.lineWidth = lit ? 4 : 2; c.strokeStyle = lit ? 'rgb(' + k.rgb + ')' : 'rgba(255,255,255,0.25)'; c.stroke();
      c.font = '30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.globalAlpha = ready ? 1 : 0.5; c.fillText(k.icon, b.x + b.w / 2, b.y + 28);
      c.globalAlpha = 1; c.fillStyle = '#fff'; c.font = '900 10.5px "Noto Sans KR",sans-serif';
      c.fillText(k.short, b.x + b.w / 2, b.y + 58);
      if (k.fat) { c.fillStyle = (S.fat + k.fat > 100) ? '#ff8a8a' : '#a7f3d0'; c.font = '900 9.5px "Noto Sans KR",sans-serif'; c.fillText('피로 +' + k.fat, b.x + b.w / 2, b.y + 70); }
      if (!ready) { c.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(c, b.x, b.y + b.h * (1 - cd / k.cd), b.w, b.h * (cd / k.cd), 18); c.fill(); c.fillStyle = '#fff'; c.font = '900 18px "Noto Sans KR",sans-serif'; c.fillText(Math.ceil(cd), b.x + b.w / 2, b.y + 30); }
      else if (k.finale && full > 0) { c.fillStyle = '#ffd700'; c.font = '900 11px "Noto Sans KR",sans-serif'; c.fillText(full + '명 준비!', b.x + b.w / 2, b.y - 8); }
      c.restore();
    }
  }

  function drawIntro(c) {
    var W = S.W, H = S.H;
    c.fillStyle = 'rgba(10,5,20,0.55)'; c.fillRect(0, 0, W, H);
    var bw = Math.min(W - 24, 420), bh = 150, bx = (W - bw) / 2, by = H - bh - 30;
    c.fillStyle = 'rgba(30,14,54,0.96)'; roundRect(c, bx, by, bw, bh, 20); c.fill();
    c.lineWidth = 3; c.strokeStyle = '#f59e0b'; c.stroke();
    drawToken(c, bx + 52, by - 6, IMGS[SEYEON_FACE], '🌟', '#f59e0b', '', { glow: '255,210,110' });
    c.fillStyle = '#f59e0b'; c.font = '900 15px "Noto Sans KR",sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText('🌟 세연', bx + 96, by + 14);
    c.fillStyle = '#fff'; c.font = '700 15px "Noto Sans KR",sans-serif';
    wrap(c, INTRO[S.introIdx], bx + 20, by + 44, bw - 40, 22);
    c.fillStyle = 'rgba(255,255,255,' + (0.5 + Math.sin(S.t * 5) * 0.3).toFixed(2) + ')'; c.font = '700 12px "Noto Sans KR",sans-serif'; c.textAlign = 'right';
    c.fillText('눌러서 계속 ▶ ' + (S.introIdx + 1) + '/' + (S.charId ? INTRO.length - 1 : INTRO.length), bx + bw - 16, by + bh - 22);
  }
  function wrap(c, text, x, y, maxW, lh) {
    var line = '', ly = y; c.textAlign = 'left';
    for (var i = 0; i < text.length; i++) {
      var t = line + text[i];
      if (c.measureText(t).width > maxW) { c.fillText(line, x, ly); ly += lh; line = text[i]; } else line = t;
    }
    c.fillText(line, x, ly);
  }

  // ── 종료 / 결과 ──
  function endNow(normal) {
    if (!S || S.ended) return;
    S.ended = true;
    cancelAnimationFrame(S.raf);
    window.removeEventListener('resize', resize);
    var got = S.collected.slice(), ov = S.overlay, opts = S.opts;
    if (normal && Math.random() < STONE_DROP) {
      if (addToBag('🔹', '재조합석', 'material', 1, '카드 재조합에 필요한 재료')) { got.push('🔹 재조합석'); exploreCollected.push('🔹 재조합석'); }
    }
    var counts = {}, order = [];
    got.forEach(function (n) { if (!(n in counts)) { counts[n] = 0; order.push(n); } counts[n]++; });
    var list = order.length ? order.map(function (n) { return n + (counts[n] > 1 ? ' ×' + counts[n] : ''); }).join('<br>') : '아무것도 못 얻었어요 😢';
    var card = opts.grantCard && typeof window.grantTrialCard === 'function' && normal;
    S = null;
    // 결과 창: 무대 화면(touch-action:none)을 그대로 쓰면 손가락 스크롤이 막히고, 내용이 길면 버튼이 화면 밖에 걸림 → 스크롤 허용 + 길면 위아래로 밀려 올라가게
    ov.style.touchAction = 'pan-y'; ov.style.overflowY = 'auto'; ov.style.webkitOverflowScrolling = 'touch';
    ov.innerHTML = '<div style="position:relative;min-height:100%;box-sizing:border-box;padding:18px 0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.78);">' +
      '<div style="background:linear-gradient(135deg,#1a1a2e,#4a1b6e);border:2px solid #f59e0b;border-radius:20px;padding:26px 22px;text-align:center;width:85%;max-width:300px;">' +
      '<div style="font-size:36px;margin-bottom:6px;">🎪</div>' +
      '<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:8px;">' + (normal ? '무대 대성공!' : '무대에서 나왔어요') + '</div>' +
      '<div style="font-size:14px;color:#FFD700;line-height:1.7;margin:12px 0 ' + (card ? '8' : '16') + 'px;">' + list + '</div>' +
      (card ? '<div style="font-size:12px;color:#fcd34d;margin-bottom:14px;">🌟 세연이 선물을 준비했대요!</div>' : '') +
      '<button id="concert-close" style="width:100%;padding:13px;background:linear-gradient(135deg,#f59e0b,#ec4899);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">' + (card ? '선물 받기 🎁' : '확인') + '</button>' +
      '</div></div>';
    document.getElementById('concert-close').onclick = function () {
      ov.remove();
      if (card) { try { window.grantTrialCard(); } catch (e) {} }
    };
  }

  window.startConcertFarm = startConcert;
  window.__concertTest = { rollDrop: rollDrop, makeFans: makeFans, applyGain: applyGain, encore: encore, SKILLS: SKILLS, get S() { return S; }, castSkill: castSkill, FAN_DROP_P: FAN_DROP_P };

  // 테스트용 주소 파라미터 (?concert=1 카드 지급까지 / ?concert=2 카드 없이)
  try {
    var q = new URLSearchParams(location.search).get('concert');
    if (q === '1' || q === '2') {
      (function wait() {
        if (typeof window.collectExploreItem !== 'function' || typeof window.addToBag !== 'function') { setTimeout(wait, 300); return; }
        setTimeout(function () { startConcert({ grantCard: q === '1', freeDrinks: FREE_DRINKS }); }, 2500);
      })();
    }
  } catch (e) {}
})();
