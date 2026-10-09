// ════════════════════════════════
// 🎓 아이돌 능력치 · 레슨 (lesson.js)  ── 1단계: 시온만
// 📅 스케줄 · 식사(meal.js) 화면의 능력치 카드 아래에 "🎓 능력치 / 오늘의 레슨" 칸을 붙인다.
//
// - 영구 능력치 5개: 🎤 보컬 · 💃 댄스 · 🎭 연기 · 🎪 예능 · ✨ 매력 (0~100, 처음 10)
//   (비주얼·체력·기분은 meal.js 의 "컨디션"이라 매일 50쪽으로 돌아오지만, 능력치는 한 번 올리면 안 떨어진다)
// - 레슨: 하루(게임 속 DAY)에 아이돌 1명당 1번. 코인이 들고, 체력/기분이 깎인다.
//     기분이 좋으면 효과 UP, 체력이 모자라면 효과 DOWN / 너무 지치면 레슨 불가
//     능력치가 높을수록 오르는 폭은 줄어든다 (천천히 키우는 맛)
// - 1단계에서는 능력치가 아직 드라마/CF/기획사 보상에 연결되지 않는다. (2단계에서 연결)
// - 지금은 시온만 열려 있다. 나머지 5명은 ENABLED 에 id 만 넣으면 열린다.
//
// 저장: localStorage 'ph_training' (ph_ 로 시작해서 cloud-extra.js 가 서버에 자동으로 올려줌)
// 컨디션/날짜/식사는 meal.js 의 저장값(ph_meal)을 window.__mealTest 로 읽고 쓴다.
// ════════════════════════════════
(function () {
  'use strict';

  // ════════ 설정 ════════
  var STORAGE_KEY = 'ph_training';
  var ENABLED = ['minjun', 'sion', 'doyun', 'harin', 'yuna', 'ara'];          // 레슨이 열린 아이돌
  var STAT_START = 10;
  var STAT_MAX = 100;
  var LESSON_COST = 1000;          // 코인
  var LESSON_TIRED = 10;           // 체력 −
  var LESSON_MOOD = 3;             // 기분 −
  var MIN_STAMINA = 15;            // 이보다 체력이 낮으면 레슨 불가
  var BASE_GAIN = 3;               // 기본 상승 (+0~2 랜덤)
  var MOOD_HIGH = 70, MOOD_LOW = 30, STAMINA_LOW = 35;
  var MOOD_HIGH_MULT = 1.3, MOOD_LOW_MULT = 0.7, STAMINA_LOW_MULT = 0.6;
  var SLOW_DIV = 150;              // 능력치가 높을수록 상승폭 ×(1 − 능력치/150)

  // ════════ 데이터 ════════
  var STATS = [
    { k: 'vocal',  name: '보컬', icon: '🎤', color: '#b793ff', lesson: '보컬 레슨' },
    { k: 'dance',  name: '댄스', icon: '💃', color: '#ff7aa8', lesson: '댄스 레슨' },
    { k: 'act',    name: '연기', icon: '🎭', color: '#ffcf4a', lesson: '연기 레슨' },
    { k: 'fun',    name: '예능', icon: '🎪', color: '#7fd1ae', lesson: '예능 수업' },
    { k: 'charm',  name: '매력', icon: '✨', color: '#7fc8ff', lesson: '카메라 워킹' }
  ];
  var STAT_BY_K = {};
  STATS.forEach(function (s) { STAT_BY_K[s.k] = s; });

  var APT = {                       // 아이돌별 적성 (없으면 ×1)
    minjun: { dance: 1.2, fun: 1.3, act: 0.9, vocal: 0.9 },
    sion: { vocal: 1.3, fun: 0.8, charm: 1.1 },
    doyun: { dance: 1.3, vocal: 1.1, charm: 0.9, fun: 0.9 },
    harin: { vocal: 1.2, act: 1.1, fun: 0.8, dance: 0.9 },
    yuna: { charm: 1.3, fun: 1.1, dance: 0.9, act: 0.9 },
    ara: { act: 1.3, vocal: 1.1, charm: 1.1, dance: 0.8 }
  };
  var GRADES = [                    // 한 능력치 기준 등급
    { min: 80, label: '에이스' },
    { min: 60, label: '실력파' },
    { min: 40, label: '유망주' },
    { min: 20, label: '연습생' },
    { min: 0,  label: '입문' }
  ];

  var LINES = {
    sion: {
      vocal: ['…목소리가 공기에 녹는 느낌이야. 오늘은 숨을 더 깊게 써봤어.', '높은 음에서 떨림이 줄었어. 조금씩 내 소리가 보여.', '녹음실이 조용해질 때까지 같은 구절을 불러봤어.'],
      dance: ['몸으로 감정을 그리는 건 아직 어려워. 그래도 박자가 손에 잡혔어.', '거울 속의 내가 조금 덜 어색해졌어.', '선을 길게 쓰는 법을 배웠어.'],
      act:   ['대본 속 사람이 되어보는 건 신기해. 눈빛이 달라졌대.', '울지 않고 우는 장면… 어려웠지만 알 것 같아.', '말없이 서 있는 연습을 했어.'],
      fun:   ['…웃기는 건 어려워. 그래도 오늘은 한 번 웃겼어.', '즉흥 대답이 조금 빨라졌어.', '선배가 리액션은 나쁘지 않대.'],
      charm: ['카메라 앞에서 시선 두는 법을 배웠어.', '미소의 각도를 거울 앞에서 찾았어.', '무대 밖에서도 눈길이 가는 사람… 되고 싶어.']
    }
  };
  var TIRED_LINE = '…오늘은 몸이 말을 안 들어. 그래도 끝까지 해봤어.';
  var GLOW_LINE = '기분이 좋아서 그런지 오늘은 술술 들어왔어!';

  // ════════ 순수 로직 ════════
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!s.stat) s.stat = {};     // { cid: {vocal,dance,act,fun,charm} }
    if (!s.last) s.last = {};     // { cid: 마지막으로 레슨한 DAY }
    if (!s.count) s.count = {};   // { cid: 누적 레슨 횟수 }
    return s;
  }
  function save(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {} }

  function statOf(st, cid) {
    var o = st.stat[cid];
    if (!o) o = st.stat[cid] = {};
    STATS.forEach(function (m) { if (typeof o[m.k] !== 'number') o[m.k] = STAT_START; });
    return o;
  }
  function gradeOf(v) {
    for (var i = 0; i < GRADES.length; i++) if (v >= GRADES[i].min) return GRADES[i].label;
    return GRADES[GRADES.length - 1].label;
  }
  function totalOf(st, cid) {
    var o = statOf(st, cid), t = 0;
    STATS.forEach(function (m) { t += o[m.k]; });
    return t;
  }
  function doneToday(st, cid, day) { return st.last[cid] === day; }

  // 레슨 한 번의 상승량 계산 (랜덤은 rng 로 받아서 테스트 가능)
  function gainFor(cid, k, cur, cond, rng) {
    rng = rng || Math.random;
    var g = BASE_GAIN + Math.floor(rng() * 3);                 // 3~5
    var apt = (APT[cid] && APT[cid][k]) || 1;
    var note = '';
    var mult = apt;
    if (cond.m >= MOOD_HIGH) { mult *= MOOD_HIGH_MULT; note = 'glow'; }
    else if (cond.m < MOOD_LOW) { mult *= MOOD_LOW_MULT; }
    if (cond.s < STAMINA_LOW) { mult *= STAMINA_LOW_MULT; note = 'tired'; }
    var slow = Math.max(0.15, 1 - cur / SLOW_DIV);
    return { gain: Math.max(1, Math.round(g * mult * slow)), note: note };
  }

  // 레슨 가능 여부
  function canLesson(st, cid, k, day, cond, haveCoins) {
    if (ENABLED.indexOf(cid) === -1) return { ok: false, why: 'locked' };
    if (!STAT_BY_K[k]) return { ok: false, why: 'invalid' };
    if (doneToday(st, cid, day)) return { ok: false, why: 'done' };
    if (cond.s < MIN_STAMINA) return { ok: false, why: 'tired' };
    if (haveCoins < LESSON_COST) return { ok: false, why: 'coin' };
    return { ok: true };
  }

  // 레슨 실행: 능력치/횟수/날짜를 바꾸고 결과를 돌려준다. (컨디션 깎기·코인은 호출하는 쪽에서 함)
  function doLesson(st, cid, k, day, cond, rng) {
    rng = rng || Math.random;
    var o = statOf(st, cid);
    var before = o[k];
    var r = gainFor(cid, k, before, cond, rng);
    o[k] = clamp(before + r.gain, 0, STAT_MAX);
    st.last[cid] = day;
    st.count[cid] = (st.count[cid] || 0) + 1;
    var pool = (LINES[cid] && LINES[cid][k]) || [];
    var line = r.note === 'tired' ? TIRED_LINE : (r.note === 'glow' ? GLOW_LINE : (pool.length ? pool[Math.floor(rng() * pool.length)] : ''));
    return {
      k: k, before: before, after: o[k], gain: o[k] - before, note: r.note, line: line,
      gradeUp: gradeOf(o[k]) !== gradeOf(before) ? gradeOf(o[k]) : ''
    };
  }

  // ════════ 🎓 능력치 효과 (드라마·CF·음방·기획사 수익에 연결) ════════
  //  f(k) = (능력치 − 10) / 90  → 처음 0, 100이면 1
  var FX = {
    actDrama: 0.30,     // 연기 100 → 드라마 촬영·일정 정산 +30%
    charmCf: 0.30,      // 매력 100 → CF 보상 +30%
    stageVD: 0.15,      // 보컬 100 → 음방·컴백 정산 +15%, 댄스 100 → 또 +15%
    incomeFun: 0.10,    // 예능 100 → 기획사 수익 +10%
    incomeCharm: 0.10   // 매력 100 → 기획사 수익 +10%
  };
  function fOf(cid, k) {
    var v = STAT_START_VAL; try { if (typeof window.getIdolTrainStat === 'function') v = Number(window.getIdolTrainStat(cid, k)); } catch (e) {}
    if (!(v >= 0)) v = STAT_START_VAL;
    return Math.max(0, Math.min(1, (v - STAT_START_VAL) / (STAT_MAX - STAT_START_VAL)));
  }
  var STAT_START_VAL = STAT_START;
  function payMult(cid, type) {
    if (type === 'drama') return 1 + FX.actDrama * fOf(cid, 'act');
    if (type === 'music' || type === 'comeback') return 1 + FX.stageVD * (fOf(cid, 'vocal') + fOf(cid, 'dance'));
    return 1;
  }
  function incomeMult(cid) { return 1 + FX.incomeFun * fOf(cid, 'fun') + FX.incomeCharm * fOf(cid, 'charm'); }
  window.__lessonPayMult = payMult;
  window.__lessonIncomeMult = incomeMult;
  function pctTxt(x) { return '+' + Math.round(x * 100) + '%'; }
  function fxLine(cid) {
    var st = [
      ['🎭 연기', pctTxt(FX.actDrama * fOf(cid, 'act')) + ' 드라마'],
      ['✨ 매력', pctTxt(FX.charmCf * fOf(cid, 'charm')) + ' CF'],
      ['🎤💃 보컬·댄스', pctTxt(FX.stageVD * (fOf(cid, 'vocal') + fOf(cid, 'dance'))) + ' 음방·컴백'],
      ['🎪 예능·매력', pctTxt(FX.incomeFun * fOf(cid, 'fun') + FX.incomeCharm * fOf(cid, 'charm')) + ' 기획사 수익']
    ];
    return '<div style="margin-top:8px;font-size:10.5px;line-height:1.6;color:#b9c2ff;">📈 지금 효과: ' + st.map(function (r) { return r[0] + ' ' + r[1]; }).join(' · ') + '</div>';
  }
  // 드라마·CF 촬영이 끝나면 능력치만큼 코인을 더 준다
  function bonusToast(label, extra) { if (extra > 0) { try { gainCoins(extra); } catch (e) {} try { if (typeof showBagToast === 'function') showBagToast('🎓 ' + label + ' +' + extra.toLocaleString() + '코인'); } catch (e) {} } }
  function gainCoins(n) { if (typeof coins !== 'undefined') { coins += n; try { saveAll(); } catch (e) {} } }
  try {
    window.addEventListener('ph-drama-shot', function (e) {
      var d = (e && e.detail) || {}; if (!d.ch || !(d.pay > 0)) return;
      bonusToast('연기력 보너스', Math.round(d.pay * FX.actDrama * fOf(d.ch, 'act') / 100) * 100);
    });
    window.addEventListener('ph-cf-shot', function (e) {
      var d = (e && e.detail) || {}; if (!d.cid || !(d.pay > 0)) return;
      bonusToast('매력 보너스', Math.round(d.pay * FX.charmCf * fOf(d.cid, 'charm') / 100) * 100);
    });
  } catch (e) {}

  // ════════ meal.js / 게임 연결 ════════
  function M() { return window.__mealTest || null; }
  function money() { return (typeof coins !== 'undefined') ? coins : 0; }
  function spend(n) { if (n > 0 && typeof coins !== 'undefined') { coins -= n; try { saveAll(); } catch (e) {} } }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }
  function snd(n) { try { if (window.pocaSfx) window.pocaSfx.play(n); } catch (e) {} }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var BTN = 'border:none;border-radius:12px;font-weight:900;cursor:pointer;' + FONT;
  var lastCid = null;

  // ════════ 화면 ════════
  function currentCid(ov) {
    var m = M(); if (!m) return null;
    var img = ov.querySelector('#meal-stage [data-r="sd"]');
    if (img && img.alt) {
      for (var id in m.CH) if (Object.prototype.hasOwnProperty.call(m.CH, id) && m.CH[id].name === img.alt) return id;
    }
    if (lastCid && m.CH[lastCid]) return lastCid;
    var first = ov.querySelector('#meal-chips [data-cid]');
    return first ? first.getAttribute('data-cid') : null;
  }

  function barsHtml(st, cid, from) {
    var o = statOf(st, cid);
    return STATS.map(function (m) {
      var shown = (from && from[m.k] !== undefined) ? from[m.k] : o[m.k];
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">' +
        '<div style="width:62px;font-size:12px;font-weight:900;color:#fff;">' + m.icon + ' ' + m.name + '</div>' +
        '<div style="flex:1;height:10px;border-radius:6px;background:rgba(255,255,255,0.12);overflow:hidden;">' +
        '<div class="ls-bar" data-final="' + o[m.k] + '" style="height:100%;width:' + shown + '%;background:' + m.color + ';border-radius:6px;transition:width .9s ease-out;"></div></div>' +
        '<div style="width:56px;text-align:right;font-size:12px;font-weight:900;color:' + m.color + ';">' + o[m.k] + ' <span style="font-size:10px;opacity:.8;">' + gradeOf(o[m.k]) + '</span></div></div>';
    }).join('');
  }

  function boxHtml(cid, from) {
    var m = M(), st = load(), name = m.CH[cid].name;
    var head = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
      '<div style="font-size:14px;font-weight:900;color:#fff;">🎓 ' + esc(name) + '의 능력치</div>';
    if (ENABLED.indexOf(cid) === -1) {
      return head + '</div><div style="font-size:12px;color:#cfd3ee;line-height:1.6;">🔒 ' + esc(name) + '의 레슨은 곧 열려요.<br>먼저 시온으로 시작해요!</div>';
    }
    var ms = m.load(), cond = m.statOf(ms, cid), day = ms.day, have = money();
    head += '<div style="font-size:11px;font-weight:900;color:#ffe08a;">합계 ' + totalOf(st, cid) + ' / ' + (STATS.length * STAT_MAX) + '</div></div>';
    var done = doneToday(st, cid, day);
    var warn = '';
    if (!done) {
      if (cond.s < MIN_STAMINA) warn = '😵 체력이 너무 낮아서 레슨을 못 해요. 식사로 체력을 채워주세요';
      else if (cond.s < STAMINA_LOW) warn = '😥 체력이 낮아서 효과가 줄어요';
      else if (cond.m >= MOOD_HIGH) warn = '😊 기분이 좋아서 효과가 올라요';
      else if (cond.m < MOOD_LOW) warn = '😔 기분이 안 좋아서 효과가 줄어요';
    }
    var lessons = STATS.map(function (s) {
      var c = canLesson(st, cid, s.k, day, cond, have);
      var apt = (APT[cid] && APT[cid][s.k]) || 1;
      var tag = apt > 1 ? '<span style="color:#7ee8a5;">잘해요</span>' : (apt < 1 ? '<span style="color:#ffb36b;">서툴러요</span>' : '');
      return '<button data-lesson="' + s.k + '" style="' + BTN + 'padding:9px 4px;background:rgba(255,255,255,0.08);border:1px solid ' + s.color + '66;color:#fff;font-size:11px;opacity:' + (c.ok ? 1 : 0.45) + ';">' +
        '<div style="font-size:20px;">' + s.icon + '</div><div>' + s.lesson + '</div>' +
        '<div style="font-size:10px;font-weight:700;min-height:13px;">' + tag + '</div></button>';
    }).join('');
    var ctrl = done
      ? '<div style="text-align:center;font-size:12px;font-weight:900;color:#7ee8a5;background:rgba(126,232,165,.1);border:1px solid rgba(126,232,165,.35);border-radius:10px;padding:9px;">✅ 오늘 레슨 완료! 🌙 하루를 보내면 다시 할 수 있어요</div>'
      : '<div style="font-size:12px;font-weight:900;color:#ddd;margin-bottom:6px;display:flex;justify-content:space-between;"><span>📚 오늘의 레슨 <span style="color:#aaa;font-weight:700;">(하루 1번)</span></span>' +
        '<span style="color:' + (have < LESSON_COST ? '#ff8a8a' : '#ffe08a') + ';">' + LESSON_COST.toLocaleString() + '코인 · 체력 −' + LESSON_TIRED + '</span></div>' +
        (warn ? '<div style="font-size:11px;color:#ffcf9a;margin-bottom:6px;">' + warn + '</div>' : '') +
        '<div id="ls-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;">' + lessons + '</div>';
    return head + barsHtml(st, cid, from) + fxLine(cid) + '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed rgba(255,255,255,0.15);">' + ctrl + '</div>';
  }

  function animateBars(root) {
    var bars = root.querySelectorAll('.ls-bar');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        for (var i = 0; i < bars.length; i++) bars[i].style.width = bars[i].getAttribute('data-final') + '%';
      });
    });
  }

  function drawBox(ov, from) {
    var box = ov.querySelector('#lesson-box');
    if (!box || !M()) return;
    var cid = currentCid(ov);
    if (!cid || !M().CH[cid]) { box.innerHTML = ''; return; }
    box.setAttribute('data-cid', cid);
    box.innerHTML = boxHtml(cid, from);
    animateBars(box);
    var grid = box.querySelector('#ls-grid');
    if (grid) grid.onclick = function (e) {
      var b = e.target.closest ? e.target.closest('[data-lesson]') : null;
      if (b) startLesson(cid, b.getAttribute('data-lesson'));
    };
  }

  function inject(ov) {
    if (!ov || !M() || ov.querySelector('#lesson-box')) return;
    var anchor = ov.querySelector('#meal-stats');
    if (!anchor) return;
    var box = document.createElement('div');
    box.id = 'lesson-box';
    box.style.cssText = 'margin-top:12px;background:rgba(183,147,255,0.10);border:1px solid rgba(183,147,255,0.35);border-radius:14px;padding:12px;' + FONT;
    anchor.insertAdjacentElement('afterend', box);
    drawBox(ov);
  }

  function startLesson(cid, k) {
    var m = M(); if (!m) return;
    var ms = m.load(), cond = m.statOf(ms, cid), st = load();
    var c = canLesson(st, cid, k, ms.day, cond, money());
    if (!c.ok) {
      toast(c.why === 'done' ? '오늘 레슨은 이미 했어요' : c.why === 'tired' ? '😵 체력이 너무 낮아요. 식사로 채워주세요' : c.why === 'coin' ? '코인이 모자라요' : '아직 열리지 않았어요');
      return;
    }
    spend(LESSON_COST);
    var res = doLesson(st, cid, k, ms.day, cond);
    save(st);
    cond.s = clamp(cond.s - LESSON_TIRED, 0, 100);
    cond.m = clamp(cond.m - LESSON_MOOD, 0, 100);
    m.save(ms);
    snd('stamp');
    showResult(cid, res);
    var ov = document.getElementById('meal-overlay');
    if (ov) {
      var from = {}; from[k] = res.before;
      try { if (window.__mealRefresh) window.__mealRefresh(); } catch (e) {}
      drawBox(ov, from);
    }
  }

  function showResult(cid, res) {
    var old = document.getElementById('lesson-result'); if (old) old.remove();
    var m = M(), name = m.CH[cid].name, s = STAT_BY_K[res.k];
    var ov = document.createElement('div');
    ov.id = 'lesson-result';
    ov.style.cssText = 'position:fixed;inset:0;z-index:820;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:16px;' + FONT;
    ov.innerHTML = '<div style="width:100%;max-width:340px;background:linear-gradient(160deg,#1b1330,#2a1745);border:1.5px solid ' + s.color + ';border-radius:20px;padding:18px;text-align:center;">' +
      '<div style="font-size:13px;font-weight:900;color:#cfd3ee;">' + esc(name) + ' · ' + s.lesson + '</div>' +
      '<div style="font-size:44px;margin:8px 0 2px;">' + s.icon + '</div>' +
      '<div style="font-size:22px;font-weight:900;color:' + s.color + ';">' + s.name + ' +' + res.gain + '</div>' +
      '<div style="font-size:12px;color:#aab4d6;margin-top:2px;">' + res.before + ' → <b style="color:#fff;">' + res.after + '</b></div>' +
      (res.gradeUp ? '<div style="margin-top:8px;font-size:13px;font-weight:900;color:#ffd700;">🎉 ' + s.name + ' 등급 상승! [' + res.gradeUp + ']</div>' : '') +
      '<div style="margin:12px 0 4px;background:#fff;color:#2a2438;border-radius:14px;padding:9px 12px;font-size:12px;font-weight:700;line-height:1.5;">“' + esc(res.line) + '”</div>' +
      '<div style="font-size:11px;color:#9aa0c8;margin-top:8px;">체력 −' + LESSON_TIRED + ' · 기분 −' + LESSON_MOOD + '</div>' +
      '<button id="lesson-ok" style="' + BTN + 'width:100%;margin-top:12px;padding:12px;background:linear-gradient(135deg,#b793ff,#7c5cff);color:#fff;font-size:14px;">확인</button></div>';
    document.body.appendChild(ov);
    ov.querySelector('#lesson-ok').onclick = function () { ov.remove(); };
  }

  // ════════ meal 화면에 붙이기 ════════
  function watch() {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined' || !document.body) return;
    var watched = null;
    function attach(ov) {
      if (watched === ov) return;
      watched = ov;
      inject(ov);
      new MutationObserver(function () { inject(ov); }).observe(ov, { childList: true });   // render() 로 화면이 다시 그려지면 다시 붙임
    }
    var first = document.getElementById('meal-overlay');
    if (first) attach(first);
    new MutationObserver(function () {
      var ov = document.getElementById('meal-overlay');
      if (ov) attach(ov); else watched = null;
    }).observe(document.body, { childList: true });
    document.addEventListener('click', function (e) {          // 아이돌 칩 선택을 기억해 둠 (그림이 없을 때 대비)
      var b = e.target && e.target.closest ? e.target.closest('#meal-overlay [data-cid]') : null;
      if (b) lastCid = b.getAttribute('data-cid');
    }, true);
  }
  watch();

  // 다른 기능(2단계: 드라마·CF·기획사 연결)이 읽어갈 수 있게 열어둔다
  window.getIdolTrainStat = function (cid, k) { var o = statOf(load(), cid); return k ? o[k] : Object.assign({}, o); };
  window.__lessonTest = {
    STATS: STATS, CFG: { LESSON_COST: LESSON_COST, LESSON_TIRED: LESSON_TIRED, LESSON_MOOD: LESSON_MOOD, MIN_STAMINA: MIN_STAMINA, ENABLED: ENABLED },
    load: load, save: save, statOf: statOf, gradeOf: gradeOf, totalOf: totalOf, gainFor: gainFor, canLesson: canLesson, doLesson: doLesson, doneToday: doneToday
  };
})();
