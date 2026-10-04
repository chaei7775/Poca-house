// ════════════════════════════════
// 💎 프리미엄 카드 (premium-cards.js)
//
//  - 방송국 앞 원정에서 모은 '프리미엄 조각' 100개로 프리미엄 카드 1장을 랜덤으로 받는다 (6명 중)
//  - 같은 카드가 또 나오면 조각 50개를 돌려받는다. 레벨은 '강화'로만 오른다 (Lv.1 → Lv.10).
//  - 강화: 강화석(히든 강화와 같은 재료) + 코인. 실패해도 카드는 안 사라지고 재료만 소모된다.
//  - 효과는 그 캐릭터로 방송국 앞 원정을 나갈 때만 켜진다
//      스킬   : 이벤트 성공 시 프리미엄 조각이 나올 확률 +2%p (레벨당 +0.5%p)
//      특별효과: 조각이 나왔을 때 일정 확률(10%, 레벨당 +2%p)로 조각 +1개 추가
//  - 더보기 메뉴에 '프리미엄 카드' 칸이 생긴다. 카드 이미지는 repo 맨 위 폴더의 premium-<캐릭터>.jpg
//  - 저장: localStorage 'ph_premiumCards' (ph_ 로 시작해서 기존 클라우드 저장에 같이 들어간다)
// 값을 바꾸고 싶으면 아래 [설정]만 고치면 된다.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var PIECE_NAME = '프리미엄 조각', PIECE_EMOJI = '🖼️';
  var GOAL = 100;            // 카드 1장에 필요한 조각 수
  var MAX_LV = 10;           // 카드 최대 레벨
  var REFUND = 50;           // 같은 카드가 또 나왔을 때 돌려주는 조각 수
  // 강화 (Lv.1 → 2 ... 9 → 10 순서의 값). 히든 강화보다 빡세게 (+10강까지 평균 열흘 정도)
  var ENH_RATE = [100, 85, 75, 65, 55, 45, 35, 28, 20];                 // 성공 확률(%)
  var ENH_STONE = [2, 2, 2, 2, 2, 2, 2, 3, 3];                          // 한 번 도전할 때 내는 강화석
  var ENH_COIN = [5000, 10000, 15000, 20000, 30000, 50000, 75000, 125000, 200000];  // 한 번 도전할 때 내는 코인
  var ENH_KEY = 'ph_enhance';                                           // 강화석이 저장된 곳 (히든 강화와 같은 재료)
  var SKILL_BASE = 0.02, SKILL_STEP = 0.005;    // 스킬: 조각 확률 증가 (기본, 레벨당)
  var EXTRA_BASE = 0.10, EXTRA_STEP = 0.02;     // 특별효과: 조각 +1 확률 (기본, 레벨당)
  var BASE = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/';
  var BUST = '?v=' + Date.now();
  var KEY = 'ph_premiumCards';

  var CARDS = [
    { id: 'minjun', name: '민준', title: '시간의 사서',      skill: '화보의 온도',  effect: '영원의 서고',      color: '#F59E0B' },
    { id: 'sion',   name: '시온', title: '심연의 독주',      skill: '화보의 온도',  effect: '심연의 프레임',    color: '#6366F1' },
    { id: 'doyun',  name: '도윤', title: '스포트라이트의 왕관', skill: '화보의 온도',  effect: '스포트라이트',     color: '#9D6B2A' },
    { id: 'harin',  name: '하린', title: '달빛의 세레나데',  skill: '달빛의 선율',  effect: '마음을 울리는 목소리', color: '#7C3AED' },
    { id: 'yuna',   name: '윤아', title: '봄의 여왕',        skill: '화보의 온도',  effect: '화보 조각의 유혹', color: '#EC4899' },
    { id: 'ara',    name: '아라', title: '붉은 달의 무희',   skill: '화보의 온도',  effect: '화보 조각의 유혹', color: '#DC2626' }
  ];

  function $(id) { return document.getElementById(id); }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }
  function imgUrl(c) { return BASE + 'premium-' + c.id + '.jpg' + BUST; }

  // ── 저장 ──
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    if (typeof saveAll === 'function') { try { saveAll(); } catch (e) {} }
  }
  function levelOf(id) { var d = load(); return (d[id] && d[id].lv) || 0; }

  function pieceCount() {
    if (typeof bagItems === 'undefined') return 0;
    var it = bagItems.find(function (i) { return i.name === PIECE_NAME; });
    return it ? it.qty : 0;
  }

  // ── 방송국 앞 원정에서 가져다 쓰는 효과 값 ──
  function getPremiumBonus(charId) {
    var c = CARDS.find(function (x) { return x.id === charId; });
    var lv = levelOf(charId);
    if (!c || lv <= 0) return null;
    return {
      lv: lv, name: c.name, skillName: c.skill, effectName: c.effect,
      skill: SKILL_BASE + (lv - 1) * SKILL_STEP,
      extra: EXTRA_BASE + (lv - 1) * EXTRA_STEP
    };
  }
  window.getPremiumBonus = getPremiumBonus;

  // ── 교환 ──
  function exchange() {
    if (pieceCount() < GOAL) { toast('프리미엄 조각이 부족해요! (' + pieceCount() + '/' + GOAL + ')'); return; }
    if (typeof useFromBag === 'function') useFromBag(PIECE_NAME, GOAL);
    var c = CARDS[Math.floor(Math.random() * CARDS.length)];
    var d = load();
    var cur = (d[c.id] && d[c.id].lv) || 0;
    var kind;
    if (cur === 0) { d[c.id] = { lv: 1 }; kind = 'new'; }
    else {
      kind = 'dup';   // 이미 있는 카드: 조각 일부를 돌려받음 (레벨은 강화로만 올라감)
      if (typeof addToBag === 'function') addToBag(PIECE_EMOJI, PIECE_NAME, 'piece', REFUND, '프리미엄 카드 조각 · ' + GOAL + '개를 모으면 프리미엄 카드 1장');
    }
    save(d);
    showReveal(c, kind, (d[c.id] && d[c.id].lv) || 1);
    render();
  }

  // ── 화면 ──
  function ensureStyle() {
    if ($('pc-style')) return;
    var st = document.createElement('style');
    st.id = 'pc-style';
    st.textContent =
      '@keyframes pcIn{0%{opacity:0;transform:scale(.6) rotate(-4deg)}60%{opacity:1;transform:scale(1.05) rotate(1deg)}100%{opacity:1;transform:scale(1) rotate(0)}}' +
      '@keyframes pcGlow{0%,100%{box-shadow:0 0 18px #FFD70088}50%{box-shadow:0 0 34px #FFD700cc}}' +
      '@keyframes pcShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}';
    document.head.appendChild(st);
  }

  function effectLines(c, lv) {
    var skill = (SKILL_BASE + (lv - 1) * SKILL_STEP) * 100;
    var extra = (EXTRA_BASE + (lv - 1) * EXTRA_STEP) * 100;
    return '<div style="text-align:left;font-size:12px;line-height:1.55;color:#eee;">' +
      '<div><b style="color:#FFD700;">📸 ' + c.skill + '</b> · 방송국 앞 이벤트 성공 시 프리미엄 조각 확률 +' + skill.toFixed(1).replace('.0', '') + '%p</div>' +
      '<div style="margin-top:4px;"><b style="color:#7dd3fc;">🎬 ' + c.effect + '</b> · 조각이 나오면 ' + extra.toFixed(0) + '% 확률로 +1개 추가</div>' +
      '<div style="margin-top:4px;color:#aaa;font-size:11px;">' + c.name + '으로 방송국 앞 원정을 나갈 때 적용돼요</div></div>';
  }

  function showReveal(c, kind, lv) {
    var old = $('pc-reveal'); if (old) old.remove();
    var o = document.createElement('div');
    o.id = 'pc-reveal';
    o.style.cssText = 'position:fixed;inset:0;z-index:1500;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;';
    var head = kind === 'new' ? '🎉 프리미엄 카드 획득!' : '✨ 이미 가진 카드예요 · 조각 ' + REFUND + '개 환급';
    o.innerHTML =
      '<div style="font-size:18px;font-weight:900;color:#FFD700;margin-bottom:10px;text-align:center;">' + head + '</div>' +
      '<img src="' + imgUrl(c) + '" style="max-height:62vh;max-width:88%;border-radius:14px;border:2px solid #FFD700;animation:pcIn .6s ease-out,pcGlow 2s ease-in-out infinite;">' +
      '<div style="margin:10px 0 12px;width:100%;max-width:340px;">' + effectLines(c, lv) + '</div>' +
      '<button id="pc-reveal-ok" style="padding:12px 40px;border:none;border-radius:14px;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#1a1a2e;font-size:15px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">확인</button>';
    document.body.appendChild(o);
    $('pc-reveal-ok').onclick = function () { o.remove(); };
  }

  // ── 강화석 / 코인 ──
  function loadEnh() {
    var st = null;
    try { st = JSON.parse(localStorage.getItem(ENH_KEY) || 'null'); } catch (e) {}
    if (!st || typeof st !== 'object') st = {};
    ['stone', 'protect', 'trans'].forEach(function (k) { st[k] = Math.max(0, Math.floor(Number(st[k]) || 0)); });
    if (!st.level || typeof st.level !== 'object') st.level = {};
    if (!st.stage || typeof st.stage !== 'object') st.stage = {};
    return st;
  }
  function stones() { return loadEnh().stone; }
  function nowCoins() { return (typeof coins !== 'undefined') ? coins : 0; }
  function fmt(n) { return Number(n).toLocaleString(); }

  function statAt(lv) {
    return { skill: (SKILL_BASE + (lv - 1) * SKILL_STEP) * 100, extra: (EXTRA_BASE + (lv - 1) * EXTRA_STEP) * 100 };
  }
  function num1(v) { return (Math.round(v * 10) / 10).toString(); }

  // 강화 한 번: 성공 확률은 ENH_RATE, 실패해도 레벨/카드는 그대로 (재료만 소모)
  function tryEnhance(c) {
    var d = load(), lv = (d[c.id] && d[c.id].lv) || 0;
    if (lv < 1 || lv >= MAX_LV) return null;
    var i = lv - 1, needStone = ENH_STONE[i], needCoin = ENH_COIN[i];
    var st = loadEnh();
    if (st.stone < needStone) { toast('강화석이 부족해요! (' + st.stone + '/' + needStone + ')'); return null; }
    if (nowCoins() < needCoin) { toast('코인이 부족해요! 🍔 ' + fmt(needCoin) + ' 필요'); return null; }
    st.stone -= needStone;
    try { localStorage.setItem(ENH_KEY, JSON.stringify(st)); } catch (e) {}
    if (typeof coins !== 'undefined') coins -= needCoin;
    var ok = Math.random() * 100 < ENH_RATE[i];
    if (ok) { d[c.id].lv = lv + 1; save(d); }
    else if (typeof saveAll === 'function') { try { saveAll(); } catch (e) {} }
    if (typeof updateCoinsDisplay === 'function') { try { updateCoinsDisplay(); } catch (e) {} }
    return { ok: ok, from: lv, to: ok ? lv + 1 : lv };
  }

  // 숫자가 올라가는 연출
  function countUp(el, from, to, suffix, ms) {
    if (!el) return;
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / ms);
      el.textContent = num1(from + (to - from) * k) + suffix;
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function showViewer(c, anim) {
    var lv = levelOf(c.id);
    var old = $('pc-reveal'); if (old) old.remove();
    var o = document.createElement('div');
    o.id = 'pc-reveal';
    o.style.cssText = 'position:fixed;inset:0;z-index:1500;background:rgba(0,0,0,.92);overflow-y:auto;display:flex;flex-direction:column;align-items:center;padding:14px 16px 24px;';
    var cur = statAt(lv), nxt = lv < MAX_LV ? statAt(lv + 1) : null;
    var bar = '';
    for (var k = 1; k <= MAX_LV; k++) bar += '<div style="flex:1;height:9px;border-radius:5px;background:' + (k <= lv ? 'linear-gradient(90deg,#FFD700,#FF9F43)' : 'rgba(255,255,255,.15)') + ';"></div>';
    var cost = '';
    if (lv < MAX_LV) {
      var i = lv - 1, s = stones(), cn = nowCoins();
      cost = '<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:10px;">' +
        '<span style="color:' + (s >= ENH_STONE[i] ? '#fff' : '#ff8a8a') + ';">🔨 강화석 ' + s + ' / ' + ENH_STONE[i] + '</span>' +
        '<span style="color:' + (cn >= ENH_COIN[i] ? '#fff' : '#ff8a8a') + ';">🍔 ' + fmt(ENH_COIN[i]) + '</span>' +
        '<span style="color:#FFD700;">성공 ' + ENH_RATE[i] + '%</span></div>' +
        '<div style="font-size:10px;color:#aaa;margin-top:4px;">실패해도 카드는 안 사라지고 재료만 사라져요</div>';
    }
    function row(label, from, to, id, suffix) {
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;font-size:13px;">' +
        '<span style="color:#ddd;">' + label + '</span>' +
        (nxt ? '<span><b id="' + id + '" style="color:#fff;font-size:15px;">' + num1(from) + suffix + '</b> <span style="color:#4ade80;font-weight:900;">▲ ' + num1(to) + suffix + '</span></span>'
             : '<span><b id="' + id + '" style="color:#FFD700;font-size:15px;">' + num1(from) + suffix + '</b> <span style="color:#FFD700;font-size:11px;">MAX</span></span>') + '</div>';
    }
    o.innerHTML =
      '<div style="width:100%;max-width:360px;">' +
      '<div style="text-align:center;font-size:15px;font-weight:900;color:' + c.color + ';margin-bottom:8px;">' + c.name + ' · ' + c.title + '</div>' +
      '<div style="position:relative;text-align:center;"><img id="pc-detail-img" src="' + imgUrl(c) + '" style="max-height:44vh;max-width:78%;border-radius:14px;border:2px solid ' + c.color + ';">' +
      '<div id="pc-lvbadge" style="position:absolute;top:8px;right:11%;background:rgba(0,0,0,.75);color:#FFD700;font-size:14px;font-weight:900;border-radius:10px;padding:3px 9px;">Lv.' + lv + '</div></div>' +
      '<div style="display:flex;gap:3px;margin:12px 0 8px;">' + bar + '</div>' +
      '<div style="background:rgba(255,255,255,.07);border-radius:14px;padding:8px 14px;">' +
        row('📸 ' + c.skill + ' (조각 확률)', cur.skill, nxt ? nxt.skill : cur.skill, 'pc-v-skill', '%p') +
        row('🎬 ' + c.effect + ' (조각 +1 확률)', cur.extra, nxt ? nxt.extra : cur.extra, 'pc-v-extra', '%') +
      '</div>' + cost +
      '<div style="font-size:10px;color:#aaa;margin-top:6px;text-align:center;">' + c.name + '으로 방송국 앞 원정을 나갈 때 적용돼요</div>' +
      '<div id="pc-result" style="min-height:22px;text-align:center;font-size:14px;font-weight:900;margin:8px 0;"></div>' +
      (lv < MAX_LV ? '<button id="pc-enh" style="width:100%;padding:13px;border:none;border-radius:13px;font-size:15px;font-weight:900;color:#fff;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;background:linear-gradient(135deg,#FF6B9D,#C084FC);">⚒️ 강화하기 (Lv.' + lv + ' → Lv.' + (lv + 1) + ')</button>' : '<div style="text-align:center;color:#FFD700;font-weight:900;font-size:14px;">✨ 최대 레벨이에요</div>') +
      '<button id="pc-reveal-ok" style="width:100%;margin-top:8px;padding:11px;border:none;border-radius:13px;background:rgba(255,255,255,.14);color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">닫기</button></div>';
    document.body.appendChild(o);
    $('pc-reveal-ok').onclick = function () { o.remove(); render(); };
    var eb = $('pc-enh');
    if (eb) eb.onclick = function () {
      var r = tryEnhance(c);
      if (!r) return;
      showViewer(c, r);   // 같은 화면을 새 레벨로 다시 그리며 결과 연출
    };
    // 방금 강화한 결과 연출
    if (anim) {
      var res = $('pc-result'), img = $('pc-detail-img'), badge = $('pc-lvbadge');
      var before = statAt(anim.from), after = statAt(anim.to);
      if (anim.ok) {
        if (res) { res.style.color = '#4ade80'; res.textContent = '✨ 강화 성공! Lv.' + anim.from + ' → Lv.' + anim.to; }
        if (img) img.style.animation = 'pcGlow 1.2s ease-in-out 2';
        if (badge) badge.style.animation = 'pcIn .6s ease-out';
        countUp($('pc-v-skill'), before.skill, after.skill, '%p', 700);
        countUp($('pc-v-extra'), before.extra, after.extra, '%', 700);
      } else {
        if (res) { res.style.color = '#ff8a8a'; res.textContent = '💔 강화 실패… 재료만 사라졌어요'; }
        if (img) img.style.animation = 'pcShake .4s';
      }
    }
    o.onclick = function (e) { if (e.target === o) { o.remove(); render(); } };
  }

  function render() {
    var box = $('pc-body');
    if (!box) return;
    var n = pieceCount();
    var can = n >= GOAL;
    var pct = Math.min(100, Math.round(n / GOAL * 100));
    var owned = CARDS.filter(function (c) { return levelOf(c.id) > 0; }).length;
    var grid = CARDS.map(function (c) {
      var lv = levelOf(c.id);
      return '<div class="pc-card" data-id="' + c.id + '" style="position:relative;cursor:' + (lv ? 'pointer' : 'default') + ';">' +
        '<img src="' + imgUrl(c) + '" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:10px;border:2px solid ' + (lv ? c.color : 'rgba(255,255,255,.15)') + ';' + (lv ? '' : 'filter:grayscale(1) brightness(.25);') + '">' +
        (lv ? '<div style="position:absolute;top:5px;right:5px;background:rgba(0,0,0,.7);color:#FFD700;font-size:10px;font-weight:900;border-radius:8px;padding:2px 6px;">Lv.' + lv + '</div>'
            : '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:30px;color:#888;">?</div>') +
        '<div style="text-align:center;font-size:11px;font-weight:900;margin-top:4px;color:' + (lv ? '#fff' : '#666') + ';">' + (lv ? c.name : '???') + '</div></div>';
    }).join('');
    box.innerHTML =
      '<div style="background:rgba(255,255,255,.06);border:1.5px solid rgba(255,215,0,.35);border-radius:16px;padding:14px;margin-bottom:14px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;"><div style="font-size:14px;font-weight:900;">' + PIECE_EMOJI + ' ' + PIECE_NAME + '</div>' +
        '<div style="font-size:15px;font-weight:900;color:#7dd3fc;">' + n + ' / ' + GOAL + '</div></div>' +
        '<div style="height:12px;border-radius:6px;background:rgba(255,255,255,.12);overflow:hidden;margin-bottom:12px;"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#7dd3fc,#C084FC);"></div></div>' +
        '<button id="pc-exchange" style="width:100%;padding:13px;border:none;border-radius:13px;font-size:15px;font-weight:900;color:#fff;cursor:' + (can ? 'pointer' : 'default') + ';font-family:\'Noto Sans KR\',sans-serif;background:' + (can ? 'linear-gradient(135deg,#FF6B9D,#C084FC)' : 'rgba(255,255,255,.12)') + ';">' +
        (can ? '💎 프리미엄 카드 받기 (조각 ' + GOAL + '개)' : '조각 ' + (GOAL - n) + '개 더 필요해요') + '</button>' +
        '<div style="font-size:11px;color:#aaa;margin-top:8px;line-height:1.5;">6명 중 랜덤으로 1장! 같은 카드가 또 나오면 조각 ' + REFUND + '개를 돌려줘요. 레벨은 카드를 눌러 강화(최대 Lv.' + MAX_LV + ')! 조각은 🎬 팬덤 원정 · 방송국 앞에서 모아요.</div>' +
      '</div>' +
      '<div style="font-size:13px;font-weight:900;margin-bottom:8px;">내 프리미엄 카드 (' + owned + '/' + CARDS.length + ')</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">' + grid + '</div>';
    var ex = $('pc-exchange');
    if (ex) ex.onclick = function () { if (can) exchange(); else toast('프리미엄 조각이 부족해요! (' + n + '/' + GOAL + ')'); };
    Array.prototype.forEach.call(box.querySelectorAll('.pc-card'), function (el) {
      el.onclick = function () {
        var c = CARDS.find(function (x) { return x.id === el.getAttribute('data-id'); });
        if (c && levelOf(c.id) > 0) showViewer(c);
      };
    });
  }

  function openPremium() {
    ensureStyle();
    var old = $('premium-overlay'); if (old) old.remove();
    var o = document.createElement('div');
    o.id = 'premium-overlay';
    o.style.cssText = 'position:fixed;top:0;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;z-index:900;background:linear-gradient(180deg,#1a1230,#0d0820);color:#fff;display:flex;flex-direction:column;font-family:\'Noto Sans KR\',sans-serif;';
    o.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:rgba(0,0,0,.45);flex-shrink:0;">' +
      '<div style="font-size:17px;font-weight:900;">💎 프리미엄 카드</div>' +
      '<button id="pc-close" style="background:rgba(255,255,255,.15);border:none;border-radius:10px;color:#fff;padding:7px 13px;font-size:13px;font-weight:700;cursor:pointer;">닫기</button></div>' +
      '<div id="pc-body" style="flex:1;overflow-y:auto;padding:16px;padding-bottom:40px;"></div>';
    document.body.appendChild(o);
    $('pc-close').onclick = function () { o.remove(); };
    render();
  }
  window.openPremiumCards = openPremium;

  // ── 더보기 메뉴에 칸 추가 (다른 파일들과 같은 방식) ──
  (function hookMore() {
    if (typeof window.openMoreMenu !== 'function') { setTimeout(hookMore, 50); return; }
    if (window.__pcMoreHooked) return;
    window.__pcMoreHooked = true;
    var orig = window.openMoreMenu;
    window.openMoreMenu = function () {
      var result = orig.apply(this, arguments);
      var overlay = $('more-menu-overlay');
      var grid = overlay && overlay.querySelector('#more-menu-grid');
      if (grid && !$('more-menu-premium-btn')) {
        var btn = document.createElement('button');
        btn.id = 'more-menu-premium-btn';
        btn.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;aspect-ratio:0.95;padding:6px 4px;background:#FFD7001f;border:1.5px solid #FFD700;border-radius:12px;color:#fff;font-size:10px;font-weight:700;line-height:1.2;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;text-align:center;';
        btn.innerHTML = '<span style="font-size:19px;">💎</span><span>프리미엄 카드</span>';
        btn.onclick = function () { overlay.remove(); openPremium(); };
        grid.appendChild(btn);
      }
      return result;
    };
  })();

  window.__pcTest = { give: function (id, n) { var d = load(); d[id] = { lv: Math.min(MAX_LV, n || 1) }; save(d); }, bonus: getPremiumBonus };
})();
