// ════════════════════════════════════════════════════════════
// 🔗 그룹 ↔ 팬덤 원정 연결 (group-link.js) — 1단계
//  ① 그룹 인기도가 높을수록, 그 그룹 멤버가 나간 팬덤 원정의 코인·경험치 보상이 늘어난다
//     (그룹 레벨 1당 +4%, 최대 +20% — 국민 그룹/월드 스타 구간)
//  ② 원정을 다녀오면 잠시 뒤 아이돌이 우편함으로 편지를 보낸다 (하루 최대 1통, 그룹 멤버면 그룹 이름이 들어간 편지)
// 읽기만 하고 그룹 데이터(ph_group)는 고치지 않는다. 기존 파일은 건드리지 않고 함수를 감싸기만 한다.
// ✏️ 고치는 법: 아래 [설정] 숫자만 바꾸면 됨
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // ── [설정] ──
  var BONUS_PER_LEVEL = 4;                 // 그룹 레벨 1당 원정 보상 +%  (레벨 0=신인은 0%)
  var BONUS_MAX = 20;                      // 최대 +%
  var LETTER_MIN = 60 * 1000, LETTER_MAX = 150 * 1000;   // 원정 후 편지가 오기까지 1~2.5분
  var LEVEL_FAME = [0, 80, 240, 560, 1100, 2000];        // group.js 의 LEVELS 와 같음

  var KEY = 'ph_glink';
  function J(key, def) { try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return (v === null || v === undefined) ? def : v; } catch (e) { return def; } }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // ── 그룹 정보 (읽기 전용) ──
  function groupOf(cid) {
    var g = J('ph_group', null); if (!g || !g.group || !Array.isArray(g.group.members)) return null;
    if (g.group.members.indexOf(cid) === -1) return null;
    var lv = 0; for (var i = 0; i < LEVEL_FAME.length; i++) if ((g.fame || 0) >= LEVEL_FAME[i]) lv = i;
    return { name: g.group.name, level: lv };
  }
  function bonusPct(cid) { var g = groupOf(cid); return g ? Math.min(BONUS_MAX, g.level * BONUS_PER_LEVEL) : 0; }

  // ── ① 원정 보상 보너스 ──
  //  FanGear.sum(cid,'reward') → 공항·VIP·리허설·파파라치·월드투어가 읽음 (퍼센트 숫자)
  //  getEngraveBonus(cid).coin/exp → 방송국 앞·팬미팅장·공연장이 읽음 (소수 비율)
  function hookGear() {
    if (!window.FanGear || typeof window.FanGear.sum !== 'function') { setTimeout(hookGear, 300); return; }
    var G = window.FanGear; if (G.sum.__glink) return;
    var s0 = G.sum, m0 = G.mult;
    var sum = function (cid, kind) { var v = s0.apply(this, arguments); if (kind === 'reward') v += bonusPct(cid); return v; };
    sum.__glink = true; G.sum = sum;
    // mult 는 gear 파일 안에서 내부 sum 을 부르므로 따로 맞춰 줌
    G.mult = function (cid, kind) { return 1 + sum(cid, kind) / 100; };
  }
  function hookEngrave() {
    if (typeof window.getEngraveBonus !== 'function') { setTimeout(hookEngrave, 300); return; }
    var o = window.getEngraveBonus; if (o.__glink) return;
    var w = function (cid) {
      var r = o.apply(this, arguments) || {}, p = bonusPct(cid);
      if (p > 0) { r = Object.assign({}, r); r.coin = (Number(r.coin) || 0) + p / 100; r.exp = (Number(r.exp) || 0) + p / 100; }
      return r;
    };
    w.__glink = true; window.getEngraveBonus = w;
  }

  // ── ② 원정 후 아이돌 편지 ──
  var LETTERS = {
    minjun: { g: ['팬분들이 불러 준 이름', '{g}로 나간 길에 팬분들이 이름을 불러줬어. 혼자 읽던 책이 여럿이 같이 읽는 책이 된 기분이야. {닉아}, 네가 써 준 문장이 이만큼 커졌어.'],
              n: ['팬분들 얘기', '오늘 원정 다녀왔다며. 팬분들이 건네는 말이 책 속 문장처럼 오래 남더라. 이름을 불러준다는 건 생각보다 큰 일이야. {닉아}, 같이 서 줘서 고마워.'] },
    sion:   { g: ['합창 같던 환호', '{g} 멤버들이랑 나갔더니 팬분들 목소리가 합창 같았어. 기타 소리가 묻힐 정도였다니까. {닉}도 이 소리를 들었으면 좋겠다.'],
              n: ['빈자리가 없었어', '오늘 팬분들 앞에 섰는데 앞자리가 비지 않았어. 아무도 없던 무대가 이렇게 꽉 차다니. {닉}, 네 덕분이야.'] },
    doyun:  { g: ['…나쁘지 않더라', '{g}가 이만큼 사랑받을 줄은 몰랐어. 멤버들 챙기느라 정신없었는데… 나쁘지 않더라. {닉아}, 계속 지켜봐 줘.'],
              n: ['한바탕 난리', '오늘 팬분들이 몰려와서 한바탕 난리였어. 다 챙겨주느라 바빴지. …고생한 건 아니야, 해야 할 일이었어. {닉아}, 너도 다친 데 없지?'] },
    harin:  { g: ['이름을 불러주셨어요', '{g}라는 이름을 불러주시는데 가슴이 두근거렸어요. 혼자였다면 못 했을 텐데 멤버들이 있어서 든든했어요. {닉}도 곁에 있어 줘서 고마워요.'],
              n: ['별빛 같은 응원', '오늘 팬분들이 건네준 응원이 새벽 별빛처럼 반짝였어요. 제가 이런 사랑을 받아도 될까 싶어서 조금 울컥했어요. {닉}, 고마워요.'] },
    yuna:   { g: ['응원봉 꽃밭 🌸', '{g}로 나갔더니 응원봉 꽃밭이 펼쳐졌어! 🌸 멤버들이랑 손잡고 인사했는데 심장이 둥실둥실~ {닉}, 다음엔 같이 가자!'],
              n: ['꽃다발 가득! 🌸', '오늘 팬분들이 꽃다발을 한가득 들고 오셨어! 🌸 온 세상이 꽃밭 같았어~ {닉}한테도 한 송이 나눠주고 싶어!'] },
    ara:    { g: ['물결처럼 퍼진 이름', '{g}의 이름이 물결처럼 퍼졌어. 혼자 고요하던 호수가 이렇게 커졌네. {닉아}, 이 소리의 시작은 너야.'],
              n: ['호수에 번진 목소리', '오늘 팬분들의 목소리가 호수에 번지는 물결 같았어. 이름이 불릴 때마다 내가 또렷해지는 것 같아. {닉아}, 네가 부른 이름이기도 해.'] }
  };
  function state() { var s = J(KEY, {}) || {}; if (!Array.isArray(s.pend)) s.pend = []; return s; }
  function saveState(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  function queueLetter(cid) {
    if (!LETTERS[cid]) return;
    var s = state();
    if (s.day === today() || s.pend.length) return;            // 하루 1통 (이미 보냈거나 대기 중이면 패스)
    s.pend.push({ cid: cid, at: Date.now() + LETTER_MIN + Math.random() * (LETTER_MAX - LETTER_MIN) });
    saveState(s);
  }
  function deliver() {
    try {
      var s = state(); if (!s.pend.length) return;
      var p = s.pend[0]; if (p.at > Date.now()) return;
      var T = window.__mailTest, lines = window.__mailLines;
      if (!T || !lines || !lines[p.cid]) return;               // 우편함이 아직 안 떴으면 다음에
      var g = groupOf(p.cid), L = LETTERS[p.cid], pair = g ? L.g : L.n;
      var m = T.load();
      m.seq += 1;
      m.inbox.unshift({ id: 'm' + Date.now().toString(36) + m.seq, cid: p.cid, kind: 'idol', title: pair[0], body: g ? pair[1].replace(/\{g\}/g, g.name) : pair[1], sign: lines[p.cid].sign, raw: true, ts: Date.now(), read: false });
      T.save(m);
      s.pend.shift(); s.day = today(); saveState(s);
      try { T.check(); } catch (e) {}                          // 우편함 배지 갱신
      try { if (typeof showBagToast === 'function') showBagToast('📮 ' + (lines[p.cid].sign || '아이돌') + '에게서 편지가 왔어요!'); } catch (e) {}
    } catch (e) {}
  }
  function staminaNow() { try { return typeof stamina !== 'undefined' ? stamina : 0; } catch (e) { return 0; } }
  function hookExplore() {
    if (typeof window.startSpecialExplore !== 'function') { setTimeout(hookExplore, 300); return; }
    var o = window.startSpecialExplore; if (o.__glink) return;
    var w = function (loc, cid) {
      var before = staminaNow(), r = o.apply(this, arguments);
      try { if (staminaNow() < before) queueLetter(cid); } catch (e) {}   // 실제로 입장해 체력이 줄었을 때만
      return r;
    };
    w.__glink = true; window.startSpecialExplore = w;
  }

  hookGear(); hookEngrave(); hookExplore();
  setInterval(deliver, 5000);
  window.__groupLinkTest = { bonusPct: bonusPct, groupOf: groupOf, queueLetter: queueLetter, deliver: deliver, state: state, KEY: KEY, LETTERS: LETTERS };
})();
