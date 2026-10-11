// ════════════════════════════════
// 📋 그룹 활동 결과 리포트 (group-report.js) — 등급 + "누가 뭘 했어요" 한 줄씩
//  · group.js 의 doActivity() 가 window.__groupReport.make(...) 를 불러 결과에 붙이고, 결과 팝업이 보여준다
//  · 멤버별 점수 = 그 활동에 필요한 능력치(가중 합). 1등은 하이라이트, 꼴찌는 아쉬운 점, 나머지는 무난한 한 줄
//  · NG 면 원인 없이 누군가 실수한 대사, 대성공이면 전원 칭찬 대사
//  · 대사는 활동별 템플릿. 늘리고 싶으면 T 표에 문장만 추가하면 됨 ({n}=이름)
// ════════════════════════════════
(function () {
  'use strict';
  var GRADES = [['C', '아쉬움', '#9aa6c4'], ['B', '보통', '#9fd8ff'], ['A', '좋음', '#9dffb0'], ['S', '훌륭', '#ffd76a'], ['SS', '최고', '#ff9ecb']];
  var T = {
    stage:   { top: ['{n}의 라이브가 객석을 사로잡았어요.', '{n}이 고음 파트를 흔들림 없이 끌어올렸어요.', '{n}의 무대 매너에 함성이 터졌어요.'],
               low: ['{n}은 살짝 긴장해서 박자를 한 번 놓쳤어요.', '{n}이 마이크를 늦게 들었지만 금방 따라잡았어요.'],
               mid: ['{n}은 안정적으로 자기 파트를 해냈어요.', '{n}은 코러스를 든든하게 받쳐줬어요.'],
               ng:  ['{n}이 가사를 헷갈려 분위기가 얼어붙었어요.', '{n}의 이어폰이 빠져서 무대가 흔들렸어요.'] },
    album:   { top: ['{n}의 한 소절에 녹음실이 조용해졌어요.', '{n}이 한 번에 OK 사인을 받았어요.', '{n}의 애드리브가 곡의 포인트가 됐어요.'],
               low: ['{n}은 음정을 잡느라 세 번이나 다시 불렀어요.', '{n}이 목이 잠겨 파트가 줄었어요.'],
               mid: ['{n}은 화음을 곱게 쌓아줬어요.', '{n}은 코러스를 차분하게 마무리했어요.'],
               ng:  ['{n}의 음 이탈로 녹음이 계속 끊겼어요.', '{n}이 녹음 버튼을 잘못 눌러 파일이 날아갔어요.'] },
    dance:   { top: ['{n}의 파워풀한 동작이 챌린지의 킬링 파트가 됐어요.', '{n}이 센터에서 칼각을 완벽하게 보여줬어요.', '{n}의 표정 연기에 조회수가 치솟았어요.'],
               low: ['{n}은 한 동작이 반 박자 늦었어요.', '{n}이 동선을 헷갈려 옆 사람과 부딪힐 뻔했어요.'],
               mid: ['{n}은 군무를 안정적으로 이어갔어요.', '{n}은 포인트 안무를 깔끔하게 소화했어요.'],
               ng:  ['{n}이 미끄러져 촬영이 중단됐어요.', '{n}의 동선이 어긋나 처음부터 다시 찍었어요.'] },
    variety: { top: ['{n}의 한마디에 스튜디오가 뒤집어졌어요.', '{n}이 분위기 메이커로 대활약했어요.', '{n}의 리액션이 방송 하이라이트가 됐어요.'],
               low: ['{n}은 타이밍을 놓쳐 멋쩍게 웃었어요.', '{n}은 게임에서 일찍 탈락했어요.'],
               mid: ['{n}은 옆에서 열심히 리액션을 해줬어요.', '{n}은 무난하게 분량을 챙겼어요.'],
               ng:  ['{n}의 농담이 분위기를 싸하게 만들었어요.', '{n}이 마이크를 켜놓고 사적인 얘기를 해버렸어요.'] },
    photo:   { top: ['{n}의 눈빛이 화보의 메인 컷이 됐어요.', '{n}이 포즈 한 번에 포토그래퍼를 감탄시켰어요.', '{n}의 비주얼에 광고주가 반했어요.'],
               low: ['{n}은 카메라 앞에서 표정이 굳었어요.', '{n}은 눈을 감은 컷이 많았어요.'],
               mid: ['{n}은 자연스러운 포즈로 컷을 채웠어요.', '{n}은 단체 컷의 균형을 잡아줬어요.'],
               ng:  ['{n}이 의상에 음료를 쏟아 촬영이 멈췄어요.', '{n}의 눈 깜빡임 때문에 단체 컷이 계속 실패했어요.'] },
    drama:   { top: ['{n}의 눈물 연기에 스태프가 숨을 죽였어요.', '{n}이 한 번에 컷 OK를 받았어요.', '{n}의 대사 한 줄이 명장면이 됐어요.'],
               low: ['{n}은 대사를 몇 번 더듬었어요.', '{n}은 감정선을 잡느라 NG를 냈어요.'],
               mid: ['{n}은 조연으로서 장면을 단단히 받쳐줬어요.', '{n}은 침착하게 연기를 이어갔어요.'],
               ng:  ['{n}이 웃음이 터져 장면이 계속 끊겼어요.', '{n}이 대본을 잘못 외워 촬영이 꼬였어요.'] }
  };
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  var JP = { '은': ['은', '는'], '는': ['은', '는'], '이': ['이', '가'], '가': ['이', '가'], '을': ['을', '를'], '를': ['을', '를'], '과': ['과', '와'], '와': ['과', '와'] };
  function fillName(tpl, nm) {
    var code = nm.charCodeAt(nm.length - 1) - 0xAC00, bat = code >= 0 && code % 28 !== 0;
    return tpl.replace(/\{n\}([은는이가을를과와])?/g, function (m, j) { return nm + (j ? JP[j][bat ? 0 : 1] : ''); });
  }
  function make(actId, members, nameOf, scoreOf, tier, big, ng) {
    var t = T[actId] || T.stage, ranked = members.map(function (c) { return { c: c, s: scoreOf(c) }; }).sort(function (a, b) { return b.s - a.s; });
    var g = GRADES[Math.max(0, Math.min(GRADES.length - 1, tier))];
    var head = ng ? { label: '💥 NG', color: '#ff8a8a' } : big ? { label: '🌟 대성공 (' + g[0] + ')', color: '#ffd76a' } : { label: g[0] + ' · ' + g[1], color: g[2] };
    var lines = [], f = function (tpl, c) { return fillName(tpl, nameOf(c)); };
    if (ng) {
      var bad = ranked.slice().sort(function () { return Math.random() - 0.5; }).slice(0, ranked.length > 3 ? 2 : 1);
      bad.forEach(function (r) { lines.push({ c: r.c, text: f(pick(t.ng), r.c), tone: 'bad' }); });
      return { grade: head.label, color: head.color, lines: lines };
    }
    ranked.forEach(function (r, i) {
      var tone, tpl;
      if (i === 0) { tone = 'top'; tpl = pick(t.top); }
      else if (i === ranked.length - 1 && ranked.length > 2 && !big && tier < 3) { tone = 'low'; tpl = pick(t.low); }
      else { tone = 'mid'; tpl = pick(t.mid); }
      lines.push({ c: r.c, text: f(tpl, r.c), tone: tone });
    });
    return { grade: head.label, color: head.color, lines: lines };
  }
  // ── 멤버별 랜덤 변수 (전날 발목을 삐끗하는 것처럼 능력치와 무관한 운) ──
  //  멤버마다 사고(HURT) 또는 컨디션 최고(LUCK)가 걸릴 수 있음. 체력/기분이 낮으면 사고 확률 ↑ (식사·관리가 의미 있어짐)
  //  결과: 코인·인기도 배율 (사고 1명당 ×0.8, 컨디션 최고 1명당 ×1.12, 전체 0.55~1.3)
  var HURT_P = 0.10, HURT_P_LOW = 0.28, LUCK_P = 0.07, HURT_MUL = 0.8, LUCK_MUL = 1.12;
  var H = {
    stage:   ['{n}은 전날 목이 잠겨서 고음이 불안했어요.', '{n}은 어제 무리해서 목소리가 갈라졌어요.', '{n}은 감기 기운으로 컨디션이 좋지 않았어요.'],
    album:   ['{n}은 목이 부어 평소 음색이 안 나왔어요.', '{n}은 전날 늦게 자서 집중력이 흐트러졌어요.'],
    dance:   ['{n}은 전날 발목을 삐끗해서 동작이 무뎠어요.', '{n}은 어제 연습하다 무릎이 욱신거렸어요.', '{n}은 다리에 쥐가 나서 중간에 동작이 끊겼어요.'],
    variety: ['{n}은 잠을 못 자 평소 텐션이 안 나왔어요.', '{n}은 전날 체해서 웃음이 어색했어요.'],
    photo:   ['{n}은 얼굴이 퉁퉁 부어서 평소 비주얼이 아니었어요.', '{n}은 눈에 다래끼가 나서 컷이 제한됐어요.'],
    drama:   ['{n}은 감기에 걸려 목소리가 갈라졌어요.', '{n}은 전날 밤샘 촬영으로 눈 밑이 어두웠어요.']
  };
  var L = {
    stage:   ['{n}은 오늘따라 목 상태가 최고였어요!'], album: ['{n}은 오늘 컨디션이 최고라 한 번에 녹음을 끝냈어요!'],
    dance:   ['{n}은 몸이 가벼워서 평소보다 날아다녔어요!'], variety: ['{n}은 오늘 텐션이 하늘을 찔렀어요!'],
    photo:   ['{n}은 오늘 피부 컨디션이 역대급이었어요!'], drama: ['{n}은 오늘 감정이 제대로 올라왔어요!']
  };
  function statOfMeal(cid) { try { var st = (JSON.parse(localStorage.getItem('ph_meal') || '{}') || {}).stat || {}; return st[cid] || {}; } catch (e) { return {}; } }
  function roll(actId, members, perf) {   // perf: 직접 플레이 점수 0~1 (잘할수록 사고 확률·피해가 줄어든다. 아예 없어지진 않음)
    var items = [], mul = 1, has = typeof perf === 'number';
    var fP = has ? Math.max(0.3, Math.min(1.3, 1.3 - perf)) : 1, fM = has ? Math.max(0.2, Math.min(1, 1.2 - perf)) : 1, hw = !has ? 1 : perf >= 0.85 ? 0 : perf >= 0.6 ? 0.5 : 1;   // 사고 확률 배율 / 피해 배율 / 등급 하락 비중
    members.forEach(function (c) {
      var st = statOfMeal(c), low = (typeof st.s === 'number' && st.s < 40) || (typeof st.m === 'number' && st.m < 40);
      var r = Math.random();
      if (r < (low ? HURT_P_LOW : HURT_P) * fP) { items.push({ c: c, type: 'hurt', tpl: pick(H[actId] || H.stage) }); mul *= 1 - (1 - HURT_MUL) * fM; }
      else if (r > 1 - LUCK_P) { items.push({ c: c, type: 'luck', tpl: pick(L[actId] || L.stage) }); mul *= LUCK_MUL; }
    });
    var net = 0; items.forEach(function (it) { net += it.type === 'luck' ? 1 : -hw; });
    return { mul: Math.max(0.55, Math.min(1.3, mul)), items: items, shift: Math.max(-2, Math.min(1, Math.round(net))) };   // shift: 등급 변화 (사고 1명당 -1단계 최대 -2, 컨디션 최고 +1단계 최대 +1)
  }
  // 리포트에 랜덤 변수 줄을 덮어씌움 (해당 멤버의 기본 줄 대신)
  function overlay(rep, rl, nameOf) {
    if (!rep || !rl || !rl.items.length) return rep;
    rl.items.forEach(function (it) {
      var line = { c: it.c, text: fillName(it.tpl, nameOf(it.c)), tone: it.type === 'hurt' ? 'bad' : 'top' }, k = -1;
      rep.lines.forEach(function (l, i) { if (l.c === it.c) k = i; });
      if (k >= 0) rep.lines[k] = line; else rep.lines.push(line);
    });
    return rep;
  }
  window.__groupReport = { make: make, roll: roll, overlay: overlay, T: T };
})();
