// ════════════════════════════════
// 🎬 CF 촬영 (cf-shoot.js)
// 광장 메뉴에 "🎬 CF 촬영" 버튼을 붙인다. (game.js / agency.js / special-explore.js는 건드리지 않음)
//
// 1) 의뢰서 고르기: 매일 CF 의뢰서 3장이 들어온다 (가상 브랜드).
//    의뢰서마다 "최소 등급 / 기본 성공률 / 보상"이 다름.
// 2) 출연자: 기획사에서 "데뷔 완료"한 아이돌만 출연 가능. 하루에 1번씩만 촬영.
//    촬영 소품(숲/해변/공원 재료)을 걸면 성공률 증가 (소모됨)
// 3) 생물 게스트: 화보집에 등록된 생물을 같이 출연시키면 성공률 + 보상 보너스 (생물은 소모 안 됨)
// 4) 결과는 카드 이미지로 만든 CF 포스터. 성공하면 "포스터 보관함"에 저장됨.
//
// 값을 바꾸고 싶으면 아래 설정만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var STORAGE_KEY = 'ph_cf';
  var GRADE_ORDER = ['N', 'R', 'SR', 'SSR', 'UR'];
  var GRADE_BONUS = 5;           // 최소 등급보다 1등급 높을 때마다 늘어나는 확률(%p)
  var PROP_BONUS = 6;            // 촬영 소품 1종당 늘어나는 확률(%p)
  var GUEST_BONUS = { normal: 10, rare: 20 };   // 생물 게스트 확률 보너스(%p)
  var GUEST_REWARD_RATE = 0.2;   // 생물 게스트가 나오면 보상 코인 +20%
  var MAX_CHANCE = 95;
  var MIN_CHANCE = 10;
  var STAR_RATE = [0.2, 1, 1.5, 2];   // 별 0(NG)~3개일 때 보상 배율
  var POSTER_MAX = 30;           // 보관함에 저장하는 최대 포스터 수
  var PROPS = [                  // 촬영 소품 (agency와 같은 탐험 재료)
    { name: '고급원목', where: '🌲 숲' },
    { name: '반짝이는조개', where: '🏖️ 해변' },
    { name: '장미꽃', where: '🌸 공원' }
  ];

  // ── 의뢰서 목록 (브랜드는 전부 가상) ──
  var REQUEST_POOL = [
    { id: 'drink',  brand: '아쿠아블링',   item: '청량 탄산수',   emoji: '🥤', minGrade: 'R',   base: 60, reward: 800,  copy: '한 모금에 여름이 터진다!' },
    { id: 'cream',  brand: '글로우밀크',   item: '수분 크림',     emoji: '🧴', minGrade: 'SR',  base: 50, reward: 1500, copy: '밤새 빛나는 촉촉함' },
    { id: 'cookie', brand: '달콤구름',     item: '구름 쿠키',     emoji: '🍪', minGrade: 'R',   base: 60, reward: 800,  copy: '한 입 베어 물면 구름 위' },
    { id: 'shoes',  brand: '스텝온',       item: '러닝화',        emoji: '👟', minGrade: 'SR',  base: 50, reward: 1500, copy: '오늘의 한 걸음이 무대가 된다' },
    { id: 'phone',  brand: '리플렉스폰',   item: '스마트폰',      emoji: '📱', minGrade: 'SSR', base: 40, reward: 2500, copy: '내 세상을 한 손에' },
    { id: 'jewel',  brand: '루미에르',     item: '보석 시계',     emoji: '⌚', minGrade: 'SSR', base: 40, reward: 2500, copy: '시간마저 반짝이게' },
    { id: 'coffee', brand: '모닝베어',     item: '캔커피',        emoji: '☕', minGrade: 'N',   base: 65, reward: 600,  copy: '좋은 아침은 여기서부터' },
    { id: 'perfume',brand: '블룸앤문',     item: '향수',          emoji: '🌸', minGrade: 'UR',  base: 35, reward: 4000, copy: '기억에 남는 향기' }
  ];

  // ════════ 순수 로직 (화면 없이도 테스트 가능) ════════
  function gradeIdx(g) { return GRADE_ORDER.indexOf(g); }
  function todayStr(now) {
    var d = new Date(now || Date.now());
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function dailyRequests(day) {          // 같은 날은 항상 같은 3장
    var seed = hashStr(day), pool = REQUEST_POOL.slice(), out = [];
    function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    out.sort(function (a, b) { return gradeIdx(a.minGrade) - gradeIdx(b.minGrade); });
    return out;
  }
  function shootChance(req, bestGrade, propCount, guest) {
    var over = Math.max(0, gradeIdx(bestGrade) - gradeIdx(req.minGrade));
    var c = req.base + over * GRADE_BONUS + propCount * PROP_BONUS;
    if (guest) c += (typeof guest.bonus === 'number') ? guest.bonus : (guest.rare ? GUEST_BONUS.rare : GUEST_BONUS.normal);
    return Math.max(MIN_CHANCE, Math.min(MAX_CHANCE, c));
  }
  function rollStars(chance, rng) {      // 0 = NG, 1~3 = 별
    rng = rng || Math.random;
    var r = rng() * 100;
    if (r >= chance) return 0;
    if (r < chance * 0.3) return 3;
    if (r < chance * 0.65) return 2;
    return 1;
  }
  function rewardCoins(req, stars, guest) {
    var v = req.reward * STAR_RATE[stars];
    if (guest && stars > 0) v *= (1 + GUEST_REWARD_RATE);
    return Math.floor(v);
  }

  // ════════ 저장 ════════
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!Array.isArray(s.posters)) s.posters = [];
    var today = todayStr();
    if (!s.day || s.day !== today) { s.day = today; s.reqDone = {}; s.charDone = {}; }   // 매일 초기화
    if (!s.reqDone) s.reqDone = {};
    if (!s.charDone) s.charDone = {};
    return s;
  }
  function save(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {} }

  // ════════ 게임 데이터 읽기 ════════
  function agencyState() {
    try { return window.__agencyTest && window.__agencyTest.load ? window.__agencyTest.load() : { done: {} }; } catch (e) { return { done: {} }; }
  }
  function debutedIds() {
    var done = agencyState().done || {};
    return Object.keys(done).filter(function (cid) { return done[cid] && typeof CHARS !== 'undefined' && CHARS[cid]; });
  }
  function ownedCards(cid) {
    return CARDS.filter(function (c) { return c.charId === cid && owned.indexOf(c.id) !== -1; });
  }
  function bestCard(cid) {
    var list = ownedCards(cid).sort(function (a, b) { return gradeIdx(b.grade) - gradeIdx(a.grade); });
    return list[0] || null;
  }
  function bagQty(name) {
    var it = (typeof bagItems !== 'undefined' ? bagItems : []).find(function (i) { return i.name === name && i.type === 'material'; });
    return it ? it.qty : 0;
  }
  function emojiOf(name) { return typeof getMaterialEmoji === 'function' ? getMaterialEmoji(name) : '🌿'; }
  // 분양소(kennel.js)에서 분양받은 동물도 게스트로 쓸 수 있음 (id 앞에 k_ 를 붙여 기존 생물과 구분)
  function kennelGuestObj(a) {
    var g = { id: 'k_' + a.id, emoji: a.emoji, name: a.name, rare: false, kennel: a.id };
    var B = window.__kennelBond;            // 친밀도(kennel-bond.js)가 있으면 레벨/보너스를 붙임
    if (B) { var b = B.bonus(a.id); if (typeof b === 'number') g.bonus = b; g.lv = B.level(a.id); }
    return g;
  }
  function guestBonusText() {
    var B = window.__kennelBond;
    return B ? '+' + B.BONUS[0] + '~' + B.BONUS[B.BONUS.length - 1] + '%p · 친밀도 높을수록 ↑' : '+' + GUEST_BONUS.normal + '%p';
  }
  function kennelGuests() {
    var K = window.__kennel; if (!K) return [];
    return K.ANIMALS.filter(function (a) { return (K.got()[a.id] || 0) > 0; }).map(function (a) {
      return kennelGuestObj(a);
    });
  }
  function capturedCreatures() {
    var list = [];
    if (typeof getDexCaptured === 'function' && typeof SPECIAL_CREATURES !== 'undefined') {
      var ids = getDexCaptured();
      list = SPECIAL_CREATURES.filter(function (c) { return ids.indexOf(c.id) !== -1; });
    }
    return list.concat(kennelGuests());
  }
  function creatureById(id) {
    if (typeof id === 'string' && id.indexOf('k_') === 0) {
      return kennelGuests().concat((window.__kennel ? window.__kennel.ANIMALS : []).map(function (a) {
        return kennelGuestObj(a);
      })).find(function (c) { return c.id === id; }) || null;
    }
    if (typeof SPECIAL_CREATURES === 'undefined') return null;
    return SPECIAL_CREATURES.find(function (c) { return c.id === id; }) || null;
  }
  function creatureImg(c, size) {
    if (c.kennel) {
      return '<img src="https://raw.githubusercontent.com/chaei7775/Poca-house/main/kennel/' + c.kennel + '_top.png" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain;" onerror="this.outerHTML=\'' + c.emoji + '\'">';
    }
    return typeof creatureImgHtml === 'function' ? creatureImgHtml(c, size) : '<span style="font-size:' + Math.floor(size * 0.7) + 'px;">' + c.emoji + '</span>';
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }
  function reqById(id) { return REQUEST_POOL.find(function (r) { return r.id === id; }); }

  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var BTN = 'border:none;border-radius:12px;font-weight:900;cursor:pointer;' + FONT;

  function injectStyle() {
    if (document.getElementById('cf-style')) return;
    var st = document.createElement('style');
    st.id = 'cf-style';
    st.textContent =
      '@keyframes cfFlash{0%{opacity:0.95}100%{opacity:0}}' +
      '@keyframes cfPop{0%{transform:scale(0.85);opacity:0}100%{transform:scale(1);opacity:1}}' +
      '@keyframes cfShine{0%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(260%) skewX(-20deg)}}';
    document.head.appendChild(st);
  }

  // ════════ 포스터 그리기 ════════
  function posterHtml(p, animate) {
    var ch = CHARS[p.charId] || { name: '?', gradeColor: '#C084FC', emoji: '🎤' };
    var card = CARDS.find(function (c) { return c.id === p.cardId; });
    var req = reqById(p.reqId) || { brand: p.brand, item: p.item, emoji: '🎬', copy: '' };
    var guest = p.creatureId ? creatureById(p.creatureId) : null;
    var starsTxt = '';
    for (var i = 0; i < 3; i++) starsTxt += i < p.stars ? '⭐' : '☆';
    var frame = p.stars >= 3 ? 'linear-gradient(135deg,#FFD700,#FF6B9D,#C084FC)' : p.stars === 2 ? 'linear-gradient(135deg,#C084FC,#6366F1)' : 'linear-gradient(135deg,#666,#999)';
    var img = card && card.img
      ? '<img src="' + card.img + '" style="width:100%;height:100%;object-fit:cover;object-position:top;display:block;" onerror="this.outerHTML=\'<div style=&quot;font-size:70px;text-align:center;padding-top:60px;&quot;>' + ch.emoji + '</div>\'">'
      : '<div style="font-size:70px;text-align:center;padding-top:60px;">' + ch.emoji + '</div>';
    return '<div style="position:relative;width:100%;max-width:280px;margin:0 auto;padding:6px;border-radius:18px;background:' + frame + ';' + (animate ? 'animation:cfPop 0.5s ease;' : '') + '">' +
      '<div style="position:relative;height:340px;border-radius:13px;overflow:hidden;background:#111;">' + img +
      '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.35) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 55%,rgba(0,0,0,0.8) 100%);"></div>' +
      '<div style="position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;align-items:center;">' +
        '<span style="background:rgba(0,0,0,0.55);color:#fff;font-size:11px;font-weight:900;padding:4px 9px;border-radius:10px;">' + req.emoji + ' ' + esc(req.brand) + '</span>' +
        '<span style="font-size:13px;">' + starsTxt + '</span></div>' +
      (guest ? '<div style="position:absolute;right:8px;bottom:78px;width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.18);border:2px solid #fff;display:flex;align-items:center;justify-content:center;overflow:hidden;">' + creatureImg(guest, 54) + '</div>' : '') +
      '<div style="position:absolute;left:12px;right:12px;bottom:10px;">' +
        '<div style="font-size:15px;font-weight:900;color:#fff;line-height:1.35;text-shadow:0 1px 6px rgba(0,0,0,0.7);">“' + esc(req.copy || '') + '”</div>' +
        '<div style="font-size:11px;color:#ddd;margin-top:4px;">' + esc(ch.name) + ' · ' + esc(p.item || req.item) + (guest ? ' · with ' + esc(guest.name) : '') + '</div></div>' +
      (animate && p.stars >= 3 ? '<div style="position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent);animation:cfShine 1.6s ease 0.4s 1 both;"></div>' : '') +
      (animate ? '<div style="position:absolute;inset:0;background:#fff;animation:cfFlash 0.7s ease-out forwards;pointer-events:none;"></div>' : '') +
      '</div></div>';
  }

  // ════════ CF 허브 (의뢰서 고르기) ════════
  function openCF() {
    if (typeof closePlace === 'function') closePlace();
    injectStyle();
    renderHub();
  }

  function renderHub() {
    var old = document.getElementById('cf-overlay');
    var ov = old || document.createElement('div');
    ov.id = 'cf-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:750;background:linear-gradient(160deg,#150f26,#2a1745);overflow-y:auto;' + FONT;
    var st = load();
    var debuted = debutedIds();
    var reqs = dailyRequests(st.day);

    var noDebut = debuted.length === 0
      ? '<div style="background:rgba(255,107,157,0.15);border:1.5px solid #FF6B9D;border-radius:14px;padding:12px;margin-bottom:14px;font-size:12px;color:#ffd0e0;line-height:1.6;">아직 데뷔한 아이돌이 없어요.<br>🎤 기획사에서 먼저 데뷔시켜야 CF에 출연할 수 있어요!</div>' : '';

    var rows = reqs.map(function (r) {
      var done = !!st.reqDone[r.id];
      return '<div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:14px;margin-bottom:10px;' + (done ? 'opacity:0.45;' : '') + '">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
        '<div style="font-size:34px;">' + r.emoji + '</div>' +
        '<div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:900;color:#fff;">' + esc(r.brand) + ' <span style="font-size:12px;color:#aaa;font-weight:400;">· ' + esc(r.item) + '</span></div>' +
        '<div style="font-size:12px;color:#C084FC;margin-top:3px;">' + r.minGrade + ' 등급 이상 출연자 · 기본 ' + r.base + '%</div>' +
        '<div style="font-size:12px;color:#FFD700;margin-top:2px;">🍔 출연료 ' + r.reward.toLocaleString() + ' (별 3개면 ×' + STAR_RATE[3] + ')</div></div>' +
        (done ? '<div style="font-size:12px;color:#4ade80;font-weight:900;">촬영 완료</div>'
              : '<button data-req="' + r.id + '" style="' + BTN + 'padding:10px 14px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:13px;">선택</button>') +
        '</div></div>';
    }).join('');

    ov.innerHTML = '<div style="max-width:430px;margin:0 auto;padding:18px 16px 40px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
      '<div style="font-size:19px;font-weight:900;color:#fff;">🎬 CF 촬영</div>' +
      '<button id="cf-close" style="' + BTN + 'padding:8px 14px;background:rgba(255,255,255,0.1);color:#fff;font-size:13px;">닫기</button></div>' +
      noDebut +
      '<div style="font-size:13px;font-weight:900;color:#ddd;margin-bottom:8px;">오늘의 의뢰서 <span style="color:#888;font-weight:400;font-size:11px;">(매일 바뀌어요)</span></div>' + rows +
      '<button id="cf-gallery" style="' + BTN + 'width:100%;padding:13px;margin-top:6px;background:rgba(255,255,255,0.08);color:#fff;font-size:14px;">🖼️ 포스터 보관함 (' + st.posters.length + ')</button>' +
      '</div>';
    if (!old) document.body.appendChild(ov);

    ov.querySelector('#cf-close').onclick = function () { ov.remove(); };
    ov.querySelector('#cf-gallery').onclick = openGallery;
    ov.querySelectorAll('[data-req]').forEach(function (b) {
      b.onclick = function () {
        if (!debuted.length) { toast('먼저 기획사에서 아이돌을 데뷔시켜 주세요!'); return; }
        openSetup(b.getAttribute('data-req'));
      };
    });
  }

  // ════════ 촬영 준비 화면 (출연자 + 소품 + 생물 게스트) ════════
  function openSetup(reqId) {
    var req = reqById(reqId);
    if (!req) return;
    var sel = { cid: null, props: {}, guest: null };
    var old = document.getElementById('cf-setup-overlay'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'cf-setup-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:760;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:16px;' + FONT;
    document.body.appendChild(ov);

    function draw() {
      var st = load();
      var debuted = debutedIds();
      var creatures = capturedCreatures();
      var guest = sel.guest ? creatureById(sel.guest) : null;
      var best = sel.cid ? bestCard(sel.cid) : null;
      var propCount = PROPS.filter(function (p) { return sel.props[p.name]; }).length;
      var chance = best ? shootChance(req, best.grade, propCount, guest) : null;
      var ready = !!(sel.cid && best);

      var chars = debuted.map(function (cid) {
        var ch = CHARS[cid], bc = bestCard(cid);
        var shot = !!st.charDone[cid];
        var okGrade = bc && gradeIdx(bc.grade) >= gradeIdx(req.minGrade);
        var disabled = shot || !okGrade;
        var on = sel.cid === cid;
        var why = shot ? '오늘 촬영 끝' : (!okGrade ? req.minGrade + ' 이상 필요' : (bc ? bc.grade : ''));
        return '<button data-cid="' + cid + '"' + (disabled ? ' disabled' : '') + ' style="' + BTN + 'display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;margin-bottom:6px;background:' + (on ? 'rgba(192,132,252,0.35)' : 'rgba(255,255,255,0.07)') + ';border:1.5px solid ' + (on ? '#C084FC' : 'transparent') + ';color:' + (disabled ? '#666' : '#fff') + ';font-size:13px;text-align:left;">' +
          '<span style="font-size:20px;">' + ch.emoji + '</span><span style="flex:1;">' + esc(ch.name) + '</span><span style="font-size:11px;color:' + (disabled ? '#ff8a8a' : '#aaa') + ';">' + why + '</span></button>';
      }).join('') || '<div style="font-size:12px;color:#888;">데뷔한 아이돌이 없어요</div>';

      var propsHtml = PROPS.map(function (p) {
        var have = bagQty(p.name), on = !!sel.props[p.name], can = have >= 1;
        return '<button data-prop="' + p.name + '"' + (!can ? ' disabled' : '') + ' style="' + BTN + 'display:flex;justify-content:space-between;align-items:center;width:100%;padding:8px 10px;margin-bottom:5px;background:' + (on ? 'rgba(255,215,0,0.22)' : 'rgba(255,255,255,0.07)') + ';border:1.5px solid ' + (on ? '#FFD700' : 'transparent') + ';color:' + (can ? '#fff' : '#666') + ';font-size:12px;">' +
          '<span>' + emojiOf(p.name) + ' ' + p.name + ' <span style="color:#888;font-size:10px;">(' + p.where + ')</span></span><span>' + (on ? '✔ 사용 ' : '') + have + '개</span></button>';
      }).join('');

      var guestHtml = creatures.length
        ? '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + creatures.map(function (c) {
            var on = sel.guest === c.id;
            return '<button data-guest="' + c.id + '" style="' + BTN + 'width:58px;padding:5px 2px;background:' + (on ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.07)') + ';border:1.5px solid ' + (on ? '#4ade80' : 'transparent') + ';color:#fff;font-size:10px;">' +
              '<div style="height:40px;display:flex;align-items:center;justify-content:center;">' + creatureImg(c, 38) + '</div>' + (c.rare ? '✨' : '') + esc(c.name) + (c.lv ? '<div style="font-size:9px;color:#4ade80;font-weight:700;">Lv.' + c.lv + '</div>' : '') + '</button>';
          }).join('') + '</div>'
        : '<div style="font-size:12px;color:#888;line-height:1.5;">화보집에 등록된 생물이 없어요.<br>특별탐험에서 생물을 촬영하거나, 연습생 숙소촌 🐾 분양소에서 동물을 분양받으면 게스트로 쓸 수 있어요!</div>';

      ov.innerHTML = '<div style="width:100%;max-width:350px;max-height:92vh;overflow-y:auto;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #C084FC;border-radius:20px;padding:20px 18px;">' +
        '<div style="text-align:center;margin-bottom:12px;"><div style="font-size:30px;">' + req.emoji + '</div><div style="font-size:16px;font-weight:900;color:#fff;">' + esc(req.brand) + ' · ' + esc(req.item) + '</div>' +
        '<div style="font-size:11px;color:#aaa;margin-top:2px;">' + req.minGrade + ' 등급 이상 출연자 필요</div></div>' +
        '<div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:10px 12px;margin-bottom:10px;"><div style="font-size:12px;font-weight:900;color:#C084FC;margin-bottom:6px;">① 출연자</div>' + chars + '</div>' +
        '<div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:10px 12px;margin-bottom:10px;"><div style="font-size:12px;font-weight:900;color:#C084FC;margin-bottom:6px;">② 촬영 소품 <span style="color:#888;font-weight:400;">(1종 +' + PROP_BONUS + '%p · 소모)</span></div>' + propsHtml + '</div>' +
        '<div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:10px 12px;margin-bottom:12px;"><div style="font-size:12px;font-weight:900;color:#C084FC;margin-bottom:6px;">③ 생물 게스트 <span style="color:#888;font-weight:400;">(' + guestBonusText() + ' · 출연료 +' + Math.round(GUEST_REWARD_RATE * 100) + '% · 소모 없음)</span></div>' + guestHtml + '</div>' +
        '<div style="text-align:center;margin-bottom:12px;"><div style="font-size:12px;color:#aaa;">성공 확률</div><div style="font-size:26px;font-weight:900;color:#FFD700;">' + (chance === null ? '–' : chance + '%') + '</div></div>' +
        '<button id="cf-go" style="' + BTN + 'width:100%;padding:14px;margin-bottom:8px;background:' + (ready ? 'linear-gradient(135deg,#FF6B9D,#C084FC)' : 'rgba(255,255,255,0.1)') + ';color:' + (ready ? '#fff' : '#777') + ';font-size:15px;">' + (ready ? '🎬 촬영 시작!' : '출연자를 골라주세요') + '</button>' +
        '<button id="cf-cancel" style="' + BTN + 'width:100%;padding:11px;background:rgba(255,255,255,0.08);color:#aaa;font-size:13px;">닫기</button></div>';

      ov.querySelectorAll('[data-cid]').forEach(function (b) { b.onclick = function () { sel.cid = b.getAttribute('data-cid'); draw(); }; });
      ov.querySelectorAll('[data-prop]').forEach(function (b) {
        b.onclick = function () { var n = b.getAttribute('data-prop'); sel.props[n] = !sel.props[n]; draw(); };
      });
      ov.querySelectorAll('[data-guest]').forEach(function (b) {
        b.onclick = function () { var id = b.getAttribute('data-guest'); sel.guest = sel.guest === id ? null : id; draw(); };
      });
      ov.querySelector('#cf-cancel').onclick = function () { ov.remove(); };
      ov.querySelector('#cf-go').onclick = function () { if (ready) shoot(req, sel, ov); else toast('출연자를 골라주세요!'); };
    }
    draw();
  }

  // ════════ 촬영 ════════
  function shoot(req, sel, ov) {
    var st = load();
    if (st.reqDone[req.id] || st.charDone[sel.cid]) { toast('이미 촬영했어요!'); ov.remove(); renderHub(); return; }
    var card = bestCard(sel.cid);
    if (!card) return;
    var usedProps = PROPS.filter(function (p) { return sel.props[p.name] && bagQty(p.name) >= 1; });
    var guest = sel.guest ? creatureById(sel.guest) : null;

    // 1) 소품은 먼저 쓴다 (닫아도 되돌릴 수 없게)
    usedProps.forEach(function (p) { useFromBag(p.name, 1); });
    // 2) 판정
    var chance = shootChance(req, card.grade, usedProps.length, guest);
    var stars = rollStars(chance);
    var coinsGot = rewardCoins(req, stars, guest);
    coins += coinsGot;
    // 3) 기록
    st.reqDone[req.id] = true;
    st.charDone[sel.cid] = true;
    var poster = null;
    if (stars > 0) {
      poster = { reqId: req.id, brand: req.brand, item: req.item, charId: sel.cid, cardId: card.id, creatureId: guest ? guest.id : null, stars: stars, ts: Date.now() };
      st.posters.unshift(poster);
      if (st.posters.length > POSTER_MAX) st.posters.length = POSTER_MAX;
    }
    save(st);
    if (typeof saveAll === 'function') saveAll();

    ov.innerHTML = '<div style="text-align:center;color:#fff;"><div style="font-size:54px;">🎬</div><div style="font-size:16px;font-weight:900;margin-top:10px;">촬영 중...</div></div>';
    setTimeout(function () {
      var ch = CHARS[sel.cid];
      var head, sub, shown;
      if (stars > 0) {
        head = stars === 3 ? '🎉 대박 CF 완성!' : stars === 2 ? '✨ 멋진 CF 완성!' : '👍 CF 촬영 완료';
        shown = posterHtml(poster, true);
        sub = '<div style="font-size:13px;color:#FFD700;font-weight:900;margin-top:12px;">🍔 출연료 +' + coinsGot.toLocaleString() + '</div>' +
              '<div style="font-size:11px;color:#aaa;margin-top:4px;">포스터 보관함에 저장됐어요' + (guest ? ' · ' + esc(guest.name) + ' 게스트 보너스!' : '') + '</div>';
      } else {
        head = '😢 NG… 촬영 실패';
        shown = '<div style="font-size:60px;margin:10px 0;">🎞️</div>';
        sub = '<div style="font-size:12px;color:#aaa;line-height:1.6;">' + esc(ch.name) + '이(가) 컷을 놓쳤어요…<br>위로금 🍔 ' + coinsGot.toLocaleString() + '만 받았어요</div>';
      }
      if (typeof spawnCoinFloat === 'function') { try { spawnCoinFloat(coinsGot); } catch (e) {} }
      ov.innerHTML = '<div style="width:100%;max-width:330px;max-height:92vh;overflow-y:auto;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid ' + (stars > 0 ? '#FFD700' : '#777') + ';border-radius:20px;padding:22px 18px;text-align:center;">' +
        '<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:12px;">' + head + '</div>' + shown + sub +
        '<button id="cf-ok" style="' + BTN + 'width:100%;padding:13px;margin-top:16px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:15px;">확인</button></div>';
      ov.querySelector('#cf-ok').onclick = function () { ov.remove(); renderHub(); };
    }, 1400);
  }

  // ════════ 포스터 보관함 ════════
  function openGallery() {
    var st = load();
    var old = document.getElementById('cf-gallery-overlay'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'cf-gallery-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:770;background:linear-gradient(160deg,#150f26,#2a1745);overflow-y:auto;' + FONT;
    var body = st.posters.length
      ? st.posters.map(function (p) { return '<div style="margin-bottom:18px;">' + posterHtml(p, false) + '</div>'; }).join('')
      : '<div style="text-align:center;color:#888;font-size:13px;padding:40px 0;">아직 완성된 CF가 없어요.<br>의뢰서를 골라 촬영해 보세요!</div>';
    ov.innerHTML = '<div style="max-width:430px;margin:0 auto;padding:18px 16px 40px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
      '<div style="font-size:19px;font-weight:900;color:#fff;">🖼️ 포스터 보관함 <span style="font-size:12px;color:#aaa;font-weight:400;">(최근 ' + POSTER_MAX + '장)</span></div>' +
      '<button id="cf-gal-close" style="' + BTN + 'padding:8px 14px;background:rgba(255,255,255,0.1);color:#fff;font-size:13px;">닫기</button></div>' + body + '</div>';
    document.body.appendChild(ov);
    ov.querySelector('#cf-gal-close').onclick = function () { ov.remove(); renderHub(); };
  }

  window.openCF = openCF;
  window.__cfTest = { dailyRequests: dailyRequests, shootChance: shootChance, rollStars: rollStars, rewardCoins: rewardCoins, load: load, REQUEST_POOL: REQUEST_POOL };

  // ── 광장 메뉴에 버튼 붙이기 (기획사 버튼 바로 아래) ──
  var hookTries = 0;
  (function hookSquareMenu() {
    hookTries++;
    // 기획사 버튼이 먼저 붙을 때까지 잠깐 기다림 (최대 약 2초) — 없으면 팬클럽 버튼 아래에 붙임
    var anchor = document.getElementById('btn-agency-square') || (hookTries > 40 ? document.getElementById('btn-fanclub-square') : null);
    if (!anchor || typeof PLACE_BUTTONS === 'undefined' || typeof ALL_PLACE_BTNS === 'undefined' || typeof CARDS === 'undefined' || typeof CHARS === 'undefined') { setTimeout(hookSquareMenu, 50); return; }
    if (document.getElementById('btn-cf-square')) return;
    var b = document.createElement('button');
    b.id = 'btn-cf-square';
    b.textContent = '🎬 CF 촬영';
    b.style.cssText = 'display:none;width:100%;padding:14px;margin-top:10px;background:rgba(255,215,0,0.15);border:1.5px solid #FFD700;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;' + FONT;
    b.onclick = openCF;
    anchor.insertAdjacentElement('afterend', b);
    if (PLACE_BUTTONS.square.indexOf('btn-cf-square') === -1) PLACE_BUTTONS.square.push('btn-cf-square');
    if (ALL_PLACE_BTNS.indexOf('btn-cf-square') === -1) ALL_PLACE_BTNS.push('btn-cf-square');
  })();
})();
