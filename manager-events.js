// ════════════════════════════════
// 🧑‍💼 매니저 사건 (manager-events.js)
// 매니저(한지우 · 윤서진)가 낀 돌발 사건이 가끔 터지고, 대표님(나)이 선택지를 고른다. (포카일보 기사 · 해프닝 카드와 같은 줄기)
//  · 하루(게임 속 DAY) 1번만, 기사/해프닝과 슬롯을 나눠 쓴다 (포카일보가 떴으면 이날은 건너뜀)
//  · 매니저 신뢰도(0~100, 처음 30): 사건을 잘 풀수록 오르고, 높을수록 "기사 막기" 같은 걸 더 잘 막아줌
//  · 보상: 컨디션(비주얼·체력·기분) · 코인 · 팬카페 회원 · 플레이어 경험치(⭐) · 신뢰도
//      경험치는 "지금 레벨업에 필요한 경험치의 일정 비율"이라 레벨이 올라도 의미가 있다 (XP_RATE 로 조절)
//  · 한지우 사건은 데뷔 전 연습생, 윤서진 사건은 데뷔한 아이돌 대상 (없으면 다른 쪽으로 대체)
// 저장: localStorage 'ph_mgrevent' (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// 테스트: 주소 뒤에 ?mgrevent=<사건id> (snack / article / late / stalker / burnout / scout) 한 번만 동작
// 사건을 늘리고 싶으면 아래 EVENTS 에 한 덩어리만 추가하면 됨.
//   xp: 1(작게) 2(보통) 3(크게) / tr: 신뢰도 변화 / byTrust: 신뢰도가 높을수록 ok 가 나올 확률이 큼 / risk: 반전
// ════════════════════════════════
(function () {
  'use strict';
  var KEY = 'ph_mgrevent';
  var CHANCE = 0.4;                 // 하루 보내기 때 사건이 터질 확률
  var XP_RATE = 0.02;               // xp 1단계당 "현재 레벨 필요 경험치" 비율 (2%) → xp3 = 6%
  var TRUST_START = 30, TRUST_MAX = 100;
  var POLL_MS = 1500;
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var NAMES = { jiwoo: '한지우', seojin: '윤서진' };
  var TITLES = { jiwoo: '신입 전담 매니저', seojin: '배우 전담 매니저' };
  var IMGS = { jiwoo: 'manager-rookie.png?v=2', seojin: 'manager-actor.png?v=1' };
  var ACC = { jiwoo: '#60a5fa', seojin: '#fb7185' };

  // ── 사건 ──
  var EVENTS = [
    { id: 'snack', mgr: 'jiwoo', head: '🍗 한밤의 간식 배달',
      say: '대표님! {n}이 요즘 연습하느라 너무 힘들어 보여서… 치킨을 사 왔는데, 이거 들키면 큰일이겠죠? (소곤소곤)',
      ch: [
        { l: '같이 먹자! 오늘만이야', r: '숙소 불을 끄고 셋이 치킨 파티! {n}의 얼굴에 오랜만에 웃음이 번졌다.', fx: { m: 18, s: 8, v: -3 }, xp: 1, tr: 6,
          risk: { p: 0.3, r: '"야식 냄새가 복도까지 났다더라" — 다음 날 연습생 사이에서 소문이 돌았다. 그래도 {n}은 웃었다.', fx: { m: 8, v: -6, c: -2000 }, xp: 1, tr: 2 } },
        { l: '관리 중이잖아. 도로 가져가', r: '지우가 시무룩하게 치킨을 들고 나갔다. {n}은 아쉬운 눈으로 문을 바라봤다.', fx: { v: 8, m: -12 }, xp: 2, tr: -2 },
        { l: '몰래 냉장고에 숨겨두자', r: '새벽에 {n}이 혼자 냉장고 앞에… 들키지 않았지만, 지우만 속이 탔다.', fx: { m: 10, s: 4 }, xp: 1, tr: 3,
          risk: { p: 0.5, r: '다른 멤버가 먼저 발견! 치킨은 사라지고 {n}의 기분만 상했다.', fx: { m: -10 }, xp: 1, tr: -3 } } ] },
    { id: 'article', mgr: 'seojin', head: '📰 막으려 했는데…',
      say: '대표님, 죄송해요. 안 좋은 기사를 막아보려고 기자분들께 연락을 돌렸는데… 이미 {n} 이름으로 퍼지기 시작했어요. 어떻게 할까요?',
      ch: [
        { l: '서진 씨가 직접 해명글을 올려요', r: '', byTrust: { ok: { r: '서진이 밤새 쓴 해명글이 통했다! 오해가 풀리며 오히려 팬들이 "매니저 믿는다"며 응원했다.', fx: { m: 12, v: 4 }, xp: 3, tr: 8 },
            ng: { r: '해명글이 오히려 불을 붙였다… 서진은 "제가 부족했어요"라며 고개를 숙였다.', fx: { m: -12, c: -3000 }, xp: 1, tr: -4 } } },
        { l: '일단 침묵하고 지켜봐요', r: '이틀 뒤 다른 이슈에 묻혔다. 큰 피해는 없었지만 서진은 입술을 깨물었다.', fx: { m: -4, s: -3 }, xp: 1, tr: 1 },
        { l: '오히려 화제로 돌려요 (운 50%)', r: '', byTrust: { p: 0.5, ok: { r: '"역시 대표님!" 역발상이 통했다. {n}의 이름이 실검 1위, 광고 문의까지 쏟아졌다.', fx: { m: 14, v: 8, c: 5000 }, xp: 3, tr: 6 },
            ng: { r: '타이밍이 어긋나 비난이 커졌다. 서진이 말없이 {n}의 곁을 지켰다.', fx: { m: -14, v: -5 }, xp: 1, tr: -3 } } } ] },
    { id: 'late', mgr: 'seojin', head: '🚗 촬영장 가는 길, 꽉 막힌 도로',
      say: '대표님… 촬영장 가는 길에 사고가 나서 도로가 꽉 막혔어요. 이대로면 30분은 늦어요. {n}이 뒷자리에서 대본을 붙잡고 있어요.',
      ch: [
        { l: '감독님께 솔직하게 사과 전화를 해요', r: '"사정 알겠다, 천천히 와." 감독은 오히려 서진의 태도를 칭찬했다. {n}은 차 안에서 대사를 한 번 더 맞췄다.', fx: { m: 6, v: 2 }, xp: 2, tr: 5 },
        { l: '내려서 지하철로 뛰어요!', r: '', byTrust: { p: 0.5, ok: { r: '전력 질주 끝에 5분 지각! 헉헉대는 {n}의 첫 테이크가 역대급 감정이 터졌다.', fx: { m: 8, v: 6, s: -10 }, xp: 3, tr: 4 },
            ng: { r: '환승에서 길을 잃고 한참 지각… 감독의 표정이 굳었다.', fx: { m: -10, s: -12, c: -2500 }, xp: 1, tr: -3 } } },
        { l: '일단 기다려요. 서진 씨가 알아서 해줘요', r: '서진이 갓길 우회로를 찾아 15분 지각으로 마무리. "역시 베테랑"이라는 말이 돌았다.', fx: { s: -4, m: 3 }, xp: 2, tr: 3 } ] },
    { id: 'stalker', mgr: 'jiwoo', head: '🚪 숙소 앞의 낯선 인영',
      say: '대표님, 숙소 앞에 모자 쓴 사람이 계속 서 있어요. 사생팬 같은데… {n}이 곧 퇴근하는데 어떡하죠?',
      ch: [
        { l: '지우가 앞서서 막아요', r: '지우가 몸으로 막아선 사이 {n}은 무사히 들어갔다. 지우의 소매가 찢어졌다.', fx: { s: 4, m: 4 }, xp: 2, tr: 6 },
        { l: '{n}이 직접 인사하고 보내요', r: '', byTrust: { p: 0.5, ok: { r: '"선물은 마음만 받을게요" 한마디에 팬이 눈물을 흘리며 돌아갔다. 팬카페에 미담이 올라왔다.', fx: { m: 8, v: 4, f: 3 }, xp: 3, tr: 3 },
            ng: { r: '사진이 SNS에 올라가 숙소 위치가 노출됐다. 이사 비용이 들었다.', fx: { m: -10, c: -4000, f: -2 }, xp: 1, tr: -4 } } },
        { l: '뒷문으로 조용히 피해요', r: '들키지 않고 넘어갔다. 하지만 {n}은 하루 종일 눈치를 봤다.', fx: { m: -6, s: -2 }, xp: 1, tr: 1 } ] },
    { id: 'burnout', mgr: 'any', head: '😮‍💨 매니저의 번아웃',
      say: '대표님… 죄송한데 저 하루만 쉬면 안 될까요? 요즘 운전이랑 스케줄 확인이랑… 잠을 못 잤어요. (눈 밑이 거뭇하다)',
      ch: [
        { l: '푹 쉬어요. 오늘은 내가 운전할게', r: '다음 날 매니저가 환하게 웃으며 출근했다. "대표님이 운전하신 거 사실 좀 무서웠어요" 둘 다 폭소.', fx: { m: 8, s: 6 }, xp: 2, tr: 10 },
        { l: '하루만 더 부탁해요, 이번 주만', r: '', byTrust: { p: 0.5, ok: { r: '"이 정도는 해야죠!" 이를 악문 매니저 덕에 스케줄을 무사히 마쳤다. 대신 다음엔 쉬게 해줘야겠다.', fx: { c: 4000, m: 3 }, xp: 3, tr: -2 },
            ng: { r: '졸음운전 직전! 아찔한 순간에 다들 식은땀. 매니저는 말없이 고개만 숙였다.', fx: { m: -10, s: -8, c: -2000 }, xp: 1, tr: -8 } } },
        { l: '쉬는 대신 간식 하나 쥐여줘요', r: '"…감사합니다." 초코바 하나에 매니저의 눈이 반짝였다. 조금은 힘이 난 모양이다.', fx: { m: 3 }, xp: 1, tr: 4 } ] },
    { id: 'scout', mgr: 'seojin', head: '📞 걸려온 스카우트 전화',
      say: '대표님, 다른 기획사에서 {n}에게 스카우트 제의가 왔어요. 계약금이 꽤 크더라고요. 제가 먼저 말씀드리는 게 맞겠죠?',
      ch: [
        { l: '{n}과 직접 이야기해볼게요', r: '{n}은 "저는 여기가 좋아요"라고 답했다. 서진은 슬며시 웃으며 서류를 파쇄기에 넣었다.', fx: { m: 12, v: 3 }, xp: 3, tr: 7 },
        { l: '조건을 올려서 붙잡아요', r: '', byTrust: { p: 0.5, ok: { r: '서진의 협상이 먹혔다! 재계약과 함께 보너스까지 확정.', fx: { c: -5000, m: 14, v: 4 }, xp: 2, tr: 5 },
            ng: { r: '"돈 때문에 남는 거냐"는 말이 돌았다. {n}의 기분이 상했다.', fx: { c: -5000, m: -10 }, xp: 1, tr: -2 } } },
        { l: '모르는 척 넘어가요', r: '서진은 말없이 전화를 끊었다. "…대표님은 가끔 무섭네요." 불안감이 남았다.', fx: { m: -8 }, xp: 1, tr: -5 } ] }
  ];

  // ── 저장 ──
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function trust() { var t = load().trust; return typeof t === 'number' ? t : TRUST_START; }
  function mealState() { try { return JSON.parse(localStorage.getItem('ph_meal') || '{}') || {}; } catch (e) { return {}; } }
  function mgrState() { try { return JSON.parse(localStorage.getItem('ph_manager') || '{}') || {}; } catch (e) { return {}; } }
  function has(m) { var s = mgrState(); return m === 'jiwoo' ? !!s.met : (m === 'seojin' ? !!s.actMet : (!!s.met || !!s.actMet)); }
  function plv() { try { return Number(playerLevel) || 1; } catch (e) { return 1; } }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function nameOf(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function fill(t, cid) { return String(t).replace(/\{n\}/g, nameOf(cid)); }
  var clamp = function (x) { return Math.max(0, Math.min(100, x)); };

  function debutedIds() {
    try { var d = (JSON.parse(localStorage.getItem('ph_agency') || '{}') || {}).done || {}; return Object.keys(d).filter(function (k) { return d[k] && typeof CHARS !== 'undefined' && CHARS[k]; }); } catch (e) { return []; }
  }
  function ownedIds() {
    try { var o = {}; CARDS.forEach(function (c) { if (owned.indexOf(c.id) !== -1 && CHARS[c.charId]) o[c.charId] = 1; }); return Object.keys(o); } catch (e) { return []; }
  }
  function idolFor(mgr) {
    var deb = debutedIds(), own = ownedIds(), pre = own.filter(function (k) { return deb.indexOf(k) < 0; });
    var first = mgr === 'jiwoo' ? pre : deb, second = mgr === 'jiwoo' ? deb : pre;
    var list = first.length ? first : (second.length ? second : own);
    return list.length ? pick(list) : null;
  }

  // ── 효과 ──
  function cafeStore() { try { return JSON.parse(localStorage.getItem('ph_fancafe') || 'null'); } catch (e) { return null; } }
  function applyFans(cid, n) {
    var s = cafeStore(); if (!n || !s || !s.idols || !s.idols[cid] || typeof s.idols[cid] !== 'object') return 0;
    var ic = s.idols[cid], before = typeof ic.anon === 'number' ? ic.anon : 0;
    ic.anon = Math.max(0, before + n);
    try { localStorage.setItem('ph_fancafe', JSON.stringify(s)); } catch (e) { return 0; }
    return ic.anon - before;
  }
  function applyFx(cid, fx) {
    if (fx.v || fx.s || fx.m) {
      var st = mealState(); if (!st.stat) st.stat = {};
      var s = st.stat[cid] || (st.stat[cid] = { v: 50, s: 50, m: 50 });
      if (fx.v) s.v = clamp((s.v == null ? 50 : s.v) + fx.v);
      if (fx.s) s.s = clamp((s.s == null ? 50 : s.s) + fx.s);
      if (fx.m) s.m = clamp((s.m == null ? 50 : s.m) + fx.m);
      try { localStorage.setItem('ph_meal', JSON.stringify(st)); } catch (e) {}
    }
    if (fx.c) { try { coins = Math.max(0, coins + fx.c); if (typeof saveAll === 'function') saveAll(); if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); } catch (e) {} }
  }
  function xpAmount(tier) { var req = 20 * plv() * plv(); try { req = (typeof getBaseExpRequired === 'function' ? getBaseExpRequired : getExpRequired)(plv()); } catch (e) {} return Math.max(20, Math.round(req * XP_RATE * tier)); }
  function giveXp(n) { try { if (typeof addPlayerExp === 'function') addPlayerExp(n); } catch (e) {} }
  function chips(fx, xp, tr, trNow) {
    var o = [];
    if (fx.v) o.push('✨ 비주얼 ' + (fx.v > 0 ? '+' : '') + fx.v);
    if (fx.s) o.push('💪 체력 ' + (fx.s > 0 ? '+' : '') + fx.s);
    if (fx.m) o.push('😊 기분 ' + (fx.m > 0 ? '+' : '') + fx.m);
    if (fx.c) o.push('🍔 ' + (fx.c > 0 ? '+' : '') + fx.c.toLocaleString());
    if (fx.f) o.push('👥 팬 ' + (fx.f > 0 ? '+' : '') + fx.f);
    if (xp) o.push('⭐ 경험치 +' + xp.toLocaleString());
    if (tr) o.push('🤝 신뢰도 ' + (tr > 0 ? '+' : '') + tr + ' (' + trNow + ')');
    return o;
  }

  // ── 슬롯 (포카일보와 하루 1번 공유) ──
  function today() { return mealState().day; }
  function slotFree() {
    var d = today(); if (d == null) return false;
    if (load().shownDay === d) return false;
    try { if ((JSON.parse(localStorage.getItem('ph_issue') || '{}') || {}).shownDay === d) return false; } catch (e) {}
    return true;
  }
  function markShown() {
    var d = today(), s = load(); s.shownDay = d; save(s);
    try { var iss = JSON.parse(localStorage.getItem('ph_issue') || '{}') || {}; iss.shownDay = d; localStorage.setItem('ph_issue', JSON.stringify(iss)); } catch (e) {}
  }
  function popupOpen() { return !!(document.getElementById('mgr-event') || document.getElementById('issue-pop') || document.getElementById('meal-event') || document.getElementById('happening-pop') || document.getElementById('mgr-story')); }

  // ── 팝업 ──
  function avatar(m, px) {
    return '<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:' + px + 'px;height:' + px + 'px;border-radius:50%;background:linear-gradient(135deg,' + ACC[m] + ',#C084FC);overflow:hidden;font-size:' + Math.round(px * 0.5) + 'px;flex:none;border:2px solid ' + ACC[m] + ';">🧑‍💼' +
      '<img src="' + IMGS[m] + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 25%;" onload="this.parentNode.style.fontSize=\'0\'" onerror="this.remove()"></span>';
  }
  function show(ev, cid) {
    var old = document.getElementById('mgr-event'); if (old) old.remove();
    var m = ev.mgr === 'any' ? (has('seojin') && (!has('jiwoo') || Math.random() < 0.5) ? 'seojin' : 'jiwoo') : ev.mgr;
    markShown();
    var ov = document.createElement('div'); ov.id = 'mgr-event';
    ov.style.cssText = 'position:fixed;inset:0;z-index:1250;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:14px;' + FONT;
    document.body.appendChild(ov);
    var box = 'width:100%;max-width:340px;max-height:94vh;overflow-y:auto;background:linear-gradient(160deg,#1a1a2e,#2d1b4e);border:2px solid ' + ACC[m] + ';border-radius:18px;color:#fff;box-shadow:0 10px 40px rgba(0,0,0,.6);';
    var head = '<div style="padding:12px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,.12);">' + avatar(m, 52) +
      '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:900;">' + esc(NAMES[m]) + ' <span style="font-size:10px;color:' + ACC[m] + ';font-weight:400;">' + esc(TITLES[m]) + '</span></div>' +
      '<div style="font-size:10px;color:#aaa;margin-top:2px;">🤝 신뢰도 ' + trust() + ' / ' + TRUST_MAX + '</div></div></div>';
    function front() {
      ov.innerHTML = '<div style="' + box + '">' + head + '<div style="padding:14px;">' +
        '<div style="font-size:16px;font-weight:900;margin-bottom:8px;">' + esc(fill(ev.head, cid)) + '</div>' +
        '<div style="font-size:13px;line-height:1.7;background:rgba(255,255,255,.08);border-radius:12px;padding:11px 12px;margin-bottom:12px;">“' + esc(fill(ev.say, cid)) + '”</div>' +
        '<div style="font-size:11px;font-weight:900;color:' + ACC[m] + ';margin-bottom:6px;">대표님, 어떻게 하시겠어요?</div>' +
        ev.ch.map(function (c, i) { return '<button data-i="' + i + '" style="display:block;width:100%;text-align:left;margin-bottom:7px;padding:11px 12px;border:1.5px solid rgba(255,255,255,.25);border-radius:10px;background:rgba(255,255,255,.07);color:#fff;font-size:13px;font-weight:900;cursor:pointer;' + FONT + '">' + (i + 1) + '. ' + esc(fill(c.l, cid)) + '</button>'; }).join('') +
        '</div></div>';
      ov.querySelectorAll('[data-i]').forEach(function (b) { b.onclick = function () { choose(+b.getAttribute('data-i')); }; });
    }
    function choose(i) {
      var c = ev.ch[i], out = { r: c.r, fx: c.fx || {}, xp: c.xp || 1, tr: c.tr || 0 }, twist = false;
      if (c.byTrust) {
        var p = typeof c.byTrust.p === 'number' ? c.byTrust.p : 0.55;
        var chance = Math.max(0.1, Math.min(0.95, p + (trust() - 50) / 100 * 0.5));   // 신뢰도 50 기준 ±25%p
        var good = Math.random() < chance;
        out = good ? c.byTrust.ok : c.byTrust.ng; twist = !good;
      } else if (c.risk && Math.random() < c.risk.p) { out = c.risk; twist = true; }
      var fx = out.fx || {}, xpn = xpAmount(out.xp || 1), tr = out.tr || 0;
      var fd = applyFans(cid, fx.f || 0);
      applyFx(cid, fx); giveXp(xpn);
      var s = load(); s.trust = Math.max(0, Math.min(TRUST_MAX, trust() + tr));
      (s.log = s.log || []).unshift({ t: Date.now(), cid: cid, id: ev.id, c: i, twist: twist }); s.log = s.log.slice(0, 30); s.count = (s.count || 0) + 1; save(s);
      var shown = { v: fx.v, s: fx.s, m: fx.m, c: fx.c, f: fd };
      var cs = chips(shown, xpn, tr, s.trust);
      ov.innerHTML = '<div style="' + box + '">' + head + '<div style="padding:16px 14px 14px;">' +
        (twist ? '<div style="font-size:11px;font-weight:900;color:#fbbf24;margin-bottom:6px;">⚠️ 예상 밖의 전개!</div>' : '') +
        '<div style="font-size:15px;font-weight:900;line-height:1.55;margin-bottom:12px;">' + esc(fill(out.r, cid)) + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">' + cs.map(function (t) { return '<span style="font-size:11px;font-weight:900;padding:4px 9px;border-radius:10px;background:rgba(255,255,255,.14);">' + t + '</span>'; }).join('') + '</div>' +
        '<button id="mgr-ev-ok" style="width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,' + ACC[m] + ',#C084FC);color:#fff;font-size:14px;font-weight:900;cursor:pointer;' + FONT + '">확인</button></div></div>';
      ov.querySelector('#mgr-ev-ok').onclick = function () { ov.remove(); };
      try { if (window.pocaSfx && pocaSfx.play) pocaSfx.play(twist ? 'pick' : 'reward'); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('ph-mgr-event-done', { detail: { id: ev.id, cid: cid, twist: twist, trust: s.trust } })); } catch (e) {}
    }
    try { if (window.pocaSfx && pocaSfx.play) pocaSfx.play('pick'); } catch (e) {}
    front();
  }

  function eligible() { return EVENTS.filter(function (e) { return has(e.mgr); }); }
  function fire(id) {
    var list = eligible(); if (!list.length) return false;
    var ev = id ? EVENTS.filter(function (e) { return e.id === id; })[0] : null;
    if (!ev) {
      var recent = (load().log || []).slice(0, 2).map(function (l) { return l.id; });
      var fresh = list.filter(function (e) { return recent.indexOf(e.id) < 0; });
      ev = pick(fresh.length ? fresh : list);
    }
    var m = ev.mgr === 'any' ? (has('jiwoo') ? 'jiwoo' : 'seojin') : ev.mgr;
    var cid = idolFor(m); if (!cid) return false;
    show(ev, cid); return true;
  }
  function fireIfFree(id) { if (popupOpen() || !slotFree()) return false; return fire(id); }

  // ── 날짜가 넘어가면 가끔 발생 ──
  function tick() {
    var day = mealState().day; if (!day) return;
    var s = load();
    if (s.lastDay == null) { s.lastDay = day; save(s); return; }
    if (day <= s.lastDay) { if (day < s.lastDay) { s.lastDay = day; save(s); } return; }
    s.lastDay = day; save(s);
    if (!eligible().length || Math.random() >= CHANCE) return;
    (function wait(n) {
      if (popupOpen()) { if (n < 40) setTimeout(function () { wait(n + 1); }, 800); return; }
      setTimeout(function () { fireIfFree(); }, 1500);       // 포카일보가 먼저 뜰 기회를 줌
    })(0);
  }
  setInterval(tick, POLL_MS);

  // 테스트용 주소 파라미터
  try {
    var q = new URLSearchParams(location.search).get('mgrevent');
    if (q) setTimeout(function () {
      var st = mgrState(); if (!st.met && !st.actMet) { st.met = true; st.actMet = true; localStorage.setItem('ph_manager', JSON.stringify(st)); }
      if (!fire(q)) { try { showBagToast('매니저 사건을 띄울 캐릭터가 없어요'); } catch (e) {} }
    }, 4000);
  } catch (e) {}

  window.__mgrEventTest = { fire: fire, fireIfFree: fireIfFree, EVENTS: EVENTS, load: load, trust: trust, slotFree: slotFree, tick: tick, xpAmount: xpAmount };
})();
