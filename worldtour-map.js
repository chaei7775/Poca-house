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
  var BOSS_HP = 700;         // 보스 체력
  var HEARTS = 5;            // 내 하트
  var BASE_DMG = 60;         // 한 줄 성공 기본 데미지
  var COMBO_BONUS = 0.18;    // 연속 성공 1회당 데미지 증가
  var LV_DMG = 0.02;         // 플레이어 레벨 1당 데미지 증가 (Lv.35 기준)
  var PHASES = [ { len: 3, sec: 6.5 }, { len: 4, sec: 6 }, { len: 5, sec: 5.5 } ];   // 보스 체력 1/3 구간마다 바뀜
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

  function play(ctx) {
    var root = ctx.root, lv = ctx.level, imgBase = ctx.imgBase;
    var avail = SK.filter(function (s) { return lv >= s.lv; });
    var lvMul = 1 + Math.max(0, lv - 35) * LV_DMG;
    var S = { hp: BOSS_HP, hearts: HEARTS, combo: 0, best: 0, chains: 0, seq: [], pos: 0, left: 0, total: 0, over: false, lock: false };
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;background:radial-gradient(circle at 50% 25%,#3b1d6e,#0b0716 72%);overflow:hidden;font-family:\'Noto Sans KR\',sans-serif;';
    wrap.innerHTML =
      '<style>@keyframes wtShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}' +
      '@keyframes wtHit{0%{transform:scale(1)}40%{transform:scale(1.12) rotate(-3deg)}100%{transform:scale(1)}}' +
      '@keyframes wtUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-46px)}}' +
      '@keyframes wtPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.14)}}</style>' +
      '<div style="width:100%;padding:12px 14px 6px;box-sizing:border-box;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:900;color:#fff;"><span>🏟️ 월드투어 스타디움</span><span id="wt-hearts" style="font-size:16px;"></span></div>' +
        '<div style="margin-top:8px;height:16px;border-radius:8px;background:rgba(255,255,255,.14);overflow:hidden;border:1px solid rgba(255,255,255,.25);"><div id="wt-hp" style="height:100%;width:100%;background:linear-gradient(90deg,#f43f5e,#f59e0b);transition:width .35s;"></div></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;color:#d9ccff;margin-top:3px;"><span id="wt-phase">1단계</span><span id="wt-combo"></span></div></div>' +
      '<div id="wt-boss" style="position:relative;margin-top:6px;width:170px;height:170px;display:flex;align-items:center;justify-content:center;">' +
        '<img id="wt-boss-img" src="' + imgBase + 'rfan-boss.png" style="max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 0 16px rgba(255,120,200,.55));" onerror="this.outerHTML=\'<div style=&quot;font-size:96px;&quot;>👑</div>\'">' +
        '<div id="wt-dmg" style="position:absolute;left:0;right:0;top:20px;text-align:center;font-size:30px;font-weight:900;color:#ffe27a;text-shadow:0 2px 6px #000;pointer-events:none;"></div></div>' +
      '<div style="font-size:12px;color:#ffd1da;margin:2px 0 6px;" id="wt-say">대표 팬이 외치는 순서대로 눌러요!</div>' +
      '<div id="wt-seq" style="display:flex;gap:7px;justify-content:center;min-height:56px;"></div>' +
      '<div style="width:78%;max-width:300px;height:8px;border-radius:4px;background:rgba(255,255,255,.14);margin:10px 0 8px;overflow:hidden;"><div id="wt-time" style="height:100%;width:100%;background:#6ee7b7;"></div></div>' +
      '<div style="flex:1;"></div>' +
      '<div id="wt-btns" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;padding:0 12px 22px;"></div>';
    root.appendChild(wrap);
    var q = function (id) { return wrap.querySelector('#' + id); };
    avail.forEach(function (s) {
      var b = document.createElement('button'); b.dataset.id = s.id;
      b.style.cssText = 'width:' + (avail.length > 4 ? 62 : 72) + 'px;height:' + (avail.length > 4 ? 72 : 82) + 'px;border-radius:18px;border:2px solid #fff;background:linear-gradient(160deg,#6d28d9,#3b0764);color:#fff;font-size:28px;cursor:pointer;font-family:inherit;line-height:1.1;';
      b.innerHTML = s.icon + '<div style="font-size:10px;font-weight:900;margin-top:3px;">' + s.name + '</div>';
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); press(s.id, b); });
      q('wt-btns').appendChild(b);
    });
    function phase() { var r = S.hp / BOSS_HP; return r > 0.66 ? 0 : r > 0.33 ? 1 : 2; }
    function drawHud() {
      var h = ''; for (var i = 0; i < HEARTS; i++) h += i < S.hearts ? '❤️' : '🖤';
      q('wt-hearts').innerHTML = h;
      q('wt-hp').style.width = Math.max(0, S.hp / BOSS_HP * 100) + '%';
      q('wt-phase').textContent = (phase() + 1) + '단계 · ' + PHASES[phase()].len + '개 순서';
      q('wt-combo').innerHTML = S.combo >= 2 ? '🔥 ' + S.combo + '연속!' : '';
    }
    function drawSeq() {
      q('wt-seq').innerHTML = S.seq.map(function (id, i) {
        var s = SK.filter(function (x) { return x.id === id; })[0], done = i < S.pos, cur = i === S.pos;
        return '<div style="width:50px;height:54px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;' +
          'background:' + (done ? 'rgba(110,231,183,.35)' : 'rgba(255,255,255,.12)') + ';border:2px solid ' + (done ? '#6ee7b7' : cur ? '#ffe27a' : 'rgba(255,255,255,.3)') + ';' +
          (cur ? 'animation:wtPulse .7s infinite;' : '') + (done ? 'opacity:.7;' : '') + '">' + s.icon + '</div>';
      }).join('');
    }
    function newSeq() {
      var p = PHASES[phase()];
      S.seq = []; for (var i = 0; i < p.len; i++) S.seq.push(avail[Math.floor(Math.random() * avail.length)].id);
      S.pos = 0; S.total = p.sec; S.left = p.sec; S.lock = false;
      drawSeq(); drawHud();
    }
    function float(t, col) { var d = q('wt-dmg'); d.style.color = col || '#ffe27a'; d.textContent = t; d.style.animation = 'none'; void d.offsetWidth; d.style.animation = 'wtUp .8s ease-out forwards'; }
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
      if (S.seq[S.pos] !== id) return bossAttack('순서가 틀렸어요! 하트가 깎였어요');
      S.pos++; drawSeq();
      if (S.pos >= S.seq.length) {
        S.chains++; S.combo++; S.best = Math.max(S.best, S.combo);
        var finBonus = S.seq.indexOf('finale') >= 0 ? 1.4 : 1;
        var dmg = Math.round(BASE_DMG * lvMul * (1 + Math.min(S.combo - 1, 8) * COMBO_BONUS) * finBonus);
        S.hp = Math.max(0, S.hp - dmg);
        var img = q('wt-boss-img') || q('wt-boss'); img.style.animation = 'none'; void img.offsetWidth; img.style.animation = 'wtHit .3s';
        float('-' + dmg);
        q('wt-say').textContent = S.combo >= 3 ? '🔥 연속 응대! 팬들이 열광해요' : '성공! 팬이 만족해요';
        drawHud();
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
        ctx.finish({
          win: win, title: win ? '월드투어 대성공!' : '다음엔 꼭!', coin: coin, exp: exp, items: items, stone: stone, wish: wish,
          summary: win ? '최대 ' + S.best + '연속 · 성공한 줄 ' + S.chains + '번 · 남은 하트 ' + S.hearts : '보스 체력을 ' + Math.round(done * 100) + '% 깎았어요 (성공 ' + S.chains + '번)'
        });
      }, 700);
    }
    newSeq();
    window.__wtTest = { S: S, press: press, end: end, avail: avail };
  }

  function reg() {
    if (!window.ExpKit) { setTimeout(reg, 100); return; }
    window.ExpKit.register({
      id: 'world_tour', bg: 'special-world_tour.jpg', name: '월드투어 스타디움', emoji: '🏟️', color: '#f472b6', needLevel: NEED_LEVEL, stamina: STAMINA, daily: DAILY,
      tagline: '스킬 연속 응대! 소원의 조각·강화석·재조합석',
      intro: ['보스 머리 위에 뜨는 <b>스킬 순서</b>를 그대로 아래 버튼으로 눌러요.', '성공하면 보스 게이지가 깎여요. <b>연속 성공</b>할수록 데미지가 커져요!', '틀리거나 시간이 끝나면 ❤️가 깎여요 (5개). 단계가 오를수록 순서가 <b>3→4→5개</b>로 길어져요.', '쓸 수 있는 스킬은 <b>플레이어 레벨</b>로 정해져요: 🎤20 💖25 ✨30 🌹35 🎆40 (Lv.40이면 🎆 불꽃쇼가 들어간 줄은 데미지 ×1.4)', '보스를 쓰러뜨리면 🧩 <b>소원의 조각</b>, 🔨 <b>강화석</b>, 🔹 <b>재조합석</b>, 🔶 <b>원석</b>, <b>프리미엄 조각</b>이 나와요. 가끔 💠 <b>에픽 재조합석</b>도!'],
      play: play
    });
  }
  reg();
})();
