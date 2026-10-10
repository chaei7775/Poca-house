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
  var BG_FILE = 'map-beauty.webp';
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
    var fid0 = FACE_IDS[Math.floor(Math.random() * FACE_IDS.length)];
    face.src = base + 'face-' + fid0 + (fid0 === 'minjun' ? '-d' : '') + '.png';   // 민준은 장식이 사방에 떠 있는 뷰티살롱 전용 그림(배경 투명)
    var fc = document.createElement('canvas'); fc.width = 256; fc.height = 256;

    S = {
      overlay: overlay, canvas: canvas, ctx: canvas.getContext('2d'), bg: bg, bgOk: false, face: face, faceOk: false, fc: fc,
      W: 0, H: 0, dpr: 1, s: 1, ox: 0, oy: 0,
      stage: 0, introT: INTRO_SEC, perfect: true,
      sweep: { dir: 0, runStart: 0, ext: 0, counted: false, passes: 0 }, ptr: null, sway: 0,
      hits: 0, targets: [], spawnT: 0.3, marks: [], lastPos: null, skin: null,
      gauge: 0, rounds: 0, holding: false, holdLock: false, sprayT: 0, mist: [], shine: 0,
      exitDown: false, bursts: [], pops: [], collected: [], timeLeft: SESSION_SEC,
      flash: 0, glow: 0, shakeT: 0, msg: '', msgT: 0, last: performance.now(), raf: 0, t: 0, ended: false, endDelay: -1
    };
    bg.onload = function () { if (S) S.bgOk = true; };
    face.onload = function () { if (S) { S.faceOk = true; S.faceAt = S.t; buildSkin(); } };
    face.onerror = function () { if (!S) return; if (/-d\.png/.test(face.src)) face.src = face.src.replace('-d.png', '.png'); else S.faceFail = true; };   // 새 그림을 못 받으면 원래 그림으로 (둥근 빈 얼굴로 안 남게)
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
  // 스프레이 통: 얼굴 쪽으로 기울이고, 안개는 분사구(통 윗부분)에서만 나감
  function sprayGeom(ptr) {
    var f = faceC(), cx = ptr.x, cy = ptr.y - 46;
    var aim = Math.atan2(f[1] - cy, f[0] - cx);                       // 안개가 날아갈 방향(얼굴 쪽)
    var tilt = Math.max(-0.2, Math.min(0.2, (f[0] - cx) / 600));      // 통은 세로 상태에서 아주 약간만 기울임
    var ax = tilt - Math.PI / 2;                                       // 통 위쪽 방향
    return { cx: cx, cy: cy, ang: aim, rot: tilt, tx: cx + Math.cos(ax) * 27, ty: cy + Math.sin(ax) * 27 };
  }
  function spotXY(t) { var f = faceC(); return [f[0] + t.fx * f[2], f[1] + t.fy * f[2]]; }
  // 얼굴 그림에서 '살색 부분'만 찾아서 퍼프 자리 후보로 쓴다 (머리카락·장식 위에는 안 나오게)
  // 얼굴 그림을 256 칸에 그린다. 그림마다 살짝 손봐야 하는 애가 있어서(민준: 조금 줄임) 여기서만 처리
  function drawFaceImg(g, img, N, fid) {
    var iw = img.naturalWidth || img.width || N, ih = img.naturalHeight || img.height || N, k = Math.min(N / iw, N / ih);
    var w = iw * k, h = ih * k;
    var ox = (N - w) / 2, oy = (N - h) / 2;
    g.drawImage(img, ox, oy, w, h);
  }
  function faceIdOf(img) { var m = /face-([a-z]+)(?:-d)?\.png/.exec(img.src || ''); return m ? m[1] : ''; }
  function buildSkin() {
    S.skin = null;
    var me = S, im = new Image();   // 색을 읽으려면 따로 받아야 해서(보안 규칙) 분석용 사본을 한 번 더 받음. 실패하면 예전 자리(SPOTS)를 씀
    im.crossOrigin = 'anonymous';
    im.onload = function () { if (S === me) analyzeSkin(im); };
    im.onerror = function () { window.__skinErr = 'load-fail'; };
    im.src = S.face.src;
  }
  function analyzeSkin(img) {
    S.skin = null;
    try {
      var N = 256, cv = document.createElement('canvas'); cv.width = N; cv.height = N;
      var g = cv.getContext('2d');
      drawFaceImg(g, img, N, faceIdOf(img));
      var d = g.getImageData(0, 0, N, N).data, sk = new Uint8Array(N * N), i;
      for (i = 0; i < N * N; i++) {
        var r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3];
        sk[i] = (a > 200 && r > 185 && gg > 150 && b > 130 && r >= gg && gg >= b - 10 && (r - b) < 80 && gg * 100 > r * 72) ? 1 : 0;
      }
      var RR = 9, dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
      function solid(x, y) {
        if (x < RR || y < RR || x >= N - RR || y >= N - RR || !sk[y * N + x]) return false;
        for (var q = 0; q < 8; q++) if (!sk[(y + dirs[q][1] * RR) * N + x + dirs[q][0] * RR]) return false;
        return true;
      }
      var STEP = 4, G = Math.floor(N / STEP), grid = [], x, y;
      for (y = 0; y < G; y++) { grid[y] = []; for (x = 0; x < G; x++) grid[y][x] = solid(x * STEP, y * STEP) ? 1 : 0; }
      var seen = {}, best = [];                                   // 이어진 덩어리 중 제일 큰 것 = 얼굴 피부
      for (y = 0; y < G; y++) for (x = 0; x < G; x++) {
        if (!grid[y][x] || seen[y * G + x]) continue;
        var comp = [], st = [[x, y]]; seen[y * G + x] = 1;
        while (st.length) {
          var c0 = st.pop(); comp.push(c0);
          for (var q = 0; q < 8; q++) {
            var nx = c0[0] + dirs[q][0], ny = c0[1] + dirs[q][1];
            if (nx < 0 || ny < 0 || nx >= G || ny >= G || !grid[ny][nx] || seen[ny * G + nx]) continue;
            seen[ny * G + nx] = 1; st.push([nx, ny]);
          }
        }
        if (comp.length > best.length) best = comp;
      }
      if (best.length >= 12) S.skin = best.map(function (c0) { return { fx: (c0[0] * STEP) / N - 0.5, fy: (c0[1] * STEP) / N - 0.5 }; });
    } catch (e) { S.skin = null; window.__skinErr = String(e); }
  }
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
  var PUFF_RGB = ['255,120,170', '255,255,255', '190,130,255'];
  function spawnTarget() {
    var pool = S.skin || SPOTS, c = null, scales = [1, 0.5, 0.2, 0];   // 피부 자리가 좁은 얼굴도 있어서, 못 찾으면 간격 조건을 점점 풀어서라도 꼭 하나는 띄운다
    for (var si = 0; si < scales.length && !c; si++) {
      for (var tries = 0; tries < 30; tries++) {
        var cand = pool[Math.floor(Math.random() * pool.length)], sc = scales[si];
        var far = S.targets.every(function (t) { return Math.hypot(t.fx - cand.fx, t.fy - cand.fy) > 0.2 * sc; }) &&
          (!S.lastPos || Math.hypot(S.lastPos.fx - cand.fx, S.lastPos.fy - cand.fy) > 0.15 * sc);
        if (far) { c = cand; break; }
      }
    }
    if (!c) return;
    S.lastPos = c;
    var hasNg = S.targets.some(function (t) { return t.type === 'ng'; });
    var ng = S.hits >= 1 && !hasNg && Math.random() < NG_CHANCE;
    S.targets.push({ fx: c.fx, fy: c.fy, rgb: c.rgb || PUFF_RGB[Math.floor(Math.random() * PUFF_RGB.length)], type: ng ? 'ng' : 'real', born: S.t });
  }
  function realCount() { return S.targets.filter(function (t) { return t.type === 'real'; }).length; }

  function tapPuff(x, y) {
    if (!playing()) return;
    var best = null, bd = 1e9, R = hitR() * 1.15;
    S.targets.forEach(function (t) {
      var sp = spotXY(t), d = Math.hypot(sp[0] - x, sp[1] - y);
      if (d < R && d < bd) { bd = d; best = t; }
    });
    if (!best) return;
    S.targets = S.targets.filter(function (t) { return t !== best; });
    var sp = spotXY(best);
    if (best.type === 'ng') {
      S.timeLeft = Math.max(0, S.timeLeft - NG_PENALTY);
      S.flash = 0.35; S.perfect = false;
      sfx('fail'); vib([80, 40, 80]);
      S.pops.push({ x: sp[0], y: sp[1] - 30, text: 'NG! -' + NG_PENALTY + '초', pic: pic('ng'), t: 0, bad: true });
      return;
    }
    S.hits += 1;
    S.marks.push({ fx: best.fx, fy: best.fy, rgb: best.rgb, t: S.t });
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
    if (S.stage < 3) S.timeLeft -= (window.__phHold && window.__phHold()) ? 0 : dt;
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
        var sg = sprayGeom(S.ptr);
        for (var k = 0; k < 2; k++) {
          var ang = sg.ang + (Math.random() - 0.5) * 0.5, sp = 260 + Math.random() * 200;
          S.mist.push({ x: sg.tx, y: sg.ty, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: 0.35 + Math.random() * 0.25 });
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
      drawFaceImg(g, S.face, N, faceIdOf(S.face));
    } else if (S.faceFail) {                               // 그림을 끝내 못 받았을 때만 임시 동그라미 (받는 중엔 아무것도 안 그려서 깜빡임 방지)
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
    c.globalAlpha = 0.97 * (S.faceOk ? Math.min(1, (S.t - (S.faceAt || 0)) / 0.3) : 1);   // 얼굴이 뿅 하고 바뀌지 않고 부드럽게 나타남
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
      // 드라이기: 손가락 위치에서 얼굴 쪽으로 부는 바람 — 바람은 드라이기 '송풍구'(둥근 앞부분)에서만 나오고, 드라이기는 얼굴 쪽을 향함
      var px = S.ptr.x, py = S.ptr.y, fc = faceC(), dir = px < fc[0] ? 1 : -1;
      var nx = px + dir * 24, ny = py - 58;            // 송풍구 위치 (그림 62px 기준)
      c.save(); c.lineCap = 'round';
      for (var i = 0; i < 5; i++) {
        var ph = (S.t * 3 + i * 0.37) % 1, off = (i - 2) * 8, len = 22 + i % 2 * 14;
        var x0 = nx + dir * (ph * 70), y0 = ny + off * (0.6 + ph * 0.8);
        var x1 = x0 + dir * len, y1 = y0 + Math.sin(S.t * 9 + i) * 3 + off * 0.15, al = 1 - ph;
        c.strokeStyle = 'rgba(70,170,190,' + (0.55 * al) + ')'; c.lineWidth = 6;     // 연한 청록 바탕선 (밝은 배경에서도 보이게)
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,' + (0.95 * al) + ')'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      }
      c.restore();
      drawPic(c, 'dryer', px, py - 46, 62, dir === 1);
    }
    if (S.stage === 1) {
      var R = hitR();
      S.targets.forEach(function (t) {
        var sp = spotXY(t), k = (S.t - t.born) / PUFF_LIFE, pulse = 0.5 + 0.5 * Math.sin(S.t * 9 + t.fx * 20);
        var ng = t.type === 'ng';
        if (ng && k > 0.7 && Math.floor(S.t * 10) % 2 === 0) return;          // 사라지기 직전 깜빡
        var gr = c.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], R);
        var rgb = ng ? '255,60,70' : t.rgb === '255,255,255' ? '255,235,150' : t.rgb;
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
      if (S.ptr) {   // 분사구가 얼굴을 향하도록 통을 기울여서 그림
        var sg2 = sprayGeom(S.ptr);
        c.save(); c.translate(sg2.cx, sg2.cy); c.rotate(sg2.rot);
        drawPic(c, 'spray', 0, 0, 62, false);
        c.restore();
      }
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
