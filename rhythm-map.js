// ════════════════════════════════════════════════════════════
// 🎧 음악방송 리허설장 (rhythm-map.js) — 팬덤 원정 · 플레이어 Lv.25
// 기획사의 "음방 무대"(music-stage.js) 업그레이드판.
//  1) 패턴 따라 치기: 6칸 악기 패드가 깜빡이는 순서를 보고 똑같이 터치. 5라운드 (2칸 → 3 → 4 → 5 → 6칸), 라운드마다 점점 빨라져요.
//     틀리면 하트가 깎이고 같은 패턴을 다시 보여줘요. 하트가 0이면 거기서 끝.
//  2) 퍼펙트 게이지: 움직이는 바를 가운데 구간에서 멈추기.
//  · 라운드를 깰 때마다 팬이 🎁 응원 상자를 떨어뜨려요 (눌러서 줍기).
//  · 결과 점수 = 라운드 클리어 수(0~5) + 게이지(없음 0 / 굿 +1 / 퍼펙트 +2) → 랭크 S·A·B·C
// 보상: 작곡 재료(🎸🥁🎹🎤 · 음표 · 악보 …) + 🔹재조합석 + 🎞️필름 + 코인 + 카드 경험치. 랭크가 높을수록 많아요.
// ✏️ 값 바꾸는 곳: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // ── 설정 ──
  var NEED_LEVEL = 25;        // 열리는 플레이어 레벨
  var STAMINA = 90;           // 입장 스태미나
  var DAILY = 5;              // 하루 보상 100% 횟수 (넘으면 30%)
  var ROUNDS = [2, 3, 4, 5, 6];   // 라운드별 패턴 길이
  var FLASH = 750, SPEEDUP = 0.96, GAP = 170;   // 깜빡임 길이(ms) / 라운드마다 ×빨라짐 / 깜빡임 사이 쉬는 시간
  var HEARTS = 5;             // 하트 수 (틀리면 1개 깎임)
  var PERFECT_ZONE = 9, GOOD_ZONE = 24;        // 게이지 가운데 ±% (퍼펙트 / 굿)
  var GAUGE_MS = 2000;        // 게이지 바가 한 번 왕복하는 시간
  var BOX_CHANCE = 0.75;      // 라운드를 깰 때 팬이 상자를 떨어뜨릴 확률
  var COIN = { S: 140000, A: 105000, B: 72000, C: 36000 };
  var EXP = { S: 2000, A: 1450, B: 950, C: 460 };
  var MATS_N = { S: 15, A: 12, B: 8, C: 4 };   // 작곡 재료 개수
  var STONE_N = { S: 5, A: 3, B: 2, C: 1 }, FILM_N = { S: 6, A: 4, B: 3, C: 2 };   // 재조합석 / 필름
  var PADS = [                // 악기 패드 6개 (재료 그림 이름 / 색)
    { n: '기타', e: '🎸', c: '#f59e0b' }, { n: '드럼', e: '🥁', c: '#ef4444' }, { n: '피아노', e: '🎹', c: '#38bdf8' },
    { n: '마이크', e: '🎤', c: '#a78bfa' }, { n: '색소폰', e: '🎷', c: '#22c55e' }, { n: '스트링', e: '🎻', c: '#fb923c' }
  ];
  var FONT = "font-family:'Noto Sans KR',sans-serif;";

  function rollKinds(n, luck) {
    var K = window.STUDIO_KINDS || [], out = {};
    if (!K.length) return [];
    var total = 0; K.forEach(function (k) { total += k.weight * (k.rare ? 1 + luck : 1); });
    for (var i = 0; i < n; i++) {
      var r = Math.random() * total, pick = K[0];
      for (var j = 0; j < K.length; j++) { var w = K[j].weight * (K[j].rare ? 1 + luck : 1); if (r < w) { pick = K[j]; break; } r -= w; }
      out[pick.id] = (out[pick.id] || 0) + 1;
    }
    return Object.keys(out).map(function (id) { var k = K.filter(function (x) { return x.id === id; })[0]; return { emoji: k.emoji, name: k.name, cat: 'material', qty: out[id], desc: k.desc || '' }; });
  }
  function extraItems(g) {
    var out = [], st = STONE_N[g] >= 1 ? STONE_N[g] : (Math.random() < STONE_N[g] ? 1 : 0), fl = FILM_N[g];
    if (st > 0) out.push({ emoji: '🔹', name: '재조합석', cat: 'material', qty: st, desc: '카드 재조합에 필요한 재료' });
    if (fl > 0) out.push({ emoji: '🎞️', name: '필름', cat: 'film', qty: fl, desc: '시크릿 포토랩 현상 재료' });
    return out;
  }
  function padIcon(p, px) {
    try { if (window.matIcon) { var h = window.matIcon(p.n, px, p.e); if (h) return h; } } catch (e) {}
    return '<span style="font-size:' + Math.round(px * 0.8) + 'px;">' + p.e + '</span>';
  }
  function sfx(n) { try { if (window.pocaSfx && window.pocaSfx.play) window.pocaSfx.play(n || 'pick'); } catch (e) {} }

  function play(ctx) {
    var root = ctx.root;
    function gfs(k) { try { return window.FanGear ? window.FanGear.sum(ctx.charId, k) : 0; } catch (e) { return 0; } }   // 🎀 소품 효과
    var PZ = PERFECT_ZONE * (1 + gfs('reach') / 100), GZ = Math.min(45, GOOD_ZONE * (1 + gfs('reach') / 100)), GMS = GAUGE_MS * (1 + gfs('cd') / 100);   // 🎀 사거리 = 게이지 구간 넓힘 / 쿨타임 = 게이지 느리게
    var S = { forgive: gfs('forgive'), round: 0, cleared: 0, hearts: HEARTS, seq: [], idx: 0, accept: false, over: false, loot: [], gauge: 0, gaugeBonus: 0, timers: [] };
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;background:radial-gradient(circle at 50% 0%,#3b1d6e,#0b0716 70%);overflow:hidden;' + FONT;
    wrap.innerHTML =
      '<style>@keyframes rhFall{0%{transform:translateY(-60px);opacity:0}100%{transform:translateY(0);opacity:1}}@keyframes rhUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-40px)}}@keyframes rhShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}</style>' +
      '<div style="width:100%;box-sizing:border-box;padding:14px 16px 6px;display:flex;justify-content:space-between;align-items:center;color:#fff;font-weight:900;font-size:15px;"><span>🎧 리허설</span><span id="rh-hearts" style="font-size:16px;"></span></div>' +
      '<div style="width:100%;box-sizing:border-box;padding:0 16px;display:flex;gap:6px;" id="rh-steps"></div>' +
      '<div id="rh-say" style="margin:14px 0 10px;font-size:15px;font-weight:900;color:#ffd76a;min-height:22px;text-align:center;"></div>' +
      '<div id="rh-pads" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:88%;max-width:320px;"></div>' +
      '<div id="rh-gauge" style="display:none;width:88%;max-width:320px;margin-top:18px;text-align:center;">' +
        '<div style="position:relative;height:30px;border-radius:15px;background:rgba(255,255,255,.14);overflow:hidden;border:2px solid #fff;">' +
          '<div style="position:absolute;top:0;bottom:0;left:' + (50 - GZ) + '%;width:' + (GZ * 2) + '%;background:rgba(110,231,183,.45);"></div>' +
          '<div style="position:absolute;top:0;bottom:0;left:' + (50 - PZ) + '%;width:' + (PZ * 2) + '%;background:#ffd76a;"></div>' +
          '<div id="rh-needle" style="position:absolute;top:-2px;bottom:-2px;width:6px;margin-left:-3px;background:#fff;border-radius:3px;box-shadow:0 0 8px #fff;left:0;"></div></div>' +
        '<button id="rh-stop" style="margin-top:14px;width:100%;padding:15px;border:none;border-radius:14px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;font-size:17px;font-weight:900;cursor:pointer;' + FONT + '">🎤 지금!</button></div>' +
      '<div style="flex:1;"></div>';
    root.appendChild(wrap);
    var q = function (id) { return wrap.querySelector('#' + id); };
    function drawHud() {
      var h = ''; for (var i = 0; i < HEARTS; i++) h += i < S.hearts ? '❤️' : '🖤';
      q('rh-hearts').innerHTML = h;
      q('rh-steps').innerHTML = ROUNDS.map(function (len, i) {
        var done = i < S.cleared, cur = i === S.round && !S.over;
        return '<div style="flex:1;text-align:center;padding:5px 0;border-radius:9px;font-size:11px;font-weight:900;color:#fff;background:' + (done ? '#16a34a' : cur ? '#7c3aed' : 'rgba(255,255,255,.12)') + ';">' + (done ? '✔' : (i + 1) + '라운드') + '</div>';
      }).join('');
    }
    var padEls = [];
    PADS.forEach(function (p, i) {
      var b = document.createElement('button');
      b.style.cssText = 'aspect-ratio:1/1;border-radius:20px;border:3px solid rgba(255,255,255,.55);background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;transition:transform .08s,background .08s,box-shadow .08s;-webkit-tap-highlight-color:transparent;';
      b.innerHTML = '<span style="pointer-events:none;display:flex;">' + padIcon(p, 52) + '</span>';
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); tap(i); });
      q('rh-pads').appendChild(b); padEls.push(b);
    });
    function light(i, on) {
      var b = padEls[i], p = PADS[i];
      b.style.background = on ? p.c : 'rgba(255,255,255,.1)';
      b.style.borderColor = on ? '#fff' : 'rgba(255,255,255,.55)';
      b.style.boxShadow = on ? '0 0 22px ' + p.c : 'none';
      b.style.transform = on ? 'scale(1.1)' : 'scale(1)';
    }
    function later(fn, ms) { var t = setTimeout(function () { if (root.isConnected && !S.over) fn(); }, ms); S.timers.push(t); }
    function show() {
      S.accept = false; S.idx = 0;
      var len = ROUNDS[S.round], flash = FLASH * Math.pow(SPEEDUP, S.round);
      S.seq = []; var last = -1;
      for (var i = 0; i < len; i++) { var k; do { k = Math.floor(Math.random() * PADS.length); } while (k === last && Math.random() < 0.7); S.seq.push(k); last = k; }
      q('rh-say').textContent = '👀 잘 봐요! (' + len + '칸)';
      drawHud();
      var t = 700;
      S.seq.forEach(function (k) {
        later(function () { light(k, true); sfx(); }, t); later(function () { light(k, false); }, t + flash);
        t += flash + GAP;
      });
      later(function () { S.accept = true; q('rh-say').textContent = '🎵 따라 해요!'; }, t);
    }
    function tap(i) {
      if (S.over || !S.accept) return;
      light(i, true); setTimeout(function () { light(i, false); }, 120); sfx();
      if (S.seq[S.idx] !== i) {
        if (S.forgive > 0) { S.forgive--; q('rh-say').textContent = '🎀 소품이 실수를 막아줬어요! 다시 눌러요'; return; }   // 🎀 실수 방지 소품
        S.accept = false; S.hearts--;
        wrap.style.animation = 'none'; void wrap.offsetWidth; wrap.style.animation = 'rhShake .3s';
        q('rh-say').textContent = '앗! 틀렸어요 (하트 -1)';
        drawHud();
        if (S.hearts <= 0) { later(finish, 700); return; }
        later(show, 900); return;
      }
      S.idx++;
      if (S.idx >= S.seq.length) {
        S.accept = false; S.cleared++; S.round++;
        q('rh-say').textContent = '✨ 성공! 팬들이 열광해요';
        drawHud();
        if (Math.random() < Math.min(1, BOX_CHANCE * (window.FanGear ? window.FanGear.mult(ctx.charId, 'box') : 1))) later(dropBox, 250);   // 🎀 소품: 상자 확률
        if (S.round >= ROUNDS.length) later(startGauge, 1300); else later(show, 1300);
      }
    }
    // 🎁 팬이 만족하면 응원 상자를 떨어뜨려요 (눌러서 줍기)
    function dropBox() {
      var d = document.createElement('div');
      var side = Math.random() < 0.5 ? 0 : 1, x = side ? 78 + Math.random() * 8 : 6 + Math.random() * 8;
      d.style.cssText = 'position:absolute;top:180px;left:' + x + '%;width:56px;height:64px;z-index:8;cursor:pointer;text-align:center;animation:rhFall .55s ease-in;';
      d.innerHTML = ExpKit.boxImgHtml(52);
      wrap.appendChild(d);
      var gone = setTimeout(function () { d.remove(); }, 5200);
      d.addEventListener('pointerdown', function (e) {
        e.preventDefault(); if (d.__got) return; d.__got = true; clearTimeout(gone);
        var l = ExpKit.rollLoot(); S.loot.push(l);
        d.innerHTML = '<div style="font-size:11px;font-weight:900;color:#ffe27a;text-shadow:0 1px 4px #000;white-space:nowrap;margin-left:-26px;animation:rhUp .9s ease-out forwards;">' + l.txt + '</div>';
        setTimeout(function () { d.remove(); }, 900);
        sfx('reward');
      });
    }
    // 퍼펙트 게이지 (마지막): 움직이는 바를 가운데에서 멈추기
    var gaugeRaf = 0, gT0 = 0, gDone = false;
    function startGauge() {
      q('rh-pads').style.display = 'none'; q('rh-gauge').style.display = 'block';
      q('rh-say').textContent = '🎤 마지막 고음! 가운데에서 멈춰요!';
      gT0 = performance.now(); gDone = false;
      (function loop(now) {
        if (!root.isConnected || S.over || gDone) return;
        var ph = ((now - gT0) % GMS) / GMS, pos = ph < 0.5 ? ph * 2 : 2 - ph * 2;   // 0~1~0
        S.gauge = pos * 100; q('rh-needle').style.left = S.gauge + '%';
        gaugeRaf = requestAnimationFrame(loop);
      })(performance.now());
      q('rh-stop').onclick = function () {
        if (gDone) return; gDone = true; cancelAnimationFrame(gaugeRaf);
        var off = Math.abs(S.gauge - 50), bonus = off <= PZ ? 2 : off <= GZ ? 1 : 0;
        S.gaugeBonus = bonus; S.gaugeDone = true;
        q('rh-say').textContent = bonus === 2 ? '🌟 PERFECT!' : bonus === 1 ? '👍 GOOD!' : '아쉬워요…';
        later(finish, 1100);
      };
    }
    function finish() {
      if (S.over) return; S.over = true; S.timers.forEach(clearTimeout); cancelAnimationFrame(gaugeRaf);
      var pts = S.cleared + (S.gaugeBonus || 0);
      var g = pts >= 7 ? 'S' : pts >= 6 ? 'A' : pts >= 4 ? 'B' : 'C';
      var luck = g === 'S' ? 0.6 : g === 'A' ? 0.3 : 0;
      var gtxt = !S.gaugeDone ? '-' : S.gaugeBonus === 2 ? 'PERFECT' : S.gaugeBonus === 1 ? 'GOOD' : '실패';
      wrap.remove();
      ctx.finish(ExpKit.mergeLoot({
        win: g !== 'C', title: '랭크 ' + g, coin: COIN[g], exp: EXP[g], items: rollKinds(MATS_N[g], luck).concat(extraItems(g)),
        summary: '라운드 ' + S.cleared + '/' + ROUNDS.length + ' 클리어 · 게이지 ' + gtxt + '<br>남은 하트 ' + S.hearts + ' · 🎁 주운 상자 ' + S.loot.length + '개'
      }, S.loot));
    }
    drawHud(); q('rh-say').textContent = '준비…'; later(show, 600);
    window.__rhythmTest = { S: S, tap: tap, padEls: padEls, finish: finish, startGauge: startGauge, ROUNDS: ROUNDS };
  }

  function reg() {
    if (!window.ExpKit) { setTimeout(reg, 100); return; }
    window.ExpKit.register({
      id: 'rhythm_stage', bg: 'special-rhythm_stage.jpg', name: '음악방송 리허설장', emoji: '🎧', color: '#a78bfa', needLevel: NEED_LEVEL, stamina: STAMINA, daily: DAILY,
      tagline: '악기 패턴 따라 치기! 작곡 재료·재조합석·필름', gearChance: 0.25,
      intro: ['악기 패드가 <b>깜빡이는 순서</b>를 잘 보고, 똑같이 눌러요. 5라운드 (2칸 → 6칸), 갈수록 빨라져요!', '틀리면 ❤️가 깎이고 같은 패턴을 다시 보여줘요. ❤️가 0이면 거기서 끝.', '5라운드를 다 깨면 마지막 <b>퍼펙트 게이지</b>! 가운데에서 멈추면 보너스.', '라운드를 깰 때마다 팬이 🎁 <b>응원 상자</b>를 떨어뜨려요. 눌러서 주워요!', '점수가 높으면 랭크 S·A·B·C. 랭크가 높을수록 🎼 <b>작곡 재료</b>, 🔹 <b>재조합석</b>, 🎞️ <b>필름</b>이 많이 나와요.'],
      play: play
    });
  }
  reg();
})();
