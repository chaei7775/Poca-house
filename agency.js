// ════════════════════════════════
// 🎤 광장 기획사 · 데뷔 (agency.js) — 1단계
// 중앙광장 메뉴에 "🎤 기획사" 버튼을 붙인다. (game.js / index.html은 건드리지 않음)
//
// - 카드를 가진 캐릭터는 "연습생". 준비물을 내고 데뷔에 도전할 수 있다.
//   준비물: 코인 + 숲/해변/공원 탐험 재료 (아래 DEBUT_NEED)
//   성공 확률 기본 15%. 실패할 때마다 +1%p (천장: 20번째 도전은 확정)
//   응원 카드: 그 캐릭터의 "중복 카드"를 최대 3장까지 걸면 확률 증가 (실패하면 카드는 그대로 돌려받음, 성공하면 소모)
//   실패하면 재료의 절반을 돌려받음 (코인은 안 돌려줌)
//   🧩 소원의 조각 걸기: 1개당 +10%p, 최대 3개. 성공하든 실패하든 걸어둔 조각은 소모됨 (돌려받지 않음)
// - 데뷔한 캐릭터는 시간이 지날수록 수익이 쌓이고, 기획사에서 "정산하기"로 받는다.
// - CF / 드라마 / 노래 스케줄은 다음 단계 (지금은 자리만 표시)
//
// 값을 바꾸고 싶으면 아래 설정만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var DEBUT_BASE = 15;          // 기본 성공 확률(%)
  var PITY_STEP = 1;            // 실패 1번당 늘어나는 확률(%p)
  var PITY_HARD = 20;           // 이 번째 도전은 무조건 성공
  var MAX_CHANCE = 95;          // 확률 상한(%)
  var CARD_PCT = { N: 1, R: 2, SR: 3, SSR: 5, UR: 8 };   // 응원 카드 1장당 늘어나는 확률(%p)
  var CARD_MAX = 3;             // 응원 카드 최대 장수
  var WISH_PCT = 10;            // 소원의 조각 1개당 늘어나는 확률(%p)
  var WISH_MAX = 3;             // 한 번에 걸 수 있는 소원의 조각 최대 개수 (성공/실패 상관없이 소모)
  var DEBUT_COIN = 2000;        // 도전할 때 내는 코인
  var DEBUT_NEED = [            // 도전할 때 내는 재료
    { name: '고급원목', qty: 6, where: '🎬 촬영 세트장' },
    { name: '반짝이는조개', qty: 6, where: '💄 뷰티 살롱' },
    { name: '장미꽃', qty: 6, where: '🌸 공원' }
  ];
  var REFUND_RATE = 0.5;        // 실패했을 때 돌려받는 재료 비율
  var INCOME_PER_HOUR = 10000;  // 데뷔한 캐릭터 1명당 시간당 기본 수익(코인) — 히든카드 강화/초월하면 enhance.js가 배율을 곱함
  var INCOME_CAP_HOURS = 8;     // 정산 안 하고 쌓아둘 수 있는 최대 시간
  var STORAGE_KEY = 'ph_agency';

  // ════════ 순수 로직 (화면 없이도 테스트 가능) ════════
  function cardBonus(picks) {            // picks: { N: 1, SR: 2 ... }
    var total = 0, n = 0;
    Object.keys(picks || {}).forEach(function (g) {
      var c = picks[g] || 0; n += c; total += c * (CARD_PCT[g] || 0);
    });
    return n > CARD_MAX ? null : total;
  }
  function debutChance(pity, picks, wish) {
    var bonus = cardBonus(picks) || 0;
    var wishBonus = Math.min(WISH_MAX, Math.max(0, wish || 0)) * WISH_PCT;
    return Math.min(MAX_CHANCE, DEBUT_BASE + pity * PITY_STEP + bonus + wishBonus);
  }
  function rollDebut(pity, picks, rng, wish) {
    rng = rng || Math.random;
    if (pity >= PITY_HARD - 1) return true;                 // 천장
    return rng() * 100 < debutChance(pity, picks, wish);
  }
  function incomeMult(cid) {             // 히든카드 강화 배율 (enhance.js가 없으면 1배)
    return (typeof window.getEnhanceIncomeMult === 'function') ? window.getEnhanceIncomeMult(cid) : 1;
  }
  function claimable(debutTimes, now) {  // debutTimes: { charId: sinceMs }
    var sum = 0;
    Object.keys(debutTimes || {}).forEach(function (cid) {
      var hours = Math.max(0, (now - debutTimes[cid]) / 3600000);
      sum += Math.min(INCOME_CAP_HOURS, hours) * INCOME_PER_HOUR * incomeMult(cid);
    });
    return Math.floor(sum);
  }

  // ════════ 저장 ════════
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!s.debut) s.debut = {};     // { charId: 수익 기준 시각(ms) }
    if (!s.pity) s.pity = {};       // { charId: 연속 실패 횟수 }
    if (!s.done) s.done = {};       // { charId: 데뷔 완료(true) }
    return s;
  }
  function save(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {} }

  // ════════ 게임 데이터 읽기 ════════
  function bagQty(name) {
    var it = (typeof bagItems !== 'undefined' ? bagItems : []).find(function (i) { return i.name === name && i.type === 'material'; });
    return it ? it.qty : 0;
  }
  function charCards(cid) { return CARDS.filter(function (c) { return c.charId === cid; }); }
  function hasChar(cid) { return charCards(cid).some(function (c) { return owned.indexOf(c.id) !== -1; }); }
  function dupsByGrade(cid) {            // 중복 카드(2장째부터)만 셈
    var out = { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 };
    charCards(cid).forEach(function (c) {
      var n = (cardCounts[c.id] || (owned.indexOf(c.id) !== -1 ? 1 : 0));
      if (n > 1 && out[c.grade] !== undefined) out[c.grade] += n - 1;
    });
    return out;
  }
  function spendDups(cid, picks) {       // 성공했을 때 실제로 카드 차감
    Object.keys(picks).forEach(function (g) {
      var need = picks[g] || 0;
      charCards(cid).forEach(function (c) {
        while (need > 0 && (cardCounts[c.id] || 0) > 1 && c.grade === g) { cardCounts[c.id] -= 1; need--; }
      });
    });
    localStorage.setItem('ph_cardCounts', JSON.stringify(cardCounts));
  }
  function emojiOf(name) { return typeof getMaterialEmoji === 'function' ? getMaterialEmoji(name) : '🌿'; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }

  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var BTN = 'border:none;border-radius:12px;font-weight:900;cursor:pointer;' + FONT;

  // ════════ 기획사 메인 화면 ════════
  function openAgency() {
    if (typeof isPocaHouseFeatureUnlocked === 'function' && !isPocaHouseFeatureUnlocked('agency')) {
      if (typeof closePlace === 'function') closePlace();
      showPocaHouseLockedPopup(POCAHOUSE_UNLOCK.agency, '기획사');
      return;
    }
    if (typeof closePlace === 'function') closePlace();
    // 앱을 껐다 켠 직후 첫 클릭에서만 안 열리는 문제 대비: 오류가 나도 조용히 넘기지 말고 한 번 더 시도하고, 그래도 안 되면 화면에 이유를 보여줌
    try { renderAgency(); } catch (e) { console.error('[agency] 1st render failed', e); }
    if (!document.getElementById('agency-overlay')) {
      setTimeout(function () {
        try { renderAgency(); } catch (e) { console.error('[agency] retry failed', e); toast('기획사를 여는 중 오류: ' + (e && e.message ? e.message : e)); }
      }, 300);
    }
  }

  function renderAgency() {
    var old = document.getElementById('agency-overlay');
    var st = load(), now = Date.now();
    var ov = old || document.createElement('div');
    ov.id = 'agency-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:750;background:linear-gradient(160deg,#150f26,#2a1745);overflow-y:auto;' + FONT;
    var money = claimable(st.debut, now);
    var debutedN = Object.keys(st.debut).length;

    var rows = Object.keys(CHARS).map(function (cid) {
      var ch = CHARS[cid], have = hasChar(cid), done = !!st.done[cid];
      var pity = st.pity[cid] || 0;
      var avatar = '<div style="width:54px;height:54px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid ' + ch.gradeColor + ';background:' + ch.gradeColor + '55;display:flex;align-items:center;justify-content:center;font-size:24px;">' +
        (ch.img ? '<img src="' + ch.img + '" style="width:100%;height:100%;object-fit:cover;object-position:top;" onerror="this.outerHTML=\'' + ch.emoji + '\'">' : ch.emoji) + '</div>';
      var status, action;
      if (done) {
        status = '<span style="color:#4ade80;font-weight:900;">✅ 데뷔 완료</span> <span style="color:#aaa;">· 🍔 ' + Math.round(INCOME_PER_HOUR * incomeMult(cid)).toLocaleString() + '/시간</span>';
        action = '';
      } else if (!have) {
        status = '<span style="color:#888;">🔒 카드를 뽑아야 연습생이 돼요</span>';
        action = '';
      } else {
        status = '<span style="color:#FFD700;font-weight:900;">🎤 연습생</span>' + (pity > 0 ? ' <span style="color:#aaa;">· 천장 ' + pity + '/' + (PITY_HARD - 1) + '</span>' : '');
        action = '<button data-debut="' + cid + '" style="' + BTN + 'padding:10px 14px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:13px;">데뷔 도전</button>';
      }
      return '<div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:12px;margin-bottom:10px;">' +
        avatar + '<div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:900;color:#fff;">' + esc(ch.name) + '</div><div style="font-size:12px;margin-top:3px;">' + status + '</div></div>' + action + '</div>';
    }).join('');

    var settle = debutedN === 0
      ? '<div style="font-size:12px;color:#aaa;line-height:1.6;">아직 데뷔한 아이돌이 없어요.<br>준비물을 모아 연습생을 데뷔시켜 보세요!</div>'
      : '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;"><div><div style="font-size:12px;color:#aaa;">쌓인 수익 (최대 ' + INCOME_CAP_HOURS + '시간치)</div><div style="font-size:20px;font-weight:900;color:#FFD700;">🍔 ' + money.toLocaleString() + '</div></div>' +
        '<button id="agency-claim" style="' + BTN + 'padding:12px 16px;background:' + (money > 0 ? 'linear-gradient(135deg,#FFD700,#F59E0B)' : 'rgba(255,255,255,0.1)') + ';color:' + (money > 0 ? '#3a2600' : '#888') + ';font-size:14px;">정산하기</button></div>';

    ov.innerHTML = '<div style="max-width:430px;margin:0 auto;padding:18px 16px 40px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
      '<div style="font-size:19px;font-weight:900;color:#fff;">🎤 기획사</div>' +
      '<button id="agency-close" style="' + BTN + 'padding:8px 14px;background:rgba(255,255,255,0.1);color:#fff;font-size:13px;">닫기</button></div>' +
      '<div style="background:linear-gradient(135deg,rgba(255,107,157,0.18),rgba(192,132,252,0.18));border:1.5px solid #C084FC;border-radius:16px;padding:14px;margin-bottom:16px;">' + settle + '</div>' +
      '<div style="font-size:13px;font-weight:900;color:#ddd;margin-bottom:8px;">소속 아이돌</div>' + rows + '</div>';
    if (!old) document.body.appendChild(ov);

    ov.querySelector('#agency-close').onclick = function () { ov.remove(); };
    var claim = ov.querySelector('#agency-claim');
    if (claim) claim.onclick = doClaim;
    ov.querySelectorAll('[data-debut]').forEach(function (b) { b.onclick = function () { openDebut(b.getAttribute('data-debut')); }; });
  }

  function doClaim() {
    var st = load(), now = Date.now(), money = claimable(st.debut, now);
    if (money <= 0) { toast('아직 쌓인 수익이 없어요'); return; }
    coins += money;
    Object.keys(st.debut).forEach(function (cid) { st.debut[cid] = now; });
    save(st); saveAll();
    if (typeof spawnCoinFloat === 'function') { try { spawnCoinFloat(money); } catch (e) {} }
    toast('🍔 수익 정산! +' + money.toLocaleString() + '코인');
    renderAgency();
  }

  // ════════ 데뷔 도전 화면 ════════
  function openDebut(cid) {
    var ch = CHARS[cid], st = load();
    if (!ch || !hasChar(cid) || st.done[cid]) return;
    var picks = { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 };
    var wishPick = 0;                    // 걸어둘 소원의 조각 개수
    var old = document.getElementById('agency-debut-overlay'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'agency-debut-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:760;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:16px;' + FONT;
    document.body.appendChild(ov);

    function draw() {
      var pity = load().pity[cid] || 0;
      var dups = dupsByGrade(cid);
      var total = picks.N + picks.R + picks.SR + picks.SSR + picks.UR;
      var haveWish = (typeof wishFragments !== 'undefined') ? wishFragments : 0;
      if (wishPick > haveWish) wishPick = haveWish;
      var chance = debutChance(pity, picks, wishPick);
      var sure = pity >= PITY_HARD - 1;
      var canPay = coins >= DEBUT_COIN && DEBUT_NEED.every(function (n) { return bagQty(n.name) >= n.qty; });

      var need = DEBUT_NEED.map(function (n) {
        var have = bagQty(n.name), ok = have >= n.qty;
        return '<div style="display:flex;justify-content:space-between;font-size:13px;padding:5px 0;color:' + (ok ? '#fff' : '#ff8a8a') + ';"><span>' + emojiOf(n.name) + ' ' + n.name + ' <span style="color:#888;font-size:11px;">(' + n.where + ')</span></span><span>' + have + ' / ' + n.qty + '</span></div>';
      }).join('') + '<div style="display:flex;justify-content:space-between;font-size:13px;padding:5px 0;color:' + (coins >= DEBUT_COIN ? '#fff' : '#ff8a8a') + ';"><span>🍔 연습비</span><span>' + coins.toLocaleString() + ' / ' + DEBUT_COIN.toLocaleString() + '</span></div>';

      var gradesHtml = ['N', 'R', 'SR', 'SSR', 'UR'].filter(function (g) { return dups[g] > 0; }).map(function (g) {
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;font-size:13px;color:#fff;"><span>' + g + ' <span style="color:#888;font-size:11px;">(+' + CARD_PCT[g] + '%p · 여분 ' + dups[g] + '장)</span></span>' +
          '<span><button data-g="' + g + '" data-d="-1" style="' + BTN + 'width:28px;height:28px;background:rgba(255,255,255,0.12);color:#fff;">−</button> <b style="display:inline-block;min-width:20px;text-align:center;">' + picks[g] + '</b> ' +
          '<button data-g="' + g + '" data-d="1" style="' + BTN + 'width:28px;height:28px;background:rgba(255,255,255,0.12);color:#fff;">+</button></span></div>';
      }).join('') || '<div style="font-size:12px;color:#888;">걸 수 있는 중복 카드가 없어요</div>';

      var wishHtml = '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;font-size:13px;color:#fff;"><span>🧩 소원의 조각 <span style="color:#888;font-size:11px;">(+' + WISH_PCT + '%p · 보유 ' + haveWish + '개)</span></span>' +
        '<span><button data-wish="-1" style="' + BTN + 'width:28px;height:28px;background:rgba(255,255,255,0.12);color:#fff;">−</button> <b style="display:inline-block;min-width:20px;text-align:center;">' + wishPick + '</b> ' +
        '<button data-wish="1" style="' + BTN + 'width:28px;height:28px;background:rgba(255,255,255,0.12);color:#fff;">+</button></span></div>';

      ov.innerHTML = '<div style="width:100%;max-width:340px;max-height:92vh;overflow-y:auto;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid ' + ch.gradeColor + ';border-radius:20px;padding:22px 20px;">' +
        '<div style="text-align:center;margin-bottom:12px;"><div style="font-size:30px;">🎤</div><div style="font-size:17px;font-weight:900;color:#fff;">' + esc(ch.name) + ' 데뷔 도전</div></div>' +
        '<div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:10px 12px;margin-bottom:12px;"><div style="font-size:12px;font-weight:900;color:#C084FC;margin-bottom:4px;">준비물</div>' + need + '</div>' +
        '<div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:10px 12px;margin-bottom:12px;"><div style="font-size:12px;font-weight:900;color:#C084FC;margin-bottom:4px;">응원 카드 <span style="color:#888;font-weight:400;">(최대 ' + CARD_MAX + '장 · 실패하면 돌려받아요)</span></div>' + gradesHtml + '</div>' +
        '<div style="background:rgba(255,226,122,0.07);border-radius:12px;padding:10px 12px;margin-bottom:12px;"><div style="font-size:12px;font-weight:900;color:#FFE27A;margin-bottom:4px;">소원 걸기 <span style="color:#888;font-weight:400;">(최대 ' + WISH_MAX + '개 · 실패해도 돌려받지 않아요)</span></div>' + wishHtml + '</div>' +
        '<div style="text-align:center;margin-bottom:12px;"><div style="font-size:12px;color:#aaa;">성공 확률</div><div style="font-size:26px;font-weight:900;color:#FFD700;">' + (sure ? '확정!' : chance + '%') + '</div>' +
        '<div style="font-size:11px;color:#888;">천장 ' + pity + ' / ' + (PITY_HARD - 1) + (sure ? ' · 이번엔 무조건 데뷔' : '') + '</div></div>' +
        '<button id="agency-go" style="' + BTN + 'width:100%;padding:14px;margin-bottom:8px;background:' + (canPay ? 'linear-gradient(135deg,#FF6B9D,#C084FC)' : 'rgba(255,255,255,0.1)') + ';color:' + (canPay ? '#fff' : '#777') + ';font-size:15px;">' + (canPay ? '🎤 데뷔 도전!' : '준비물이 부족해요') + '</button>' +
        '<button id="agency-cancel" style="' + BTN + 'width:100%;padding:11px;background:rgba(255,255,255,0.08);color:#aaa;font-size:13px;">닫기</button></div>';

      ov.querySelectorAll('[data-g]').forEach(function (b) {
        b.onclick = function () {
          var g = b.getAttribute('data-g'), d = parseInt(b.getAttribute('data-d'), 10);
          var nv = picks[g] + d;
          var tot = picks.N + picks.R + picks.SR + picks.SSR + picks.UR;
          if (nv < 0 || nv > dups[g] || (d > 0 && tot >= CARD_MAX)) return;
          picks[g] = nv; draw();
        };
      });
      ov.querySelectorAll('[data-wish]').forEach(function (b) {
        b.onclick = function () {
          var nv = wishPick + parseInt(b.getAttribute('data-wish'), 10);
          if (nv < 0 || nv > WISH_MAX || nv > haveWish) return;
          wishPick = nv; draw();
        };
      });
      ov.querySelector('#agency-cancel').onclick = function () { ov.remove(); };
      ov.querySelector('#agency-go').onclick = function () { if (canPay) attempt(cid, picks, ov, wishPick); else toast('준비물이 부족해요!'); };
    }
    draw();
  }

  // 소원의 조각 걸기: 실제로 소모 (재조합기와 같은 방식으로 wishFragments를 줄이고, 0이 되면 가방 표시 아이템도 정리)
  function spendWish(n) {
    if (!n || n <= 0) return;
    wishFragments -= n;
    localStorage.setItem('ph_wish', wishFragments);
    if (wishFragments <= 0) {
      wishFragments = 0;
      localStorage.setItem('ph_wish', 0);
      var frag = bagItems.find(function (i) { return i.name === '소원의 조각'; });
      if (frag) useFromBag('소원의 조각', frag.qty);
    }
  }

  function attempt(cid, picks, ov, wish) {
    var ch = CHARS[cid], st = load();
    if (st.done[cid]) return;
    wish = Math.min(WISH_MAX, Math.max(0, wish || 0));
    if (typeof wishFragments !== 'undefined' && wish > wishFragments) wish = wishFragments;
    var pity = st.pity[cid] || 0;
    // 1) 비용은 먼저 낸다 (닫아도 도망 못 가게)
    coins -= DEBUT_COIN;
    DEBUT_NEED.forEach(function (n) { useFromBag(n.name, n.qty); });
    spendWish(wish);                                          // 소원의 조각은 성공/실패 상관없이 소모
    // 2) 판정
    var win = rollDebut(pity, picks, null, wish);
    var wishLine = wish > 0 ? '<div style="font-size:12px;color:#FFE27A;margin-bottom:6px;">🧩 소원의 조각 ' + wish + '개를 사용했어요</div>' : '';
    var refunds = [];
    if (win) {
      spendDups(cid, picks);
      st.done[cid] = true; st.debut[cid] = Date.now(); st.pity[cid] = 0;
    } else {
      st.pity[cid] = pity + 1;
      DEBUT_NEED.forEach(function (n) {
        var back = Math.floor(n.qty * REFUND_RATE);
        if (back > 0 && addToBag(emojiOf(n.name), n.name, 'material', back, '제작 재료')) refunds.push(emojiOf(n.name) + ' ' + n.name + ' ×' + back);
      });
    }
    save(st); saveAll();

    ov.innerHTML = '<div style="text-align:center;color:#fff;"><div style="font-size:54px;animation:pulse 0.8s infinite;">🎤</div><div style="font-size:16px;font-weight:900;margin-top:10px;">오디션 중...</div></div>';
    setTimeout(function () {
      var left = Math.max(0, PITY_HARD - 1 - (st.pity[cid] || 0));
      if (win) {
        ov.innerHTML = '<div style="width:100%;max-width:320px;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FFD700;border-radius:20px;padding:28px 22px;text-align:center;">' +
          '<div style="font-size:50px;margin-bottom:6px;">🎉✨</div><div style="font-size:20px;font-weight:900;color:#FFD700;margin-bottom:6px;">데뷔 성공!</div>' +
          '<div style="font-size:14px;color:#fff;line-height:1.7;margin-bottom:6px;">' + esc(ch.name) + '이(가) 정식으로 데뷔했어요!</div>' +
          '<div style="font-size:12px;color:#aaa;margin-bottom:6px;">이제 시간이 지나면 수익이 쌓여요 (🍔 ' + INCOME_PER_HOUR.toLocaleString() + '/시간)</div>' + wishLine +
          '<div style="height:10px;"></div>' +
          '<button id="agency-ok" style="' + BTN + 'width:100%;padding:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:15px;">확인</button></div>';
      } else {
        ov.innerHTML = '<div style="width:100%;max-width:320px;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #777;border-radius:20px;padding:28px 22px;text-align:center;">' +
          '<div style="font-size:46px;margin-bottom:6px;">😢</div><div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:6px;">이번엔 아쉽게 탈락…</div>' +
          '<div style="font-size:12px;color:#aaa;line-height:1.7;margin-bottom:6px;">재료 일부를 돌려받았어요<br>' + (refunds.length ? refunds.join(' · ') : '') + '</div>' + wishLine +
          '<div style="font-size:12px;color:#C084FC;margin-bottom:16px;">천장 ' + st.pity[cid] + ' / ' + (PITY_HARD - 1) + ' · ' + (left === 0 ? '다음엔 무조건 데뷔!' : left + '번 안에 확정') + '</div>' +
          '<button id="agency-ok" style="' + BTN + 'width:100%;padding:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:15px;">확인</button></div>';
      }
      ov.querySelector('#agency-ok').onclick = function () { ov.remove(); renderAgency(); };
    }, 1400);
  }

  window.openAgency = openAgency;
  window.__agencyTest = { cardBonus: cardBonus, debutChance: debutChance, rollDebut: rollDebut, claimable: claimable, dupsByGrade: dupsByGrade, load: load, CONST: { DEBUT_BASE: DEBUT_BASE, PITY_STEP: PITY_STEP, PITY_HARD: PITY_HARD } };

  // ── 광장 메뉴에 버튼 붙이기 ──
  (function hookSquareMenu() {
    var anchor = document.getElementById('btn-fanclub-square');
    if (!anchor || typeof PLACE_BUTTONS === 'undefined' || typeof ALL_PLACE_BTNS === 'undefined' || typeof CARDS === 'undefined' || typeof CHARS === 'undefined') { setTimeout(hookSquareMenu, 50); return; }
    if (document.getElementById('btn-agency-square')) return;
    var b = document.createElement('button');
    b.id = 'btn-agency-square';
    b.textContent = '🎤 기획사';
    b.style.cssText = 'display:none;width:100%;padding:14px;margin-top:10px;background:rgba(255,107,157,0.2);border:1.5px solid #FF6B9D;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;' + FONT;
    b.onclick = openAgency;
    anchor.insertAdjacentElement('afterend', b);
    if (PLACE_BUTTONS.square.indexOf('btn-agency-square') === -1) PLACE_BUTTONS.square.push('btn-agency-square');
    if (ALL_PLACE_BTNS.indexOf('btn-agency-square') === -1) ALL_PLACE_BTNS.push('btn-agency-square');
  })();
})();
