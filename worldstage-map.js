// ════════════════════════════════════════════════════════════
// 🌏 월드스타 스테이지 (worldstage-map.js) — 월드스타 도전 전용 탑뷰 맵
// 맵 안을 걸어 다니며 ❗ 표시에 다가가면 이벤트가 시작돼요.
//  · 🎥 카메라 촬영 (카메라 시점 미니게임, world-camera.js)  · 🌍 월드 투어 공연 (오디션 무대)  · 🌐 세계 반응 선택
//  · 🎬 영화 감독 NPC: 말을 걸면 해외 영화 촬영 화면(drama.js)이 열려요
// 열리는 조건: 멤버 중 한 명이라도 월드스타 로드맵의 '기본 4단계'를 마친 뒤
// 보상: 코인 · 강화석 · 소원의 조각 · 🎁 상자 (이벤트 성적에 따라)
// 투어/반응/영화 진행은 월드스타 로드맵(worldstar.js)에 그대로 반영돼요
// ✏️ 값 바꾸는 곳: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // ── 설정 ──
  var NEED_LEVEL = 40, STAMINA = 150, DAILY = 3;
  var WORLD_MUL_W = 2.4;     // 맵 가로 크기 (화면 가로의 몇 배). 세로는 그림 비율(2:3)에 맞춤
  var SPEED = 190, PLAYER_R = 20, TRIGGER_R = 44;
  var SPOTS = [[.24, .31], [.76, .31], [.12, .50], [.88, .50], [.32, .43], [.68, .43], [.50, .53], [.30, .68], [.70, .68], [.50, .74], [.36, .86], [.64, .86]];   // 그림 위 걷는 자리 (가로,세로 비율)
  var NPC_SPOT = [.5, .245];                     // 감독 NPC 자리 (붉은 카펫 위 무대 앞)
var TYPES = ['cam', 'react', 'cam', 'tour', 'react', 'cam', 'cam'];   // 이벤트 7개 (+ 감독 1개)
  // 성적별 보상 [코인, 강화석, 소원의 조각, 경험치]
  var RANK = { S: [300000, 2, 1, 3000], A: [200000, 1, 1, 2000], B: [120000, 1, 0, 1200], C: [50000, 0, 0, 500] };
  var TOUR_WIN = [300000, 2, 1, 3500], REACT_BIG = [150000, 0, 1, 1500], REACT_SMALL = [60000, 0, 0, 600], FILM_DONE = [250000, 1, 1, 3000];
  var ICON = { cam: '🎥', tour: '🌍', react: '🌐', npc: '🎬' };
  var LABEL = { cam: '카메라 촬영', tour: '월드 투어 공연', react: '세계 반응', npc: '영화 감독' };
  var MIN_DONE_WIN = 3;                          // 이만큼 해내면 '성공'

  function api() { return window.__worldstar; }
  function rankOf(p) { return p >= .85 ? 'S' : p >= .6 ? 'A' : p >= .35 ? 'B' : 'C'; }
  function anyOpen() { try { return !!(api() && api().anyOpen()); } catch (e) { return false; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function play(ctx) {
    var root = ctx.root, cid = ctx.charId, imgBase = ctx.imgBase;
    var W = Math.max(320, ctx.W || root.clientWidth || 390), H = Math.max(520, ctx.H || root.clientHeight || 700);
    var WW = Math.round(W * WORLD_MUL_W), WH = Math.round(WW * 1.5);
    var ws = api(), base = false; try { base = !!(ws && ws.baseDone(cid)); } catch (e) {}
    var P0 = {}; try { P0 = ws.progOf(cid); } catch (e) {}

    // 이벤트 배치 (자리 섞기)
    var spots = SPOTS.slice().sort(function () { return Math.random() - .5; });
    var ev = [];
    TYPES.forEach(function (t, i) {
      if (t === 'tour' && (!base || (P0.tour || 0) >= 3)) t = 'cam';
      if (t === 'react' && (!base || (P0.react || 0) >= 300)) t = 'cam';
      ev.push({ t: t, x: spots[i][0] * WW, y: spots[i][1] * WH, done: false, r: 0 });
    });
    ev.push({ t: 'npc', x: NPC_SPOT[0] * WW, y: NPC_SPOT[1] * WH, done: false, r: 0 });
    var S = { px: WW / 2, py: WH * .95, tx: null, ty: null, paused: false, over: false, loot: [], coin: 0, exp: 0, stone: 0, wish: 0, log: [], t: 0, cx: 0, cy: 0, said: '' };

    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;overflow:hidden;background:#0b0716;font-family:\'Noto Sans KR\',sans-serif;touch-action:none;user-select:none;-webkit-user-select:none;';
    wrap.innerHTML = '<canvas width="' + W + '" height="' + H + '" style="position:absolute;left:0;top:0;width:100%;height:100%;"></canvas>' +
      '<div style="position:absolute;left:0;right:0;top:0;padding:10px 14px 0;box-sizing:border-box;pointer-events:none;color:#fff;">' +
        '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;text-shadow:0 1px 4px #000;"><span>🌏 월드스타 스테이지</span><span class="ws-prog"></span></div>' +
        '<div class="ws-say" style="text-align:center;font-size:12px;color:#ffe9a8;margin-top:6px;min-height:16px;text-shadow:0 1px 4px #000;"></div></div>' +
      '<button class="ws-end" style="position:absolute;right:12px;bottom:14px;border:none;border-radius:12px;padding:10px 14px;font-size:13px;font-weight:900;background:rgba(0,0,0,.6);color:#fff;border:1.5px solid rgba(255,255,255,.4);font-family:inherit;">마치기</button>';
    root.appendChild(wrap);
    var cv = wrap.querySelector('canvas'), g = cv.getContext('2d');
    function q(c) { return wrap.querySelector('.' + c); }
    function load(src, fb) { var i = new Image(); i.onerror = function () { if (fb && !i.__fb) { i.__fb = 1; i.src = fb; } }; i.src = src; return i; }
    var IM = { bg: load(imgBase + 'special-world_stage.jpg', imgBase + 'special-world_tour.jpg'), face: load(ctx.face || (imgBase + 'face-' + cid + '.png')) };
    function okI(i) { return i && i.complete && i.naturalWidth > 0; }

    // 이동
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width + S.cx, y: (e.clientY - r.top) * H / r.height + S.cy }; }
    var down = false;
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); down = true; var p = pos(e); S.tx = p.x; S.ty = p.y; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
    cv.addEventListener('pointermove', function (e) { if (!down) return; var p = pos(e); S.tx = p.x; S.ty = p.y; });
    cv.addEventListener('pointerup', function () { down = false; });
    cv.addEventListener('pointercancel', function () { down = false; });
    q('ws-end').addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); if (!S.paused) end(); });

    function say(t) { q('ws-say').textContent = t; }
    function doneN() { return ev.filter(function (x) { return x.done; }).length; }
    function hud() { q('ws-prog').textContent = '✅ ' + doneN() + ' / ' + ev.length; }

    function reward(arr, label) {
      S.coin += arr[0]; S.stone += arr[1]; S.wish += arr[2]; S.exp += arr[3];
      var l = ExpKit.rollLoot(); S.loot.push(l);
      S.log.push(label + ' → 🪙' + Math.round(arr[0] / 1000) + 'k' + (arr[1] ? ' 🔨' + arr[1] : '') + (arr[2] ? ' 🧩' + arr[2] : '') + ' · ' + l.txt);
      say(label + ' 완료! ' + l.txt);
    }
    function resume(e, finished) {
      S.paused = false; S.tx = null; S.ty = null;
      if (finished) e.done = true; else e.away = true;   // 안 끝낸 이벤트는 그 자리를 벗어난 뒤에야 다시 시작 (그만두기가 무한 재시작되던 문제)
      hud();
      if (ev.every(function (x) { return x.done; })) setTimeout(end, 500);
    }

    function trigger(e) {
      S.paused = true; S.tx = null; S.ty = null;
      if (e.t === 'cam') {
        if (!window.__worldCamera) { say('카메라를 아직 쓸 수 없어요'); S.paused = false; return; }
        window.__worldCamera.play({ cid: cid, onCancel: function () { resume(e, false); } }, function (perf) {
          var r = rankOf(perf || 0); e.r = r; reward(RANK[r], '🎥 촬영 ' + r); resume(e, true);
        });
      } else if (e.t === 'tour') {
        ws.openTour(cid, { onEnd: function (ok) { if (ok) reward(TOUR_WIN, '🌍 월드 투어'); resume(e, !!ok); } });
      } else if (e.t === 'react') {
        ws.openReact(cid, { anyDay: true, onEnd: function (pts) { if (pts === false) { resume(e, false); return; } reward(pts >= 25 ? REACT_BIG : REACT_SMALL, '🌐 세계 반응'); resume(e, true); } });
      } else if (e.t === 'npc') {
        var dw = window.__dramaWorld;
        if (!dw || !dw.open(cid, 'hollywood', 'james')) { say('영화 촬영 화면을 열 수 없어요'); S.paused = false; return; }
        var seen = false, tm = setInterval(function () {
          var open = false; try { open = dw.isOpen(); } catch (x) {}
          if (open) { seen = true; return; }
          if (seen || !wrap.isConnected) {
            clearInterval(tm);
            var shot = 0; try { shot = ws.progOf(cid).film ? 1 : 0; } catch (x) {}
            if (shot) reward(FILM_DONE, '🎬 해외 영화'); else say('🎬 영화 촬영을 마치지 않았어요. 다시 말을 걸어 봐요');
            resume(e, !!shot);
          }
        }, 400);
      }
    }

    var raf = 0, last = performance.now();
    function step(dt) {
      S.t += dt;
      if (S.tx != null) {
        var dx = S.tx - S.px, dy = S.ty - S.py, d = Math.hypot(dx, dy);
        if (d < 4) { S.tx = null; S.ty = null; }
        else { var m = Math.min(d, SPEED * dt); S.px += dx / d * m; S.py += dy / d * m; }
      }
      S.px = Math.max(PLAYER_R, Math.min(WW - PLAYER_R, S.px)); S.py = Math.max(PLAYER_R, Math.min(WH - PLAYER_R, S.py));
      S.cx = Math.max(0, Math.min(WW - W, S.px - W / 2)); S.cy = Math.max(0, Math.min(WH - H, S.py - H / 2));
      for (var i = 0; i < ev.length; i++) {
        var e = ev[i]; if (e.done) continue;
        var dd = Math.hypot(e.x - S.px, e.y - S.py);
        if (e.away) { if (dd > TRIGGER_R * 1.8) e.away = false; continue; }
        if (dd < TRIGGER_R) { trigger(e); break; }
      }
    }
    function draw() {
      g.clearRect(0, 0, W, H);
      if (okI(IM.bg)) {   // 그림을 맵 크기에 맞춰 덮어씌움(cover)
        var sc = Math.max(WW / IM.bg.naturalWidth, WH / IM.bg.naturalHeight), bw = IM.bg.naturalWidth * sc, bh = IM.bg.naturalHeight * sc;
        g.drawImage(IM.bg, (WW - bw) / 2 - S.cx, (WH - bh) / 2 - S.cy, bw, bh);
      } else { g.fillStyle = '#1b1140'; g.fillRect(0, 0, W, H); }
      ev.forEach(function (e) {
        var x = e.x - S.cx, y = e.y - S.cy; if (x < -60 || x > W + 60 || y < -60 || y > H + 60) return;
        g.globalAlpha = e.done ? .35 : 1;
        var bob = e.done ? 0 : Math.sin(S.t * 3 + e.x) * 4;
        g.beginPath(); g.arc(x, y + 6, 26, 0, 7); g.fillStyle = e.done ? 'rgba(0,0,0,.4)' : 'rgba(255,215,0,.28)'; g.fill();
        g.font = '30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
        g.fillText(e.done ? '✅' : ICON[e.t], x, y + bob);
        if (!e.done) { g.font = '900 13px "Noto Sans KR",sans-serif'; g.lineWidth = 3; g.strokeStyle = '#000'; g.strokeText('❗ ' + LABEL[e.t], x, y - 34 + bob); g.fillStyle = '#ffe27a'; g.fillText('❗ ' + LABEL[e.t], x, y - 34 + bob); }
        g.globalAlpha = 1;
      });
      var px = S.px - S.cx, py = S.py - S.cy;
      try { if (window.__groupMagic) window.__groupMagic.draw(g, px, py, PLAYER_R, S.t, cid); } catch (e) {}
      g.save(); g.beginPath(); g.arc(px, py, PLAYER_R, 0, 7); g.clip();
      if (okI(IM.face)) g.drawImage(IM.face, px - PLAYER_R, py - PLAYER_R, PLAYER_R * 2, PLAYER_R * 2); else { g.fillStyle = '#ffb3d9'; g.fill(); }
      g.restore();
      g.beginPath(); g.arc(px, py, PLAYER_R, 0, 7); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
      if (S.tx != null) { g.beginPath(); g.arc(S.tx - S.cx, S.ty - S.cy, 8, 0, 7); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.stroke(); }
    }
    function loop(now) {
      if (!root.isConnected) { cancelAnimationFrame(raf); return; }
      var dt = Math.min(.05, (now - last) / 1000); last = now;
      try { if (!S.paused && !S.over) step(dt); draw(); } catch (e) { console.error('[worldstage]', e); }
      if (!S.over) raf = requestAnimationFrame(loop);
    }

    function end() {
      if (S.over) return; S.over = true; cancelAnimationFrame(raf);
      var n = doneN(), win = n >= MIN_DONE_WIN;
      setTimeout(function () {
        wrap.remove();
        ctx.finish(ExpKit.mergeLoot({
          win: win, title: win ? '월드스타 스테이지 성공!' : '조금 더 해볼까요?', coin: S.coin, exp: S.exp, stone: S.stone, wish: S.wish, items: [],
          summary: '해낸 이벤트 ' + n + ' / ' + ev.length + '<br>' + S.log.map(esc).join('<br>')
        }, S.loot));
      }, 300);
    }
    hud(); say('❗ 표시로 걸어가 보세요. 화면을 누르면 그쪽으로 걸어가요');
    raf = requestAnimationFrame(loop);
    window.__wstageTest = { S: S, ev: ev, step: step, draw: draw, trigger: trigger, end: end };
  }

  function reg() {
    if (!window.ExpKit) { setTimeout(reg, 100); return; }
    window.ExpKit.register({
      id: 'world_stage', bg: 'special-world_stage.jpg', name: '월드스타 스테이지', emoji: '🌏', color: '#fbbf24', needLevel: NEED_LEVEL, stamina: STAMINA, daily: DAILY,
      tagline: '해외 영화 촬영 · 월드 투어 · 세계 반응을 한 맵에서!', gearChance: 0.4, gearMin: 'great',
      gate: function () { return anyOpen() ? '' : '월드스타 로드맵의 기본 4단계를 마친 멤버가 있어야 열려요'; }, gateTag: '월드스타 도전 후',
      intro: ['<b>월드스타 스테이지</b>! 화면을 <b>누르면</b> 멤버가 걸어가요. <b>❗ 표시</b>에 다가가면 이벤트가 시작돼요.', '🎥 <b>카메라 촬영</b> · 🌍 <b>월드 투어</b> · 🌐 <b>세계 반응</b> · 🎬 <b>영화 감독</b>(말을 걸면 해외 영화 촬영). 투어·반응·영화는 로드맵 진행에도 반영돼요.', '다 못 해도 <b>마치기</b>로 끝내면 해낸 만큼 보상을 받아요.'],
      play: play
    });
  }
  reg();
})();
