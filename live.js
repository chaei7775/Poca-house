// ════════════════════════════════
// 📺 포카 라이브 (live.js)
// 팬카페(fancafe.js) 화면에 "📺 라이브" 버튼이 붙는다. 데뷔한 아이돌로 라이브 방송을 켜면
//  · 팬카페에 가입한 대표 팬(NPC)들이 각자 말투로 채팅을 올린다. (아직 안 온 팬은 안 나옴)
//  · 방송 중 팬 3명이 차례로 질문을 던진다 → 다정 / 장난 / 담백 중 하나로 대답한다. 정답은 없고, 팬마다 좋아하는 톤이 달라 반응이 다르다.
//  · ❤️ 버튼을 눌러 하트를 보낼 수 있다.
//  · 끝나면 코인 / 팬카페 신규 회원 / 질문한 팬의 애착도 / 아이돌 기분이 오른다. 실패도 손해도 없다.
//  · 아이돌마다 하루 2번(실제 날짜 기준). 새 재화는 없고 기존 코인·팬 수·애착도·컨디션에만 연결된다.
// 저장: localStorage 'ph_live' (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// 대사를 늘리고 싶으면 아래 IDLE(팬별 일반 채팅) / ASK(팬별 질문)에 한 줄만 추가하면 됨.
// ════════════════════════════════
(function () {
  'use strict';
  var KEY = 'ph_live';
  var PER_DAY = 2;               // 아이돌마다 하루 방송 횟수
  var TICK_MS = 1300;            // 채팅이 올라오는 간격
  var ASK_AT = [7, 19, 31];      // 몇 번째 채팅 뒤에 질문이 뜨는지
  var END_AT = 43;               // 이 채팅 수에 도달하면(마지막 질문 처리 후) 방송 종료
  var COIN_BASE = 300, COIN_PER_HEART = 15, COIN_MAX = 6000;
  var AFF_HIT = 8, AFF_MISS = 3; // 질문한 팬의 애착도 (좋아하는 톤이면 HIT)
  var MOOD_GAIN = 8;             // 아이돌 기분 (ph_meal)
  var FONT = "font-family:'Noto Sans KR',sans-serif;";

  // ── 팬별 일반 채팅 ── {idol} = 아이돌 이름
  var IDLE = {
    veteran:  ['데뷔 때부터 봤는데 오늘 컨디션 좋아 보이네요', '이 목소리, 여전하네요', '라이브는 역시 {idol}죠', '오래 기다렸습니다'],
    daily:    ['출석 완료! 오늘도 왔어요 📅', '내일도 모레도 출석합니다', '출석왕 등장 ㅋㅋ', '{idol} 라이브 개근 중!'],
    photo:    ['지금 화면 캡처했어요 📸', '이 각도 미쳤다', '조명 완벽 ㅠㅠ 한 장만 더', '이 장면 보정 없이도 화보임'],
    ghost:    ['저 오랜만이죠… 🌙', '갑자기 사라졌다 와서 미안해요', '그래도 {idol} 라이브는 놓칠 수 없지', '조용히 보고 있어요'],
    collector:['오늘 포카 또 질렀다 🃏', '{idol} 포카 모으는 재미로 삶', '라이브 캡처로 포카 만들어줘요 ㅋㅋ', '이번 포카 레어 떴어요!'],
    concert:  ['다음 콘서트 언제예요? 🎫', '공연 때처럼 소리 질러도 되나요', '무대 위 {idol}이 더 좋지만 라이브도 좋아요', '콘서트 응원봉 들고 시청 중'],
    voice:    ['목소리 진짜 좋다 🎧', '지금 음정 완벽했어요', '이어폰 끼고 들으니 천국', '말할 때 목소리가 제일 좋아요'],
    lurker:   ['…', '(조용히 보고 있어요)', '👀', '오늘은 댓글 달아본다'],
    writer:   ['오늘 라이브로 글감 하나 얻었어요 ✍️', '{idol}의 한마디가 시 같아요', '오늘 밤 일기에 적어둘게요', '이 분위기, 소설 첫 장 같아'],
    casual:   ['친구가 보라고 해서 왔는데 재밌다 🍀', '저 아직 잘 모르는데 입덕각', '채팅창 분위기 좋네요 ㅋㅋ', '{idol} 목소리 좋다…']
  };

  // ── 팬별 질문 ── q: 질문 / a: [다정, 장난, 담백] 대답 / r: [다정, 장난, 담백] 팬의 반응
  var ASK = {
    veteran:  { q: '{idol}님, 데뷔 때와 지금 중에 어느 때가 더 좋아요?',
      a: ['지금도 좋지만 처음 만난 날이 늘 마음속에 있어요', '그땐 풋풋했고 지금은 능숙하죠. 둘 다 저예요', '지금이 더 낫습니다. 계속 나아지고 있으니까요'],
      r: ['…울컥하네요. 계속 곁에 있겠습니다.', '둘 다 좋다니 욕심쟁이네요. 인정합니다.', '그 말, 믿고 앞으로도 따라가겠습니다.'] },
    daily:    { q: '출석왕 질문! 오늘 하루 중에 제일 좋았던 순간은요?',
      a: ['지금이요. 이렇게 와주신 분들을 보니까 행복해요', '라면 끓인 거요. 면이 꼬들꼬들 완벽했어요', '연습 끝나고 샤워한 순간이요'],
      r: ['지금…이래요 ㅠㅠ 내일도 출석!', '라면 ㅋㅋㅋ 제일 솔직한 대답이다!', '현실적이다 ㅋㅋㅋ 그래도 좋아요!'] },
    photo:    { q: '오늘 라이브, 어떤 컨셉 사진으로 남기면 좋을까요?',
      a: ['따뜻한 노을빛 컨셉이요. 편안한 분위기로요', '일부러 눈 감은 장난 컷이요 ㅋㅋ', '정면 증명사진처럼 담백하게요'],
      r: ['노을빛 좋아요! 바로 편집 들어갑니다 📸', '눈 감은 컷 레어각이다 ㅋㅋㅋ 저장!', '증명사진도 화보가 되는 얼굴이시군요…'] },
    ghost:    { q: '저 한동안 못 왔는데… 그래도 기억해요?',
      a: ['그럼요. 오늘 와줘서 정말 반가워요', '출석 빠진 건 벌금이에요. 농담이고 어서 와요', '기억해요. 와줘서 고맙습니다'],
      r: ['…나 울어도 돼요? 🌙', '벌금 낼게요 ㅋㅋㅋ 다음엔 개근할게요', '고마워요. 이번엔 오래 있을게요'] },
    collector:{ q: '포카 중에 제일 아끼는 한 장 뽑는다면 어떤 카드예요?',
      a: ['팬분들이 모아주신 마음이 담긴 카드 전부요', '가장 잘 나온 내 얼굴 카드 ㅋㅋ 자뻑이죠?', '가장 처음 나온 카드요. 시작이니까요'],
      r: ['마음이 담긴 카드… 소장각이다 🃏', '자뻑 인정 ㅋㅋㅋ 근데 맞는 말이에요', '첫 카드 프리미엄 붙을 듯 ㅋㅋ'] },
    concert:  { q: '다음 콘서트에서 꼭 해보고 싶은 무대가 있어요?',
      a: ['팬분들과 같이 노래하는 합창 무대요', '무대 위에서 폭죽 터뜨리기! 위험하려나요 ㅋㅋ', '한 곡을 완벽하게 소화하는 무대요'],
      r: ['합창이라니 목 풀고 갑니다 🎫', '폭죽 ㅋㅋㅋ 소방서 허가 받으러 갈게요', '완벽한 한 곡, 기대하겠습니다'] },
    voice:    { q: '노래할 때 제일 신경 쓰는 게 뭐예요?',
      a: ['듣는 분들이 편안하게 들으셨으면 해서 숨소리까지 신경 써요', '고음 올라가기 전 마음의 준비요 ㅋㅋ', '음정이요. 기본이 제일 중요해요'],
      r: ['숨소리까지… 역시 귀가 호강합니다 🎧', '마음의 준비 ㅋㅋㅋ 그게 비결이었구나', '기본에 충실한 거, 존경합니다'] },
    lurker:   { q: '…저 댓글 처음 달아봐요. 라이브 자주 해주세요.',
      a: ['용기 내줘서 고마워요. 자주 올게요', '눈팅 3년차 신고식 축하해요 ㅋㅋ', '알겠습니다. 약속할게요'],
      r: ['…감사합니다. 앞으로도 조용히 응원할게요 👀', 'ㅋㅋㅋ 들켰다. 다음에도 올게요', '약속, 기억해둘게요'] },
    writer:   { q: '요즘 마음에 남은 한 문장이 있다면 들려주세요.',
      a: ['"곁에 있어줘서 고마워요." 매일 하고 싶은 말이에요', '"오늘도 라면 먹자." 인생의 진리죠 ㅋㅋ', '"묵묵히 해내면 된다." 요즘 제 문장이에요'],
      r: ['첫 줄로 쓰겠습니다. 오늘 밤에요 ✍️', '라면의 진리… 소설 제목 정했다 ㅋㅋ', '묵묵히, 라니… 노트에 옮겨 적었어요'] },
    casual:   { q: '저 처음 와봤는데 {idol}님 어떤 분이에요?',
      a: ['팬분들을 제일 좋아하는 평범한 사람이에요. 편하게 놀다 가요', '라면 좋아하는 사람이요 ㅋㅋ 아주 위험한 매력이 있죠', '노래하는 사람이에요. 무대에서 만나요'],
      r: ['친절하셔서 팬 해야겠어요 🍀', 'ㅋㅋㅋ 라면 같이 먹고 싶다', '무대 꼭 보러 갈게요!'] }
  };
  var TONE_IDX = { warm: 0, playful: 1, serious: 2 };
  var TONE_LABEL = ['💗 다정하게', '😆 장난스럽게', '😎 담백하게'];

  // 아직 안 온 팬이 많을 때 채팅을 채우는 익명 시청자
  var ANON_NICK = ['라이브왔다', '지나가던팬', '새벽감성', '별빛하나', '구독자1호', '포카러버', '밤토끼', '떡볶이먹는중', '응원봉반짝', '주말이좋아'];
  var ANON_LINES = ['오늘도 예쁘다', '목소리 좋다 ㅠㅠ', '{idol}아 사랑해', '하트 간다 ❤️', '화면 속인데 숨멎', '라이브 켜줘서 고마워요', 'ㅋㅋㅋㅋ 귀엽다', '오늘 뭐했어요?', '잘생김 미모 주의', '채팅 읽어줬으면…', '와 첫 라이브 같이 봐요', '이 시간 행복하다'];
  var ANON_ASK = { q: '{idol}님, 오늘 라이브 켠 이유가 뭐예요?',
    a: ['보고 싶어서요. 여러분 얼굴이 떠올라서요', '심심해서요 ㅋㅋ 솔직히 말하면요', '근황을 직접 전하고 싶어서요'],
    r: ['심쿵…… 하트 갑니다 ❤️', 'ㅋㅋㅋ 솔직해서 좋다', '근황 고마워요!'] };

  // ── 저장 / 날짜 ──
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function load() {
    var s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!s.date || s.date !== today()) { s.date = today(); s.count = {}; }
    if (!s.count) s.count = {};
    if (typeof s.total !== 'number') s.total = 0;
    return s;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} if (typeof saveAll === 'function') { try { saveAll(); } catch (e) {} } }
  function usedToday(cid) { return load().count[cid] || 0; }

  // ── 팬카페 데이터 (fancafe.js 의 __fancafeTest 를 통해 읽고 씀) ──
  function T() { return window.__fancafeTest || null; }
  function cafeOf(cid) {
    var t = T(); if (!t) return null;
    var s = t.loadAll(); if (!s.idols[cid]) return null;
    return { s: s, ic: s.idols[cid], t: t };
  }
  function activeFans(cid) {          // 지금 팬카페에 있는 대표 팬(NPC) 정의 목록
    var c = cafeOf(cid), out = [];
    if (!c) return out;
    c.t.ROSTER.forEach(function (def) { var f = c.ic.fans[def.id]; if (f && f.status === 'active') out.push(def); });
    return out;
  }
  function idolName(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fill(s, cid) { return String(s).replace(/\{idol\}/g, idolName(cid)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function toast(m) { if (typeof showBagToast === 'function') { try { showBagToast(m); } catch (e) {} } }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  // ── 방송 상태 ──
  var L = null;

  function start(cid) {
    if (!cid || typeof CHARS === 'undefined' || !CHARS[cid]) return;
    if (!T()) { toast('팬카페가 아직 준비되지 않았어요'); return; }
    var cafe = cafeOf(cid);
    if (!cafe) { toast('먼저 ' + idolName(cid) + ' 팬카페를 열어주세요'); return; }
    if (usedToday(cid) >= PER_DAY) { toast('📺 ' + idolName(cid) + ' 라이브는 하루 ' + PER_DAY + '번까지예요. 내일 또 켜요!'); return; }
    var s = load(); s.count[cid] = (s.count[cid] || 0) + 1; save(s);   // 시작하면 1회 사용 (중간에 꺼도 소진)

    var fans = activeFans(cid);
    var askers = fans.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 3);
    while (askers.length < 3) askers.push(null);        // 팬이 모자라면 익명 시청자가 질문
    L = { cid: cid, tick: 0, hearts: 0, viewers: 0, peak: 0, asked: 0, askers: askers, results: [], timer: 0, pending: false, over: false, fans: fans, base: 0 };
    var m = cafe.t.members ? cafe.t.members(cafe.ic) : (1 + (cafe.ic.anon || 0) + fans.length);
    L.base = Math.max(8, m * 3 + rnd(2, 12));
    L.viewers = L.base;
    L.peak = L.base;
    build();
    L.timer = setInterval(tick, TICK_MS);
    addLine('📢', '시스템', idolName(cid) + ' 님이 라이브를 시작했어요!', 'sys');
  }

  function stage() {
    var cid = L.cid, ch = CHARS[cid] || {};
    return '<div style="position:relative;height:36%;min-height:150px;overflow:hidden;background:linear-gradient(180deg,rgba(255,107,157,.25),rgba(20,15,40,.95));display:flex;align-items:flex-end;justify-content:center;">' +
      '<img id="lv-img" src="meal-assets/chars/' + cid + '.png" alt="" style="height:96%;display:block;" onerror="this.outerHTML=\'<div style=&quot;font-size:84px;margin-bottom:10px;&quot;>' + (ch.emoji || '🎤') + '</div>\'">' +
      '<div id="lv-fx" style="position:absolute;inset:0;pointer-events:none;overflow:hidden;"></div></div>';
  }

  function build() {
    var old = document.getElementById('live-overlay'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'live-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:780;background:#0e0a1c;display:flex;flex-direction:column;color:#fff;' + FONT;
    ov.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(0,0,0,.5);z-index:3;">' +
        '<span style="background:#ef4444;color:#fff;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:900;">● LIVE</span>' +
        '<span style="font-size:13px;font-weight:900;">' + esc(idolName(L.cid)) + '의 라이브</span>' +
        '<span id="lv-view" style="margin-left:auto;font-size:12px;color:#ffe08a;font-weight:900;">👀 ' + L.viewers + '</span>' +
        '<button id="lv-x" style="background:rgba(255,255,255,.12);border:none;border-radius:10px;color:#fff;padding:6px 10px;font-size:12px;cursor:pointer;">끝내기</button></div>' +
      stage() +
      '<div id="lv-chat" style="flex:1;min-height:0;overflow:hidden;padding:8px 10px;display:flex;flex-direction:column;justify-content:flex-end;gap:5px;font-size:13px;"></div>' +
      '<div id="lv-ask" style="display:none;padding:10px 12px 14px;background:linear-gradient(180deg,rgba(40,25,70,.97),rgba(20,12,40,.99));border-top:2px solid #C084FC;"></div>' +
      '<div id="lv-bar" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px calc(10px + env(safe-area-inset-bottom));background:rgba(0,0,0,.55);">' +
        '<div id="lv-heart-n" style="font-size:13px;font-weight:900;color:#ffb3cc;">❤️ 0</div>' +
        '<button id="lv-heart" style="background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:22px;color:#fff;padding:10px 26px;font-size:16px;font-weight:900;cursor:pointer;">❤️ 하트 보내기</button></div>';
    document.body.appendChild(ov);
    ov.querySelector('#lv-x').onclick = function () { if (L && !L.over) { if (confirm('방송을 끝낼까요? (오늘 횟수는 그대로 소진돼요)')) finish(true); } else close(); };
    ov.querySelector('#lv-heart').onclick = function (e) { sendHeart(e); };
  }

  function addLine(emoji, nick, text, kind) {
    var chat = document.getElementById('lv-chat'); if (!chat) return;
    var row = document.createElement('div');
    var color = kind === 'sys' ? '#93C5FD' : kind === 'idol' ? '#FFD700' : kind === 'fan' ? '#FFB3CC' : '#aaa';
    row.style.cssText = 'background:rgba(255,255,255,' + (kind === 'ask' ? '.14' : '.06') + ');border-radius:10px;padding:6px 10px;line-height:1.4;word-break:break-word;' + (kind === 'ask' ? 'border:1.5px solid #FFD700;' : '');
    row.innerHTML = '<span style="color:' + color + ';font-weight:900;">' + emoji + ' ' + esc(nick) + '</span> <span style="color:#eee;">' + esc(text) + '</span>';
    chat.appendChild(row);
    while (chat.children.length > 9) chat.removeChild(chat.firstChild);
  }

  function setViewers(n) {
    L.viewers = Math.max(3, n);
    if (L.viewers > L.peak) L.peak = L.viewers;
    var el = document.getElementById('lv-view'); if (el) el.textContent = '👀 ' + L.viewers;
  }
  function setHearts() { var el = document.getElementById('lv-heart-n'); if (el) el.textContent = '❤️ ' + L.hearts; }

  function floatHeart(x) {
    var fx = document.getElementById('lv-fx'); if (!fx) return;
    var h = document.createElement('div');
    h.textContent = pick(['❤️', '💗', '💖', '💕']);
    h.style.cssText = 'position:absolute;bottom:0;left:' + x + '%;font-size:' + rnd(18, 30) + 'px;opacity:1;transition:transform 1.4s ease-out,opacity 1.4s ease-out;';
    fx.appendChild(h);
    requestAnimationFrame(function () { requestAnimationFrame(function () { h.style.transform = 'translateY(-' + rnd(90, 150) + 'px)'; h.style.opacity = '0'; }); });
    setTimeout(function () { h.remove(); }, 1500);
  }
  function sendHeart() {
    if (!L || L.over) return;
    L.hearts += 1; setHearts();
    floatHeart(rnd(15, 85));
  }

  // ── 채팅 한 줄 ──
  function chatOnce() {
    var useFan = L.fans.length && Math.random() < 0.6;
    if (useFan) {
      var def = pick(L.fans), lines = IDLE[def.id] || ANON_LINES;
      addLine(def.emoji, def.nick, fill(pick(lines), L.cid), 'fan');
    } else {
      addLine('💬', pick(ANON_NICK), fill(pick(ANON_LINES), L.cid), 'anon');
    }
    setViewers(L.viewers + rnd(-2, 5));
    if (Math.random() < 0.5) floatHeart(rnd(10, 90));
  }

  // ── 질문 ──
  function askNow() {
    L.pending = true;
    var def = L.askers[L.asked];                    // null 이면 익명 시청자
    var a = def ? ASK[def.id] : ANON_ASK;
    var nick = def ? def.nick : pick(ANON_NICK), emoji = def ? def.emoji : '💬';
    addLine('📌', nick, fill(a.q, L.cid), 'ask');
    var box = document.getElementById('lv-ask'), bar = document.getElementById('lv-bar');
    box.style.display = 'block';
    if (bar) bar.style.display = 'none';
    box.innerHTML = '<div style="font-size:11px;color:#C084FC;font-weight:900;margin-bottom:6px;">' + emoji + ' ' + esc(nick) + '님의 질문 · 대답을 골라요</div>' +
      '<div style="font-size:13px;margin-bottom:8px;line-height:1.5;">' + esc(fill(a.q, L.cid)) + '</div>' +
      a.a.map(function (t, i) {
        return '<button data-i="' + i + '" style="width:100%;text-align:left;padding:9px 11px;margin-bottom:6px;border-radius:12px;border:1.5px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:12.5px;line-height:1.4;cursor:pointer;' + FONT + '">' +
          '<span style="color:#FFD700;font-weight:900;">' + TONE_LABEL[i] + '</span><br>' + esc(fill(t, L.cid)) + '</button>';
      }).join('');
    Array.prototype.forEach.call(box.querySelectorAll('button'), function (b) {
      b.onclick = function () { answer(Number(b.getAttribute('data-i')), def, a); };
    });
  }

  function answer(i, def, a) {
    if (!L || L.over) return;
    var box = document.getElementById('lv-ask'), bar = document.getElementById('lv-bar');
    box.style.display = 'none'; if (bar) bar.style.display = 'flex';
    var liked = def ? TONE_IDX[def.tone] : -1;
    var hit = def ? (liked === i) : false;
    addLine('🎤', idolName(L.cid), fill(a.a[i], L.cid), 'idol');
    var fanHearts = def ? (hit ? rnd(14, 22) : rnd(6, 10)) : rnd(6, 12);
    L.hearts += fanHearts; setHearts();
    for (var h = 0; h < 8; h++) (function (d) { setTimeout(function () { floatHeart(rnd(10, 90)); }, d * 90); })(h);
    setTimeout(function () {
      if (!L) return;
      addLine(def ? def.emoji : '💬', def ? def.nick : pick(ANON_NICK), fill(a.r[i], L.cid), 'fan');
      if (hit) addLine('✨', '시스템', def.nick + '님이 좋아하는 ' + ['다정한', '장난스러운', '담백한'][i] + ' 대답이었어요!', 'sys');
      setViewers(L.viewers + (hit ? rnd(18, 30) : rnd(6, 12)));
    }, 500);
    L.results.push({ fanId: def ? def.id : null, hit: hit });
    L.asked += 1;
    setTimeout(function () { if (L) L.pending = false; }, 900);
  }

  function tick() {
    if (!L || L.over || L.pending) return;
    L.tick += 1;
    if (L.asked < ASK_AT.length && L.tick === ASK_AT[L.asked]) { askNow(); return; }
    if (L.tick >= END_AT && L.asked >= ASK_AT.length) { finish(false); return; }
    chatOnce();
  }

  // ── 종료 / 보상 ──
  function finish(early) {
    if (!L || L.over) return;
    L.over = true; clearInterval(L.timer);
    var cid = L.cid, hearts = L.hearts, peak = L.peak;
    var asked = L.results.length, hits = L.results.filter(function (r) { return r.hit; }).length;
    var coinsGot = early && asked === 0 ? 0 : Math.min(COIN_MAX, COIN_BASE + hearts * COIN_PER_HEART + hits * 150);
    var anonGot = early && asked === 0 ? 0 : Math.min(3, Math.floor(peak / 40));
    var fanLines = [];
    var cafe = cafeOf(cid);
    if (cafe) {
      var now = Date.now();
      L.results.forEach(function (r) {
        if (!r.fanId) return;
        var f = cafe.ic.fans[r.fanId]; if (!f || f.status === 'left') return;
        var d = r.hit ? AFF_HIT : AFF_MISS;
        f.aff = Math.min(100, f.aff + d); f.lastTouch = now;
        var def = null; cafe.t.ROSTER.forEach(function (x) { if (x.id === r.fanId) def = x; });
        fanLines.push((def ? def.emoji + ' ' + def.nick : r.fanId) + ' 애착도 +' + d);
      });
      if (anonGot) cafe.ic.anon = (cafe.ic.anon || 0) + anonGot;
      cafe.ic.lastCare = now;
      cafe.t.saveAllState(cafe.s);
    }
    if (coinsGot > 0 && typeof coins !== 'undefined') { coins += coinsGot; try { if (typeof saveAll === 'function') saveAll(); } catch (e) {} }
    var moodUp = 0;
    if (asked > 0) {
      try {
        var st = JSON.parse(localStorage.getItem('ph_meal') || '{}') || {};
        if (!st.stat) st.stat = {};
        var sv = st.stat[cid] || (st.stat[cid] = { v: 50, s: 50, m: 50 });
        moodUp = MOOD_GAIN + hits * 2;
        sv.m = Math.max(0, Math.min(100, (sv.m || 50) + moodUp));
        localStorage.setItem('ph_meal', JSON.stringify(st));
      } catch (e) {}
    }
    var s = load(); s.total = (s.total || 0) + 1; save(s);
    try { window.dispatchEvent(new CustomEvent('ph-live-done', { detail: { cid: cid, hearts: hearts, peak: peak } })); } catch (e) {}

    var ov = document.getElementById('live-overlay'); if (!ov) { L = null; return; }
    var chip = function (t, c) { return '<div style="display:inline-block;margin:3px;padding:6px 12px;border-radius:999px;border:1.5px solid ' + c + ';font-size:12.5px;font-weight:900;">' + t + '</div>'; };
    var left = PER_DAY - usedToday(cid);
    ov.innerHTML = '<div style="margin:auto;width:calc(100% - 32px);max-width:420px;text-align:center;">' +
      '<div style="font-size:34px;">📺</div>' +
      '<div style="font-size:19px;font-weight:900;margin:4px 0 4px;">' + (early ? '방송 종료' : '라이브 대성공!') + '</div>' +
      '<div style="font-size:12px;color:#ccc;margin-bottom:12px;">' + esc(idolName(cid)) + ' · 최고 시청자 ' + peak + '명 · ❤️ ' + hearts + '개</div>' +
      '<div style="margin-bottom:10px;">' +
        (coinsGot ? chip('🍔 +' + coinsGot.toLocaleString() + ' 코인', '#FFD700') : '') +
        (anonGot ? chip('👥 팬카페 신규 회원 +' + anonGot, '#4ade80') : '') +
        (moodUp ? chip('😊 기분 +' + moodUp, '#FF6B9D') : '') +
        fanLines.map(function (t) { return chip(t, '#C084FC'); }).join('') +
      '</div>' +
      '<div style="font-size:11px;color:#999;margin-bottom:14px;">오늘 남은 라이브 ' + Math.max(0, left) + '/' + PER_DAY + '</div>' +
      '<button id="lv-done" style="width:100%;padding:13px;border:none;border-radius:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:15px;font-weight:900;cursor:pointer;' + FONT + '">확인</button></div>';
    ov.style.alignItems = 'center'; ov.style.justifyContent = 'center';
    ov.querySelector('#lv-done').onclick = close;
    L.shown = true;
  }

  function close() {
    if (L && !L.over) { try { clearInterval(L.timer); } catch (e) {} }
    var ov = document.getElementById('live-overlay'); if (ov) ov.remove();
    L = null;
    var fc = document.getElementById('fancafe-overlay');
    if (fc && typeof window.openFanCafe === 'function' && window.__fancafeCurrentCid) { try { window.openFanCafe(window.__fancafeCurrentCid()); } catch (e) {} }
  }

  // ── 팬카페 화면에 "📺 라이브" 버튼 붙이기 ──
  function ensureButton() {
    var fc = document.getElementById('fancafe-overlay');
    var btn = document.getElementById('live-open-btn');
    if (!fc) { if (btn) btn.remove(); return; }
    var cid = window.__fancafeCurrentCid ? window.__fancafeCurrentCid() : null;
    if (!cid) return;
    var left = Math.max(0, PER_DAY - usedToday(cid));
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'live-open-btn';
      btn.style.cssText = 'position:fixed;right:14px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:760;border:none;border-radius:999px;padding:12px 18px;font-size:14px;font-weight:900;color:#fff;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.5);background:linear-gradient(135deg,#ef4444,#C084FC);' + FONT;
      btn.onclick = function () { var c = window.__fancafeCurrentCid && window.__fancafeCurrentCid(); if (c) start(c); };
      document.body.appendChild(btn);
    }
    var label = '📺 라이브 (' + left + '/' + PER_DAY + ')';
    if (btn.textContent !== label) btn.textContent = label;
    btn.style.opacity = left > 0 ? '1' : '.55';
  }
  setInterval(ensureButton, 1000);

  window.openPocaLive = start;
  window.__liveTest = { start: start, load: load, usedToday: usedToday, activeFans: activeFans, IDLE: IDLE, ASK: ASK, finish: finish, state: function () { return L; }, CFG: { PER_DAY: PER_DAY, TICK_MS: TICK_MS, ASK_AT: ASK_AT, END_AT: END_AT } };
})();
