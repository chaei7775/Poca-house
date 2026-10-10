// ════════════════════════════════
// 👥 그룹 (group.js) — 1단계
// 데뷔한 아이돌 2~4명을 자유롭게 묶어 "내 그룹"을 만든다. (그룹은 1개, 한 아이돌은 한 그룹에만. 개인 활동은 그대로 병행)
//  · 더보기 → [그룹] : 그룹 만들기 / 멤버·이름 바꾸기 / 해체
//  · 그룹 능력치 = 멤버들의 능력치(보컬·댄스·연기·예능·매력, 레슨으로 키움) 평균. 어떤 멤버를 묶느냐에 따라 그룹 콘셉트와 잘하는 활동이 달라진다.
//  · 그룹 활동 6가지(합동 무대 · 그룹 음원 · 댄스 챌린지 · 단체 예능 · 그룹 화보 · 단체 드라마): 활동마다 보는 능력치가 다르고,
//    그 능력치가 높을수록 결과 등급(아쉬움 → 최고)과 대성공 확률이 오른다. 보상: 코인 · 그룹 인기도 · (일부) 소원의 조각
//  · 💪 그룹 체력: 하루 무료 3회 + 체력 음료(코인으로 구매, 안 쓰면 남아요). 활동 1번에 체력 1. 활동마다 하루 횟수 제한도 따로 있음.
//  · 인기도에 따라 그룹 레벨(신인 → 월드 스타)이 오른다.
// 저장: localStorage 'ph_group' (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// 값을 바꾸고 싶으면 아래 [설정]만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // ── [설정] ──
  var KEY = 'ph_group';
  var MIN_MEMBERS = 2, MAX_MEMBERS = 4;
  var NAME_MAX = 10;
  var PAY_MULT = 20;                   // 💰 코인 배율 (기준: 드라마 혼자 촬영이 약 1500만. 인연 높은 2명이 '좋음' 등급이면 활동 한 번이 그 정도가 되도록 맞춤. 이 숫자만 바꾸면 전체 조절)
  var STA_FREE = 3;                    // 💪 그룹 체력: 하루 무료 활동 횟수 (모든 활동이 같이 씀. 드라마 촬영 체력과 같은 방식)
  var POTION_MIN = 10000000;           // 체력 음료(소) 최소 가격 — 드라마와 같음
  var POTION_RATE = 0.7;               // 음료(소) 가격 = 우리 그룹 활동 평균 보상 × 70% (후반에 보상이 커지면 음료도 비싸져서 남는 장사가 안 되게)
  var POTION_BIG_RATE = 2.8;           // 대(3회) 가격 = 소 가격 × 2.8
  var MEMBER_BONUS = 0.25;             // 멤버 1명 늘 때마다 +25% (활동마다 따로 정한 게 있으면 그걸 씀)
  var BOND_BONUS = 0.5;                // 평균 인연(1~20) 만점이면 +50%
  var LEVEL_BONUS = 0.05;              // 그룹 레벨 1당 +5%
  var BIG_BASE = 0.08, BIG_PER_POWER = 0.003, BIG_MAX = 0.4, BIG_MULT = 1.5;   // 대성공 확률 = 8% + 능력치×0.3% (최대 40%)
  var FAME_PER_MEMBER = 3;             // 활동 1번 인기도 = 활동 기본 + 멤버수×3 (대성공이면 ×1.5)
  var EV_CHANCE = 0.15, EV_DAILY = 2;   // 🎲 돌발 이벤트: 활동 끝날 때 15% 확률, 하루 최대 2번 (코인 변동은 그 활동 보상의 약 -25%~+45% 안)
  var STAT_DEFAULT = 10;               // 레슨 데이터가 없을 때 능력치
  var TIERS = [                        // [필요 능력치(가중 평균), 등급 이름, 보상 배율]
    [0, '아쉬움', 0.7], [20, '보통', 1], [40, '좋음', 1.25], [60, '훌륭', 1.5], [80, '최고', 1.8]
  ];
  var STATS = [                        // lesson.js 와 같은 키
    { k: 'vocal', icon: '🎤', name: '보컬', color: '#ff7fa8' }, { k: 'dance', icon: '💃', name: '댄스', color: '#7fd1ff' },
    { k: 'act', icon: '🎭', name: '연기', color: '#c9a0ff' }, { k: 'fun', icon: '🎪', name: '예능', color: '#ffd76a' }, { k: 'charm', icon: '✨', name: '매력', color: '#7fe8b0' }
  ];
  var CONCEPT = { vocal: '보컬 그룹', dance: '퍼포먼스 그룹', act: '배우돌 그룹', fun: '예능돌 그룹', charm: '비주얼 그룹' };
  var ACTS = [                         // per: 하루 횟수 / coin: 기본 코인 / fame: 기본 인기도 / wish: 소원의 조각이 나올 수 있는 활동 / mb: 멤버 수 보너스(기본 MEMBER_BONUS)
    { id: 'stage',   icon: '🎤', name: '합동 무대',     desc: '객석을 사로잡는 라이브',       w: { vocal: .5, dance: .5 }, per: 2, coin: 300000, fame: 10 },
    { id: 'album',   icon: '💿', name: '그룹 음원 녹음', desc: '목소리를 겹쳐 노래를 만들어요', w: { vocal: .7, charm: .3 }, per: 1, coin: 450000, fame: 14, wish: 1 },
    { id: 'dance',   icon: '💃', name: '댄스 챌린지',   desc: '칼군무로 화제를 모아요',       w: { dance: .8, charm: .2 }, per: 1, coin: 250000, fame: 18 },
    { id: 'variety', icon: '🎪', name: '단체 예능 출연', desc: '멤버가 많을수록 웃음이 커져요', w: { fun: .7, charm: .3 },   per: 1, coin: 250000, fame: 12, wish: 1, mb: 0.45 },
    { id: 'photo',   icon: '📸', name: '그룹 화보·광고', desc: '비주얼로 승부하는 촬영',       w: { charm: .7, act: .3 },   per: 1, coin: 500000, fame: 8 },
    { id: 'drama',   icon: '🎭', name: '단체 드라마',   desc: '연기력이 곧 실력이에요',       w: { act: .8, fun: .2 },     per: 1, coin: 400000, fame: 12, wish: 1 }
  ];
  var LEVELS = [                       // [필요 인기도, 이름]
    [0, '신인 그룹'], [80, '라이징 그룹'], [240, '인기 그룹'], [560, '대세 그룹'], [1100, '국민 그룹'], [2000, '월드 스타']
  ];
  var ACC = '#7cc4ff';
  var Z = 976;
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var IDS = ['minjun', 'sion', 'doyun', 'harin', 'yuna', 'ara'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Number(n).toLocaleString(); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function name(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function emoji(cid) { try { return CHARS[cid].emoji; } catch (e) { return '⭐'; } }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // ── 저장 ──
  function load() {
    var s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!s.fame || typeof s.fame !== 'number') s.fame = 0;
    if (!s.total) s.total = 0;
    if (!Array.isArray(s.log)) s.log = [];
    if (s.day !== today()) { s.day = today(); s.used = {}; s.free = STA_FREE; s.ev = 0; }
    if (typeof s.ev !== 'number') s.ev = 0;
    if (typeof s.free !== 'number') s.free = STA_FREE;
    if (typeof s.potion !== 'number') s.potion = 0;
    if (!s.used || typeof s.used !== 'object') s.used = (s.day === today() && s.today) ? { stage: s.today } : {};
    delete s.today;
    if (s.group && (!Array.isArray(s.group.members) || !s.group.name)) s.group = null;
    return s;
  }
  function save(s) { if (s.log.length > 20) s.log.length = 20; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  // ── 게임 연결 ──
  function debutedIds() {
    var a = null; try { a = JSON.parse(localStorage.getItem('ph_agency') || 'null'); } catch (e) {}
    return IDS.filter(function (cid) { try { return !!(a && ((a.done && a.done[cid]) || (a.debut && a.debut[cid])) && CHARS[cid]); } catch (e) { return false; } });
  }
  function bond(cid) { try { return getAffectionGateLevel(cid) || 1; } catch (e) { return 1; } }
  function levelOf(fame) { var lv = 0; for (var i = 0; i < LEVELS.length; i++) if (fame >= LEVELS[i][0]) lv = i; return lv; }
  function addCoins(n) {
    try { coins = Math.max(0, coins + n); if (typeof saveAll === 'function') saveAll(); if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); } catch (e) {}
  }

  // ── 능력치 / 보상 계산 ──
  function statOf(cid, k) { try { if (typeof window.getIdolTrainStat === 'function') { var v = window.getIdolTrainStat(cid, k); if (typeof v === 'number') return v; } } catch (e) {} return STAT_DEFAULT; }
  function groupStats(members) {
    var o = {}; STATS.forEach(function (st) { o[st.k] = members.reduce(function (a, c) { return a + statOf(c, st.k); }, 0) / (members.length || 1); });
    return o;
  }
  function concept(gs) {
    var ks = STATS.map(function (st) { return st.k; }), hi = ks[0], lo = ks[0];
    ks.forEach(function (k) { if (gs[k] > gs[hi]) hi = k; if (gs[k] < gs[lo]) lo = k; });
    return (gs[hi] - gs[lo] <= 8) ? '올라운더 그룹' : CONCEPT[hi];
  }
  function powerOf(act, gs) { var p = 0; for (var k in act.w) p += act.w[k] * (gs[k] || 0); return p; }
  function tierOf(p) { var t = 0; for (var i = 0; i < TIERS.length; i++) if (p >= TIERS[i][0]) t = i; return t; }
  function pimg(file, px) { return '<img src="grp-' + file + '.png" alt="" width="' + px + '" height="' + px + '" loading="lazy" decoding="async" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain;vertical-align:middle;">'; }
  function sicon(st, px) { return pimg('stat-' + st.k, px); }
  function aicon(a, px) { return '<img src="grp-' + a.id + '.png" alt="' + esc(a.name) + '" width="' + px + '" height="' + px + '" loading="lazy" decoding="async" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain;vertical-align:middle;">'; }
  function actById(id) { return ACTS.filter(function (a) { return a.id === id; })[0]; }
  function reward(act, members, fame, big) {
    var n = members.length, avgBond = members.reduce(function (a, c) { return a + bond(c); }, 0) / n;
    var gs = groupStats(members), p = powerOf(act, gs), ti = tierOf(p), lv = levelOf(fame);
    var mb = (act.mb != null ? act.mb : MEMBER_BONUS);
    var mult = (1 + mb * (n - 1)) * (1 + BOND_BONUS * (avgBond / 20)) * (1 + LEVEL_BONUS * lv) * TIERS[ti][2];
    return {
      coin: Math.floor(act.coin * PAY_MULT * mult * (big ? BIG_MULT : 1)),
      fame: Math.floor((act.fame + FAME_PER_MEMBER * n) * (big ? BIG_MULT : 1)),
      power: p, tier: ti, bigChance: Math.min(BIG_MAX, BIG_BASE + p * BIG_PER_POWER), wishChance: act.wish ? Math.min(0.9, 0.25 + p / 150) : 0
    };
  }

  function potionPrice(s, n) {
    var live = s.group ? liveMembers(s) : [], small = POTION_MIN;
    if (live.length >= MIN_MEMBERS) {
      var avg = ACTS.reduce(function (a, act) { return a + reward(act, live, s.fame, false).coin; }, 0) / ACTS.length;
      small = Math.max(POTION_MIN, Math.floor(avg * POTION_RATE / 100000) * 100000);
    }
    return n === 1 ? small : Math.floor(small * POTION_BIG_RATE / 100000) * 100000;
  }

  // ── 그룹 활동 ──
  var LINES = {
    stage:   ['{m}의 하모니가 객석을 가득 채웠어요.', '팬들이 한목소리로 "{g}!"를 외쳤어요.', '무대 위 {m}, 호흡이 척척 맞았어요.'],
    album:   ['{g}의 목소리가 한 곡에 겹쳐졌어요. 녹음실 직원들이 박수를 쳤어요.', '후렴 하모니가 한 번에 녹음됐어요!', '마지막 코러스에서 소름이 돋았어요.'],
    dance:   ['칼군무! {g}의 챌린지 영상이 퍼지고 있어요.', '동선이 한 치도 안 어긋났어요.', '"{g} 챌린지"가 해시태그를 달았어요.'],
    variety: ['{m}의 티키타카에 스튜디오가 웃음바다가 됐어요.', '{g}가 방송 분량을 휩쓸었어요.', '게임에서 의외의 활약! 짤이 쏟아졌어요.'],
    photo:   ['{g}의 단체 컷이 화보 표지로 뽑혔어요.', '카메라 앞에서 {m} 모두 눈빛이 달랐어요.', '광고주가 "이 조합 그대로!"라고 외쳤대요.'],
    drama:   ['{m}의 연기 호흡이 감독님 마음에 쏙 들었어요.', '{g}의 장면이 방송 후 화제가 됐어요.', '눈물 연기에 현장이 조용해졌어요.']
  };
  var BIG_LINE = ['대성공! 현장이 들썩였어요 🎉', '오늘은 레전드예요 ✨', '모두가 기립박수를 쳤어요!'];
  function names(list) { return list.map(name).join(', '); }
  function liveMembers(s) { return s.group.members.filter(function (c) { return debutedIds().indexOf(c) !== -1; }); }
  // ── 🎲 돌발 이벤트 (호재 / 악재 / 선택) ──
  var EVENTS = {
    good: [
      { id: 'viral',  t: '📱 영상이 갑자기 화제가 됐어요!', coinMul: 0.3 },
      { id: 'fans',   t: '💖 팬들이 응원 트럭을 보냈어요!', famePlus: 15 },
      { id: 'senior', t: '🎁 선배 그룹이 간식차를 보내줬어요!', coinMul: 0.15, wish: 1 },
      { id: 'drink',  t: '☕ 스태프가 드링크를 챙겨줬어요! (체력 +1)', stamina: 1 }
    ],
    bad: [
      { id: 'sick',   t: '🤒 멤버 한 명이 컨디션 난조… 무대가 아쉬웠어요.', coinMul: -0.25 },
      { id: 'late',   t: '🚧 이동 중 차가 막혀 지각했어요.', coinMul: -0.15 },
      { id: 'rumor',  t: '🗞️ 근거 없는 구설이 돌았어요. 이번엔 인기도가 안 올라요.', coinMul: -0.1, fameMul: 0 },
      { id: 'tired',  t: '😮‍💨 스케줄이 길어져 다들 지쳤어요. (체력 -1)', stamina: -1 }
    ],
    choice: [
      { id: 'impromptu', t: '🎙️ 즉흥 무대 제안이 들어왔어요!', safe: '정중히 거절하고 마무리', risk: '도전! 즉흥으로 올라간다' },
      { id: 'sponsor',   t: '💼 갑작스런 협찬 계약 제안이 왔어요!', safe: '조건 낮은 계약으로 안전하게', risk: '큰 조건으로 협상해본다' }
    ]
  };
  var CH_SAFE = 0.08, CH_WIN = 0.45, CH_LOSE = 0.2;   // 선택형: 안전 +8% / 도전 성공 +45% 실패 -20% (활동 기본 보상 기준)
  function rollEvent(tier) {
    var goodShare = 0.30 + 0.06 * tier, x = Math.random(), kind = x < goodShare ? 'good' : (x < goodShare + 0.2 ? 'choice' : 'bad');
    var e = pick(EVENTS[kind]); return Object.assign({ kind: kind, tier: tier }, e);
  }
  function resolveChoice(res, risk) {
    var s = load(), ev = res.ev, base = ev.base, delta, win = false;
    if (!risk) delta = Math.floor(base * CH_SAFE);
    else { win = Math.random() < Math.min(0.75, 0.5 + 0.05 * ev.tier); delta = win ? Math.floor(base * CH_WIN) : -Math.floor(base * CH_LOSE); }
    addCoins(delta);
    s.log.unshift({ t: Date.now(), m: '🎲 ' + (risk ? (win ? '도전 성공' : '도전 실패') : '안전한 선택') + ' ' + (delta >= 0 ? '+' : '-') + fmt(Math.abs(delta)) + ' 코인' });
    save(s);
    return { delta: delta, win: win };
  }
  function doActivity(id) {
    var s = load(); if (!s.group) return null;
    var act = actById(id); if (!act) return null;
    if ((s.used[id] || 0) >= act.per) return { err: '오늘 ' + act.name + '은(는) 다 했어요 (하루 ' + act.per + '번). 내일 또 해요!' };
    if (s.free + s.potion < 1) return { err: '그룹 체력이 없어요. 체력 음료를 사거나 내일 다시 해요!' };
    var live = liveMembers(s);
    if (live.length < MIN_MEMBERS) return { err: '데뷔한 멤버가 ' + MIN_MEMBERS + '명 이상이어야 해요. 멤버를 바꿔주세요' };
    var r0 = reward(act, live, s.fame, false);
    var big = Math.random() < r0.bigChance;
    var r = big ? reward(act, live, s.fame, true) : r0;
    var wish = (act.wish && Math.random() < r.wishChance) ? (big ? 2 : 1) : 0;
    var ev = null; if (s.ev < EV_DAILY && Math.random() < EV_CHANCE) { ev = rollEvent(r.tier); s.ev++; }
    var coinGain = r.coin, fameGain = r.fame;
    if (ev && ev.kind !== 'choice') {
      if (ev.coinMul) coinGain = Math.max(0, Math.floor(r.coin * (1 + ev.coinMul)));
      if (ev.fameMul === 0) fameGain = 0;
      if (ev.famePlus) fameGain += ev.famePlus;
      if (ev.wish) wish += ev.wish;
    }
    if (ev && ev.kind === 'choice') ev.base = r.coin;
    var lv0 = levelOf(s.fame);
    addCoins(coinGain);
    if (wish) { try { if (typeof wishFragments !== 'undefined') { wishFragments += wish; localStorage.setItem('ph_wish', wishFragments); } if (typeof addToBag === 'function') addToBag('🧩', '소원의 조각', 'wish', wish, '100개 모으면 소원의 결정! (현재: ' + (typeof wishFragments !== 'undefined' ? wishFragments : '?') + '개)'); } catch (e) {} }
    if (s.free > 0) s.free--; else s.potion--;
    if (ev && ev.stamina) { if (ev.stamina > 0) s.free += ev.stamina; else if (s.free > 0) s.free--; else if (s.potion > 0) s.potion--; }
    s.fame += fameGain; s.total += 1; s.used[id] = (s.used[id] || 0) + 1;
    var lv1 = levelOf(s.fame);
    var line = pick(LINES[id]).replace(/\{m\}/g, names(live)).replace(/\{g\}/g, s.group.name) + (big ? ' ' + pick(BIG_LINE) : '');
    s.log.unshift({ t: Date.now(), m: act.icon + ' ' + act.name + ' (' + TIERS[r.tier][1] + (big ? '·대성공' : '') + ') +' + fmt(coinGain) + ' 코인' + (wish ? ' · 🧩' + wish : '') + (ev && ev.kind !== 'choice' ? ' · ' + ev.t.split(' ')[0] : '') });
    save(s);
    return { act: act, big: big, ev: ev, coin: coinGain, fame: fameGain, wish: wish, tier: TIERS[r.tier][1], line: line, levelUp: lv1 > lv0 ? LEVELS[lv1][1] : '', members: live };
  }

  // ── 화면 ──
  var ui = { edit: false, sel: [], name: '' };

  function closeOv() { var o = document.getElementById('grp-ov'); if (o) o.remove(); }
  function open() {
    var old = document.getElementById('grp-ov'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'grp-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:' + Z + ';background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:12px;' + FONT;
    ov.onclick = function (e) { if (e.target === ov) closeOv(); };
    document.body.appendChild(ov);
    var s = load(); ui.edit = !s.group; ui.sel = s.group ? s.group.members.slice() : []; ui.name = s.group ? s.group.name : '';
    render();
  }
  function shell(inner) {
    return '<div style="background:#14213d;border:1.5px solid ' + ACC + ';border-radius:18px;width:100%;max-width:380px;max-height:90vh;display:flex;flex-direction:column;color:#fff;">' +
      '<div style="padding:14px 16px 8px;display:flex;align-items:center;"><div style="font-size:16px;font-weight:900;">👥 내 그룹</div>' +
      '<button id="grp-x" style="margin-left:auto;border:none;border-radius:10px;background:rgba(255,255,255,0.1);color:#fff;padding:6px 12px;font-size:12px;font-weight:900;cursor:pointer;' + FONT + '">닫기</button></div>' +
      '<div style="padding:0 14px 16px;overflow-y:auto;-webkit-overflow-scrolling:touch;">' + inner + '</div></div>';
  }
  function btn(id, label, bg, extra) {
    return '<button id="' + id + '" style="width:100%;padding:13px;border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;background:' + bg + ';' + FONT + (extra || '') + '">' + label + '</button>';
  }

  function formHtml(s) {
    var ids = debutedIds();
    if (ids.length < MIN_MEMBERS && !s.group) {
      return '<div style="text-align:center;color:#9fb0d0;padding:28px 6px;font-size:13px;line-height:1.8;"><div style="font-size:40px;margin-bottom:6px;">🎤</div>그룹은 데뷔한 아이돌이 ' + MIN_MEMBERS + '명 이상 있어야 만들 수 있어요.<br>지금 데뷔한 아이돌: <b>' + ids.length + '명</b><br><span style="font-size:11.5px;">기획사에서 아이돌을 더 데뷔시켜 봐요!</span></div>';
    }
    var chips = ids.map(function (cid) {
      var on = ui.sel.indexOf(cid) !== -1;
      return '<button data-m="' + cid + '" style="padding:9px 12px;border-radius:12px;font-size:13px;font-weight:900;cursor:pointer;color:#fff;' + FONT + 'border:1.5px solid ' + (on ? ACC : 'rgba(255,255,255,0.2)') + ';background:' + (on ? 'rgba(124,196,255,0.22)' : 'rgba(255,255,255,0.06)') + ';">' + esc(emoji(cid)) + ' ' + esc(name(cid)) + (on ? ' ✓' : '') + '</button>';
    }).join('');
    var n = ui.sel.length, ok = n >= MIN_MEMBERS && n <= MAX_MEMBERS && String(ui.name).trim().length >= 1;
    return '<div style="font-size:12px;color:#9fb0d0;margin-bottom:6px;">그룹 이름 (최대 ' + NAME_MAX + '글자)</div>' +
      '<input id="grp-name" maxlength="' + NAME_MAX + '" value="' + esc(ui.name) + '" placeholder="예) 포카걸즈" style="width:100%;box-sizing:border-box;padding:11px;border-radius:12px;border:1.5px solid rgba(255,255,255,0.2);background:#fff8ec;color:#3a2a1e;font-size:14px;outline:none;' + FONT + '">' +
      '<div style="font-size:12px;color:#9fb0d0;margin:12px 0 6px;">멤버 고르기 (' + MIN_MEMBERS + '~' + MAX_MEMBERS + '명 · 데뷔한 아이돌만) — <b style="color:' + (n >= MIN_MEMBERS ? '#9fe8b0' : '#ffd76a') + ';">' + n + '/' + MAX_MEMBERS + '</b></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px;">' + chips + '</div>' +
      btn('grp-save', s.group ? '✅ 저장하기' : '👥 그룹 만들기', ok ? 'linear-gradient(135deg,#4aa8ff,#7c5cff)' : 'rgba(255,255,255,0.12)', ok ? '' : 'opacity:0.6;') +
      (s.group ? '<button id="grp-cancel" style="width:100%;margin-top:8px;padding:11px;border:none;border-radius:12px;color:#c9d6f0;font-size:13px;font-weight:900;cursor:pointer;background:rgba(255,255,255,0.08);' + FONT + '">취소</button>' : '') +
      '<div style="font-size:10.5px;color:#7f90b3;text-align:center;margin-top:10px;line-height:1.6;">그룹은 1개만, 한 아이돌은 한 그룹에만 들어가요.<br>그룹을 만들어도 개인 활동은 그대로 할 수 있어요.</div>';
  }

  function mainHtml(s) {
    var g = s.group, lv = levelOf(s.fame), nextAt = LEVELS[lv + 1] ? LEVELS[lv + 1][0] : null, curAt = LEVELS[lv][0];
    var pct = nextAt ? Math.min(100, Math.floor((s.fame - curAt) / (nextAt - curAt) * 100)) : 100;
    var live = liveMembers(s), ok = live.length >= MIN_MEMBERS, gs = ok ? groupStats(live) : null;
    var mem = g.members.map(function (cid) {
      return '<div style="text-align:center;flex:1;min-width:0;"><div style="font-size:30px;">' + esc(emoji(cid)) + '</div><div style="font-size:11.5px;font-weight:900;margin-top:2px;">' + esc(name(cid)) + '</div><div style="font-size:10px;color:#9fb0d0;">인연 Lv.' + bond(cid) + '</div></div>';
    }).join('');
    var bars = gs ? STATS.map(function (st) {
      var v = Math.round(gs[st.k]);
      return '<div style="display:flex;align-items:center;gap:6px;margin-top:4px;"><div style="width:56px;font-size:10.5px;color:#c9d6f0;white-space:nowrap;">' + sicon(st, 16) + ' ' + st.name + '</div><div style="flex:1;height:7px;border-radius:5px;background:rgba(255,255,255,0.1);overflow:hidden;"><div style="width:' + Math.min(100, v) + '%;height:100%;background:' + st.color + ';"></div></div><div style="width:24px;text-align:right;font-size:10.5px;font-weight:900;">' + v + '</div></div>';
    }).join('') : '';
    var sta = s.free + s.potion, pips = '';
    for (var i = 0; i < STA_FREE; i++) pips += '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;margin-right:4px;background:' + (i < s.free ? '#7fe8b0' : 'rgba(255,255,255,0.15)') + ';"></span>';
    var best = null;
    if (gs) ACTS.forEach(function (a) { var p = powerOf(a, gs); if (!best || p > best.p) best = { id: a.id, p: p }; });
    var cards = ACTS.map(function (a) {
      var used = s.used[a.id] || 0, left = a.per - used;
      var r = ok ? reward(a, live, s.fame, false) : null;
      var need = Object.keys(a.w).map(function (k) { var st = STATS.filter(function (x) { return x.k === k; })[0]; return sicon(st, 13) + st.name; }).join(' · ');
      var can = ok && left > 0 && sta > 0;
      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 11px;margin-bottom:7px;border-radius:13px;background:rgba(255,255,255,0.06);border:1.5px solid ' + (best && best.id === a.id ? '#ffd76a' : 'rgba(255,255,255,0.12)') + ';">' +
        '<div style="width:46px;height:46px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">' + aicon(a, 46) + '</div><div style="flex:1;min-width:0;">' +
        '<div style="font-size:13px;font-weight:900;">' + esc(a.name) + (best && best.id === a.id ? ' <span style="font-size:10px;color:#ffd76a;">⭐ 우리 그룹 강점</span>' : '') + '</div>' +
        '<div style="font-size:10.5px;color:#9fb0d0;margin-top:1px;">' + esc(a.desc) + '</div>' +
        '<div style="font-size:10.5px;color:#c9d6f0;margin-top:3px;">필요: ' + need + (r ? ' · 예상 <b style="color:#ffe08a;">' + TIERS[r.tier][1] + '</b> · 약 ' + fmt(r.coin) + ' 코인' + (a.wish ? ' · 🧩' : '') : '') + '</div></div>' +
        '<button data-act="' + a.id + '" style="flex-shrink:0;padding:9px 11px;border:none;border-radius:11px;color:#fff;font-size:12px;font-weight:900;cursor:pointer;background:' + (can ? 'linear-gradient(135deg,#ff6b9d,#c084fc)' : 'rgba(255,255,255,0.12)') + ';' + (can ? '' : 'opacity:0.6;') + FONT + '">' + (left <= 0 ? '완료' : sta < 1 ? '체력 없음' : '하기 ' + used + '/' + a.per) + '</button></div>';
    }).join('');
    var logs = s.log.slice(0, 5).map(function (l) { return '<div style="padding:6px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:11.5px;color:#dbe6ff;">' + esc(l.m) + '</div>'; }).join('');
    return '<div style="background:linear-gradient(135deg,rgba(74,168,255,0.18),rgba(124,92,255,0.18));border:1.5px solid rgba(124,196,255,0.5);border-radius:16px;padding:14px;margin-bottom:12px;">' +
      '<div style="text-align:center;margin-bottom:2px;">' + pimg('lv' + lv, 72) + '</div>' +
      '<div style="text-align:center;font-size:19px;font-weight:900;">' + esc(g.name) + '</div>' +
      '<div style="text-align:center;font-size:11.5px;color:#ffe08a;margin:3px 0 2px;">⭐ ' + esc(LEVELS[lv][1]) + ' (Lv.' + (lv + 1) + ')' + (gs ? ' · <span style="color:#9fd8ff;">' + esc(concept(gs)) + '</span>' : '') + '</div>' +
      '<div style="display:flex;gap:6px;margin:10px 0;">' + mem + '</div>' + bars +
      '<div style="height:8px;border-radius:6px;background:rgba(255,255,255,0.12);overflow:hidden;margin-top:12px;"><div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#4aa8ff,#c084fc);"></div></div>' +
      '<div style="font-size:10.5px;color:#9fb0d0;margin-top:4px;text-align:center;">인기도 ' + fmt(s.fame) + (nextAt ? ' / ' + fmt(nextAt) + ' (다음: ' + esc(LEVELS[lv + 1][1]) + ')' : ' (최고 레벨!)') + '</div></div>' +
      (ok ? '' : '<div style="font-size:12px;color:#ffb0b0;text-align:center;margin-bottom:8px;">데뷔한 멤버가 ' + MIN_MEMBERS + '명 이상이어야 활동할 수 있어요. 멤버를 바꿔주세요.</div>') +
      '<div style="display:flex;align-items:center;gap:8px;padding:9px 11px;margin-bottom:8px;border-radius:12px;background:rgba(127,232,176,0.1);border:1px solid rgba(127,232,176,0.35);">' +
        '<div style="flex:1;"><div style="font-size:11px;color:#c9f0dc;font-weight:900;">' + pimg('potion', 18) + ' 그룹 체력 (오늘 무료 ' + s.free + '/' + STA_FREE + (s.potion ? ' + 음료 ' + s.potion : '') + ')</div><div style="margin-top:4px;">' + pips + '</div></div>' +
        '<button data-buy="1" style="padding:7px 9px;border:none;border-radius:10px;color:#fff;font-size:10.5px;font-weight:900;cursor:pointer;background:rgba(255,255,255,0.14);line-height:1.35;' + FONT + '">🥤 소 1회<br>' + fmt(potionPrice(s, 1) / 10000) + '만</button>' +
        '<button data-buy="3" style="padding:7px 9px;border:none;border-radius:10px;color:#fff;font-size:10.5px;font-weight:900;cursor:pointer;background:rgba(255,255,255,0.14);line-height:1.35;' + FONT + '">🥤 대 3회<br>' + fmt(potionPrice(s, 3) / 10000) + '만</button></div>' +
      '<div style="font-size:11.5px;color:#9fb0d0;font-weight:900;margin-bottom:6px;">그룹 활동 <span style="font-weight:500;">(하루마다 횟수가 새로 채워져요)</span></div>' + cards +
      '<div style="display:flex;gap:8px;margin-top:8px;"><button id="grp-edit" style="flex:1;padding:11px;border:none;border-radius:12px;color:#fff;font-size:12.5px;font-weight:900;cursor:pointer;background:rgba(255,255,255,0.1);' + FONT + '">✏️ 멤버·이름 바꾸기</button>' +
      '<button id="grp-del" style="flex:1;padding:11px;border:none;border-radius:12px;color:#ffb0b0;font-size:12.5px;font-weight:900;cursor:pointer;background:rgba(255,80,80,0.12);' + FONT + '">그룹 해체</button></div>' +
      (logs ? '<div style="margin-top:12px;font-size:11px;color:#9fb0d0;font-weight:900;">최근 활동</div>' + logs : '') +
      '<div style="font-size:10.5px;color:#7f90b3;text-align:center;margin-top:10px;line-height:1.6;">멤버의 능력치(레슨으로 키워요)가 높을수록 활동 등급이 올라가요.<br>멤버를 바꾸면 잘하는 활동도 달라져요!</div>';
  }

  function render() {
    var ov = document.getElementById('grp-ov'); if (!ov) return;
    var s = load();
    ov.innerHTML = shell(ui.edit || !s.group ? formHtml(s) : mainHtml(s));
    bind(ov, s);
  }

  function evHtml(ev) {
    var col = ev.kind === 'good' ? '#9dffb0' : (ev.kind === 'bad' ? '#ff9a9a' : '#ffe08a');
    var h = '<div id="grp-evbox" style="margin-top:12px;padding:10px;border-radius:12px;background:rgba(255,255,255,0.07);border:1px solid ' + col + ';"><div style="font-size:12.5px;font-weight:800;color:' + col + ';line-height:1.6;">' + pimg('ev-' + ev.kind, 22) + ' ' + esc(ev.t) + '</div>';
    if (ev.kind === 'choice') {
      var bs = 'width:100%;margin-top:6px;padding:9px;border:none;border-radius:10px;color:#fff;font-size:12.5px;font-weight:800;cursor:pointer;' + FONT;
      h += '<button id="grp-ca" style="' + bs + 'background:#3a4a78;">🛡️ ' + esc(ev.safe) + ' (+' + Math.round(CH_SAFE * 100) + '%)</button>' +
           '<button id="grp-cb" style="' + bs + 'background:linear-gradient(135deg,#ff7a59,#ff4f8b);">🔥 ' + esc(ev.risk) + ' (+' + Math.round(CH_WIN * 100) + '% / -' + Math.round(CH_LOSE * 100) + '%)</button>';
    }
    return h + '</div>';
  }
  function popup(res) {
    var ov = document.getElementById('grp-ov'); if (!ov) return;
    var m = res.members.map(function (c) { return esc(emoji(c)); }).join(' ');
    var p = document.createElement('div');
    p.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:18px;z-index:2;';
    p.innerHTML = '<div style="background:#1b2a52;border:2px solid ' + (res.big ? '#ffd76a' : ACC) + ';border-radius:18px;padding:20px 18px;max-width:320px;width:100%;text-align:center;color:#fff;' + FONT + '">' +
      '<div style="font-size:34px;margin-bottom:4px;">' + m + '</div>' +
      '<div style="font-size:16px;font-weight:900;color:' + (res.big ? '#ffd76a' : '#fff') + ';">' + aicon(res.act, 26) + ' ' + esc(res.act.name) + ' — ' + (res.big ? '🌟 대성공!' : esc(res.tier)) + '</div>' +
      (res.big ? '<div style="font-size:11px;color:#ffe08a;margin-top:2px;">(기본 등급: ' + esc(res.tier) + ')</div>' : '') +
      '<div style="font-size:12.5px;color:#dbe6ff;line-height:1.7;margin:8px 0 10px;">' + esc(res.line) + '</div>' +
      '<div style="font-size:15px;font-weight:900;color:#ffe08a;">+' + fmt(res.coin) + ' 코인</div>' +
      (res.wish ? '<div style="font-size:13px;font-weight:900;color:#ffb0e0;margin-top:2px;">🧩 소원의 조각 +' + res.wish + '</div>' : '') +
      '<div style="font-size:12px;color:#9fd8ff;margin-top:2px;">그룹 인기도 +' + res.fame + '</div>' +
      (res.ev ? evHtml(res.ev) : '') +
      (res.levelUp ? '<div style="margin-top:10px;font-size:13px;font-weight:900;color:#ff9ecb;">🎊 그룹 레벨 업! → ' + esc(res.levelUp) + '</div>' : '') +
      '<button id="grp-pok" style="' + (res.ev && res.ev.kind === 'choice' ? 'display:none;' : '') + 'margin-top:14px;width:100%;padding:12px;border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;background:linear-gradient(135deg,#4aa8ff,#7c5cff);' + FONT + '">확인</button></div>';
    ov.appendChild(p);
    p.querySelector('#grp-pok').onclick = function () { p.remove(); render(); };
    if (res.ev && res.ev.kind === 'choice') {
      var box = p.querySelector('#grp-evbox');
      var pickIt = function (risk) {
        var o = resolveChoice(res, risk);
        box.innerHTML = '<div style="font-size:13px;font-weight:900;color:' + (o.delta >= 0 ? '#9dffb0' : '#ff9a9a') + ';">' + (risk ? (o.win ? '🎉 도전 성공!' : '😢 아쉽게 실패…') : '👍 안전하게 마무리') + ' ' + (o.delta >= 0 ? '+' : '-') + fmt(Math.abs(o.delta)) + ' 코인</div>';
        p.querySelector('#grp-pok').style.display = 'block';
      };
      p.querySelector('#grp-ca').onclick = function () { pickIt(false); };
      p.querySelector('#grp-cb').onclick = function () { pickIt(true); };
    }
  }
  function toast(m) {
    try {
      var old = document.getElementById('grp-toast'); if (old) old.remove();
      var el = document.createElement('div'); el.id = 'grp-toast';
      el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(20,33,61,0.97);border:1.5px solid ' + ACC + ';color:#fff;padding:11px 20px;border-radius:20px;font-size:13px;font-weight:800;z-index:2600;max-width:90vw;text-align:center;line-height:1.5;' + FONT;
      el.textContent = m; document.body.appendChild(el); setTimeout(function () { if (el.parentNode) el.remove(); }, 3200);
    } catch (e) {}
  }

  function bind(ov, s) {
    var x = ov.querySelector('#grp-x'); if (x) x.onclick = closeOv;
    var nm = ov.querySelector('#grp-name'); if (nm) nm.addEventListener('input', function () { ui.name = nm.value; var b = ov.querySelector('#grp-save'); if (b) { var ok = ui.sel.length >= MIN_MEMBERS && ui.sel.length <= MAX_MEMBERS && nm.value.trim().length >= 1; b.style.opacity = ok ? '1' : '0.6'; b.style.background = ok ? 'linear-gradient(135deg,#4aa8ff,#7c5cff)' : 'rgba(255,255,255,0.12)'; } });
    Array.prototype.forEach.call(ov.querySelectorAll('[data-m]'), function (b) {
      b.onclick = function () {
        var cid = b.getAttribute('data-m'), i = ui.sel.indexOf(cid);
        if (nm) ui.name = nm.value;
        if (i !== -1) ui.sel.splice(i, 1);
        else if (ui.sel.length >= MAX_MEMBERS) { toast('멤버는 최대 ' + MAX_MEMBERS + '명까지예요'); return; }
        else ui.sel.push(cid);
        render();
      };
    });
    var sv = ov.querySelector('#grp-save');
    if (sv) sv.onclick = function () {
      var nmv = String(ui.name || '').trim();
      if (ui.sel.length < MIN_MEMBERS) { toast('멤버를 ' + MIN_MEMBERS + '명 이상 골라주세요'); return; }
      if (!nmv) { toast('그룹 이름을 지어주세요'); return; }
      var st = load(); var first = !st.group;
      st.group = { name: Array.from(nmv).slice(0, NAME_MAX).join(''), members: ui.sel.slice(), made: st.group ? st.group.made : Date.now() };
      save(st); ui.edit = false; toast(first ? '👥 그룹 "' + st.group.name + '" 결성!' : '저장했어요'); render();
    };
    var cn = ov.querySelector('#grp-cancel'); if (cn) cn.onclick = function () { ui.edit = false; render(); };
    var ed = ov.querySelector('#grp-edit'); if (ed) ed.onclick = function () { var st = load(); ui.sel = st.group.members.slice(); ui.name = st.group.name; ui.edit = true; render(); };
    var dl = ov.querySelector('#grp-del');
    if (dl) dl.onclick = function () {
      if (dl.getAttribute('data-sure') !== '1') { dl.setAttribute('data-sure', '1'); dl.textContent = '정말 해체? 한 번 더 누르기'; setTimeout(function () { if (dl.parentNode) { dl.setAttribute('data-sure', '0'); dl.textContent = '그룹 해체'; } }, 3500); return; }
      var st = load(); st.group = null; st.fame = 0; st.total = 0; st.log = []; save(st); ui.edit = true; ui.sel = []; ui.name = ''; toast('그룹을 해체했어요'); render();
    };
    Array.prototype.forEach.call(ov.querySelectorAll('[data-buy]'), function (b) {
      b.onclick = function () {
        var n = +b.getAttribute('data-buy'), price = potionPrice(load(), n), have = 0;
        try { have = coins; } catch (e) {}
        if (have < price) { toast('코인이 부족해요 (' + fmt(price) + ' 필요)'); return; }
        addCoins(-price); var st = load(); st.potion += n; save(st); toast('🥤 체력 음료로 활동 ' + n + '회를 더 할 수 있어요'); render();
      };
    });
    Array.prototype.forEach.call(ov.querySelectorAll('[data-act]'), function (b) {
      b.onclick = function () { var res = doActivity(b.getAttribute('data-act')); if (!res) return; if (res.err) { toast(res.err); return; } popup(res); };
    });
  }

  // ── 더보기 메뉴 타일 ──
  function whenReady(cond, fn) { if (cond()) fn(); else setTimeout(function () { whenReady(cond, fn); }, 150); }
  whenReady(function () { return typeof window.openMoreMenu === 'function' && typeof window.moreMenuTileHtml === 'function'; }, function () {
    var orig = window.openMoreMenu;
    if (orig.__grpWrapped) return;
    var w = function () {
      var res = orig.apply(this, arguments);
      try {
        var grid = document.getElementById('more-menu-grid');
        if (grid && !document.getElementById('more-group-tile')) {
          grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('🧑‍🎤', '그룹', ACC, 'openGroup()'));
          if (grid.lastElementChild) grid.lastElementChild.id = 'more-group-tile';
        }
      } catch (e) {}
      return res;
    };
    w.__grpWrapped = true; window.openMoreMenu = w;
  });

  window.openGroup = open;
  window.__groupTest = { potionPrice: potionPrice, load: load, save: save, reward: reward, doActivity: doActivity, groupStats: groupStats, concept: concept, powerOf: powerOf, tierOf: tierOf, levelOf: levelOf, debutedIds: debutedIds, ACTS: ACTS, TIERS: TIERS };
})();
