// ════════════════════════════════
// 🧭 길잡이 (튜토리얼 가이드) — game.js / index.html 건드리지 않는 별도 모듈
// 신규 유저가 "뭐부터 해야 하지?" 하지 않게, 다음에 할 일 1개를 항상 보여주고 [가기] 버튼으로 바로 이동시킴.
// 홈 화면(배너 아래) + 퀘스트 화면 맨 위에 카드로 표시됨.
// 등록: loader.js 의 NEW_CONTENT_FILES 맨 끝에 'quest-guide.js' 한 줄 추가
// ════════════════════════════════
(function () {
  var KEY = 'ph_guide';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  var S = load(); // { flags:{}, rewarded:{}, off:false }
  S.flags = S.flags || {};
  S.rewarded = S.rewarded || {};

  function flag(name) { if (!S.flags[name]) { S.flags[name] = 1; save(S); } }
  function story(id) { try { return typeof storyProgress !== 'undefined' && storyProgress[id] === 'done'; } catch (e) { return false; } }
  function quest(id) { try { return typeof questProgress !== 'undefined' && questProgress[id] === 'done'; } catch (e) { return false; } }
  function hiLv() { try { return typeof getHighestCardLevel === 'function' ? getHighestCardLevel() : 1; } catch (e) { return 1; } }

  // ── 단계 정의 (순서대로 진행) ──
  // done(): 완료 판정 / go(): [가기] 눌렀을 때 이동 / target: 홈에서 반짝일 버튼
  var STEPS = [
    { id: 'alba', icon: '🍔', title: '알바로 첫 코인 벌기',
      hint: '주머니가 텅 비었어요. 🍔 알바하기 → 포카버거나 카페에서 게이지가 가운데 구간에 올 때 화면을 탭!',
      done: function () { try { return albaDone > 0 || quest('tut_alba') || story('story_04'); } catch (e) { return false; } },
      go: function () { goTo('alba'); }, target: '.btn-alba' },
    { id: 'gacha', icon: '✨', title: '카드 1장 뽑기',
      hint: '번 코인으로 ✨ 카드 뽑기! 카드가 있어야 아이돌이 생겨요. 코인이 모자라면 알바 한 번 더.',
      done: function () { try { return owned.length >= 1 || quest('tut_gacha') || story('story_05'); } catch (e) { return false; } },
      go: function () { goTo('gacha'); }, target: '.btn-gacha' },
    { id: 'meet', icon: '💞', title: '아이돌 만나보기',
      hint: '아래 메뉴 💞 인연 → 뽑은 아이돌을 눌러 대화해 보세요. 선물도 줄 수 있어요.',
      done: function () { return quest('tut_meet') || story('story_06'); },
      go: function () { goTo('bond'); }, target: '#nav-bond' },
    { id: 'explore', icon: '🚐', title: '스케줄 나가서 재료 모으기',
      hint: '🚐 스케줄 가기 → 장소를 골라 재료를 모아요. 🌊 동쪽 호수에선 진짜 낚시도 할 수 있어요!',
      done: function () { return story('story_10'); },
      go: function () { goTo('map'); }, target: '.btn-collection' },
    { id: 'school', icon: '🏫', title: '아이돌 학교 보내기',
      hint: '맵 → 🏫 연성고등학교. 학교 미니게임을 하면 아이돌(포카) 경험치가 올라요. 포카 레벨이 오르면 새 기능이 열려요!',
      done: function () { return story('story_07'); },
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'lv3', icon: '🏠', title: '포카 레벨 3 만들기',
      hint: '학교·알바·탐험으로 포카 경험치를 모아 레벨 3을 찍으면 방 꾸미기가 열려요.',
      done: function () { return hiLv() >= 3; },
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'recombine', icon: '🔮', title: '카드 재조합 해보기',
      hint: '아래 ⋯ 더보기 → 🔮 카드 재조합기. 겹치는 카드 2장 + 재료로 더 높은 등급을 노려봐요. (재료는 탐험에서!)',
      done: function () { return !!S.flags.first_recombine; }, reward: 200,
      go: function () { if (typeof openRecombine === 'function') openRecombine(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'fishing', icon: '🎣', title: '호수에서 낚시하기',
      hint: '맵 → 동쪽 호수 → 낚시하기. 물고기가 다가오면 탭해서 낚싯대를 던져요. 잡은 건 재료로 쓰거나 팔 수 있어요.',
      done: function () { return !!S.flags.first_fishing; }, reward: 200,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'lv10', icon: '⭐', title: '포카 레벨 10 달성하기',
      hint: '레벨 10이 되면 🎤 기획사(데뷔)와 가구상점이 열려요. 학교·알바·탐험을 꾸준히!',
      done: function () { return hiLv() >= 10; },
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'agency', icon: '🎤', title: '기획사에서 데뷔 도전하기',
      hint: '맵 → 광장 → 🎤 기획사. 아이돌을 데뷔시키면 코인·CF·드라마·노래 스케줄이 열려요!',
      done: function () { return !!S.flags.first_agency; }, reward: 300,
      go: function () { goTo('map'); }, target: '#nav-map' },
  ];

  function currentIndex() {
    for (var i = 0; i < STEPS.length; i++) { if (!STEPS[i].done()) return i; }
    return -1;
  }

  // ── 새 기능 첫 사용 감지용 후킹 (원래 함수는 그대로 실행) ──
  function hookLater(name, wrapperFactory) {
    (function tryHook() {
      if (typeof window[name] !== 'function') { setTimeout(tryHook, 80); return; }
      var orig = window[name];
      if (orig.__qgHooked) return;
      var wrapped = wrapperFactory(orig);
      wrapped.__qgHooked = true;
      window[name] = wrapped;
    })();
  }

  hookLater('doRecombine', function (orig) {
    return function () {
      var ok = true;
      try { if (typeof canDoRecombine === 'function') ok = !!canDoRecombine(); } catch (e) {}
      var r = orig.apply(this, arguments);
      if (ok) flag('first_recombine');
      return r;
    };
  });
  hookLater('explorePlace', function (orig) {
    return function (id) {
      var r = orig.apply(this, arguments);
      if (id === 'lake') flag('first_fishing');
      return r;
    };
  });
  hookLater('openAgency', function (orig) {
    return function () {
      var r = orig.apply(this, arguments);
      try {
        if (typeof isPocaHouseFeatureUnlocked !== 'function' || isPocaHouseFeatureUnlocked('agency')) flag('first_agency');
      } catch (e) {}
      return r;
    };
  });

  // ── 보상 (새 기능 첫 체험 보너스, 1회만) ──
  function giveRewards() {
    STEPS.forEach(function (st) {
      if (!st.reward || S.rewarded[st.id] || !st.done()) return;
      S.rewarded[st.id] = 1; save(S);
      try {
        coins += st.reward;
        if (typeof saveAll === 'function') saveAll();
        if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
        if (typeof showBagToast === 'function') showBagToast('🧭 ' + st.title + ' 완료! 🍔+' + st.reward);
      } catch (e) {}
    });
  }

  // ── 스타일 ──
  function ensureStyle() {
    if (document.getElementById('qg-style')) return;
    var st = document.createElement('style');
    st.id = 'qg-style';
    st.textContent =
      '@keyframes qgPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,215,0,.85)}50%{box-shadow:0 0 0 7px rgba(255,215,0,0)}}' +
      '.qg-pulse{animation:qgPulse 1.3s ease-in-out infinite !important;outline:2px solid #FFD700;outline-offset:1px;}' +
      '.qg-card{margin:8px 14px;background:#fff;border:2px solid #000;border-radius:14px;padding:10px 12px;font-family:"Noto Sans KR",sans-serif;}' +
      '.qg-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}' +
      '.qg-label{font-size:10px;font-weight:900;color:#9333ea;letter-spacing:1px;}' +
      '.qg-prog{font-size:10px;font-weight:900;color:#888;}' +
      '.qg-title{font-size:14px;font-weight:900;color:#111;margin-bottom:3px;}' +
      '.qg-hint{font-size:12px;color:#333;line-height:1.5;margin-bottom:8px;}' +
      '.qg-go{width:100%;padding:9px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:900;cursor:pointer;font-family:inherit;}' +
      '.qg-bar{height:5px;background:#eee;border-radius:3px;overflow:hidden;margin-bottom:6px;}' +
      '.qg-bar>div{height:100%;background:linear-gradient(90deg,#FFD700,#F59E0B);}';
    document.head.appendChild(st);
  }

  function cardHtml(idx) {
    var st = STEPS[idx];
    var pct = Math.round((idx / STEPS.length) * 100);
    return '<div class="qg-top"><span class="qg-label">🧭 다음 할 일</span><span class="qg-prog">' + idx + ' / ' + STEPS.length + '</span></div>' +
      '<div class="qg-bar"><div style="width:' + pct + '%"></div></div>' +
      '<div class="qg-title">' + st.icon + ' ' + st.title + (st.reward ? ' <span style="font-size:11px;color:#F59E0B;">🍔+' + st.reward + '</span>' : '') + '</div>' +
      '<div class="qg-hint">' + st.hint + '</div>' +
      '<button class="qg-go" data-qg-go="1">가기 👉</button>';
  }

  function bindGo(card) {
    var b = card.querySelector('[data-qg-go]');
    if (b) b.onclick = function () {
      var i = currentIndex();
      if (i >= 0) { try { STEPS[i].go(); } catch (e) {} }
    };
  }

  function clearPulse() {
    var els = document.querySelectorAll('.qg-pulse');
    for (var i = 0; i < els.length; i++) els[i].classList.remove('qg-pulse');
  }

  function render() {
    ensureStyle();
    giveRewards();
    var idx = currentIndex();
    clearPulse();

    // 홈 카드
    var home = document.getElementById('screen-home');
    var old = document.getElementById('qg-home-card');
    if (home) {
      if (idx < 0) { if (old) old.remove(); }
      else {
        if (!old) {
          old = document.createElement('div');
          old.id = 'qg-home-card';
          old.className = 'qg-card';
          var actions = home.querySelector('.home-actions');
          if (actions) home.insertBefore(old, actions); else home.appendChild(old);
        }
        old.innerHTML = cardHtml(idx);
        bindGo(old);
        if (home.classList.contains('active')) {
          var t = document.querySelector(STEPS[idx].target);
          if (t) t.classList.add('qg-pulse');
        }
      }
    }

    // 퀘스트 화면 카드
    var list = document.getElementById('quest-list');
    var oldQ = document.getElementById('qg-quest-card');
    if (list) {
      if (idx < 0) { if (oldQ) oldQ.remove(); }
      else {
        if (!oldQ) {
          oldQ = document.createElement('div');
          oldQ.id = 'qg-quest-card';
          oldQ.className = 'qg-card';
          oldQ.style.margin = '0 0 12px';
          list.insertBefore(oldQ, list.firstChild);
        }
        oldQ.innerHTML = cardHtml(idx);
        bindGo(oldQ);
      }
    }
  }

  // 화면 이동 / 퀘스트 목록 갱신 때마다 다시 그리기
  hookLater('goTo', function (orig) {
    return function () {
      var r = orig.apply(this, arguments);
      setTimeout(render, 30);
      return r;
    };
  });
  hookLater('renderQuestList', function (orig) {
    return function () {
      var r = orig.apply(this, arguments);
      var o = document.getElementById('qg-quest-card'); if (o) o.remove();
      render();
      return r;
    };
  });

  // 진행 상황(코인 벌기·레벨업 등) 자동 감지 — 가벼운 주기 체크
  var lastIdx = -2;
  setInterval(function () {
    var i = currentIndex();
    if (i !== lastIdx) { lastIdx = i; render(); }
  }, 1500);

  setTimeout(render, 900);
  setTimeout(render, 1800);
})();
