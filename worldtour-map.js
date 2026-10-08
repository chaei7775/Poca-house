// ════════════════════════════════════════════════════════════
// 🏟️ 월드투어 스타디움 (worldtour-map.js) — 팬덤 원정 · 플레이어 Lv.35
// 마지막 공연장에 몰려온 대형 팬덤! 대표 팬(보스)이 외치는 "스킬 순서"를 그대로 눌러서 응대해요.
//  · 보스 머리 위에 스킬 아이콘 줄이 떠요. 시간 안에 같은 순서로 아래 버튼을 눌러요.
//  · 성공하면 보스 게이지가 깎여요 (연속 성공할수록 큰 데미지). 틀리거나 시간이 끝나면 하트가 깎여요.
//  · 쓸 수 있는 스킬은 플레이어 레벨로 정해져요: 🎤(Lv.20) 💖(25) ✨(30) 🌹(35) 🎆(40)
//  · 단계가 올라갈수록 줄이 길어지고 시간이 짧아져요 (3개 → 4개 → 5개)
// 보상: 🧩 소원의 조각 · 🔨 강화석 · 🔹 재조합석 · 🔶 공방의 원석 · 🖼️ 프리미엄 조각 · 코인 · 카드 경험치
// ✏️ 값 바꾸는 곳: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // ── 설정 ──
  var NEED_LEVEL = 35;       // 열리는 플레이어 레벨
  var STAMINA = 150;         // 입장 스태미나
  var DAILY = 3;             // 하루 보상 100% 횟수
  var BOSS_HP = 900;         // 보스 체력
  var HEARTS = 4;            // 내 하트
  var BASE_DMG = 60;         // 한 줄 성공 기본 데미지
  var COMBO_BONUS = 0.18;    // 연속 성공 1회당 데미지 증가
  var LV_DMG = 0.02;         // 플레이어 레벨 1당 데미지 증가 (Lv.35 기준)
  var PHASES = [ { len: 4, sec: 6, show: 9 }, { len: 5, sec: 5, show: 3 }, { len: 6, sec: 4.5, show: 2 } ];   // 보스 체력 1/3 구간마다 바뀜 (len=팬 수, sec=제한시간, show=미리 보이는 팬 수)
  var WIN_COIN = 120000, WIN_EXP = 1900;
  var PIECE_CHANCE = 0.75, PIECE_BONUS = 0.3;   // 프리미엄 조각
  var WISH_WIN = 2, WISH_BONUS = 0.5;            // 소원의 조각 (기본 개수, 한 개 더 줄 확률)
  var STONE_WIN = 1, STONE_BONUS = 0.5;           // 강화석 (기본 개수, 한 개 더 줄 확률)
  var EPIC_STONE_CHANCE = 0.3;                   // 💠 에픽 재조합석 확률
  var RECOMB_N = 2, ONGSTONE_N = 2;              // 🔹 재조합석 / 🔶 공방의 원석 개수
  var LOSE_RATE = 0.6;       // 졌을 때: 깎은 비율 × 이 값 만큼의 보상
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

  function play(ctx) {
    var root = ctx.root, lv = ctx.level, imgBase = ctx.imgBase;
    var SL = skillList(ctx.charId, lv).all;
    var avail = SL.filter(function (s) { return s.ok; });
    if (avail.length < 2) avail = SL.slice(0, 2);
    var lvMul = 1 + Math.max(0, lv - 35) * LV_DMG;
    function gfs(k) { try { return window.FanGear ? window.FanGear.sum(ctx.charId, k) : 0; } catch (e) { return 0; } }   // 🎀 소품 효과
    var S = { forgive: gfs('forgive'), loot: [], hp: BOSS_HP, hearts: HEARTS, combo: 0, best: 0, chains: 0, seq: [], fans: [], pos: 0, left: 0, total: 0, over: false, lock: false };
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;background:radial-gradient(circle at 50% 25%,#3b1d6e,#0b0716 72%);overflow:hidden;font-family:\'Noto Sans KR\',sans-serif;';
    wrap.innerHTML =
      '<style>@keyframes wtShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}' +
      '@keyframes wtHit{0%{transform:scale(1)}40%{transform:scale(1.12) rotate(-3deg)}100%{transform:scale(1)}}' +
      '@keyframes wtUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-46px)}}' +
      '@keyframes wtFall{0%{transform:translateY(-70px);opacity:0}100%{transform:translateY(0);opacity:1}}@keyframes wtPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.14)}}</style>' +
      '<div style="width:100%;padding:12px 14px 6px;box-sizing:border-box;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:900;color:#fff;"><span>🏟️ 월드투어 스타디움</span><span id="wt-hearts" style="font-size:16px;"></span></div>' +
        '<div style="margin-top:8px;height:16px;border-radius:8px;background:rgba(255,255,255,.14);overflow:hidden;border:1px solid rgba(255,255,255,.25);"><div id="wt-hp" style="height:100%;width:100%;background:linear-gradient(90deg,#f43f5e,#f59e0b);transition:width .35s;"></div></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;color:#d9ccff;margin-top:3px;"><span id="wt-phase">1단계</span><span id="wt-combo"></span></div></div>' +
      '<div id="wt-boss" style="position:relative;margin-top:6px;width:170px;height:170px;display:flex;align-items:center;justify-content:center;">' +
        '<img id="wt-boss-img" src="' + imgBase + 'rfan-boss.png" style="max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 0 16px rgba(255,120,200,.55));" onerror="this.outerHTML=\'<div style=&quot;font-size:96px;&quot;>👑</div>\'">' +
        '<div id="wt-dmg" style="position:absolute;left:0;right:0;top:20px;text-align:center;font-size:30px;font-weight:900;color:#ffe27a;text-shadow:0 2px 6px #000;pointer-events:none;"></div></div>' +
      '<div style="font-size:12px;color:#ffd1da;margin:2px 0 6px;" id="wt-say">맨 앞 팬부터 원하는 스킬을 눌러요!</div>' +
      '<div id="wt-seq" style="display:flex;gap:4px;justify-content:center;align-items:flex-end;min-height:96px;width:96%;"></div>' +
      '<div style="width:78%;max-width:300px;height:8px;border-radius:4px;background:rgba(255,255,255,.14);margin:10px 0 8px;overflow:hidden;"><div id="wt-time" style="height:100%;width:100%;background:#6ee7b7;"></div></div>' +
      '<div style="flex:1;"></div>' +
      '<div id="wt-btns" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;padding:0 12px 22px;"></div>';
    root.appendChild(wrap);
    var q = function (id) { return wrap.querySelector('#' + id); };
    var BW = SL.length > 7 ? 40 : SL.length > 5 ? 46 : 56;
    function buildBtns(shuffle) {
      var box = q('wt-btns'); box.innerHTML = '';
      var list = SL.slice(); if (shuffle) list.sort(function () { return Math.random() - 0.5; });
      list.forEach(function (s) {
        var b = document.createElement('button'); b.dataset.id = s.id;
        var locked = !s.ok;
        b.style.cssText = 'width:' + BW + 'px;height:' + (BW + 18) + 'px;border-radius:14px;border:2px solid ' + (locked ? 'rgba(255,255,255,.25)' : '#fff') + ';background:' + (locked ? 'rgba(255,255,255,.08)' : 'linear-gradient(160deg,#6d28d9,#3b0764)') + ';color:#fff;font-size:' + Math.round(BW * 0.48) + 'px;font-weight:900;cursor:pointer;touch-action:manipulation;padding:0;' + (locked ? 'opacity:.55;' : '');
        b.innerHTML = (locked ? '🔒' : s.icon) + '<div style="font-size:9px;font-weight:900;margin-top:2px;line-height:1.1;">' + s.name + '</div>';
        b.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          if (locked) { q('wt-say').textContent = '🔒 ' + s.name + ' — 더보기 > 💖 팬 스킬 상점에서 배우면 쓸 수 있어요'; return; }
          press(s.id, b);
        });
        box.appendChild(b);
      });
    }
    buildBtns(false);
    function phase() { var r = S.hp / BOSS_HP; return r > 0.66 ? 0 : r > 0.33 ? 1 : 2; }
    function drawHud() {
      var h = ''; for (var i = 0; i < HEARTS; i++) h += i < S.hearts ? '❤️' : '🖤';
      q('wt-hearts').innerHTML = h;
      q('wt-hp').style.width = Math.max(0, S.hp / BOSS_HP * 100) + '%';
      q('wt-phase').textContent = (phase() + 1) + '단계 · 팬 ' + PHASES[phase()].len + '명';
      q('wt-combo').innerHTML = S.combo >= 2 ? '🔥 ' + S.combo + '연속!' : '';
    }
    function skillOf(id) { return SL.filter(function (x) { return x.id === id; })[0] || { icon: '?', name: '' }; }
    function drawSeq() {
      var ph = PHASES[phase()];
      q('wt-seq').innerHTML = S.seq.map(function (id, i) {
        var done = i < S.pos, cur = i === S.pos, vis = i - S.pos < ph.show;
        var fan = S.fans[i];
        var icon = done ? '💗' : (vis ? skillOf(id).icon : '❓');
        return '<div style="display:flex;flex-direction:column;align-items:center;width:' + Math.floor(100 / S.seq.length) + '%;max-width:62px;opacity:' + (done ? '.35' : '1') + ';' + (cur ? 'animation:wtPulse .7s infinite;' : '') + '">' +
          '<div style="min-width:30px;height:28px;padding:0 4px;box-sizing:border-box;border-radius:12px;background:' + (cur ? '#ffe27a' : 'rgba(255,255,255,.92)') + ';display:flex;align-items:center;justify-content:center;font-size:17px;margin-bottom:2px;position:relative;">' + icon + '<span style="position:absolute;bottom:-5px;left:50%;margin-left:-4px;width:8px;height:8px;background:' + (cur ? '#ffe27a' : 'rgba(255,255,255,.92)') + ';transform:rotate(45deg);"></span></div>' +
          '<img src="' + imgBase + 'rfan-' + fan + '.png" style="width:' + (cur ? 54 : 44) + 'px;height:' + (cur ? 54 : 44) + 'px;object-fit:contain;' + (cur ? 'filter:drop-shadow(0 0 8px #ffe27a);' : '') + (done ? 'transform:translateY(-14px);' : '') + 'transition:all .25s;" onerror="this.outerHTML=\'<div style=&quot;font-size:30px;&quot;>🧑‍🎤</div>\'"></div>';
      }).join('');
    }
    function newSeq() {
      var p = PHASES[phase()];
      S.seq = []; S.fans = []; for (var i = 0; i < p.len; i++) { S.seq.push(avail[Math.floor(Math.random() * avail.length)].id); S.fans.push(1 + Math.floor(Math.random() * FAN_IMGS)); }
      if (phase() === 2) buildBtns(true);   // 3단계: 버튼 위치가 매번 바뀜
      S.pos = 0; S.total = p.sec * (1 + gfs('reach') / 100); S.left = S.total; S.lock = false;   // 🎀 사거리 소품 = 제한시간 늘림
      drawSeq(); drawHud();
    }
    function float(t, col) { var d = q('wt-dmg'); d.style.color = col || '#ffe27a'; d.textContent = t; d.style.animation = 'none'; void d.offsetWidth; d.style.animation = 'wtUp .8s ease-out forwards'; }
    // 🎁 팬이 만족하면 상자를 떨어뜨려요 (눌러서 줍기, 몇 초 뒤 사라짐)
    function dropBox() {
      if (S.over) return;
      var d = document.createElement('div');
      var side = Math.random() < 0.5 ? 0 : 1, x = side ? 62 + Math.random() * 14 : 10 + Math.random() * 14;
      d.style.cssText = 'position:absolute;top:150px;left:' + x + '%;width:54px;height:62px;z-index:8;cursor:pointer;text-align:center;animation:wtFall .55s ease-in;';
      d.innerHTML = ExpKit.boxImgHtml(50);
      wrap.appendChild(d);
      var gone = setTimeout(function () { d.remove(); }, 5200);
      d.addEventListener('pointerdown', function (e) {
        e.preventDefault(); if (d.__got) return; d.__got = true; clearTimeout(gone);
        var l = ExpKit.rollLoot(); S.loot.push(l);
        d.innerHTML = '<div style="font-size:11px;font-weight:900;color:#ffe27a;text-shadow:0 1px 4px #000;white-space:nowrap;margin-left:-28px;animation:wtUp .9s ease-out forwards;">' + l.txt + '</div>';
        setTimeout(function () { d.remove(); }, 900);
        try { if (window.pocaSfx && window.pocaSfx.play) window.pocaSfx.play('reward'); } catch (x) {}
      });
    }
    function bossAttack(why) {
      S.hearts--; S.combo = 0;
      var bw = q('wt-boss'); bw.style.animation = 'none'; void bw.offsetWidth; bw.style.animation = 'wtShake .35s';
      wrap.style.background = 'radial-gradient(circle at 50% 25%,#7f1d3a,#0b0716 72%)';
      setTimeout(function () { wrap.style.background = 'radial-gradient(circle at 50% 25%,#3b1d6e,#0b0716 72%)'; }, 260);
      q('wt-say').textContent = why;
      float('💥', '#ff7a7a');
      drawHud();
      if (S.hearts <= 0) return end(false);
      S.lock = true; setTimeout(newSeq, 600);
    }
    function press(id, el) {
      if (S.over || S.lock) return;
      el.style.transform = 'scale(.92)'; setTimeout(function () { el.style.transform = ''; }, 90);
      if (S.seq[S.pos] !== id) {
        if (S.forgive > 0) { S.forgive--; float('🎀 막아줬어요!', '#a5f3fc'); q('wt-say').textContent = '🎀 소품이 실수를 막아줬어요 (순서 그대로 이어가요)'; return; }   // 🎀 실수 방지 소품
        return bossAttack('순서가 틀렸어요! 하트가 깎였어요');
      }
      S.pos++; drawSeq();
      if (S.pos >= S.seq.length) {
        S.chains++; S.combo++; S.best = Math.max(S.best, S.combo);
        var finBonus = S.seq.indexOf('finale') >= 0 ? 1.4 : 1;
        var dmg = Math.round(BASE_DMG * lvMul * (1 + Math.min(S.combo - 1, 8) * COMBO_BONUS) * finBonus * (1 + gfs('cd') / 100));   // 🎀 쿨타임 소품 = 데미지 증가
        S.hp = Math.max(0, S.hp - dmg);
        var img = q('wt-boss-img') || q('wt-boss'); img.style.animation = 'none'; void img.offsetWidth; img.style.animation = 'wtHit .3s';
        float('-' + dmg);
        q('wt-say').textContent = S.combo >= 3 ? '🔥 연속 응대! 팬들이 열광해요' : '성공! 팬들이 만족해요';
        drawHud();
        if (Math.random() < Math.min(1, 0.7 * (window.FanGear ? window.FanGear.mult(ctx.charId, 'box') : 1))) dropBox();   // 🎀 소품: 상자 확률   // 팬이 만족하면 상자를 떨어뜨림
        if (S.hp <= 0) return end(true);
        S.lock = true; setTimeout(newSeq, 350);
      }
    }
    var timer = setInterval(function () {
      if (!root.isConnected) { clearInterval(timer); return; }
      if (S.over || S.lock) return;
      S.left -= 0.05;
      q('wt-time').style.width = Math.max(0, S.left / S.total * 100) + '%';
      q('wt-time').style.background = S.left / S.total < 0.3 ? '#f87171' : '#6ee7b7';
      if (S.left <= 0) bossAttack('시간이 끝났어요! 보스가 몰려와요');
    }, 50);
    function end(win) {
      if (S.over) return; S.over = true; clearInterval(timer);
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
      } else { coin = Math.round(WIN_COIN * done * LOSE_RATE); exp = Math.round(WIN_EXP * done * LOSE_RATE); }
      setTimeout(function () {
        wrap.remove();
        ctx.finish(ExpKit.mergeLoot({
          win: win, title: win ? '월드투어 대성공!' : '다음엔 꼭!', coin: coin, exp: exp, items: items, stone: stone, wish: wish,
          summary: (win ? '최대 ' + S.best + '연속 · 성공한 줄 ' + S.chains + '번 · 남은 하트 ' + S.hearts : '보스 체력을 ' + Math.round(done * 100) + '% 깎았어요 (성공 ' + S.chains + '번)') + '<br>🎁 주운 상자 ' + S.loot.length + '개'
        }, S.loot));
      }, 700);
    }
    newSeq();
    window.__wtTest = { S: S, press: press, end: end, avail: avail };
  }

  function reg() {
    if (!window.ExpKit) { setTimeout(reg, 100); return; }
    window.ExpKit.register({
      id: 'world_tour', bg: 'special-world_tour.jpg', name: '월드투어 스타디움', emoji: '🏟️', color: '#f472b6', needLevel: NEED_LEVEL, stamina: STAMINA, daily: DAILY,
      tagline: '팬들의 스킬 요청 연속 응대! 소원의 조각·강화석·재조합석', gearChance: 0.45, gearMin: 'great',
      intro: ['무대 앞에 <b>팬들이 줄을 서요</b>. 팬마다 머리 위 말풍선에 원하는 <b>스킬</b>이 떠요. 맨 앞(노란 말풍선) 팬부터 순서대로 맞는 스킬 버튼을 눌러요.', '다 응대하면 팬들이 만족해서 🎁 <b>상자를 떨어뜨려요</b>! 눌러서 주워요 (몇 초 뒤 사라져요). 대표 팬 게이지도 깎여요. <b>연속 성공</b>할수록 데미지가 커져요!', '틀리거나 시간이 끝나면 ❤️가 깎여요 (4개). 단계가 오를수록 팬이 <b>4→5→6명</b>으로 늘고, 뒷줄 팬의 요청이 <b>❓로 가려지고</b>, 3단계에선 <b>버튼 위치가 매번 바뀌어요</b>.', '버튼은 <b>그 멤버가 배운 스킬</b>만 쓸 수 있어요 (레벨은 됐는데 못 배운 건 🔒). 스킬 상점에서 배우면 쓸 수 있는 스킬이 늘어요. 🎆 불꽃쇼가 들어간 줄은 데미지 ×1.4!', '대표 팬을 쓰러뜨리면 🧩 <b>소원의 조각</b>, 🔨 <b>강화석</b>, 🔹 <b>재조합석</b>, 🔶 <b>원석</b>, <b>프리미엄 조각</b>이 나와요. 가끔 💠 <b>에픽 재조합석</b>도!'],
      play: play
    });
  }
  reg();
})();
