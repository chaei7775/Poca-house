// ════════════════════════════════
// 💎 프리미엄 카드 (premium-cards.js)
//
//  - 방송국 앞 원정에서 모은 '프리미엄 조각' 100개로 프리미엄 카드 1장을 랜덤으로 받는다 (6명 중)
//  - 같은 카드가 또 나오면 '같은 카드'로 보관된다. 강화에 성공할 때 같은 카드를 흡수해야 레벨이 오른다 (Lv.1 → Lv.10).
//  - 강화: 코인 + 같은 카드 흡수 (강화석은 안 씀). 실패해도 카드는 안 사라지고 재료만 소모된다.
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
  var ENH_DUP = [1, 1, 1, 1, 1, 2, 2, 2, 3];   // 강화 성공 시 흡수되는 같은 카드 수 (Lv.1→2 ... 9→10)
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
  function dupOf(id) { var d = load(); return Math.max(0, Math.floor(Number(d[id] && d[id].dup) || 0)); }

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
      kind = 'dup';   // 이미 있는 카드: 같은 카드로 보관 (강화에 흡수됨)
      d[c.id].dup = dupOf(c.id) + 1;
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
      '<div style="margin-top:4px;color:#aaa;font-size:11px;">' + c.name + ' · 히든카드에 장착하면 어떤 멤버로 나가도 적용돼요</div></div>';
  }

  function showReveal(c, kind, lv) {
    var old = $('pc-reveal'); if (old) old.remove();
    var o = document.createElement('div');
    o.id = 'pc-reveal';
    o.style.cssText = 'position:fixed;inset:0;z-index:1500;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;';
    var head = kind === 'new' ? '🎉 프리미엄 카드 획득!' : '✨ 같은 카드가 나왔어요 · 강화 재료로 보관돼요 (보유 ' + dupOf(c.id) + '장)';
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
  function bagStone() {
    if (typeof bagItems === 'undefined') return 0;
    var it = bagItems.find(function (i) { return i.name === '강화석'; });
    return it ? Math.max(0, Math.floor(Number(it.qty) || 0)) : 0;
  }
  function stones() { return bagStone() + loadEnh().stone; }
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
    var i = lv - 1, needCoin = ENH_COIN[i];
    var needDup = ENH_DUP[i];
    if (dupOf(c.id) < needDup) { toast('같은 카드가 부족해요! (' + dupOf(c.id) + '/' + needDup + ') 같은 카드가 또 나오면 모여요'); return null; }
    if (nowCoins() < needCoin) { toast('코인이 부족해요! 🍔 ' + fmt(needCoin) + ' 필요'); return null; }
    if (typeof coins !== 'undefined') coins -= needCoin;
    var ok = Math.random() * 100 < ENH_RATE[i];
    if (ok) { d[c.id].lv = lv + 1; d[c.id].dup = Math.max(0, (d[c.id].dup || 0) - needDup); save(d); }
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
      var i = lv - 1, cn = nowCoins();
      cost = '<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:10px;">' +
        '<span style="color:' + (cn >= ENH_COIN[i] ? '#fff' : '#ff8a8a') + ';">🍔 ' + fmt(ENH_COIN[i]) + '</span>' +
        '<span style="color:#FFD700;">성공 ' + ENH_RATE[i] + '%</span></div>' +
        '<div style="font-size:12px;margin-top:6px;color:' + (dupOf(c.id) >= ENH_DUP[i] ? '#fff' : '#ff8a8a') + ';">🃏 같은 카드 ' + dupOf(c.id) + ' / ' + ENH_DUP[i] + ' <span style="color:#aaa;font-size:10px;">(강화에 성공하면 흡수돼요)</span></div>' +
        '<div style="font-size:10px;color:#aaa;margin-top:4px;">실패해도 카드와 같은 카드는 안 사라지고 코인만 사라져요</div>';
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
      '<div style="font-size:10px;color:#aaa;margin-top:6px;text-align:center;">' + c.name + ' · 히든카드에 장착하면 어떤 멤버로 나가도 적용돼요</div>' +
      '<div id="pc-result" style="min-height:22px;text-align:center;font-size:14px;font-weight:900;margin:8px 0;"></div>' +
      (lv < MAX_LV ? '<button id="pc-enh" style="width:100%;padding:13px;border:none;border-radius:13px;font-size:15px;font-weight:900;color:#fff;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;background:linear-gradient(135deg,#FF6B9D,#C084FC);">⚒️ 강화하기 (Lv.' + lv + ' → Lv.' + (lv + 1) + ')</button>' : '<div style="text-align:center;color:#FFD700;font-weight:900;font-size:14px;">✨ 최대 레벨이에요</div>') +
      '<button id="pc-reveal-ok" style="width:100%;margin-top:8px;padding:11px;border:none;border-radius:13px;background:rgba(255,255,255,.14);color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">닫기</button></div>';
    document.body.appendChild(o);
    $('pc-reveal-ok').onclick = function () { o.remove(); render(); if (window.__pcAfterClose) window.__pcAfterClose(); };
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
    o.onclick = function (e) { if (e.target === o) { o.remove(); render(); if (window.__pcAfterClose) window.__pcAfterClose(); } };
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
        '<div style="font-size:11px;color:#aaa;margin-top:8px;line-height:1.5;">6명 중 랜덤으로 1장! 같은 카드가 또 나오면 강화 재료로 모여요. 레벨은 카드를 눌러 같은 카드를 흡수해 강화(최대 Lv.' + MAX_LV + ')! 조각은 🎬 팬덤 원정 · 방송국 앞에서 모아요.</div>' +
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

  // 트레이닝룸(enhance.js) 프리미엄 탭에서 쓰는 목록
  window.premiumTrainingHtml = function () {
    var cells = CARDS.map(function (c) {
      var lv = levelOf(c.id);
      return '<div data-pc-open="' + c.id + '" style="position:relative;cursor:' + (lv ? 'pointer' : 'default') + ';">' +
        '<img src="' + imgUrl(c) + '" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:10px;border:2px solid ' + (lv ? c.color : 'rgba(255,255,255,.15)') + ';' + (lv ? '' : 'filter:grayscale(1) brightness(.25);') + '">' +
        (lv ? '<div style="position:absolute;top:5px;left:5px;background:rgba(0,0,0,.75);color:' + (lv >= MAX_LV ? '#FFD700' : '#fff') + ';font-size:12px;font-weight:900;border-radius:8px;padding:2px 7px;">Lv.' + lv + '</div>'
            : '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#FF6B9D;">미획득</div>') +
        '<div style="text-align:center;font-size:10px;font-weight:900;margin-top:3px;color:' + (lv ? '#fff' : '#666') + ';">' + (lv ? c.name : '???') + '</div></div>';
    }).join('');
    return '<div style="font-size:11px;color:#aaa;line-height:1.6;margin-bottom:12px;">프리미엄 카드는 팬덤 원정 · 방송국 앞에서 조각 ' + GOAL + '개를 모아 받아요. 카드를 눌러 강화하면 그 멤버가 방송국 앞 원정에서 프리미엄 조각을 더 잘 모아요.</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">' + cells + '</div>';
  };
  window.premiumTrainingBind = function (root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-pc-open]'), function (el) {
      el.onclick = function () {
        var c = CARDS.find(function (x) { return x.id === el.getAttribute('data-pc-open'); });
        if (!c) return;
        if (levelOf(c.id) > 0) { ensureStyle(); showViewer(c); }
        else if (typeof showBagToast === 'function') showBagToast('프리미엄 카드를 먼저 받아야 해요');
      };
    });
  };

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

  // ── ✨ 프리미엄 카드 선택권 (소원의 결정으로 얻음): 6명 중 원하는 카드 1장 고르기 ──
  var VOUCHER = '프리미엄 카드 선택권';
  function voucherCount() {
    if (typeof bagItems === 'undefined') return 0;
    var it = bagItems.find(function (i) { return i.name === VOUCHER; });
    return it ? it.qty : 0;
  }
  function openVoucher() {
    if (voucherCount() < 1) { toast('프리미엄 카드 선택권이 없어요!'); return; }
    var old = $('pc-voucher'); if (old) old.remove();
    ensureStyle();
    var o = document.createElement('div'); o.id = 'pc-voucher';
    o.style.cssText = 'position:fixed;inset:0;z-index:1400;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:14px;';
    var cells = CARDS.map(function (c) {
      var lv = levelOf(c.id);
      return '<div data-pick="' + c.id + '" style="cursor:pointer;position:relative;border-radius:12px;overflow:hidden;border:2px solid ' + c.color + ';background:#111;">' +
        '<img src="' + imgUrl(c) + '" style="width:100%;aspect-ratio:3/4;object-fit:cover;display:block;' + (lv ? '' : 'filter:brightness(.85);') + '" onerror="this.style.opacity=0">' +
        '<div style="position:absolute;left:0;right:0;bottom:0;padding:14px 4px 5px;background:linear-gradient(transparent,rgba(0,0,0,.85));text-align:center;font-size:12px;font-weight:900;color:#fff;">' + c.name +
        '<div style="font-size:10px;font-weight:700;color:' + (lv ? '#FFD700' : '#9fe8b0') + ';">' + (lv ? '보유 Lv.' + lv + ' · 같은 카드 ' + dupOf(c.id) + '장' : '🆕 새 카드') + '</div></div></div>';
    }).join('');
    o.innerHTML = '<div style="width:100%;max-width:380px;max-height:94vh;overflow-y:auto;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FFD700;border-radius:20px;padding:18px 14px;text-align:center;">' +
      '<div style="font-size:18px;font-weight:900;color:#FFD700;">✨ 프리미엄 카드 선택권</div>' +
      '<div style="font-size:12px;color:#bbb;margin:4px 0 12px;">원하는 카드 1장을 골라요 (이미 가진 카드는 강화 재료로 모여요)</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' + cells + '</div>' +
      '<button id="pc-voucher-x" style="margin-top:14px;width:100%;padding:11px;border:none;border-radius:12px;background:rgba(255,255,255,.08);color:#aaa;font-size:13px;cursor:pointer;font-family:inherit;">닫기</button></div>';
    document.body.appendChild(o);
    $('pc-voucher-x').onclick = function () { o.remove(); };
    Array.prototype.forEach.call(o.querySelectorAll('[data-pick]'), function (el) {
      el.onclick = function () {
        var c = CARDS.find(function (x) { return x.id === el.getAttribute('data-pick'); });
        if (!c) return;
        var has = levelOf(c.id) > 0;
        if (has && !window.confirm(c.name + ' 카드는 이미 있어요. 그래도 선택할까요? (같은 카드로 보관돼요)')) return;
        if (!window.confirm(c.name + ' 카드로 정할까요?')) return;
        if (typeof useFromBag !== 'function' || !useFromBag(VOUCHER, 1)) { toast('선택권을 쓰지 못했어요'); return; }
        var d = load(), kind;
        if (!has) { d[c.id] = { lv: 1 }; kind = 'new'; }
        else { kind = 'dup'; d[c.id].dup = dupOf(c.id) + 1; }
        save(d);
        o.remove();
        var bo = $('bag-detail-overlay'); if (bo) bo.remove();
        if (typeof renderBag === 'function') { try { renderBag(); } catch (e) {} }
        showReveal(c, kind, (d[c.id] && d[c.id].lv) || 1);
      };
    });
  }
  window.usePremiumVoucher = openVoucher;

  // 가방에서 선택권을 열면 "카드 고르기" 버튼을 붙인다
  (function hookBagDetail() {
    if (typeof window.showBagItemDetail !== 'function') { setTimeout(hookBagDetail, 100); return; }
    if (window.__pcBagHooked) return;
    window.__pcBagHooked = true;
    var orig = window.showBagItemDetail;
    window.showBagItemDetail = function (idx) {
      var r = orig.apply(this, arguments);
      try {
        var item = bagItems[idx], ov = $('bag-detail-overlay');
        if (item && item.name === VOUCHER && ov && !ov.querySelector('#pc-voucher-use')) {
          var b = document.createElement('button');
          b.id = 'pc-voucher-use';
          b.textContent = '✨ 카드 고르기';
          b.style.cssText = 'width:100%;padding:12px;margin-bottom:8px;background:linear-gradient(135deg,#FFD700,#F59E0B);border:none;border-radius:12px;color:#1a1a2e;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;';
          b.onclick = function () { openVoucher(); };
          var close = ov.querySelector('button');
          if (close) close.parentNode.insertBefore(b, close); else ov.firstChild.appendChild(b);
        }
      } catch (e) {}
      return r;
    };
  })();

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
        btn.innerHTML = '<span style="font-size:19px;">' + (window.moreIcon ? window.moreIcon('💎') : '💎') + '</span><span>프리미엄 카드</span>';
        btn.onclick = function () { overlay.remove(); openPremium(); };
        grid.appendChild(btn);
      }
      return result;
    };
  })();

  window.__pcTest = { give: function (id, n) { var d = load(); d[id] = { lv: Math.min(MAX_LV, n || 1) }; save(d); }, bonus: getPremiumBonus };
})();
