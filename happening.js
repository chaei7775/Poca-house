// ════════════════════════════════
// 📸 해프닝 (happening.js) — 내 아이돌에게 돌발 상황이 터진다
// "하루 보내기"로 날짜가 넘어갈 때 낮은 확률로 사건이 터진다. (컴백/드라마 촬영 전날이면 확률 UP, 오래 안 터지면 확률이 조금씩 오름)
//  · 시그니처 사건(아이돌마다 1개): 아이돌이 사라졌다 → [찾으러 간다] / [기다린다]
//      - 찾으러 가기: 장소 3곳 중 단서를 따라 고른다 (틀려도 손해 없음, 단서가 나옴). 찾으면 그 아이돌의 해프닝 카드(처음 1번만)+코인+기분.
//      - 기다리기: 아이돌이 스스로 돌아와서 기분↑. 그리고 다음 사건은 반드시 시그니처 사건이 뜬다.
//  · 일반 사건(정전 / 소나기 / 팬과 마주침): 카드는 없지만 반복해서 나올 수 있다. 선택에 정답은 없다.
//  · 해프닝 카드는 뽑기로 못 얻는다. 더보기 > 📸 해프닝 카드 에서 모은 카드를 볼 수 있다.
//  · 사건 하나가 열려 있는 동안 다른 사건은 안 뜬다. 다른 팝업(일정 정산 등)이 열려 있으면 닫힌 뒤에 뜬다.
// 카드 그림: 저장소 루트의 happening-<아이돌id>.jpg (sion / minjun / doyun / harin / yuna / ara). 없으면 임시 그림.
// 저장: localStorage 'ph_happening' (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// 테스트용 주소: ?happening=sion (그 아이돌의 시그니처 사건 바로 시작) / ?happening=generic
// ════════════════════════════════
(function () {
  'use strict';
  var KEY = 'ph_happening';
  var BASE_CHANCE = 0.12;       // 하루 보내기 때 기본 확률
  var EVE_CHANCE = 0.35;        // 컴백/드라마 촬영 전날 그 아이돌 확률
  var PITY_PER_DAY = 0.05;      // 마지막 사건 뒤로 하루마다 더해지는 확률
  var CHANCE_MAX = 0.6;
  var SIG_RATE = 0.7;           // 카드가 없는 아이돌에게 시그니처 사건이 뜰 비율 (나머지는 일반 사건)
  var COIN_FIND = 1500, COIN_WAIT = 400, MOOD_FIND = 10, MOOD_WAIT = 12;
  var ACC = '#FFD700';
  var FONT = "font-family:'Noto Sans KR',sans-serif;";

  // ── 시그니처 사건 (아이돌마다 1개) ──
  // places: 장소 3곳 (ok:true 가 정답) / hint: 틀린 장소에서 나오는 단서
  var SIG = {
    sion: { head: '🚨 긴급 — 시온이 연습실에서 사라졌습니다', sub: '컴백 하루 전. 기타 케이스도 같이 없어졌어요.',
      places: [
        { n: '🚪 연습실 사물함', hint: '교복 재킷이 걸려 있다. 아직 온기가 남아 있다… 그런데 기타 케이스는 없다. 밖으로 들고 나간 거다.' },
        { n: '🚗 지하 주차장', hint: '차들만 가득하다. 그런데 위쪽에서 희미하게 기타 소리가 들리는 것 같다…' },
        { n: '🏢 옥상', ok: true }],
      found: '옥상 문을 열자 새벽 하늘 아래, 시온이 혼자 기타를 치고 있었다.\n"…언제 왔어? 아무도 없는 데서 치면 소리가 더 솔직해져서."',
      wait: '아침이 되자 시온이 아무 일 없다는 듯 연습실로 돌아왔다.\n"…걱정했어? 소리 좀 정리하고 왔어." 눈 밑이 살짝 어두웠다.',
      quote: '아무도 없는 곳에서 연주하면, 소리가 더 솔직해져.' },
    minjun: { head: '🚨 긴급 — 내일 촬영인데 민준과 연락이 안 됩니다', sub: '휴대폰은 꺼져 있고 숙소에도 없어요.',
      places: [
        { n: '🍚 학생 식당', hint: '식당 직원: "민준 학생요? 요즘 점심도 책 들고 먹던데… 도서관 열쇠를 빌려 간 것 같아요."' },
        { n: '🏫 교무실 앞', hint: '선생님: "오늘 도서관 대출 목록에 민준이 이름이 스무 번 넘게 적혀 있더라."' },
        { n: '📚 도서관', ok: true }],
      found: '폐관한 도서관, 책 더미를 베고 민준이 잠들어 있었다.\n"…으응? 몇 시야? …오늘만 모른 척해줘."',
      wait: '밤이 깊어서야 민준이 돌아왔다. 소매에 먼지가 묻어 있었다.\n"…미안. 책 읽다가 시간 가는 줄 몰랐어."',
      quote: '…책 속에 숨는 게 제일 편해. 오늘만 모른 척해줘.' },
    doyun: { head: '🚨 긴급 — 도윤이 학생회 회의에 나타나지 않았습니다', sub: '규칙을 한 번도 어긴 적 없는 도윤이, 처음으로 결석했어요.',
      places: [
        { n: '🗂️ 학생회실', hint: '회의록 마지막 줄에 연필로 "…오늘은 쉬고 싶다"라고 적혀 있다. 도윤의 글씨다.' },
        { n: '🏃 운동장', hint: '트랙은 조용하다. 그런데 어디선가 삐걱, 삐걱 하는 쇠사슬 소리가 들린다…' },
        { n: '🛝 놀이터', ok: true }],
      found: '밤의 놀이터, 정장 재킷을 벗은 도윤이 혼자 그네에 앉아 있었다.\n"…규칙은 내가 만들었지만, 가끔은 어기고 싶어지더라."',
      wait: '회의가 끝날 무렵 도윤이 슬쩍 들어왔다. 넥타이가 살짝 풀려 있었다.\n"…지각 사유는 묻지 마." 평소와 다른 얼굴이었다.',
      quote: '규칙은 내가 만들었지만, 가끔은 어기고 싶어지더라.' },
    harin: { head: '🚨 긴급 — 막차가 끊겼는데 하린이 숙소에 오지 않았습니다', sub: '마지막 목격 장소는 역 근처예요.',
      places: [
        { n: '🏪 편의점', hint: '점원: "이어폰 줄을 감고 있던 손님이 있었어요. 역 쪽으로 가셨는데…"' },
        { n: '🚌 버스 정류장', hint: '막차 시간표 위에 가사 한 줄이 적힌 영수증이 붙어 있다. 노래를 쓰던 사람이 앉았던 자리다.' },
        { n: '🚉 역 대합실', ok: true }],
      found: '텅 빈 새벽 대합실, 벤치에 앉은 하린이 이어폰을 낀 채 작게 노래를 흥얼거리고 있었다.\n"…막차가 끊겨도 괜찮아. 이 노래가 끝날 때까지만."',
      wait: '새벽이 되어서야 하린이 조용히 숙소 문을 열었다. 손에 접힌 가사 종이가 쥐어져 있었다.\n"…걱정시켰네. 노래가 안 끝나서."',
      quote: '막차가 끊겨도 괜찮아. 이 노래가 끝날 때까지만.' },
    yuna: { head: '🚨 긴급 — 컴백 전날 새벽, 윤아의 침대가 비어 있습니다', sub: '현관에 쪽지가 있어요. "금방 올게!"',
      places: [
        { n: '🌷 동네 꽃집', hint: '아직 문을 안 열었다. 그런데 유리창에 꽃잎 한 장이 붙어 있다. 도매시장 쪽으로 간 모양이다.' },
        { n: '☕ 24시 카페', hint: '바리스타: "방금 전에 꽃향기 나는 분이 지나갔어요. 새벽 시장 쪽으로 가던데요?"' },
        { n: '🌅 새벽 꽃시장', ok: true }],
      found: '새벽 꽃시장, 윤아가 꽃을 한 아름 안고 환하게 웃고 있었다.\n"어, 들켰다! 컴백 날엔 제일 예쁜 꽃으로 시작하고 싶었어."',
      wait: '해가 뜰 무렵 윤아가 꽃다발을 들고 돌아왔다. "깜짝 선물이야!"\n눈이 반짝이는 걸 보니 새벽 내내 신이 났던 모양이다.',
      quote: '컴백 날엔 제일 예쁜 꽃으로 시작하고 싶었어.' },
    ara: { head: '🚨 긴급 — 리허설 시간인데 아라가 없습니다', sub: '대기실엔 연습복만 사라졌고, 거울에 립스틱으로 "곧 갈게".',
      places: [
        { n: '🪞 대기실', hint: '거울의 "곧 갈게" 글씨 아래에 땀 닦은 수건이 놓여 있다. 막 연습하다 나간 흔적이다.' },
        { n: '💄 분장실', hint: '조명 스위치가 켜졌다 꺼진 자국이 있다. 불 꺼진 큰 방으로 간 것 같다…' },
        { n: '🎭 공연장 무대', ok: true }],
      found: '불 꺼진 빈 공연장, 한 줄기 조명 아래 아라가 혼자 안무를 맞춰보고 있었다. 땀이 맺힌 채로.\n"…보지 마. 완벽한 무대는 아무도 없을 때 만들어지는 거야."',
      wait: '리허설이 시작될 즈음 아라가 아무렇지 않게 나타났다. 머리카락 끝이 젖어 있었다.\n"…뭘 봐? 몸 풀고 왔어."',
      quote: '완벽한 무대는 아무도 없을 때 만들어져.' }
  };

  // ── 일반 사건 (카드 없음, 반복 가능) ──  fx: m=기분 s=체력 v=비주얼 c=코인 f=팬카페 회원
  var GENERIC = [
    { id: 'blackout', head: '🔦 연습실이 갑자기 정전됐어요', sub: '{n}이(가) 어둠 속에 서 있어요. 곧 복구된다는데…',
      ch: [
        { l: '휴대폰 플래시를 켜고 노래를 부른다', r: '어둠 속에서 {n}의 노래가 울려 퍼졌어요. 다들 숨죽이고 들었어요.', fx: { m: 12, f: 1 } },
        { l: '조용히 복구를 기다린다', r: '불이 켜질 때까지 조용히 앉아 쉬었어요. 의외로 푹 쉰 기분이에요.', fx: { s: 8, m: 4 } },
        { l: '귀신 이야기를 시작한다 (운 50%)', r: '분위기가 제대로 살아서 연습실이 웃음바다가 됐어요!', fx: { m: 16 }, risk: { p: 0.5, r: '이야기가 너무 무서워서 {n}이 잠을 못 이뤘어요…', fx: { m: -6, s: -4 } } }] },
    { id: 'rain', head: '☔ 이동 중에 소나기가 쏟아졌어요', sub: '우산은 딱 하나뿐이에요.',
      ch: [
        { l: '{n}에게 우산을 양보한다', r: '"…그럼 같이 쓰자." {n}이 우산을 기울여 줬어요. 둘 다 반쯤 젖었어요.', fx: { m: 10, s: -4 } },
        { l: '같이 쓴다', r: '어깨가 닿을 만큼 가까이 걸었어요. {n}의 귀가 살짝 빨개졌어요.', fx: { m: 14, v: 3 } },
        { l: '그냥 뛰어간다', r: '둘이서 깔깔 웃으며 뛰어갔어요. 비 맞은 {n}도 화보 같았어요.', fx: { m: 6, s: -6, v: 2 } }] },
    { id: 'fan', head: '📱 길에서 팬이 {n}을(를) 알아봤어요', sub: '"저… 사인 해주실 수 있어요?" 두근두근하는 눈빛이에요.',
      ch: [
        { l: '정성껏 사인해 준다', r: '팬의 눈이 반짝였어요. 이 이야기가 팬카페에 올라간대요.', fx: { m: 8, f: 2 } },
        { l: '같이 사진을 찍어준다', r: '"인생샷 건졌다!"며 팬이 펄쩍 뛰었어요. 후기가 퍼지고 있어요.', fx: { m: 12, f: 3 } },
        { l: '조심스럽게 정중히 거절한다', r: '팬은 아쉬워했지만 이해해 줬어요. 괜히 마음이 무거워요.', fx: { m: -3, s: 3 } }] }
  ];

  // ── 저장 ──
  function load() {
    var s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!s.cards || typeof s.cards !== 'object') s.cards = {};    // { cid: 받은 시각 }
    if (!s.wait || typeof s.wait !== 'object') s.wait = {};       // { cid: 1 } 기다렸으면 다음 시그니처 확정
    if (typeof s.sinceDay !== 'number') s.sinceDay = 0;           // 마지막 사건 뒤 지난 날 수
    if (typeof s.total !== 'number') s.total = 0;
    return s;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} if (typeof saveAll === 'function') { try { saveAll(); } catch (e) {} } }
  function mealState() { try { return JSON.parse(localStorage.getItem('ph_meal') || '{}') || {}; } catch (e) { return {}; } }
  function debuted() {
    try { var d = (JSON.parse(localStorage.getItem('ph_agency') || '{}') || {}).done || {}; return Object.keys(d).filter(function (k) { return d[k] && typeof CHARS !== 'undefined' && CHARS[k]; }); } catch (e) { return []; }
  }
  function nameOf(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function nl(s) { return esc(s).replace(/\n/g, '<br>'); }
  function fill(t, cid) { return String(t).replace(/\{n\}/g, nameOf(cid)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function toast(m) { if (typeof showBagToast === 'function') { try { showBagToast(m); } catch (e) {} } }
  function cardImg(cid) { return 'happening-' + cid + '.jpg'; }
  function popupOpen() { return !!(document.getElementById('happening-pop') || document.getElementById('meal-event') || document.getElementById('issue-pop') || document.getElementById('rising-overlay')); }

  // ── 효과 적용 (기분/체력/비주얼은 ph_meal, 코인, 팬카페 회원) ──
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
        if (s.idols[cid]) { s.idols[cid].anon = (s.idols[cid].anon || 0) + fx.f; T.saveAllState(s); }
      } catch (e) {}
    }
  }
  function fxChips(fx) {
    var out = [];
    if (fx.m) out.push((fx.m > 0 ? '😊 기분 +' : '😢 기분 ') + fx.m);
    if (fx.s) out.push((fx.s > 0 ? '💪 체력 +' : '💪 체력 ') + fx.s);
    if (fx.v) out.push((fx.v > 0 ? '✨ 비주얼 +' : '✨ 비주얼 ') + fx.v);
    if (fx.c) out.push('🍔 ' + (fx.c > 0 ? '+' : '') + fx.c.toLocaleString());
    if (fx.f) out.push('👥 팬카페 회원 +' + fx.f);
    return out.map(function (t) { return '<span style="display:inline-block;margin:3px;padding:5px 11px;border-radius:999px;border:1.5px solid #FFD700;font-size:12px;font-weight:900;">' + t + '</span>'; }).join('');
  }

  // ── 팝업 틀 ──
  function pop(html) {
    var ov = document.getElementById('happening-pop');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'happening-pop';
      ov.style.cssText = 'position:fixed;inset:0;z-index:870;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;' + FONT;
      document.body.appendChild(ov);
    }
    ov.innerHTML = '<div style="width:100%;max-width:420px;background:linear-gradient(160deg,#1d1236,#2d1b4e);border:2px solid #C084FC;border-radius:20px;padding:20px 18px;color:#fff;box-shadow:0 10px 40px rgba(0,0,0,.6);">' + html + '</div>';
    return ov;
  }
  function closePop() { var ov = document.getElementById('happening-pop'); if (ov) ov.remove(); }
  var BTN = 'width:100%;padding:12px;margin-top:8px;border:none;border-radius:13px;font-size:14px;font-weight:900;color:#fff;cursor:pointer;text-align:left;' + FONT;
  function choiceBtn(i, label, bg) { return '<button data-i="' + i + '" style="' + BTN + 'background:' + (bg || 'rgba(255,255,255,.1)') + ';border:1.5px solid rgba(255,255,255,.2);">' + label + '</button>'; }
  function okBtn(label) { return '<button id="hp-ok" style="' + BTN + 'text-align:center;background:linear-gradient(135deg,#FF6B9D,#C084FC);">' + (label || '확인') + '</button>'; }
  function wire(sel, fn) { var ov = document.getElementById('happening-pop'); if (!ov) return; Array.prototype.forEach.call(ov.querySelectorAll(sel), function (b) { b.onclick = function () { fn(b); }; }); }

  // ── 시그니처 사건 흐름 ──
  function startSig(cid) {
    var d = SIG[cid]; if (!d) return false;
    var s = load();
    pop('<div style="font-size:12px;color:#ff8a8a;font-weight:900;margin-bottom:6px;">🚨 돌발 상황</div>' +
      '<div style="font-size:17px;font-weight:900;line-height:1.4;margin-bottom:6px;">' + esc(d.head) + '</div>' +
      '<div style="font-size:13px;color:#cfc4ee;line-height:1.55;margin-bottom:8px;">' + esc(d.sub) + '<br>어떻게 할까요?</div>' +
      choiceBtn(0, '🔍 찾으러 간다', 'rgba(255,107,157,.25)') + choiceBtn(1, '⏳ 기다린다'));
    wire('[data-i]', function (b) {
      if (b.getAttribute('data-i') === '0') searchStep(cid, [], []); else waitEnd(cid);
    });
    markRun(cid);
    return true;
  }
  function searchStep(cid, doneIdx, hints) {
    var d = SIG[cid];
    var hintHtml = hints.length ? '<div style="font-size:12.5px;color:#ffe08a;background:rgba(255,224,138,.1);border-radius:10px;padding:8px 10px;margin-bottom:8px;line-height:1.55;">💡 ' + nl(hints[hints.length - 1]) + '</div>' : '';
    var left = d.places.map(function (p, i) { return { p: p, i: i }; }).filter(function (x) { return doneIdx.indexOf(x.i) < 0; });
    pop('<div style="font-size:12px;color:#c9b8ff;font-weight:900;margin-bottom:6px;">🔍 ' + esc(nameOf(cid)) + ' 찾기 · 어디부터 가볼까요?</div>' + hintHtml +
      left.map(function (x) { return choiceBtn(x.i, x.p.n); }).join(''));
    wire('[data-i]', function (b) {
      var i = Number(b.getAttribute('data-i')), p = d.places[i];
      if (p.ok) { found(cid); return; }
      searchStep(cid, doneIdx.concat([i]), hints.concat([p.hint]));
    });
  }
  function found(cid) {
    var d = SIG[cid], s = load(), first = !s.cards[cid];
    var fx = { c: COIN_FIND, m: MOOD_FIND };
    applyFx(cid, fx);
    if (first) { s.cards[cid] = Date.now(); }
    delete s.wait[cid];
    s.total++; save(s);
    pop('<div style="font-size:12px;color:#7ee8a5;font-weight:900;margin-bottom:6px;">✅ 찾았다!</div>' +
      '<div style="font-size:14px;line-height:1.7;margin-bottom:10px;">' + nl(d.found) + '</div>' +
      '<div style="text-align:center;margin-bottom:6px;">' + fxChips(fx) + '</div>' +
      okBtn(first ? '📸 카드 보기' : '확인'));
    wire('#hp-ok', function () { if (first) cardReveal(cid); else closePop(); });
    fire_event('found', cid);
  }
  function waitEnd(cid) {
    var d = SIG[cid], s = load();
    var fx = { c: COIN_WAIT, m: MOOD_WAIT };
    applyFx(cid, fx);
    if (!s.cards[cid]) s.wait[cid] = 1;       // 기다렸으면 다음 시그니처 사건은 반드시 뜬다
    s.total++; save(s);
    pop('<div style="font-size:12px;color:#93C5FD;font-weight:900;margin-bottom:6px;">⏳ 기다렸더니…</div>' +
      '<div style="font-size:14px;line-height:1.7;margin-bottom:10px;">' + nl(d.wait) + '</div>' +
      '<div style="text-align:center;margin-bottom:6px;">' + fxChips(fx) + '</div>' +
      (!s.cards[cid] ? '<div style="font-size:11.5px;color:#aaa;text-align:center;margin-bottom:4px;">다음엔 직접 찾아보는 게 좋을지도 몰라요…</div>' : '') + okBtn());
    wire('#hp-ok', closePop);
    fire_event('wait', cid);
  }

  // ── 카드 획득 연출 ──
  function cardReveal(cid) {
    var d = SIG[cid] || {};
    var img = cardImg(cid) + '?v=1';
    var ov = pop('<div style="text-align:center;">' +
      '<div style="font-size:13px;color:#ffd700;font-weight:900;letter-spacing:2px;margin-bottom:8px;">📸 HAPPENING 카드 획득!</div>' +
      '<div id="hp-card" style="width:min(72vw,300px);aspect-ratio:1054/1492;margin:0 auto 10px;border-radius:14px;overflow:hidden;border:2px solid #ffd700;box-shadow:0 0 40px #ffd70099;background:linear-gradient(160deg,#3b1d6e,#7c3aed 55%,#f59e0b);display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(.8);transition:all .6s;">' +
      '<img src="' + img + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.outerHTML=\'<div style=&quot;font-size:60px;&quot;>📸</div>\'"></div>' +
      '<div style="font-size:14px;font-weight:900;margin-bottom:2px;">' + esc(nameOf(cid)) + ' · HAPPENING</div>' +
      '<div style="font-size:12px;color:#cfc4ee;margin-bottom:8px;">“' + esc(d.quote || '') + '”</div>' +
      '<div style="font-size:11px;color:#aaa;margin-bottom:6px;">더보기 > 📸 해프닝 카드 에서 다시 볼 수 있어요</div>' +
      okBtn() + '</div>');
    setTimeout(function () { var c = document.getElementById('hp-card'); if (c) { c.style.opacity = '1'; c.style.transform = 'scale(1)'; } }, 80);
    wire('#hp-ok', closePop);
  }

  // ── 일반 사건 ──
  function startGeneric(cid, id) {
    var t = null;
    GENERIC.forEach(function (g) { if (g.id === id) t = g; });
    t = t || pick(GENERIC);
    pop('<div style="font-size:12px;color:#ffb36b;font-weight:900;margin-bottom:6px;">📰 해프닝</div>' +
      '<div style="font-size:16px;font-weight:900;line-height:1.4;margin-bottom:6px;">' + esc(fill(t.head, cid)) + '</div>' +
      '<div style="font-size:13px;color:#cfc4ee;line-height:1.55;margin-bottom:6px;">' + esc(fill(t.sub, cid)) + '</div>' +
      t.ch.map(function (c, i) { return choiceBtn(i, esc(fill(c.l, cid))); }).join(''));
    markRun(cid);
    wire('[data-i]', function (b) {
      var c = t.ch[Number(b.getAttribute('data-i'))], fx = c.fx, text = c.r;
      if (c.risk && Math.random() < c.risk.p) { fx = c.risk.fx; text = c.risk.r; }
      applyFx(cid, fx);
      var s = load(); s.total++; save(s);
      pop('<div style="font-size:14px;line-height:1.7;margin-bottom:10px;">' + nl(fill(text, cid)) + '</div>' +
        '<div style="text-align:center;margin-bottom:6px;">' + fxChips(fx) + '</div>' + okBtn());
      wire('#hp-ok', closePop);
      fire_event('generic', cid);
    });
    return true;
  }

  function fire_event(kind, cid) { try { window.dispatchEvent(new CustomEvent('ph-happening-done', { detail: { kind: kind, cid: cid } })); } catch (e) {} }
  function markRun(cid) { var s = load(); s.sinceDay = 0; s.lastCid = cid; save(s); }

  // ── 언제 터지나: 날짜가 넘어갈 때 ──
  function tomorrowSched(cid, st) {      // 내일이 컴백/드라마 촬영 날인지
    var sc = st.sched && st.sched[cid];
    return !!sc && (sc.type === 'drama' || sc.type === 'comeback') && sc.day === st.day + 1;
  }
  function chooseFor(cid) {              // 이 아이돌에게 어떤 사건이 뜰지
    var s = load();
    if (!s.cards[cid] && (s.wait[cid] || Math.random() < SIG_RATE)) return 'sig';
    return 'gen';
  }
  function trigger(cid, kind) {
    if (popupOpen()) return false;
    return kind === 'sig' ? startSig(cid) : startGeneric(cid);
  }

  var lastDay = null;
  function tick() {
    var st = mealState(), day = st.day;
    if (!day) return;
    if (lastDay == null) { var sv = load(); lastDay = (typeof sv.lastDay === 'number') ? sv.lastDay : day; }
    if (day <= lastDay) { if (day < lastDay) { lastDay = day; var s0 = load(); s0.lastDay = day; save(s0); } return; }
    lastDay = day;
    var s = load(); s.lastDay = day; s.sinceDay++; save(s);
    var ids = debuted(); if (!ids.length) return;
    var eve = ids.filter(function (c) { return tomorrowSched(c, st); });
    var cid, p;
    if (eve.length) { cid = pick(eve); p = EVE_CHANCE + (s.sinceDay - 1) * PITY_PER_DAY; }
    else { cid = pick(ids); p = BASE_CHANCE + (s.sinceDay - 1) * PITY_PER_DAY; }
    if (Math.random() >= Math.min(CHANCE_MAX, p)) return;
    var kind = chooseFor(cid);
    (function wait(n) {                                   // 다른 팝업이 닫힌 뒤에 보여준다
      if (popupOpen()) { if (n < 40) setTimeout(function () { wait(n + 1); }, 800); return; }
      setTimeout(function () { trigger(cid, kind); }, 900);
    })(0);
  }
  setInterval(tick, 1500);

  // ── 더보기: 해프닝 카드 모음 ──
  function openGallery() {
    var s = load(), ids = Object.keys(SIG);
    var n = ids.filter(function (c) { return s.cards[c]; }).length;
    var old = document.getElementById('hp-gallery'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'hp-gallery';
    ov.style.cssText = 'position:fixed;inset:0;z-index:860;background:linear-gradient(160deg,#150f26,#2a1745);overflow-y:auto;color:#fff;padding:16px;' + FONT;
    ov.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;"><div style="font-size:18px;font-weight:900;">📸 해프닝 카드 <span style="font-size:13px;color:#ffd700;">' + n + '/' + ids.length + '</span></div>' +
      '<button id="hpg-x" style="background:rgba(255,255,255,.12);border:none;border-radius:10px;color:#fff;padding:7px 12px;font-size:13px;cursor:pointer;">닫기</button></div>' +
      '<div style="font-size:12px;color:#cfc4ee;line-height:1.55;margin-bottom:12px;">하루를 보내다 가끔 터지는 돌발 상황에서 아이돌을 직접 찾아내야 얻을 수 있어요. 뽑기로는 못 얻어요.</div>' +
      '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">' +
      ids.map(function (cid) {
        var have = !!s.cards[cid];
        return '<div data-cid="' + cid + '" style="position:relative;aspect-ratio:1054/1492;border-radius:12px;overflow:hidden;border:2px solid ' + (have ? '#ffd700' : 'rgba(255,255,255,.15)') + ';background:#1b1330;cursor:' + (have ? 'pointer' : 'default') + ';">' +
          (have ? '<img src="' + cardImg(cid) + '?v=1" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.outerHTML=\'<div style=&quot;display:flex;height:100%;align-items:center;justify-content:center;font-size:44px;&quot;>📸</div>\'">'
            : '<div style="display:flex;flex-direction:column;height:100%;align-items:center;justify-content:center;gap:6px;color:#777;"><div style="font-size:38px;filter:grayscale(1);">🔒</div><div style="font-size:12px;font-weight:900;">' + esc(nameOf(cid)) + '</div><div style="font-size:10px;">돌발 상황을 찾아보세요</div></div>') +
          '</div>';
      }).join('') + '</div>';
    document.body.appendChild(ov);
    ov.querySelector('#hpg-x').onclick = function () { ov.remove(); };
    Array.prototype.forEach.call(ov.querySelectorAll('[data-cid]'), function (el) {
      el.onclick = function () { var c = el.getAttribute('data-cid'); if (s.cards[c]) cardReveal(c); };
    });
  }
  window.openHappeningCards = openGallery;

  (function wireMore() {
    if (typeof window.openMoreMenu !== 'function' || typeof window.moreMenuTileHtml !== 'function') { setTimeout(wireMore, 200); return; }
    var original = window.openMoreMenu;
    if (original.__hpWrapped) return;
    var wrapped = function () {
      var res = original.apply(this, arguments);
      var grid = document.getElementById('more-menu-grid');
      if (grid && !document.getElementById('more-happening-tile')) {
        var s = load(), n = Object.keys(SIG).filter(function (c) { return s.cards[c]; }).length;
        grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('📸', '해프닝 카드 ' + n + '/' + Object.keys(SIG).length, ACC, 'openHappeningCards()'));
        if (grid.lastElementChild) grid.lastElementChild.id = 'more-happening-tile';
      }
      return res;
    };
    wrapped.__hpWrapped = true;
    window.openMoreMenu = wrapped;
  })();

  // 테스트용 주소: ?happening=sion / ?happening=generic
  try {
    var q = new URLSearchParams(location.search).get('happening');
    if (q) setTimeout(function () {
      var ids = debuted(), cid = ids[0] || 'sion';
      if (q === 'generic') startGeneric(cid); else if (SIG[q]) startSig(q); else startSig(cid);
    }, 4000);
  } catch (e) {}

  window.__happeningTest = { SIG: SIG, GENERIC: GENERIC, load: load, save: save, startSig: startSig, startGeneric: startGeneric, cardReveal: cardReveal, found: found, waitEnd: waitEnd, tick: tick, chooseFor: chooseFor, applyFx: applyFx, openGallery: openGallery,
    CFG: { BASE_CHANCE: BASE_CHANCE, EVE_CHANCE: EVE_CHANCE, PITY_PER_DAY: PITY_PER_DAY, CHANCE_MAX: CHANCE_MAX, SIG_RATE: SIG_RATE } };
})();
