// ════════════════════════════════
// ✨ 신비의 섬 탐험 + 🌟 소원의 샘 (mystery-explore.js)
// startExplore('mystery')만 새 방식으로 바꾼다. 다른 지역 탐험은 그대로.
//
// 흐름
//   1) 탐험(3초, 스태미나 15): 재료는 기존처럼 탭해서 줍기. 소원의 조각은 여기서 더 이상 안 나옴.
//      대신 💛 반딧불이 판마다 2~4개 나옴 (탭하면 바로 줍고, 안 눌러도 끝날 때 자동으로 모임)
//   2) 🌟 소원의 샘: 반딧불을 던지면 확률로 소원의 조각 1개. 실패가 쌓이면 확률이 오르고,
//      연속 4번 실패하면 다음 던지기는 확정 (재조합기 천장과 같은 방식)
//
// 기존 recombine.js가 신비의 섬에 얹어둔 효과(스태미나 15, 에픽 재조합석 3%, 희귀재료 보너스 15%)도
// 이 파일에서 그대로 처리한다.
//
// 반딧불은 가방에 '반딧불' 아이템으로 쌓인다 (가방 데이터라 클라우드 저장에도 같이 들어감).
// 값을 바꾸고 싶으면 아래 설정만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var STAMINA_COST = 15;        // 기존 신비의 섬과 동일
  var SESSION_MS = 5000;        // 탐험 시간 (기존과 동일 3초)
  var FIREFLY_MIN = 2;          // 판당 반딧불 (2~4개, 가운데 값이 제일 잘 나옴)
  var FIREFLY_MAX = 4;
  var NORMAL_STONE = 0.25;      // 일반 재조합석 (다른 일반 탐험지와 같음)
  var EPIC_STONE = 0.03;        // 에픽 재조합석 (기존 신비의 섬과 동일)
  var RARE_BONUS = 0.15;        // 희귀재료 추가 지급 (기존 신비의 섬과 동일)

  var SPRING_COST = 20;         // 샘에 한 번 던질 때 드는 반딧불
  var SPRING_BASE = 0.35;       // 기본 성공 확률
  var SPRING_STEP = 0.15;       // 실패할 때마다 오르는 확률
  var SPRING_WISH_MULT = 10;    // 굿즈 '소원의 조각 확률' 1%p당 샘 성공 확률 +10%p
  var SPRING_PITY = 4;          // 연속 이만큼 실패하면 다음 던지기는 확정
  var FAIL_KEY = 'ph_spring_fails';

  var FF_NAME = '반딧불';
  var FF_EMOJI = '💛';
  var running = false;

  // ════════ 순수 로직 ════════
  function pickFireflyCount(rng) {
    rng = rng || Math.random;
    var span = FIREFLY_MAX - FIREFLY_MIN;       // 2,3,4 → 30% / 40% / 30%
    var r = rng();
    if (span <= 0) return FIREFLY_MIN;
    var mid = FIREFLY_MIN + Math.floor(span / 2);
    if (r < 0.3) return FIREFLY_MIN;
    if (r < 0.7) return mid;
    return FIREFLY_MAX;
  }

  function springChance(fails) {
    if (fails >= SPRING_PITY) return 1;
    return Math.min(0.95, SPRING_BASE + SPRING_STEP * fails + springGearBonus());
  }
  // 🎁 굿즈의 '탐험 소원의 조각 확률(%p)'은 샘 성공 확률에도 적용 (×SPRING_WISH_MULT). 예: 1.5%p → +15%p
  function springGearBonus() {
    try { var w = Number(window.__goodsGear && window.__goodsGear.globalTotals().wish) || 0; return w * SPRING_WISH_MULT / 100; } catch (e) { return 0; }
  }

  function getFails() { return parseInt(localStorage.getItem(FAIL_KEY) || '0', 10) || 0; }
  function setFails(n) { localStorage.setItem(FAIL_KEY, String(n)); }

  function fireflyCount() {
    var it = (typeof bagItems !== 'undefined' ? bagItems : []).find(function (i) { return i.name === FF_NAME; });
    return it ? it.qty : 0;
  }

  // 기존 신비의 섬과 같은 방식으로 재료 하나 뽑기 (소원의 조각 판정은 뺌)
  function rollMaterial() {
    var mats = EXPLORE_MATERIALS.mystery;
    var luck = typeof getEquippedStat === 'function' ? getEquippedStat('luck') : 0;
    var rareChance = Math.min(0.80, 0.30 + luck / 100);
    var isRare = Math.random() < rareChance;
    var pool = isRare ? mats.rare : mats.normal;
    return { name: pool[Math.floor(Math.random() * pool.length)], isWish: false, isRare: isRare };
  }

  function injectStyle() {
    if (document.getElementById('mystery-style')) return;
    var st = document.createElement('style');
    st.id = 'mystery-style';
    st.textContent =
      '@keyframes myFloat{0%{transform:translate(-50%,-50%) translate(0,0)}25%{transform:translate(-50%,-50%) translate(14px,-10px)}' +
      '50%{transform:translate(-50%,-50%) translate(-8px,-18px)}75%{transform:translate(-50%,-50%) translate(-14px,-4px)}100%{transform:translate(-50%,-50%) translate(0,0)}}' +
      '@keyframes myGlow{0%,100%{opacity:.75}50%{opacity:1}}' +
      '@keyframes myThrow{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--tx),var(--ty)) scale(.3);opacity:0}}' +
      '@keyframes mySpring{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}';
    document.head.appendChild(st);
  }

  // ════════ 탐험 화면 ════════
  function startMystery() {
    if (running || document.getElementById('mystery-overlay') || document.getElementById('explore-overlay')) return;

    // 기존 startExplore가 하던 잠금/첫 방문 처리
    if (typeof isMysteryIslandUnlocked === 'function' && !isMysteryIslandUnlocked()) {
      showBagToast('✨ 신비의 섬은 아무 포카나 친절 Lv.3 달성 후 해금돼요!');
      return;
    }
    if (localStorage.getItem('ph_mystery_seen') !== '1') {
      localStorage.setItem('ph_mystery_seen', '1');
      if (typeof showMysteryUnlockPopup === 'function') {
        showMysteryUnlockPopup();
        // 첫 방문: 안내 팝업을 닫은 뒤에 탐험을 시작한다 (팝업 뒤에서 제한시간이 흘러 빈손으로 끝나던 문제)
        var pop = document.body.lastElementChild;
        running = true;
        (function waitPop() {
          if (pop && document.body.contains(pop)) { setTimeout(waitPop, 200); return; }
          running = false;
          setTimeout(startMystery, 150);
        })();
        return;
      }
    }
    if (typeof checkQuestProgress === 'function') checkQuestProgress('mystery_island_unlock');

    if (stamina < STAMINA_COST) { showBagToast('스태미나가 부족해요! ⚡ 음료를 마셔봐요 (신비의 섬은 ' + STAMINA_COST + ' 필요)'); return; }
    stamina -= STAMINA_COST;
    saveStamina();
    exploreCollected = [];
    running = true;
    injectStyle();

    var overlay = document.createElement('div');
    overlay.id = 'mystery-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:600;background:linear-gradient(rgba(13,8,32,.45),rgba(13,8,32,.72)),url(map-mystery.png) center/cover no-repeat,radial-gradient(ellipse at 50% 30%,#2d1b4e 0%,#0d0820 80%);display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:manipulation;user-select:none;-webkit-user-select:none;';

    overlay.innerHTML = '<div style="width:100%;max-width:430px;height:100%;position:relative;">' +
      '<div style="position:absolute;top:10px;left:16px;right:16px;height:8px;background:rgba(255,255,255,0.2);border-radius:4px;overflow:hidden;">' +
      '<div id="mystery-timer-fill" style="height:100%;width:100%;background:linear-gradient(90deg,#FF6B9D,#C084FC);border-radius:4px;"></div></div>' +
      '<div id="mystery-countdown" style="position:absolute;top:24px;left:50%;transform:translateX(-50%);font-size:20px;font-weight:900;color:#fff;">3</div>' +
      '<div id="mystery-area" style="position:absolute;inset:0;"></div>' +
      '<div id="mystery-ff-count" style="position:absolute;top:24px;right:16px;font-size:14px;font-weight:900;color:#FFE27A;">' + FF_EMOJI + ' 0</div>' +
      '<div id="explore-collected" style="position:absolute;bottom:20px;left:16px;right:16px;background:rgba(0,0,0,0.6);border-radius:12px;padding:10px;font-size:13px;color:#fff;text-align:center;">재료와 반딧불을 탭해서 모아봐! ✨</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var area = document.getElementById('mystery-area');
    var ffGot = 0, ffTotal = pickFireflyCount();

    // 재료 (기존과 같은 4~7개)
    var matCount = 4 + Math.floor(Math.random() * 4);
    for (var i = 0; i < matCount; i++) {
      (function (idx) {
        var item = rollMaterial();
        var el = document.createElement('div');
        el.style.cssText = 'position:absolute;left:' + (10 + Math.random() * 80) + '%;top:' + (15 + Math.random() * 65) + '%;transform:translate(-50%,-50%);font-size:32px;cursor:pointer;animation:pulse 1s infinite;filter:drop-shadow(0 0 8px #FFD700);padding:6px;';
        var mi = window.matIcon ? window.matIcon(item.name, 40, '') : '';
        if (mi) { el.innerHTML = mi; el.style.fontSize = '0'; el.style.filter = (item.isRare ? 'drop-shadow(0 0 12px #FFD700) ' : 'drop-shadow(0 0 7px #fff) ') + 'drop-shadow(0 2px 4px rgba(0,0,0,.5))'; }
        else el.textContent = '✨';
        el.onpointerdown = function (e) { e.preventDefault(); collectExploreItem(idx, item, el); };
        area.appendChild(el);
      })(i);
    }

    // 반딧불 (탭하면 바로 줍고, 안 눌러도 끝날 때 자동으로 모임)
    var orbs = [];
    function updateFfHud() {
      var h = document.getElementById('mystery-ff-count');
      if (h) h.textContent = FF_EMOJI + ' ' + ffGot;
    }
    function takeOrb(o) {
      if (o.taken) return;
      o.taken = true; ffGot++;
      o.el.style.transition = 'all 0.25s';
      o.el.style.opacity = '0';
      o.el.style.marginTop = '-30px';
      setTimeout(function () { if (o.el.parentNode) o.el.parentNode.removeChild(o.el); }, 260);
      updateFfHud();
      if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
    }
    for (var f = 0; f < ffTotal; f++) {
      var orb = document.createElement('div');
      orb.style.cssText = 'position:absolute;left:' + (12 + Math.random() * 76) + '%;top:' + (18 + Math.random() * 60) + '%;width:46px;height:46px;border-radius:50%;cursor:pointer;' +
        'background:radial-gradient(circle,#fffbe0 0%,#ffe27a 35%,rgba(255,226,122,0) 72%);' +
        'animation:myFloat ' + (1.6 + Math.random() * 1.2) + 's ease-in-out infinite,myGlow 0.9s ease-in-out infinite;filter:drop-shadow(0 0 10px #ffe27a);';
      var o = { el: orb, taken: false };
      if (window.matIcon) orb.innerHTML = window.matIcon(FF_NAME, 44, '');
      orb.onpointerdown = (function (oo) { return function (e) { e.preventDefault(); takeOrb(oo); }; })(o);
      area.appendChild(orb);
      orbs.push(o);
    }

    var t0 = Date.now();
    var timer = setInterval(function () {
      var remaining = Math.max(0, SESSION_MS - (Date.now() - t0));
      var fill = document.getElementById('mystery-timer-fill');
      var cd = document.getElementById('mystery-countdown');
      if (fill) fill.style.width = (remaining / SESSION_MS * 100) + '%';
      if (cd) cd.textContent = Math.ceil(remaining / 1000);
      if (remaining <= 0) {
        clearInterval(timer);
        orbs.forEach(function (oo) { if (!oo.taken) { oo.taken = true; ffGot++; } });   // 안 누른 반딧불 자동 수집
        finish(overlay, ffGot);
      }
    }, 100);
  }

  // ── 끝: 보상 정산 + 결과 화면 ──
  function finish(overlay, ffGot) {
    var got = [];
    (typeof exploreCollected !== 'undefined' ? exploreCollected : []).forEach(function (n) { got.push(n); });

    // 기존 recombine.js가 신비의 섬에 얹어둔 보너스들
    if (Math.random() < NORMAL_STONE) {      // 일반 재조합석 (다른 탐험지와 같은 25%)
      if (addToBag('🔹', '재조합석', 'material', 1, '카드 재조합에 필요한 재료')) got.push('🔹 재조합석');
    }
    if (Math.random() < EPIC_STONE) {
      if (addToBag('💠', '에픽 재조합석', 'material', 1, 'SSR/UR 카드 재조합에 필요한 재료')) got.push('💠 에픽 재조합석');
    }
    if (Math.random() < RARE_BONUS) {
      var rarePool = EXPLORE_MATERIALS.mystery.rare;
      var bonus = rarePool[Math.floor(Math.random() * rarePool.length)];
      if (addToBag(getMaterialEmoji(bonus), bonus, 'material', 1, '제작 재료 (신비의 섬 보너스)')) got.push(bonus);
    }

    var ffOk = false;
    if (ffGot > 0) ffOk = addToBag(FF_EMOJI, FF_NAME, 'material', ffGot, '🌟 소원의 샘(신비의 섬)에 던지면 소원의 조각을 얻을 수 있어요. 한 번에 ' + SPRING_COST + '개.');
    if (typeof saveAll === 'function') saveAll();
    running = false;

    var counts = {}, order = [];
    got.forEach(function (n) { if (!(n in counts)) { counts[n] = 0; order.push(n); } counts[n]++; });
    var list = order.length ? order.map(function (n) { return n + (counts[n] > 1 ? ' ×' + counts[n] : ''); }).join(', ') : '재료는 못 주웠어요 😢';
    var have = fireflyCount();
    var ffLine = ffOk ? (FF_EMOJI + ' 반딧불 +' + ffGot + ' (보유 ' + have + '/' + SPRING_COST + ')') : (ffGot > 0 ? '🎒 가방이 꽉 차서 반딧불을 못 담았어요!' : '');

    overlay.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.78);">' +
      '<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #C084FC;border-radius:20px;padding:24px 20px;text-align:center;width:88%;max-width:310px;">' +
      '<div style="font-size:34px;margin-bottom:4px;">✨</div>' +
      '<div style="font-size:17px;font-weight:900;color:#fff;margin-bottom:6px;">신비의 섬 탐험 완료!</div>' +
      '<div style="font-size:12px;color:#aaa;margin-bottom:8px;">스태미나 -' + STAMINA_COST + ' (잔여: ' + stamina + ')</div>' +
      '<div style="font-size:13px;color:#FFD700;line-height:1.6;margin-bottom:6px;">' + list + '</div>' +
      '<div style="font-size:14px;font-weight:900;color:#FFE27A;margin-bottom:14px;">' + ffLine + '</div>' +
      '<button id="mystery-again" style="width:100%;padding:13px;margin-bottom:8px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">✨ 한 번 더 (⚡' + STAMINA_COST + ')</button>' +
      '<button id="mystery-spring" style="width:100%;padding:12px;margin-bottom:8px;background:rgba(255,226,122,0.18);border:1.5px solid #FFE27A;border-radius:12px;color:#FFE27A;font-size:14px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">🌟 소원의 샘 (' + FF_EMOJI + ' ' + have + ')</button>' +
      '<button id="mystery-close" style="width:100%;padding:11px;background:rgba(255,255,255,0.1);border:none;border-radius:12px;color:#ccc;font-size:14px;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">확인</button>' +
      '</div></div>';
    document.getElementById('mystery-close').onclick = function () { overlay.remove(); };
    document.getElementById('mystery-again').onclick = function () { overlay.remove(); startMystery(); };
    document.getElementById('mystery-spring').onclick = function () {
      openSpring(function () {
        var sb = document.getElementById('mystery-spring');
        if (sb) sb.textContent = '🌟 소원의 샘 (' + FF_EMOJI + ' ' + fireflyCount() + ')';
      });
    };
  }

  // ════════ 🌟 소원의 샘 ════════
  var throwing = false;

  function giveWishFragment() {
    // 기존 collectExploreItem의 소원의 조각 처리와 같은 내용 (팝업만 샘 안에서 직접 보여줌)
    wishFragments++;
    localStorage.setItem('ph_wish', wishFragments);
    addToBag('🧩', '소원의 조각', 'wish', 1, '100개 모으면 소원의 결정! (현재: ' + wishFragments + '개)');
    if (typeof checkQuestProgress === 'function') checkQuestProgress('first_wish_fragment');
    if (wishFragments >= 100) {
      wishFragments = 0;
      localStorage.setItem('ph_wish', wishFragments);
      setTimeout(function () { if (typeof showWishCrystalEarned === 'function') showWishCrystalEarned(); }, 1500);
    }
    if (typeof saveAll === 'function') saveAll();
  }

  function openSpring(onClose) {
    if (document.getElementById('mystery-spring-overlay')) return;
    injectStyle();
    var ov = document.createElement('div');
    ov.id = 'mystery-spring-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:720;background:linear-gradient(rgba(0,0,0,.3),rgba(0,0,0,.6)),url(map-mystery.png) 68% 50%/cover no-repeat,#000;display:flex;align-items:center;justify-content:center;';
    document.body.appendChild(ov);
    if (!document.getElementById('spring-fx-css')) {
      var fx = document.createElement('style'); fx.id = 'spring-fx-css';
      fx.textContent = '@keyframes spFly{0%{transform:translate(0,0) scale(.6);opacity:0}15%{opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(1.1);opacity:0}}' +
        '@keyframes spBurst{0%{transform:translate(-50%,-50%) scale(.1);opacity:.95}100%{transform:translate(-50%,-50%) scale(5);opacity:0}}' +
        '@keyframes spRipple{0%{transform:translate(-50%,-50%) scale(.2);opacity:.8}100%{transform:translate(-50%,-50%) scale(3);opacity:0}}' +
        '@keyframes spUp{0%{transform:translate(0,0) scale(.5);opacity:0}20%{opacity:1}100%{transform:translate(var(--dx),-220px) scale(1.3);opacity:0}}' +
        '@keyframes spCardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}';
      document.head.appendChild(fx);
    }

    function render(msg, good) {
      var have = fireflyCount(), fails = getFails();
      var can = have >= SPRING_COST;
      var pct = Math.round(springChance(fails) * 100);
      var pity = '';
      for (var i = 0; i < SPRING_PITY; i++) pity += i < fails ? '🟡' : '⚪';
      var guaranteed = fails >= SPRING_PITY;
      ov.innerHTML = '<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FFE27A;border-radius:22px;padding:24px 20px;text-align:center;width:88%;max-width:310px;box-shadow:0 0 40px #FFE27A33;">' +
        '<div id="spring-well" style="font-size:54px;margin-bottom:4px;animation:mySpring 2.4s ease-in-out infinite;">⛲</div>' +
        '<div style="font-size:18px;font-weight:900;color:#FFE27A;margin-bottom:4px;">소원의 샘</div>' +
        '<div style="font-size:12px;color:#aaa;margin-bottom:12px;">반딧불을 던지면 소원의 조각이 나올지도 몰라요</div>' +
        '<div style="font-size:15px;font-weight:900;color:#fff;margin-bottom:4px;">' + FF_EMOJI + ' ' + have + ' <span style="font-size:12px;color:#aaa;font-weight:400;">(한 번에 ' + SPRING_COST + '개)</span></div>' +
        '<div style="font-size:13px;color:#C084FC;margin-bottom:2px;">' + (guaranteed ? '✨ 이번엔 확정이에요!' : '성공 확률 ' + pct + '%') + '</div>' +
        '<div style="font-size:15px;letter-spacing:3px;margin-bottom:10px;">' + pity + '</div>' +
        '<div id="spring-msg" style="min-height:40px;font-size:14px;font-weight:700;color:' + (good ? '#8be07a' : '#ddd') + ';line-height:1.5;margin-bottom:10px;">' + (msg || '&nbsp;') + '</div>' +
        '<button id="spring-throw" ' + (can ? '' : 'disabled') + ' style="width:100%;padding:13px;margin-bottom:8px;background:' + (can ? 'linear-gradient(135deg,#FFD700,#FF9F43)' : 'rgba(255,255,255,0.12)') + ';border:none;border-radius:12px;color:' + (can ? '#3a2200' : '#888') + ';font-size:15px;font-weight:900;cursor:' + (can ? 'pointer' : 'default') + ';font-family:\'Noto Sans KR\',sans-serif;">' + (can ? '🌟 던지기 (' + FF_EMOJI + SPRING_COST + ')' : '반딧불이 부족해요 (' + SPRING_COST + '개 필요)') + '</button>' +
        '<button id="spring-close" style="width:100%;padding:11px;background:rgba(255,255,255,0.1);border:none;border-radius:12px;color:#ccc;font-size:14px;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">닫기</button>' +
        '</div>';
      document.getElementById('spring-close').onclick = function () { ov.remove(); if (onClose) onClose(); };
      var tb = document.getElementById('spring-throw');
      if (can) tb.onclick = doThrow;
    }

    function doThrow() {
      if (throwing) return;
      if (!useFromBag(FF_NAME, SPRING_COST)) { render('반딧불이 부족해요!'); return; }
      throwing = true;
      var fails = getFails();
      var success = Math.random() < springChance(fails);

      // 연출: 카드를 잠깐 숨기고 배경 속 샘으로 반딧불이 날아가게 한다
      var card = ov.firstElementChild;
      if (card) { card.style.transition = 'opacity .3s'; card.style.opacity = '0'; card.style.pointerEvents = 'none'; }
      var FX = { x: '50%', y: '47%' };
      var layer = document.createElement('div');
      layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
      for (var i = 0; i < 14; i++) {
        var d = document.createElement('div');
        var sx = Math.round(Math.random() * 100);
        d.style.cssText = 'position:absolute;left:' + sx + '%;top:' + (88 + Math.random() * 8) + '%;width:14px;height:14px;margin:-7px;border-radius:50%;' +
          'background:radial-gradient(circle,#fffbe0,#ffe27a 60%,rgba(255,226,122,0));box-shadow:0 0 12px #ffe27a;' +
          'animation:spFly 1s ease-in ' + (i * 0.05) + 's forwards;';
        d.style.setProperty('--dx', Math.round((50 - sx) * 3.9) + 'px');
        d.style.setProperty('--dy', '-' + Math.round(innerHeight * 0.4) + 'px');
        layer.appendChild(d);
      }
      ov.appendChild(layer);

      setTimeout(function () {
        throwing = false;
        var tmsg, tgood = false;
        if (success) {
          setFails(0);
          giveWishFragment();
          tmsg = '🧩 소원의 조각을 얻었어요!<br><span style="font-size:12px;color:#aaa;">(현재 ' + wishFragments + '/100)</span>'; tgood = true;
        } else {
          setFails(fails + 1);
          tmsg = '샘이 반짝이다 잠잠해졌어요…<br><span style="font-size:12px;color:#aaa;">행운이 쌓이고 있어요 (' + Math.min(fails + 1, SPRING_PITY) + '/' + SPRING_PITY + ')</span>';
        }
        // 샘에서 빛이 터지거나(성공) 물결만 번진다(실패)
        var fl = document.createElement('div');
        fl.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2;';
        var ring = document.createElement('div');
        ring.style.cssText = 'position:absolute;left:' + FX.x + ';top:' + FX.y + ';width:120px;height:120px;border-radius:50%;' +
          (success ? 'background:radial-gradient(circle,#fff,rgba(255,226,122,.85) 35%,rgba(255,150,220,0) 70%);animation:spBurst 1.3s ease-out forwards;'
                   : 'border:3px solid rgba(190,170,255,.8);animation:spRipple 1.2s ease-out forwards;');
        fl.appendChild(ring);
        if (success) {
          for (var j = 0; j < 16; j++) {
            var st = document.createElement('div');
            st.textContent = ['✨', '⭐', '💖', '🧩'][j % 4];
            st.style.cssText = 'position:absolute;left:' + (30 + Math.random() * 40) + '%;top:' + (46 + Math.random() * 6) + '%;font-size:' + (14 + Math.random() * 14) + 'px;opacity:0;animation:spUp ' + (1.2 + Math.random() * 0.8) + 's ease-out ' + (Math.random() * 0.4) + 's forwards;';
            st.style.setProperty('--dx', Math.round((Math.random() - 0.5) * 160) + 'px');
            fl.appendChild(st);
          }
        }
        render(tmsg, tgood);
        var nc = ov.firstElementChild;
        if (nc) { nc.style.animation = 'spCardIn .5s ease-out .5s both'; }
        ov.appendChild(fl);
        setTimeout(function () { if (fl.parentNode) fl.remove(); }, 2300);
        if (typeof saveAll === 'function') saveAll();
      }, 1250);
    }

    render('');
  }

  window.startMystery = startMystery;
  window.openMysterySpring = function () { openSpring(null); };
  window.__mysteryTest = { pickFireflyCount: pickFireflyCount, springChance: springChance, rollMaterial: rollMaterial };

  // ── 신비의 섬 "탐험" 버튼만 새 탐험으로 연결 (game.js는 건드리지 않음) ──
  (function hookStartExplore() {
    if (typeof window.startExplore !== 'function' || typeof window.collectExploreItem !== 'function' || typeof EXPLORE_MATERIALS === 'undefined') { setTimeout(hookStartExplore, 50); return; }
    if (window.__mysteryHooked) return;
    window.__mysteryHooked = true;
    var original = window.startExplore;
    window.startExplore = function (placeId) {
      if (placeId === 'mystery') { startMystery(); return; }
      return original.apply(this, arguments);
    };
  })();

  // ── 신비의 섬 장소 화면에 "🌟 소원의 샘" 버튼 추가 (탐험 버튼 바로 아래) ──
  (function addSpringButton() {
    var base = document.getElementById('btn-explore-mystery');
    if (!base) { setTimeout(addSpringButton, 100); return; }
    if (document.getElementById('btn-mystery-spring')) return;
    var b = document.createElement('button');
    b.id = 'btn-mystery-spring';
    b.textContent = '🌟 소원의 샘';
    b.style.cssText = 'display:none;width:100%;padding:14px;background:rgba(255,226,122,0.18);border:1.5px solid #FFE27A;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;';
    b.onclick = function () { window.openMysterySpring(); };
    base.insertAdjacentElement('afterend', b);

    // 신비의 섬 화면이 열릴 때만 보이게 (openPlace가 탐험 버튼을 보이게/숨기게 하는 걸 따라감)
    (function hookOpenPlace() {
      if (typeof window.openPlace !== 'function') { setTimeout(hookOpenPlace, 50); return; }
      var origOpen = window.openPlace;
      window.openPlace = function (id) {
        var r = origOpen.apply(this, arguments);
        b.style.display = (id === 'mystery' && typeof isMysteryIslandUnlocked === 'function' && isMysteryIslandUnlocked()) ? 'block' : 'none';
        return r;
      };
    })();
  })();
})();
