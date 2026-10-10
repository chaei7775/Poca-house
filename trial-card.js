// ════════════════════════════════
// 🎟️ 체험용 히든카드 (trial-card.js)
//
// 튜토리얼에서 탑스타가 주는 "7일 한정 히든카드". 진짜 히든카드와 완전히 따로 저장되고, 만료되면 이 카드만 사라진다.
//   - 받는 순간부터 7일 (TRIAL_DAYS). D-day가 더보기 > 🎟️ 체험 카드 에 표시된다
//   - 효과는 "진짜로" 적용된다 (아래 효과 2개 · 카드를 갖고 있는 7일 동안만)
//       스태미나 소모 -10%  : 탐험/원정 등으로 스태미나가 10 이상 줄 때마다 10%를 돌려준다 (10 → 1 돌려받음)
//       희귀재료 획득 +1%   : 행운(luck) +1 (탐험들이 희귀 확률을 0.30 + 행운/100 으로 계산하므로 딱 +1%p)
//   - 7일이 지나면: 카드와 효과가 사라지고, 위로 보상(코인 + 재조합석)을 한 번 준다
//   - 정식 카드를 얻는 방법은 아직 정해지지 않음 → 안내 문구만 (ACQUIRE_TEXT 만 고치면 됨)
//   - 한 계정에 한 번만 받을 수 있다 (이미 받은 적이 있으면 다시 안 줌)
//
// 지급하는 법 (튜토리얼은 나중에 이 함수를 불러서 지급):  window.grantTrialCard()
// 테스트용 (브라우저 주소 뒤에 붙이고 열기, 한 번만 동작):
//   ?trial=1       체험 카드 지급
//   ?trial=expire  지금 바로 7일이 지난 것으로 만들기 (만료 보상 확인용)
//   ?trial=reset   체험 카드 기록 지우기 (처음부터 다시 테스트)
//
// 저장: localStorage 'ph_trialCard' (ph_ 로 시작해서 기존 클라우드 저장에 같이 들어간다)
// 카드 그림: repo 맨 위 폴더의 hidden-seyeon-trial.jpg (없으면 임시 그림)
// 값을 바꾸고 싶으면 아래 [설정]만 고치면 된다.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var KEY = 'ph_trialCard';
  var TRIAL_DAYS = 7;                       // 체험 기간
  var STAMINA_SAVE = 0.10;                  // 스태미나 절약 비율
  var LUCK_BONUS = 1;                       // 행운 +1 = 희귀재료 확률 +1%p
  var REWARD_COINS = 20000;                 // 만료될 때 위로 보상: 코인
  var REWARD_STONES = 30;                   // 만료될 때 위로 보상: 재조합석
  var CARD_NAME = '세연';                    // 카드 이름 (그림에도 적혀 있음)
  var CARD_TITLE = '체험 히든카드 · 7일 한정';
  var CARD_IMG = 'hidden-seyeon-trial.jpg';   // 카드 그림 (이름·효과 글씨가 그림 안에 들어 있음)
  var CARD_RATIO = '1054/1492';
  var ACQUIRE_TEXT = '🧩 소원의 조각 50개를 모으면 첫 1회에 한해 아이돌 레어히든 카드 1장(랜덤)으로 바로 바꿔드려요! (세연 카드는 체험 전용이에요)';
  // 왜 7일 안에 정식 카드를 노려야 하는지 (동기 설명) — 세연 선배의 말투
  var WHY_HTML = '<div style="background:rgba(245,158,11,.12);border:1.5px solid ' + '#F59E0B' + '66;border-radius:12px;padding:10px 12px;margin:0 0 12px;text-align:left;font-size:12px;color:#fde7b0;line-height:1.7;">' +
    '<b style="color:#FFD700;">❓ 히든카드가 뭐예요?</b><br>갖고만 있어도 <b>효과가 계속 켜지는 특별한 카드</b>예요.<br>(스태미나 절약 · 알바 코인↑ · 희귀재료↑ · 제작 대성공↑ 등)<br>강화·초월하면 효과도, 데뷔한 멤버의 <b>기획사 수익</b>도 커져요.<br><br>' +
    '<b style="color:#FFD700;">💬 세연 선배</b><br>“이건 7일만 빌려주는 카드야.<br>써 보면 알걸? 탐험이 얼마나 편해지는지.<br>계속 쓰고 싶으면 <b>소원의 조각 50개</b> 모아서 내 아이돌의 히든카드로 바꿔 둬!<br>세연 카드는 체험용이라, 7일이 지나면 사라지고 효과도 같이 끝나.”</div>';
  var EFFECTS = [
    { label: '스태미나 소모', value: '-10%' },
    { label: '희귀재료 획득', value: '+1%' }
  ];
  var ACC = '#F59E0B';
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var DAY = 86400000;

  // ════════ 순수 로직 ════════
  function read() {
    try { var r = JSON.parse(localStorage.getItem(KEY) || 'null'); if (r && typeof r.expiresAt === 'number') return r; } catch (e) {}
    return null;
  }
  function write(r) { try { if (r) localStorage.setItem(KEY, JSON.stringify(r)); else localStorage.removeItem(KEY); } catch (e) {} }
  function isActive(now) { var r = read(); return !!r && !r.expired && (now || Date.now()) < r.expiresAt; }
  function remainMs(now) { var r = read(); return r ? Math.max(0, r.expiresAt - (now || Date.now())) : 0; }
  function dday(now) { return Math.max(0, Math.ceil(remainMs(now) / DAY)); }
  function remainText(now) {
    var ms = remainMs(now), d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return d > 0 ? d + '일 ' + h + '시간' : (h > 0 ? h + '시간 ' + m + '분' : m + '분');
  }
  // 스태미나가 diff 만큼 줄었을 때 돌려줄 양 (10 미만의 작은 소모는 그대로)
  function refundFor(diff) {
    if (diff < 10 || diff > 60) return 0;
    return Math.floor(diff * STAMINA_SAVE);
  }

  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }
  function $(id) { return document.getElementById(id); }
  function imgUrl() { return (typeof B !== 'undefined' ? B : '') + CARD_IMG; }
  function whenReady(test, fn) {
    var tries = 0;
    (function attempt() {
      var ok = false; try { ok = test(); } catch (e) {}
      if (ok) { fn(); return; }
      if (++tries < 200) setTimeout(attempt, 100);
    })();
  }

  // ════════ 지급 / 만료 ════════
  function grant(opts) {
    if (read()) return false;                                  // 이미 받은 적 있음 (만료됐어도 다시 안 줌)
    var now = Date.now();
    write({ grantedAt: now, expiresAt: now + TRIAL_DAYS * DAY, expired: false, rewarded: false });
    if (!opts || !opts.silent) showGrantPopup();
    return true;
  }

  function checkExpire() {
    var r = read();
    if (!r || r.rewarded) return;
    if (Date.now() < r.expiresAt) return;
    if (typeof addToBag !== 'function' || typeof coins === 'undefined') return;   // 게임이 아직 준비 안 됨 → 다음에 다시
    r.expired = true; r.rewarded = true; write(r);
    coins += REWARD_COINS;
    try { addToBag('🔹', '재조합석', 'material', REWARD_STONES, '카드 재조합에 필요한 재료'); } catch (e) {}
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    try { if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); } catch (e) {}
    showExpirePopup();
  }

  // ════════ 효과 (진짜로 적용) ════════
  // 1) 희귀재료 +1% : 행운 +1
  whenReady(function () { return typeof window.getEquippedStat === 'function'; }, function () {
    var original = window.getEquippedStat;
    if (original.__trialWrapped) return;
    var wrapped = function (stat) {
      var v = original.apply(this, arguments);
      if (stat === 'luck' && isActive()) v = (Number(v) || 0) + LUCK_BONUS;
      return v;
    };
    wrapped.__trialWrapped = true;
    window.getEquippedStat = wrapped;
  });
  // 2) 스태미나 -10% : 스태미나가 10 이상 줄어든 채로 저장될 때 그 10%를 돌려준다
  whenReady(function () { return typeof window.saveStamina === 'function' && typeof stamina !== 'undefined'; }, function () {
    var original = window.saveStamina;
    if (original.__trialWrapped) return;
    var last = stamina;
    var wrapped = function () {
      try {
        if (isActive()) {
          var back = refundFor(last - stamina);
          if (back > 0) stamina += back;
        }
      } catch (e) {}
      var r = original.apply(this, arguments);
      last = stamina;
      return r;
    };
    wrapped.__trialWrapped = true;
    window.saveStamina = wrapped;
  });

  // ════════ 화면 ════════
  function cardHtml(w) {
    return '<div style="width:' + w + 'px;aspect-ratio:' + CARD_RATIO + ';margin:0 auto;border-radius:14px;overflow:hidden;border:2px solid ' + ACC + ';box-shadow:0 0 36px ' + ACC + '88;position:relative;' +
      'background:linear-gradient(160deg,#3b1d6e,#7c3aed 55%,#f59e0b);display:flex;align-items:center;justify-content:center;">' +
      '<div style="font-size:64px;filter:drop-shadow(0 4px 10px #0008);">🌟</div>' +
      '<img src="' + imgUrl() + '" onerror="this.style.display=\'none\'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"></div>' +
      '<div style="display:inline-block;margin-top:10px;background:rgba(220,38,38,.92);border-radius:999px;padding:3px 14px;font-size:13px;font-weight:900;color:#fff;">🎟️ 체험용 · D-' + dday() + '</div>';
  }
  function effectsHtml() {
    return EFFECTS.map(function (e) {
      return '<div style="font-size:13px;color:#fff;margin-top:5px;">' + e.label + ' <b style="color:' + ACC + ';">' + e.value + '</b></div>';
    }).join('');
  }
  function overlay(inner) {
    var old = $('trial-overlay'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'trial-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:960;background:rgba(10,5,20,.94);overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;align-items:flex-start;justify-content:center;padding:calc(20px + env(safe-area-inset-top)) 20px calc(90px + env(safe-area-inset-bottom));' + FONT;
    ov.innerHTML = '<div style="width:100%;max-width:320px;text-align:center;margin:auto 0;">' + inner + '</div>';
    document.body.appendChild(ov);
    return ov;
  }
  var BTN = 'width:100%;padding:13px;border:none;border-radius:12px;font-size:15px;font-weight:900;cursor:pointer;' + FONT;

  function showGrantPopup() {
    var ov = overlay(
      '<div style="font-size:21px;font-weight:900;color:' + ACC + ';text-shadow:0 0 20px ' + ACC + 'aa;margin-bottom:14px;">🎟️ 체험용 히든카드 획득!</div>' +
      cardHtml(230) +
      '<div style="margin-top:10px;">' + effectsHtml() + '</div>' +
      '<div style="font-size:12px;color:#fca5a5;margin:12px 0 8px;font-weight:700;">⏳ ' + TRIAL_DAYS + '일 뒤에 사라져요</div>' +
      WHY_HTML +
      '<div style="font-size:11px;color:#bbb;margin-bottom:14px;">' + ACQUIRE_TEXT + '<br>조각은 드라마 촬영·탐험·퀘스트에서 모아요</div>' +
      '<button id="trial-ok" style="' + BTN + 'background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;">좋아요!</button>');
    $('trial-ok').onclick = function () { ov.remove(); };
    try { if (window.pocaSfx) window.pocaSfx.play('reward'); } catch (e) {}
  }

  function showExpirePopup() {
    var ov = overlay(
      '<div style="font-size:42px;margin-bottom:6px;">🎟️</div>' +
      '<div style="font-size:19px;font-weight:900;color:#fff;margin-bottom:8px;">체험 기간이 끝났어요</div>' +
      '<div style="font-size:13px;color:#ddd;line-height:1.7;margin-bottom:14px;">' + CARD_NAME + ' 체험 카드가 사라졌어요.<br>써보느라 수고했어요! 대신 선물을 드려요 🎁</div>' +
      '<div style="display:inline-block;background:rgba(255,255,255,.1);border:1.5px solid ' + ACC + ';border-radius:14px;padding:10px 18px;font-size:14px;font-weight:900;color:#FFD700;line-height:1.8;margin-bottom:14px;">' +
      '🍔 ' + REWARD_COINS.toLocaleString() + ' 코인<br>🔹 재조합석 ×' + REWARD_STONES + '</div>' +
      '<div style="font-size:11px;color:#bbb;margin-bottom:14px;">' + ACQUIRE_TEXT + '<br>(조각 50개 교환은 아직 남아 있어요)</div>' +
      '<button id="trial-ok" style="' + BTN + 'background:rgba(255,255,255,.14);color:#fff;">확인</button>');
    $('trial-ok').onclick = function () { ov.remove(); };
  }

  function openTrial() {
    var r = read();
    if (!r) { toast('체험 카드가 없어요'); return; }
    if (!isActive()) { checkExpire(); if (!$('trial-overlay')) toast('체험 기간이 끝났어요'); return; }
    var pct = Math.max(0, Math.min(100, Math.round(remainMs() / (TRIAL_DAYS * DAY) * 100)));
    var ov = overlay(
      '<div style="display:flex;justify-content:flex-end;margin-bottom:8px;position:sticky;top:0;z-index:5;"><button id="trial-close" style="padding:7px 12px;border:none;border-radius:10px;background:rgba(255,255,255,.12);color:#fff;font-size:13px;font-weight:900;cursor:pointer;' + FONT + '">닫기</button></div>' +
      cardHtml(230) +
      '<div style="margin-top:10px;">' + effectsHtml() + '</div>' +
      '<div style="margin:16px 0 4px;font-size:13px;font-weight:900;color:#fca5a5;">⏳ 남은 시간 ' + remainText() + ' (D-' + dday() + ')</div>' +
      '<div style="height:10px;border-radius:5px;background:rgba(255,255,255,.12);overflow:hidden;margin-bottom:14px;"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#ef4444,#f59e0b);"></div></div>' +
      '<div style="background:rgba(255,255,255,.07);border-radius:12px;padding:11px;font-size:12px;color:#ddd;line-height:1.6;">' +
      '🎁 끝나면 카드는 사라지지만<br>코인 ' + REWARD_COINS.toLocaleString() + ' + 재조합석 ×' + REWARD_STONES + '을 드려요<br><span style="color:#bbb;">' + ACQUIRE_TEXT + '</span></div>' +
      '<div style="margin-top:12px;">' + WHY_HTML + '</div>');
    $('trial-close').onclick = function () { ov.remove(); };
  }
  window.openTrialCard = openTrial;

  // ════════ 기존 화면에 연결 ════════
  // 더보기 메뉴: 체험 카드가 있을 때만 타일을 붙인다 (만료 보상까지 받으면 사라짐)
  whenReady(function () { return typeof window.openMoreMenu === 'function' && typeof window.moreMenuTileHtml === 'function'; }, function () {
    var original = window.openMoreMenu;
    if (original.__trialWrapped) return;
    var wrapped = function () {
      checkExpire();
      var res = original.apply(this, arguments);
      var grid = document.getElementById('more-menu-grid');
      if (grid && !document.getElementById('more-trial-tile') && isActive()) {
        grid.insertAdjacentHTML('afterbegin', window.moreMenuTileHtml('🎟️', '체험 카드 D-' + dday(), ACC, 'openTrialCard()'));
        if (grid.firstElementChild) grid.firstElementChild.id = 'more-trial-tile';
      }
      return res;
    };
    wrapped.__trialWrapped = true;
    window.openMoreMenu = wrapped;
  });


  // 히든카드 도감에도 세연 체험 카드를 맨 앞에 보여준다 (받기 전엔 잠금 칸, 끝나면 '체험 종료')
  whenReady(function () { return typeof window.openHiddenCardDex === 'function'; }, function () {
    var original = window.openHiddenCardDex;
    if (original.__trialWrapped) return;
    var wrapped = function () {
      checkExpire();
      var res = original.apply(this, arguments);
      try {
        var ov = document.getElementById('hidden-dex-overlay');
        var grid = ov && ov.children[1];
        if (grid && !document.getElementById('dex-trial-tile')) {
          var r = read(), act = isActive(), st = act ? 'on' : (r ? 'end' : 'lock');
          var badge = act ? '🎟️ 체험 D-' + dday() : (r ? '체험 종료' : '체험');
          var sub = act ? '<div style="font-size:10px;color:#fcd34d;font-weight:900;margin-top:2px;">' + remainText() + ' 남음</div>'
            : (r ? '<div style="font-size:10px;color:#aaa;margin-top:2px;">기간이 끝났어요</div>' : '<div style="font-size:10px;color:#FF6B9D;font-weight:900;margin-top:2px;">Lv.5 무대 후 지급</div>');
          var d = document.createElement('div');
          d.id = 'dex-trial-tile';
          d.style.cssText = 'position:relative;border:2px solid ' + ACC + ';border-radius:14px;overflow:hidden;background:#111;aspect-ratio:3/4;' + (act ? 'cursor:pointer;box-shadow:0 0 14px ' + ACC + '88;' : '');
          d.innerHTML = '<img src="' + imgUrl() + '" onerror="this.style.display=\'none\'" style="width:100%;height:100%;object-fit:cover;opacity:' + (act ? '1' : '.45') + ';' + (st === 'lock' ? 'filter:grayscale(1);' : '') + '">' +
            '<div style="position:absolute;top:6px;right:6px;background:' + (act ? '#dc2626' : '#666') + ';color:#fff;font-size:9px;font-weight:900;padding:2px 6px;border-radius:8px;">' + badge + '</div>' +
            '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.75);padding:6px;text-align:center;"><div style="font-size:11px;font-weight:900;color:#fff;">' + CARD_NAME + ' (체험)</div>' + sub + '</div>';
          if (act) d.onclick = function () { openTrial(); };
          grid.insertBefore(d, grid.firstChild);
        }
      } catch (e) {}
      return res;
    };
    wrapped.__trialWrapped = true;
    window.openHiddenCardDex = wrapped;
  });

  // 게임이 켜질 때와 켜 둔 동안 주기적으로 만료 확인
  function tick() { try { checkExpire(); } catch (e) {} }
  setTimeout(tick, 3000);
  setInterval(tick, 60000);

  // 테스트용 주소 파라미터 (?trial=1 / expire / reset)
  try {
    var q = new URLSearchParams(location.search).get('trial');
    if (q) {
      setTimeout(function () {
        if (q === 'reset') { write(null); toast('체험 카드 기록을 지웠어요'); }
        else if (q === 'expire') { var r = read(); if (r) { r.expiresAt = Date.now() - 1000; write(r); toast('체험 기간을 끝난 것으로 바꿨어요'); setTimeout(tick, 600); } else toast('먼저 ?trial=1 로 카드를 받아요'); }
        else if (q === '1') { if (!grant()) toast('이미 체험 카드를 받은 적이 있어요 (?trial=reset 으로 지울 수 있어요)'); }
      }, 4000);
    }
  } catch (e) {}

  window.grantTrialCard = grant;
  window.__trialTest = { read: read, write: write, isActive: isActive, dday: dday, remainText: remainText, refundFor: refundFor, grant: grant, checkExpire: checkExpire, open: openTrial };
})();
