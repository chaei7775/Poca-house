// ════════════════════════════════
// 💄 뷰티 살롱 스타일링 탐험 (beauty-explore.js)
// 예전 "해변"이 뷰티 살롱이 되면서, 해변의 "💄 스타일링 받기" 버튼(startExplore('beach'))을 이 탐험으로 연결한다.
// 다른 지역 탐험은 그대로. 예전 해변 탐험(beach-explore.js)은 파일만 남아 있고 더 이상 실행되지 않는다.
//   (예전 해변으로 되돌리려면 loader.js 에서 'beauty-explore.js' 한 줄 지우고, game.js 의 beach 그림·이름을 되돌리면 됨)
//
// 흐름: 스태미나 10 소모 → 거울 앞에 앉아 연습생 얼굴이 비친다. 3단계 스타일링을 35초 안에 끝내기
//   1단계 💨 드라이기  : 화면을 좌우로 쓱쓱 (8번 훑으면 완료, 4번·8번째에 재료)
//   2단계 💄 퍼프      : 얼굴에 반짝이는 곳을 톡! 톡! (6번, 2번마다 재료). 💥 NG 표시를 누르면 시간 -3초
//   3단계 ✨ 스프레이  : 화면을 꾹 누르고 있으면 게이지가 차고 "치익!" (2번, 매번 재료). 중간에 손 떼면 게이지가 줄어듦
//   모두 끝내면 "💄 변신 완료!" 희귀 재료 1개 확정. NG 없이 끝내면 보너스 재료 1개 더.
// 재료는 예전 해변 재료 그대로 (반짝이는조개, 달빛모래, 별빛모래, 맑은샘물 / 희귀: 바다진주, 달의눈물).
// 재조합석 18% 판정은 기존 탐험과 동일. 값을 바꾸고 싶으면 아래 설정만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // 예전 해변 탐험이 늦게 실행돼도 "해변" 버튼을 다시 가로채지 못하게 미리 막아둔다
  window.__beachHooked = true;

  // ── 설정 ──
  var SESSION_SEC = 35;       // 탐험 시간
  var STAMINA_COST = 10;      // 기존 탐험과 동일
  var STONE_DROP = 0.25;      // 끝났을 때 재조합석 확률 (기존 탐험과 동일)
  var INTRO_SEC = 0.9;        // 단계가 바뀔 때 안내가 뜨는 시간
  var DRY_NEED = 8;           // 1단계: 좌우로 훑어야 하는 횟수 (한 방향 = 1번)
  var DRY_DROP_AT = [4, 8];   //         재료가 나오는 횟수
  var PUFF_NEED = 6;          // 2단계: 눌러야 하는 곳 수
  var PUFF_LIFE = 2.0;        //         반짝이는 곳이 사라지기까지 (초)
  var PUFF_GAP = 0.5;         //         새로 나타나는 간격 (초)
  var PUFF_MAX = 2;           //         동시에 나와 있는 수
  var NG_CHANCE = 0.22;       //         💥 NG 표시가 섞여 나올 확률
  var NG_PENALTY = 3;         //         NG를 누르면 줄어드는 시간 (초)
  var SPRAY_ROUNDS = 2;       // 3단계: 게이지를 채워야 하는 횟수
  var SPRAY_SEC = 1.8;        //         꾹 눌러서 가득 채우는 데 걸리는 시간 (초)
  var BG_FILE = 'map-beauty.png';
  var FACE_IDS = ['ara', 'doyun', 'harin', 'minjun', 'sion', 'yuna'];   // 거울에 비치는 얼굴 (매번 랜덤)

  // 이미지 좌표(1619x972) 기준. 거울 안쪽 영역과 얼굴 위치 (대략값. 어긋나면 숫자만 조절)
  var IMG_W = 1619, IMG_H = 972;
  var MIRROR = { x0: 455, x1: 1125, y0: 140, y1: 360 };
  var FACE_X = 790, FACE_Y = 258, FACE_SZ = 205;
  var ZOOM = 1.3;             // 거울 쪽으로 확대하는 정도

  // 퍼프로 누르는 곳 (얼굴 크기 대비 비율, 가운데가 0)
  var SPOTS = [
    { fx: 0.00, fy: -0.30, rgb: '255,255,255' },   // 이마 하이라이트
    { fx: -0.27, fy: 0.10, rgb: '255,120,170' },   // 왼쪽 볼
    { fx: 0.27, fy: 0.10, rgb: '255,120,170' },    // 오른쪽 볼
    { fx: -0.20, fy: -0.07, rgb: '190,130,255' },  // 왼쪽 눈가
    { fx: 0.20, fy: -0.07, rgb: '190,130,255' },   // 오른쪽 눈가
    { fx: 0.00, fy: 0.30, rgb: '255,110,110' }     // 입가
  ];
  var STAGES = [
    { icon: '💨', name: '드라이기', tip: '좌우로 쓱쓱 훑어서 머리를 말려요!' },
    { icon: '💄', name: '메이크업', tip: '반짝이는 곳을 톡톡! NG는 피해요' },
    { icon: '✨', name: '스프레이', tip: '꾹 눌러서 게이지를 채워요!' }
  ];

  // 도구 그림 (beauty-*.png). 그림이 아직 안 불러와졌으면 이모지로 대신 그린다.
  var PIC_KEYS = ['dryer', 'puff', 'spray', 'sparkle', 'ng'];
  var PIC_EMOJI = { dryer: '💨', puff: '💄', spray: '✨', sparkle: '✨', ng: '💥' };
  var STAGE_PIC = ['dryer', 'puff', 'spray'];
  var PICS = {};
  function pic(key) {
    if (!PICS[key]) { var im = new Image(); im.onload = function () { im._ok = true; }; im.src = (typeof B !== 'undefined' ? B : '') + 'beauty-' + key + '.png'; PICS[key] = im; }
    return PICS[key];
  }
  function drawPic(c, key, x, y, size, flip) {
    var im = pic(key);
    if (im && im._ok) {
      c.save(); c.translate(x, y); if (flip) c.scale(-1, 1);
      c.drawImage(im, -size / 2, -size / 2, size, size); c.restore();
    } else { c.font = Math.round(size * 0.7) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(PIC_EMOJI[key] || '', x, y); }
  }
  // 그림 + 글자를 가운데 정렬로 (글꼴은 부르기 전에 정해 둔다). stroke=true면 글자에 테두리
  function drawLabel(c, key, text, cx, cy, size, stroke) {
    var im = pic(key), ok = im && im._ok, tw = c.measureText(text).width, gap = 4, total = ok ? size + gap + tw : tw;
    var left = cx - total / 2;
    c.textAlign = 'left'; c.textBaseline = 'middle';
    var tx = left;
    if (ok) { c.drawImage(im, left, cy - size / 2, size, size); tx = left + size + gap; }
    else { text = (PIC_EMOJI[key] || '') + ' ' + text; tx = cx - c.measureText(text).width / 2; }
    if (stroke) c.strokeText(text, tx, cy);
    c.fillText(text, tx, cy);
    c.textAlign = 'center';
  }

  // ════════ 순수 로직 (화면 없이도 테스트 가능) ════════
  var POOLS = {
    normal: ['반짝이는조개', '달빛모래', '별빛모래', '맑은샘물'],
    rare: ['바다진주', '달의눈물']
  };
  function pools() {
    if (typeof EXPLORE_MATERIALS !== 'undefined' && EXPLORE_MATERIALS.beach) return EXPLORE_MATERIALS.beach;
    return POOLS;
  }
  // 기존 탐험과 같은 방식으로 재료 하나 뽑기. forceRare면 희귀 확정
  function rollDrop(luck, rng, forceRare) {
    rng = rng || Math.random;
    var p = pools();
    var rareChance = Math.min(0.80, 0.30 + (luck || 0) / 100);
    var isRare = forceRare || rng() < rareChance;
    var pool = isRare ? p.rare : p.normal;
    var mat = pool[Math.floor(rng() * pool.length)];
    var isWish = rng() < 0.005;
    return { name: isWish ? null : mat, isWish: isWish, isRare: isRare };
  }

  // 좌우로 훑는 동작 세기: 한 방향으로 minRun(px) 이상 쓱 훑으면 1번 (손을 안 떼고 방향만 바꿔도 이어서 셈).
  // 아주 짧게 까딱이는 건 안 셈.  st = { dir, runStart, ext, counted, passes }
  function sweepStep(st, x, minRun) {
    if (st.dir === 0) {
      if (Math.abs(x - st.runStart) > 12) { st.dir = x > st.runStart ? 1 : -1; st.ext = x; st.counted = false; }
      return false;
    }
    if ((x - st.ext) * st.dir >= 0) {                                      // 같은 방향으로 계속 감
      st.ext = x;
      if (!st.counted && Math.abs(st.ext - st.runStart) >= minRun) { st.counted = true; st.passes += 1; return true; }
      return false;
    }
    if (Math.abs(x - st.ext) >= 10) {                                      // 반대 방향으로 돌아섬 → 새 훑기 시작
      st.runStart = st.ext; st.dir = -st.dir; st.ext = x; st.counted = false;
    }
    return false;
  }

  var S = null;

  // ════════ 화면 ════════
  function startBeauty() {
    if (document.getElementById('beauty-overlay')) return;
    if (typeof stamina !== 'undefined' && stamina < STAMINA_COST) { showBagToast('스태미나가 부족해요! ⚡ 음료를 마셔봐요'); return; }
    stamina -= STAMINA_COST;
    saveStamina();
    exploreCollected = [];

    var overlay = document.createElement('div');
    overlay.id = 'beauty-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:#3a1f33;touch-action:none;user-select:none;-webkit-user-select:none;';
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;';
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    var base = (typeof B !== 'undefined' ? B : '');
    var bg = new Image(); bg.src = base + BG_FILE;
    var face = new Image();
    face.src = base + 'face-' + FACE_IDS[Math.floor(Math.random() * FACE_IDS.length)] + '.png';
    var fc = document.createElement('canvas'); fc.width = 256; fc.height = 256;

    S = {
      overlay: overlay, canvas: canvas, ctx: canvas.getContext('2d'), bg: bg, bgOk: false, face: face, faceOk: false, fc: fc,
      W: 0, H: 0, dpr: 1, s: 1, ox: 0, oy: 0,
      stage: 0, introT: INTRO_SEC, perfect: true,
      sweep: { dir: 0, runStart: 0, ext: 0, counted: false, passes: 0 }, ptr: null, sway: 0,
      hits: 0, targets: [], spawnT: 0.3, marks: [], lastSpot: -1,
      gauge: 0, rounds: 0, holding: false, holdLock: false, sprayT: 0, mist: [], shine: 0,
      exitDown: false, bursts: [], pops: [], collected: [], timeLeft: SESSION_SEC,
      flash: 0, glow: 0, shakeT: 0, msg: '', msgT: 0, last: performance.now(), raf: 0, t: 0, ended: false, endDelay: -1
    };
    bg.onload = function () { if (S) S.bgOk = true; };
    face.onload = function () { if (S) S.faceOk = true; };
    resize();
    say(STAGES[0].tip, 3);
    sfx('setGrab');

    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    S.raf = requestAnimationFrame(loop);
  }

  function say(text, sec) { S.msg = text; S.msgT = sec || 2; }
  function sfx(name) { try { if (window.pocaSfx) window.pocaSfx.play(name); } catch (e) {} }
  function vib(p) { if (navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function resize() {
    if (!S) return;
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.W = window.innerWidth; S.H = window.innerHeight;
    S.canvas.width = Math.round(S.W * S.dpr); S.canvas.height = Math.round(S.H * S.dpr);
    S.s = Math.max(S.W / IMG_W, S.H / IMG_H) * ZOOM;                          // 화면을 꽉 채우고 거울 쪽으로 확대
    S.ox = clamp(S.W / 2 - FACE_X * S.s, S.W - IMG_W * S.s, 0);
    S.oy = clamp(S.H * 0.40 - FACE_Y * S.s, S.H - IMG_H * S.s, 0);            // 얼굴이 화면 위쪽 40% 즈음에 오게
  }
  function faceC() { return [S.ox + FACE_X * S.s, S.oy + FACE_Y * S.s, FACE_SZ * S.s]; }   // 화면에서 얼굴 중심 x, y, 크기
  function spotXY(i) { var f = faceC(); return [f[0] + SPOTS[i].fx * f[2], f[1] + SPOTS[i].fy * f[2]]; }
  function hitR() { return Math.max(30, 0.15 * faceC()[2]); }

  // ── 입력 ──
  function pos(e) {
    var r = S.canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  function playing() { return S && !S.ended && S.stage < 3 && S.introT <= 0; }

  function onDown(e) {
    if (!S || S.ended) return;
    e.preventDefault();
    var p = pos(e);
    try { S.canvas.setPointerCapture(e.pointerId); } catch (err) {}
    if (p[0] < 110 && p[1] < 56) { S.exitDown = true; return; }       // 나가기
    if (S.stage === 1) { tapPuff(p[0], p[1]); return; }                 // 퍼프는 톡톡 (여러 손가락 OK)
    if (S.ptr) return;                                                  // 훑기·꾹 누르기는 첫 손가락만
    S.ptr = { id: e.pointerId, x: p[0], y: p[1] };
    if (S.stage === 0) { S.sweep.runStart = p[0]; S.sweep.dir = 0; S.sweep.ext = p[0]; S.sweep.counted = false; }
  }
  function onMove(e) {
    if (!S || S.ended || !S.ptr || S.ptr.id !== e.pointerId) return;
    var p = pos(e);
    S.ptr.x = p[0]; S.ptr.y = p[1];
    if (S.stage === 0 && playing()) {
      var minRun = Math.max(70, S.W * 0.25);
      if (sweepStep(S.sweep, p[0], minRun)) onSweep();
    }
  }
  function onUp(e) {
    if (!S || S.ended) return;
    var p = pos(e);
    if (S.exitDown) { S.exitDown = false; if (p[0] < 110 && p[1] < 56) finish(); return; }
    if (S.ptr && S.ptr.id === e.pointerId) { S.ptr = null; S.holdLock = false; S.sweep.dir = 0; }
  }
  function onCancel(e) { if (S) { S.exitDown = false; if (S.ptr && S.ptr.id === e.pointerId) { S.ptr = null; S.holdLock = false; } } }

  // ── 1단계: 드라이기 ──
  function onSweep() {
    var n = S.sweep.passes;
    S.sway = 1;
    sfx('beautyDry'); vib(8);
    var f = faceC();
    S.bursts.push({ x: f[0], y: f[1] - f[2] * 0.45, text: '쓱!', pic: 'dryer', t: 0, dur: 0.4, golden: false, big: false, screen: true });
    if (DRY_DROP_AT.indexOf(n) >= 0) { giveRoll(f[0], f[1] - f[2] * 0.2); sfx('reward'); }
    if (n >= DRY_NEED) nextStage();
  }

  // ── 2단계: 퍼프 ──
  function spawnTarget() {
    var used = {};
    S.targets.forEach(function (t) { used[t.spot] = true; });
    var cands = [];
    for (var i = 0; i < SPOTS.length; i++) if (!used[i] && i !== S.lastSpot) cands.push(i);
    if (!cands.length) return;
    var spot = cands[Math.floor(Math.random() * cands.length)];
    S.lastSpot = spot;
    var hasNg = S.targets.some(function (t) { return t.type === 'ng'; });
    var ng = S.hits >= 1 && !hasNg && Math.random() < NG_CHANCE;
    S.targets.push({ spot: spot, type: ng ? 'ng' : 'real', born: S.t });
  }
  function realCount() { return S.targets.filter(function (t) { return t.type === 'real'; }).length; }

  function tapPuff(x, y) {
    if (!playing()) return;
    var best = null, bd = 1e9, R = hitR() * 1.15;
    S.targets.forEach(function (t) {
      var sp = spotXY(t.spot), d = Math.hypot(sp[0] - x, sp[1] - y);
      if (d < R && d < bd) { bd = d; best = t; }
    });
    if (!best) return;
    S.targets = S.targets.filter(function (t) { return t !== best; });
    var sp = spotXY(best.spot);
    if (best.type === 'ng') {
      S.timeLeft = Math.max(0, S.timeLeft - NG_PENALTY);
      S.flash = 0.35; S.perfect = false;
      sfx('fail'); vib([80, 40, 80]);
      S.pops.push({ x: sp[0], y: sp[1] - 30, text: 'NG! -' + NG_PENALTY + '초', pic: pic('ng'), t: 0, bad: true });
      return;
    }
    S.hits += 1;
    S.marks.push({ fx: SPOTS[best.spot].fx, fy: SPOTS[best.spot].fy, rgb: SPOTS[best.spot].rgb, t: S.t });
    sfx('beautyPuff'); vib(10);
    S.bursts.push({ x: sp[0], y: sp[1], text: '톡!', pic: 'puff', t: 0, dur: 0.45, golden: false, big: false, screen: true });
    if (S.hits % 2 === 0) { giveRoll(sp[0], sp[1] - 40); sfx('reward'); }
    if (S.hits >= PUFF_NEED) nextStage();
  }

  // ── 3단계: 스프레이 ──
  function sprayRoundDone() {
    S.rounds += 1;
    S.holdLock = true; S.gauge = 0;
    sfx('beautyDone'); vib([15, 25, 30]);
    var f = faceC();
    S.shine = Math.min(1, S.rounds / SPRAY_ROUNDS);
    S.bursts.push({ x: f[0], y: f[1], text: '치익!', pic: 'spray', t: 0, dur: 0.6, golden: true, big: false, screen: true });
    giveRoll(f[0], f[1] - f[2] * 0.3);
    if (S.rounds >= SPRAY_ROUNDS) nextStage();
    else say('한 번 더! 손을 뗐다가 다시 꾹', 1.8);
  }

  // ── 단계 넘기기 / 변신 완료 ──
  function nextStage() {
    S.stage += 1;
    S.targets = []; S.holdLock = !!S.ptr; S.gauge = 0;          // 손가락이 아직 눌려 있으면 한 번 뗐다가 다시 눌러야 시작
    if (S.stage < 3) {
      S.introT = INTRO_SEC;
      say(STAGES[S.stage].tip, 3);
      sfx('setGrab');
      return;
    }
    // 변신 완료!
    var luck = typeof getEquippedStat === 'function' ? getEquippedStat('luck') : 0;
    var f = faceC();
    S.shine = 1; S.glow = 0.3; S.shakeT = 0.25;
    sfx('cheer'); setTimeout(function () { sfx('reward'); }, 250);
    S.bursts.push({ x: f[0], y: f[1], text: S.perfect ? '완벽한 변신!' : '변신 완료!', pic: S.perfect ? 'sparkle' : 'puff', t: 0, dur: 1.3, golden: true, big: true, screen: true });
    giveDrop(rollDrop(luck, Math.random, true), f[0], f[1] + f[2] * 0.55);
    if (S.perfect) { giveDrop(rollDrop(luck, Math.random, false), f[0], f[1] + f[2] * 0.55 + 26); say('NG 없이 완벽해요! 보너스 재료', 2.5); }
    else say('변신 완료! 다음엔 NG 없이 도전해봐요', 2.5);
    S.endDelay = 1.7;
  }

  // 재료 하나 지급: 기존 탐험 보상 로직 그대로 (가방, 경험치, 소원의 조각, 퀘스트)
  function giveRoll(x, y) {
    var luck = typeof getEquippedStat === 'function' ? getEquippedStat('luck') : 0;
    giveDrop(rollDrop(luck, Math.random, false), x, y);
  }
  function giveDrop(d, x, y) {
    var label = null, emoji = '✨';
    var before = exploreCollected.length;
    var el = { style: {}, parentNode: { removeChild: function () {} } };
    collectExploreItem(0, { name: d.name, isWish: d.isWish, isRare: d.isRare }, el);
    if (d.isWish) { label = '🧩 소원의 조각'; emoji = '🧩'; }
    else {
      label = exploreCollected.length > before ? exploreCollected[exploreCollected.length - 1] : d.name;
      emoji = typeof getMaterialEmoji === 'function' ? getMaterialEmoji(d.name) : '✨';
    }
    S.collected.push(label);
    // 재료는 그림(mat-*.png)으로: 이모지를 빼고 그림을 앞에 그린다 (그림이 없으면 이모지로)
    var pic = (!d.isWish && typeof window.matImage === 'function') ? window.matImage(d.name) : null;
    S.pops.push({ x: x, y: y, text: (pic ? '' : emoji + ' ') + label.replace(/^[^\w가-힣\[]+/, '') + (d.isRare ? ' ✨' : ''), pic: pic, t: 0, screen: true });
  }

  // ── 매 프레임 ──
  function loop(now) {
    if (!S || S.ended) return;
    var dt = Math.min(0.05, (now - S.last) / 1000); S.last = now; S.t += dt;
    if (S.stage < 3) S.timeLeft -= dt;
    if (S.msgT > 0) S.msgT -= dt;
    if (S.flash > 0) S.flash -= dt;
    if (S.glow > 0) S.glow -= dt;
    if (S.shakeT > 0) S.shakeT -= dt;
    if (S.sway > 0) S.sway = Math.max(0, S.sway - dt * 1.6);
    if (S.introT > 0) S.introT -= dt;

    if (S.stage === 0 && S.ptr && S.introT <= 0) S.sway = Math.max(S.sway, 0.3);

    if (playing() && S.stage === 1) {
      // 반짝이는 곳 새로 나타나기 / 사라지기
      S.targets = S.targets.filter(function (t) { return S.t - t.born < PUFF_LIFE; });
      S.spawnT -= dt;
      if (S.spawnT <= 0 && realCount() < PUFF_MAX && S.hits + realCount() < PUFF_NEED) { S.spawnT = PUFF_GAP; spawnTarget(); }
    }

    if (playing() && S.stage === 2) {
      // 꾹 누르고 있으면 게이지가 참. 손 떼면 줄어듦
      S.holding = !!S.ptr && !S.holdLock;
      if (S.holding) {
        S.gauge = Math.min(1, S.gauge + dt / SPRAY_SEC);
        S.sprayT -= dt;
        if (S.sprayT <= 0) { S.sprayT = 0.2; sfx('beautySpray'); vib(5); }
        var f2 = faceC();
        for (var k = 0; k < 2; k++) {
          var ang = Math.atan2(f2[1] - S.ptr.y, f2[0] - S.ptr.x) + (Math.random() - 0.5) * 0.7, sp = 260 + Math.random() * 200;
          S.mist.push({ x: S.ptr.x, y: S.ptr.y - 30, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: 0.35 + Math.random() * 0.25 });
        }
        if (S.gauge >= 1) sprayRoundDone();
      } else {
        S.gauge = Math.max(0, S.gauge - dt * 1.5);
      }
    }
    S.mist.forEach(function (m) { m.life += dt; m.x += m.vx * dt; m.y += m.vy * dt; });
    S.mist = S.mist.filter(function (m) { return m.life < m.max; });

    S.pops.forEach(function (p) { p.t += dt; });
    S.pops = S.pops.filter(function (p) { return p.t < 1.4; });
    S.bursts.forEach(function (b) { b.t += dt; });
    S.bursts = S.bursts.filter(function (b) { return b.t < b.dur; });

    if (S.timeLeft <= 0) { finish(); return; }
    if (S.endDelay >= 0) {
      S.endDelay -= dt;
      if (S.endDelay <= 0) { finish(); return; }
    }

    draw();
    S.raf = requestAnimationFrame(loop);
  }

  // 얼굴 그림 위에 화장/물기/반짝임을 덧칠한 작은 그림을 만든다 (투명한 부분에는 안 묻게 source-atop)
  function paintFace() {
    var g = S.fc.getContext('2d'), N = 256;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, N, N);
    if (S.faceOk) {
      var iw = S.face.naturalWidth || S.face.width || N, ih = S.face.naturalHeight || S.face.height || N;
      var k = Math.min(N / iw, N / ih);
      g.drawImage(S.face, (N - iw * k) / 2, (N - ih * k) / 2, iw * k, ih * k);
    } else {
      g.fillStyle = '#ffd9c8'; g.beginPath(); g.arc(N / 2, N / 2, N * 0.38, 0, 6.3); g.fill();
    }
    g.globalCompositeOperation = 'source-atop';
    if (S.stage === 0) {                                   // 젖은 머리: 말릴수록 옅어짐
      var wet = 0.34 * (1 - S.sweep.passes / DRY_NEED);
      if (wet > 0.01) { g.fillStyle = 'rgba(110,160,255,' + wet + ')'; g.fillRect(0, 0, N, N); }
    }
    // 퍼프: 얼굴 위치가 그림마다 달라서 색 얼룩 대신 '전체가 은은히 화사해지는' 효과로 (광대처럼 보이던 것 수정)
    var hits = S.marks.length;
    if (hits > 0) {
      var k = Math.min(1, hits / PUFF_NEED);
      var lastT = S.marks[hits - 1].t, pop = Math.max(0, 1 - (S.t - lastT) / 0.5);   // 톡 칠 때 살짝 반짝
      var pg = g.createRadialGradient(N / 2, N * 0.5, 0, N / 2, N * 0.5, N * 0.55);
      pg.addColorStop(0, 'rgba(255,240,235,' + (0.10 * k + 0.12 * pop) + ')');
      pg.addColorStop(1, 'rgba(255,225,230,' + (0.05 * k) + ')');
      g.fillStyle = pg; g.fillRect(0, 0, N, N);
    }
    if (S.shine > 0) {                                     // 스프레이 윤기
      var sh = g.createLinearGradient(0, 0, N, N);
      var a2 = 0.28 * S.shine + (S.glow > 0 ? 0.2 : 0);
      sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.45, 'rgba(255,255,255,' + a2 + ')'); sh.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sh; g.fillRect(0, 0, N, N);
    }
    g.globalCompositeOperation = 'source-over';
  }

  function draw() {
    if (!S || S.ended) return;
    var c = S.ctx, W = S.W, H = S.H;
    c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    c.clearRect(0, 0, W, H);

    c.save();   // 변신 완료 때 장면만 살짝 흔들기 (HUD는 안 흔들림)
    if (S.shakeT > 0) { var sk = 8 * (S.shakeT / 0.25); c.translate((Math.random() - 0.5) * sk, (Math.random() - 0.5) * sk); }

    if (S.bgOk) c.drawImage(S.bg, S.ox, S.oy, IMG_W * S.s, IMG_H * S.s);
    else { c.fillStyle = '#4a2a42'; c.fillRect(0, 0, W, H); }

    // 얼굴 뒤에 은은한 분홍 빛 + 얼굴 (머리가 날리듯 살짝 흔들림)
    var f = faceC();
    var halo = c.createRadialGradient(f[0], f[1], f[2] * 0.2, f[0], f[1], f[2] * 0.85);
    halo.addColorStop(0, 'rgba(255,200,230,0.45)'); halo.addColorStop(1, 'rgba(255,200,230,0)');
    c.fillStyle = halo; c.fillRect(f[0] - f[2], f[1] - f[2], f[2] * 2, f[2] * 2);
    paintFace();
    c.save();
    c.translate(f[0], f[1] + f[2] * 0.48);                              // 목 아래를 축으로 흔들어서 머리가 날리는 느낌
    c.rotate(Math.sin(S.t * 18) * S.sway * 0.06);
    c.globalAlpha = 0.97;
    c.drawImage(S.fc, -f[2] / 2, -f[2] * 0.98, f[2], f[2]);
    c.restore();
    c.globalAlpha = 1;

    // 거울 유리 반사광 (거울 안에 비친 느낌)
    var m0 = [S.ox + MIRROR.x0 * S.s, S.oy + MIRROR.y0 * S.s], m1 = [S.ox + MIRROR.x1 * S.s, S.oy + MIRROR.y1 * S.s];
    c.save(); c.beginPath(); c.rect(m0[0], m0[1], m1[0] - m0[0], m1[1] - m0[1]); c.clip();
    var gl = c.createLinearGradient(m0[0], m0[1], m1[0], m1[1]);
    gl.addColorStop(0, 'rgba(255,255,255,0.10)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)'); gl.addColorStop(0.6, 'rgba(255,255,255,0.07)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gl; c.fillRect(m0[0], m0[1], m1[0] - m0[0], m1[1] - m0[1]);
    c.restore();

    drawStageFx(c, f);

    // 성공 연출: 링 + 크게 톡 튀어나오는 글자
    S.bursts.forEach(function (b) {
      var k = Math.min(1, b.t / b.dur);
      c.globalAlpha = Math.max(0, 0.85 * (1 - k));
      c.strokeStyle = b.golden ? '#FFD700' : '#ff8fc4'; c.lineWidth = 2 + 7 * (1 - k);
      c.beginPath(); c.arc(b.x, b.y, 16 + k * (b.big ? 150 : 60), 0, 6.3); c.stroke();
      var sc = k < 0.25 ? 0.5 + (k / 0.25) * 0.75 : 1.25 - ((k - 0.25) / 0.75) * 0.25;
      c.globalAlpha = k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);
      var bx = clamp(b.x, 80, W - 80), by = b.y - 26 - k * 22;
      c.save(); c.translate(bx, by); c.scale(sc, sc);
      c.font = '900 ' + (b.big ? 34 : 24) + 'px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 7; c.strokeStyle = 'rgba(60,0,40,0.85)'; c.lineJoin = 'round';
      c.fillStyle = b.golden ? '#FFD700' : '#fff';
      if (b.pic) drawLabel(c, b.pic, b.text, 0, 0, b.big ? 46 : 34, true);
      else { c.strokeText(b.text, 0, 0); c.fillText(b.text, 0, 0); }
      c.restore();
    });
    c.globalAlpha = 1;
    c.restore();   // 흔들림 끝

    if (S.glow > 0) { c.fillStyle = 'rgba(255,225,240,' + Math.min(0.5, S.glow * 2.2) + ')'; c.fillRect(0, 0, W, H); }

    // 재료 팝업
    S.pops.forEach(function (p) {
      c.globalAlpha = Math.max(0, 1 - p.t / 1.4);
      c.font = '900 14px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.7)';
      var tx = clamp(p.x, 70, W - 70), ty = p.y - p.t * 40;
      if (p.pic && p.pic._ok) {
        var tw2 = c.measureText(p.text).width, isz = 30, gap = 4, left = tx - (tw2 + isz + gap) / 2;
        c.textAlign = 'left';
        c.drawImage(p.pic, left, ty - isz / 2, isz, isz);
        c.strokeText(p.text, left + isz + gap, ty);
        c.fillStyle = p.bad ? '#ff8a8a' : '#fff'; c.fillText(p.text, left + isz + gap, ty);
        c.textAlign = 'center';
      } else {
        c.strokeText(p.text, tx, ty);
        c.fillStyle = p.bad ? '#ff8a8a' : '#fff'; c.fillText(p.text, tx, ty);
      }
    });
    c.globalAlpha = 1;

    if (S.flash > 0) { c.fillStyle = 'rgba(255,60,60,' + (S.flash * 0.9) + ')'; c.fillRect(0, 0, W, H); }

    drawHud(c, f);
  }

  // 단계별 효과 (바람 / 퍼프 표시 / 스프레이 안개)
  function drawStageFx(c, f) {
    if (S.stage === 0 && S.ptr) {
      // 드라이기: 손가락 위치에서 얼굴 쪽으로 부는 바람
      var px = S.ptr.x, py = S.ptr.y;
      c.save(); c.lineCap = 'round';
      for (var i = 0; i < 5; i++) {
        var ph = (S.t * 3 + i * 0.37) % 1, yy = py - 70 + i * 22, len = 40 + i % 2 * 24;
        c.strokeStyle = 'rgba(255,255,255,' + (0.55 * (1 - ph)) + ')'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(px - 30 + ph * 80, yy); c.lineTo(px - 30 + ph * 80 + len, yy - 6 + Math.sin(S.t * 9 + i) * 6); c.stroke();
      }
      c.restore();
      drawPic(c, 'dryer', px, py - 46, 62, true);
    }
    if (S.stage === 1) {
      var R = hitR();
      S.targets.forEach(function (t) {
        var sp = spotXY(t.spot), k = (S.t - t.born) / PUFF_LIFE, pulse = 0.5 + 0.5 * Math.sin(S.t * 9 + t.spot);
        var ng = t.type === 'ng';
        if (ng && k > 0.7 && Math.floor(S.t * 10) % 2 === 0) return;          // 사라지기 직전 깜빡
        var gr = c.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], R);
        var rgb = ng ? '255,60,70' : SPOTS[t.spot].rgb === '255,255,255' ? '255,235,150' : SPOTS[t.spot].rgb;
        gr.addColorStop(0, 'rgba(' + rgb + ',' + (0.55 + 0.25 * pulse) + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
        c.fillStyle = gr; c.beginPath(); c.arc(sp[0], sp[1], R, 0, 6.3); c.fill();
        c.lineWidth = 3; c.strokeStyle = ng ? 'rgba(255,90,100,0.95)' : 'rgba(255,255,255,0.95)';
        c.beginPath(); c.arc(sp[0], sp[1], R * (0.45 + 0.1 * pulse), 0, 6.3); c.stroke();
        c.lineWidth = 3; c.strokeStyle = ng ? 'rgba(255,120,120,0.9)' : 'rgba(255,215,0,0.9)';   // 남은 시간 링
        c.beginPath(); c.arc(sp[0], sp[1], R * 0.78, -Math.PI / 2, -Math.PI / 2 + 6.283 * Math.max(0, 1 - k)); c.stroke();
        drawPic(c, ng ? 'ng' : 'sparkle', sp[0], sp[1] + 1, ng ? 34 : 32, false);
      });
    }
    if (S.stage === 2) {
      S.mist.forEach(function (m) {
        var a = Math.max(0, 1 - m.life / m.max);
        c.fillStyle = 'rgba(255,255,255,' + (0.7 * a) + ')';
        c.beginPath(); c.arc(m.x, m.y, 3 + 5 * (1 - a), 0, 6.3); c.fill();
      });
      if (S.ptr) drawPic(c, 'spray', S.ptr.x, S.ptr.y - 46, 62, false);
    }
  }

  function drawHud(c, f) {
    var W = S.W, H = S.H;
    // 상단: 나가기 / 남은 시간 / 단계
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, 10, 10, 92, 36, 18); c.fill();
    c.fillStyle = '#fff'; c.font = '700 13px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('← 나가기', 56, 28);
    var tw = Math.max(0, S.timeLeft / SESSION_SEC);
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, 112, 20, W - 112 - 90, 16, 8); c.fill();
    c.fillStyle = tw < 0.25 ? '#ff6b6b' : '#ff9ccf';
    if (tw > 0.01) { roundRect(c, 114, 22, (W - 112 - 90 - 4) * tw, 12, 6); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, W - 76, 10, 66, 36, 18); c.fill();
    c.fillStyle = S.perfect ? '#fff' : '#ffb0b0'; c.font = '700 13px "Noto Sans KR",sans-serif';
    drawLabel(c, 'puff', Math.min(3, S.stage + 1) + '/3', W - 43, 28, 22, false);

    // 단계 표시줄
    var cw = 84, gx = (W - cw * 3 - 12) / 2;
    for (var i = 0; i < 3; i++) {
      var on = i === S.stage, done = i < S.stage;
      c.fillStyle = on ? 'rgba(255,140,200,0.92)' : (done ? 'rgba(120,200,140,0.8)' : 'rgba(0,0,0,0.45)');
      roundRect(c, gx + i * (cw + 6), 54, cw, 26, 13); c.fill();
      c.fillStyle = '#fff'; c.font = '700 12px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (done) c.fillText('✔ ' + STAGES[i].name, gx + i * (cw + 6) + cw / 2, 67);
      else drawLabel(c, STAGE_PIC[i], STAGES[i].name, gx + i * (cw + 6) + cw / 2, 67, 20, false);
    }

    // 안내 문구
    if (S.msgT > 0 && S.msg) {
      c.font = '700 14px "Noto Sans KR",sans-serif';
      var mw = c.measureText(S.msg).width + 28;
      c.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(c, (W - mw) / 2, 88, mw, 34, 17); c.fill();
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(S.msg, W / 2, 105);
    }

    // 얼굴 아래 진행 막대 (손가락이 가리지 않는 위치)
    if (S.stage < 3) {
      var bw = Math.min(W - 60, f[2] * 1.3), bx = (W - bw) / 2, by = f[1] + f[2] * 0.62, ratio = 0, label = '';
      if (S.stage === 0) { ratio = S.sweep.passes / DRY_NEED; label = S.sweep.passes + '/' + DRY_NEED; }
      else if (S.stage === 1) { ratio = S.hits / PUFF_NEED; label = S.hits + '/' + PUFF_NEED; }
      else { ratio = (S.rounds + S.gauge) / SPRAY_ROUNDS; label = S.rounds + '/' + SPRAY_ROUNDS + (S.holding ? ' 치이이익…' : ''); }
      c.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(c, bx, by, bw, 22, 11); c.fill();
      c.fillStyle = S.stage === 2 ? '#bde0ff' : '#ffb0d8';
      if (ratio > 0.01) { roundRect(c, bx + 2, by + 2, (bw - 4) * Math.min(1, ratio), 18, 9); c.fill(); }
      c.fillStyle = '#fff'; c.font = '700 12px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      drawLabel(c, STAGE_PIC[S.stage], label, W / 2, by + 11, 18, false);
    }

    // 단계가 바뀔 때 크게 나오는 안내
    if (S.introT > 0 && S.stage < 3) {
      var k = 1 - S.introT / INTRO_SEC, a = k < 0.2 ? k / 0.2 : (k > 0.8 ? (1 - k) / 0.2 : 1);
      c.globalAlpha = Math.max(0, Math.min(1, a));
      c.font = '900 30px "Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 8; c.strokeStyle = 'rgba(70,0,50,0.85)'; c.lineJoin = 'round';
      var ty = H * 0.72, txt = (S.stage + 1) + '단계  ' + STAGES[S.stage].name;
      c.fillStyle = '#fff'; drawLabel(c, STAGE_PIC[S.stage], txt, W / 2, ty, 44, true);
      c.globalAlpha = 1;
    }
  }

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  // ── 종료 / 결과 ──
  function finish() {
    if (!S || S.ended) return;
    S.ended = true;
    cancelAnimationFrame(S.raf);
    window.removeEventListener('resize', resize);
    var got = S.collected.slice(), ov = S.overlay, full = S.stage >= 3, perfect = full && S.perfect;

    if (Math.random() < STONE_DROP) {
      if (addToBag('🔹', '재조합석', 'material', 1, '카드 재조합에 필요한 재료')) { got.push('🔹 재조합석'); exploreCollected.push('🔹 재조합석'); }
    }
    var counts = {}, order = [];
    got.forEach(function (n) { if (!(n in counts)) { counts[n] = 0; order.push(n); } counts[n]++; });
    var list = order.length ? order.map(function (n) { return n + (counts[n] > 1 ? ' ×' + counts[n] : ''); }).join('<br>') : '아무것도 못 얻었어요 😢';
    var left = (typeof stamina !== 'undefined') ? stamina : '?';

    S = null;
    ov.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.78);">' +
      '<div style="background:linear-gradient(135deg,#1a1a2e,#4e1b45);border:2px solid #ff9ccf;border-radius:20px;padding:26px 22px;text-align:center;width:85%;max-width:300px;">' +
      '<div style="margin-bottom:6px;"><img src="beauty-puff.png" alt="" style="width:56px;height:56px;object-fit:contain;" onerror="this.outerHTML=\'<span style=font-size:36px>💄</span>\'"></div>' +
      '<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:8px;">' + (perfect ? '완벽한 변신!' : (full ? '변신 완료!' : '뷰티 살롱 탐험 끝!')) + '</div>' +
      '<div style="font-size:12px;color:#aaa;margin-bottom:8px;">스태미나 -' + STAMINA_COST + ' (잔여: ' + left + ')</div>' +
      '<div style="font-size:14px;color:#FFD700;line-height:1.7;margin-bottom:16px;">' + list + '</div>' +
      '<button id="beauty-again" style="width:100%;padding:13px;margin-bottom:8px;background:linear-gradient(135deg,#ff9ccf,#C084FC);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">' + '<img src="beauty-puff.png" alt="" style="width:20px;height:20px;object-fit:contain;vertical-align:-4px;margin-right:4px;" onerror="this.outerHTML=\'💄\'">' + '한 번 더 (⚡' + STAMINA_COST + ')</button>' +
      '<button id="beauty-close" style="width:100%;padding:12px;background:rgba(255,255,255,0.1);border:none;border-radius:12px;color:#ccc;font-size:14px;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">확인</button>' +
      '</div></div>';
    document.getElementById('beauty-close').onclick = function () { ov.remove(); };
    document.getElementById('beauty-again').onclick = function () { ov.remove(); startBeauty(); };
  }

  window.startBeauty = startBeauty;
  window.__beautyTest = { rollDrop: rollDrop, sweepStep: sweepStep, get S() { return S; }, SPOTS: SPOTS, DRY_NEED: DRY_NEED, PUFF_NEED: PUFF_NEED, SPRAY_ROUNDS: SPRAY_ROUNDS };

  // ── 해변 "스타일링 받기" 버튼을 이 탐험으로 연결 (game.js는 건드리지 않음) ──
  (function hookStartExplore() {
    if (typeof window.startExplore !== 'function' || typeof window.collectExploreItem !== 'function') { setTimeout(hookStartExplore, 50); return; }
    if (window.__beautyHooked) return;
    window.__beautyHooked = true;
    var original = window.startExplore;
    window.startExplore = function (placeId) {
      if (placeId === 'beach') { startBeauty(); return; }
      return original.apply(this, arguments);
    };
  })();
})();
