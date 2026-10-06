// ════════════════════════════════
// 🧭 길잡이 (튜토리얼 가이드) — game.js / index.html 건드리지 않는 별도 모듈
// 다음에 할 일 1개를 항상 보여주고 [가기] 버튼으로 바로 이동시킴.
// 홈 화면(배너 아래) + 퀘스트 화면 맨 위에 카드로 표시됨.
// 등록: loader.js 의 NEW_CONTENT_FILES 에 'quest-guide.js' (이미 있음 — 이 파일로 통째 교체)
// v2: 기획사 이후 단계(CF·팬카페·히든카드·팬덤 원정·강화·프리미엄·초월) 추가
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
  function J(key, def) {
    try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return (v === null || v === undefined) ? def : v; } catch (e) { return def; }
  }
  function keys(o) { try { return Object.keys(o || {}); } catch (e) { return []; } }

  // ── 진행 상황 읽기 (각 기능 파일이 저장해 둔 값을 직접 읽음) ──
  function debutCount() {
    var d = (J('ph_agency', {}) || {}).done || {};
    return keys(d).filter(function (k) { return d[k]; }).length;
  }
  function cfDone() {
    var c = J('ph_cf', {}) || {};
    return (c.posters && c.posters.length > 0) || keys(c.charDone).length > 0;
  }
  function fancafeOpened() { return keys((J('ph_fancafe', {}) || {}).idols).length > 0; }
  function hiddenCount() { try { return typeof ownedHiddenCards !== 'undefined' ? ownedHiddenCards.length : 0; } catch (e) { return 0; } }
  function enhLevels() { return (J('ph_enhance', {}) || {}).level || {}; }
  function enhStages() { return (J('ph_enhance', {}) || {}).stage || {}; }
  function anyEnhanced() { var l = enhLevels(); return keys(l).some(function (k) { return l[k] > 0; }); }
  function anyTranscended() { var s = enhStages(); return keys(s).some(function (k) { return s[k] > 0; }); }
  function premiumOwned() {
    var d = J('ph_premiumCards', {}) || {};
    return keys(d).filter(function (k) { return d[k] && d[k].lv >= 1; }).length;
  }
  function goodsCrafted() { return !!(J('ph_goods_flags', {}) || {}).crafted; }
  function mysterySeen() { try { return localStorage.getItem('ph_mystery_seen') === '1'; } catch (e) { return false; } }

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
      hint: '🚐 스케줄 가기 → 촬영 세트장·뷰티 살롱·공원에서 재료를 모아요. 🏞️ 동쪽 호수에선 진짜 낚시도 할 수 있어요!',
      done: function () { return story('story_10') || !!S.flags.first_explore || hiLv() >= 3; },
      go: function () { goTo('map'); }, target: '.btn-collection' },
    { id: 'school', icon: '🏫', title: '아이돌 학교 보내기',
      hint: '맵 → 🏫 연성고등학교. 학교 미니게임을 하면 아이돌(포카) 경험치가 올라요. 포카 레벨이 오르면 새 기능이 열려요!',
      done: function () { return story('story_07') || hiLv() >= 2; },
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
    { id: 'mystery', icon: '🏝️', title: '신비의 섬 들어가기',
      hint: '인연에서 아무 아이돌이나 친절 Lv.3을 만들면 맵의 ✨ 신비의 섬이 열려요. 선물을 꾸준히 주면 금방 올라요!',
      done: function () { return mysterySeen() || quest('main_mystery'); }, reward: 300,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'lv10', icon: '⭐', title: '플레이어 레벨 10 달성하기',
      hint: '플레이어 레벨 10이 되면 🎤 기획사(데뷔)가 열려요. 알바·탐험·퀘스트로 경험치를 모아요!',
      done: function () { try { return playerLevel >= 10; } catch (e) { return false; } },
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'agency', icon: '🎤', title: '기획사에서 데뷔 도전하기',
      hint: '맵 → 광장 → 🎤 기획사. 촬영 세트장·뷰티 살롱·공원 재료 6개씩 + 코인 2000이 필요해요. 데뷔하면 시간마다 코인이 쌓여요!',
      done: function () { return !!S.flags.first_agency || debutCount() >= 1; }, reward: 300,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'cf', icon: '🎬', title: '데뷔한 아이돌 CF 찍기',
      hint: '맵 → 광장 → 🎬 CF 촬영. 매일 새 의뢰가 3개 올라와요. 포스터가 쌓일수록 팬카페가 들썩여요!',
      done: function () { return cfDone(); }, reward: 400,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'drama', icon: '🎥', title: '드라마 촬영 해보기',
      hint: '맵 → 광장 → 🎥 드라마 촬영. 대본·감독·아이돌 카드를 고르고 촬영! 연기 스킬이 드랍되고, 스킬 슬롯 확장권도 나와요.',
      done: function () { return (J('ph_drama', {}) || {}).shoots > 0; }, reward: 400,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'fancafe', icon: '☕', title: '팬카페 열어보기',
      hint: '맵 → 🏘️ 연습생 숙소촌 → ☕ 팬카페. 처음엔 회원이 나 혼자뿐이에요. CF가 터지면 팬들이 하나둘 들어와요!',
      done: function () { return fancafeOpened(); }, reward: 400,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'hidden', icon: '🌟', title: '히든카드 얻기',
      hint: '더보기 → 🔮 카드 재조합기에서 히든카드에 도전! 실패가 쌓일수록 확률이 오르고, 30번째엔 확정이에요.',
      done: function () { return hiddenCount() >= 1; }, reward: 500,
      go: function () { if (typeof openRecombine === 'function') openRecombine(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'expedition', icon: '🚌', title: '팬덤 원정 떠나기',
      hint: '🚐 스케줄 가기 → 🎬 팬덤 원정 → 방송국 앞. 현장을 돌아다니며 🖼️ 프리미엄 조각과 강화석을 모아요. 스태미나는 드링크로 채워요!',
      done: function () { return !!S.flags.first_expedition; }, reward: 500,
      go: function () { goTo('map'); }, target: '.btn-collection' },
    { id: 'goods', icon: '🎁', title: '굿즈 만들어서 장착하기',
      hint: '맵 → 🛍️ 상점거리 → 🎁 굿즈 공방. 재료 + 코인으로 굿즈를 만들면 능력치가 랜덤으로 붙어요(실패할 수도!). 만든 굿즈를 캐릭터 카드 옆 칸에 장착해 보세요.',
      done: function () { return goodsCrafted(); }, reward: 500,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'enhance', icon: '⚒️', title: '히든카드 강화하기',
      hint: '더보기 → 🎤 트레이닝룸. 히든카드 + 강화석 + 코인으로 강화하면 데뷔 수익이 확 올라요. 높은 단계는 실패하면 카드가 사라질 수 있으니 방지권을 챙기세요!',
      done: function () { return anyEnhanced() || !!S.flags.first_enhance; }, reward: 800,
      go: function () { if (typeof openEnhance === 'function') openEnhance(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'premium', icon: '💎', title: '프리미엄 카드 받기',
      hint: '팬덤 원정에서 🖼️ 프리미엄 조각 100개를 모아 더보기 → 💎 프리미엄 카드에서 교환! 연예인 활동을 도와주는 능력치 카드예요.',
      done: function () { return premiumOwned() >= 1; }, reward: 1000,
      go: function () { goTo('map'); }, target: '.btn-collection' },
    { id: 'alldebut', icon: '👑', title: '멤버 6명 모두 데뷔시키기',
      hint: '민준·시온·도윤·하린·윤아·아라 전원 데뷔! 멤버가 늘수록 정산 수익도 늘어요. 맵 → 광장 → 🎤 기획사.',
      done: function () { return debutCount() >= 6; }, reward: 2000,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'transcend', icon: '🌠', title: '히든카드 초월하기',
      hint: '히든카드를 10강까지 올린 뒤 트레이닝룸에서 초월! 같은 멤버 여분 카드 + 초월석이 필요해요. 여기부터는 진짜 엔드 콘텐츠예요.',
      done: function () { return anyTranscended(); }, reward: 3000,
      go: function () { if (typeof openEnhance === 'function') openEnhance(); else goTo('home'); }, target: '#nav-shop' },
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
      flag('first_explore');
      if (id === 'lake') flag('first_fishing');
      return r;
    };
  });
  hookLater('startFishing', function (orig) {
    return function () {
      var r = orig.apply(this, arguments);
      flag('first_fishing');
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
  hookLater('startSpecialExplore', function (orig) {
    return function () {
      var r = orig.apply(this, arguments);
      flag('first_expedition');
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
    // 강화·초월 등 감지된 첫 체험은 기록해 둠 (나중에 카드가 사라져도 완료 유지)
    if (anyEnhanced()) flag('first_enhance');
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
