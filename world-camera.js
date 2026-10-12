// ════════════════════════════════════════════════════════════
// 🎥 월드 카메라 (world-camera.js) — 카메라 시점 촬영 미니게임
// 내가 영화 카메라 감독! 파인더 화면을 끌어서 무대 위를 돌아다니는 멤버를 프레임 안에 담고,
// 결정적인 포즈(✨ 표시)가 뜨는 순간 셔터 📸 를 눌러요.
//  · 화면을 누른 채 끌면 카메라가 움직여요 (멤버는 계속 걸어 다녀요)
//  · 멤버가 프레임 안에 있는 시간 = 추적 점수
//  · 결정적 순간은 MOMENTS 번. 프레임 안 + 가운데에 가깝고 빨리 찍을수록 PERFECT
//  · 결정적 순간이 아닐 때 셔터를 누르면 헛찍 (잠깐 못 찍음)
// 결과: window.__worldCamera.play({ cid, onCancel }, function (perf, info) {...})   perf 0~1
// ✏️ 고치는 법: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window.__worldCameraLoaded) return; window.__worldCameraLoaded = true;

  // ════════ 설정 ════════
  var DURATION = 46;            // 촬영 시간(초)
  var MOMENTS = 9;              // 결정적 순간 횟수
  var FIRST_AT = 4.5;           // 첫 결정적 순간 시각(초)
  var GAP = 4.6;                // 결정적 순간 간격(초)
  var WINDOW = 2.4;             // 결정적 순간이 유지되는 시간(초)
  var PERFECT_T = 1.4;         // 이 시간 안에 찍으면 타이밍 만점(초)
  var FRAME_W = 0.64, FRAME_H = 0.40;   // 파인더 크기 (화면 대비)
  var WORLD_W = 2.1, WORLD_H = 1.6;     // 무대 크기 (화면 대비)
  var SPEED = [95, 140];        // 멤버 걷는 속도 범위(px/초)
  var W_TRACK = 0.35, W_SHOT = 0.65;    // 점수 비중
  var MISS_LOCK = 0.7;          // MISS 뒤 셔터 잠기는 시간(초)
  var BGS = ['drama/bg/paris.jpg', 'drama/bg/hollywood.jpg'];
  var POSES = ['smile', 'cry', 'fist'];
  var POSE_TXT = { smile: '환한 미소!', cry: '눈물 연기!', fist: '결의의 주먹!' };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sfx(n) { try { window.pocaSfx.play(n); } catch (e) {} }
  function imgOf(src) { var i = new Image(); i.src = src; return i; }

  function play(opt, done) {
    opt = opt || {};
    var cid = opt.cid || 'sion', ended = false, raf = 0;
    var W = window.innerWidth, H = window.innerHeight;
    var ov = document.createElement('div');
    ov.id = 'wcam-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99990;background:#05030c;color:#fff;font-family:\'Noto Sans KR\',sans-serif;touch-action:none;overflow:hidden;-webkit-user-select:none;user-select:none;';
    document.body.appendChild(ov);
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;';
    ov.appendChild(cv);
    var c = cv.getContext('2d');

    var bg = imgOf(opt.bg || BGS[Math.floor(Math.random() * BGS.length)]);
    var spr = { idle: imgOf('drama/actors/' + cid + '_idle.png') };
    POSES.forEach(function (p) { spr[p] = imgOf('drama/actors/' + cid + '_' + p + '.png'); });

    var WW = W * WORLD_W, WH = H * WORLD_H;
    var fw = W * FRAME_W, fh = H * FRAME_H, fx = (W - fw) / 2, fy = H * 0.18;
    var cam = { x: (WW - W) / 2, y: (WH - H) / 2 };
    var A = { x: WW / 2, y: WH / 2, tx: WW / 2, ty: WH / 2, wait: 0, pose: 'idle', sp: rnd(SPEED[0], SPEED[1]), h: H * 0.26, flip: 1 };
    var S = { t: 0, track: 0, shots: [], moment: -1, momentT: 0, momentPose: 'idle', shot: false, lock: 0, flash: 0, pops: [], over: false, started: false };
    var sched = []; for (var i = 0; i < MOMENTS; i++) sched.push(FIRST_AT + i * GAP);

    // ── 입력: 끌면 카메라 이동 ──
    var drag = null;
    cv.addEventListener('pointerdown', function (e) { if (!S.started) return; drag = { x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
    cv.addEventListener('pointermove', function (e) {
      if (!drag) return;
      cam.x = clamp(cam.x - (e.clientX - drag.x) * 1.35, 0, WW - W); cam.y = clamp(cam.y - (e.clientY - drag.y) * 1.35, 0, WH - H);
      drag.x = e.clientX; drag.y = e.clientY; e.preventDefault();
    });
    function up() { drag = null; }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

    // ── UI ──
    var shutter = document.createElement('button');
    shutter.setAttribute('aria-label', '셔터');
    shutter.style.cssText = 'position:absolute;left:50%;bottom:34px;transform:translateX(-50%);width:84px;height:84px;border-radius:50%;border:5px solid #fff;background:radial-gradient(circle,#ff6b8a,#e11d48);box-shadow:0 0 0 4px rgba(255,255,255,.25),0 6px 18px rgba(0,0,0,.5);font-size:30px;cursor:pointer;display:none;touch-action:manipulation;';
    shutter.textContent = '📸';
    ov.appendChild(shutter);
    var xb = document.createElement('button');
    xb.textContent = '✕'; xb.setAttribute('aria-label', '그만두기');
    xb.style.cssText = 'position:absolute;top:8px;right:8px;width:46px;height:46px;border-radius:50%;border:none;background:rgba(0,0,0,.55);color:#fff;font-size:17px;font-weight:900;cursor:pointer;z-index:9;touch-action:manipulation;';
    ov.appendChild(xb);
    var quit = function (e) { if (e) { e.preventDefault(); e.stopPropagation(); } if (ended) return; cleanup(); if (opt.onCancel) opt.onCancel(); };
    xb.addEventListener('pointerdown', quit); xb.onclick = quit;

    var intro = document.createElement('div');
    intro.style.cssText = 'position:absolute;inset:0;z-index:2;background:rgba(5,3,12,.86);display:flex;align-items:center;justify-content:center;padding:18px;';
    intro.innerHTML = '<div style="width:100%;max-width:330px;text-align:center;">' +
      '<div style="font-size:46px;">🎥</div><div style="font-size:20px;font-weight:900;margin:4px 0;">카메라 시점 촬영</div>' +
      '<div style="text-align:left;background:rgba(255,255,255,.09);border-radius:14px;padding:12px 14px;font-size:13px;line-height:1.8;color:#f1e9ff;">' +
      '· 화면을 <b>끌어서</b> 카메라를 움직여요<br>· 걸어 다니는 멤버를 <b>파인더 안에</b> 담아요<br>· <b style="color:#ffd76a">✨ 결정적 포즈</b>가 뜨는 순간 <b>📸 셔터</b>!<br>· 가운데에 담고 빨리 찍을수록 <b>PERFECT</b><br>· 아무 때나 찍으면 MISS! 잠깐 못 찍어요</div>' +
      '<button id="wcam-go" style="width:100%;margin-top:14px;padding:14px;border:none;border-radius:13px;background:linear-gradient(135deg,#f43f5e,#a855f7);color:#fff;font-size:16px;font-weight:900;cursor:pointer;">촬영 시작!</button></div>';
    ov.appendChild(intro);
    intro.querySelector('#wcam-go').onclick = function () { intro.remove(); S.started = true; shutter.style.display = 'block'; last = performance.now(); };

    function inFrame() {   // 멤버 몸(대략 직사각형)이 파인더와 조금이라도 겹치면 '프레임 안' (가운데 점만 보면 억울한 MISS가 나서 보정)
      var ax = A.x - cam.x, ay = A.y - cam.y, hw = A.h * 0.28;
      return ax + hw > fx && ax - hw < fx + fw && ay > fy && ay - A.h < fy + fh;
    }
    function pop(txt, col, x, y) { S.pops.push({ t: 0, txt: txt, col: col, x: x, y: y }); }

    shutter.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (!S.started || S.over) return;
      if (S.lock > 0) return;
      if (S.moment >= 0 && S.momentT > 0 && S.shot) return;   // 이미 찍은 순간에 또 누르면 무시 (헛찍 아님)
      S.flash = 0.25; sfx('shutter');
      var inMoment = S.moment >= 0 && S.momentT > 0 && !S.shot;
      if (!inMoment) { S.lock = MISS_LOCK; pop('MISS', '#ff8fa3', W / 2, fy + fh + 30); return; }
      S.shot = true;
      var sx = A.x - cam.x, sy = A.y - A.h * 0.45 - cam.y;
      var inside = inFrame();
      var el = WINDOW - S.momentT;   // 결정적 순간이 시작된 뒤 지난 시간
      if (!inside) { S.shots.push(0); pop('MISS…', '#ff8fa3', W / 2, fy + fh + 30); return; }
      var dx = (sx - (fx + fw / 2)) / (fw / 2), dy = (sy - (fy + fh / 2)) / (fh / 2), dist = Math.sqrt(dx * dx + dy * dy);
      var perfect = dist < 0.45 && el <= PERFECT_T;
      if (perfect) { S.shots.push(1); pop('PERFECT!', '#ffe27a', W / 2, fy + fh + 30); sfx('reward'); }
      else { S.shots.push(0.6); pop('GOOD', '#9ee7b5', W / 2, fy + fh + 30); }
    });

    // ── 진행 ──
    var last = performance.now();
    function nextWay() {
      A.tx = rnd(WW * 0.12, WW * 0.88); A.ty = rnd(WH * 0.38, WH * 0.86); A.sp = rnd(SPEED[0], SPEED[1]);
    }
    nextWay();
    function step(dt) {
      S.t += dt;
      // 멤버 이동
      if (A.wait > 0) A.wait -= dt;
      else {
        var dx = A.tx - A.x, dy = A.ty - A.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 8) { A.wait = rnd(0.3, 0.9); nextWay(); }
        else { A.x += dx / d * A.sp * dt; A.y += dy / d * A.sp * dt; if (Math.abs(dx) > 6) A.flip = dx > 0 ? 1 : -1; }
      }
      // 프레임 추적
      var sx = A.x - cam.x, sy = A.y - A.h * 0.45 - cam.y;
      var inside = inFrame();
      if (inside) S.track += dt;
      S.inside = inside;
      // 결정적 순간
      if (S.moment < MOMENTS - 1 && S.t >= sched[S.moment + 1]) {
        S.moment++; S.momentT = WINDOW; S.shot = false; A.pose = POSES[Math.floor(Math.random() * POSES.length)]; sfx('pop');
      }
      if (S.momentT > 0) {
        S.momentT -= dt;
        if (S.momentT <= 0) { if (!S.shot) { S.shots.push(0); pop('놓쳤어요', '#aab', W / 2, fy + fh + 30); } A.pose = 'idle'; }
      }
      if (S.lock > 0) S.lock -= dt;
      if (S.flash > 0) S.flash -= dt;
      S.pops.forEach(function (p) { p.t += dt; }); S.pops = S.pops.filter(function (p) { return p.t < 1.1; });
      if (S.t >= DURATION && S.momentT <= 0) finish();
    }

    function draw() {
      c.clearRect(0, 0, W, H);
      // 배경 (cover)
      if (bg.complete && bg.naturalWidth) {
        var sc = Math.max(WW / bg.naturalWidth, WH / bg.naturalHeight);
        c.drawImage(bg, -cam.x - (bg.naturalWidth * sc - WW) / 2, -cam.y - (bg.naturalHeight * sc - WH) / 2, bg.naturalWidth * sc, bg.naturalHeight * sc);
      } else { c.fillStyle = '#1a1030'; c.fillRect(0, 0, W, H); }
      // 멤버
      var im = spr[A.pose] && spr[A.pose].complete && spr[A.pose].naturalWidth ? spr[A.pose] : spr.idle;
      var bob = Math.sin(S.t * 8) * 3, ah = A.h, aw = ah * (im.naturalWidth || 1) / (im.naturalHeight || 1);
      var ax = A.x - cam.x, ay = A.y - cam.y + bob;
      c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(ax, A.y - cam.y + 4, aw * 0.32, 8, 0, 0, 7); c.fill();
      if (im.complete && im.naturalWidth) { c.save(); c.translate(ax, ay); c.scale(A.flip, 1); c.drawImage(im, -aw / 2, -ah, aw, ah); c.restore(); }
      // 결정적 순간 표시
      if (S.momentT > 0 && !S.shot) {
        var pulse = 0.5 + 0.5 * Math.sin(S.t * 14), ix = ax, iy = ay - ah - 16;
        c.save(); c.globalAlpha = 0.6 + 0.4 * pulse; c.fillStyle = '#ffd76a'; c.font = '900 22px sans-serif'; c.textAlign = 'center';
        c.fillText('✨', ix, iy); c.font = '900 13px sans-serif'; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 4;
        c.strokeText(POSE_TXT[A.pose], ix, iy + 18); c.fillText(POSE_TXT[A.pose], ix, iy + 18);
        c.restore();
      }
      // 파인더 바깥 어둡게
      c.save(); c.fillStyle = 'rgba(0,0,0,.58)'; c.beginPath(); c.rect(0, 0, W, H); c.rect(fx + fw, fy, -fw, fh); c.fill('evenodd'); c.restore();
      // 프레임 선/모서리
      var col = S.inside ? '#7dffa8' : '#ffffff';
      c.strokeStyle = col; c.lineWidth = 2; c.globalAlpha = 0.9; c.strokeRect(fx, fy, fw, fh);
      c.lineWidth = 5; var L = 22;
      [[fx, fy, 1, 1], [fx + fw, fy, -1, 1], [fx, fy + fh, 1, -1], [fx + fw, fy + fh, -1, -1]].forEach(function (k) { c.beginPath(); c.moveTo(k[0], k[1] + k[3] * L); c.lineTo(k[0], k[1]); c.lineTo(k[0] + k[2] * L, k[1]); c.stroke(); });
      c.globalAlpha = 0.5; c.lineWidth = 1; c.beginPath(); c.moveTo(fx + fw / 3, fy); c.lineTo(fx + fw / 3, fy + fh); c.moveTo(fx + fw * 2 / 3, fy); c.lineTo(fx + fw * 2 / 3, fy + fh); c.moveTo(fx, fy + fh / 3); c.lineTo(fx + fw, fy + fh / 3); c.moveTo(fx, fy + fh * 2 / 3); c.lineTo(fx + fw, fy + fh * 2 / 3); c.stroke(); c.globalAlpha = 1;
      // 멤버가 프레임 밖이면 방향 화살표
      var sx = A.x - cam.x, sy = A.y - A.h * 0.45 - cam.y;
      if (!(sx > 20 && sx < W - 20 && sy > 20 && sy < H - 20)) {
        var cx0 = W / 2, cy0 = H / 2, ang = Math.atan2(sy - cy0, sx - cx0), ex = clamp(cx0 + Math.cos(ang) * (W / 2 - 28), 28, W - 28), ey = clamp(cy0 + Math.sin(ang) * (H / 2 - 60), 60, H - 60);
        c.save(); c.translate(ex, ey); c.rotate(ang); c.fillStyle = '#ffd76a'; c.beginPath(); c.moveTo(14, 0); c.lineTo(-10, -11); c.lineTo(-10, 11); c.closePath(); c.fill(); c.restore();
      }
      // HUD
      var rec = Math.floor(S.t * 2) % 2 === 0;
      c.fillStyle = '#ff3b5c'; if (rec) { c.beginPath(); c.arc(22, 24, 6, 0, 7); c.fill(); }
      c.fillStyle = '#fff'; c.font = '900 13px sans-serif'; c.textAlign = 'left'; c.fillText('REC', 34, 29);
      var tl = Math.max(0, Math.ceil(DURATION - S.t)); c.fillText('00:' + (tl < 10 ? '0' : '') + tl, 76, 29);
      c.textAlign = 'right'; c.fillText('🎞 ' + S.shots.length + ' / ' + MOMENTS, W - 58, 29);
      // 추적 게이지
      var gx = 16, gy = fy + fh + 10, gw = W - 32;
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(gx, gy, gw, 8);
      c.fillStyle = '#7dffa8'; c.fillRect(gx, gy, gw * clamp(S.track / DURATION, 0, 1), 8);
      c.fillStyle = '#fff'; c.font = '800 11px sans-serif'; c.textAlign = 'left'; c.fillText('프레임 추적', gx, gy + 22);
      // 팝업
      S.pops.forEach(function (p) { c.save(); c.globalAlpha = 1 - p.t / 1.1; c.font = '900 26px sans-serif'; c.textAlign = 'center'; c.strokeStyle = 'rgba(0,0,0,.75)'; c.lineWidth = 5; c.strokeText(p.txt, p.x, p.y - p.t * 30); c.fillStyle = p.col; c.fillText(p.txt, p.x, p.y - p.t * 30); c.restore(); });
      // 헛찍 잠금
      shutter.style.opacity = S.lock > 0 ? '.35' : '1';
      // 플래시
      if (S.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + clamp(S.flash / 0.25, 0, 1) * 0.85 + ')'; c.fillRect(0, 0, W, H); }
    }

    function loop(now) {
      if (ended) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (S.started && !S.over) step(dt);
      draw();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    function cleanup() { ended = true; cancelAnimationFrame(raf); if (ov.parentNode) ov.remove(); }
    function finish() {
      if (S.over) return; S.over = true; ended = true; cancelAnimationFrame(raf);
      var shotAvg = S.shots.reduce(function (a, b) { return a + b; }, 0) / MOMENTS;
      var track = clamp(S.track / DURATION, 0, 1);
      var perf = clamp(W_TRACK * track + W_SHOT * shotAvg, 0, 1);
      var perfect = S.shots.filter(function (x) { return x === 1; }).length, good = S.shots.filter(function (x) { return x === 0.6; }).length;
      var info = { perfect: perfect, good: good, miss: MOMENTS - perfect - good, track: Math.round(track * 100) };
      var g = perf >= 0.85 ? 'S' : perf >= 0.7 ? 'A' : perf >= 0.5 ? 'B' : 'C';
      ov.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:18px;background:radial-gradient(circle,#2a1450,#05030c);"><div style="width:100%;max-width:320px;text-align:center;">' +
        '<div style="font-size:12px;color:#ffd7ec;font-weight:900;">🎥 촬영 종료</div>' +
        '<div style="font-size:64px;font-weight:900;margin:2px 0;color:' + (g === 'S' ? '#ffe27a' : g === 'A' ? '#9ee7b5' : '#cbd5e1') + ';">' + g + '</div>' +
        '<div style="font-size:14px;font-weight:900;">' + Math.round(perf * 100) + '점</div>' +
        '<div style="margin:10px 0 16px;font-size:12.5px;color:#e6dcff;line-height:1.8;">PERFECT ' + perfect + ' · GOOD ' + good + ' · MISS ' + info.miss + '<br>프레임 추적 ' + info.track + '%</div>' +
        '<button id="wcam-ok" style="width:100%;padding:13px;border:none;border-radius:13px;background:linear-gradient(135deg,#f43f5e,#a855f7);color:#fff;font-size:15px;font-weight:900;cursor:pointer;">확인</button></div></div>';
      ov.querySelector('#wcam-ok').onclick = function () { if (ov.parentNode) ov.remove(); try { done && done(perf, info); } catch (e) {} };
    }
    window.__wcamTest = { S: S, A: A, cam: cam, step: step, finish: finish };
  }

  window.__worldCamera = { play: play };
})();
