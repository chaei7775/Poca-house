// ════════════════════════════════
// 📅 일일퀘스트 (daily-quest.js) — game.js / index.html 건드리지 않는 별도 모듈
// 매일 자정(기기 시간 기준)에 초기화. 경험치 크게 + 코인 약간.
// - 홈 화면: 길잡이 카드 아래에 한 줄 카드 (받을 보상이 있으면 [받기] 버튼)
// - 퀘스트 탭: 맨 위에 일일퀘스트 목록
// 등록: loader.js NEW_CONTENT_FILES 맨 끝에 'daily-quest.js' 한 줄 추가
// 저장: localStorage 'ph_daily'  (기기 저장 — cloud-extra.js 서버 저장 목록에 넣으려면 같은 키 추가)
// ════════════════════════════════
(function () {
  var KEY = 'ph_daily';

  // ───────── ⚙️ 보상 설정 (여기 숫자만 고치면 밸런스 조절) ─────────
  // exp: 하루 총 경험치 = 현재 레벨 필요경험치 × 배율 (최소 MIN_TOTAL_EXP)
  //   → 초반엔 하루에 여러 레벨, 레벨이 높아질수록 배율이 줄어듦
  var MIN_TOTAL_EXP = 200;
  function expMultiplier(lv) { return lv <= 10 ? 1.5 : (lv <= 20 ? 0.8 : 0.4); }

  // 퀘스트 목록: need=목표 횟수, w=경험치 비중(합 1.0), coins=코인(고정, 약간)
  var QUESTS = [
    { id: 'login',   icon: '👋', title: '오늘도 출석!',      desc: '접속하면 자동 완료',          need: 1, w: 0.10, coins: 1000 },
    { id: 'alba',    icon: '🍔', title: '알바 2판 하기',      desc: '🍔 알바하기에서 2번 완료',     need: 2, w: 0.20, coins: 1500 },
    { id: 'explore', icon: '🚐', title: '스케줄 2번 나가기',  desc: '🚐 스케줄 가기 / 낚시 2번',    need: 2, w: 0.20, coins: 1000 },
    { id: 'gift',    icon: '💝', title: '선물 1번 하기',      desc: '💞 인연에서 아이돌에게 선물',  need: 1, w: 0.15, coins: 1000 },
    { id: 'school',  icon: '🏫', title: '학교 1번 가기',      desc: '맵 → 연성고등학교 미니게임',   need: 1, w: 0.15, coins: 1000 },
  ];
  var BONUS = { id: 'bonus', icon: '🎁', title: '올클리어 보너스', desc: '위 5개를 모두 받으면 추가 보상', w: 0.20, coins: 1500 };

  // ───────── 날짜 / 저장 ─────────
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} }

  function sumCardCounts() {
    try { var n = 0; Object.keys(cardCounts).forEach(function (k) { n += cardCounts[k] || 0; }); return n; } catch (e) { return 0; }
  }
  function getAlba() { try { return typeof albaDone !== 'undefined' ? albaDone : 0; } catch (e) { return 0; } }
  function plv() { try { return typeof playerLevel !== 'undefined' ? playerLevel : 1; } catch (e) { return 1; } }
  function reqExp(lv) { try { return typeof getExpRequired === 'function' ? getExpRequired(lv) : 20 * lv * lv; } catch (e) { return 20 * lv * lv; } }

  var D = load();
  function freshDay() {
    D = { date: todayKey(), albaBase: getAlba(), prog: { login: 1 }, claimed: {} };
    save();
  }
  function ensureDay() {
    if (!D || D.date !== todayKey()) { freshDay(); return true; }
    D.prog = D.prog || {}; D.claimed = D.claimed || {};
    if (typeof D.albaBase !== 'number') D.albaBase = getAlba();
    if (!D.prog.login) D.prog.login = 1;
    return false;
  }

  // ───────── 진행도 ─────────
  function progOf(q) {
    if (q.id === 'alba') return Math.max(0, getAlba() - D.albaBase);
    return D.prog[q.id] || 0;
  }
  function isDone(q) { return progOf(q) >= q.need; }
  function allClaimed() { return QUESTS.every(function (q) { return !!D.claimed[q.id]; }); }
  function bonusReady() { return allClaimed() && !D.claimed.bonus; }

  function totalExp() {
    return Math.max(MIN_TOTAL_EXP, Math.round(reqExp(plv()) * expMultiplier(plv()) / 10) * 10);
  }
  function expOf(q) { return Math.round(totalExp() * q.w); }

  // ───────── 보상 지급 ─────────
  function toast(msg) {
    try { if (typeof showBagToast === 'function') showBagToast(msg); } catch (e) {}
  }
  function giveReward(def) {
    var exp = expOf(def);
    try {
      coins += def.coins;
      if (typeof saveAll === 'function') saveAll();
      if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
    } catch (e) {}
    try { if (typeof addPlayerExp === 'function') addPlayerExp(exp); } catch (e) {}
    return exp;
  }
  function claim(id) {
    ensureDay();
    if (D.claimed[id]) return false;
    var def = null, i;
    if (id === 'bonus') { if (!bonusReady()) return false; def = BONUS; }
    else { for (i = 0; i < QUESTS.length; i++) if (QUESTS[i].id === id) def = QUESTS[i]; if (!def || !isDone(def)) return false; }
    D.claimed[id] = 1; save();            // 먼저 기록 → 중복 수령 방지
    var exp = giveReward(def);
    toast('📅 ' + def.title + ' 완료! 🍔+' + def.coins + ' ⭐+' + exp);
    render();
    return true;
  }
  function claimAll() {
    ensureDay();
    var got = 0, coinSum = 0, expSum = 0;
    QUESTS.forEach(function (q) {
      if (!D.claimed[q.id] && isDone(q)) {
        D.claimed[q.id] = 1; save();
        coinSum += q.coins; expSum += giveReward(q); got++;
      }
    });
    if (bonusReady()) { D.claimed.bonus = 1; save(); coinSum += BONUS.coins; expSum += giveReward(BONUS); got++; }
    if (got) toast('📅 일일퀘스트 ' + got + '개 완료! 🍔+' + coinSum + ' ⭐+' + expSum);
    render();
  }
  function claimableCount() {
    var n = QUESTS.filter(function (q) { return !D.claimed[q.id] && isDone(q); }).length;
    if (bonusReady()) n++;
    return n;
  }

  // ───────── 첫 사용 감지 후킹 (원래 함수는 그대로 실행) ─────────
  function hookLater(name, factory) {
    (function tryHook() {
      if (typeof window[name] !== 'function') { setTimeout(tryHook, 100); return; }
      var orig = window[name];
      if (orig.__dqHooked) return;
      var wrapped = factory(orig);
      wrapped.__dqHooked = true;
      window[name] = wrapped;
    })();
  }
  // 후킹(hook)과 상태 감시(watch) 두 방식으로 세는데, 같은 행동이 두 번 세지지 않게 4초 안엔 한 번만 인정
  var lastBump = {};
  function bump(id, n, src) {
    var now = Date.now();
    if (src === 'watch' && lastBump[id] && now - lastBump[id] < 4000) return;
    lastBump[id] = now;
    ensureDay();
    D.prog[id] = (D.prog[id] || 0) + (n || 1);
    save();
  }
  function giftQty() {
    var n = 0;
    try { bagItems.forEach(function (i) { n += i.qty || 0; }); } catch (e) {}
    try { Object.keys(inventory).forEach(function (k) { n += inventory[k] || 0; }); } catch (e) {}
    return n;
  }
  function staminaNow() { try { return typeof stamina !== 'undefined' ? stamina : 0; } catch (e) { return 0; } }

  // 탐험: 스태미나가 줄었거나 탐험 화면이 떴을 때만 1회로 인정 (스태미나 부족으로 막힌 경우 제외)
  hookLater('startExplore', function (orig) {
    return function () {
      var before = staminaNow();
      var r = orig.apply(this, arguments);
      try { if (staminaNow() < before || document.getElementById('explore-overlay')) bump('explore'); } catch (e) {}
      return r;
    };
  });
  hookLater('startFishing', function (orig) {
    return function () {
      var r = orig.apply(this, arguments);
      try { bump('explore'); } catch (e) {}
      return r;
    };
  });
  hookLater('startSpecialExplore', function (orig) {
    return function () {
      var before = staminaNow();
      var r = orig.apply(this, arguments);
      try { if (staminaNow() < before) bump('explore'); } catch (e) {}
      return r;
    };
  });
  // 선물: 가방/인벤토리 개수가 실제로 줄었을 때만 인정
  hookLater('giveGift', function (orig) {
    return function () {
      var before = giftQty();
      var r = orig.apply(this, arguments);
      try { if (giftQty() < before) bump('gift'); } catch (e) {}
      return r;
    };
  });
  // 학교: 미니게임 결과 화면이 뜰 때 1회
  hookLater('showSchoolResult', function (orig) {
    return function () {
      var r = orig.apply(this, arguments);
      try { bump('school'); } catch (e) {}
      return r;
    };
  });

  // ───────── 상태 감시 (함수 이름이 바뀌거나 후킹이 덮어씌워져도 세어지게 하는 보조 장치) ─────────
  // 스태미나가 줄면 = 스케줄(탐험/낚시/팬덤 원정) 1번, 선물 개수가 줄면 = 선물 1번, 학교 재화/기록이 바뀌면 = 학교 1번
  function giftOnlyQty() {
    var n = 0;
    try { bagItems.forEach(function (i) { if (i.type === 'gift') n += i.qty || 0; }); } catch (e) {}
    try { Object.keys(inventory).forEach(function (k) { n += inventory[k] || 0; }); } catch (e) {}
    return n;
  }
  function schoolSig() {
    var s = '';
    try { s += String(honorFragments) + '|' + String(honorStars) + '|'; } catch (e) {}
    try { s += localStorage.getItem('ph_schoolDaily') || ''; } catch (e) {}
    return s;
  }
  var W = null;
  function watchTick() {
    var cur = { st: staminaNow(), gf: giftOnlyQty(), sc: schoolSig() };
    if (W) {
      if (cur.st < W.st) bump('explore', 1, 'watch');
      if (cur.gf < W.gf) bump('gift', 1, 'watch');
      if (cur.sc !== W.sc) bump('school', 1, 'watch');
    }
    W = cur;
  }
  setTimeout(function () { watchTick(); setInterval(watchTick, 1000); }, 3000);

  // ───────── 화면 ─────────
  function ensureStyle() {
    if (document.getElementById('dq-style')) return;
    var st = document.createElement('style');
    st.id = 'dq-style';
    st.textContent =
      '.dq-card{margin:8px 14px;background:#fff;border:2px solid #000;border-radius:14px;padding:10px 12px;font-family:"Noto Sans KR",sans-serif;}' +
      '.dq-top{display:flex;align-items:center;justify-content:space-between;gap:8px;}' +
      '.dq-label{font-size:12px;font-weight:900;color:#e11d48;}' +
      '.dq-sub{font-size:11px;color:#666;margin-top:2px;}' +
      '.dq-btn{padding:7px 12px;border:none;border-radius:10px;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#1a1a2e;font-size:12px;font-weight:900;cursor:pointer;font-family:inherit;white-space:nowrap;}' +
      '.dq-btn[disabled]{background:#e5e7eb;color:#9ca3af;cursor:default;}' +
      '.dq-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid #eee;}' +
      '.dq-row:first-of-type{border-top:none;}' +
      '.dq-ico{font-size:20px;width:26px;text-align:center;}' +
      '.dq-mid{flex:1;min-width:0;}' +
      '.dq-title{font-size:13px;font-weight:900;color:#111;}' +
      '.dq-desc{font-size:11px;color:#666;}' +
      '.dq-rw{font-size:10px;color:#b45309;font-weight:900;margin-top:1px;}' +
      '.dq-bar{height:4px;background:#eee;border-radius:2px;overflow:hidden;margin-top:3px;}' +
      '.dq-bar>div{height:100%;background:linear-gradient(90deg,#FF6B9D,#C084FC);}' +
      '.dq-done{opacity:.5;}';
    document.head.appendChild(st);
  }

  function doneCount() { return QUESTS.filter(function (q) { return !!D.claimed[q.id]; }).length; }

  function homeHtml() {
    var n = claimableCount();
    return '<div class="dq-top"><div><div class="dq-label">📅 일일퀘스트 ' + doneCount() + '/' + QUESTS.length + '</div>' +
      '<div class="dq-sub">' + (n ? '받을 보상이 ' + n + '개 있어요!' : (allClaimed() && D.claimed.bonus ? '오늘 보상 전부 수령 완료 ✨' : '퀘스트 탭에서 확인하세요 (자정 초기화)')) + '</div></div>' +
      '<button class="dq-btn" data-dq-all="1"' + (n ? '' : ' disabled') + '>' + (n ? '모두 받기 🎁' : '받을 것 없음') + '</button></div>';
  }

  function listHtml() {
    var h = '<div class="dq-top" style="margin-bottom:4px;"><div class="dq-label">📅 일일퀘스트 (매일 자정 초기화)</div>' +
      '<button class="dq-btn" data-dq-all="1"' + (claimableCount() ? '' : ' disabled') + '>모두 받기</button></div>';
    QUESTS.forEach(function (q) {
      var p = Math.min(q.need, progOf(q)), got = !!D.claimed[q.id], ready = !got && isDone(q);
      h += '<div class="dq-row' + (got ? ' dq-done' : '') + '"><div class="dq-ico">' + q.icon + '</div><div class="dq-mid">' +
        '<div class="dq-title">' + q.title + ' <span style="font-size:11px;color:#888;">(' + p + '/' + q.need + ')</span></div>' +
        '<div class="dq-desc">' + q.desc + '</div>' +
        '<div class="dq-rw">⭐ +' + expOf(q) + ' EXP · 🍔 +' + q.coins + '</div>' +
        '<div class="dq-bar"><div style="width:' + Math.round(p / q.need * 100) + '%"></div></div></div>' +
        '<button class="dq-btn" data-dq-id="' + q.id + '"' + (ready ? '' : ' disabled') + '>' + (got ? '완료' : (ready ? '받기' : '진행중')) + '</button></div>';
    });
    var bGot = !!D.claimed.bonus;
    h += '<div class="dq-row' + (bGot ? ' dq-done' : '') + '"><div class="dq-ico">' + BONUS.icon + '</div><div class="dq-mid">' +
      '<div class="dq-title">' + BONUS.title + '</div><div class="dq-desc">' + BONUS.desc + '</div>' +
      '<div class="dq-rw">⭐ +' + expOf(BONUS) + ' EXP · 🍔 +' + BONUS.coins + '</div></div>' +
      '<button class="dq-btn" data-dq-id="bonus"' + (bonusReady() ? '' : ' disabled') + '>' + (bGot ? '완료' : (bonusReady() ? '받기' : '잠김')) + '</button></div>';
    return h;
  }

  function bind(card) {
    var all = card.querySelectorAll('[data-dq-all]');
    for (var i = 0; i < all.length; i++) all[i].onclick = function (e) { if (e) e.stopPropagation(); claimAll(); };
    var one = card.querySelectorAll('[data-dq-id]');
    for (var j = 0; j < one.length; j++) one[j].onclick = function (e) { if (e) e.stopPropagation(); claim(this.getAttribute('data-dq-id')); };
  }

  var lastSig = '';
  function signature() {
    return [D.date, claimableCount(), doneCount(), D.claimed.bonus ? 1 : 0, plv()]
      .concat(QUESTS.map(progOf)).join('|');
  }

  function render() {
    ensureStyle();
    ensureDay();
    lastSig = signature();

    // 홈 카드 (길잡이 카드 바로 아래, 없으면 .home-actions 앞)
    var home = document.getElementById('screen-home');
    if (home) {
      var hc = document.getElementById('dq-home-card');
      if (!hc) {
        hc = document.createElement('div');
        hc.id = 'dq-home-card';
        hc.className = 'dq-card';
        var guide = document.getElementById('qg-home-card');
        var actions = home.querySelector('.home-actions');
        if (guide && guide.parentNode === home) home.insertBefore(hc, guide.nextSibling);
        else if (actions) home.insertBefore(hc, actions);
        else home.appendChild(hc);
      }
      hc.innerHTML = homeHtml();
      bind(hc);
    }

    // 퀘스트 탭 카드 (맨 위)
    var list = document.getElementById('quest-list');
    if (list) {
      var qc = document.getElementById('dq-quest-card');
      if (!qc) {
        qc = document.createElement('div');
        qc.id = 'dq-quest-card';
        qc.className = 'dq-card';
        qc.style.margin = '0 0 12px';
        list.insertBefore(qc, list.firstChild);
      }
      qc.innerHTML = listHtml();
      bind(qc);
    }
  }

  hookLater('renderQuestList', function (orig) {
    return function () {
      var r = orig.apply(this, arguments);
      var o = document.getElementById('dq-quest-card'); if (o) o.remove();
      render();
      return r;
    };
  });
  hookLater('goTo', function (orig) {
    return function () {
      var r = orig.apply(this, arguments);
      setTimeout(render, 40);
      return r;
    };
  });

  // 진행도 변화 / 자정 넘김 감지 (가벼운 주기 체크)
  setInterval(function () {
    try {
      var rolled = ensureDay();
      if (rolled || signature() !== lastSig) render();
    } catch (e) {}
  }, 1500);

  window.__dailyQuest = { claim: claim, claimAll: claimAll, bump: bump, watch: watchTick };
  ensureDay();
  setTimeout(render, 1000);
  setTimeout(render, 2200);
})();
