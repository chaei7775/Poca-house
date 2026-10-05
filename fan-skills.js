// ════════════════════════════════
// 💖 팬 응대 스킬 (fan-skills.js)
//
// 팬덤 원정 맵(방송국 앞 / 팬미팅장 / 공연장)에서 쓰는 '멤버 스킬'.
// broadcast-expedition.js 는 건드리지 않고, 맵 화면이 뜨면 화면(DOM)에 붙어서 동작한다.
//
// 방식
//  - 맵 이벤트(❗)를 하나 끝낼 때마다 팬이 근처에 찾아온다. (이벤트 = 스태미나를 쓰니까 팬 수도 자연스럽게 제한됨)
//  - 팬 머리 위 말풍선에 그 팬이 좋아하는 스킬이 떠 있다.
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

  var SKILLS = [                 // price = 상점 가격(멤버 1명당 코인). 0이면 처음부터 가지고 있음
    { id: 'sign',  name: '사인해주기', short: '사인', icon: '✍️', price: 0,       desc: '펜이 반짝! 팬이 제일 좋아하는 기본 스킬' },
    { id: 'photo', name: '사진촬영',   short: '사진', icon: '📸', price: 0,       desc: '찰칵! 폴라로이드 한 장을 남겨요' },
    { id: 'shake', name: '악수',       short: '악수', icon: '🤝', price: 300000,  desc: '손을 맞잡고 반짝이를 터뜨려요' },
    { id: 'heart', name: '손하트',     short: '하트', icon: '💗', price: 1000000, desc: '하트를 날려서 팬 마음을 저격해요' }
  ];
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
  function ownedMap(cid) { var s = loadStore(); return (s[cid] && s[cid].owned && typeof s[cid].owned === 'object') ? s[cid].owned : {}; }
  function hasSkill(cid, sk) { return !!sk && (sk.price === 0 || !!ownedMap(cid)[sk.id]); }
  function unlockedSkills(cid) { return SKILLS.filter(function (s) { return hasSkill(cid, s); }); }
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
    } else if (id === 'heart') {
      var h = addAt(me.x, me.y, '<div style="font-size:30px;">💗</div>', 'transition:left .5s ease-in,top .5s ease-in;', 1300);
      if (h) setTimeout(function () { h.style.left = (fx * 100) + '%'; h.style.top = (fy * 100) + '%'; }, 30);
      setTimeout(function () { burst(fx, fy, ['💗', '💖', '💕'], love ? 14 : 8, 70); }, 520);
    }
  }
  function floatText(x, y, html) {
    addAt(x, y, html, 'animation:fsRise 1.5s ease-out forwards;white-space:nowrap;', 1550);
  }
  function chipHtml(icon, text, color) {
    return '<div style="display:inline-flex;align-items:center;gap:5px;background:rgba(20,10,40,.88);border:1.5px solid ' + color +
      ';border-radius:999px;padding:3px 9px;margin:2px;font-size:11px;font-weight:900;color:#fff;">' + icon + ' ' + text + '</div>';
  }

  // ════════ 팬 ════════
  function buildFanEl(f) {
    var sk = skillById(f.fav);
    var el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:' + (f.x * 100) + '%;top:' + (f.y * 100) + '%;transform:translate(-50%,-50%);z-index:12;pointer-events:none;text-align:center;';
    el.innerHTML =
      '<div style="position:relative;animation:fsIn .45s ease-out;">' +
        '<div style="position:absolute;left:-20px;right:-20px;top:-34px;display:flex;justify-content:center;">' +
          '<div class="fs-bubble" style="animation:fsBob 1s ease-in-out infinite;background:#fff;border:2px solid #FF6B9D;border-radius:999px;padding:1px 9px;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.4);">' + sk.icon + (hasSkill(F.cid, sk) ? '' : '<span style="font-size:11px;">🔒</span>') + '</div></div>' +
        '<div class="fs-face" style="width:40px;height:40px;border-radius:50%;background:#fff;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 3px 10px rgba(0,0,0,.5);margin:0 auto;">' + f.emoji + '</div>' +
        '<div style="margin-top:2px;font-size:9px;font-weight:900;color:#fff;text-shadow:0 1px 4px #000;white-space:nowrap;">' + f.name + '</div>' +
      '</div>';
    var layer = $('bc-layer');
    if (layer) layer.appendChild(el);
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
    var f = { id: ++F.nid, x: x, y: y, name: type.name, emoji: type.emoji, fav: SKILLS[Math.floor(Math.random() * SKILLS.length)].id, until: Date.now() + FAN_TTL * 1000, el: null };
    f.el = buildFanEl(f);
    F.fans.push(f);
    var fsk = skillById(f.fav);
    showNote(hasSkill(F.cid, fsk)
      ? '💬 ' + f.name + '이(가) 찾아왔어요! 가까이 가서 ' + fsk.icon + ' ' + fsk.name + '을(를) 해줘요'
      : '💬 ' + f.name + '이(가) 찾아왔어요! ' + fsk.icon + ' ' + fsk.name + '을(를) 원하는데 아직 못 배웠어요 🔒 (다른 스킬로도 만족시킬 수 있어요)');
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

  function nearestFan() {
    var me = playerPos();
    if (!F || !me) return null;
    var best = null, bd = 1e9;
    F.fans.forEach(function (f) {
      var d = pxDist(f.x, f.y, me.x, me.y);
      if (d <= FAN_RANGE && d < bd) { best = f; bd = d; }
    });
    return best;
  }

  // ════════ 보상 ════════
  function grant(love) {
    var mult = love ? LOVE_MULT : 1;
    var lines = [];
    var cm = COIN_MULT[F.mapId] || 1;
    var gain = Math.max(1, Math.round(COIN_BASE * cm * mult * (0.9 + Math.random() * 0.2)));
    if (typeof coins !== 'undefined') { coins += gain; lines.push(chipHtml('🍔', '+' + fmt(gain), '#FFD700')); }
    var exp = Math.round(EXP_BASE * mult);
    if (exp > 0 && F.cid && typeof addCardExp === 'function') { try { addCardExp(F.cid, exp); lines.push(chipHtml('⭐', '+' + exp + ' EXP', '#FFD700')); } catch (e) {} }
    var pieces = 0;
    if (love && F.mapId === 'broadcast_front' && Math.random() < PIECE_CHANCE && typeof addToBag === 'function') {
      if (addToBag(PIECE_EMOJI, PIECE_NAME, 'piece', 1, '프리미엄 카드 조각 · ' + PIECE_GOAL + '개를 모으면 더보기 > 프리미엄 카드에서 교환')) {
        pieces = 1; lines.push(chipHtml(PIECE_EMOJI, PIECE_NAME + ' +1', '#7dd3fc'));
      }
    }
    if (typeof saveAll === 'function') { try { saveAll(); } catch (e) {} }
    if (typeof updateCoinsDisplay === 'function') { try { updateCoinsDisplay(); } catch (e) {} }
    return { coins: gain, exp: exp, pieces: pieces, lines: lines };
  }

  // ════════ 스킬 사용 ════════
  function useSkill(id) {
    if (!F) return null;
    var sk = skillById(id);
    if (!sk) return null;
    if ($('bc-panel')) return null;                                  // 이벤트 진행 중엔 못 씀
    if (!hasSkill(F.cid, sk)) { openBuyModal(sk); return null; }      // 아직 안 배운 스킬: 구매 창
    var now = Date.now();
    if ((F.cd[id] || 0) > now) return null;
    var fan = nearestFan();
    if (!fan) { toast('가까이에 팬이 없어요! 팬 쪽으로 걸어가 봐요'); return null; }
    var me = playerPos();
    var love = fan.fav === id;
    F.cd[id] = now + COOLDOWN * 1000;
    var fanRef = fan;
    F.fans.splice(F.fans.indexOf(fan), 1);                           // 응대 중인 팬은 다른 스킬 대상에서 빠짐
    effect(id, fanRef, me, love);
    var r = grant(love);
    var total = addServe(F.cid);
    var fc = fanRef.el && fanRef.el.querySelector('.fs-face');
    if (fc) fc.textContent = love ? '😍' : '😊';
    floatText(fanRef.x, fanRef.y - 0.03,
      '<div style="font-size:15px;font-weight:900;color:' + (love ? '#FFD700' : '#fff') + ';text-shadow:0 2px 6px #000;text-align:center;">' + (love ? '😍 대만족!' : '😊 만족') + '</div>' +
      '<div style="text-align:center;">' + r.lines.join('') + '</div>');
    sfx(love ? 'rarePick' : 'pick');
    setTimeout(function () { removeFan(fanRef, true); }, 900);
    refreshBar();
    return { love: love, reward: r, serves: total };
  }

  // ════════ 화면 (스킬 버튼) ════════
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
    note.style.cssText = 'display:none;position:absolute;top:92px;left:10px;right:10px;z-index:30;background:rgba(26,26,46,.92);border:1.5px solid #FF6B9D;border-radius:14px;padding:8px 12px;color:#fff;font-size:12px;font-weight:900;text-align:center;pointer-events:none;';
    view.appendChild(note);

    var bar = document.createElement('div');
    bar.id = 'fs-bar';
    bar.style.cssText = 'position:absolute;left:0;right:0;bottom:10px;z-index:38;display:flex;flex-direction:column;align-items:center;gap:6px;font-family:\'Noto Sans KR\',sans-serif;';
    var hint = document.createElement('div');
    hint.style.cssText = 'background:rgba(0,0,0,.62);border-radius:999px;padding:3px 12px;font-size:11px;font-weight:900;color:#fff;';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;';
    var btns = {};
    SKILLS.forEach(function (s) {
      var b = document.createElement('div');
      b.setAttribute('data-skill', s.id);
      b.style.cssText = 'width:60px;height:60px;border-radius:50%;background:rgba(26,26,46,.9);border:2.5px solid #C084FC;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:#fff;user-select:none;-webkit-user-select:none;';
      b.innerHTML = '<div class="fs-ic" style="font-size:24px;line-height:1;"></div><div class="fs-lb" style="font-size:9px;font-weight:900;margin-top:2px;"></div>';
      b.onpointerdown = function (e) { e.stopPropagation(); e.preventDefault(); useSkill(s.id); };
      row.appendChild(b);
      btns[s.id] = b;
    });
    bar.addEventListener('pointerdown', function (e) { e.stopPropagation(); });   // 버튼 영역을 눌러도 캐릭터가 걸어가지 않게
    bar.appendChild(hint);
    bar.appendChild(row);
    view.appendChild(bar);
    F.bar = bar; F.hint = hint; F.btns = btns;
  }

  function refreshBar() {
    if (!F || !F.bar) return;
    F.bar.style.display = $('bc-panel') ? 'none' : 'flex';
    var near = nearestFan();
    var now = Date.now();
    SKILLS.forEach(function (s) {
      var b = F.btns[s.id];
      var ic = b.querySelector('.fs-ic'), lb = b.querySelector('.fs-lb');
      var locked = !hasSkill(F.cid, s);
      var left = Math.max(0, Math.ceil(((F.cd[s.id] || 0) - now) / 1000));
      ic.textContent = locked ? '🔒' : s.icon;
      lb.textContent = locked ? ('🍔' + priceLabel(s.price)) : (left > 0 ? left + '초' : s.short);
      var ready = !locked && left === 0 && !!near;
      b.style.opacity = locked ? '.55' : ((left > 0 || !near) ? '.6' : '1');
      b.style.borderColor = ready ? (near.fav === s.id ? '#FFD700' : '#FF6B9D') : '#C084FC';
      b.style.animation = (ready && near.fav === s.id) ? 'fsReady 1s ease-in-out infinite' : 'none';
    });
    var t;
    if (near) t = '💬 ' + near.name + ' 바로 앞! ' + skillById(near.fav).icon + ' 를 좋아해요' + (hasSkill(F.cid, skillById(near.fav)) ? '' : ' (아직 못 배움 🔒)');
    else if (F.fans.length) t = '👀 팬이 기다리고 있어요! 가까이 걸어가요';
    else t = '✨ 이벤트가 끝나면 팬이 찾아와요';
    if (F.hint.textContent !== t) F.hint.textContent = t;
  }

  // ════════ 맵 화면 감시 ════════
  function onEventDone() {
    if (!F || Math.random() >= SPAWN_CHANCE) return;
    var view = F.view;
    setTimeout(function () { if (F && F.view === view && $('bc-view') === view) spawnFan(); }, 500);
  }

  function mount(view) {
    if (F && F.obs) { try { F.obs.disconnect(); } catch (e) {} }
    var st = (typeof specialExploreState !== 'undefined') ? specialExploreState : null;
    F = { view: view, cid: (st && st.charId) || '', mapId: (st && st.locationId) || 'broadcast_front', fans: [], cd: {}, nid: 0, obs: null, bar: null, hint: null, btns: null };
    injectStyle();
    buildBar(view);
    // 이벤트가 끝나면(결과창 #bc-panel 이 사라지면) 팬이 찾아온다
    try {
      F.obs = new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          Array.prototype.forEach.call(m.removedNodes, function (nd) { if (nd && nd.id === 'bc-panel') onEventDone(); });
        });
      });
      F.obs.observe(view, { childList: true });
    } catch (e) {}
    showNote('💖 이벤트가 끝나면 팬이 찾아와요! 가까이 가서 스킬을 써봐요');
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

  // ════════ 💖 팬 스킬 상점 (더보기 메뉴) ════════
  var shopChar = null;
  function charIds() {
    try {
      if (typeof CHARS === 'undefined') return [];
      return Array.isArray(CHARS) ? CHARS.map(function (c) { return c.id; }) : Object.keys(CHARS);
    } catch (e) { return []; }
  }
  function openShop() {
    var old = $('fs-shop'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'fs-shop';
    ov.style.cssText = 'position:fixed;inset:0;z-index:955;background:linear-gradient(180deg,#1a0a2e,#0a0515);overflow-y:auto;' + FONT;
    document.body.appendChild(ov);
    renderShop(ov);
  }
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
        '<div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:900;color:#fff;">' + s.name + '</div><div style="font-size:11px;color:#aaa;line-height:1.5;">' + s.desc + '</div></div>' + btn + '</div>';
    }).join('');
    ov.innerHTML =
      '<div style="position:sticky;top:0;z-index:2;background:rgba(10,5,20,.94);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;">' +
        '<div style="color:#fff;font-size:17px;font-weight:900;">💖 팬 스킬 상점</div>' +
        '<button id="fs-shop-close" style="border:none;border-radius:12px;background:rgba(255,255,255,.12);color:#fff;padding:7px 12px;font-weight:900;cursor:pointer;' + FONT + '">닫기</button></div>' +
      '<div style="padding:0 16px 40px;">' +
        '<div style="background:rgba(255,255,255,.07);border:1px solid #FFD70066;border-radius:12px;padding:8px 12px;margin-bottom:12px;display:flex;justify-content:space-between;font-size:13px;color:#fff;"><span>🍔 보유 코인</span><b style="color:#FFD700;">' + fmt(coinsNow()) + '</b></div>' +
        '<div style="font-size:11px;color:#aaa;line-height:1.6;margin-bottom:10px;">팬 응대 스킬은 멤버마다 따로 배워요. 팬은 아직 못 배운 스킬도 원하니까, 많이 배울수록 😍 대만족이 자주 나와요.</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">' + chips + '</div>' +
        rows + '</div>';
    ov.querySelector('#fs-shop-close').onclick = function () { ov.remove(); };
    Array.prototype.forEach.call(ov.querySelectorAll('[data-ch]'), function (b) { b.onclick = function () { shopChar = b.getAttribute('data-ch'); renderShop(ov); }; });
    Array.prototype.forEach.call(ov.querySelectorAll('[data-buy]'), function (b) {
      b.onclick = function () {
        var sk = skillById(b.getAttribute('data-buy'));
        var r = buySkill(shopChar, sk.id);
        if (!r.ok) { toast(r.why === 'coins' ? '코인이 부족해요!' : '이미 배운 스킬이에요'); return; }
        toast('🎉 ' + (charName(shopChar) || '멤버') + '이(가) ' + sk.icon + ' ' + sk.name + ' 스킬을 배웠어요!');
        renderShop(ov);
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

  window.__fanSkillsTest = {
    spawnFan: spawnFan, useSkill: useSkill, serves: serves, unlockedSkills: unlockedSkills,
    buySkill: buySkill, hasSkill: hasSkill, openShop: openShop, openBuyModal: openBuyModal, skillById: skillById,
    state: function () { return F; }, store: loadStore
  };
})();
