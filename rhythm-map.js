// ════════════════════════════════════════════════════════════
// 🎧 음악방송 리허설장 (rhythm-map.js) — 팬덤 원정 · 플레이어 Lv.25
// 음악방송 오디션 무대(music-audition.js)와 같은 방식으로 직접 플레이한다.
//  1) 화살표 따라 누르기: 나오는 화살표(↑↓←→) 순서대로 제한시간 안에 톡 누르거나 화면을 그 방향으로 밀기. 5스테이지 (4개 → 8개)
//  2) 포즈 게이지: 화살표를 다 누르면 움직이는 바가 가운데에 올 때 포즈! (퍼펙트 / 쿨 / 굿 / 배드)
//  · 스테이지를 성공하면 팬이 🎁 응원 상자를 떨어뜨려요 (눌러서 줍기).
//  · 결과 점수 → 랭크 S(85점↑) · A(70점↑) · B(50점↑) · C
// 🎀 소품: 사거리 = 포즈 구간 넓힘 / 쿨타임 = 게이지 느리게 / 실수 방지 = 틀려도 한 번 봐줌 / 상자 확률
// 보상: 작곡 재료(🎸🥁🎹🎤 · 음표 · 악보 …) + 🔹재조합석 + 🎞️필름 + 코인 + 카드 경험치. 랭크가 높을수록 많아요.
// ✏️ 값 바꾸는 곳: 아래 [설정] / 오디션 난이도는 music-audition.js
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // ── 설정 ──
  var NEED_LEVEL = 25;        // 열리는 플레이어 레벨
  var STAMINA = 90;           // 입장 스태미나
  var DAILY = 5;              // 하루 보상 100% 횟수 (넘으면 30%)
  var BOX_CHANCE = 0.75;      // 스테이지를 성공할 때 팬이 상자를 떨어뜨릴 확률
  var RANK = [['S', 0.85], ['A', 0.70], ['B', 0.50]];   // 점수(0~1) 이상이면 해당 랭크, 못 넘으면 C
  var COIN = { S: 280000, A: 210000, B: 144000, C: 72000 };
  var EXP = { S: 4000, A: 2900, B: 1900, C: 920 };
  var MATS_N = { S: 30, A: 24, B: 16, C: 8 };   // 작곡 재료 개수
  var STONE_N = { S: 10, A: 6, B: 4, C: 2 }, FILM_N = { S: 12, A: 8, B: 6, C: 4 };   // 재조합석 / 필름
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
  function sfx(n) { try { if (window.pocaSfx && window.pocaSfx.play) window.pocaSfx.play(n || 'pick'); } catch (e) {} }

  function play(ctx) {
    function gfs(k) { try { return window.FanGear ? window.FanGear.sum(ctx.charId, k) : 0; } catch (e) { return 0; } }   // 🎀 소품 효과
    var loot = [], over = false;
    // 🎁 팬이 만족하면 응원 상자를 떨어뜨려요 (눌러서 줍기) — 오디션 화면 위에 띄움
    function dropBox(ov) {
      var d = document.createElement('div');
      var side = Math.random() < 0.5 ? 0 : 1, x = side ? 78 + Math.random() * 8 : 6 + Math.random() * 8;
      d.style.cssText = 'position:absolute;top:150px;left:' + x + '%;width:56px;height:64px;z-index:8;cursor:pointer;text-align:center;animation:rhFall .55s ease-in;';
      d.innerHTML = '<style>@keyframes rhFall{0%{transform:translateY(-60px);opacity:0}100%{transform:translateY(0);opacity:1}}@keyframes rhUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-40px)}}</style>' + ExpKit.boxImgHtml(52);
      ov.appendChild(d);
      var gone = setTimeout(function () { d.remove(); }, 5200);
      d.addEventListener('pointerdown', function (e) {
        e.preventDefault(); e.stopPropagation(); if (d.__got) return; d.__got = true; clearTimeout(gone);
        var l = ExpKit.rollLoot(); loot.push(l);
        d.innerHTML = '<div style="font-size:11px;font-weight:900;color:#ffe27a;text-shadow:0 1px 4px #000;white-space:nowrap;margin-left:-26px;animation:rhUp .9s ease-out forwards;">' + l.txt + '</div>';
        setTimeout(function () { d.remove(); }, 900);
        sfx('reward');
      });
    }
    function open() {
      if (typeof window.openAuditionShow !== 'function') { ctx.exit(); return; }
      window.openAuditionShow({
        cid: ctx.charId, embed: true, title: '🎧 음악방송 리허설장',
        poseMul: 1 + gfs('reach') / 100, gaugeMul: 1 / (1 + gfs('cd') / 100), forgive: gfs('forgive'),   // 🎀 소품: 사거리 = 포즈 구간 넓힘 / 쿨타임 = 게이지 느리게 / 실수 방지
        onStage: function (ov, ok) {
          if (!ok) return;
          if (Math.random() < Math.min(1, BOX_CHANCE * (window.FanGear ? window.FanGear.mult(ctx.charId, 'box') : 1))) setTimeout(function () { if (ov.isConnected) dropBox(ov); }, 250);   // 🎀 소품: 상자 확률
        },
        onCancel: function () { ctx.exit(); }
      }, function (perf, info) {
        if (over) return; over = true;
        var g = 'C'; for (var i = 0; i < RANK.length; i++) if (perf >= RANK[i][1]) { g = RANK[i][0]; break; }
        var luck = g === 'S' ? 0.6 : g === 'A' ? 0.3 : 0, pct = Math.round(perf * 100);
        ctx.finish(ExpKit.mergeLoot({
          win: g !== 'C', title: '랭크 ' + g, coin: COIN[g], exp: EXP[g], items: rollKinds(MATS_N[g], luck).concat(extraItems(g)),
          summary: '점수 ' + pct + '점 · 스테이지 ' + info.cleared + '/' + info.stages + ' 성공<br>최고 콤보 ' + info.bestCombo + ' · 🎁 주운 상자 ' + loot.length + '개'
        }, loot));
      });
    }
    open();
    window.__rhythmTest = { open: open };
  }

  function reg() {
    if (!window.ExpKit) { setTimeout(reg, 100); return; }
    window.ExpKit.register({
      id: 'rhythm_stage', bg: 'special-rhythm_stage.jpg', name: '음악방송 리허설장', emoji: '🎧', color: '#a78bfa', needLevel: NEED_LEVEL, stamina: STAMINA, daily: DAILY,
      tagline: '오디션 무대처럼 직접 플레이! 작곡 재료·재조합석·필름', gearChance: 0.25,
      intro: ['화면에 나온 <b>화살표 순서대로</b> 제한시간 안에 눌러요. 아래 패드를 톡 누르거나 <b>화면을 그 방향으로 밀어도</b> 돼요!', '화살표를 다 누르면 <b>포즈 게이지</b>! 바가 가운데에 올 때 포즈를 잡으면 퍼펙트. 5스테이지, 갈수록 화살표가 늘어나요.', '스테이지를 성공할 때마다 팬이 🎁 <b>응원 상자</b>를 떨어뜨려요. 눌러서 주워요!', '점수가 높으면 랭크 S·A·B·C. 랭크가 높을수록 🎼 <b>작곡 재료</b>, 🔹 <b>재조합석</b>, 🎞️ <b>필름</b>이 많이 나와요.'],
      play: play
    });
  }
  reg();
})();
