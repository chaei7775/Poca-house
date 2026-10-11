// ════════════════════════════════
// 💫 그룹 조합 이스터에그 (combo-egg.js) — 어떤 둘이 같은 그룹이냐에 따라 숨은 시너지/반대급부
//  · 화면에 수치/안내는 없음. 활동 결과 대사에 가끔 힌트 한 줄만 나온다 → 유저가 직접 알아내야 함
//  · 멤버 중 쌍이 여럿이면 곱해진다 (0.6~1.8배로 제한). 코인과 인기도에 같이 적용
//  · 활동 id: stage 합동무대 / album 음원 / dance 댄스 / variety 예능 / photo 화보 / drama 드라마
//  · group.js 의 reward()/doActivity() 가 window.__comboEgg 를 불러 쓴다 (없으면 그냥 1배)
// ════════════════════════════════
(function () {
  'use strict';
  var NAMES = { minjun: '민준', sion: '시온', doyun: '도윤', harin: '하린', yuna: '윤아', ara: '아라' };
  // 쌍 키는 알파벳 순서가 아니라 [a,b] 둘 다 들어 있으면 적용. all=모든 활동 배율, 그 밖은 활동별 배율 / t=힌트 대사(활동별 또는 default)
  var PAIRS = [
    { p: ['minjun', 'sion'],  a: { stage: 1.25, album: 1.25 }, t: { default: '{a}의 직진과 {b}의 감성이 묘하게 맞아떨어져요.' } },
    { p: ['minjun', 'doyun'], all: 0.9, a: { variety: 1.3 }, t: { variety: '{a}와 {b}의 기싸움이 예능에선 웃음 포인트가 됐어요!', default: '{a}와 {b}, 서로 센터를 안 비켜줘서 분위기가 팽팽해요.' } },
    { p: ['minjun', 'harin'], a: { photo: 1.25 }, t: { default: '{a}가 옆에 서자 {b}가 한결 편안한 표정이에요.' } },
    { p: ['minjun', 'yuna'],  a: { photo: 1.2, stage: 0.9 }, t: { photo: '{a}와 {b}, 화보 속 분위기가 달달해요.', default: '{a}와 {b}가 눈 맞추느라 박자를 놓쳤어요.' } },
    { p: ['minjun', 'ara'],   a: { dance: 1.3, variety: 0.85 }, t: { dance: '{a}와 {b}가 붙으면 안무가 불꽃이 튀어요!', default: '{a}와 {b}가 서로 지지 않으려다 합이 엇나갔어요.' } },
    { p: ['sion', 'doyun'],   a: { album: 1.2 }, t: { default: '{a}의 음색에 {b}의 파트가 깔끔하게 얹혔어요.' } },
    { p: ['sion', 'harin'],   a: { album: 1.3, variety: 0.85 }, t: { album: '{a}와 {b}의 화음에 녹음실이 조용해졌어요.', default: '{a}와 {b}는 분위기 잡느라 웃기는 건 못 했어요.' } },
    { p: ['sion', 'yuna'],    a: { drama: 1.25 }, t: { default: '{a}와 {b}의 눈빛 연기가 진짜 같았어요.' } },
    { p: ['sion', 'ara'],     a: { drama: 1.3, variety: 0.8 }, t: { drama: '{a}와 {b}, 촬영장 스태프가 같이 울었어요.', default: '{a}와 {b}가 너무 진지해서 예능이 숙연해졌어요.' } },
    { p: ['doyun', 'harin'],  a: { stage: 1.2 }, t: { default: '{a}가 중심을 잡아주니 {b}가 무대에서 날았어요.' } },
    { p: ['doyun', 'yuna'],   a: { variety: 1.25 }, t: { default: '{a}와 {b}의 티키타카가 의외로 터졌어요!' } },
    { p: ['doyun', 'ara'],    a: { variety: 1.35, photo: 0.85 }, t: { variety: '{a}와 {b}가 먹방 케미로 난리가 났어요.', default: '{a}와 {b}가 촬영 중에 간식 얘기만 했어요.' } },
    { p: ['harin', 'yuna'],   a: { photo: 1.3, variety: 0.7 }, t: { photo: '{a}와 {b}의 수줍은 투샷이 화제예요.', default: '{a}와 {b}가 서로 눈치만 보다 말이 없었어요.' } },
    { p: ['harin', 'ara'],    a: { dance: 1.2, drama: 0.9 }, t: { dance: '{a}와 {b}의 대비되는 춤선이 눈을 사로잡았어요.', default: '{a}와 {b}의 호흡이 연기에선 살짝 어긋났어요.' } },
    { p: ['yuna', 'ara'],     a: { variety: 1.3, album: 0.85 }, t: { variety: '{a}와 {b}의 케이크 논쟁이 예능을 살렸어요!', default: '{a}와 {b}가 녹음 중 간식 문제로 투닥거렸어요.' } }
  ];
  function has(ms, c) { return ms.indexOf(c) !== -1; }
  function hits(ms, actId) {
    var out = [];
    PAIRS.forEach(function (e) {
      if (!has(ms, e.p[0]) || !has(ms, e.p[1])) return;
      var m = (e.all || 1) * ((e.a && e.a[actId]) || 1);
      if (m !== 1) out.push({ e: e, m: m });
    });
    return out;
  }
  function mult(members, actId) {
    var m = 1; hits(members || [], actId).forEach(function (h) { m *= h.m; });
    return Math.max(0.6, Math.min(1.8, m));
  }
  // 가장 영향이 큰 쌍의 힌트 한 줄 (확률적으로만)
  function hint(members, actId, chance) {
    var hs = hits(members || [], actId); if (!hs.length) return '';
    if (Math.random() >= (chance == null ? 0.6 : chance)) return '';
    hs.sort(function (x, y) { return Math.abs(Math.log(y.m)) - Math.abs(Math.log(x.m)); });
    var h = hs[0], t = (h.e.t[actId] || h.e.t['default']);
    return '💫 ' + t.replace(/\{a\}/g, NAMES[h.e.p[0]]).replace(/\{b\}/g, NAMES[h.e.p[1]]);
  }
  window.__comboEgg = { mult: mult, hint: hint, PAIRS: PAIRS };
})();
