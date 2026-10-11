// ════════════════════════════════
// 🕶️ 몰래 활동 · 스캔들 (secret-act.js) — 아이돌이 사건사고를 일으킨다
// "하루 보내기"로 날짜가 넘어갈 때 가끔 데뷔한 아이돌이 몰래 뭔가를 한다. 파파라치에게 들키느냐 아니냐로 결과가 갈린다.
//  · 착한 일(몰래 봉사 / 팬에게 몰래 선물): 들키면 인지도·팬카페 회원이 오르고, 안 들키면 기분이 좋아진다.
//  · 나쁜 일(몰래 데이트 / 클럽 / 야식): 들키면 컨디션이 크게 떨어지고(큰 건은) 수입이 반토막 난다. 안 들키면 은근한 이득.
//  · 수입 반토막 = ① 그 아이돌이 쌓아둔 기획사 수익이 절반으로 ② 이틀(하루 보내기 2번) 동안 일정 정산(드라마·컴백·음방)이 절반.
//  · 플레이어가 고른다: 모른 척 / 조용히 막기(코인) / (착한 일) 슬쩍 알리기 / (나쁜 일) 따끔하게 말하기.
//  · 기분이 낮은 아이돌일수록 클럽·데이트 같은 일탈이 잘 터진다 → 식사·관리로 컨디션을 챙길 이유.
//  · 열애설 의혹(경고)을 방치하면 나중에 '열애설 기사'(위기)가 터진다. 그룹 멤버면 그룹 인기도도 흔들린다 (해체는 절대 안 됨, 인기도만 최대 15% 감소).
//  · 능력치(레슨)와 카드·강화는 건드리지 않는다. 컨디션(비주얼·체력·기분)과 코인·인지도·팬카페만 움직인다.
// 저장: localStorage 'ph_secret' (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// 테스트용 주소: ?secret=volunteer / gift / dating / club / snack / warning / crisis (데뷔한 아이돌 중 한 명에게 바로 시작)
// 값을 바꾸고 싶으면 아래 [설정]과 EV 만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';
  if (window.__secretActLoaded) return; window.__secretActLoaded = true;

  // ── [설정] ──
  var KEY = 'ph_secret';
  var BASE_CHANCE = 0.20;       // 하루 보내기 때 사건이 터질 기본 확률
  var PITY_PER_DAY = 0.04;      // 마지막 사건 뒤로 하루마다 더해지는 확률
  var CHANCE_MAX = 0.5;
  var COVER_COST = 1000000;     // 🛡️ 조용히 막기 비용(코인)
  var BLOCK_MULT = 0.2;         // 막으면 들킬 확률 ×0.2
  var SCOLD_MULT = 0.6;         // 따끔하게 말하면 들킬 확률 ×0.6 (기분 −6)
  var PEN_DAYS = 2;             // 수입 반토막 기간 (하루 보내기 횟수)
  var PEN_MULT = 0.5;           // 일정 정산 배율
  var CRISIS_P = 0.5;           // 열애설 의혹을 방치한 아이돌에게, 사건이 터질 때 위기가 될 확률
  var FINE_COST = 2000000;      // 열애설 의혹 바로 해명 비용
  var OFFICIAL_COST = 3000000;  // 위기 때 공식 입장문 비용
  var GROUP_LOSS_OFFICIAL = 0.05, GROUP_LOSS_SILENT = 0.15;   // 그룹 인기도 감소 비율 (그룹 멤버일 때만)
  var ACC = '#FFD700';
  var FONT = "font-family:'Noto Sans KR',sans-serif;";

  // ── 사건 목록 ──
  //  kind: good(착한 일) / bad(나쁜 일) / light(가벼운 일, 수입 페널티 없음)
  //  base: 들킬 기본 확률 / w: 아이돌별 잘 터지는 정도 / ok: 안 들켰을 때 / caught: 들켰을 때
  //  fx 키: m 기분 / s 체력 / v 비주얼 / c 코인 / f 팬카페 회원 / fame 인지도(%) ;  scandal:true 면 수입 반토막
  var EV = {
    volunteer: { kind: 'good', icon: '🤲', head: '{n}이(가) 몰래 보육원에 다녀온 것 같아요',
      sub: '아무에게도 말하지 않고 혼자 봉사활동을 하러 갔대요. 그런데 근처에 카메라를 든 사람이 보여요…', base: 0.4,
      w: { minjun: 1, sion: 3, doyun: 1, harin: 2, yuna: 2, ara: 1 },
      ok: { r: '{n}은(는) 아무도 모르게 조용히 아이들과 시간을 보냈어요.\n돌아오는 길, 마음이 한결 따뜻해졌어요.', fx: { m: 10 } },
      caught: { r: '봉사하는 모습이 SNS에 퍼졌어요!\n"이런 아이돌 처음 봐" 하며 칭찬이 쏟아져요.', fx: { m: 6, f: 40, fame: 8 } } },
    gift: { kind: 'good', icon: '🎁', head: '{n}이(가) 팬 한 명에게 몰래 선물을 남겼어요',
      sub: '팬카페에 힘들다는 글을 남긴 팬에게 몰래 선물을 보낸 모양이에요. 누군가 그 장면을 보고 있어요…', base: 0.35,
      w: { minjun: 2, sion: 1, doyun: 1, harin: 1, yuna: 3, ara: 2 },
      ok: { r: '선물을 받은 팬은 눈물이 날 만큼 기뻐했어요.\n{n}은(는) 모른 척 웃기만 해요.', fx: { m: 10, f: 10 } },
      caught: { r: '팬이 선물 인증글을 올렸어요!\n"우리 {n} 천사 아니냐"며 팬카페가 들썩여요.', fx: { m: 6, f: 60, fame: 6 } } },
    dating: { kind: 'bad', icon: '💘', head: '{n}이(가) 누군가와 몰래 만나고 있어요',
      sub: '오늘 밤 조용한 곳에서 만난다는 소문이에요. 밖에는 파파라치 차량이 서성이고 있어요…', base: 0.5,
      w: { minjun: 2, sion: 1, doyun: 1, harin: 2, yuna: 1, ara: 2 },
      ok: { r: '아무에게도 들키지 않았어요.\n{n}은(는) 하루 종일 얼굴에서 웃음이 떠나지 않아요.', fx: { m: 12, v: 5 } },
      caught: { r: '📸 파파라치에게 딱 걸렸어요!\n"{n} 열애설?!" 기사가 쏟아지고 협찬이 줄줄이 흔들려요.', fx: { m: -15, v: -10, f: -15 }, scandal: true } },
    club: { kind: 'bad', icon: '🍸', head: '{n}이(가) 몰래 클럽에 갔어요',
      sub: '스트레스가 쌓였는지 연락도 없이 나가버렸어요. 근처에 파파라치가 있을지도 몰라요…', base: 0.5,
      w: { minjun: 3, sion: 1, doyun: 2, harin: 1, yuna: 1, ara: 1 },
      ok: { r: '밤새 놀고 새벽에 몰래 들어왔어요.\n들키진 않았지만 몸이 말이 아니에요.', fx: { s: -15, m: 6 } },
      caught: { r: '📸 클럽에서 나오는 모습이 그대로 찍혔어요!\n"{n}, 심야 클럽 논란" 기사가 퍼져요.', fx: { m: -25, s: -20, v: -20, f: -20 }, scandal: true } },
    snack: { kind: 'light', icon: '🍜', head: '{n}이(가) 한밤중에 라면 세 봉지를 끓였어요',
      sub: '다이어트 중이라던 {n}이(가) 새벽 부엌에서 발견됐어요. 창밖에 누가 서 있는 것 같기도 한데…', base: 0.3,
      w: { minjun: 1, sion: 1, doyun: 1, harin: 1, yuna: 2, ara: 1 },
      ok: { r: '새벽 라면은 정말 맛있었어요.\n다음 날 얼굴이 퉁퉁 붓긴 했지만요.', fx: { m: 8, v: -6 } },
      caught: { r: '폭풍 먹방 직찍이 퍼졌어요!\n"의외의 모습"이라며 오히려 귀엽다는 반응도 있어요.', fx: { m: -4, v: -6, f: 10 } } }
  };
  var EV_ORDER = ['volunteer', 'gift', 'dating', 'club', 'snack'];

  // ── 저장 ──
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (typeof s.lastDay !== 'number') s.lastDay = null;
    if (typeof s.sinceDay !== 'number') s.sinceDay = 1;
    if (typeof s.total !== 'number') s.total = 0;
    if (!s.pen || typeof s.pen !== 'object') s.pen = {};      // { cid: 이 날짜가 되기 전까지 수입 반토막 (게임 DAY) }
    if (!s.warn || typeof s.warn !== 'object') s.warn = {};   // { cid: 1 } 열애설 의혹을 방치한 아이돌
    return s;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} if (typeof saveAll === 'function') { try { saveAll(); } catch (e) {} } }

  // ── 게임 데이터 읽기 ──
  function mealState() { try { return JSON.parse(localStorage.getItem('ph_meal') || '{}') || {}; } catch (e) { return {}; } }
  function debuted() {
    try { var d = (JSON.parse(localStorage.getItem('ph_agency') || '{}') || {}).done || {}; return Object.keys(d).filter(function (k) { return d[k] && typeof CHARS !== 'undefined' && CHARS[k]; }); } catch (e) { return []; }
  }
  function nameOf(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function moodOf(cid) { var st = mealState(); var o = st.stat && st.stat[cid]; return o && typeof o.m === 'number' ? o.m : 50; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function nl(s) { return esc(s).replace(/\n/g, '<br>'); }
  function fill(t, cid) { var n = nameOf(cid); return String(t).replace(/\{n\}/g, n); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function toast(m) { if (typeof showBagToast === 'function') { try { showBagToast(m); } catch (e) {} } }
  function money() { try { return Math.floor(coins); } catch (e) { return 0; } }
  function popupOpen() { return !!(document.getElementById('secret-pop') || document.getElementById('happening-pop') || document.getElementById('meal-event') || document.getElementById('issue-pop') || document.getElementById('rising-overlay') || document.getElementById('meal-book-overlay')); }
  function penActive(cid) { var s = load(); var u = s.pen[cid]; var d = mealState().day || 1; return typeof u === 'number' && d < u; }
  function penLeft(cid) { var s = load(); var u = s.pen[cid]; var d = mealState().day || 1; return typeof u === 'number' && d < u ? (u - d) : 0; }
  function inGroup(cid) { try { var g = (JSON.parse(localStorage.getItem('ph_group') || '{}') || {}).group; return !!(g && Array.isArray(g.members) && g.members.indexOf(cid) !== -1); } catch (e) { return false; } }

  // ── 효과 적용 ──
  function applyFx(cid, fx) {
    fx = fx || {};
    if (fx.m || fx.s || fx.v) {
      try {
        var st = JSON.parse(localStorage.getItem('ph_meal') || '{}') || {};
        if (!st.stat) st.stat = {};
        var sv = st.stat[cid] || (st.stat[cid] = { v: 50, s: 50, m: 50 });
        var cl = function (x) { return Math.max(0, Math.min(100, x)); };
        if (fx.m) sv.m = cl((sv.m == null ? 50 : sv.m) + fx.m);
        if (fx.s) sv.s = cl((sv.s == null ? 50 : sv.s) + fx.s);
        if (fx.v) sv.v = cl((sv.v == null ? 50 : sv.v) + fx.v);
        localStorage.setItem('ph_meal', JSON.stringify(st));
      } catch (e) {}
    }
    if (fx.c && typeof coins !== 'undefined') { coins = Math.max(0, coins + fx.c); try { if (typeof saveAll === 'function') saveAll(); } catch (e) {} }
    if (fx.f && window.__fancafeTest) {
      try {
        var T = window.__fancafeTest, s = T.loadAll();
        if (s.idols[cid]) { s.idols[cid].anon = Math.max(0, (s.idols[cid].anon || 0) + fx.f); T.saveAllState(s); }
      } catch (e) {}
    }
    if (fx.fame) {   // 드라마 인지도 (탑스타 승급 게이지, %). 자동 승급은 안 되게 99%까지만
      try {
        var d = JSON.parse(localStorage.getItem('ph_drama') || 'null');
        if (d && typeof d === 'object') {
          if (!d.fame) d.fame = {};
          d.fame[cid] = Math.max(0, Math.min(99, (d.fame[cid] || 0) + fx.fame));
          localStorage.setItem('ph_drama', JSON.stringify(d));
        }
      } catch (e) {}
    }
  }
  function halveAgency(cid) {   // 쌓여 있던 기획사 수익을 절반으로 (쌓일 수 있는 최대 시간 기준)
    try {
      var a = JSON.parse(localStorage.getItem('ph_agency') || '{}') || {};
      if (!a.debut || !a.debut[cid]) return false;
      var cap = 8; try { if (typeof window.__incomeCapBonus === 'function') cap += Number(window.__incomeCapBonus()) || 0; } catch (e) {}
      var now = Date.now(), hours = Math.min(cap, Math.max(0, (now - a.debut[cid]) / 3600000));
      a.debut[cid] = Math.floor(now - (hours / 2) * 3600000);
      localStorage.setItem('ph_agency', JSON.stringify(a));
      return true;
    } catch (e) { return false; }
  }
  function cutGroupFame(cid, pct) {
    if (!inGroup(cid)) return false;
    try {
      var g = JSON.parse(localStorage.getItem('ph_group') || '{}') || {};
      if (typeof g.fame !== 'number' || g.fame <= 0) return false;
      g.fame = Math.floor(g.fame * (1 - pct));
      localStorage.setItem('ph_group', JSON.stringify(g));
      return true;
    } catch (e) { return false; }
  }
  function startScandal(cid, groupLoss) {
    var s = load(), d = mealState().day || 1;
    s.pen[cid] = d + PEN_DAYS; save(s);
    var out = { pen: PEN_DAYS, acc: halveAgency(cid), grp: false };
    if (groupLoss) out.grp = cutGroupFame(cid, groupLoss);
    return out;
  }
  function fxChips(fx, extra) {
    var out = [];
    if (fx.m) out.push((fx.m > 0 ? '😊 기분 +' : '😢 기분 ') + fx.m);
    if (fx.s) out.push((fx.s > 0 ? '💪 체력 +' : '💪 체력 ') + fx.s);
    if (fx.v) out.push((fx.v > 0 ? '✨ 비주얼 +' : '✨ 비주얼 ') + fx.v);
    if (fx.c) out.push('🍔 ' + (fx.c > 0 ? '+' : '') + fx.c.toLocaleString());
    if (fx.f) out.push('👥 팬카페 회원 ' + (fx.f > 0 ? '+' : '') + fx.f);
    if (fx.fame) out.push('⭐ 인지도 +' + fx.fame + '%');
    if (extra) {
      if (extra.pen) out.push('🔥 일정 정산 −50% (' + extra.pen + '일)');
      if (extra.acc) out.push('💼 쌓인 기획사 수익 −50%');
      if (extra.grp) out.push('👥 그룹 인기도 하락');
    }
    return out.map(function (t) { return '<span style="display:inline-block;margin:3px;padding:5px 11px;border-radius:999px;border:1.5px solid ' + ACC + ';font-size:12px;font-weight:900;">' + t + '</span>'; }).join('');
  }

  // ── 팝업 틀 ──
  function pop(html, border) {
    var ov = document.getElementById('secret-pop');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'secret-pop';
      ov.style.cssText = 'position:fixed;inset:0;z-index:871;background:rgba(0,0,0,.84);display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;' + FONT;
      document.body.appendChild(ov);
    }
    ov.innerHTML = '<div style="width:100%;max-width:420px;background:linear-gradient(160deg,#1a1230,#2a1a44);border:2px solid ' + (border || '#8b7bff') + ';border-radius:20px;padding:20px 18px;color:#fff;box-shadow:0 10px 40px rgba(0,0,0,.6);">' + html + '</div>';
    return ov;
  }
  function closePop() { var ov = document.getElementById('secret-pop'); if (ov) ov.remove(); }
  var BTN = 'width:100%;padding:12px;margin-top:8px;border:none;border-radius:13px;font-size:14px;font-weight:900;color:#fff;cursor:pointer;text-align:left;' + FONT;
  function choiceBtn(i, label, bg) { return '<button data-i="' + i + '" style="' + BTN + 'background:' + (bg || 'rgba(255,255,255,.1)') + ';border:1.5px solid rgba(255,255,255,.2);">' + label + '</button>'; }
  function okBtn() { return '<button id="sa-ok" style="' + BTN + 'text-align:center;background:linear-gradient(135deg,#FF6B9D,#C084FC);">확인</button>'; }
  function wire(sel, fn) { var ov = document.getElementById('secret-pop'); if (!ov) return; Array.prototype.forEach.call(ov.querySelectorAll(sel), function (b) { b.onclick = function () { fn(b); }; }); }
  function fire(kind, cid, caught) { try { window.dispatchEvent(new CustomEvent('ph-secret-done', { detail: { kind: kind, cid: cid, caught: !!caught } })); } catch (e) {} }

  function resultPop(cid, text, fx, extra, border) {
    pop('<div style="font-size:14px;line-height:1.75;margin-bottom:10px;">' + nl(fill(text, cid)) + '</div>' +
      '<div style="text-align:center;margin-bottom:6px;">' + fxChips(fx, extra) + '</div>' + okBtn(), border);
    wire('#sa-ok', closePop);
  }

  // ── 일반 사건 흐름 ──
  function startEvent(cid, id) {
    var t = EV[id]; if (!t) return false;
    if (popupOpen()) return false;
    var good = t.kind === 'good', pm0 = 1;
    var cap = money() >= COVER_COST;
    var btns = '';
    btns += choiceBtn(0, '🙈 모른 척 둔다');
    btns += choiceBtn(1, '🛡️ 조용히 막는다 (🍔 ' + COVER_COST.toLocaleString() + ')', cap ? 'rgba(99,179,255,.22)' : 'rgba(255,255,255,.05)');
    btns += good ? choiceBtn(2, '📣 슬쩍 알린다', 'rgba(255,107,157,.22)') : choiceBtn(2, '😤 불러서 따끔하게 말한다');
    pop('<div style="font-size:12px;color:' + (good ? '#9fe8b0' : '#ff9a9a') + ';font-weight:900;margin-bottom:6px;">' + t.icon + ' ' + (good ? '몰래 한 좋은 일' : t.kind === 'bad' ? '들키면 곤란한 일' : '몰래 한 작은 일') + '</div>' +
      '<div style="font-size:17px;font-weight:900;line-height:1.4;margin-bottom:6px;">' + esc(fill(t.head, cid)) + '</div>' +
      '<div style="font-size:13px;color:#cfc4ee;line-height:1.55;margin-bottom:6px;">' + esc(fill(t.sub, cid)) + '<br>어떻게 할까요?</div>' + btns);
    var s0 = load(); s0.sinceDay = 0; save(s0);
    wire('[data-i]', function (b) {
      var i = Number(b.getAttribute('data-i')), p = t.base, extraFx = null;
      if (i === 1) {
        if (money() < COVER_COST) { toast('코인이 모자라요 (🍔 ' + COVER_COST.toLocaleString() + ' 필요)'); return; }
        applyFx(cid, { c: -COVER_COST }); p = t.base * BLOCK_MULT;
      } else if (i === 2) {
        if (good) p = 1; else { p = t.base * SCOLD_MULT; extraFx = { m: -6 }; }
      }
      var caught = Math.random() < p;
      var res = caught ? t.caught : t.ok, fx = Object.assign({}, res.fx);
      if (extraFx) { fx.m = (fx.m || 0) + extraFx.m; }
      var extra = null;
      if (caught && t.scandal) extra = startScandal(cid, 0);
      applyFx(cid, fx);
      var s = load(); s.total++; save(s);
      var lead = i === 1 ? '매니저가 발 빠르게 움직였어요.\n\n' : '';
      resultPop(cid, lead + res.r, i === 1 ? Object.assign({}, fx, { c: -COVER_COST }) : fx, extra, caught ? (good ? '#9fe8b0' : '#ff7a7a') : '#8b7bff');
      fire(id, cid, caught);
    });
    return true;
  }

  // ── 열애설 의혹 (경고) → 위기 ──
  function startWarning(cid) {
    if (popupOpen()) return false;
    var cap = money() >= FINE_COST;
    pop('<div style="font-size:12px;color:#ffd27a;font-weight:900;margin-bottom:6px;">👀 소문</div>' +
      '<div style="font-size:17px;font-weight:900;line-height:1.4;margin-bottom:6px;">' + esc(fill('{n}의 열애설 의혹이 올라왔어요', cid)) + '</div>' +
      '<div style="font-size:13px;color:#cfc4ee;line-height:1.55;margin-bottom:6px;">커뮤니티에 "같이 있는 걸 봤다"는 글이 올라왔어요. 아직은 소문이지만 방치하면 커질 수 있어요.<br>어떻게 할까요?</div>' +
      choiceBtn(0, '🗣️ 바로 해명한다 (🍔 ' + FINE_COST.toLocaleString() + ')', cap ? 'rgba(99,179,255,.22)' : 'rgba(255,255,255,.05)') + choiceBtn(1, '🙈 일단 지켜본다'));
    var s0 = load(); s0.sinceDay = 0; save(s0);
    wire('[data-i]', function (b) {
      var i = Number(b.getAttribute('data-i')), s = load();
      if (i === 0) {
        if (money() < FINE_COST) { toast('코인이 모자라요 (🍔 ' + FINE_COST.toLocaleString() + ' 필요)'); return; }
        applyFx(cid, { c: -FINE_COST, m: -2 }); delete s.warn[cid]; save(s);
        resultPop(cid, '빠른 해명으로 소문이 가라앉았어요.\n"그냥 친구였나 봐"라는 반응이 늘어났어요.', { c: -FINE_COST, m: -2 });
      } else {
        s.warn[cid] = 1; save(s); applyFx(cid, { m: -3 });
        resultPop(cid, '일단 잠잠해졌지만… {n}은(는) 불안한 얼굴이에요.\n이 소문이 다시 올라오면 큰일이 날지도 몰라요.', { m: -3 });
      }
      fire('warning', cid, false);
    });
    return true;
  }
  function startCrisis(cid) {
    if (popupOpen()) return false;
    var grp = inGroup(cid), cap = money() >= OFFICIAL_COST;
    pop('<div style="font-size:12px;color:#ff8a8a;font-weight:900;margin-bottom:6px;">🚨 긴급</div>' +
      '<div style="font-size:17px;font-weight:900;line-height:1.4;margin-bottom:6px;">' + esc(fill('{n}의 열애설이 정식 기사로 터졌어요', cid)) + '</div>' +
      '<div style="font-size:13px;color:#cfc4ee;line-height:1.55;margin-bottom:6px;">지난번 소문이 결국 기사가 됐어요. 연락이 쏟아지고 있어요.' + (grp ? '<br>그룹 멤버들까지 곤란해진 상황이에요.' : '') + '<br>어떻게 할까요?</div>' +
      choiceBtn(0, '📝 공식 입장문을 낸다 (🍔 ' + OFFICIAL_COST.toLocaleString() + ')', cap ? 'rgba(99,179,255,.22)' : 'rgba(255,255,255,.05)') + choiceBtn(1, '🤐 침묵한다'), '#ff7a7a');
    var s0 = load(); s0.sinceDay = 0; save(s0);
    wire('[data-i]', function (b) {
      var i = Number(b.getAttribute('data-i')), s = load();
      if (i === 0) {
        if (money() < OFFICIAL_COST) { toast('코인이 모자라요 (🍔 ' + OFFICIAL_COST.toLocaleString() + ' 필요)'); return; }
        var fx0 = { c: -OFFICIAL_COST, m: -8, f: -10 };
        var ex0 = startScandal(cid, GROUP_LOSS_OFFICIAL); applyFx(cid, fx0); delete s.warn[cid]; var s1 = load(); delete s1.warn[cid]; save(s1);
        resultPop(cid, '진솔한 입장문 덕분에 여론이 조금씩 풀렸어요.\n그래도 한동안은 조심해야 해요.', fx0, ex0, '#ff7a7a');
      } else {
        var fx1 = { m: -20, v: -10, f: -40 };
        var ex1 = startScandal(cid, GROUP_LOSS_SILENT); applyFx(cid, fx1); var s2 = load(); delete s2.warn[cid]; save(s2);
        resultPop(cid, '침묵이 길어지자 추측성 기사가 쏟아졌어요.\n팬들이 크게 실망했어요… 하지만 시간이 지나면 회복할 수 있어요.', fx1, ex1, '#ff7a7a');
      }
      fire('crisis', cid, true);
    });
    return true;
  }

  // ── 일정 정산 반토막 (레슨 보너스 함수에 곱해 붙임) ──
  function install() {
    if (typeof window.__lessonPayMult !== 'function') { setTimeout(install, 300); return; }
    if (window.__secretWrapped) return; window.__secretWrapped = 1;
    var old = window.__lessonPayMult;
    window.__lessonPayMult = function (cid, type) {
      var base = Number(old.apply(this, arguments)) || 1;
      return penActive(cid) ? base * PEN_MULT : base;
    };
  }
  install();

  // ── 언제 터지나: 날짜가 넘어갈 때 ──
  function weightOf(id, cid) {
    var t = EV[id], w = (t.w && t.w[cid]) || 1, m = moodOf(cid);
    if (id === 'club') w *= (m < 45 ? 3 : m < 60 ? 1 : 0.4);
    if (id === 'dating') w *= (m < 60 ? 1.5 : 1);
    return w;
  }
  function rollEvent(ids) {
    var s = load(), cand = ids.filter(function (c) { return !penActive(c); });
    if (!cand.length) return null;
    var warned = cand.filter(function (c) { return s.warn[c]; });
    if (warned.length && Math.random() < CRISIS_P) return { cid: pick(warned), id: 'crisis' };
    var pairs = [], total = 0;
    cand.forEach(function (c) {
      EV_ORDER.forEach(function (id) { var w = weightOf(id, c); pairs.push({ cid: c, id: id, w: w }); total += w; });
      if (!s.warn[c]) { var ww = ((EV.dating.w && EV.dating.w[c]) || 1) * 0.6; pairs.push({ cid: c, id: 'warning', w: ww }); total += ww; }
    });
    var r = Math.random() * total;
    for (var i = 0; i < pairs.length; i++) { r -= pairs[i].w; if (r <= 0) return pairs[i]; }
    return pairs[pairs.length - 1];
  }
  function trigger(cid, id) {
    if (id === 'crisis') return startCrisis(cid);
    if (id === 'warning') return startWarning(cid);
    return startEvent(cid, id);
  }
  function tick() {
    var st = mealState(), day = st.day;
    if (!day) return;
    var s = load();
    if (s.lastDay == null) { s.lastDay = day; save(s); return; }
    if (day <= s.lastDay) { if (day < s.lastDay) { s.lastDay = day; save(s); } return; }
    s.lastDay = day; s.sinceDay++; save(s);
    var ids = debuted(); if (!ids.length) return;
    var p = Math.min(CHANCE_MAX, BASE_CHANCE + (s.sinceDay - 1) * PITY_PER_DAY);
    if (Math.random() >= p) return;
    var pk = rollEvent(ids); if (!pk) return;
    (function wait(n) {                                   // 다른 팝업(일정 정산·해프닝)이 닫힌 뒤에 보여준다
      if (popupOpen()) { if (n < 60) setTimeout(function () { wait(n + 1); }, 900); return; }
      setTimeout(function () { trigger(pk.cid, pk.id); }, 1500);
    })(0);
  }
  setInterval(tick, 1500);

  // ── 테스트용 주소 ──
  try {
    var q = new URLSearchParams(location.search).get('secret');
    if (q) setTimeout(function () {
      var ids = debuted(); if (!ids.length) { toast('데뷔한 아이돌이 없어요'); return; }
      var map = { snack: 'snack', warning: 'warning', crisis: 'crisis' };
      trigger(pick(ids), map[q] || q);
    }, 2500);
  } catch (e) {}

  window.__secretTest = { EV: EV, trigger: trigger, penActive: penActive, penLeft: penLeft, load: load, startScandal: startScandal, halveAgency: halveAgency, rollEvent: rollEvent };
})();
