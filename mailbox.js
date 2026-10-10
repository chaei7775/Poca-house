// ════════════════════════════════
// 📮 우편함 (mailbox.js) — 아이돌과 편지를 주고받는 곳
//  · 더보기 메뉴의 [📮 우편함] (안 읽은 편지 수 표시 + 더보기 탭에 빨간 점)
//  · 받은 편지: 아이돌이 먼저 보내는 편지 (데뷔 감사 편지 / 인연 단계(우호·신뢰·인연) 달성 편지 / 하루 한 통 일상 편지) + 내 편지에 대한 답장
//  · 편지 쓰기: 만난 아이돌에게 팬레터를 쓴다 (아이돌 1명당 하루 3통). 잠시 뒤(30~90초) 답장이 도착한다.
//    답장은 쓴 글의 분위기(고마워·보고 싶어·힘들어·사랑해·응원·칭찬·인사·질문 …)를 읽고 아이돌 성격 + 인연 단계에 맞는 문장으로 조립한다.
//  · 보낸 편지: 내가 보낸 편지 모아보기
// 문장 데이터는 mailbox-lines.js (window.__mailLines). 한도/시간은 아래 [설정]만 고치면 됨.
// 저장: localStorage 'ph_mail' (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// ════════════════════════════════
(function () {
  'use strict';

  // ── [설정] ──
  var KEY = 'ph_mail';
  var IDS = ['minjun', 'sion', 'doyun', 'harin', 'yuna', 'ara'];
  var DAILY_WRITE = 3;               // 아이돌 1명당 하루에 보낼 수 있는 편지 수
  var REPLY_MIN = 30000, REPLY_MAX = 90000;   // 답장이 오기까지 (밀리초)
  var INBOX_MAX = 60, SENT_MAX = 40;
  var TEXT_MAX = 300;
  var FRIEND_DAILY = 5;              // 친구에게 하루에 보낼 수 있는 편지 수 (총합, 규칙 파일과 상관없는 앱 제한)
  var FCOL = 'letters';              // Firestore 컬렉션 (규칙은 LETTER_RULES.txt)                // 편지 글자 수 제한
  var ACC = '#ff8fb8';
  var Z = 975;
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var QUICK = ['오늘도 응원해요!', '보고 싶었어요', '항상 고마워요', '요즘 뭐 하고 지내요?', '오늘 하루 좀 힘들었어요', '잘 자요, 좋은 꿈 꿔요'];

  function L() { return window.__mailLines || {}; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function name(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function emoji(cid) { try { return CHARS[cid].emoji; } catch (e) { return '💌'; } }
  function fromName(m) { return m.kind === 'friend' ? (m.fromNick || '친구') : name(m.cid); }   // 받은 편지의 보낸 사람
  function fromEmoji(m) { return m.kind === 'friend' ? '💌' : emoji(m.cid); }
  function toName(m) { return m.toUid ? (m.toNick || '친구') : name(m.cid); }                     // 보낸 편지의 받는 사람
  function toEmoji(m) { return m.toUid ? '💌' : emoji(m.cid); }

  // ── 저장 ──
  function load() {
    var s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!Array.isArray(s.inbox)) s.inbox = [];
    if (!Array.isArray(s.sent)) s.sent = [];
    if (!Array.isArray(s.pend)) s.pend = [];
    if (!s.fired || typeof s.fired !== 'object') s.fired = {};
    if (typeof s.seq !== 'number') s.seq = 0;
    if (!Array.isArray(s.got)) s.got = [];
    if (s.day !== today()) { s.day = today(); s.wrote = {}; s.fwrote = 0; s.dailyDone = false; }
    if (typeof s.fwrote !== 'number') s.fwrote = 0;
    if (!s.wrote) s.wrote = {};
    return s;
  }
  function save(s) {
    if (s.inbox.length > INBOX_MAX) {   // 넘치면 읽은 오래된 편지부터 지움
      for (var i = s.inbox.length - 1; i >= 0 && s.inbox.length > INBOX_MAX; i--) if (s.inbox[i].read) s.inbox.splice(i, 1);
      if (s.inbox.length > INBOX_MAX) s.inbox.length = INBOX_MAX;
    }
    if (s.sent.length > SENT_MAX) s.sent.length = SENT_MAX;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  function nid(s) { s.seq += 1; return 'm' + Date.now().toString(36) + s.seq; }
  function unreadN(s) { return (s || load()).inbox.filter(function (m) { return !m.read; }).length; }

  // ── 게임 연결 ──
  function known(cid) { try { return getAffectionTotalExp(cid) > 0; } catch (e) { return false; } }          // 카드가 있거나 인연 경험치가 있는 아이돌
  function gate(cid) { try { return getAffectionGateLevel(cid) || 1; } catch (e) { return 1; } }
  function tierOf(g) { return g >= 16 ? 4 : g >= 11 ? 3 : g >= 6 ? 2 : 1; }
  function stageText(cid) { try { var i = getAffectionInfo(cid); return i.stage + ' Lv.' + i.level; } catch (e) { return ''; } }
  function debuted(cid) {
    try { var a = JSON.parse(localStorage.getItem('ph_agency') || 'null'); return !!(a && ((a.done && a.done[cid]) || (a.debut && a.debut[cid]))); } catch (e) { return false; }
  }
  function nickName() { try { return window.__nickName ? window.__nickName() : '너'; } catch (e) { return '너'; } }
  function batchim(s) { var c = s.charCodeAt(s.length - 1); return (c >= 0xAC00 && c <= 0xD7A3) ? ((c - 0xAC00) % 28 !== 0) : false; }
  function fmt(text) {   // 닉네임 자리표시 → 닉네임 ({닉랑}·{닉라고} 는 여기서)
    var t = String(text || '');
    var n = nickName(), b = n === '너' ? false : batchim(n);
    t = t.replace(/\{닉랑\}/g, n + (b ? '이랑' : '랑')).replace(/\{닉라고\}/g, n + (b ? '이라고' : '라고'));
    try { return window.__nickFmt ? window.__nickFmt(t) : t.replace(/\{닉[^}]*\}/g, n); } catch (e) { return t; }
  }

  // ── 알림 ──
  function toast(m, onTap) {
    try {
      var old = document.getElementById('mail-toast'); if (old) old.remove();
      var el = document.createElement('div'); el.id = 'mail-toast';
      el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(26,26,46,0.97);border:1.5px solid ' + ACC + ';color:#fff;padding:11px 20px;border-radius:20px;font-size:13px;font-weight:700;z-index:2600;max-width:90vw;text-align:center;line-height:1.5;' + FONT;
      if (m.indexOf('📮 ') === 0) { var im = document.createElement('img'); im.src = 'more-mailbox.png'; im.alt = ''; im.style.cssText = 'width:20px;height:20px;object-fit:contain;vertical-align:middle;margin-right:6px;'; el.appendChild(im); el.appendChild(document.createTextNode(m.slice(2))); } else el.textContent = m;
      if (onTap) { el.style.cursor = 'pointer'; el.onclick = function () { el.remove(); onTap(); }; }
      document.body.appendChild(el);
      setTimeout(function () { if (el.parentNode) el.remove(); }, onTap ? 6500 : 3500);
    } catch (e) {}
  }
  function paintBadge() {
    var n = unreadN();
    try {
      var t = document.getElementById('more-mail-tile');
      if (t) { var lb = t.querySelector('.more-tile-label, .more-label, span:last-child'); }
      var nav = document.getElementById('nav-shop');
      if (nav) nav.classList.toggle('has-mail', n > 0);
    } catch (e) {}
  }
  (function css() {
    var st = document.createElement('style');
    st.textContent = '#nav-shop{position:relative;} #nav-shop.has-mail::after{content:"";position:absolute;top:3px;left:calc(50% + 8px);width:10px;height:10px;border-radius:50%;background:#ff4d6d;border:1.5px solid #fff;}';
    document.head.appendChild(st);
  })();

  // ── 편지 분석 → 답장 조립 ──
  var CATS = [   // 앞에 있을수록 먼저 반응
    ['tired', /힘들|피곤|지쳤|우울|슬퍼|슬프|울었|속상|외로|불안|걱정|아프|아파|졸려|스트레스|짜증|괴로/],
    ['sorry', /미안|죄송|잘못/],
    ['love', /사랑|좋아해|좋아하|좋아요|좋아함|♥|❤|💕|애정|최애/],
    ['miss', /보고\s?싶|보고싶|그리워|그립|생각났|생각나|기다렸/],
    ['thanks', /고마|감사|땡큐|덕분/],
    ['praise', /예뻐|이뻐|예쁘|이쁘|귀여|잘생|멋지|멋있|멋져|천사|심쿵|반했|두근|매력/],
    ['cheer', /응원|화이팅|파이팅|힘내|힘내요|잘\s?할|할 수 있|믿어|최고|대단/],
    ['goodnight', /잘\s?자|굿나잇|좋은\s?꿈|자러|꿈\s?꿔/],
    ['food', /밥|먹었|먹을|배고|맛있|간식|커피|케이크|라면|떡볶이|치킨/],
    ['hello', /안녕|하이|ㅎㅇ|처음|반가워|반갑/],
    ['question', /\?|？|뭐\s?해|어때|어디|언제|누구|왜\s|뭐야|뭐예요|뭐에요/]
  ];
  function analyze(text) {
    var out = [];
    for (var i = 0; i < CATS.length && out.length < 2; i++) if (CATS[i][1].test(text)) out.push(CATS[i][0]);
    return out.length ? out : ['general'];
  }
  function snippet(text) {   // 편지 속 한 조각을 골라 인용
    var parts = String(text).replace(/\s+/g, ' ').split(/[.!?~…。]+/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length >= 4; });
    var s = parts.length ? pick(parts) : String(text).replace(/\s+/g, ' ').trim();
    var a = Array.from(s); if (a.length > 18) s = a.slice(0, 18).join('') + '…';
    return s;
  }
  function compose(cid, text) {
    var d = L()[cid]; if (!d) return null;
    var g = gate(cid), t = String(tierOf(g)), cats = analyze(text);
    var paras = [fmt(pick(d.greet[t]))];
    var mid = [];
    cats.forEach(function (c) { var arr = d.cat[c] || d.cat.general; mid.push(fmt(pick(arr))); });
    paras.push(mid.join(' '));
    if (String(text).replace(/\s+/g, '').length >= 8 && Math.random() < 0.7) paras.push(fmt(pick(d.quote)).replace(/\{q\}/g, snippet(text)));   // 유저 글은 자리표시 처리 뒤에 끼워 넣음
    paras.push(fmt(pick(d.close[t])));
    return { body: paras.join('\n\n'), sign: d.sign, cats: cats, tier: +t };
  }

  // ── 편지 추가 / 배달 ──
  function addMail(s, m) {
    m.id = nid(s); m.ts = Date.now(); m.read = false;
    s.inbox.unshift(m);
    return m;
  }
  var announceQ = [];
  function announce(list) {
    if (!list.length) return;
    paintBadge();
    var msg = list.length === 1 ? '📮 ' + fromName(list[0]) + '에게서 ' + (list[0].kind === 'reply' ? '답장' : '편지') + '이 왔어요!' : '📮 새 편지가 ' + list.length + '통 왔어요!';
    toast(msg, function () { openMailbox(); });
  }
  function check() {
    var s = load(), now = Date.now(), fresh = [], changed = false;
    // 1) 답장 도착
    s.pend = s.pend.filter(function (p) {
      if (p.at > now) return true;
      var r = compose(p.cid, p.text);
      if (r) {
        var m = addMail(s, { cid: p.cid, kind: 'reply', title: 'RE: ' + Array.from(String(p.text).replace(/\s+/g, ' ')).slice(0, 10).join('') + (Array.from(p.text).length > 10 ? '…' : ''), body: r.body, sign: r.sign, raw: false });
        fresh.push(m);
      }
      changed = true; return false;
    });
    // 2) 데뷔·인연 단계 편지 (아이돌이 먼저)
    IDS.forEach(function (cid) {
      var d = L()[cid]; if (!d || !known(cid)) return;
      if (debuted(cid) && !s.fired['debut_' + cid]) {
        s.fired['debut_' + cid] = 1; changed = true;
        fresh.push(addMail(s, { cid: cid, kind: 'idol', title: d.debut.t, body: d.debut.b, sign: d.sign, raw: true }));
      }
      var g = gate(cid), best = 0;
      [6, 11, 16].forEach(function (lv) { if (g >= lv && !s.fired['ms' + lv + '_' + cid]) { s.fired['ms' + lv + '_' + cid] = 1; best = lv; changed = true; } });
      if (best) { var ms = d.milestone[String(best)]; fresh.push(addMail(s, { cid: cid, kind: 'idol', title: ms.t, body: ms.b, sign: d.sign, raw: true })); }   // 한꺼번에 여러 단계가 쌓였으면 가장 높은 단계 편지만
    });
    // 3) 하루 한 통 일상 편지
    if (!s.dailyDone) {
      var cands = IDS.filter(function (cid) { return L()[cid] && known(cid); });
      if (cands.length) {
        s.dailyDone = true; changed = true;
        var cid = pick(cands), d2 = L()[cid], idx = [], k;
        for (k = 0; k < d2.daily.length; k++) if (!s.fired['dl_' + cid + '_' + k]) idx.push(k);
        if (!idx.length) { for (k = 0; k < d2.daily.length; k++) delete s.fired['dl_' + cid + '_' + k]; idx = d2.daily.map(function (_, i) { return i; }); }
        var pk = pick(idx); s.fired['dl_' + cid + '_' + pk] = 1;
        var lt = d2.daily[pk];
        fresh.push(addMail(s, { cid: cid, kind: 'idol', title: lt.t, body: lt.b, sign: d2.sign, raw: true }));
      }
    }
    if (changed) save(s);
    if (fresh.length) { announce(fresh); refreshOpen(); } else paintBadge();
    return fresh.length;
  }

  // ── 화면 ──
  var ui = { tab: 'inbox', cid: null, draft: '', view: null, mode: 'idol', fr: null };
  function ago(ts) {
    var m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return '방금'; if (m < 60) return m + '분 전';
    var d = new Date(ts), t = new Date();
    var hh = d.getHours(), mm = ('0' + d.getMinutes()).slice(-2);
    if (d.toDateString() === t.toDateString()) return '오늘 ' + hh + ':' + mm;
    return (d.getMonth() + 1) + '/' + d.getDate();
  }
  function writableIds() { return IDS.filter(function (cid) { return L()[cid] && known(cid); }); }
  function refreshOpen() { if (document.getElementById('mail-ov') && !ui.view) render(); }

  function openMailbox(opts) {
    opts = opts || {};
    ui.tab = opts.tab || 'inbox'; if (opts.cid) { ui.cid = opts.cid; ui.mode = 'idol'; }
    if (opts.friend) { ui.mode = 'friend'; ui.fr = opts.friend; }
    ui.view = null; loadFriends(); fetchFriendLetters();
    check();
    var old = document.getElementById('mail-ov'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'mail-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:' + Z + ';background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:12px;' + FONT;
    ov.onclick = function (e) { if (e.target === ov) closeMailbox(); };
    document.body.appendChild(ov);
    render();
  }
  function closeMailbox() { var o = document.getElementById('mail-ov'); if (o) o.remove(); ui.view = null; paintBadge(); }

  function render() {
    var ov = document.getElementById('mail-ov'); if (!ov) return;
    var s = load(), n = unreadN(s);
    var tabs = [['inbox', '받은 편지' + (n ? ' (' + n + ')' : '')], ['write', '편지 쓰기'], ['sent', '보낸 편지']].map(function (t) {
      var on = ui.tab === t[0];
      return '<button data-tab="' + t[0] + '" style="flex:1;padding:9px 4px;border:none;border-radius:10px;font-size:12.5px;font-weight:900;cursor:pointer;color:#fff;' + FONT + 'background:' + (on ? 'linear-gradient(135deg,#ff6b9d,#c084fc)' : 'rgba(255,255,255,0.08)') + ';">' + t[1] + '</button>';
    }).join('');
    var body = ui.view ? viewHtml(s) : ui.tab === 'write' ? writeHtml(s) : ui.tab === 'sent' ? sentHtml(s) : inboxHtml(s);
    ov.innerHTML = '<div style="background:#1a1233;border:1.5px solid ' + ACC + ';border-radius:18px;width:100%;max-width:380px;max-height:88vh;display:flex;flex-direction:column;color:#fff;">' +
      '<div style="padding:14px 16px 8px;display:flex;align-items:center;"><div style="font-size:16px;font-weight:900;display:flex;align-items:center;gap:6px;"><img src="more-mailbox.png" alt="" style="width:26px;height:26px;object-fit:contain;">우편함</div>' +
      '<button id="mail-x" style="margin-left:auto;border:none;border-radius:10px;background:rgba(255,255,255,0.1);color:#fff;padding:6px 12px;font-size:12px;font-weight:900;cursor:pointer;' + FONT + '">닫기</button></div>' +
      '<div style="display:flex;gap:6px;padding:0 14px 10px;">' + tabs + '</div>' +
      '<div id="mail-body" style="padding:0 14px 16px;overflow-y:auto;-webkit-overflow-scrolling:touch;">' + body + '</div></div>';
    bind(ov);
  }

  function inboxHtml(s) {
    var rows = '';
    s.pend.forEach(function (p) {
      rows += '<div style="display:flex;align-items:center;gap:10px;padding:10px 11px;margin-bottom:7px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.2);">' +
        '<div style="font-size:24px;">' + esc(emoji(p.cid)) + '</div><div style="font-size:12.5px;color:#c9b8e8;line-height:1.5;">' + esc(name(p.cid)) + '이(가) 답장을 쓰고 있어요… ✍️</div></div>';
    });
    s.inbox.forEach(function (m) {
      rows += '<div data-open="' + m.id + '" style="display:flex;align-items:center;gap:10px;padding:10px 11px;margin-bottom:7px;border-radius:12px;cursor:pointer;background:' + (m.read ? 'rgba(255,255,255,0.05)' : 'rgba(255,143,184,0.16)') + ';border:1px solid ' + (m.read ? 'rgba(255,255,255,0.1)' : 'rgba(255,143,184,0.55)') + ';">' +
        '<div style="font-size:26px;flex-shrink:0;">' + esc(fromEmoji(m)) + '</div><div style="flex:1;min-width:0;">' +
        '<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:13px;font-weight:900;">' + esc(fromName(m)) + '</span>' + (m.kind === 'friend' ? '<span style="font-size:10px;color:#bfe8ff;background:rgba(255,255,255,0.1);border-radius:8px;padding:1px 6px;">친구</span>' : '') + (m.kind === 'reply' ? '<span style="font-size:10px;color:#ffd0e2;background:rgba(255,255,255,0.1);border-radius:8px;padding:1px 6px;">답장</span>' : '') +
        (m.read ? '' : '<span style="width:8px;height:8px;border-radius:50%;background:#ff4d6d;display:inline-block;"></span>') + '<span style="margin-left:auto;font-size:10.5px;color:#9d93bd;">' + ago(m.ts) + '</span></div>' +
        '<div style="font-size:12.5px;color:' + (m.read ? '#bdb4d6' : '#fff') + ';font-weight:' + (m.read ? 500 : 900) + ';margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(m.title) + '</div></div></div>';
    });
    if (!rows) rows = '<div style="text-align:center;color:#8d86a8;padding:30px 6px;font-size:13px;line-height:1.8;"><div style="font-size:40px;margin-bottom:6px;">💌</div>아직 받은 편지가 없어요.<br>아이돌에게 먼저 편지를 써 보세요!<br><span style="font-size:11.5px;">아이돌도 가끔 먼저 편지를 보내요.</span></div>';
    return rows;
  }

  function viewHtml(s) {
    var m = s.inbox.filter(function (x) { return x.id === ui.view; })[0];
    if (!m) { ui.view = null; return inboxHtml(s); }
    var text = m.raw ? fmt(m.body) : m.body, pre = m.kind === 'friend' ? 'white-space:pre-wrap;word-break:break-word;' : '';
    var paras = String(text).split('\n\n').map(function (p) { return '<p style="margin:0 0 12px;' + pre + '">' + esc(p) + '</p>'; }).join('');
    return '<button id="mail-back" style="border:none;background:none;color:#c9b8e8;font-size:12.5px;font-weight:900;cursor:pointer;padding:2px 0 8px;' + FONT + '">← 목록으로</button>' +
      '<div style="background:#fff8ec;color:#3a2a1e;border-radius:6px;padding:18px 16px;box-shadow:0 4px 18px rgba(0,0,0,0.4);border-left:5px solid #ff9ec4;">' +
      '<div style="font-size:11px;color:#a08a76;display:flex;"><span>' + esc(fromEmoji(m)) + ' ' + esc(fromName(m)) + '에게서</span><span style="margin-left:auto;">' + ago(m.ts) + '</span></div>' +
      '<div style="font-size:15px;font-weight:900;margin:8px 0 12px;color:#5a3a2a;">' + esc(m.title) + '</div>' +
      '<div style="font-size:13.5px;line-height:1.8;">' + paras + '</div>' +
      '<div style="text-align:right;font-size:13px;font-weight:700;color:#7a5a4a;margin-top:4px;">' + esc(m.sign || '') + '</div></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;">' +
      '<button id="mail-reply" data-cid="' + (m.cid || '') + '" data-uid="' + esc(m.fromUid || '') + '" data-nick="' + esc(m.fromNick || '') + '" style="flex:2;padding:12px;border:none;border-radius:12px;color:#fff;font-size:13.5px;font-weight:900;cursor:pointer;background:linear-gradient(135deg,#ff6b9d,#c084fc);' + FONT + '">✍️ 답장 쓰기</button>' +
      '<button id="mail-del" data-id="' + m.id + '" style="flex:1;padding:12px;border:none;border-radius:12px;color:#c9b8e8;font-size:12.5px;font-weight:900;cursor:pointer;background:rgba(255,255,255,0.08);' + FONT + '">지우기</button></div>' +
      '<button id="mail-back2" style="width:100%;margin-top:8px;padding:12px;border:1.5px solid rgba(255,255,255,0.25);border-radius:12px;color:#fff;font-size:13.5px;font-weight:900;cursor:pointer;background:rgba(255,255,255,0.1);' + FONT + '">📪 편지 덮고 목록으로</button>';
  }

  var FR = null, frLoading = false;   // 내 친구 목록 [{uid,nick}] (서버에서 불러와 기억)
  function coreT() { return window.__tradeCore || null; }
  function netReady() {
    var C = coreT(); if (!C || !C.uid()) return false;
    var f = C.F(); return !!(window.pocaFirebaseReady && f && f.db && f.getDoc && f.getDocs && f.collection && f.query && f.where && f.runTransaction && f.doc);
  }
  async function loadFriends() {
    if (frLoading || !netReady()) return; frLoading = true;
    try {
      var C = coreT(), f = C.F(), me = await f.getDoc(f.doc(f.db, 'users', C.uid()));
      var ids = (me.exists() && (me.data().friends || [])) || [], out = [];
      for (var i = 0; i < ids.length && i < 60; i++) {
        try { var d = await f.getDoc(f.doc(f.db, 'users', ids[i])); if (d.exists()) out.push({ uid: ids[i], nick: d.data().nickname || '친구' }); } catch (e) {}
      }
      FR = out; if (document.getElementById('mail-ov') && ui.tab === 'write' && !ui.view) { var ta = document.getElementById('mail-text'); if (ta) ui.draft = ta.value; render(); }
    } catch (e) {}
    frLoading = false;
  }
  function modeBar() {
    function b(k, t) { var on = ui.mode === k; return '<button data-mode="' + k + '" style="flex:1;padding:8px 4px;border-radius:10px;font-size:12px;font-weight:900;cursor:pointer;color:#fff;' + FONT + 'border:1.5px solid ' + (on ? '#9fd8ff' : 'rgba(255,255,255,0.18)') + ';background:' + (on ? 'rgba(159,216,255,0.2)' : 'rgba(255,255,255,0.05)') + ';">' + t + '</button>'; }
    return '<div style="display:flex;gap:6px;margin-bottom:10px;">' + b('idol', '🌟 아이돌에게') + b('friend', '💌 친구에게') + '</div>';
  }
  function friendWriteHtml(s) {
    var C = coreT();
    if (!C || !C.uid()) return modeBar() + '<div style="text-align:center;color:#8d86a8;padding:26px 6px;font-size:13px;line-height:1.8;"><div style="font-size:38px;margin-bottom:6px;">🔒</div>친구에게 편지를 보내려면<br>로그인한 계정이어야 해요.<br><span style="font-size:11.5px;">(☁️ 계정에서 로그인)</span></div>';
    if (FR === null) return modeBar() + '<div style="text-align:center;color:#8d86a8;padding:26px 6px;font-size:13px;">친구 목록을 불러오는 중…</div>';
    if (!FR.length) return modeBar() + '<div style="text-align:center;color:#8d86a8;padding:26px 6px;font-size:13px;line-height:1.8;"><div style="font-size:38px;margin-bottom:6px;">👥</div>아직 친구가 없어요.<br>더보기 → 친구에서 친구를 만들어봐요!</div>';
    if (!ui.fr || !FR.some(function (x) { return x.uid === ui.fr.uid; })) ui.fr = FR[0];
    var left = Math.max(0, FRIEND_DAILY - s.fwrote);
    var chips = FR.map(function (x) { var on = x.uid === ui.fr.uid; return '<button data-fuid="' + esc(x.uid) + '" style="padding:7px 11px;border-radius:12px;font-size:12px;font-weight:900;cursor:pointer;color:#fff;' + FONT + 'border:1.5px solid ' + (on ? '#9fd8ff' : 'rgba(255,255,255,0.18)') + ';background:' + (on ? 'rgba(159,216,255,0.2)' : 'rgba(255,255,255,0.06)') + ';">💌 ' + esc(x.nick) + '</button>'; }).join('');
    return modeBar() + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">' + chips + '</div>' +
      '<div style="font-size:11.5px;color:#c9b8e8;margin-bottom:6px;">오늘 친구에게 <b style="color:' + (left ? '#ffe08a' : '#ff8a8a') + ';">' + s.fwrote + '/' + FRIEND_DAILY + '</b>통 보냈어요</div>' +
      '<textarea id="mail-text" maxlength="' + TEXT_MAX + '" rows="6" placeholder="' + esc(ui.fr.nick) + '님에게 보낼 편지를 적어봐요." style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1.5px solid rgba(255,255,255,0.2);background:#fff8ec;color:#3a2a1e;font-size:14px;line-height:1.7;resize:none;outline:none;' + FONT + '">' + esc(ui.draft) + '</textarea>' +
      '<div style="display:flex;justify-content:flex-end;margin:6px 0 8px;"><div id="mail-count" style="font-size:10.5px;color:#9d93bd;">0/' + TEXT_MAX + '</div></div>' +
      '<button id="mail-send" style="width:100%;padding:13px;border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;background:linear-gradient(135deg,#4aa8ff,#c084fc);' + FONT + '">💌 친구에게 보내기</button>' +
      '<div style="font-size:10.5px;color:#8d86a8;text-align:center;margin-top:8px;line-height:1.6;">친구가 우편함을 열면 받아요. 서로 상처 주는 말은 하지 않기!</div>';
  }

  function writeHtml(s) {
    if (ui.mode === 'friend') return friendWriteHtml(s);
    var ids = writableIds();
    if (!ids.length) return modeBar() + '<div style="text-align:center;color:#8d86a8;padding:30px 6px;font-size:13px;line-height:1.8;"><div style="font-size:40px;margin-bottom:6px;">🖋️</div>아직 편지를 보낼 아이돌이 없어요.<br>뽑기나 만나기로 아이돌을 만나면<br>편지를 쓸 수 있어요!</div>';
    if (!ui.cid || ids.indexOf(ui.cid) === -1) ui.cid = ids[0];
    var cid = ui.cid, used = s.wrote[cid] || 0, left = Math.max(0, DAILY_WRITE - used);
    var chips = ids.map(function (id) {
      var on = id === cid;
      return '<button data-cid="' + id + '" style="padding:7px 11px;border-radius:12px;font-size:12px;font-weight:900;cursor:pointer;color:#fff;' + FONT + 'border:1.5px solid ' + (on ? '#ff9ecb' : 'rgba(255,255,255,0.18)') + ';background:' + (on ? 'rgba(255,158,203,0.22)' : 'rgba(255,255,255,0.06)') + ';">' + esc(emoji(id)) + ' ' + esc(name(id)) + '</button>';
    }).join('');
    var quick = QUICK.map(function (q, i) { return '<button data-q="' + i + '" style="padding:5px 9px;border-radius:12px;font-size:11px;font-weight:700;cursor:pointer;color:#e7dcff;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);' + FONT + '">' + esc(q) + '</button>'; }).join('');
    var waiting = s.pend.some(function (p) { return p.cid === cid; });
    return modeBar() + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">' + chips + '</div>' +
      '<div style="font-size:11.5px;color:#c9b8e8;margin-bottom:6px;">💞 ' + esc(stageText(cid)) + ' · 오늘 <b style="color:' + (left ? '#ffe08a' : '#ff8a8a') + ';">' + used + '/' + DAILY_WRITE + '</b>통 보냈어요' + (waiting ? ' · ✍️ 답장 쓰는 중' : '') + '</div>' +
      '<textarea id="mail-text" maxlength="' + TEXT_MAX + '" rows="6" placeholder="' + esc(name(cid)) + '에게 하고 싶은 말을 적어봐요.\n응원, 안부, 고마운 마음… 뭐든 좋아요!" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1.5px solid rgba(255,255,255,0.2);background:#fff8ec;color:#3a2a1e;font-size:14px;line-height:1.7;resize:none;outline:none;' + FONT + '">' + esc(ui.draft) + '</textarea>' +
      '<div style="display:flex;align-items:center;margin:6px 0 8px;"><div style="display:flex;flex-wrap:wrap;gap:5px;flex:1;">' + quick + '</div><div id="mail-count" style="font-size:10.5px;color:#9d93bd;margin-left:8px;flex-shrink:0;">0/' + TEXT_MAX + '</div></div>' +
      '<button id="mail-send" style="width:100%;padding:13px;border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;background:linear-gradient(135deg,#ff6b9d,#c084fc);' + FONT + '">💌 편지 보내기</button>' +
      '<div style="font-size:10.5px;color:#8d86a8;text-align:center;margin-top:8px;line-height:1.6;">답장은 30초~1분 반 뒤에 도착해요. 쓴 글의 분위기에 따라 답장이 달라져요!</div>';
  }

  function sentHtml(s) {
    if (!s.sent.length) return '<div style="text-align:center;color:#8d86a8;padding:30px 6px;font-size:13px;line-height:1.8;"><div style="font-size:40px;margin-bottom:6px;">📤</div>아직 보낸 편지가 없어요.</div>';
    return s.sent.map(function (m) {
      var waiting = !m.toUid && s.pend.some(function (p) { return p.id === m.id; });
      return '<div style="padding:10px 12px;margin-bottom:8px;border-radius:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);">' +
        '<div style="display:flex;font-size:11.5px;color:#c9b8e8;"><span>' + esc(toEmoji(m)) + ' ' + esc(toName(m)) + '에게</span><span style="margin-left:auto;">' + ago(m.ts) + (waiting ? ' · 답장 대기 중' : '') + '</span></div>' +
        '<div style="font-size:13px;line-height:1.65;margin-top:5px;white-space:pre-wrap;word-break:break-word;color:#f0eaff;">' + esc(m.text) + '</div></div>';
    }).join('');
  }

  function bind(ov) {
    var x = ov.querySelector('#mail-x'); if (x) x.onclick = closeMailbox;
    Array.prototype.forEach.call(ov.querySelectorAll('[data-mode]'), function (b) { b.onclick = function () { var t = ov.querySelector('#mail-text'); if (t) ui.draft = t.value; ui.mode = b.getAttribute('data-mode'); if (ui.mode === 'friend') loadFriends(); render(); }; });
    Array.prototype.forEach.call(ov.querySelectorAll('[data-fuid]'), function (b) { b.onclick = function () { var t = ov.querySelector('#mail-text'); if (t) ui.draft = t.value; var u = b.getAttribute('data-fuid'); ui.fr = (FR || []).filter(function (x) { return x.uid === u; })[0] || ui.fr; render(); }; });
    Array.prototype.forEach.call(ov.querySelectorAll('[data-tab]'), function (b) { b.onclick = function () { ui.tab = b.getAttribute('data-tab'); ui.view = null; render(); }; });
    Array.prototype.forEach.call(ov.querySelectorAll('[data-open]'), function (b) {
      b.onclick = function () {
        var s = load(), id = b.getAttribute('data-open');
        s.inbox.forEach(function (m) { if (m.id === id) m.read = true; }); save(s);
        ui.view = id; paintBadge(); render();
      };
    });
    var back = ov.querySelector('#mail-back'); if (back) back.onclick = function () { ui.view = null; render(); };
    var back2 = ov.querySelector('#mail-back2'); if (back2) back2.onclick = function () { ui.view = null; render(); };
    var rp = ov.querySelector('#mail-reply'); if (rp) rp.onclick = function () { var u = rp.getAttribute('data-uid'); if (u) { ui.mode = 'friend'; ui.fr = { uid: u, nick: rp.getAttribute('data-nick') }; loadFriends(); } else { ui.mode = 'idol'; ui.cid = rp.getAttribute('data-cid'); } ui.tab = 'write'; ui.view = null; render(); };
    var del = ov.querySelector('#mail-del');
    if (del) del.onclick = function () { var s = load(), id = del.getAttribute('data-id'); s.inbox = s.inbox.filter(function (m) { return m.id !== id; }); save(s); ui.view = null; paintBadge(); render(); };
    Array.prototype.forEach.call(ov.querySelectorAll('[data-cid]'), function (b) {
      if (b.id === 'mail-reply') return;
      b.onclick = function () { var ta = ov.querySelector('#mail-text'); if (ta) ui.draft = ta.value; ui.cid = b.getAttribute('data-cid'); render(); };
    });
    var ta = ov.querySelector('#mail-text'), cnt = ov.querySelector('#mail-count');
    function upd() { if (ta && cnt) { cnt.textContent = Array.from(ta.value).length + '/' + TEXT_MAX; ui.draft = ta.value; } }
    if (ta) { ta.addEventListener('input', upd); upd(); }
    Array.prototype.forEach.call(ov.querySelectorAll('[data-q]'), function (b) {
      b.onclick = function () { if (!ta) return; var q = QUICK[+b.getAttribute('data-q')]; ta.value = (ta.value ? ta.value.replace(/\s+$/, '') + ' ' : '') + q; ta.value = Array.from(ta.value).slice(0, TEXT_MAX).join(''); upd(); };
    });
    var send = ov.querySelector('#mail-send'); if (send) send.onclick = function () { doSend(ta ? ta.value : ''); };
  }

  function doSend(text) {
    text = String(text || '').replace(/\s+$/g, '').replace(/^\s+/g, '');
    if (ui.mode === 'friend') { sendFriend(text); return; }
    var cid = ui.cid; if (!cid) return;
    if (Array.from(text.replace(/\s+/g, '')).length < 2) { toast('편지 내용을 조금만 더 적어주세요!'); return; }
    var s = load();
    if ((s.wrote[cid] || 0) >= DAILY_WRITE) { toast('오늘은 ' + name(cid) + '에게 편지를 다 썼어요 (하루 ' + DAILY_WRITE + '통). 내일 또 써요!'); return; }
    if (s.pend.some(function (p) { return p.cid === cid; })) { toast(name(cid) + '이(가) 아직 답장을 쓰는 중이에요. 조금만 기다려요!'); return; }
    text = Array.from(text).slice(0, TEXT_MAX).join('');
    var id = nid(s);
    s.sent.unshift({ id: id, cid: cid, text: text, ts: Date.now() });
    s.pend.push({ id: id, cid: cid, text: text, at: Date.now() + REPLY_MIN + Math.random() * (REPLY_MAX - REPLY_MIN) });
    s.wrote[cid] = (s.wrote[cid] || 0) + 1;
    save(s);
    ui.draft = '';
    toast('💌 편지를 보냈어요! ' + name(cid) + '의 답장을 기다려봐요');
    try { if (typeof addAffectionExp === 'function') { /* 편지는 호감도에 영향 주지 않음 (선물과 구분) */ } } catch (e) {}
    ui.tab = 'inbox'; render();
  }

  // ── 친구에게 편지 (서버) ──
  var sending = false;
  async function sendFriend(text) {
    if (sending) return;
    var fr = ui.fr; if (!fr) return;
    if (Array.from(text.replace(/\s+/g, '')).length < 2) { toast('편지 내용을 조금만 더 적어주세요!'); return; }
    if (!netReady()) { toast('서버 연결을 기다리는 중이에요. 잠시 후 다시 해주세요'); return; }
    var s = load();
    if (s.fwrote >= FRIEND_DAILY) { toast('오늘은 친구 편지를 다 썼어요 (하루 ' + FRIEND_DAILY + '통). 내일 또 써요!'); return; }
    text = Array.from(text).slice(0, TEXT_MAX).join('');
    sending = true;
    var btn = document.getElementById('mail-send'); if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
    try {
      var C = coreT(), f = C.F(), ref = f.doc(f.collection(f.db, FCOL));
      var data = { fromUid: C.uid(), fromNick: String(C.myNick() || '').slice(0, 20), toUid: fr.uid, toNick: String(fr.nick || '').slice(0, 20), text: text, read: false, createdAt: Date.now() };
      await f.runTransaction(f.db, async function (tx) { tx.set(ref, data); });
      var s2 = load();
      s2.sent.unshift({ id: ref.id, toUid: fr.uid, toNick: fr.nick, text: text, ts: Date.now() });
      s2.fwrote = (s2.fwrote || 0) + 1; save(s2);
      ui.draft = ''; toast('💌 ' + fr.nick + '님에게 편지를 보냈어요!'); ui.tab = 'sent'; render();
    } catch (e) {
      toast('보내지 못했어요. 친구인지 / 로그인 상태인지 확인해줘요'); 
      var b2 = document.getElementById('mail-send'); if (b2) { b2.disabled = false; b2.style.opacity = '1'; }
    }
    sending = false;
  }
  var fetching = false;
  async function fetchFriendLetters() {
    if (fetching || !netReady()) return 0; fetching = true; var fresh = [];
    try {
      var C = coreT(), f = C.F();
      var snap = await f.getDocs(f.query(f.collection(f.db, FCOL), f.where('toUid', '==', C.uid()), f.where('read', '==', false)));
      var docs = []; snap.forEach(function (d) { docs.push({ id: d.id, x: d.data() }); });
      docs.sort(function (a, b) { return (a.x.createdAt || 0) - (b.x.createdAt || 0); });
      for (var i = 0; i < docs.length && i < 20; i++) {
        var id = docs[i].id, x = docs[i].x, s = load();
        if (s.got.indexOf(id) === -1) {
          var txt = String(x.text || '').slice(0, TEXT_MAX), one = txt.replace(/\s+/g, ' ').trim();
          var m = addMail(s, { kind: 'friend', fromUid: x.fromUid, fromNick: String(x.fromNick || '친구').slice(0, 20), title: Array.from(one).slice(0, 14).join('') + (Array.from(one).length > 14 ? '…' : ''), body: txt, sign: '- ' + String(x.fromNick || '친구').slice(0, 20), raw: false });
          m.ts = x.createdAt || m.ts;
          s.got.push(id); if (s.got.length > 300) s.got = s.got.slice(-200);
          save(s); fresh.push(m);
        }
        try {   // 서버에 '읽음' 표시 (다시 안 오게)
          var ref = f.doc(f.db, FCOL, id);
          await f.runTransaction(f.db, async function (tx) { var d = await tx.get(ref); if (d.exists() && d.data().toUid === C.uid() && d.data().read === false) tx.update(ref, { read: true }); });
        } catch (e) {}
      }
    } catch (e) {}
    fetching = false;
    if (fresh.length) { announce(fresh); refreshOpen(); }
    return fresh.length;
  }
  var frTries = 0;
  (function bootFriend() { if (netReady()) { fetchFriendLetters(); return; } if (++frTries < 90) setTimeout(bootFriend, 1500); })();
  setInterval(function () { if (!document.hidden) fetchFriendLetters(); }, 2 * 60 * 1000);

  // ── 더보기 메뉴 타일 ──
  function whenReady(cond, fn) { if (cond()) fn(); else setTimeout(function () { whenReady(cond, fn); }, 150); }
  whenReady(function () { return typeof window.openMoreMenu === 'function' && typeof window.moreMenuTileHtml === 'function'; }, function () {
    var orig = window.openMoreMenu;
    if (orig.__mailWrapped) return;
    var w = function () {
      var res = orig.apply(this, arguments);
      try {
        var grid = document.getElementById('more-menu-grid');
        if (grid && !document.getElementById('more-mail-tile')) {
          var n = unreadN();
          grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('📮', n ? '우편함 (' + n + ')' : '우편함', ACC, 'openMailbox()'));
          if (grid.lastElementChild) grid.lastElementChild.id = 'more-mail-tile';
        }
      } catch (e) {}
      return res;
    };
    w.__mailWrapped = true; window.openMoreMenu = w;
  });

  window.openMailbox = openMailbox;
  window.openMailTo = function (uid, nick) { openMailbox({ tab: 'write', friend: { uid: uid, nick: nick } }); };
  window.__mailTest = { load: load, save: save, check: check, compose: compose, analyze: analyze, fmt: fmt, tierOf: tierOf, KEY: KEY, DAILY_WRITE: DAILY_WRITE, doSend: function (cid, t) { ui.cid = cid; doSend(t); }, unreadN: unreadN, fetchFriendLetters: fetchFriendLetters, loadFriends: loadFriends, sendFriend: function (t) { return sendFriend(t); }, ui: ui, FRIEND_DAILY: FRIEND_DAILY };

  setTimeout(check, 4000);                 // 게임이 다 열린 뒤 처음 확인
  setInterval(check, 8000);                // 답장 도착·새 편지 확인
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();
