// ════════════════════════════════════════════════════════════
// 🏟️ 월드투어 스타디움 (worldtour-map.js) — 팬덤 원정 · 플레이어 Lv.35
// 월드투어에 사생팬이 쫓아왔어요! 탑뷰로 쫓아내는 미니게임.
//  · 화면을 누르거나 끌면 멤버가 그쪽으로 걸어가요. 아래 스킬 버튼으로 공격 (그 멤버가 배운 스킬만, 사거리 안에서)
//  · 보스는 머리 위에 기술 이름이 뜨고 바닥에 붉은 예고가 떠요 → 피하기
//      📸 몰카 촬영(부채꼴) · 🚗 미행 돌진(일직선) · 📞 전화 폭탄(원형 장판) · 🎁 수상한 선물(🎀 리본만 진짜)
//      🧑‍🤝‍🧑 사생 부대 소환(졸개를 먼저 안 잡으면 보스 피해 30%) · 📡 도청기(느려짐 장판) · 📱 라이브 방송(광폭화: 안전지대)
//  · 체력 70% / 40% / 10% 에서 페이즈가 바뀌고 기술이 늘어요. 제한시간 150초
//  · 졸개가 쓰러지면 가끔 🎁 상자 → 걸어가서 주워요
// 보상: 🧩 소원의 조각 · 🔨 강화석 · 🔹 재조합석 · 🔶 공방의 원석 · 🖼️ 프리미엄 조각 · 코인 · 카드 경험치
// ✏️ 값 바꾸는 곳: 아래 [설정] 과 SKD(스킬 성능) / ATK·PHASE_POOL(보스 기술)
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // ── 설정 ──
  var NEED_LEVEL = 35;       // 열리는 플레이어 레벨
  var STAMINA = 150;         // 입장 스태미나
  var DAILY = 3;             // 하루 보상 100% 횟수
  var BOSS_HP = 4000;        // 보스 체력
  var HEARTS = 5;            // 내 하트
  var LV_DMG = 0.02;         // 플레이어 레벨 1당 데미지 증가 (Lv.35 기준)
  var WIN_COIN = 400000, WIN_EXP = 6000;
  var PIECE_CHANCE = 1.0, PIECE_BONUS = 0.6;   // 프리미엄 조각
  var WISH_WIN = 5, WISH_BONUS = 0.5;            // 소원의 조각 (기본 개수, 한 개 더 줄 확률)
  var STONE_WIN = 3, STONE_BONUS = 0.5;           // 강화석 (기본 개수, 한 개 더 줄 확률)
  var EPIC_STONE_CHANCE = 0.7;                   // 💠 에픽 재조합석 확률
  var RECOMB_N = 5, ONGSTONE_N = 5;              // 🔹 재조합석 / 🔶 공방의 원석 개수
  var LOSE_RATE = 0.8;       // 졌을 때: 깎은 비율 × 이 값 만큼의 보상
  var SK = [
    { id: 'highlight', lv: 20, icon: '🎤', name: '하이라이트' },
    { id: 'wink', lv: 25, icon: '💖', name: '윙크' },
    { id: 'encore', lv: 30, icon: '✨', name: '앵콜폭죽' },
    { id: 'rose', lv: 35, icon: '🌹', name: '장미세례' },
    { id: 'finale', lv: 40, icon: '🎆', name: '불꽃쇼' }
  ];

  // 스킬 목록: 팬 스킬 상점의 실제 스킬 (그 멤버가 배운 것만 누를 수 있고, 레벨은 됐지만 못 배운 건 🔒)
  function skillList(cid, lv) {
    var api = window.__fanSkillsAPI;
    if (!api || !api.SKILLS) return { all: SK.filter(function (s) { return lv >= s.lv; }).map(function (s) { return { id: s.id, icon: s.icon, name: s.name, ok: true }; }) };
    return { all: api.SKILLS.filter(function (k) { return lv >= (k.useLv || 1); }).map(function (k) {
      var ok = true; try { ok = !!api.hasSkill(cid, k.id); } catch (e) {}
      return { id: k.id, icon: k.icon, name: k.short || k.name, ok: ok };
    }) };
  }
  var FAN_IMGS = 10;

  // 스킬 성능 (range = 사거리 px / dmg = 위력 / cd = 쿨타임 초 / aoe = 범위 안 전부 / stun = 보스 기절 초)
  var SKD = {
    sign:      { range: 150, dmg: 28,  cd: 0.9 },
    photo:     { range: 210, dmg: 36,  cd: 1.2 },
    shake:     { range: 160, dmg: 46,  cd: 1.4 },
    heart:     { range: 230, dmg: 58,  cd: 1.7 },
    highlight: { range: 270, dmg: 85,  cd: 2.4, aoe: true },
    wink:      { range: 330, dmg: 110, cd: 2.9, aoe: true },
    encore:    { range: 390, dmg: 150, cd: 3.4, aoe: true },
    rose:      { range: 440, dmg: 200, cd: 4.2, aoe: true },
    finale:    { range: 520, dmg: 320, cd: 6.5, aoe: true, stun: 2 }
  };
  var BOSS_R = 58, PLAYER_R = 20, SPEED = 175, TIME_LIMIT = 150, INV = 1.3;
  // 보스 기술 (name = 머리 위에 뜨는 이름 / warn = 예고 시간 초)
  var ATK = {
    cam:   { name: '📸 몰카 촬영',   warn: 2.0 },
    dash:  { name: '🚗 미행 돌진',   warn: 1.5 },
    phone: { name: '📞 전화 폭탄',   warn: 2.0 },
    gift:  { name: '🎁 수상한 선물', warn: 1.0 },
    squad: { name: '🧑‍🤝‍🧑 사생 부대 소환', warn: 1.4 },
    bug:   { name: '📡 도청기 설치', warn: 1.2 },
    live:  { name: '📱 라이브 방송 켜기!', warn: 3.0 }
  };
  var PHASE_POOL = [['cam', 'dash'], ['cam', 'dash', 'phone', 'gift'], ['cam', 'dash', 'phone', 'gift', 'squad', 'bug'], ['live', 'cam', 'phone', 'dash']];
  var SAYS = ['오늘도 찍었다!', '내 사랑은 정당해!', '왜 도망가? 응원하는 건데!', '다 알고 있어, 네 스케줄!', '조금만 더 가까이…!'];

  function play(ctx) {
    var root = ctx.root, lv = ctx.level, imgBase = ctx.imgBase;
    var W = Math.max(320, ctx.W || root.clientWidth || 390), H = Math.max(520, ctx.H || root.clientHeight || 700);
    var SL = skillList(ctx.charId, lv).all;
    var avail = SL.filter(function (s) { return s.ok; });
    function gfs(k) { try { return window.FanGear ? window.FanGear.sum(ctx.charId, k) : 0; } catch (e) { return 0; } }   // 🎀 소품 효과
    var reachMul = 1 + gfs('reach') / 100, cdMul = Math.max(0.5, 1 - gfs('cd') / 100);   // 🎀 사거리↑ / 쿨타임↓
    var lvMul = 1 + Math.max(0, lv - 35) * LV_DMG;
    var boxMul = 1; try { boxMul = window.FanGear ? window.FanGear.mult(ctx.charId, 'box') : 1; } catch (e) {}
    var AR = { x0: 18, x1: W - 18, y0: 120, y1: H - 128 };   // 움직일 수 있는 영역
    var S = { forgive: gfs('forgive'), loot: [], hp: BOSS_HP, hearts: HEARTS, inv: 0, time: TIME_LIMIT, phase: 0, over: false, uses: 0, kills: 0,
      px: (AR.x0 + AR.x1) / 2, py: AR.y1 - 40, tx: null, ty: null,
      bx: (AR.x0 + AR.x1) / 2, by: AR.y0 + 90, stun: 0, idle: 2.2, cur: null, fx: [], minions: [], boxes: [], gifts: [], slows: [], cd: {}, slow: 0, dashing: null, say: '', sayT: 0, banner: '', bannerT: 0, squadT: 0, liveT: 4, lastAtk: '' };
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;overflow:hidden;background:#0b0716;font-family:\'Noto Sans KR\',sans-serif;touch-action:none;user-select:none;-webkit-user-select:none;';
    wrap.innerHTML = '<canvas id="wt-cv" width="' + W + '" height="' + H + '" style="position:absolute;left:0;top:0;width:100%;height:100%;"></canvas>' +
      '<div style="position:absolute;left:0;right:0;top:0;padding:10px 14px 0;box-sizing:border-box;pointer-events:none;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:900;color:#fff;"><span>🏟️ 월드투어 · 사생팬이 쫓아왔어요!</span><span id="wt-hearts" style="font-size:16px;"></span></div>' +
        '<div style="margin-top:6px;height:16px;border-radius:8px;background:rgba(255,255,255,.14);overflow:hidden;border:1px solid rgba(255,255,255,.25);"><div id="wt-hp" style="height:100%;width:100%;background:linear-gradient(90deg,#ef4444,#f59e0b);"></div></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;color:#d9ccff;margin-top:3px;"><span id="wt-phase">1페이즈</span><span id="wt-time"></span></div>' +
        '<div id="wt-say" style="text-align:center;font-size:12px;color:#ffd1da;margin-top:4px;min-height:16px;"></div></div>' +
      '<div id="wt-btns" style="position:absolute;left:0;right:0;bottom:0;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding:0 8px 14px;"></div>';
    root.appendChild(wrap);
    try { (window.__lvCanvasTargets = window.__lvCanvasTargets || []).push({ el: wrap, pos: function () { return { x: S.px, y: S.py, W: W, H: H }; } }); } catch (e) {}   // ✨ 레벨업 연출이 내 캐릭터 위치를 알 수 있게 (levelup-fx.js)
    var cv = wrap.querySelector('#wt-cv'), g = cv.getContext('2d');
    var q = function (id) { return wrap.querySelector('#' + id); };
    function loadImg(src) { var i = new Image(); i.src = src; return i; }
    var IM = { boss: loadImg(imgBase + 'rfan-boss.png'), face: loadImg(ctx.face || (imgBase + 'face-' + ctx.charId + '.png')), box: loadImg(imgBase + 'fx-box.png'), bg: loadImg(imgBase + 'special-world_tour.jpg'), fans: [] };
    ['highlight','wink','encore','rose','finale','hit'].forEach(function (k) { IM['v_' + k] = loadImg(imgBase + 'vfx-' + k + '.png'); });
    ['cam','van','phone','trap','gift','bug','live','safe','fan','lane','ring-red','ring-green','ring-blue','burst'].forEach(function (k) { IM['w_' + k] = loadImg(imgBase + 'wt-' + k + '.png'); });
    for (var fi = 1; fi <= FAN_IMGS; fi++) IM.fans.push(loadImg(imgBase + 'rfan-' + fi + '.png'));
    function ok(im) { return im && im.complete && im.naturalWidth > 0; }

    // ── 스킬 버튼 ──
    var BW = SL.length > 7 ? 38 : SL.length > 5 ? 44 : 54;
    SL.forEach(function (s) {
      var b = document.createElement('button'); b.dataset.id = s.id;
      var locked = !s.ok;
      b.style.cssText = 'position:relative;overflow:hidden;width:' + BW + 'px;height:' + (BW + 16) + 'px;border-radius:13px;border:2px solid ' + (locked ? 'rgba(255,255,255,.25)' : '#fff') + ';background:' + (locked ? 'rgba(255,255,255,.08)' : 'linear-gradient(160deg,#6d28d9,#3b0764)') + ';color:#fff;font-size:' + Math.round(BW * 0.46) + 'px;font-weight:900;cursor:pointer;touch-action:manipulation;padding:0;' + (locked ? 'opacity:.55;' : '');
      b.innerHTML = (locked ? '🔒' : s.icon) + '<div style="font-size:9px;font-weight:900;margin-top:1px;line-height:1.1;">' + s.name + '</div><div class="cdv" style="position:absolute;left:0;right:0;bottom:0;height:0;background:rgba(0,0,0,.6);"></div>';
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (locked) { say('🔒 ' + s.name + ' — 더보기 > 💖 팬 스킬 상점에서 배우면 쓸 수 있어요'); return; }
        useSkill(s.id);
      });
      q('wt-btns').appendChild(b);
    });

    // ── 이동 (손가락을 누르거나 끌면 그쪽으로 걸어가요) ──
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
    var down = false;
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); down = true; var p = pos(e); S.tx = p.x; S.ty = p.y; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
    cv.addEventListener('pointermove', function (e) { if (!down) return; var p = pos(e); S.tx = p.x; S.ty = p.y; });
    cv.addEventListener('pointerup', function () { down = false; });
    cv.addEventListener('pointercancel', function () { down = false; });

    function say(t) { q('wt-say').textContent = t; S.sayT = 3; }
    function banner(t) { S.banner = t; S.bannerT = 1.6; }
    function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function drawHud() {
      var h = ''; for (var i = 0; i < HEARTS; i++) h += i < S.hearts ? '❤️' : '🖤';
      q('wt-hearts').innerHTML = h;
      q('wt-hp').style.width = Math.max(0, S.hp / BOSS_HP * 100) + '%';
      var names = ['1페이즈', '2페이즈', '3페이즈', '🔥 광폭화'];
      q('wt-phase').textContent = names[S.phase] + (S.minions.length ? ' · 🛡️ 졸개를 먼저 정리!' : '');
      q('wt-time').textContent = '⏱ ' + Math.max(0, Math.ceil(S.time)) + '초';
    }

    // ── 피해 / 스킬 ──
    function hurt(why) {
      if (S.over || S.inv > 0) return;
      if (S.forgive > 0) { S.forgive--; S.inv = 0.8; say('🎀 소품이 막아줬어요!'); return; }
      S.hearts--; S.inv = INV; say(why || '맞았어요!');
      wrap.style.boxShadow = 'inset 0 0 60px rgba(239,68,68,.7)'; setTimeout(function () { wrap.style.boxShadow = ''; }, 220);
      drawHud();
      if (S.hearts <= 0) end(false);
    }
    function floatTxt(x, y, t, col) { S.fx.push({ k: 'txt', x: x, y: y, t: t, col: col || '#ffe27a', life: 0.9, age: 0 }); }
    function dropBox(x, y) {
      S.boxes.push({ x: clamp(x, AR.x0 + 20, AR.x1 - 20), y: clamp(y, AR.y0 + 20, AR.y1 - 20), life: 7 });
    }
    function useSkill(id) {
      if (S.over || (S.cd[id] || 0) > 0) return;
      var d = SKD[id]; if (!d) return;
      var R = d.range * reachMul, dmgBase = d.dmg * lvMul;
      var bd = dist(S.px, S.py, S.bx, S.by) - BOSS_R;
      var targets = [];
      S.minions.forEach(function (m) { var md = dist(S.px, S.py, m.x, m.y) - 16; if (md <= R) targets.push({ m: m, d: md }); });
      targets.sort(function (a, b) { return a.d - b.d; });
      var hitBoss = bd <= R;
      if (!hitBoss && !targets.length) { say('너무 멀어요! 가까이 가서 눌러요'); return; }
      S.cd[id] = d.cd * cdMul; S.uses++;
      S.fx.push({ k: 'skfx', id: id, x: S.px, y: S.py, r: R, life: d.aoe ? 0.75 : 0.4, age: 0, aoe: !!d.aoe });
      var list = d.aoe ? targets : targets.slice(0, 1);
      list.forEach(function (t) {
        t.m.hp -= dmgBase;
        if (t.m.hp <= 0) {
          S.minions.splice(S.minions.indexOf(t.m), 1); S.kills++; floatTxt(t.m.x, t.m.y - 10, '💗');
          if (Math.random() < Math.min(1, 0.45 * boxMul)) dropBox(t.m.x, t.m.y);
          drawHud();
        } else floatTxt(t.m.x, t.m.y - 10, '-' + Math.round(dmgBase));
      });
      if (hitBoss) {
        var shield = S.minions.length > 0;
        var dmg = Math.round(dmgBase * (shield ? 0.3 : 1));
        S.hp = Math.max(0, S.hp - dmg);
        floatTxt(S.bx, S.by - BOSS_R - 12, (shield ? '🛡️ ' : '') + '-' + dmg, shield ? '#9ca3af' : '#ffe27a');
        if (d.stun && !shield) { S.stun = d.stun; banner('🎆 사생팬이 눈이 부셔 멈췄어요!'); }
        drawHud();
        checkPhase();
        if (S.hp <= 0) return end(true);
      }
      try { if (window.pocaSfx && window.pocaSfx.play) window.pocaSfx.play('pick'); } catch (x) {}
    }
    function checkPhase() {
      var r = S.hp / BOSS_HP, np = r > 0.7 ? 0 : r > 0.4 ? 1 : r > 0.1 ? 2 : 3;
      if (np > S.phase) {
        S.phase = np; S.fx = S.fx.filter(function (f) { return f.k === 'txt' || f.k === 'ring' || f.k === 'skfx'; }); S.cur = null; S.idle = 2.2;
        banner(np === 3 ? '🔥 광폭화! 라이브 방송 시작!' : '⚡ ' + (np + 1) + '페이즈!');
        dropBox(S.bx + (Math.random() - 0.5) * 120, S.by + 110);
        drawHud();
      }
    }

    // ── 보스 기술 ──
    function startAtk(key) {
      var a = ATK[key]; S.lastAtk = key;
      var c = { key: key, name: a.name, t: 0, warn: a.warn * (S.phase === 3 ? 0.8 : 1), done: false };
      if (key === 'cam') { c.ang = Math.atan2(S.py - S.by, S.px - S.bx); }
      if (key === 'dash') { c.ang = Math.atan2(S.py - S.by, S.px - S.bx); }
      if (key === 'phone') { c.spots = []; var n = S.phase >= 2 ? 6 : 4; c.spots.push({ x: S.px, y: S.py }); for (var i = 1; i < n; i++) c.spots.push({ x: AR.x0 + 30 + Math.random() * (AR.x1 - AR.x0 - 60), y: AR.y0 + 30 + Math.random() * (AR.y1 - AR.y0 - 60) }); }
      if (key === 'gift') { c.n = 4; }
      if (key === 'bug') { c.spots = []; for (var j = 0; j < 3; j++) c.spots.push({ x: AR.x0 + 40 + Math.random() * (AR.x1 - AR.x0 - 80), y: AR.y0 + 40 + Math.random() * (AR.y1 - AR.y0 - 80) }); }
      if (key === 'live') { var sx = AR.x0 + 70 + Math.random() * (AR.x1 - AR.x0 - 140), sy = AR.y0 + 70 + Math.random() * (AR.y1 - AR.y0 - 140); c.safe = { x: sx, y: sy, r: 85 }; }
      S.cur = c; say(SAYS[Math.floor(Math.random() * SAYS.length)]);
    }
    function resolveAtk(c) {
      c.done = true;
      if (c.key === 'cam') {
        var dd = dist(S.bx, S.by, S.px, S.py), da = Math.abs(Math.atan2(Math.sin(Math.atan2(S.py - S.by, S.px - S.bx) - c.ang), Math.cos(Math.atan2(S.py - S.by, S.px - S.bx) - c.ang)));
        S.fx.push({ k: 'camflash', x: S.bx, y: S.by, ang: c.ang, life: 0.3, age: 0 });
        if (dd < 520 && da < 0.3) hurt('📸 찍혔어요! 시야 밖으로 피해요');
      } else if (c.key === 'dash') {
        var ex = S.bx + Math.cos(c.ang) * 720, ey = S.by + Math.sin(c.ang) * 720;
        S.dashing = { fx: S.bx, fy: S.by, ex: clamp(ex, AR.x0, AR.x1), ey: clamp(ey, AR.y0, AR.y1), t: 0, ang: c.ang, hit: false };
      } else if (c.key === 'phone') {
        c.spots.forEach(function (sp) { S.fx.push({ k: 'boom', x: sp.x, y: sp.y, r: 62, life: 0.35, age: 0 }); if (dist(sp.x, sp.y, S.px, S.py) < 62 + PLAYER_R * 0.6) hurt('📞 전화 폭탄에 맞았어요!'); });
      } else if (c.key === 'gift') {
        for (var i = 0; i < c.n; i++) S.gifts.push({ x: AR.x0 + 30 + Math.random() * (AR.x1 - AR.x0 - 60), y: AR.y0 + 40 + Math.random() * (AR.y1 - AR.y0 - 80), real: i === 0 && Math.random() < 0.6, life: 7 });
        banner('🎁 선물이 놓였어요! 🎀 리본만 진짜!');
      } else if (c.key === 'squad') {
        var cnt = S.phase >= 3 ? 4 : 3;
        for (var k = 0; k < cnt; k++) S.minions.push({ x: AR.x0 + Math.random() * (AR.x1 - AR.x0), y: AR.y0 + 20, hp: 55 * lvMul, img: Math.floor(Math.random() * FAN_IMGS) });
        banner('🧑‍🤝‍🧑 사생 부대 등장! 졸개를 먼저!'); drawHud();
      } else if (c.key === 'bug') {
        c.spots.forEach(function (sp) { S.slows.push({ x: sp.x, y: sp.y, r: 70, life: 6 }); });
      } else if (c.key === 'live') {
        S.fx.push({ k: 'blastfx', life: 0.4, age: 0 });
        if (dist(c.safe.x, c.safe.y, S.px, S.py) > c.safe.r - 6) hurt('📱 라이브 전체 공격! 안전지대로 들어가요');
      }
    }

    // ── 매 프레임 ──
    var last = performance.now(), raf = 0;
    function step(dt) {
      if (S.over) return;
      S.time -= dt; if (S.time <= 0) { S.time = 0; return end(false); }
      if (S.inv > 0) S.inv -= dt;
      Object.keys(S.cd).forEach(function (k) { if (S.cd[k] > 0) S.cd[k] -= dt; });
      // 이동
      var sp = SPEED * (S.slows.some(function (z) { return dist(z.x, z.y, S.px, S.py) < z.r; }) ? 0.5 : 1);
      if (S.tx != null) {
        var d = dist(S.px, S.py, S.tx, S.ty);
        if (d < 6) { if (!down) { S.tx = null; S.ty = null; } }
        else { var mv = Math.min(d, sp * dt); S.px += (S.tx - S.px) / d * mv; S.py += (S.ty - S.py) / d * mv; }
      }
      S.px = clamp(S.px, AR.x0 + PLAYER_R, AR.x1 - PLAYER_R); S.py = clamp(S.py, AR.y0 + PLAYER_R, AR.y1 - PLAYER_R);
      // 보스
      if (S.stun > 0) S.stun -= dt;
      else {
        if (S.dashing) {
          var D = S.dashing; D.t += dt / 0.28; var u = Math.min(1, D.t);
          S.bx = D.fx + (D.ex - D.fx) * u; S.by = D.fy + (D.ey - D.fy) * u;
          if (!D.hit) { var vx = D.ex - D.fx, vy = D.ey - D.fy, L = Math.hypot(vx, vy) || 1, along = ((S.px - D.fx) * vx + (S.py - D.fy) * vy) / L, perp = Math.abs(((S.px - D.fx) * vy - (S.py - D.fy) * vx) / L); if (perp < 36 + PLAYER_R && along > -20 && along < L * u + 30) { D.hit = true; hurt('🚗 미행 돌진에 치였어요!'); } }
          if (u >= 1) { S.dashing = null; S.idle = 1.2; }
        } else if (S.cur) {
          S.cur.t += dt;
          if (!S.cur.done && S.cur.t >= S.cur.warn) resolveAtk(S.cur);
          if (S.cur.t >= S.cur.warn + (S.cur.key === 'live' ? 0.5 : 0.35) && !S.dashing) { S.cur = null; S.idle = [1.9, 1.5, 1.2, 1.0][S.phase]; }
        } else {
          S.idle -= dt;
          // 보스가 천천히 플레이어 쪽으로 다가옴 (너무 붙진 않음)
          var bd = dist(S.bx, S.by, S.px, S.py); if (bd > 190) { S.bx += (S.px - S.bx) / bd * 26 * dt; S.by += (S.py - S.by) / bd * 26 * dt; }
          if (S.idle <= 0) {
            var pool = PHASE_POOL[S.phase].filter(function (k) { return k !== S.lastAtk && !(k === 'squad' && S.minions.length) && !(k === 'live' && S.cur); });
            if (S.phase === 3 && (S.liveT -= 1) < 0 && pool.indexOf('live') >= 0) { S.liveT = 2; startAtk('live'); }
            else startAtk(pool[Math.floor(Math.random() * pool.length)]);
          }
        }
        S.bx = clamp(S.bx, AR.x0 + BOSS_R, AR.x1 - BOSS_R); S.by = clamp(S.by, AR.y0 + BOSS_R, AR.y1 - BOSS_R);
      }
      // 졸개
      S.minions.forEach(function (m) {
        var md = dist(m.x, m.y, S.px, S.py) || 1, ms = S.phase >= 2 ? 78 : 62;
        m.x += (S.px - m.x) / md * ms * dt; m.y += (S.py - m.y) / md * ms * dt;
        if (md < 16 + PLAYER_R - 4) hurt('사생 졸개에게 붙잡혔어요!');
      });
      // 선물 / 상자
      for (var gi = S.gifts.length - 1; gi >= 0; gi--) {
        var G = S.gifts[gi]; G.life -= dt;
        if (dist(G.x, G.y, S.px, S.py) < 26 + PLAYER_R * 0.5) { S.gifts.splice(gi, 1); if (G.real) { if (S.hearts < HEARTS) { S.hearts++; floatTxt(G.x, G.y, '💗 +1', '#fda4af'); drawHud(); } else floatTxt(G.x, G.y, '진짜 선물!', '#fda4af'); } else { S.fx.push({ k: 'boom', x: G.x, y: G.y, r: 50, life: 0.3, age: 0 }); hurt('🎁 함정 선물이었어요!'); } }
        else if (G.life <= 0) S.gifts.splice(gi, 1);
      }
      for (var bi = S.boxes.length - 1; bi >= 0; bi--) {
        var B = S.boxes[bi]; B.life -= dt;
        if (dist(B.x, B.y, S.px, S.py) < 30) { S.boxes.splice(bi, 1); var l = ExpKit.rollLoot(); S.loot.push(l); floatTxt(B.x, B.y - 10, l.txt || '🎁', '#ffe27a'); try { if (window.pocaSfx && window.pocaSfx.play) window.pocaSfx.play('reward'); } catch (x) {} }
        else if (B.life <= 0) S.boxes.splice(bi, 1);
      }
      for (var si = S.slows.length - 1; si >= 0; si--) { S.slows[si].life -= dt; if (S.slows[si].life <= 0) S.slows.splice(si, 1); }
      for (var fi2 = S.fx.length - 1; fi2 >= 0; fi2--) { S.fx[fi2].age += dt; if (S.fx[fi2].age >= S.fx[fi2].life) S.fx.splice(fi2, 1); }
      if (S.bannerT > 0) S.bannerT -= dt;
      if (S.sayT > 0) { S.sayT -= dt; if (S.sayT <= 0) q('wt-say').textContent = ''; }
      drawHud();
      // 버튼 쿨타임 표시
      Array.prototype.forEach.call(wrap.querySelectorAll('#wt-btns button'), function (b) {
        var id = b.dataset.id, d2 = SKD[id], v = b.querySelector('.cdv'); if (!v || !d2) return;
        var c = S.cd[id] || 0; v.style.height = c > 0 ? Math.min(100, c / (d2.cd * cdMul) * 100) + '%' : '0';
      });
    }

    // ── 그리기 ──
    // 빛나는 이펙트(검은 배경 → 'lighter' 가산 합성) / 아이콘
    function glow(im, x, y, w, h, a, rot) { if (!ok(im)) return false; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.max(0, Math.min(1, a)); g.translate(x, y); if (rot) g.rotate(rot); g.drawImage(im, -w / 2, -h / 2, w, h); g.restore(); return true; }
    function icon(k, x, y, sz, a) { var im = IM['w_' + k]; if (!ok(im)) return false; g.save(); g.globalAlpha = a == null ? 1 : a; g.drawImage(im, x - sz / 2, y - sz / 2, sz, sz); g.restore(); return true; }

    var VP = { sign: ['165,243,252', '#a5f3fc'], photo: ['165,243,252', '#d6f7ff'], shake: ['253,230,138', '#fde68a'], heart: ['255,170,210', '#ffc2dc'], highlight: ['255,222,150', '#ffe9b0'], wink: ['255,170,210', '#ffc2dc'], encore: ['200,160,255', '#dcc8ff'], rose: ['255,110,150', '#ff9fb8'], finale: ['255,236,180', '#fff0c4'] };
    function eo(t) { t = Math.max(0, Math.min(1, t)); return 1 - (1 - t) * (1 - t) * (1 - t); }
    function glint(x, y, r, col, a) {
      if (a <= 0 || r <= 0) return; g.globalAlpha = a; g.fillStyle = col; g.beginPath();
      g.moveTo(x, y - r); g.lineTo(x + r * 0.13, y - r * 0.13); g.lineTo(x + r, y); g.lineTo(x + r * 0.13, y + r * 0.13); g.lineTo(x, y + r); g.lineTo(x - r * 0.13, y + r * 0.13); g.lineTo(x - r, y); g.lineTo(x - r * 0.13, y - r * 0.13); g.closePath(); g.fill();
    }
    function vlayer(name, x, y, R, p, rot, am) {
      var im = IM['v_' + name]; if (!ok(im)) return; var e = eo(p / 0.6), w = R * 2.2 * (0.4 + 0.6 * e);
      var a = (p < 0.1 ? p / 0.1 : Math.pow(Math.max(0, 1 - (p - 0.1) / 0.9), 1.3)) * (am || 1); if (a <= 0) return;
      g.save(); g.translate(x, y); g.rotate(rot * p); g.globalAlpha = Math.min(1, a); g.drawImage(im, -w / 2, -w / 2, w, w); g.restore();
    }
    function skillFx(f, p) {
      var x = f.x, y = f.y, R = Math.min(f.r, 300), id = f.id, pal = VP[id] || VP.sign, i, a, ez = eo(p / 0.6);
      g.save(); g.globalCompositeOperation = 'lighter';
      var gr = g.createRadialGradient(x, y, R * 0.1, x, y, R); gr.addColorStop(0, 'rgba(' + pal[0] + ',0)'); gr.addColorStop(0.7, 'rgba(' + pal[0] + ',' + (0.14 * (1 - p)) + ')'); gr.addColorStop(1, 'rgba(' + pal[0] + ',0)');
      g.globalAlpha = 1; g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
      if (f.aoe) {
        vlayer(id, x, y, R, p, id === 'rose' ? 1.6 : (id === 'wink' ? -0.5 : 0.3), id === 'finale' ? 0.8 : 1);
        if (id === 'finale') vlayer('encore', x, y, R * 0.7, Math.max(0, Math.min(1, (p - 0.22) / 0.78)), -0.9, 0.5);
        if (id === 'encore') vlayer('encore', x, y, R * 0.6, Math.max(0, Math.min(1, (p - 0.2) / 0.8)), 0.5, 0.7);
      } else vlayer('hit', x, y, R * 0.55, p, 0.4, 0.9);
      for (i = 0; i < 2; i++) {
        var pp = Math.max(0, Math.min(1, (p - i * 0.12) / 0.7)); if (pp <= 0 || pp >= 1) continue;
        g.globalAlpha = (1 - pp) * 0.9; g.strokeStyle = pal[1]; g.lineWidth = (i ? 1 : 2.5) * (1 - pp * 0.6) + 0.5; g.shadowColor = 'rgba(' + pal[0] + ',1)'; g.shadowBlur = 10;
        g.beginPath(); g.arc(x, y, R * 0.96 * eo(pp), 0, 7); g.stroke();
      }
      g.shadowBlur = 0;
      var n = id === 'finale' ? 20 : (f.aoe ? 12 : 6);
      for (i = 0; i < n; i++) {
        var h1 = Math.abs(Math.sin(i * 12.9898 + 4.1) * 43758.5453) % 1, h2 = Math.abs(Math.sin(i * 78.233 + 1.7) * 43758.5453) % 1, h3 = Math.abs(Math.sin(i * 39.346 + 9.2) * 43758.5453) % 1;
        a = h1 * 6.2832 + p * (h2 - 0.5) * 1.2; var dd = R * (0.25 + 0.75 * ez) * (0.55 + h3 * 0.5), tw = Math.sin(Math.max(0, Math.min(1, (p - h2 * 0.3) / 0.7)) * 3.1416);
        glint(x + Math.cos(a) * dd, y + Math.sin(a) * dd, 5 + h3 * (id === 'finale' ? 12 : 8), i % 3 ? pal[1] : '#ffffff', tw * 0.9);
      }
      g.restore();
    }
    function drawCone(x, y, ang, half, len, col) { g.beginPath(); g.moveTo(x, y); g.arc(x, y, len, ang - half, ang + half); g.closePath(); g.fillStyle = col; g.fill(); }
    function draw() {
      g.clearRect(0, 0, W, H);
      if (ok(IM.bg)) { g.drawImage(IM.bg, 0, 0, W, H); g.fillStyle = 'rgba(8,4,20,.55)'; g.fillRect(0, 0, W, H); } else { g.fillStyle = '#1c0f3a'; g.fillRect(0, 0, W, H); }
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; g.strokeRect(AR.x0, AR.y0, AR.x1 - AR.x0, AR.y1 - AR.y0);
      // 도청기 장판
      S.slows.forEach(function (z) { if (!glow(IM['w_ring-blue'], z.x, z.y, z.r * 2.15, z.r * 2.15, 0.85, 0)) { g.beginPath(); g.arc(z.x, z.y, z.r, 0, 7); g.fillStyle = 'rgba(56,189,248,.22)'; g.fill(); g.strokeStyle = 'rgba(56,189,248,.8)'; g.setLineDash([6, 5]); g.lineWidth = 2; g.stroke(); g.setLineDash([]); } if (!icon('bug', z.x, z.y, 36)) { g.font = '22px sans-serif'; g.textAlign = 'center'; g.fillText('📡', z.x, z.y + 8); } });
      // 예고 표시
      var c = S.cur;
      if (c && !c.done) {
        var pr = Math.min(1, c.t / c.warn), a = 0.12 + 0.3 * pr, red = 'rgba(239,68,68,' + a + ')';
        var pul = 0.65 + 0.35 * Math.sin(performance.now() / 110), ga = 0.45 + 0.55 * pr;
        if (c.key === 'cam') { drawCone(S.bx, S.by, c.ang, 0.3, 520, 'rgba(239,68,68,' + (0.05 + 0.12 * pr) + ')'); if (!glow(IM.w_fan, S.bx + Math.cos(c.ang) * 260, S.by + Math.sin(c.ang) * 260, 330, 520, ga * pul, c.ang + Math.PI / 2)) drawCone(S.bx, S.by, c.ang, 0.3, 520, red); }
        if (c.key === 'dash') { g.save(); g.translate(S.bx, S.by); g.rotate(c.ang); g.fillStyle = 'rgba(239,68,68,' + (0.05 + 0.12 * pr) + ')'; g.fillRect(0, -36, 720, 72); g.restore(); if (!glow(IM.w_lane, S.bx + Math.cos(c.ang) * 360, S.by + Math.sin(c.ang) * 360, 720, 84, ga * pul, c.ang)) { g.save(); g.translate(S.bx, S.by); g.rotate(c.ang); g.fillStyle = red; g.fillRect(0, -36, 720, 72); g.restore(); } icon('van', S.bx + Math.cos(c.ang) * 90, S.by + Math.sin(c.ang) * 90, 56, 0.9); }
        if (c.key === 'phone') c.spots.forEach(function (sp) { g.beginPath(); g.arc(sp.x, sp.y, 62, 0, 7); g.fillStyle = 'rgba(239,68,68,' + (0.05 + 0.12 * pr) + ')'; g.fill(); if (!glow(IM['w_ring-red'], sp.x, sp.y, 132, 132, ga * pul, 0)) { g.strokeStyle = 'rgba(239,68,68,.9)'; g.lineWidth = 2; g.stroke(); } glow(IM['w_ring-red'], sp.x, sp.y, 132 * (1.25 - 0.25 * pr), 132 * (1.25 - 0.25 * pr), 0.5 * pr, 0); icon('phone', sp.x, sp.y, 44 + 6 * Math.sin(performance.now() / 90)); });
        if (c.key === 'bug') c.spots.forEach(function (sp) { if (!glow(IM['w_ring-blue'], sp.x, sp.y, 150, 150, 0.4 + 0.5 * pr, 0)) { g.beginPath(); g.arc(sp.x, sp.y, 70, 0, 7); g.strokeStyle = 'rgba(56,189,248,.9)'; g.setLineDash([6, 5]); g.lineWidth = 2; g.stroke(); g.setLineDash([]); } icon('bug', sp.x, sp.y, 40); });
        if (c.key === 'live') { g.fillStyle = 'rgba(239,68,68,' + (0.1 + 0.25 * pr) + ')'; g.fillRect(AR.x0, AR.y0, AR.x1 - AR.x0, AR.y1 - AR.y0); if (!glow(IM['w_ring-green'], c.safe.x, c.safe.y, c.safe.r * 2.15, c.safe.r * 2.15, 0.95, 0)) { g.beginPath(); g.arc(c.safe.x, c.safe.y, c.safe.r, 0, 7); g.fillStyle = 'rgba(74,222,128,.35)'; g.fill(); g.strokeStyle = '#4ade80'; g.lineWidth = 3; g.stroke(); } icon('safe', c.safe.x, c.safe.y, 58 + 5 * Math.sin(performance.now() / 150)); }
      }
      // 선물 / 상자
      S.gifts.forEach(function (G) { var bob2 = Math.sin(performance.now() / 200 + G.x) * 2; if (!icon(G.real ? 'gift' : 'trap', G.x, G.y + bob2, 46, G.life < 1.5 ? 0.5 : 1)) { g.font = '28px sans-serif'; g.textAlign = 'center'; g.globalAlpha = G.life < 1.5 ? 0.5 : 1; g.fillText(G.real ? '🎀' : '🎁', G.x, G.y + 10); g.globalAlpha = 1; } });
      S.boxes.forEach(function (B) { var bob = Math.sin(performance.now() / 180) * 3; g.globalAlpha = B.life < 2 ? 0.5 : 1; if (ok(IM.box)) g.drawImage(IM.box, B.x - 18, B.y - 20 + bob, 36, 40); else { g.font = '28px sans-serif'; g.textAlign = 'center'; g.fillText('🎁', B.x, B.y + 10 + bob); } g.globalAlpha = 1; });
      // 졸개
      S.minions.forEach(function (m) { var im = IM.fans[m.img]; if (ok(im)) g.drawImage(im, m.x - 20, m.y - 22, 40, 44); else { g.font = '28px sans-serif'; g.textAlign = 'center'; g.fillText('🧑‍🎤', m.x, m.y + 10); } });
      // 보스
      var shield = S.minions.length > 0;
      g.save(); g.shadowColor = shield ? '#38bdf8' : '#f472b6'; g.shadowBlur = 22;
      if (ok(IM.boss)) g.drawImage(IM.boss, S.bx - BOSS_R - 8, S.by - BOSS_R - 8, (BOSS_R + 8) * 2, (BOSS_R + 8) * 2); else { g.font = '70px sans-serif'; g.textAlign = 'center'; g.fillText('🕵️', S.bx, S.by + 22); }
      g.restore();
      if (S.stun > 0) { g.font = '26px sans-serif'; g.textAlign = 'center'; g.fillText('💫', S.bx, S.by - BOSS_R - 22); }
      // 기술 이름 + 시전 바 (머리 위)
      if (c && !c.done) {
        var tw = 150, bx0 = S.bx - tw / 2, by0 = S.by - BOSS_R - 38;
        g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(bx0 - 6, by0 - 20, tw + 12, 36);
        var nm = c.name.replace(/^\S+\s/, ''), ik = ({ cam: 'cam', dash: 'van', phone: 'phone', gift: 'trap', bug: 'bug', live: 'live' })[c.key], hasIk = ik && ok(IM['w_' + ik]); g.font = '900 13px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; if (hasIk) { g.fillText(nm, S.bx + 12, by0 - 5); icon(ik, S.bx - g.measureText(nm).width / 2 - 8, by0 - 11, 28); } else g.fillText(c.name, S.bx, by0 - 5);
        g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(bx0, by0 + 3, tw, 7); g.fillStyle = '#f87171'; g.fillRect(bx0, by0 + 3, tw * Math.min(1, c.t / c.warn), 7);
      }
      // 플레이어
      var blink = S.inv > 0 && Math.floor(S.inv * 12) % 2 === 0;
      g.save(); g.globalAlpha = blink ? 0.4 : 1;
      g.beginPath(); g.arc(S.px, S.py, PLAYER_R + 3, 0, 7); g.fillStyle = '#fff'; g.fill();
      g.beginPath(); g.arc(S.px, S.py, PLAYER_R, 0, 7); g.save(); g.clip();
      if (ok(IM.face)) g.drawImage(IM.face, S.px - PLAYER_R, S.py - PLAYER_R, PLAYER_R * 2, PLAYER_R * 2); else { g.fillStyle = '#c084fc'; g.fillRect(S.px - PLAYER_R, S.py - PLAYER_R, PLAYER_R * 2, PLAYER_R * 2); }
      g.restore(); g.restore();
      if (S.tx != null) { g.beginPath(); g.arc(S.tx, S.ty, 6, 0, 7); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.stroke(); }
      // 이펙트
      S.fx.forEach(function (f) {
        var p = f.age / f.life;
        if (f.k === 'skfx') skillFx(f, p);
        else if (f.k === 'ring') { g.beginPath(); g.arc(f.x, f.y, f.r * (0.4 + 0.6 * p), 0, 7); g.strokeStyle = f.col; g.globalAlpha = 1 - p; g.lineWidth = 4; g.stroke(); g.globalAlpha = 1; }
        else if (f.k === 'boom' && glow(IM.w_burst, f.x, f.y, f.r * 2.4 * (0.6 + 0.6 * p), f.r * 2.4 * (0.6 + 0.6 * p), 1 - p, 0)) { }
        else if (f.k === 'boom') { g.beginPath(); g.arc(f.x, f.y, f.r * (0.6 + 0.6 * p), 0, 7); g.fillStyle = 'rgba(251,191,36,' + (0.7 * (1 - p)) + ')'; g.fill(); }
        else if (f.k === 'camflash') { drawCone(f.x, f.y, f.ang, 0.3, 520, 'rgba(255,255,255,' + (0.8 * (1 - p)) + ')'); }
        else if (f.k === 'blastfx') { g.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - p)) + ')'; g.fillRect(0, 0, W, H); }
        else if (f.k === 'txt') { g.font = '900 16px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.fillStyle = f.col; g.globalAlpha = 1 - p; g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeText(f.t, f.x, f.y - 34 * p); g.fillText(f.t, f.x, f.y - 34 * p); g.globalAlpha = 1; }
      });
      if (S.bannerT > 0) { g.font = '900 20px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.globalAlpha = Math.min(1, S.bannerT); g.strokeStyle = '#000'; g.lineWidth = 4; g.strokeText(S.banner, W / 2, H * 0.42); g.fillStyle = '#ffe27a'; g.fillText(S.banner, W / 2, H * 0.42); g.globalAlpha = 1; }
    }
    function loop(now) {
      if (!root.isConnected) { cancelAnimationFrame(raf); return; }
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      try { step(dt); draw(); } catch (e) { console.error('[worldtour]', e); }
      if (!S.over) raf = requestAnimationFrame(loop);
    }

    function end(win) {
      if (S.over) return; S.over = true; cancelAnimationFrame(raf);
      var done = 1 - S.hp / BOSS_HP, items = [], stone = 0, wish = 0, coin, exp;
      if (win) {
        coin = WIN_COIN; exp = WIN_EXP;
        var pc = 0; if (Math.random() < PIECE_CHANCE) { pc = 1; if (Math.random() < PIECE_BONUS) pc = 2; }
        if (pc) items.push({ emoji: '🖼️', name: '프리미엄 조각', cat: 'piece', qty: pc, desc: '프리미엄 카드 조각 · 100개를 모으면 프리미엄 카드 1장' });
        wish = WISH_WIN + (Math.random() < WISH_BONUS ? 1 : 0);
        stone = STONE_WIN + (Math.random() < STONE_BONUS ? 1 : 0);
        items.push({ emoji: '🔹', name: '재조합석', cat: 'material', qty: RECOMB_N, desc: '카드 재조합에 필요한 재료' });
        items.push({ emoji: '🔶', name: '공방의 원석', cat: 'material', qty: ONGSTONE_N, desc: '굿즈 공방 제작 재료 · 탐험·원정에서 나와요' });
        if (Math.random() < EPIC_STONE_CHANCE) items.push({ emoji: '💠', name: '에픽 재조합석', cat: 'material', qty: 1, desc: 'SSR/UR 카드 재조합에 필요한 재료' });
      } else {
        coin = Math.round(WIN_COIN * done * LOSE_RATE); exp = Math.round(WIN_EXP * done * LOSE_RATE);
        if (done >= 0.3) { wish = 1; items.push({ emoji: '🔹', name: '재조합석', cat: 'material', qty: 1, desc: '카드 재조합에 필요한 재료' }); }   // 위로 보상
        if (done >= 0.6) { stone = 1; wish = 2; }
      }
      setTimeout(function () {
        wrap.remove();
        ctx.finish(ExpKit.mergeLoot({
          win: win, title: win ? '사생팬 격퇴 대성공!' : '다음엔 꼭!', coin: coin, exp: exp, items: items, stone: stone, wish: wish,
          summary: (win ? '남은 하트 ' + S.hearts + ' · 스킬 ' + S.uses + '번 · 졸개 ' + S.kills + '명 정리' : '사생팬을 ' + Math.round(done * 100) + '%쯤 쫓아냈어요 (스킬 ' + S.uses + '번)') + '<br>🎁 주운 상자 ' + S.loot.length + '개'
        }, S.loot));
      }, 700);
    }
    drawHud();
    raf = requestAnimationFrame(loop);
    window.__wtTest = { S: S, step: step, draw: draw, useSkill: useSkill, end: end, startAtk: startAtk, avail: avail, ATK: ATK, resolveAtk: resolveAtk };
  }

  function reg() {
    if (!window.ExpKit) { setTimeout(reg, 100); return; }
    window.ExpKit.register({
      id: 'world_tour', bg: 'special-world_tour.jpg', name: '월드투어 스타디움', emoji: '🏟️', color: '#f472b6', needLevel: NEED_LEVEL, stamina: STAMINA, daily: DAILY,
      tagline: '월드투어에 사생팬이 쫓아왔어요! 소원의 조각·강화석·재조합석', gearChance: 0.45, gearMin: 'great',
      intro: ['월드투어 무대까지 <b>사생팬이 쫓아왔어요</b>! 화면을 <b>누르거나 끌면</b> 멤버가 걸어가요. 아래 <b>스킬 버튼</b>으로 사생팬을 쫓아내요 (사거리 안에서만 먹혀요).', '사생팬은 머리 위에 <b>기술 이름</b>이 뜨고, 바닥에 <b>붉은 예고</b>가 떠요. 맞기 전에 피하세요! ❤️는 5개예요. 📸 몰카(부채꼴) · 🚗 돌진(일직선) · 📞 전화 폭탄(원) · 🎁 수상한 선물(🎀 리본만 진짜)', '체력이 줄면 <b>페이즈</b>가 바뀌고 🧑‍🤝‍🧑 사생 부대(졸개를 먼저 안 잡으면 사생팬 피해 30%), 📡 도청기, 마지막엔 📱 <b>라이브 광폭화</b>(초록 안전지대로 대피!)가 나와요. 제한시간 150초.', '스킬은 <b>그 멤버가 배운 스킬</b>만 써요 (🔒는 스킬 상점에서 배우면 열려요). 광역 스킬일수록 사거리와 위력이 커요. 🎆 불꽃쇼는 사생팬을 2초 멈추게시켜요!', '졸개를 쓰러뜨리면 가끔 🎁 <b>상자</b>가 떨어져요 → 걸어가서 주워요. 사생팬을 쫓아내면 🧩 <b>소원의 조각</b>, 🔨 <b>강화석</b>, 🔹 <b>재조합석</b>, 🔶 <b>원석</b>, <b>프리미엄 조각</b>, 가끔 💠 <b>에픽 재조합석</b>!'],
      play: play
    });
  }
  reg();
})();
