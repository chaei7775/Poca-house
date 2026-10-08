// ════════════════════════════════════════════════════════════
// 📈 음원차트 — 로직 (music-chart.js)   ※ 화면은 music-chart-ui.js
//
// 작곡 테이블에서 정규 앨범을 아이돌에게 "타이틀곡"으로 주면(저작권 슬롯) 그 곡이 차트에 올라간다.
//  · 차트: 라이벌 100곡(콘크리트 1위 "국민가수 한소리" 포함) + 내 곡이 함께 순위 경쟁. 순위는 하루 보내기마다 갱신,
//          화면에는 24시간 시간대별 순위 그래프(밤 22~01시 팬덤 화력↑, 낮 13~17시 대중성 싸움↓)
//  · 내 곡 점수 = 앨범 기본 + 작곡 완성도(도감 칸 수) + 이번 주 트렌드 장르 + 팬 수 + 인지도 + 히든카드 + 신곡 버스트 + 총공 + 사건
//  · 총공(스밍): 미니게임으로 점수를 올림 (하루 1번, 곡마다). 점수는 하루마다 절반으로 식음
//  · 사건: 역주행 떡상 / 사재기 의혹(해명해야 함) / 국민가수 기습 컴백 / 팬덤 자발 총공
//  · 음악방송: 금·토·일(게임 DAY%7 = 5,6,0)에 순위가 3위 안이면 출전 → 1위 발표 → 앵콜 미니게임
//  · 연결: 1위 하는 날 투자 [앨범 제작]의 투자금 가치 +30% (곡당 최대 3일)
// 저장: localStorage 'ph_chart' (ph_ 로 시작 → 클라우드 저장 자동)
// 값을 바꾸고 싶으면 아래 [설정]만 고치면 됨.
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var KEY = 'ph_chart';
  var SONG_LIFE = 30;                  // 곡이 차트에 머무는 게임 DAY 수
  var BASE_FULL = 18;                  // 정규 앨범 기본 점수
  var NOTE_PER = 0.25, NOTE_MAX = 10;  // 작곡 도감 한 칸당 점수 / 최대
  var TREND_BONUS = 6;                 // 이번 주 트렌드 장르와 같으면
  var FAN_MAX = 28, FAN_LOG = 3.2;     // 팬 수 점수 (멤버 수 10^3.2 ≈ 1600명이면 만점)
  var FAME_MAX = 10;                   // 인지도 100 = 10점
  var HID_EACH = 1.5, HID_ENH = 0.8, HID_MAX = 14;   // 히든카드 한 장당 / 강화 배율 가산 / 최대
  var BURST = 14, BURST_DECAY = 0.65;  // 신곡 버스트
  var AGE_DECAY = 0.45;                // 3일 뒤부터 하루마다 깎이는 점수
  var BOOST_DECAY = 0.55, BOOST_MAX = 30;
  var STREAM_STAMINA = 10;             // 총공 1번 스태미나
  var HOUR_FACTOR = [4, 5, 3, 0, -1, -1, -1, 0, 0, 0, 0, 0, -1, -3, -4, -4, -3, -1, 0, 1, 2, 3, 4, 5];   // 시간대별 내 곡 점수 가감(%)
  var RANK_PAY = [[1, 300000], [3, 150000], [10, 60000], [30, 20000], [100, 5000]];   // 하루 정산 코인(순위 ≤ 앞 숫자)
  var FIRST_ONE_WISH = 5;              // 처음 1위 했을 때 소원의 조각
  var INVEST_BUMP = 1.3, INVEST_MAX_DAYS = 3;
  var EVENT_CHANCE = 0.35, EVENT_GAP = 2;
  var SHOW_DAYS = [5, 6, 0];
  var WIN_PAY = 500000, SHOW_WISH = 3;

  // ════════ 도우미 ════════
  function J(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? d : v; } catch (e) { return d; } }
  function W(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function gameDay() { var m = J('ph_meal', null); return m && m.day ? Number(m.day) : 0; }
  function hash(a, b, c) { var h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; h = h ^ (h >>> 16); return ((h >>> 0) % 20001) / 10000 - 1; }   // -1~1 고정 난수
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 0.5; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function nameOf(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function toast(m) { try { if (typeof showBagToast === 'function') showBagToast(m); } catch (e) {} }
  function addCoins(n) { try { coins += n; if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); if (typeof saveAll === 'function') saveAll(); } catch (e) {} }
  function addWish(n) {
    try {
      wishFragments += n; localStorage.setItem('ph_wish', wishFragments);
      if (typeof addToBag === 'function') addToBag('🧩', '소원의 조각', 'wish', n, '100개 모으면 소원의 결정! (현재: ' + wishFragments + '개)');
      if (typeof saveAll === 'function') saveAll();
    } catch (e) {}
  }

  // ════════ 라이벌 100곡 ════════
  var TITLES_A = ['봄날의 편지', '새벽 세 시', '푸른 밤', '너의 오후', '여름 끝자락', '별빛 아래서', '첫눈이 오면', '네온 시티', '우리의 계절', '파도소리',
    '하늘 정거장', '꿈결', '밀크티 한 잔', '노을 지는 길', '불꽃놀이', '한밤의 라디오', '겨울 편지', '체리 러시', '블루 엔딩', '마지막 버스'];
  var VARIANT = ['', ' (Piano Ver.)', ' Part.2', ' (Remix)', ' 2.0'];
  var ARTISTS = ['블루문', '하늘정원', 'NEON 7', '소나기', '달빛서재', '체리팝', '루나벨', '오로라', '밤하늘', '제이드',
    '솔트', '플로우', '이든', '미라', '도담', '라온', '벨벳', '썬데이', '모모', '시그널'];
  var RIVALS = (function () {
    var out = [
      { title: '오래된 편지', artist: '국민가수 한소리', base: 99, king: true },
      { title: '봄날의 노트', artist: '국민 요정 아이누', base: 96 },
      { title: '새벽 세 시', artist: '블루문', base: 93 }
    ];
    for (var i = 3; out.length < 100; i++) {
      var r = out.length;
      out.push({ title: TITLES_A[(i * 3) % 20] + VARIANT[Math.floor(i / 20) % 5], artist: ARTISTS[(i * 7) % 20], base: 93 - (r - 2) * 0.8 });
    }
    // 같은 이름 중복 방지
    var seen = {};
    out.forEach(function (x, i) { var k = x.title + '|' + x.artist; if (seen[k]) x.title += ' ' + (i % 9 + 2); seen[k] = 1; x.id = 'rv' + i; });
    return out;
  })();

  // ════════ 저장 ════════
  function load() {
    var s = J(KEY, null);
    if (!s || typeof s !== 'object') s = {};
    s.v = 1;
    if (!Array.isArray(s.songs)) s.songs = [];
    if (!s.rv || typeof s.rv !== 'object') s.rv = {};          // 라이벌 현재 점수
    if (!Array.isArray(s.guests)) s.guests = [];               // 임시 라이벌 (기습 컴백)
    if (!s.last) s.last = {};                                  // 어제 순위 { id: rank }
    if (typeof s.pending !== 'number') s.pending = 0;          // 아직 안 받은 정산 코인
    if (!Array.isArray(s.news)) s.news = [];                   // 화면에서 한 번씩 보여줄 소식
    if (!Array.isArray(s.stage)) s.stage = [];                // 음방 활동(일정) 뒤 아직 안 한 무대 미니게임
    if (!s.stats) s.stats = { ones: 0, trophies: 0, peak: 101, first: false, shows: 0, scandalOk: 0 };
    if (typeof s.lastEv !== 'number') s.lastEv = -99;
    if (s.lastDay === undefined) s.lastDay = null;
    return s;
  }
  function save(s) { W(KEY, s); }

  // ════════ 곡 점수 ════════
  function members(cid) {
    try { var t = window.__fancafeTest, ic = t.getIdol ? t.getIdol(cid) : t.loadAll().idols[cid]; return ic ? t.members(ic) : 1; } catch (e) { return 1; }
  }
  function fameOf(cid) { var d = J('ph_drama', {}); return clamp(Number(d && d.fame && d.fame[cid]) || 0, 0, 100); }
  function hiddenBonus(cid) {
    var sum = 0;
    try {
      HIDDEN_CARDS.forEach(function (h) {
        if (h.charId !== cid || ownedHiddenCards.indexOf(h.id) === -1) return;
        var m = window.__hiddenFxTest ? window.__hiddenFxTest.multOf(h.id) : 1;
        sum += HID_EACH + HID_ENH * (m - 1);
      });
    } catch (e) {}
    return Math.min(HID_MAX, sum);
  }
  function trendGenre(day) {
    try { var G = window.__albumTest.GENRES, wk = Math.floor((Math.max(1, day) - 1) / 7); return G[(wk * 5 + 3) % G.length]; } catch (e) { return null; }
  }
  function parts(song, day) {
    var age = Math.max(0, day - song.rel);
    var trend = trendGenre(day);
    var p = {
      base: BASE_FULL,
      note: song.q || 0,
      trend: (trend && song.genre === trend.id) ? TREND_BONUS : 0,
      fans: FAN_MAX * clamp(Math.log(Math.max(1, members(song.cid))) / Math.LN10 / FAN_LOG, 0, 1),
      fame: FAME_MAX * fameOf(song.cid) / 100,
      hidden: hiddenBonus(song.cid),
      burst: BURST * Math.pow(BURST_DECAY, age),
      boost: clamp(song.boost || 0, 0, BOOST_MAX),
      mods: (song.mods || []).reduce(function (a, m) { return a + m.v * Math.min(1, m.d / Math.max(1, m.d0 || m.d)); }, 0),
      age: -AGE_DECAY * Math.max(0, age - 2)
    };
    p.total = Math.max(1, p.base + p.note + p.trend + p.fans + p.fame + p.hidden + p.burst + p.boost + p.mods + p.age);
    return p;
  }
  function powerOf(song, day) { return parts(song, day).total; }

  // ════════ 차트 만들기 ════════
  function rivalPower(s, i) { var v = s.rv[RIVALS[i].id]; return typeof v === 'number' ? v : RIVALS[i].base; }
  // 시간대 h(0~23)의 TOP100 목록
  function chartAt(h, day, s) {
    s = s || load(); day = day || gameDay();
    var list = [];
    RIVALS.forEach(function (r, i) {
      list.push({ id: r.id, kind: 'rival', title: r.title, artist: r.artist, king: !!r.king, power: rivalPower(s, i) + hash(day, i, h) * 1.2 });
    });
    s.guests.forEach(function (g, i) { list.push({ id: 'g' + i, kind: 'guest', title: g.title, artist: g.artist, power: g.power + hash(day, 900 + i, h) * 1.0 }); });
    s.songs.forEach(function (sg) {
      if (sg.over) return;
      list.push({ id: sg.id, kind: 'mine', song: sg, title: sg.title, artist: nameOf(sg.cid), power: powerOf(sg, day) * (1 + HOUR_FACTOR[h] / 100) });
    });
    list.sort(function (a, b) { return b.power - a.power; });
    list.forEach(function (e, i) { e.rank = i + 1; var prev = s.last[e.id]; e.delta = (typeof prev === 'number') ? prev - e.rank : null; });
    return list;
  }
  function hourRanks(song, day, s) { var out = []; for (var h = 0; h < 24; h++) { var l = chartAt(h, day, s), me = l.filter(function (e) { return e.id === song.id; })[0]; out.push(me ? me.rank : 101); } return out; }
  function nowHour() { return new Date().getHours(); }

  // ════════ 앨범 곡 가져오기 (타이틀곡 슬롯 → 차트 곡) ════════
  function albumNote() { try { return window.__albumTest.loadNote() || {}; } catch (e) { return {}; } }
  function genreOfRelease(startMs, title) {
    var note = albumNote(), best = null;
    Object.keys(note).forEach(function (k) {
      var p = k.split('_'); if (p[1] !== 'full') return;
      var at = Number(note[k] && note[k].at) || 0;
      if (at <= startMs + 1000 && (!best || at > best.at)) best = { at: at, g: p[0] };
    });
    if (best) return best.g;
    try { var G = window.__albumTest.GENRES, h = 0; for (var i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 9973; return G[h % G.length].id; } catch (e) { return 'pop'; }
  }
  function genreName(id) { try { var g = window.__albumTest.GENRES.filter(function (x) { return x.id === id; })[0]; return g ? g.name : id; } catch (e) { return id; } }
  function syncSongs(s, day) {
    var slots = [];
    try { slots = (window.__albumTest.loadRoy().slots || []); } catch (e) {}
    var changed = false;
    slots.forEach(function (sl) {
      var id = 's' + sl.start + '_' + sl.cid;
      if (s.songs.some(function (x) { return x.id === id; })) return;
      var q = Math.min(NOTE_MAX, Object.keys(albumNote()).length * NOTE_PER);
      s.songs.push({ id: id, cid: sl.cid, title: sl.title, genre: genreOfRelease(sl.start, sl.title), tier: 'full', rel: day, q: r1(q), boost: 0, mods: [], hist: [], peak: 101, rank: null, prev: null, inv: 0, streamedDay: -1, ones: 0 });
      s.news.push({ type: 'release', id: id });
      changed = true;
    });
    return changed;
  }

  // ════════ 하루 정산 ════════
  function payFor(rank) { for (var i = 0; i < RANK_PAY.length; i++) if (rank <= RANK_PAY[i][0]) return RANK_PAY[i][1]; return 0; }
  function investBump() {
    try {
      var T = window.__investTest, any = false;
      (T.S.pos || []).forEach(function (p) { if (p.sec === 'album' && !p.mature && typeof p.value === 'number') { p.value = Math.round(p.value * INVEST_BUMP); any = true; } });
      if (any) T.save();
      return any;
    } catch (e) { return false; }
  }
  var EVENTS = {
    viral:  { name: '역주행 떡상', text: function (n) { return n + '의 무대 직캠이 숏폼에서 1,000만 뷰를 기록했어요! 음원이 차트를 역주행해요!'; } },
    scandal:{ name: '사재기 의혹', text: function (n) { return '경쟁 기획사가 ' + n + '의 음원 사재기 의혹 찌라시를 퍼뜨렸어요! 해명하지 않으면 순위가 급락해요.'; } },
    comeback:{ name: '국민가수 기습 컴백', text: function () { return '국민가수 한소리가 기습 컴백했어요! 차트 알박기로 1위 경쟁이 치열해져요.'; } },
    fanstream:{ name: '팬덤 자발 총공', text: function (n) { return n + ' 팬덤이 스스로 스밍 총공을 시작했어요! 3일 동안 차트 점수가 올라가요.'; } }
  };
  function rollEvent(s, day) {
    if (s.ev || day - s.lastEv < EVENT_GAP || Math.random() >= EVENT_CHANCE) return;
    var live = s.songs.filter(function (x) { return !x.over; });
    if (!live.length) return;
    var song = live[Math.floor(Math.random() * live.length)];
    var r = Math.random(), type = r < 0.35 ? 'viral' : r < 0.60 ? 'scandal' : r < 0.85 ? 'comeback' : 'fanstream';
    if (type === 'scandal' && (song.rank || 101) > 40) type = 'viral';
    s.lastEv = day;
    var ev = { type: type, sid: song.id, cid: song.cid, day: day, name: EVENTS[type].name, text: EVENTS[type].text(nameOf(song.cid)), done: false };
    if (type === 'viral') { song.mods.push({ v: 25, d: 5, d0: 5, n: '역주행' }); try { if (window.__fancafeViral) { var vr = window.__fancafeViral(song.cid); ev.gain = vr && vr.gain; } } catch (e) {} ev.done = true; }
    else if (type === 'comeback') { s.guests.push({ title: '기습 컴백 신곡', artist: '국민가수 한소리', power: 104, daysLeft: 5 }); ev.done = true; }
    else if (type === 'fanstream') { song.mods.push({ v: 12, d: 3, d0: 3, n: '팬덤 총공' }); ev.done = true; }
    else { ev.expire = day + 2; }
    s.ev = ev;
    s.news.push({ type: 'event', ev: ev });
  }
  function processDay(s, day) {
    // 라이벌 점수 움직임
    RIVALS.forEach(function (r, i) {
      var cur = rivalPower(s, i), next = cur + (r.base - cur) * 0.3 + gauss() * (r.king ? 1.0 : 1.8);
      s.rv[r.id] = r1(clamp(next, 5, 110));
    });
    s.guests = s.guests.filter(function (g) { g.daysLeft--; return g.daysLeft > 0; });
    // 곡 나이·점수 식히기
    s.songs.forEach(function (sg) {
      if (sg.over) return;
      sg.boost = r1((sg.boost || 0) * BOOST_DECAY);
      sg.mods = (sg.mods || []).filter(function (m) { m.d--; return m.d > 0; });
    });
    // 사재기 해명 기한이 지남 → 급락
    if (s.ev && s.ev.type === 'scandal' && !s.ev.done && day >= s.ev.expire) {
      var sg0 = s.songs.filter(function (x) { return x.id === s.ev.sid; })[0];
      if (sg0) sg0.mods.push({ v: -28, d: 4, d0: 4, n: '사재기 의혹' });
      s.ev.done = true; s.ev.result = 'ignored';
      s.news.push({ type: 'scandal-fail', cid: s.ev.cid });
    }
    if (s.ev && s.ev.done && day - s.ev.day >= 3) s.ev = null;
    // 오늘 순위 (낮 12시 기준)
    var list = chartAt(12, day, s), ranks = {}, first = false, totalPay = 0;
    list.forEach(function (e) { ranks[e.id] = e.rank; });
    s.songs.forEach(function (sg) {
      if (sg.over) return;
      sg.prev = sg.rank; sg.rank = ranks[sg.id] || 101;
      sg.peak = Math.min(sg.peak || 101, sg.rank);
      sg.hist.push({ d: day, r: sg.rank }); if (sg.hist.length > 40) sg.hist.shift();
      s.stats.peak = Math.min(s.stats.peak, sg.rank);
      var pay = payFor(sg.rank); if (pay) totalPay += pay;
      if (sg.rank === 1) {
        sg.ones = (sg.ones || 0) + 1; s.stats.ones++;
        if (!s.stats.first) { s.stats.first = true; first = true; }
        if ((sg.inv || 0) < INVEST_MAX_DAYS && investBump()) { sg.inv = (sg.inv || 0) + 1; s.news.push({ type: 'invest', title: sg.title }); }
        s.news.push({ type: 'allkill', id: sg.id, first: first });
      }
      if (day - sg.rel >= SONG_LIFE) { sg.over = true; s.news.push({ type: 'end', id: sg.id }); }
    });
    s.last = ranks;
    s.pending += totalPay;
    if (first) { addWish(FIRST_ONE_WISH); }
    // 음악방송: 금·토·일에 3위 안이면 출전
    s.show = null;
    if (SHOW_DAYS.indexOf(day % 7) !== -1) {
      var best = s.songs.filter(function (x) { return !x.over && x.rank && x.rank <= 3; }).sort(function (a, b) { return a.rank - b.rank; })[0];
      if (best) { s.show = { day: day, sid: best.id, done: false }; s.news.push({ type: 'show' }); }
    }
    rollEvent(s, day);
    try { if (typeof checkQuestProgress === 'function' && s.stats.first) checkQuestProgress('chart_first_one'); } catch (e) {}
  }
  // 아직 순위가 없는 새 곡에 오늘 순위를 매김
  function rankNew(s, day) {
    var l = null;
    s.songs.forEach(function (sg) {
      if (sg.over || sg.rank) return;
      l = l || chartAt(12, day, s);
      var me = l.filter(function (e) { return e.id === sg.id; })[0];
      sg.rank = me ? me.rank : 101; sg.peak = Math.min(sg.peak || 101, sg.rank);
    });
  }
  function tick() {
    var day = gameDay(); if (!day) return;
    var s = load();
    var changed = syncSongs(s, day);
    if (s.lastDay === null) { s.lastDay = day; rankNew(s, day); save(s); return; }          // 처음 켠 날은 정산 없음
    if (day < s.lastDay) { s.lastDay = day; save(s); return; }
    if (day === s.lastDay) { if (changed) { rankNew(s, day); save(s); } return; }
    var from = Math.max(s.lastDay + 1, day - 7);                            // 며칠 쉬었어도 최대 7일치만
    for (var d = from; d <= day; d++) processDay(s, d);
    s.lastDay = day;
    syncSongs(s, day); rankNew(s, day);      // 방금 올라온 새 곡도 순위
    if (s.news.length > 8) s.news = s.news.slice(-8);      // 오래 안 열었어도 소식은 최근 8개만
    save(s);
    var ones = s.news.filter(function (n) { return n.type === 'allkill'; }).length;
    if (ones) toast('📈 차트 1위! 더보기 > 음원차트를 확인해요');
    else if (s.news.length) toast('📈 음원차트에 소식이 있어요');
  }

  // ════════ 총공 ════════
  function canStream(s, sid) { var sg = s.songs.filter(function (x) { return x.id === sid; })[0]; return !!sg && !sg.over && sg.streamedDay !== gameDay(); }
  // power: 미니게임 결과 0~1
  function applyStream(sid, power) {
    var s = load(), sg = s.songs.filter(function (x) { return x.id === sid; })[0], day = gameDay();
    if (!sg || sg.over || sg.streamedDay === day) return null;
    var gain = r1(6 + 12 * clamp(power, 0, 1));
    sg.boost = r1(Math.min(BOOST_MAX, (sg.boost || 0) + gain)); sg.streamedDay = day;
    var l = chartAt(12, day, s), me = l.filter(function (e) { return e.id === sg.id; })[0];
    var before = sg.rank; sg.prev = before; sg.rank = me ? me.rank : 101; sg.peak = Math.min(sg.peak, sg.rank);
    save(s);
    return { gain: gain, before: before, after: sg.rank };
  }
  function spendStreamStamina() {
    try { if (stamina < STREAM_STAMINA) return false; stamina -= STREAM_STAMINA; saveStamina(); return true; } catch (e) { return false; }
  }

  // ════════ 사재기 해명 ════════
  function resolveScandal(result) {      // 'clear' 해명 성공 / 'half' 팬덤 반박(절반) / 'fail' 실패
    var s = load(); if (!s.ev || s.ev.type !== 'scandal' || s.ev.done) return false;
    var sg = s.songs.filter(function (x) { return x.id === s.ev.sid; })[0];
    if (sg) {
      if (result === 'half') sg.mods.push({ v: -14, d: 3, d0: 3, n: '사재기 의혹(반박)' });
      else if (result === 'fail') sg.mods.push({ v: -28, d: 4, d0: 4, n: '사재기 의혹' });
      else { sg.mods.push({ v: 8, d: 3, d0: 3, n: '해명 성공 응원' }); s.stats.scandalOk++; }
    }
    s.ev.done = true; s.ev.result = result; save(s); return true;
  }

  // ════════ 음악방송 ════════
  // 결과를 정해서 돌려줌 (연출은 화면이)
  function runShow() {
    var s = load(); if (!s.show || s.show.done) return null;
    var sg = s.songs.filter(function (x) { return x.id === s.show.sid; })[0]; if (!sg) return null;
    var list = chartAt(21, gameDay(), s), rival = list.filter(function (e) { return e.id !== sg.id && e.kind !== 'mine'; })[0];
    var mine = powerOf(sg, gameDay()) + gauss() * 3, theirs = (rival ? rival.power : 90) + gauss() * 3;
    if (sg.rank === 1) mine += 4;
    var res = { win: mine > theirs, mine: Math.round(mine * 10), theirs: Math.round(theirs * 10), rival: rival ? rival.artist + ' - ' + rival.title : '', title: sg.title, cid: sg.cid };
    s.show.done = true; s.show.res = res; s.stats.shows++;
    if (res.win) { s.stats.trophies++; addCoins(WIN_PAY); addWish(SHOW_WISH); }
    save(s); return res;
  }
  function encoreReward(hits) {      // 앵콜 미니게임 0~3 성공
    var s = load();
    if (!s.show || !s.show.res || !s.show.res.win || s.show.enc) return null;
    s.show.enc = hits;
    var out = { hits: hits, coins: 0, card: false };
    if (hits >= 1) { out.coins = hits * 100000; addCoins(out.coins); }
    if (hits >= 3) { out.card = true; try { if (typeof addToBag === 'function') addToBag('🏆', '1위 기념 트로피 포토카드', 'material', 1, '음악방송 1위 앵콜 대성공 기념 포토카드'); } catch (e) {} }
    save(s); return out;
  }

  // ════════ 음방 활동(기획사 일정) ════════
  var STAGE_BASE_MOD = 3, STAGE_COIN = 20000, STAGE_COIN_STAR = 20000, STAGE_MOD = 4, STAGE_MOD_STAR = 2;
  function hasSong(cid) { return load().songs.some(function (x) { return !x.over && x.cid === cid; }); }
  function bestSong(s, cid) { return s.songs.filter(function (x) { return !x.over && x.cid === cid; }).sort(function (a, b) { return (a.rank || 101) - (b.rank || 101); })[0]; }
  // 일정 날 정산 때: 곡에 기본 점수를 주고, 무대 미니게임을 기다리는 목록에 올림
  function musicSettle(cid, quality) {
    var s = load(), sg = bestSong(s, cid); if (!sg) return false;
    sg.mods.push({ v: STAGE_BASE_MOD, d: 2, d0: 2, n: '음방 활동' });
    s.stage.push({ id: 'st' + Date.now() + cid, cid: cid, q: quality || 'good', day: gameDay(), sid: sg.id });
    if (s.stage.length > 6) s.stage = s.stage.slice(-6);
    save(s); return true;
  }
  function pendingStage(cid) { return load().stage.filter(function (x) { return !cid || x.cid === cid; })[0] || null; }
  // stars 0~5 (라운드 0~3 + 퍼펙트 게이지 0~2)
  function musicStageDone(id, stars) {
    var s = load(), i = -1; s.stage.forEach(function (x, k) { if (x.id === id) i = k; });
    if (i < 0) return null;
    var st = s.stage.splice(i, 1)[0], sg = s.songs.filter(function (x) { return x.id === st.sid; })[0] || bestSong(s, st.cid);
    stars = clamp(Math.round(stars), 0, 5);
    var coinsGain = STAGE_COIN + STAGE_COIN_STAR * stars, boost = STAGE_MOD + STAGE_MOD_STAR * stars, gain = 0;
    if (sg) { sg.mods.push({ v: boost, d: 3, d0: 3, n: '음방 무대' }); }
    if (stars >= 5) { try { if (window.__fancafeViral) { var vr = window.__fancafeViral(st.cid); gain = (vr && vr.gain) || 0; } } catch (e) {} }
    s.stats.stages = (s.stats.stages || 0) + 1;
    save(s); addCoins(coinsGain);
    return { coins: coinsGain, boost: boost, fans: gain, stars: stars, cid: st.cid };
  }

  // ════════ 정산 받기 ════════
  function claimPending() { var s = load(), n = s.pending; if (n > 0) { s.pending = 0; save(s); addCoins(n); } return n; }

  // ════════ 퀘스트 · 칭호 ════════
  (function reg(n) {
    try {
      if (typeof QUESTS !== 'undefined' && !QUESTS.chart_first_one) QUESTS.chart_first_one = { title: '차트 1위', desc: '내 곡을 음원차트 1위에 올려보자', condition: 'chart_first_one', rewardCoins: 3000, rewardExp: 100, type: 'tutorial' };
    } catch (e) {}
    try {
      if (typeof TITLES !== 'undefined' && Array.isArray(TITLES)) {
        var add = function (o) { if (!TITLES.some(function (t) { return t.id === o.id; })) TITLES.push(o); };
        add({ id: 'chart_one', cat: '📈 음원차트', name: '음원차트 1위', title: '차트 올킬러', cond: function () { return load().stats.first; } });
        add({ id: 'chart_trophy', cat: '📈 음원차트', name: '음악방송 1위 3회', title: '트로피 수집가', cond: function () { return load().stats.trophies >= 3; } });
        add({ id: 'chart_clear', cat: '📈 음원차트', name: '사재기 의혹 해명 성공', title: '정직한 아이돌', cond: function () { return load().stats.scandalOk >= 1; } });
        return;
      }
    } catch (e) {}
    if (n < 100) setTimeout(function () { reg(n + 1); }, 300);
  })(0);

  setInterval(tick, 1500);
  setTimeout(tick, 2500);

  window.__chart = {
    load: load, save: save, tick: tick, chartAt: chartAt, hourRanks: hourRanks, parts: parts, powerOf: powerOf, nowHour: nowHour,
    hasSong: hasSong, musicSettle: musicSettle, pendingStage: pendingStage, musicStageDone: musicStageDone,
    canStream: canStream, applyStream: applyStream, spendStreamStamina: spendStreamStamina, STREAM_STAMINA: STREAM_STAMINA,
    resolveScandal: resolveScandal, runShow: runShow, encoreReward: encoreReward, claimPending: claimPending, payFor: payFor,
    trendGenre: trendGenre, genreName: genreName, members: members, gameDay: gameDay, processDay: processDay, syncSongs: syncSongs,
    RIVALS: RIVALS, EVENTS: EVENTS, CFG: { SONG_LIFE: SONG_LIFE, HOUR_FACTOR: HOUR_FACTOR, WIN_PAY: WIN_PAY, SHOW_WISH: SHOW_WISH, SHOW_DAYS: SHOW_DAYS, INVEST_BUMP: INVEST_BUMP }
  };
})();
