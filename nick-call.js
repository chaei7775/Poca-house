// ════════════════════════════════
// 💬 닉네임으로 부르는 대사 (nick-call.js)
// 아이돌이 유저의 닉네임을 불러주는 대사. 대사 안에 이런 자리표시를 쓰면 닉네임으로 바뀐다 (받침에 맞게 조사도 자동):
//   {닉}  닉네임        {닉아}  민준아/수아야      {닉이}  민준이/수아가
//   {닉은} 민준은/수아는  {닉을} 민준을/수아를      {닉이야} 민준이야/수아야
// · 닉네임이 없으면 '너'로 대신하고, 너무 길면 앞 8글자만 쓴다
// · 지금 적용된 곳: ① 인연 화면 '만나기' 대화 (아이돌 6명 × 3단계에 닉네임 대사 추가)
//                   ② 스토리 퀘스트 대사 (story-quest.js 의 {닉…} 표시가 있는 줄)
// · 다른 화면에도 쓰려면 문장을 window.__nickFmt('…{닉아}…') 에 통과시키면 된다
// ════════════════════════════════
(function () {
  'use strict';
  var MAXLEN = 8;
  function nick() {
    var n = ''; try { n = (localStorage.getItem('ph_nickname') || '').trim(); } catch (e) {}
    n = Array.from(n).slice(0, MAXLEN).join('');
    return n || '너';
  }
  function batchim(s) {
    var c = s.charCodeAt(s.length - 1);
    return (c >= 0xAC00 && c <= 0xD7A3) ? ((c - 0xAC00) % 28 !== 0) : false;   // 한글이 아니면 받침 없는 걸로 취급
  }
  function fmt(text) {
    if (typeof text !== 'string' || text.indexOf('{닉') === -1) return text;
    var n = nick(), b = batchim(n);
    if (n === '너') {   // 닉네임이 없을 때는 자연스러운 '너' 표현으로
      var FB = { '': '너', '아': '야', '이': '네가', '은': '넌', '을': '너를', '이야': '너야' };
      return text.replace(/\{닉(아|이야|이|은|을)?\}/g, function (m, j) { return FB[j || '']; });
    }
    return text.replace(/\{닉(아|이야|이|은|을)?\}/g, function (m, j) {
      if (!j) return n;
      if (j === '아') return n + (b ? '아' : '야');
      if (j === '이야') return n + (b ? '이야' : '야');
      if (j === '이') return n + (b ? '이' : '가');
      if (j === '은') return n + (b ? '은' : '는');
      return n + (b ? '을' : '를');
    });
  }
  window.__nickFmt = fmt;
  window.__nickName = nick;

  // ── ① 만나기 대화: 닉네임 부르는 대사 추가 ──
  var ADD = {
    minjun: [['…{닉}? 여기서 뭐 해?'], ['오늘도 왔네, {닉아}.'], ['기다렸어, {닉아}. 같이 읽을까?']],
    sion:   [['…{닉}? 볼 것 없어. 가.'], ['또 왔어, {닉아}? …방해만 안 하면 돼.'], ['기다렸어, {닉아}. 오늘은 새 곡 들려줄까?']],
    doyun:  [['…{닉}. 볼 일 없으면 나가.'], ['…{닉아}, 용건이 뭐야? 짧게 말해.'], ['왔군, {닉아}. 앉아. 할 말이 있어.']],
    harin:  [['…{닉이야}? 여기 자주 와?'], ['오늘도 왔네, {닉아}. 같이 별 볼래?'], ['기다렸어, {닉아}. 오늘 밤 특별한 게 보일 것 같아.']],
    yuna:   [['어서 와, {닉아}! 오늘 꽃 예쁜 거 많이 들어왔어!'], ['또 왔어, {닉아}? 반가워!'], ['기다렸어, {닉아}! 이 꽃 {닉} 생각하면서 골랐어.']],
    ara:    [['…감히. {닉}, 이 호수는 내 장소야. 돌아가.'], ['…또 왔군, {닉아}. 비밀은 알아도 말 안 해.'], ['…왔군, {닉아}. 오늘은 특별히 얘기해줄게.']]
  };
  function addLines() {
    if (typeof CHAR_MEET === 'undefined') { setTimeout(addLines, 150); return; }
    if (window.__nickLinesAdded) return; window.__nickLinesAdded = true;
    Object.keys(ADD).forEach(function (id) {
      var m = CHAR_MEET[id]; if (!m || !m.dialogs) return;
      ADD[id].forEach(function (ls, i) { var d = m.dialogs[i]; if (d && d.lines && d.lines.indexOf(ls[0]) === -1) d.lines.push(ls[0]); });
    });
  }
  addLines();

  function hookMeet() {
    if (typeof window.showMeetPopup !== 'function') { setTimeout(hookMeet, 150); return; }
    if (window.showMeetPopup.__nickHooked) return;
    var orig = window.showMeetPopup;
    var w = function (ch, meet, dialog, aff) {
      if (dialog && dialog.lines) {
        var nl = dialog.lines.filter(function (l) { return l.indexOf('{닉') !== -1; });
        var pl = dialog.lines.filter(function (l) { return l.indexOf('{닉') === -1; });
        var pool = (nl.length && (Math.random() < 0.7 || !pl.length)) ? nl : pl;   // 닉네임 대사를 더 자주
        dialog = { maxAff: dialog.maxAff, lines: pool.map(fmt) };
      }
      return orig.call(this, ch, meet, dialog, aff);
    };
    w.__nickHooked = true; window.showMeetPopup = w;
  }
  hookMeet();
})();
