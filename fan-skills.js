// ════════════════════════════════
// 💖 팬 응대 스킬 (fan-skills.js)
//
// 팬덤 원정 맵(방송국 앞 / 팬미팅장 / 공연장)에서 쓰는 '멤버 스킬'.
// ★ 이 파일은 새 broadcast-expedition.js (끝에 window.__bcHook 이 추가된 버전)와 같이 써야 한다.
//
// 방식
//  - 맵에 떠 있는 이벤트(❗ 셔터 / 💌 팬레터 / 🎁 굿즈 / 🌟 황금 셔터 / 🚨 특별 NPC) 머리 위에 좋아하는 스킬 말풍선이 뜬다.
//  - 이벤트 가까이(미니게임이 열리기 전 거리) 걸어가서 아래 스킬 버튼을 누르면
//      이펙트가 나오고 미니게임 없이 바로 결과가 나온다 (스태미나는 똑같이 듦)
//      😊 만족   : 셔터 GREAT / 팬레터·굿즈 기본 보상 / 특별 NPC 아깝다(PARTIAL)
//      😍 대만족 : 셔터 PERFECT / 팬레터·굿즈 보상 업그레이드(코인·EXP×2, 재료+1, 조각 확률) / 특별 NPC 촬영 성공
//  - (옛 broadcast-expedition.js 라서 문이 없으면 예전처럼 이벤트 뒤에 팬이 따로 찾아오는 방식으로 동작)
//  - 팬 가까이 걸어가서 아래 스킬 버튼을 누르면 이펙트가 나오고 팬이 떠난다.
//      좋아하는 스킬 = 😍 대만족 (보상 ×2 + 프리미엄 조각 보너스 확률) / 다른 스킬 = 😊 만족
//      팬은 아직 못 배운 스킬(🔒)도 원한다 → 스킬을 많이 배울수록 대만족이 자주 나온다
//  - 스킬은 멤버(캐릭터)마다 따로 코인으로 산다.
//      더보기 > 💖 팬 스킬 상점 / 맵에서 잠긴 스킬 버튼을 눌러도 살 수 있음
//      ✍️ 사인해주기 · 📸 사진촬영 (처음부터)  /  🤝 악수 · 💗 손하트 (구매)
//  - 스킬은 스태미나를 안 쓰고 쿨타임만 있다.
//
// 저장: localStorage 'ph_fanskills' (이 기기에만 저장됨)
// 값을 바꾸고 싶으면 아래 [설정]만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var STORE_KEY = 'ph_fanskills';
  var FAN_TTL = 40;              // 팬이 기다려주는 시간(초)
  var FAN_MAX = 2;               // 맵에 동시에 있을 수 있는 팬 수
  var SPAWN_CHANCE = 1;          // 이벤트 끝날 때 팬이 찾아올 확률 (1 = 100%)
  var FAN_RANGE = 95;            // 이 거리(px) 안에 있어야 스킬이 먹힘
  var COOLDOWN = 3;              // 스킬 쿨타임(초) — 스킬마다 따로 돈다
  var COIN_BASE = 20;            // '만족' 코인 기본값 (아래 맵 코인 배율을 곱함)
  var EXP_BASE = 20;             // '만족' 카드 경험치 기본값
  var LOVE_MULT = 2;             // 대만족이면 코인·경험치 몇 배
  var PIECE_CHANCE = 0.10;       // 대만족일 때 🖼️ 프리미엄 조각 +1 확률 (방송국 앞만, 0이면 끔)
  var COIN_MULT = { broadcast_front: 40, fanmeeting: 80, concert: 100 };   // 맵별 코인 배율 (원정 이벤트와 같은 값)
  var PIECE_NAME = '프리미엄 조각', PIECE_EMOJI = '🖼️', PIECE_GOAL = 100;

  var SLOTS = 5;                 // 장착 슬롯 수 (모든 팬덤 원정 맵에서 공통)
  var LOADOUT_KEY = 'ph_skillLoadout';
  var SKILLS = [                 // price = 상점 가격(멤버 1명당 코인). 0이면 처음부터 가지고 있음 / useLv = 쓸 수 있는 플레이어 레벨 / aoe = 광역(reach = 쓸 수 있는 거리)
    { id: 'sign',  name: '사인해주기', short: '사인', icon: '✍️', price: 0,       useLv: 1,  desc: '펜이 반짝! 팬이 제일 좋아하는 기본 스킬' },
    { id: 'photo', name: '사진촬영',   short: '사진', icon: '📸', price: 0,       useLv: 1,  desc: '찰칵! 폴라로이드 한 장을 남겨요' },
    { id: 'shake', name: '악수',       short: '악수', icon: '🤝', price: 300000,  useLv: 10, desc: '손을 맞잡고 반짝이를 터뜨려요' },
    { id: 'heart', name: '손하트',     short: '하트', icon: '💗', price: 1000000, useLv: 15, desc: '하트를 날려서 팬 마음을 저격해요' },
    { id: 'highlight', name: '하이라이트 부르기', short: '하이라이트', icon: '🎤', price: 2000000, useLv: 20, aoe: true, reach: 170, desc: '광역! 주변 팬들을 확 사로잡아요' },
    { id: 'wink',  name: '윙크 샤워',  short: '윙크샤워', icon: '💖', price: 3000000, useLv: 25, aoe: true, reach: 250, desc: '넓은 광역! 넓은 범위에 윙크 세례' },
    { id: 'encore', name: '앵콜 폭죽', short: '앵콜폭죽', icon: '✨', price: 5000000, useLv: 30, aoe: true, reach: 320, desc: '대광역! 전방위 대폭발' },
    { id: 'rose',  name: '장미 세례',  short: '장미세례', icon: '🌹', price: 8000000,  useLv: 35, aoe: true, reach: 360, desc: '초광역! 장미꽃이 쏟아져요 (공항 입국장에선 팬들이 느려져요)' },
    { id: 'finale', name: '피날레 불꽃쇼', short: '불꽃쇼', icon: '🎆', price: 12000000, useLv: 40, aoe: true, reach: 440, desc: '화면 전체급 광역! 불꽃이 터지며 팬들을 확 밀어내요' }
  ];
  var FAV_IDS = ['sign', 'photo', 'shake', 'heart'];   // 팬이 좋아하는 스킬은 기본 4종 중에서만 (광역 스킬은 누구에게나 50% 확률로 대만족)
  var AOE_LOVE = 0.5;
  var SEQ_NORMAL = 1, SEQ_RARE = 2, SEQ_LEGEND = 3;   // 머리 위 스킬 개수: 일반 팬·일반 이벤트 / 레어(황금 셔터) / 특별(NPC)
  var SEQ_LEN = SEQ_NORMAL;
  var STEP_GAIN = 25;            // 단타 스킬 하나가 채우는 하트 게이지(%)
  var AOE_GAIN = 50;             // 광역 스킬이 채우는 하트 게이지(%) — 순서 중 2칸을 건너뜀
  var FANS = [
    { name: '매일 오는 팬', emoji: '🙋‍♀️' },
    { name: '금손 팬',      emoji: '🎨' },
    { name: '포카 수집광',  emoji: '🃏' },
    { name: '공연마다 오는 팬', emoji: '🎤' },
    { name: '고인물 팬',    emoji: '👑' }
  ];
  var BOUNDS = { x0: 0.08, x1: 0.92, y0: 0.22, y1: 0.84 };   // 팬이 나타날 수 있는 범위 (이미지 가로/세로 0~1)

  var F = null;   // 지금 열려 있는 맵 화면의 상태

  // ════════ 도구 ════════
  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }
  function fmt(n) { return Number(n).toLocaleString(); }
  function skillById(id) { return SKILLS.filter(function (s) { return s.id === id; })[0] || null; }
  function sfx(name) { try { if (window.pocaSfx && pocaSfx.play) pocaSfx.play(name); } catch (e) {} }

  // ════════ 저장 (멤버별 응대 횟수) ════════
  function loadStore() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) {}
    return (s && typeof s === 'object') ? s : {};
  }
  function saveStore(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} }
  function serves(cid) { var s = loadStore(); return Math.max(0, Math.floor(Number(s[cid] && s[cid].serves) || 0)); }
  function addServe(cid) {
    var s = loadStore();
    if (!s[cid] || typeof s[cid] !== 'object') s[cid] = { serves: 0 };
    s[cid].serves = serves(cid) + 1;
    saveStore(s);
    return s[cid].serves;
  }
  // ════════ 스킬 숙련도: 응대에 성공적으로 쓸수록 스킬별로 Lv.1~5 ════════
  var MASTERY = [0, 1, 3, 6, 10, 15];               // 숙련 Lv.0~5 에 필요한 📘 스킬북 누적 권수 (스킬을 써서는 오르지 않음)
  function useCount(cid, id) { var s = loadStore(); return Math.max(0, Math.floor(Number(s[cid] && s[cid].books && s[cid].books[id]) || 0)); }   // = 먹인 스킬북 권수
  function masteryLv(cid, id) { var n = useCount(cid, id), lv = 0; for (var i = 1; i < MASTERY.length; i++) if (n >= MASTERY[i]) lv = i; return lv; }
  function addUse(cid, id) {
    var s = loadStore();
    if (!s[cid] || typeof s[cid] !== 'object') s[cid] = { serves: 0 };
    if (!s[cid].uses || typeof s[cid].uses !== 'object') s[cid].uses = {};
    var before = masteryLv(cid, id);
    s[cid].uses[id] = useCount(cid, id) + 1;
    saveStore(s);
    var after = masteryLv(cid, id);
    if (after > before) { var k = skillById(id); toast('⭐ ' + (k ? k.icon + ' ' + k.name : '스킬') + ' 숙련도 Lv.' + after + '! 더 강해졌어요'); }
  }
  // ════════ 📖 처음 한 번만 뜨는 설명 창 (key = localStorage, ph_ 로 시작 → 클라우드 저장) ════════
  function tutModal(key, icon, title, lines, onClose) {
    try { if (localStorage.getItem(key)) { if (onClose) onClose(); return false; } } catch (e) {}
    if ($('fs-tut')) return false;
    var ov = document.createElement('div'); ov.id = 'fs-tut';
    ov.style.cssText = 'position:fixed;inset:0;z-index:2200;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:18px;' + FONT;
    ov.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    ov.innerHTML = '<div style="width:100%;max-width:330px;max-height:88vh;overflow-y:auto;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FFB86B;border-radius:20px;padding:22px 18px;text-align:center;">' +
      '<div style="font-size:42px;">' + icon + '</div><div style="font-size:17px;font-weight:900;color:#fff;margin:4px 0 12px;">' + title + '</div>' +
      '<div style="text-align:left;font-size:13px;color:#e8e0f5;line-height:1.7;">' + lines.map(function (l) { return '<div style="margin-bottom:6px;">' + l + '</div>'; }).join('') + '</div>' +
      '<button id="fs-tut-ok" style="width:100%;margin-top:12px;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:15px;font-weight:900;cursor:pointer;' + FONT + '">알겠어요!</button></div>';
    document.body.appendChild(ov);
    ov.querySelector('#fs-tut-ok').onclick = function () {
      try { localStorage.setItem(key, '1'); } catch (e) {}
      ov.remove(); if (typeof saveAll === 'function') { try { saveAll(); } catch (e) {} }
      if (onClose) onClose();
    };
    return true;
  }
  function seqTutorial() {
    tutModal('ph_tut_seq', '💖', '팬 응대가 바뀌었어요!', [
      '1️⃣ 팬이나 이벤트 <b>머리 위에 뜬 스킬</b>을 그 스킬 버튼으로 눌러요.',
      '2️⃣ 일반은 <b>1개</b>, 🌟 레어는 <b>2개</b>, 특별 NPC는 <b>3개</b>! 순서대로 써서 하트 게이지를 채우면 성공이에요.',
      '3️⃣ <b>순서가 틀리면 실패</b>예요. 팬은 화내며 가버리고 이벤트는 사라져요.',
      '4️⃣ 광역 스킬은 <b>아무 칸이나</b> 채워줘요. 범위 안 팬을 한꺼번에 응대할 때 써요!',
      '5️⃣ 스킬은 ⚙️로 <b>5칸</b>까지 장착해요. 더보기 → 💖 팬 스킬 상점에서 배울 수 있어요.'
    ]);
  }
  // ════════ 📘 스킬북: 드랍되면 가방에 쌓이고, 쓰면 그 스킬의 숙련도가 오른다 ════════
  var BOOK_USES = 1;                                            // 스킬북 1권 = 숙련 포인트 +1 (숙련 Lv.5 = 15권)
  var BOOK_DROP = { fan: 0.015, shutter: 0.02, letter: 0.02, goods: 0.02, golden: 0.08, legend: 0.20 };   // 응대 성공 때 스킬북이 나올 확률
  function bookName(sk) { return sk.short + ' 스킬북'; }
  function bookSkill(name) { return SKILLS.filter(function (k) { return bookName(k) === name; })[0] || null; }
  function giveBook(id) {
    var sk = skillById(id); if (!sk || typeof addToBag !== 'function') return false;
    var ok = false;
    try { ok = !!addToBag('📘', bookName(sk), 'skillbook', 1, sk.icon + ' ' + sk.name + ' 숙련도 올리기 · 가방에서 열어 멤버를 골라 먹여요'); } catch (e) {}
    if (ok) {
      try { if (typeof saveAll === 'function') saveAll(); } catch (e) {} toast('📘 ' + bookName(sk) + '을(를) 얻었어요!');
      setTimeout(function () { tutModal('ph_tut_book', '📘', '스킬북을 얻었어요!', [
        '스킬 숙련도는 <b>스킬북</b>을 먹여서만 올라가요.',
        '🎒 가방 → 스킬북을 눌러 <b>📘 숙련도 올리기</b> → 멤버를 골라요.',
        '숙련 Lv마다 쿨타임↓ 사거리↑ 보상↑! 스킬북 <b>15권</b>이면 최대 Lv.5예요.',
        '그 멤버가 배운 스킬에만 쓸 수 있어요.'
      ]); }, 1500);
    }
    return ok;
  }
  function maybeBook(kind, usedId) {
    if (Math.random() >= (BOOK_DROP[kind] || BOOK_DROP.fan)) return false;
    var sk = skillById(usedId);
    if (!sk || sk.aoe) {                                         // 광역으로 끝냈으면 장착 중인 스킬 중 하나
      var L = loadLoadout().filter(function (x) { return x && skillById(x); });
      if (!L.length) return false; sk = skillById(L[Math.floor(Math.random() * L.length)]);
    }
    return giveBook(sk.id);
  }
  function feedBook(cid, id) {
    var sk = skillById(id); if (!sk) return { ok: false, why: '스킬을 못 찾았어요' };
    if (!hasSkill(cid, sk)) return { ok: false, why: (charName(cid) || '이 멤버') + '은(는) 아직 ' + sk.name + '을(를) 못 배웠어요' };
    var maxUses = MASTERY[MASTERY.length - 1];
    if (useCount(cid, id) >= maxUses) return { ok: false, why: '이미 최대 숙련이에요!' };
    if (!useFromBag(bookName(sk), 1)) return { ok: false, why: '스킬북이 없어요' };
    var st = loadStore();
    if (!st[cid] || typeof st[cid] !== 'object') st[cid] = { serves: 0 };
    if (!st[cid].books || typeof st[cid].books !== 'object') st[cid].books = {};
    var before = masteryLv(cid, id);
    st[cid].books[id] = Math.min(maxUses, useCount(cid, id) + BOOK_USES);
    saveStore(st);
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    return { ok: true, before: before, after: masteryLv(cid, id), uses: useCount(cid, id) };
  }
  function openBookPicker(sk) {
    var old = $('fs-book'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'fs-book';
    ov.style.cssText = 'position:fixed;inset:0;z-index:2100;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:18px;' + FONT;
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    function draw(msg) {
      var maxUses = MASTERY[MASTERY.length - 1];
      var rows = charIds().map(function (cid) {
        var has = hasSkill(cid, sk), n = useCount(cid, sk.id), lv = masteryLv(cid, sk.id), full = n >= maxUses;
        return '<button data-bc="' + cid + '" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;margin-bottom:7px;border:1.5px solid ' + (has ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.08)') + ';border-radius:12px;background:rgba(255,255,255,' + (has ? '.09' : '.03') + ');color:' + (has ? '#fff' : '#777') + ';font-size:13px;font-weight:900;cursor:pointer;' + FONT + '">' +
          '<span>' + (charName(cid) || cid) + '</span><span style="font-size:11px;color:' + (has ? '#ffd76a' : '#777') + ';">' + (!has ? '🔒 못 배움' : (full ? '최대 숙련 ✨' : '숙련 Lv.' + lv + ' (' + n + '/' + maxUses + '권)')) + '</span></button>';
      }).join('');
      var q = (function () { try { var it = bagItems.find(function (i) { return i.name === bookName(sk); }); return it ? it.qty : 0; } catch (e) { return 0; } })();
      ov.innerHTML = '<div style="width:100%;max-width:330px;max-height:86vh;overflow-y:auto;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #C084FC;border-radius:20px;padding:20px 16px;text-align:center;">' +
        '<div style="font-size:40px;">📘</div><div style="font-size:16px;font-weight:900;color:#fff;">' + bookName(sk) + ' <span style="font-size:12px;color:#aaa;">×' + q + '</span></div>' +
        '<div style="font-size:12px;color:#c9d6ff;margin:4px 0 12px;">누구의 ' + sk.icon + ' ' + sk.name + ' 숙련도를 올릴까요? (1권 = 1포인트)</div>' +
        (msg ? '<div style="background:rgba(255,215,0,.16);border:1.5px solid #FFD700;border-radius:10px;padding:8px;margin-bottom:10px;font-size:12px;font-weight:900;color:#fff;">' + msg + '</div>' : '') + rows +
        '<button id="fs-book-x" style="width:100%;margin-top:4px;padding:10px;border:none;border-radius:10px;background:rgba(255,255,255,.1);color:#ccc;font-size:13px;cursor:pointer;' + FONT + '">닫기</button></div>';
      Array.prototype.forEach.call(ov.querySelectorAll('[data-bc]'), function (b) {
        b.onclick = function () {
          var r = feedBook(b.getAttribute('data-bc'), sk.id);
          if (!r.ok) { draw('⚠️ ' + r.why); return; }
          sfx('rarePick');
          draw('📘 숙련도 +1!' + (r.after > r.before ? ' ⭐ 숙련 Lv.' + r.after + ' 달성!' : ''));
          try { if (typeof renderBag === 'function') renderBag(); } catch (e) {}
          try {                                                  // 뒤에 깔린 가방 상세창의 '보유: N개'도 같이 갱신 (0개면 닫기)
            var bd = $('bag-detail-overlay'), left = (function () { var it = bagItems.find(function (i) { return i.name === bookName(sk); }); return it ? it.qty : 0; })();
            if (bd) { if (left <= 0) bd.remove(); else Array.prototype.forEach.call(bd.querySelectorAll('div'), function (d) { if (!d.children.length && /^보유:/.test(d.textContent)) d.textContent = '보유: ' + left + '개'; }); }
          } catch (e) {}
        };
      });
      ov.querySelector('#fs-book-x').onclick = function () { ov.remove(); };
    }
    document.body.appendChild(ov);
    draw('');
  }
  function mLv(id) { return F ? masteryLv(F.cid, id) : 0; }
  function ownedMap(cid) { var s = loadStore(); return (s[cid] && s[cid].owned && typeof s[cid].owned === 'object') ? s[cid].owned : {}; }
  function hasSkill(cid, sk) { return !!sk && (sk.price === 0 || !!ownedMap(cid)[sk.id]); }
  function unlockedSkills(cid) { return SKILLS.filter(function (s) { return hasSkill(cid, s); }); }
  function plv() { try { return Number(playerLevel) || 1; } catch (e) { return 1; } }
  function levelOk(sk) { return plv() >= (sk.useLv || 1); }
  // ── 장착 스킬 (5칸, 모든 팬덤 원정 맵 공통) ──
  // 장착은 멤버마다 따로 (그 멤버가 배운 스킬만 장착 가능). 저장: { 멤버id: [5칸] } (예전엔 모두 공통 배열이었음 → 그대로 기본값으로 이어받음)
  var edChar = null;                                         // 장착 화면에서 보고 있는 멤버
  function curCid() { return (edChar && $('fs-editor') ? edChar : '') || (F && F.cid) || shopChar || charIds()[0] || ''; }
  function readLoadoutStore() { try { return JSON.parse(localStorage.getItem(LOADOUT_KEY) || 'null'); } catch (e) { return null; } }
  function loadLoadout(cid) {
    cid = cid || curCid();
    var st = readLoadoutStore(), arr = null;
    if (Array.isArray(st)) arr = st;                        // 예전 공통 저장분
    else if (st && typeof st === 'object' && Array.isArray(st[cid])) arr = st[cid];
    var out = [], seen = {};
    if (arr) {
      for (var i = 0; i < SLOTS; i++) {
        var id = arr[i], sk = id && skillById(id);
        if (sk && !seen[id] && hasSkill(cid, sk)) { out.push(id); seen[id] = 1; } else out.push(null);   // 그 멤버가 안 배운 스킬은 장착 해제
      }
      return out;
    }
    SKILLS.forEach(function (s) { if (out.length < SLOTS && s.price === 0) { out.push(s.id); } });   // 처음엔 기본 스킬만
    while (out.length < SLOTS) out.push(null);
    return out;
  }
  // 🔁 스킬 세트: 멤버마다 1·2·3번 세트를 저장해 두고 한 번에 갈아끼운다 (지금 장착을 바꾸면 쓰고 있는 세트에도 자동 저장)
  var SETS_KEY = 'ph_skillSets', SET_N = 3;
  function readSets() { try { return JSON.parse(localStorage.getItem(SETS_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function writeSets(m) { try { localStorage.setItem(SETS_KEY, JSON.stringify(m)); } catch (e) {} }
  function activeSet(cid) { var m = readSets(); return (m[cid] && m[cid].active) || 1; }
  function switchSet(cid, n) {
    cid = cid || curCid();
    var m = readSets(), o = m[cid] || { active: 1 };
    o[o.active || 1] = loadLoadout(cid).slice();         // 지금 장착을 쓰던 세트에 저장
    o.active = n;
    var target = o[n], out = [];
    if (!target) {                                        // 처음 쓰는 세트는 기본 스킬만 장착된 상태
      target = [];
      SKILLS.forEach(function (s) { if (target.length < SLOTS && s.price === 0) target.push(s.id); });
    }
    var seen = {};
    for (var i = 0; i < SLOTS; i++) { var id = target[i], sk = id && skillById(id); out.push(sk && !seen[id] && hasSkill(cid, sk) ? (seen[id] = 1, id) : null); }
    m[cid] = o; writeSets(m);
    saveLoadout(out, cid);
    return out;
  }
  function saveLoadout(arr, cid) {
    cid = cid || curCid();
    var st = readLoadoutStore(), map = {};
    if (Array.isArray(st)) { charIds().forEach(function (c) { map[c] = st.slice(); }); }   // 예전 공통 저장분을 멤버별로 나눠 담음
    else if (st && typeof st === 'object') map = st;
    map[cid] = arr;
    try { var sm = readSets(), so = sm[cid] || { active: 1 }; so[so.active || 1] = arr.slice(); sm[cid] = so; writeSets(sm); } catch (e) {}
    try { localStorage.setItem(LOADOUT_KEY, JSON.stringify(map)); } catch (e) {}
    if (typeof saveAll === 'function') { try { saveAll(); } catch (e) {} }
  }
  function equip(slot, id, cid) {                  // id = null 이면 비움. 이미 다른 칸에 있으면 그 칸을 비우고 옮김
    cid = cid || curCid();
    var L = loadLoadout(cid);
    if (id) for (var i = 0; i < SLOTS; i++) if (L[i] === id) L[i] = null;
    L[slot] = id || null;
    saveLoadout(L, cid);
    return L;
  }
  function coinsNow() { return (typeof coins !== 'undefined') ? coins : 0; }
  function priceLabel(p) { return p >= 10000 ? (p / 10000) + '만' : fmt(p); }
  function charName(cid) {
    try { return (typeof CHARS !== 'undefined' && CHARS[cid] && CHARS[cid].name) || ''; } catch (e) { return ''; }
  }
  function buySkill(cid, id) {                                // 상점 구매 (맵 / 상점 화면 공통)
    var sk = skillById(id);
    if (!sk || !cid) return { ok: false, why: 'none' };
    if (hasSkill(cid, sk)) return { ok: false, why: 'owned' };
    if (coinsNow() < sk.price) return { ok: false, why: 'coins' };
    coins -= sk.price;
    var s = loadStore();
    if (!s[cid] || typeof s[cid] !== 'object') s[cid] = { serves: 0 };
    if (!s[cid].owned || typeof s[cid].owned !== 'object') s[cid].owned = {};
    s[cid].owned[id] = true;
    saveStore(s);
    if (typeof saveAll === 'function') { try { saveAll(); } catch (e) {} }
    if (typeof updateCoinsDisplay === 'function') { try { updateCoinsDisplay(); } catch (e) {} }
    return { ok: true };
  }

  // ════════ 맵 위 위치 ════════
  function worldSize() {
    var w = $('bc-world');
    return { w: (w && w.offsetWidth) || 1, h: (w && w.offsetHeight) || 1 };
  }
  function pxDist(ax, ay, bx, by) {
    var ws = worldSize();
    var dx = (ax - bx) * ws.w, dy = (ay - by) * ws.h;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function playerPos() {
    var p = $('bc-player');
    if (!p) return null;
    var x = parseFloat(p.style.left), y = parseFloat(p.style.top);
    if (!isFinite(x) || !isFinite(y)) return null;
    return { x: x / 100, y: y / 100 };
  }

  // ════════ 스타일 ════════
  function injectStyle() {
    if ($('fs-style')) return;
    var st = document.createElement('style');
    st.id = 'fs-style';
    st.textContent =
      '@keyframes fsBurst{0%{opacity:1;transform:translate(-50%,-50%) scale(.4)}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1.25)}}' +
      '@keyframes fsPen{0%{opacity:0;transform:translate(-50%,-50%) rotate(-35deg) scale(.5)}30%{opacity:1;transform:translate(-50%,-50%) rotate(10deg) scale(1.4)}60%{opacity:1;transform:translate(-50%,-50%) rotate(-15deg) scale(1.3)}100%{opacity:0;transform:translate(-50%,-90%) rotate(0) scale(1.1)}}' +
      '@keyframes fsFlashC{0%{opacity:.95;transform:translate(-50%,-50%) scale(.4)}100%{opacity:0;transform:translate(-50%,-50%) scale(7)}}' +
      '@keyframes fsPolaroid{0%{opacity:0;transform:translate(-50%,-120%) rotate(-8deg) scale(.6)}25%{opacity:1;transform:translate(-50%,-80%) rotate(6deg) scale(1)}100%{opacity:0;transform:translate(-50%,60%) rotate(14deg) scale(1)}}' +
      '@keyframes fsPulse{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}35%{opacity:1;transform:translate(-50%,-50%) scale(1.6)}100%{opacity:0;transform:translate(-50%,-50%) scale(2.2)}}' +
      '@keyframes fsRise{0%{opacity:0;transform:translate(-50%,-30%)}20%{opacity:1;transform:translate(-50%,-70%)}100%{opacity:0;transform:translate(-50%,-190%)}}' +
      '@keyframes fsBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}' +
      '@keyframes fsIn{0%{opacity:0;transform:scale(.4)}70%{opacity:1;transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}' +
      '@keyframes fsCut{0%{transform:translateX(-110%)}16%{transform:translateX(0)}80%{transform:translateX(0);opacity:1}100%{transform:translateX(30%);opacity:0}}' +
      '@keyframes fsLine{0%{transform:translateX(-80px)}100%{transform:translateX(420px)}}' +
      '@keyframes fsCutR{0%{transform:translateX(110%) skewY(3deg)}16%{transform:translateX(0) skewY(3deg)}80%{transform:translateX(0) skewY(3deg);opacity:1}100%{transform:translateX(-30%) skewY(3deg);opacity:0}}' +
      '@keyframes fsCutT{0%{transform:translateY(-260%);opacity:0}18%{transform:translateY(0);opacity:1}82%{transform:translateY(0);opacity:1}100%{transform:translateY(40%);opacity:0}}' +
      '@keyframes fsCutZ{0%{transform:scale(3);opacity:0}16%{transform:scale(1);opacity:1}85%{transform:scale(1.04);opacity:1}100%{transform:scale(1.3);opacity:0}}' +
      '@keyframes fsFlashS{0%{opacity:.8}100%{opacity:0}}' +
      '@keyframes fsShakeV{0%,100%{transform:translate(0,0)}20%{transform:translate(-5px,3px)}40%{transform:translate(5px,-3px)}60%{transform:translate(-4px,-2px)}80%{transform:translate(3px,3px)}}' +
      '@keyframes fsReady{0%,100%{box-shadow:0 0 0 0 rgba(255,215,0,.0)}50%{box-shadow:0 0 14px 3px rgba(255,215,0,.85)}}';
    document.head.appendChild(st);
  }

  // ════════ 이펙트 ════════
  function addAt(x, y, html, css, life) {
    var l = $('bc-layer');
    if (!l) return null;
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:' + (x * 100) + '%;top:' + (y * 100) + '%;transform:translate(-50%,-50%);z-index:25;pointer-events:none;' + (css || '');
    d.innerHTML = html;
    l.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, life || 1200);
    return d;
  }
  function burst(x, y, list, n, dist) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, r = (0.5 + Math.random() * 0.5) * (dist || 60);
      addAt(x, y, list[i % list.length],
        'font-size:' + Math.round(14 + Math.random() * 10) + 'px;--dx:' + Math.round(Math.cos(a) * r) + 'px;--dy:' + Math.round(Math.sin(a) * r - 20) + 'px;animation:fsBurst .9s ease-out forwards;', 1000);
    }
  }
  function effect(id, fan, me, love) {
    var fx = fan.x, fy = fan.y;
    if (id === 'sign') {
      addAt(fx, fy, '<div style="font-size:34px;">✍️</div>', 'animation:fsPen .95s ease-out forwards;', 1000);
      setTimeout(function () { burst(fx, fy, ['✨', '💖', '⭐'], love ? 12 : 7, 64); }, 380);
    } else if (id === 'photo') {
      addAt(fx, fy, '', 'width:20px;height:20px;border-radius:50%;background:#fff;animation:fsFlashC .5s ease-out forwards;', 600);
      addAt(fx, fy, '<div style="width:36px;height:44px;background:#fff;border-radius:3px;padding:3px 3px 10px;box-shadow:0 3px 10px rgba(0,0,0,.5);">' +
        '<div style="width:100%;height:100%;background:linear-gradient(135deg,#FF6B9D,#C084FC);display:flex;align-items:center;justify-content:center;font-size:18px;">' + fan.emoji + '</div></div>',
        'animation:fsPolaroid 1.2s ease-in forwards;', 1250);
      burst(fx, fy, ['📸', '✨'], love ? 9 : 5, 56);
    } else if (id === 'shake') {
      var mx = (fx + me.x) / 2, my = (fy + me.y) / 2;
      addAt(mx, my, '<div style="font-size:38px;">🤝</div>', 'animation:fsPulse .9s ease-out forwards;', 950);
      setTimeout(function () { burst(mx, my, ['✨', '💫', '⭐'], love ? 12 : 7, 60); }, 350);
    } else if (id === 'highlight' || id === 'wink' || id === 'encore' || id === 'rose' || id === 'finale') {
      var col = id === 'wink' ? 'rgba(255,205,90,.55)' : (id === 'encore' ? 'rgba(190,140,255,.55)' : (id === 'rose' ? 'rgba(255,90,120,.55)' : (id === 'finale' ? 'rgba(120,200,255,.55)' : 'rgba(255,120,170,.55)')));
      addAt(me.x, me.y, '', 'width:40px;height:40px;border-radius:50%;border:4px solid ' + col + ';background:' + col.replace('.55', '.18') + ';animation:fsFlashC .8s ease-out forwards;', 900);
      addAt(me.x, me.y, '<div style="font-size:34px;">' + skillById(id).icon + '</div>', 'animation:fsPulse .9s ease-out forwards;', 950);
      setTimeout(function () { burst(fx, fy, id === 'wink' ? ['💖', '✨', '💕'] : (id === 'encore' ? ['✨', '🎆', '⭐'] : (id === 'rose' ? ['🌹', '🌸', '💖'] : (id === 'finale' ? ['🎆', '🎇', '✨', '⭐'] : ['🎤', '🎵', '✨']))), love ? 14 : 9, (id === 'encore' || id === 'finale') ? 100 : 70); }, 420);
    } else if (id === 'heart') {
      var h = addAt(me.x, me.y, '<div style="font-size:30px;">💗</div>', 'transition:left .5s ease-in,top .5s ease-in;', 1300);
      if (h) setTimeout(function () { h.style.left = (fx * 100) + '%'; h.style.top = (fy * 100) + '%'; }, 30);
      setTimeout(function () { burst(fx, fy, ['💗', '💖', '💕'], love ? 14 : 8, 70); }, 520);
    }
  }

  // ════════ 🎬 광역 스킬 컷인 (파밍 중인 포카 얼굴 + 스킬 이름) — 스킬마다 연출이 달라요 ════════
  //  mode: rise(아래→위) / fall(위→아래) / burst(가운데서 사방으로) / mix(burst+fall)
  var CUT = {
    highlight: { rgb: '255,225,120', ms: 1300, from: 'left',  tilt: -3, parts: ['🎵','🎶','🎤','✨'], mode: 'rise',  n: 16, flash: 0.55, shake: 0.4, spot: true,  sub: '🎤 스포트라이트!' },
    wink:      { rgb: '255,120,190', ms: 1300, from: 'right', tilt: 3,  parts: ['💖','💕','💗','✨'], mode: 'rise',  n: 26, flash: 0.45, shake: 0.3, big: '💖', sub: '' },
    encore:    { rgb: '190,140,255', ms: 1700, from: 'left',  tilt: -2, parts: ['🎆','✨','⭐','🎇'], mode: 'burst', n: 36, flash: 0.75, shake: 0.5, conf: true, sub: '' },
    rose:      { rgb: '255,90,130',  ms: 1800, from: 'top',   tilt: 0,  parts: ['🌹','🌸','🥀','💖'], mode: 'fall',  n: 30, flash: 0.5,  shake: 0.3, vig: true, sub: '' },
    finale:    { rgb: '255,235,170', ms: 2100, from: 'zoom',  tilt: 0,  parts: ['🎆','🎇','✨','⭐','💫'], mode: 'mix', n: 46, flash: 0.95, shake: 0.7, conf: true, bars: true, sub: '' }
  };
  function cutFaceFile(cid) {
    var id = cid || (F && F.cid) || '';
    if (id === 'seyeon_trial') id = 'seyeon';
    return 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/face-' + id + '.png';
  }
  function cutIn(id, host, cid) {
    var view = host || $('bc-view'); if (!view) return;
    injectStyle();
    var sk = skillById(id), C = CUT[id] || CUT.highlight, rgb = C.rgb;
    if (!sk) return;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;z-index:40;pointer-events:none;overflow:hidden;';
    var anim = { left: 'fsCut', right: 'fsCutR', top: 'fsCutT', zoom: 'fsCutZ' }[C.from] || 'fsCut';
    var h = '<div style="position:absolute;inset:0;background:radial-gradient(circle,rgba(255,255,255,.6),rgba(' + rgb + ',.35));animation:fsFlashS .55s ease-out forwards;opacity:' + C.flash + ';"></div>';
    if (C.vig) h += '<div style="position:absolute;inset:0;background:radial-gradient(circle,transparent 35%,rgba(120,0,30,.65));animation:fsFlashS ' + C.ms + 'ms ease-in-out forwards;"></div>';
    if (C.spot) h += '<div style="position:absolute;left:50%;top:-5%;width:70%;height:115%;transform:translateX(-50%);background:linear-gradient(180deg,rgba(255,240,170,.75),rgba(255,240,170,0) 90%);clip-path:polygon(42% 0,58% 0,100% 100%,0 100%);animation:fsFlashS ' + C.ms + 'ms ease-out forwards;"></div>';
    if (C.bars) h += '<div style="position:absolute;left:0;right:0;top:0;height:11%;background:#000;animation:fsFlashS ' + C.ms + 'ms ease-in-out forwards;"></div><div style="position:absolute;left:0;right:0;bottom:0;height:11%;background:#000;animation:fsFlashS ' + C.ms + 'ms ease-in-out forwards;"></div>';
    if (C.big) h += '<div style="position:absolute;left:50%;top:55%;font-size:90px;transform:translate(-50%,-50%);animation:fsPulse 1s ease-out forwards;">' + C.big + '</div>';
    var bh = id === 'finale' ? 92 : 80, lines = '';
    for (var li = 0; li < 4; li++) lines += '<div style="position:absolute;left:0;top:' + (8 + li * 17) + 'px;width:60px;height:2px;background:rgba(255,255,255,.55);animation:fsLine ' + (0.5 + li * 0.12) + 's linear infinite;animation-delay:-' + (li * 0.17) + 's;"></div>';
    h += '<div style="position:absolute;left:0;right:0;top:26%;height:' + bh + 'px;animation:fsCut ' + C.ms + 'ms ease-out forwards;">' +
      '<div style="position:absolute;inset:0;clip-path:polygon(-1% 0,101% 0,100% 100%,-3% 100%);background:linear-gradient(90deg,rgba(10,5,25,.9),rgba(' + rgb + ',.55) 50%,rgba(10,5,25,.9));overflow:hidden;">' + lines + '</div>' +
      '<div style="position:absolute;left:0;right:0;top:0;height:3px;background:rgb(' + rgb + ');box-shadow:0 0 10px rgb(' + rgb + ');"></div>' +
      '<div style="position:absolute;left:0;right:0;bottom:0;height:3px;background:rgb(' + rgb + ');box-shadow:0 0 10px rgb(' + rgb + ');"></div>' +
      '<div style="position:absolute;inset:0;display:flex;align-items:center;gap:10px;padding:0 5%;">' +
        '<div style="font-size:44px;line-height:1;filter:drop-shadow(0 0 10px rgb(' + rgb + '));flex:none;">' + sk.icon + '</div>' +
        '<div style="width:62px;height:62px;border-radius:50%;border:3px solid rgb(' + rgb + ');background:#2a1a40 url(' + cutFaceFile(cid) + ') center/cover;box-shadow:0 0 16px rgb(' + rgb + ');flex:none;"></div>' +
        '<div style="font-size:' + (id === 'finale' ? 28 : 25) + 'px;font-weight:900;color:#fff;-webkit-text-stroke:6px rgba(20,8,40,.95);paint-order:stroke fill;white-space:nowrap;">' + sk.name + '!</div>' +
      '</div></div>';
    wrap.innerHTML = h;
    view.appendChild(wrap);
    view.style.animation = 'fsShakeV ' + C.shake + 's linear';
    setTimeout(function () { view.style.animation = ''; }, C.shake * 1000 + 30);
    setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, C.ms + 150);
    var vw = view.clientWidth || 360, vh = view.clientHeight || 640;
    for (var i = 0; i < Math.round(C.n * 1.5); i++) {
      var p = document.createElement('div'), em = C.parts[i % C.parts.length], x = Math.round(Math.random() * 100), sz = 16 + Math.round(Math.random() * 18);
      var mode = C.mode === 'mix' ? (i % 2 ? 'burst' : 'fall') : C.mode, tr, st;
      if (mode === 'rise') { st = 'left:' + x + '%;top:100%;'; tr = 'translateY(-' + Math.round(vh * (0.5 + Math.random() * 0.6)) + 'px) translateX(' + Math.round(Math.random() * 60 - 30) + 'px)'; }
      else if (mode === 'fall') { st = 'left:' + x + '%;top:-6%;'; tr = 'translateY(' + (vh + 40) + 'px) translateX(' + Math.round(Math.random() * 120 - 60) + 'px) rotate(' + Math.round(Math.random() * 540) + 'deg)'; }
      else { var ang = Math.random() * 6.283, d = 80 + Math.random() * Math.min(vw, vh) * 0.45; st = 'left:50%;top:' + (35 + Math.round(Math.random() * 25)) + '%;'; tr = 'translate(' + Math.round(Math.cos(ang) * d) + 'px,' + Math.round(Math.sin(ang) * d) + 'px) scale(1.4)'; }
      p.textContent = em;
      p.style.cssText = 'position:absolute;' + st + 'font-size:' + sz + 'px;opacity:1;transition:transform ' + (C.ms * 0.8) + 'ms ease-out,opacity ' + (C.ms * 0.8) + 'ms ease-in;transition-delay:' + Math.round(Math.random() * 250) + 'ms;';
      wrap.appendChild(p);
      (function (q, t) { setTimeout(function () { q.style.transform = t; q.style.opacity = '0'; }, 40); })(p, tr);
    }
    if (true) {
      var cols = ['#ffd76a', '#ff6fb1', '#9fd8ff', '#c084fc', '#7ee8a5'];
      for (var j = 0; j < (C.conf ? 40 : 22); j++) {
        var q2 = document.createElement('div');
        q2.style.cssText = 'position:absolute;top:-10px;left:' + Math.round(Math.random() * 100) + '%;width:7px;height:11px;background:' + cols[j % 5] + ';transition:transform 1.5s ease-in,opacity 1.5s;';
        wrap.appendChild(q2);
        (function (q) { setTimeout(function () { q.style.transform = 'translateY(' + (vh + 30) + 'px) rotate(' + Math.round(Math.random() * 720) + 'deg)'; q.style.opacity = '0'; }, 40); })(q2);
      }
    }
  }
  function floatText(x, y, html) {
    addAt(x, y, html, 'animation:fsRise 1.5s ease-out forwards;white-space:nowrap;', 1550);
  }
  function chipHtml(icon, text, color) {
    return '<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(20,10,40,.88);border:1.5px solid ' + color +
      ';border-radius:999px;padding:3px 9px;margin:2px;font-size:11px;font-weight:900;color:#fff;">' + (window.rewardIcon ? window.rewardIcon(icon, text, 16) : icon) + ' ' + text + '</div>';
  }

  // ════════ 하트 게이지 + 스킬 순서 ════════
  function usablePool() {
    var L = loadLoadout(), out = [];
    L.forEach(function (id, i) {
      var k = id && skillById(id);
      if (k && !k.aoe && levelOk(k) && hasSkill(F.cid, k) && L.indexOf(id) === i) out.push(id);
    });
    return out;
  }
  function makeSeq(n) {
    var pool = usablePool(); if (!pool.length) pool = ['sign', 'photo'];
    var seq = [];
    for (var i = 0; i < n; i++) {
      var c = pool.filter(function (x) { return pool.length < 2 || x !== seq[i - 1]; });
      seq.push(c[Math.floor(Math.random() * c.length)]);
    }
    return seq;
  }
  var SPECIAL_MAPS = { broadcast_front: 1, fanmeeting: 1 };
  function isSpecialEv(o) { return !!o.kind && (o.type === 'golden' || o.type === 'legend') && !!F && !!SPECIAL_MAPS[F.mapId]; }
  function ensureSeq(o) {
    if (!o.fsSeq) { o.fsSpecial = isSpecialEv(o); var len = o.type === 'legend' ? SEQ_LEGEND : (o.type === 'golden' ? SEQ_RARE : SEQ_NORMAL); o.fsGain = Math.ceil(100 / len); o.fsSeq = makeSeq(len); o.fsStep = 0; o.fsGauge = 0; o.fsDirty = true; return; }
    var pool = usablePool();
    if (!pool.length) return;
    var bad = false;
    for (var i = o.fsStep; i < o.fsSeq.length; i++) if (pool.indexOf(o.fsSeq[i]) === -1) bad = true;
    if (bad) {                                                       // 장착을 바꿔서 못 쓰는 스킬이 순서에 있으면 남은 칸만 새로 뽑음
      var left = Math.max(1, Math.ceil((100 - o.fsGauge) / (o.fsGain || STEP_GAIN)));
      o.fsSeq = o.fsSeq.slice(0, o.fsStep).concat(makeSeq(left)); o.fsDirty = true;
    }
  }
  function applyStep(o, id, sk, mlv) {
    ensureSeq(o);
    if (sk.aoe) {                                                    // 광역: 순서와 상관없이 한 칸을 채움 (숙련 Lv마다 10% 확률로 한 칸 더)
      o.fsGauge += o.fsGain; o.fsStep++; o.fsAoe = true;
      if (o.fsGauge < 100 && Math.random() < 0.1 * (mlv || 0)) { o.fsGauge += o.fsGain; o.fsStep++; }
    }
    else if (o.fsSeq[o.fsStep] === id) { o.fsGauge += (o.fsGain || STEP_GAIN); o.fsStep++; }
    else { o.fsDirty = true; return 'fail'; }
    o.fsDirty = true;
    return o.fsGauge >= 100 ? 'done' : 'ok';
  }
  function seqHtml(o) {
    var h = '<div style="display:flex;gap:2px;justify-content:center;align-items:center;">';
    (o.fsSeq || []).forEach(function (id, i) {
      var k = skillById(id), done = i < o.fsStep, cur = i === o.fsStep;
      h += '<span style="background:#fff;border:2px solid ' + (cur ? '#FFD700' : '#FF6B9D') + ';border-radius:999px;padding:0 4px;font-size:' + (cur ? 17 : 13) + 'px;line-height:1.35;' +
        (done ? 'opacity:.3;filter:grayscale(1);' : '') + (cur ? 'animation:fsBob 1s ease-in-out infinite;' : '') + '">' + k.icon + '</span>' +
        (i < o.fsSeq.length - 1 ? '<span style="font-size:8px;color:#fff;text-shadow:0 1px 3px #000;">▸</span>' : '');
    });
    var g = Math.min(100, o.fsGauge || 0);
    h += '</div><div style="margin:2px auto 0;width:64px;height:7px;background:rgba(0,0,0,.6);border:1px solid #fff;border-radius:6px;overflow:hidden;"><div style="width:' + g + '%;height:100%;background:linear-gradient(90deg,#FF6B9D,#FF9EC7);transition:width .3s;"></div></div>';
    return h;
  }
  function paintSeq(o, host) {
    if (!host) return;
    ensureSeq(o);
    if (o.fsDirty || host.getAttribute('data-p') !== '1') { host.innerHTML = seqHtml(o); host.setAttribute('data-p', '1'); o.fsDirty = false; }
  }

  // ════════ 팬 ════════
  function buildFanEl(f) {
    var el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:' + (f.x * 100) + '%;top:' + (f.y * 100) + '%;transform:translate(-50%,-50%);z-index:12;pointer-events:none;text-align:center;';
    el.innerHTML =
      '<div style="position:relative;animation:fsIn .45s ease-out;">' +
        '<div style="position:absolute;left:-40px;right:-40px;top:-50px;text-align:center;"><div class="fs-bubble"></div></div>' +
        '<div class="fs-face" style="width:40px;height:40px;border-radius:50%;background:#fff;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 3px 10px rgba(0,0,0,.5);margin:0 auto;">' + f.emoji + '</div>' +
        '<div style="margin-top:2px;font-size:9px;font-weight:900;color:#fff;text-shadow:0 1px 4px #000;white-space:nowrap;">' + f.name + '</div>' +
      '</div>';
    var layer = $('bc-layer');
    if (layer) layer.appendChild(el);
    paintSeq(f, el.querySelector('.fs-bubble'));
    return el;
  }

  function spawnFan() {
    if (!F || !$('bc-layer') || F.fans.length >= FAN_MAX) return null;
    var me = playerPos();
    if (!me) return null;
    var ws = worldSize();
    var a = Math.random() * Math.PI * 2, r = 65 + Math.random() * 55;
    var x = clamp(me.x + Math.cos(a) * r / ws.w, BOUNDS.x0, BOUNDS.x1);
    var y = clamp(me.y + Math.sin(a) * r / ws.h, BOUNDS.y0, BOUNDS.y1);
    var type = FANS[Math.floor(Math.random() * FANS.length)];
    var f = { id: ++F.nid, x: x, y: y, name: type.name, emoji: type.emoji, until: Date.now() + FAN_TTL * 1000, el: null };
    f.el = buildFanEl(f);
    F.fans.push(f);
    showNote('💬 ' + f.name + '이(가) 찾아왔어요! 머리 위에 뜬 스킬을 써서 하트 게이지를 채워요 (틀리면 실패!)');
    return f;
  }

  function removeFan(f, fade) {
    var i = F ? F.fans.indexOf(f) : -1;
    if (i !== -1) F.fans.splice(i, 1);
    if (!f.el) return;
    var el = f.el; f.el = null;
    if (fade) { el.style.transition = 'opacity .6s'; el.style.opacity = '0'; setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 650); }
    else if (el.parentNode) el.parentNode.removeChild(el);
  }

  function nearestFan(rng) {
    var me = playerPos();
    if (!F || !me) return null;
    var best = null, bd = 1e9;
    F.fans.forEach(function (f) {
      var d = pxDist(f.x, f.y, me.x, me.y);
      if (d <= (rng || FAN_RANGE) && d < bd) { best = f; bd = d; }
    });
    return best;
  }

  // ════════ 맵 이벤트(마커)를 스킬 대상으로 ════════
  function bcHook() { return (window.__bcHook && typeof window.__bcHook.events === 'function') ? window.__bcHook : null; }
  var EV_INFO = { shutter: ['📸', '셔터 찬스'], golden: ['🌟', '황금 셔터'], letter: ['💌', '팬레터'], goods: ['🎁', '굿즈'] };
  function evTarget(ev) {
    var info = EV_INFO[ev.type] || ['🚨', (ev.npc && ev.npc.name) || '특별 NPC'];
    return { ev: ev, x: ev.x, y: ev.y, emoji: info[0], name: info[1] };
  }
  function ensureEventBubbles() {
    var hk = bcHook();
    if (!hk || !F) return;
    hk.events().forEach(function (ev) {
      if (!ev.el) return;
      var b = ev.el.querySelector('.fs-evb');
      if (!b) {
        b = document.createElement('div');
        b.className = 'fs-evb';
        b.style.cssText = 'position:absolute;left:50%;top:-50px;transform:translateX(-50%);white-space:nowrap;text-align:center;pointer-events:none;';
        ev.el.appendChild(b);
      }
      ev.fsFav = ev.fsFav || 'seq';
      paintSeq(ev, b);
    });
  }
  function nearestEvent(rng) {
    var hk = bcHook(), me = playerPos();
    if (!hk || !F || !me) return null;
    var best = null, bd = 1e9;
    hk.events().forEach(function (ev) {
      if (ev.fsBusy || !ev.fsFav) return;
      var d = pxDist(ev.x, ev.y, me.x, me.y);
      if (d <= (rng || FAN_RANGE) && d < bd) { best = ev; bd = d; }
    });
    return best ? evTarget(best) : null;
  }
  function nearestTarget(rng) { return nearestEvent(rng) || nearestFan(rng); }

  // ════════ 보상 ════════
  function grant(love, bonus) {
    var mult = (love ? LOVE_MULT : 1) * (bonus || 1) * gm(F.cid, 'reward');   // 🎀 소품 보상 증가
    var lines = [];
    var cm = COIN_MULT[F.mapId] || 1;
    var gain = Math.max(1, Math.round(COIN_BASE * cm * mult * (0.9 + Math.random() * 0.2)));
    if (typeof coins !== 'undefined') { coins += gain; lines.push(chipHtml('🍔', '+' + fmt(gain), '#FFD700')); }
    var exp = Math.round(EXP_BASE * mult);
    if (exp > 0 && F.cid && typeof addCardExp === 'function') { try { addCardExp(F.cid, exp); lines.push(chipHtml('⭐', '+' + exp + ' EXP', '#FFD700')); } catch (e) {} }
    var pieces = 0;
    if (F.mapId === 'broadcast_front' && typeof window.__bcBoxCount === 'function') window.__bcBoxCount(1);   // 팬 1명 응대 = 🎁 뽑기 진행 +1
    if (love && F.mapId === 'broadcast_front' && Math.random() < PIECE_CHANCE) {
      if (typeof window.__bcBoxBonus === 'function') {          // 방송국 앞: 조각은 바로 안 주고 🎁 뽑기 상자에 덤으로 쌓임
        window.__bcBoxBonus(1); lines.push(chipHtml('🎁', '상자 조각 +1 (뽑기에서 나와요)', '#7dd3fc'));
      } else if (typeof addToBag === 'function' && addToBag(PIECE_EMOJI, PIECE_NAME, 'piece', 1, '프리미엄 카드 조각 · ' + PIECE_GOAL + '개를 모으면 더보기 > 프리미엄 카드에서 교환')) {
        pieces = 1; lines.push(chipHtml(PIECE_EMOJI, PIECE_NAME + ' +1', '#7dd3fc'));
      }
    }
    if (typeof saveAll === 'function') { try { saveAll(); } catch (e) {} }
    if (typeof updateCoinsDisplay === 'function') { try { updateCoinsDisplay(); } catch (e) {} }
    return { coins: gain, exp: exp, pieces: pieces, lines: lines };
  }

  // 🎀 팬덤 원정 소품 (expedition-gear.js) 효과 읽기
  function gs(cid, k) { try { return window.FanGear ? window.FanGear.sum(cid, k) : 0; } catch (e) { return 0; } }
  function gm(cid, k) { return 1 + gs(cid, k) / 100; }
  function forgiveLeft() { return gs(F && F.cid, 'forgive') - ((F && F.forgiveUsed) || 0); }
  // ════════ 스킬 사용 ════════
  function useSkill(id) {
    if (!F) return null;
    var sk = skillById(id);
    if (!sk) return null;
    if ($('bc-panel')) return null;                                  // 이벤트 진행 중엔 못 씀
    if (!levelOk(sk)) { toast('🔒 ' + sk.name + '은(는) 플레이어 Lv.' + sk.useLv + '부터 쓸 수 있어요 (지금 Lv.' + plv() + ')'); return null; }
    if (!hasSkill(F.cid, sk)) { openBuyModal(sk); return null; }      // 아직 안 배운 스킬: 구매 창
    var now = Date.now();
    if ((F.cd[id] || 0) > now) return null;
    var mlv = mLv(id), reachM = sk.reach * (1 + 0.05 * mlv) * gm(F.cid, 'reach');          // 숙련 Lv마다 사거리 +5% · 🎀 소품 사거리
    var fan = nearestTarget(reachM);
    if (!fan) { toast(bcHook() ? '가까이에 팬이 없어요! 팬 쪽으로 걸어가 봐요 (닿기 전에 스킬을 써요)' : '가까이에 팬이 없어요! 팬 쪽으로 걸어가 봐요'); return null; }
    var me = playerPos();
    var hk = bcHook();
    if (fan.ev && !hk.canResolve(fan.ev)) return null;                // 스태미나 부족 등
    F.cd[id] = now + (sk.aoe ? Math.max(1, COOLDOWN - 0.4 * mlv) : Math.max(0.5, 1 - 0.1 * mlv)) * 1000 * (1 - gs(F.cid, 'cd') / 100);   // 🎀 소품 쿨타임 감소
    //   // 단타 1초, 광역 3초 (숙련 Lv마다 단타 -0.1초 / 광역 -0.4초)   // 숙련 Lv마다 쿨타임 -0.4초 (최소 1초)
    // 대상 모으기: 가장 가까운 대상 + (광역이면) 범위 안의 다른 팬들
    var list = [fan.ev || fan];
    if (sk.aoe) {
      F.fans.forEach(function (o) {
        if (o === fan || o.fsBusy || !me || pxDist(o.x, o.y, me.x, me.y) > reachM) return;
        list.push(o);
      });
    }
    if (sk.aoe) { try { cutIn(id); } catch (e) {} }
    var res = { done: 0, fail: 0, ok: 0 }, didUse = false;
    list.forEach(function (o) {
      var st = applyStep(o, id, sk, mlv);
      if (st === 'fail' && forgiveLeft() > 0) {                       // 🎀 수정 왕관 배지: 순서 실수 막아줌 (게이지는 그대로)
        F.forgiveUsed = (F.forgiveUsed || 0) + 1;
        floatText(o.x, o.y - 0.03, '<div style="font-size:13px;font-weight:900;color:#a5f3fc;text-shadow:0 2px 6px #000;white-space:nowrap;">🛡️ 소품이 실수를 막아줬어요!</div>');
        sfx('pick'); return;
      }
      var isEv = !!o.type && !!o.el && !o.emoji;                       // 맵 이벤트인지
      var tg = isEv ? evTarget(o) : o;
      effect(id, tg, me, st === 'done');
      if (st === 'fail') {
        res.fail++;
        o.fsBusy = true;
        floatText(tg.x, tg.y - 0.03, '<div style="font-size:14px;font-weight:900;color:#ff6b6b;text-shadow:0 2px 6px #000;white-space:nowrap;">😤 순서가 틀렸어요! 실패</div>');
        sfx('fail');
        if (isEv) { var evF = o; setTimeout(function () { try { hk.fail(evF); } catch (e) {} }, 800); }
        else { var i0 = F.fans.indexOf(o); if (i0 !== -1) F.fans.splice(i0, 1); var fc0 = o.el && o.el.querySelector('.fs-face'); if (fc0) fc0.textContent = '😤'; setTimeout(function () { removeFan(o, true); }, 900); }
        return;
      }
      if (st === 'ok') {
        res.ok++;
        floatText(tg.x, tg.y - 0.03, '<div style="font-size:13px;font-weight:900;color:#FF9EC7;text-shadow:0 2px 6px #000;white-space:nowrap;">💗 게이지 ' + Math.min(100, o.fsGauge) + '%</div>');
        sfx('pick');
        return;
      }
      res.done++;                                                    // 게이지 가득 → 응대 성공
      var love = o.fsAoe ? (Math.random() < AOE_LOVE) : (Math.random() < 0.5);
      floatText(tg.x, tg.y - 0.03, '<div style="font-size:15px;font-weight:900;color:' + (love ? '#FFD700' : '#fff') + ';text-shadow:0 2px 6px #000;">' + (love ? '😍 대만족!' : '😊 만족') + '</div>');
      sfx(love ? 'rarePick' : 'pick');
      o.fsBusy = true;
      if (isEv) {
        var evRef = o, cidNow = F.cid;
        setTimeout(function () {
          var ok = false;
          try { ok = hk.resolve(evRef, love, (1 + 0.04 * mlv) * gm(cidNow, 'reward')); } catch (e) {}
          if (ok) { addServe(cidNow); maybeBook(evRef.type, id); } else evRef.fsBusy = false;
        }, 900);
      } else {
        var i1 = F.fans.indexOf(o); if (i1 !== -1) F.fans.splice(i1, 1);
        var r = grant(love, 1 + 0.04 * mlv); addServe(F.cid); maybeBook('fan', id);
        var fc = o.el && o.el.querySelector('.fs-face'); if (fc) fc.textContent = love ? '😍' : '😊';
        floatText(o.x, o.y - 0.09, '<div style="text-align:center;">' + r.lines.join('') + '</div>');
        setTimeout(function () { removeFan(o, true); }, 900);
      }
    });
    refreshBar();
    return { done: res.done, fail: res.fail, ok: res.ok };
  }

  var noteTimer = null;
  function showNote(text) {
    var n = $('fs-note');
    if (!n) return;
    n.textContent = text;
    n.style.display = 'block';
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () { var nn = $('fs-note'); if (nn) nn.style.display = 'none'; }, 4500);
  }

  function buildBar(view) {
    var note = document.createElement('div');
    note.id = 'fs-note';
    note.style.cssText = 'display:none;position:absolute;bottom:158px;left:10px;right:10px;z-index:30;background:rgba(26,26,46,.92);border:1.5px solid #FF6B9D;border-radius:14px;padding:8px 12px;color:#fff;font-size:12px;font-weight:900;text-align:center;pointer-events:none;';
    view.appendChild(note);

    var bar = document.createElement('div');
    bar.id = 'fs-bar';
    bar.style.cssText = 'position:absolute;left:0;right:0;bottom:10px;z-index:38;display:flex;flex-direction:column;align-items:center;gap:6px;font-family:\'Noto Sans KR\',sans-serif;';
    var hint = document.createElement('div');
    hint.style.cssText = 'background:rgba(0,0,0,.62);border-radius:999px;padding:3px 12px;font-size:11px;font-weight:900;color:#fff;';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;';
    var btns = {};
    for (var si = 0; si < SLOTS; si++) (function (si) {
      var b = document.createElement('div');
      b.setAttribute('data-slot', si);
      b.style.cssText = 'width:58px;height:58px;border-radius:50%;background:rgba(26,26,46,.9);border:2.5px solid #C084FC;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#fff;user-select:none;-webkit-user-select:none;';
      b.innerHTML = '<div class="fs-ic" style="font-size:24px;line-height:1;"></div><div class="fs-lb" style="font-size:9px;font-weight:900;margin-top:2px;"></div>';
      b.onpointerdown = function (e) { e.stopPropagation(); e.preventDefault(); var id = loadLoadout()[si]; if (id) useSkill(id); else openEditor(); };
      row.appendChild(b);
      btns[si] = b;
    })(si);
    bar.addEventListener('pointerdown', function (e) { e.stopPropagation(); });   // 버튼 영역을 눌러도 캐릭터가 걸어가지 않게
    var gear = document.createElement('div');
    gear.textContent = '⚙️ 스킬 장착';
    gear.style.cssText = 'background:rgba(0,0,0,.62);border:1px solid #C084FC;border-radius:999px;padding:2px 10px;font-size:10px;font-weight:900;color:#fff;cursor:pointer;';
    gear.onpointerdown = function (e) { e.stopPropagation(); e.preventDefault(); openEditor(); };
    var gearRow = document.createElement('div');
    gearRow.style.cssText = 'display:flex;gap:6px;';
    var gbtn = document.createElement('div');
    gbtn.textContent = '🎀 소품 장착';
    gbtn.style.cssText = gear.style.cssText;
    gbtn.onpointerdown = function (e) { e.stopPropagation(); e.preventDefault(); try { if (window.FanGear) window.FanGear.open(F && F.cid); } catch (x) {} };
    gearRow.appendChild(gear); gearRow.appendChild(gbtn);
    // 🔁 맵 안에서 스킬 세트 1·2·3번 바로 바꾸기
    var setRow = document.createElement('div');
    setRow.style.cssText = 'display:flex;gap:5px;align-items:center;';
    var setLab = document.createElement('div');
    setLab.textContent = '세트';
    setLab.style.cssText = 'font-size:10px;font-weight:900;color:#fff;background:rgba(0,0,0,.62);border-radius:999px;padding:2px 8px;';
    setRow.appendChild(setLab);
    var setBtns = [];
    for (var sn = 1; sn <= SET_N; sn++) (function (sn) {
      var sb = document.createElement('div');
      sb.textContent = sn;
      sb.style.cssText = 'width:26px;height:22px;line-height:22px;text-align:center;border-radius:999px;font-size:12px;font-weight:900;color:#fff;cursor:pointer;background:rgba(0,0,0,.62);border:1.5px solid #C084FC;';
      sb.onpointerdown = function (e) {
        e.stopPropagation(); e.preventDefault();
        if (!F || activeSet(F.cid) === sn) return;
        try { switchSet(F.cid, sn); showNote('🔁 스킬 세트 ' + sn + '번으로 바꿨어요'); } catch (x) {}
        refreshBar();
      };
      setRow.appendChild(sb); setBtns.push(sb);
    })(sn);
    bar.appendChild(hint);
    bar.appendChild(gearRow);
    bar.appendChild(setRow);
    bar.appendChild(row);
    view.appendChild(bar);
    F.bar = bar; F.hint = hint; F.btns = btns; F.setBtns = setBtns;
  }

  function refreshBar() {
    if (!F || !F.bar) return;
    F.bar.style.display = $('bc-panel') ? 'none' : 'flex';
    var near = nearestTarget();
    var now = Date.now();
    var L = loadLoadout();
    if (F.setBtns) { var as_ = activeSet(F.cid); F.setBtns.forEach(function (sb, i) { var on = (i + 1) === as_; sb.style.background = on ? 'linear-gradient(135deg,#FF6B9D,#C084FC)' : 'rgba(0,0,0,.62)'; sb.style.borderColor = on ? '#FFD700' : '#C084FC'; }); }
    for (var si = 0; si < SLOTS; si++) {
      var s = L[si] ? skillById(L[si]) : null, b = F.btns[si];
      var ic = b.querySelector('.fs-ic'), lb = b.querySelector('.fs-lb');
      if (!s) { ic.textContent = '➕'; lb.textContent = '장착'; b.style.opacity = '.5'; b.style.borderColor = '#666'; b.style.animation = 'none'; continue; }
      var lvLock = !levelOk(s), locked = !hasSkill(F.cid, s);
      var left = Math.max(0, Math.ceil(((F.cd[s.id] || 0) - now) / 1000));
      var nr = nearestTarget(s.reach * (1 + 0.05 * masteryLv(F.cid, s.id)) * gm(F.cid, 'reach'));
      ic.textContent = (lvLock || locked) ? '🔒' : s.icon;
      lb.textContent = lvLock ? ('Lv.' + s.useLv) : (locked ? ('🍔' + priceLabel(s.price)) : (left > 0 ? left + '초' : s.short));
      var ready = !lvLock && !locked && left === 0 && !!nr;
      b.style.opacity = (lvLock || locked) ? '.55' : ((left > 0 || !nr) ? '.6' : '1');
      var tgo = nr && (nr.ev || nr); var want = !!tgo && !!tgo.fsSeq && (s.aoe || tgo.fsSeq[tgo.fsStep] === s.id);
      b.style.borderColor = ready ? (want ? '#FFD700' : '#FF6B9D') : '#C084FC';
      b.style.animation = (ready && want) ? 'fsReady 1s ease-in-out infinite' : 'none';
    }
    var t;
    if (near) { var no = near.ev || near, nk = no.fsSeq && skillById(no.fsSeq[no.fsStep]); t = '💬 ' + near.emoji + ' ' + near.name + ' 앞! ' + (nk ? nk.icon + ' 차례 · ' : '') + '게이지 ' + Math.min(100, no.fsGauge || 0) + '% (광역은 아무 칸이나 채워요)'; }
    else if (bcHook()) t = '💖 팬 가까이 가서 스킬을 써봐요 (닿으면 미니게임이 열려요)';
    else if (F.fans.length) t = '👀 팬이 기다리고 있어요! 가까이 걸어가요';
    else t = '✨ 이벤트가 끝나면 팬이 찾아와요';
    if (F.hint.textContent !== t) F.hint.textContent = t;
  }

  // ════════ 맵 화면 감시 ════════
  function onEventDone() {
    if (!F || bcHook() || Math.random() >= SPAWN_CHANCE) return;      // 문이 있으면 이벤트 자체가 대상이라 따로 팬이 안 옴
    var view = F.view;
    setTimeout(function () { if (F && F.view === view && $('bc-view') === view) spawnFan(); }, 500);
  }

  function mount(view) {
    if (F && F.obs) { try { F.obs.disconnect(); } catch (e) {} }
    var st = (typeof specialExploreState !== 'undefined') ? specialExploreState : null;
    var scid = (st && st.charId) || '';
    // 🎟️ 세연(체험용 히든카드)은 스킬·숙련도·경험치가 없으니, 내가 키우는 아이돌의 것을 빌려 쓴다
    if (scid === 'seyeon_trial') { try { scid = (typeof window.pickGrowingIdol === 'function' && window.pickGrowingIdol()) || ''; } catch (e) { scid = ''; } }
    F = { view: view, cid: scid, mapId: (st && st.locationId) || 'broadcast_front', fans: [], cd: {}, nid: 0, obs: null, bar: null, hint: null, btns: null };
    injectStyle();
    buildBar(view);
    setTimeout(function () { if (F && F.view === view && F.mapId !== 'fan_rush') seqTutorial(); }, 700);
    // 이벤트가 끝나면(결과창 #bc-panel 이 사라지면) 팬이 찾아온다
    try {
      F.obs = new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          Array.prototype.forEach.call(m.removedNodes, function (nd) { if (nd && nd.id === 'bc-panel') onEventDone(); });
        });
      });
      F.obs.observe(view, { childList: true });
    } catch (e) {}
    showNote(bcHook() ? '💖 팬 머리 위에 뜬 스킬을 그대로 써요! 가까이 가서 스킬 버튼을 눌러요 (틀리면 실패)' : '💖 이벤트가 끝나면 팬이 찾아와요! 가까이 가서 스킬을 써봐요');
    refreshBar();
  }

  function tick() {
    var view = $('bc-view');
    if (!view) {
      if (F) { try { if (F.obs) F.obs.disconnect(); } catch (e) {} F = null; }
      return;
    }
    if (!F || F.view !== view || !$('fs-bar')) mount(view);
    var now = Date.now();
    F.fans.slice().forEach(function (f) {
      if (f.until <= now) { removeFan(f, true); return; }
      if (f.el) f.el.style.opacity = (f.until - now < 8000) ? (Math.floor(now / 300) % 2 ? '.45' : '1') : '1';   // 곧 떠나면 깜빡
    });
    ensureEventBubbles();
    var near = nearestFan();
    F.fans.forEach(function (f) {
      var fc = f.el && f.el.querySelector('.fs-face');
      if (fc) fc.style.borderColor = (near === f) ? '#FFD700' : '#fff';
    });
    refreshBar();
  }

  // ════════ 구매 창 (맵에서 잠긴 스킬 버튼을 눌렀을 때) ════════
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  function closeBuyModal() { var m = $('fs-buy'); if (m) m.remove(); }
  function openBuyModal(sk) {
    if (!F || !F.view) return;
    closeBuyModal();
    var cid = F.cid;
    var m = document.createElement('div');
    m.id = 'fs-buy';
    m.style.cssText = 'position:absolute;inset:0;z-index:45;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:20px;' + FONT;
    var enough = coinsNow() >= sk.price;
    m.innerHTML =
      '<div style="width:100%;max-width:300px;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FF6B9D;border-radius:18px;padding:20px 18px;text-align:center;color:#fff;">' +
        '<div style="font-size:40px;">' + sk.icon + '</div>' +
        '<div style="font-size:16px;font-weight:900;margin:6px 0 4px;">' + sk.name + '</div>' +
        '<div style="font-size:12px;color:#ccc;line-height:1.6;margin-bottom:12px;">' + (charName(cid) ? charName(cid) + '의 ' : '') + '팬 응대 스킬이에요<br>' + sk.desc + '<br>더보기 > 팬 스킬 상점에서도 살 수 있어요</div>' +
        '<div style="font-size:13px;margin-bottom:12px;color:' + (enough ? '#fff' : '#ff8a8a') + ';">🍔 ' + fmt(coinsNow()) + ' / <b style="color:#FFD700;">' + fmt(sk.price) + '</b></div>' +
        '<button id="fs-buy-yes" style="width:100%;padding:13px;margin-bottom:8px;border:none;border-radius:13px;font-size:15px;font-weight:900;cursor:pointer;color:' + (enough ? '#fff' : '#777') + ';background:' + (enough ? 'linear-gradient(135deg,#FF6B9D,#C084FC)' : 'rgba(255,255,255,.1)') + ';' + FONT + '">' + (enough ? '🍔 ' + fmt(sk.price) + ' 코인으로 배우기' : '코인이 부족해요') + '</button>' +
        '<button id="fs-buy-no" style="width:100%;padding:11px;border:none;border-radius:12px;font-size:13px;font-weight:900;cursor:pointer;color:#aaa;background:rgba(255,255,255,.08);' + FONT + '">닫기</button>' +
      '</div>';
    m.addEventListener('pointerdown', function (e) { e.stopPropagation(); });   // 창을 눌러도 캐릭터가 걸어가지 않게
    F.view.appendChild(m);
    $('fs-buy-no').onclick = closeBuyModal;
    $('fs-buy-yes').onclick = function () {
      var r = buySkill(cid, sk.id);
      if (!r.ok) { toast(r.why === 'coins' ? '코인이 부족해요!' : '이미 배운 스킬이에요'); return; }
      closeBuyModal();
      toast('🎉 ' + (charName(cid) || '멤버') + '이(가) ' + sk.icon + ' ' + sk.name + ' 스킬을 배웠어요!');
      refreshBar();
    };
  }


  // ════════ ⚔️ 스킬 장착 화면 (더보기 > 팬 스킬 상점 / 맵의 ⚙️ 버튼) ════════
  var edSel = null;
  function openEditor(cid) {
    edChar = cid || (F && F.cid) || shopChar || charIds()[0] || null;
    var old = $('fs-editor'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'fs-editor';
    ov.style.cssText = 'position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:14px;' + "font-family:'Noto Sans KR',sans-serif;";
    ov.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    document.body.appendChild(ov);
    edSel = null;
    renderEditor();
  }
  function ownCount(s) { var n = 0; try { charIds().forEach(function (cid) { if (hasSkill(cid, s)) n++; }); } catch (e) {} return n; }
  function renderEditor() {
    var ov = $('fs-editor'); if (!ov) return;
    var L = loadLoadout();
    var slots = L.map(function (id, i) {
      var s = id ? skillById(id) : null, on = edSel === i;
      return '<div data-slot="' + i + '" style="width:54px;height:62px;border-radius:14px;border:2px solid ' + (on ? '#FFD700' : (s ? '#C084FC' : 'rgba(255,255,255,.25)')) + ';background:' + (s ? 'rgba(124,58,237,.35)' : 'rgba(255,255,255,.06)') + ';display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#fff;">' +
        '<div style="font-size:22px;">' + (s ? s.icon : '➕') + '</div><div style="font-size:9px;font-weight:900;margin-top:2px;">' + (s ? s.short : (on ? '고르기' : '빈 칸')) + '</div></div>';
    }).join('');
    var rows = SKILLS.map(function (s) {
      var eq = L.indexOf(s.id) !== -1, low = !levelOk(s);
      return '<div data-pick="' + s.id + '" style="display:flex;align-items:center;gap:10px;padding:9px 11px;margin-bottom:7px;border-radius:13px;cursor:pointer;background:' + (eq ? 'rgba(124,58,237,.3)' : 'rgba(255,255,255,.07)') + ';border:1.5px solid ' + (eq ? '#C084FC' : 'rgba(255,255,255,.14)') + ';opacity:' + (low ? '.6' : '1') + ';">' +
        '<div style="font-size:24px;">' + s.icon + '</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:900;color:#fff;">' + s.name + (s.aoe ? ' <span style="font-size:10px;color:#ffd76a;">광역</span>' : '') + '</div>' +
        '<div style="font-size:10px;color:#bbb;line-height:1.4;">' + s.desc + '</div></div>' +
        '<div style="font-size:11px;font-weight:900;color:' + (low ? '#ff9a9a' : '#9fe8b0') + ';white-space:nowrap;text-align:right;">' + (low ? '🔒 Lv.' + s.useLv : (s.price === 0 ? '기본 스킬' : (hasSkill(edChar, s) ? '배움 ✔' : '<span style="color:#ff9a9a;">🔒 ' + (charName(edChar) || '이 멤버') + ' 아직 안 배움</span>'))) + ((F && hasSkill(F.cid, s)) ? '<br><span style="color:#FFD700;">숙련 Lv.' + masteryLv(F.cid, s.id) + '</span>' : '') + (eq ? '<br><span style="color:#C084FC;">장착중</span>' : '') + '</div></div>';
    }).join('');
    ov.innerHTML = '<div style="width:100%;max-width:380px;max-height:92vh;overflow-y:auto;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #C084FC;border-radius:20px;padding:18px 14px;color:#fff;">' +
      '<div style="font-size:17px;font-weight:900;text-align:center;">⚔️ ' + (charName(edChar) || '') + ' 스킬 장착</div>' +
      '<div style="font-size:11px;color:#bbb;text-align:center;margin:4px 0 12px;line-height:1.5;">장착은 멤버마다 따로예요 · 그 멤버가 배운 스킬만 장착할 수 있어요 (모든 팬덤 원정 맵에서 적용)<br>칸을 누르고 → 아래 스킬을 눌러 장착 · 장착된 칸을 누르면 해제<br><span style="color:#ffd76a;">스킬은 멤버마다 배워야 하고, 쓰려면 플레이어 레벨이 필요해요 (지금 Lv.' + plv() + ')</span></div>' +
      '<div style="display:flex;justify-content:center;align-items:center;gap:6px;margin-bottom:10px;"><span style="font-size:11px;color:#bbb;margin-right:2px;">세트</span>' +
        [1, 2, 3].map(function (n) { var on = activeSet(edChar) === n; return '<button data-set="' + n + '" style="padding:8px 16px;border-radius:12px;border:2px solid ' + (on ? '#FFD700' : 'rgba(255,255,255,.25)') + ';background:' + (on ? 'rgba(255,215,0,.18)' : 'rgba(255,255,255,.06)') + ';color:#fff;font-size:13px;font-weight:900;cursor:pointer;font-family:inherit;">' + n + '번</button>'; }).join('') + '</div>' +
      '<div style="display:flex;justify-content:center;gap:7px;margin-bottom:14px;">' + slots + '</div>' + rows +
      '<button id="fs-ed-close" style="width:100%;margin-top:6px;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit;">완료</button></div>';
    $('fs-ed-close').onclick = function () { ov.remove(); edChar = null; try { refreshBar(); } catch (e) {} };
    Array.prototype.forEach.call(ov.querySelectorAll('[data-set]'), function (el) {
      el.onclick = function () {
        var n = Number(el.getAttribute('data-set'));
        if (n === activeSet(edChar)) return;
        switchSet(edChar, n); edSel = null;
        toast(n + '번 세트로 바꿨어요');
        try { refreshBar(); } catch (e) {}
        renderEditor();
      };
    });
    Array.prototype.forEach.call(ov.querySelectorAll('[data-slot]'), function (el) {
      el.onclick = function () {
        var i = Number(el.getAttribute('data-slot')), cur = loadLoadout();
        if (cur[i]) { equip(i, null); edSel = null; } else edSel = (edSel === i ? null : i);
        renderEditor();
      };
    });
    Array.prototype.forEach.call(ov.querySelectorAll('[data-pick]'), function (el) {
      el.onclick = function () {
        var id = el.getAttribute('data-pick'), cur = loadLoadout();
        var at = cur.indexOf(id);
        if (at !== -1) { equip(at, null); edSel = null; renderEditor(); return; }     // 장착중인 걸 누르면 해제
        var sk0 = skillById(id);
        if (sk0 && !hasSkill(edChar, sk0)) { toast('🔒 ' + (charName(edChar) || '이 멤버') + '은(는) 아직 이 스킬을 못 배웠어요! (더보기 > 💖 팬 스킬 상점에서 배워요)'); return; }   // 그 멤버가 배운 스킬만 장착
        var slot = edSel !== null && !cur[edSel] ? edSel : cur.indexOf(null);
        if (slot === -1) { toast('빈 칸이 없어요! 장착된 칸을 눌러 먼저 해제해요'); return; }
        equip(slot, id); edSel = null;
        renderEditor();
      };
    });
  }

  // ════════ 💖 팬 스킬 상점 (더보기 메뉴) ════════
  var shopChar = null;
  function charIds() {
    try {
      if (typeof CHARS === 'undefined') return [];
      return Array.isArray(CHARS) ? CHARS.map(function (c) { return c.id; }) : Object.keys(CHARS);
    } catch (e) { return []; }
  }
  function potionHtml() {                                  // ❤️ 원정 HP 회복약 (broadcast-expedition.js 문이 있을 때만)
    var hk = bcHook();
    if (!hk || !hk.potions) return '';
    var rows = hk.potions.list().map(function (po) {
      var enough = coinsNow() >= po.price;
      return '<div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.07);border:1.5px solid rgba(74,222,128,.5);border-radius:16px;padding:10px 14px;margin-bottom:8px;">' +
        '<div style="font-size:28px;">' + po.emoji + '</div>' +
        '<div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:900;color:#fff;">' + po.name + ' <span style="font-size:11px;color:#4ade80;">보유 ' + hk.potions.qty(po.id) + '</span></div><div style="font-size:11px;color:#aaa;line-height:1.5;">' + po.desc + '</div></div>' +
        '<button data-pbuy="' + po.id + '" style="padding:9px 12px;border:none;border-radius:12px;font-size:12px;font-weight:900;cursor:pointer;white-space:nowrap;color:' + (enough ? '#fff' : '#888') + ';background:' + (enough ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,.1)') + ';' + FONT + '">🍔 ' + fmt(po.price) + '</button></div>';
    }).join('');
    return '<div style="font-size:13px;font-weight:900;color:#fff;margin:4px 0 8px;">❤️ 회복약 <span style="font-size:11px;color:#aaa;font-weight:400;">(원정 중 HP 회복)</span></div>' + rows +
      '<div style="height:1px;background:rgba(255,255,255,.15);margin:12px 0;"></div>';
  }
  function openShop() {
    if (!$('fs-toast-fix')) { var tf = document.createElement('style'); tf.id = 'fs-toast-fix'; tf.textContent = '#bag-toast{z-index:3000 !important}'; document.head.appendChild(tf); }   // 상점(z955) 위에도 안내 메시지가 보이게
    var old = $('fs-shop'); if (old) old.remove();
    shopNote = '';
    var ov = document.createElement('div');
    ov.id = 'fs-shop';
    ov.style.cssText = 'position:fixed;inset:0;z-index:955;background:linear-gradient(180deg,#1a0a2e,#0a0515);overflow-y:auto;' + FONT;
    document.body.appendChild(ov);
    renderShop(ov);
  }
  var shopNote = '';
  function shopSay(ov, m) { shopNote = m; toast(m); renderShop(ov); }   // 상점 안에서도 결과를 눈에 띄게 보여줌 (토스트가 가려져도 보이게)
  function renderShop(ov) {
    ov = ov || $('fs-shop'); if (!ov) return;
    var ids = charIds();
    if (!shopChar || ids.indexOf(shopChar) === -1) shopChar = ids[0] || '';
    var chips = ids.map(function (id) {
      var on = id === shopChar;
      return '<button data-ch="' + id + '" style="padding:8px 14px;border:none;border-radius:999px;font-size:13px;font-weight:900;cursor:pointer;color:#fff;' + FONT +
        'background:' + (on ? 'linear-gradient(135deg,#FF6B9D,#C084FC)' : 'rgba(255,255,255,.1)') + ';">' + (charName(id) || id) + '</button>';
    }).join('');
    var rows = SKILLS.map(function (s) {
      var own = hasSkill(shopChar, s), enough = coinsNow() >= s.price;
      var btn = own
        ? '<div style="padding:8px 12px;border-radius:12px;font-size:12px;font-weight:900;color:#4ade80;border:1.5px solid #4ade80;">' + (s.price === 0 ? '기본' : '보유') + '</div>'
        : '<button data-buy="' + s.id + '" style="padding:9px 12px;border:none;border-radius:12px;font-size:12px;font-weight:900;cursor:pointer;white-space:nowrap;color:' + (enough ? '#fff' : '#888') + ';background:' + (enough ? 'linear-gradient(135deg,#FF6B9D,#C084FC)' : 'rgba(255,255,255,.1)') + ';' + FONT + '">🍔 ' + fmt(s.price) + '</button>';
      return '<div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.07);border:1.5px solid ' + (own ? 'rgba(74,222,128,.5)' : 'rgba(255,255,255,.18)') + ';border-radius:16px;padding:12px 14px;margin-bottom:10px;">' +
        '<div style="font-size:30px;">' + s.icon + '</div>' +
        '<div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:900;color:#fff;">' + s.name + (s.aoe ? ' <span style="font-size:10px;color:#ffd76a;">광역</span>' : '') + '</div><div style="font-size:11px;color:#aaa;line-height:1.5;">' + s.desc + ' · <b style="color:' + (levelOk(s) ? '#9fe8b0' : '#ff9a9a') + ';">사용 Lv.' + s.useLv + '</b></div></div>' + btn + '</div>';
    }).join('');
    ov.innerHTML =
      '<div style="position:sticky;top:0;z-index:2;background:rgba(10,5,20,.94);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;">' +
        '<div style="color:#fff;font-size:17px;font-weight:900;">💖 팬 스킬 상점</div>' +
        '<button id="fs-shop-close" style="border:none;border-radius:12px;background:rgba(255,255,255,.12);color:#fff;padding:7px 12px;font-weight:900;cursor:pointer;' + FONT + '">닫기</button></div>' +
      '<div style="padding:0 16px 40px;">' +
        (shopNote ? '<div style="background:rgba(255,215,0,.16);border:1.5px solid #FFD700;border-radius:12px;padding:10px 12px;margin-bottom:10px;font-size:13px;font-weight:900;color:#fff;text-align:center;">' + shopNote + '</div>' : '') +
        '<div style="background:rgba(255,255,255,.07);border:1px solid #FFD70066;border-radius:12px;padding:8px 12px;margin-bottom:12px;display:flex;justify-content:space-between;font-size:13px;color:#fff;"><span>🍔 보유 코인</span><b style="color:#FFD700;">' + fmt(coinsNow()) + '</b></div>' +
        potionHtml() +
        '<button id="fs-open-ed" style="width:100%;margin-bottom:12px;padding:12px;border:none;border-radius:13px;background:linear-gradient(135deg,#C084FC,#7c3aed);color:#fff;font-size:14px;font-weight:900;cursor:pointer;' + FONT + '">⚔️ 스킬 장착하기 (' + loadLoadout().filter(Boolean).length + '/' + SLOTS + ')</button>' +
        '<div style="font-size:11px;color:#aaa;line-height:1.6;margin-bottom:10px;">팬 응대 스킬은 멤버마다 따로 배워요. 팬은 아직 못 배운 스킬도 원하니까, 많이 배울수록 😍 대만족이 자주 나와요.</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">' + chips + '</div>' +
        rows + '</div>';
    Array.prototype.forEach.call(ov.querySelectorAll('[data-pbuy]'), function (b) {
      b.onclick = function () {
        var hk = bcHook(); if (!hk || !hk.potions) { shopSay(ov, '⚠️ 회복약 상점을 아직 못 불러왔어요. 잠깐 뒤에 다시 눌러봐요'); return; }
        var pid = b.getAttribute('data-pbuy');
        var po = hk.potions.list().filter(function (x) { return x.id === pid; })[0];
        if (!po) return;
        function doBuy(n) {
          var r;
          try { r = hk.potions.buy(pid, n); } catch (e) { shopSay(ov, '⚠️ 구매 중 오류가 났어요: ' + (e && e.message || e)); return; }
          if (!r.ok) { shopSay(ov, r.why === 'coins' ? '🍔 코인이 부족해요!' : r.why === 'bag' ? '🎒 가방이 가득 찼어요! 가방을 비우거나 넓혀봐요' : '살 수 없어요'); return; }
          shopSay(ov, po.emoji + ' ' + po.name + ' ' + n + '개를 샀어요!');
        }
        if (typeof qpOpen === 'function') {                 // 일반 상점처럼 수량 고르는 팝업 (슬라이더 / 직접 입력 / 최대)
          qpOpen({ mode: 'buy', emoji: po.emoji, name: po.name, unit: po.price, max: Math.floor(coinsNow() / po.price), onConfirm: doBuy });
        } else doBuy(1);
      };
    });
    ov.querySelector('#fs-shop-close').onclick = function () { ov.remove(); };
    var edb = ov.querySelector('#fs-open-ed'); if (edb) edb.onclick = function () { openEditor(shopChar); var e2 = $('fs-editor'); if (e2) { var cl = e2.querySelector('#fs-ed-close'); var o = cl.onclick; cl.onclick = function () { o(); renderShop(ov); }; } };
    Array.prototype.forEach.call(ov.querySelectorAll('[data-ch]'), function (b) { b.onclick = function () { shopChar = b.getAttribute('data-ch'); renderShop(ov); }; });
    Array.prototype.forEach.call(ov.querySelectorAll('[data-buy]'), function (b) {
      b.onclick = function () {
        var sk = skillById(b.getAttribute('data-buy'));
        var r = buySkill(shopChar, sk.id);
        if (!r.ok) { shopSay(ov, r.why === 'coins' ? '🍔 코인이 부족해요!' : '이미 배운 스킬이에요'); return; }
        shopSay(ov, '🎉 ' + (charName(shopChar) || '멤버') + '이(가) ' + sk.icon + ' ' + sk.name + ' 스킬을 배웠어요!');
      };
    });
  }
  window.openFanSkillShop = openShop;

  // 더보기 메뉴에 타일 붙이기 (함수가 아직 로드 안 됐으면 잠깐 기다렸다가 시도)
  (function whenReady() {
    var tries = 0;
    (function attempt() {
      var ok = false;
      try { ok = typeof window.openMoreMenu === 'function' && typeof window.moreMenuTileHtml === 'function'; } catch (e) {}
      if (!ok) { if (++tries < 200) setTimeout(attempt, 100); return; }
      var original = window.openMoreMenu;
      if (original.__fanShopWrapped) return;
      var wrapped = function () {
        var r = original.apply(this, arguments);
        var grid = document.getElementById('more-menu-grid');
        if (grid && !document.getElementById('more-fanshop-tile')) {
          grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('💖', '팬 스킬 상점', '#FF6B9D', 'openFanSkillShop()'));
          if (grid.lastElementChild) grid.lastElementChild.id = 'more-fanshop-tile';
        }
        return r;
      };
      wrapped.__fanShopWrapped = true;
      window.openMoreMenu = wrapped;
    })();
  })();

  setInterval(tick, 200);

  (function hookBagBook() {
    if (typeof window.showBagItemDetail !== 'function') { setTimeout(hookBagBook, 100); return; }
    if (window.__fsBookHooked) return;
    window.__fsBookHooked = true;
    var orig = window.showBagItemDetail;
    window.showBagItemDetail = function (idx) {
      var r = orig.apply(this, arguments);
      try {
        var item = bagItems[idx], ov = $('bag-detail-overlay'), sk = item && item.type === 'skillbook' ? bookSkill(item.name) : null;
        if (sk && ov && !ov.querySelector('#fs-book-use')) {
          var b = document.createElement('button');
          b.id = 'fs-book-use'; b.textContent = '📘 숙련도 올리기';
          b.style.cssText = 'width:100%;padding:12px;margin-bottom:8px;background:linear-gradient(135deg,#C084FC,#7c3aed);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit;';
          b.onclick = function () { openBookPicker(sk); };
          var close = ov.querySelector('button');
          if (close) close.parentNode.insertBefore(b, close); else ov.firstChild.appendChild(b);
        }
      } catch (e) {}
      return r;
    };
  })();
  window.__fsCutIn = cutIn;
  window.__fanSkillsAPI = { masteryLv: function (cid, id) { return masteryLv(cid, id); }, tut: tutModal, giveBook: giveBook, bookName: function (id) { var k = skillById(id); return k ? bookName(k) : ''; }, feedBook: feedBook, SKILLS: SKILLS, SLOTS: SLOTS, loadout: loadLoadout, equip: equip, levelOk: levelOk, hasSkill: function (cid, id) { var sk = skillById(id); return !!sk && hasSkill(cid, sk); }, openEditor: openEditor, openShop: openShop };

  window.__fanSkillsTest = {
    spawnFan: spawnFan, useSkill: useSkill, serves: serves, masteryLv: masteryLv, useCount: useCount, unlockedSkills: unlockedSkills,
    buySkill: buySkill, nearestTarget: nearestTarget, hasSkill: hasSkill, openShop: openShop, openBuyModal: openBuyModal, skillById: skillById,
    state: function () { return F; }, store: loadStore, playerPos: playerPos, evTarget: evTarget
  };
})();
