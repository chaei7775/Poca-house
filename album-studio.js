// ════════════════════════════════
// 🎼 작곡 테이블 + 📒 작곡노트 (album-studio.js)
// 🎹 작곡 스튜디오(studio-explore.js)에서 모은 재료 14종으로 직접 곡을 만들어 앨범으로 낸다.
// 들어가는 곳: 작곡 스튜디오 장소 화면의 "🎼 작곡 테이블" 버튼 / 더보기 > 🎼 작곡 테이블
//
// 규칙
//  · 재료 종류를 최대 12종까지 골라 "작곡하기". 30칸(장르 10 × 등급 3)마다 정해진 레시피(재료 조합)가 있고,
//    고른 조합이 레시피와 정확히 같을 때만 곡이 된다. 아무렇게나 많이 넣는다고 되지 않는다.
//    안 맞으면 "그냥 실패했어요". 실패해도 재료는 하나도 안 사라지고, 얼마나 비슷한지와 재료 하나("○○이 들어가요")를 알려준다.
//  · 레시피는 노트에서 스스로 찾는다. 한 칸을 찾으면 같은 장르의 다음 등급 레시피에 대한 단서(재료 분류 모양)가 노트에 적힌다.
//  · 성공하면 노트에 등록되고 앨범이 가방에 들어온다. 앨범은 💿판매 탭에서 코인으로 바꾼다.
//  · 고른 종류마다 같은 개수가 든다 (등급이 정함: 데모 4 / 미니 7 / 정규 11, 영감은 1/3).
//  · 도감 칸 하나당 앨범 판매가 +1%, 한 장르의 세 등급을 다 채우면 그 장르마다 +2% 더 (최대 +50%)
// 값을 바꾸고 싶으면 아래 설정만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var ACC = '#ffb86b';
  var NOTE_KEY = 'ph_composeNote';               // ph_ 로 시작 → 클라우드 저장 자동
  var MAX_KINDS = 12;
  var TIERS = [                                  // 종류 수 → 등급. per = 고른 종류 하나당 드는 개수
    { id: 'full', min: 10, emoji: '📀', name: '정규 앨범', per: 11, price: 240000 },
    { id: 'mini', min: 7,  emoji: '💽', name: '미니 앨범', per: 7,  price: 90000 },
    { id: 'demo', min: 4,  emoji: '💿', name: '데모 앨범', per: 4,  price: 30000 }
  ];
  var HINT_MIN_J = 0.3;                          // 비슷한 정도가 이 이상이면 실패할 때마다 재료 하나를 알려준다 (0이면 항상, 2면 끔)
  var SPARK_DIV = 3;                             // 💡 영감의불꽃은 다른 재료의 1/3개만 든다
  var BONUS_PER_ENTRY = 0.01, BONUS_PER_GENRE = 0.02;
  // 장르: 필요한 악기 조합 (더 많이 맞는 장르가 우선). 퓨전 = 악기 4종 이상
  var GENRES = [
    { id: 'rock',  name: '록',         need: ['gtr', 'drm'] },
    { id: 'pop',   name: '팝',         need: ['gtr', 'pno'] },
    { id: 'ballad',name: '발라드',     need: ['pno', 'str'] },
    { id: 'dance', name: '댄스',       need: ['syn', 'drm'] },
    { id: 'edm',   name: 'EDM',        need: ['syn', 'bas'] },
    { id: 'hiphop',name: '힙합',       need: ['drm', 'bas'] },
    { id: 'jazz',  name: '재즈',       need: ['pno', 'bas'] },
    { id: 'acou',  name: '어쿠스틱',   need: ['gtr', 'str'] },
    { id: 'orch',  name: '오케스트라', need: ['str', 'drm', 'pno'] },
    { id: 'fusion',name: '퓨전',       need: [], fusion: true }
  ];
  // ★ 레시피 30개 (장르 × 등급). 재료 id: n1 온음표 n2 2분 n4 4분 n8 8분 n16 16분 / gtr 기타 bas 베이스 drm 드럼 pno 피아노 syn 신스 str 스트링 / scr 악보용지 lyr 가사조각 spk 영감의불꽃
  //   값을 바꿔도 됨 (같은 조합이 두 칸에 겹치면 안 됨 — 겹치면 앞에 있는 칸이 이김)
  var RECIPES = {
    rock:   { demo: ['scr', 'n8', 'gtr', 'drm'],  mini: ['scr', 'n8', 'n16', 'gtr', 'drm', 'bas'],  full: ['scr', 'n4', 'n8', 'n16', 'gtr', 'drm', 'bas', 'lyr', 'spk'] },
    pop:    { demo: ['scr', 'n4', 'gtr', 'pno'],  mini: ['scr', 'n4', 'n8', 'gtr', 'pno', 'lyr'],  full: ['scr', 'n2', 'n4', 'n8', 'gtr', 'pno', 'syn', 'lyr', 'spk'] },
    ballad: { demo: ['scr', 'n2', 'pno', 'str'],  mini: ['scr', 'n1', 'n2', 'pno', 'str', 'lyr'],  full: ['scr', 'n1', 'n2', 'n4', 'pno', 'str', 'gtr', 'lyr', 'spk'] },
    dance:  { demo: ['scr', 'n8', 'syn', 'drm'],  mini: ['scr', 'n8', 'n16', 'syn', 'drm', 'lyr'], full: ['scr', 'n4', 'n8', 'n16', 'syn', 'drm', 'bas', 'lyr', 'spk'] },
    edm:    { demo: ['scr', 'n16', 'syn', 'bas'], mini: ['scr', 'n8', 'n16', 'syn', 'bas', 'drm'], full: ['scr', 'n2', 'n8', 'n16', 'syn', 'bas', 'drm', 'pno', 'spk'] },
    hiphop: { demo: ['scr', 'n4', 'drm', 'bas'],  mini: ['scr', 'n4', 'n8', 'drm', 'bas', 'lyr'],  full: ['scr', 'n2', 'n4', 'n8', 'drm', 'bas', 'syn', 'lyr', 'spk'] },
    jazz:   { demo: ['scr', 'n2', 'pno', 'bas'],  mini: ['scr', 'n2', 'n8', 'pno', 'bas', 'drm'],  full: ['scr', 'n2', 'n4', 'n8', 'pno', 'bas', 'drm', 'gtr', 'spk'] },
    acou:   { demo: ['scr', 'n2', 'gtr', 'str'],  mini: ['scr', 'n2', 'n4', 'gtr', 'str', 'lyr'],  full: ['scr', 'n2', 'n4', 'n8', 'gtr', 'str', 'bas', 'lyr', 'spk'] },
    orch:   { demo: ['scr', 'n1', 'str', 'pno'],  mini: ['scr', 'n1', 'n2', 'str', 'pno', 'drm'],  full: ['scr', 'n1', 'n2', 'n4', 'n8', 'str', 'pno', 'drm', 'gtr', 'spk'] },
    fusion: { demo: ['scr', 'n4', 'gtr', 'syn'],  mini: ['scr', 'n4', 'n16', 'gtr', 'syn', 'str'], full: ['scr', 'n1', 'n2', 'n4', 'n8', 'n16', 'gtr', 'bas', 'drm', 'pno', 'syn', 'str'] }
  };
  var TITLES_A = ['달빛', '새벽', '반짝이는', '첫눈', '마지막', '푸른', '비밀', '여름밤', '별빛', '두근두근', '노을', '봄날'];
  var TITLES_B = ['세레나데', '러브레터', '멜로디', '플레이리스트', '노래', '약속', '왈츠', '기억', '엔딩', '인사', '고백', '랩소디'];

  // ════════ 순수 로직 (화면 없이도 테스트 가능) ════════
  function kinds() { return window.STUDIO_KINDS || []; }
  function kindById(id) { return kinds().filter(function (k) { return k.id === id; })[0]; }
  function qtyOf(name, items) {
    var it = (items || []).filter(function (i) { return i.name === name; })[0];
    return it ? Math.max(0, Math.floor(Number(it.qty) || 0)) : 0;
  }
  function tierById(id) { return TIERS.filter(function (t) { return t.id === id; })[0]; }
  function needFor(kind, tier) { return kind.cat === 'spark' ? Math.max(1, Math.ceil(tier.per / SPARK_DIV)) : tier.per; }
  function sameSet(a, b) { return a.length === b.length && a.every(function (x) { return b.indexOf(x) !== -1; }); }
  function findRecipe(ids) {
    for (var gi = 0; gi < GENRES.length; gi++) {
      var g = GENRES[gi];
      for (var ti = 0; ti < TIERS.length; ti++) { var t = TIERS[ti]; if (sameSet(ids, RECIPES[g.id][t.id])) return { genre: g, tier: t }; }
    }
    return null;
  }
  // 가장 비슷한 레시피와 얼마나 겹치는지 (힌트용)
  function nearest(ids) {
    var best = { j: 0, rc: null };
    GENRES.forEach(function (g) { TIERS.forEach(function (t) {
      var rc = RECIPES[g.id][t.id], m = rc.filter(function (x) { return ids.indexOf(x) !== -1; }).length;
      var jac = m / (rc.length + ids.length - m);                     // 겹침 정도 (1이면 똑같음)
      if (jac > best.j) best = { j: jac, rc: rc };
    }); });
    return best;
  }
  // 실패할 때마다 재료 하나를 알려준다: 모자란 재료가 있으면 "○○이(가) 들어가요", 없고 군더더기만 있으면 "○○은(는) 안 들어가요"
  function josa(w, a, b) { var c = w.charCodeAt(w.length - 1) - 44032; return (c >= 0 && c < 11172 && c % 28 !== 0) ? a : b; }
  function oneHint(ids, rc, rng) {
    rng = rng || Math.random;
    var missing = rc.filter(function (x) { return ids.indexOf(x) === -1; }), extra = ids.filter(function (x) { return rc.indexOf(x) === -1; });
    var pick = function (arr) { return kindById(arr[Math.floor(rng() * arr.length)]); };
    if (missing.length) { var k = pick(missing); return '💡 힌트: ' + k.emoji + ' <b>' + k.name + '</b>' + josa(k.name, '이', '가') + ' 들어가요!'; }
    if (extra.length) { var e = pick(extra); return '💡 힌트: ' + e.emoji + ' <b>' + e.name + '</b>' + josa(e.name, '은', '는') + ' 안 들어가는 것 같아요'; }
    return '';
  }
  // 고른 재료(id 배열) → 결과. ok=false 면 reason(힌트). items = 가방 목록(부족한 재료 확인용, 없으면 확인 생략)
  function evaluate(ids, items) {
    var ks = ids.map(kindById).filter(Boolean);
    var has = function (cat) { return ks.some(function (k) { return k.cat === cat; }); };
    if (ks.length > MAX_KINDS) return { ok: false, reason: '재료는 최대 ' + MAX_KINDS + '종류까지 넣을 수 있어요' };
    var miss = [];
    if (!has('score')) miss.push('🎼 악보용지');
    if (!has('note')) miss.push('🎵 음표');
    if (!has('inst')) miss.push('🎸 악기');
    if (miss.length) return { ok: false, fail: true, reason: '그냥 실패했어요… ' + miss.join(', ') + '이(가) 없어서 곡이 안 돼요' };
    var hit = findRecipe(ids);
    if (!hit) {
      var nr = nearest(ids), msg;
      if (nr.j >= 0.7) msg = '거의 다 왔어요! 한두 가지만 바꿔보면 곡이 될 것 같아요';
      else if (nr.j >= 0.5) msg = '어디선가 들어본 멜로디인데… 뭔가 어긋났어요';
      else msg = '음이 안 맞아요. 다른 조합을 시도해봐요';
      var hint = (nr.rc && nr.j >= HINT_MIN_J) ? oneHint(ids, nr.rc) : '';
      return { ok: false, fail: true, reason: '그냥 실패했어요… ' + msg + (hint ? '<br>' + hint : '') };
    }
    var tier = hit.tier, genre = hit.genre;
    var needs = ks.map(function (k) { return { kind: k, need: needFor(k, tier) }; });
    var lack = items ? needs.filter(function (n) { return qtyOf(n.kind.name, items) < n.need; }) : [];
    return { ok: !lack.length, tier: tier, genre: genre, needs: needs, lack: lack, reason: lack.length ? '곡이 될 것 같아요! 그런데 재료가 모자라요: ' + lack.map(function (n) { return n.kind.emoji + n.kind.name + ' ' + qtyOf(n.kind.name, items) + '/' + n.need; }).join(', ') : '' };
  }
  function albumTitle(rng) {
    rng = rng || Math.random;
    return TITLES_A[Math.floor(rng() * TITLES_A.length)] + ' ' + TITLES_B[Math.floor(rng() * TITLES_B.length)];
  }
  // 노트 { 'rock_demo': {title, ids:[...], at} }
  function loadNote() { try { var d = JSON.parse(localStorage.getItem(NOTE_KEY) || '{}'); return (d && typeof d === 'object') ? d : {}; } catch (e) { return {}; } }
  function saveNote(d) { try { localStorage.setItem(NOTE_KEY, JSON.stringify(d)); } catch (e) {} }
  function noteCount(note) { return Object.keys(note || {}).length; }
  function genreDone(note, g) { return TIERS.every(function (t) { return note && note[g.id + '_' + t.id]; }); }
  function sellBonus(note) {
    var b = noteCount(note) * BONUS_PER_ENTRY;
    GENRES.forEach(function (g) { if (genreDone(note, g)) b += BONUS_PER_GENRE; });
    return Math.round(b * 100) / 100;
  }
  function priceOf(tier, note) { return Math.round(tier.price * (1 + sellBonus(note))); }

  function bag() { try { return bagItems; } catch (e) { return []; } }
  function toast(m) { try { showBagToast(m); } catch (e) {} }
  function sfx(n) { try { if (window.pocaSfx) window.pocaSfx.play(n); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // 작곡: 성공하면 재료를 쓰고 앨범을 가방에 넣고 노트에 등록. 돌려주는 값 = 결과 객체
  function compose(ids) {
    var r = evaluate(ids, bag());
    if (!r.ok) return r;
    r.needs.forEach(function (n) { useFromBag(n.kind.name, n.need); });
    var ok = addToBag(r.tier.emoji, r.tier.name, 'album', 1, '판매하면 코인 · 🎼 작곡 테이블 > 💿 판매 탭에서 팔아요');
    if (!ok) {                                      // 가방이 꽉 차면 재료를 되돌린다
      r.needs.forEach(function (n) { addToBag(n.kind.emoji, n.kind.name, 'material', n.need, n.kind.desc || ''); });
      return { ok: false, reason: '가방이 꽉 찼어요! 🎒 슬롯을 비워주세요' };
    }
    var note = loadNote(), key = r.genre.id + '_' + r.tier.id;
    r.isNew = !note[key];
    r.title = (note[key] && note[key].title) || albumTitle();
    if (r.isNew) { note[key] = { title: r.title, ids: ids.slice(), at: Date.now() }; saveNote(note); }
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    return r;
  }
  function sell(tierId, count) {
    var t = TIERS.filter(function (x) { return x.id === tierId; })[0];
    if (!t) return 0;
    var have = qtyOf(t.name, bag()), n = Math.min(count || have, have);
    if (n <= 0) return 0;
    var gain = priceOf(t, loadNote()) * n;
    useFromBag(t.name, n);
    coins += gain;
    try { updateCoinsDisplay(); saveAll(); } catch (e) {}
    return gain;
  }

  // ════════ 화면 ════════
  var ROOT = 'compose-overlay';
  var ST = null;     // { tab, sel:{id:true}, msg }
  function open(tab) {
    var old = document.getElementById(ROOT); if (old) old.remove();
    ST = { tab: tab || 'make', sel: {}, msg: '' };
    var ov = document.createElement('div');
    ov.id = ROOT;
    ov.style.cssText = 'position:fixed;inset:0;z-index:960;background:#140c08;font-family:\'Noto Sans KR\',sans-serif;display:flex;flex-direction:column;';
    var img = document.createElement('img');
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.8;';
    var tried = false;
    img.onerror = function () { if (!tried) { tried = true; img.src = (typeof B !== 'undefined' ? B : '') + 'map-studio.png'; } };
    img.src = (typeof B !== 'undefined' ? B : '') + 'map-compose.png';
    ov.appendChild(img);
    var shade = document.createElement('div'); shade.style.cssText = 'position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,5,3,.6),rgba(10,5,3,.88));'; ov.appendChild(shade);
    var body = document.createElement('div'); body.id = 'compose-body'; body.style.cssText = 'position:relative;flex:1;display:flex;flex-direction:column;min-height:0;'; ov.appendChild(body);
    document.body.appendChild(ov);
    render();
  }
  function close() { var o = document.getElementById(ROOT); if (o) o.remove(); ST = null; }

  function render() {
    var body = document.getElementById('compose-body'); if (!body || !ST) return;
    var note = loadNote();
    var tabs = [['make', '🎼 작곡'], ['note', '📒 작곡노트 ' + noteCount(note) + '/30'], ['sell', '💿 판매']];
    var head = '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px 6px;"><div style="font-size:17px;font-weight:900;color:#fff;">🎼 작곡 테이블</div>' +
      '<div style="display:flex;align-items:center;gap:10px;"><div style="font-size:12px;font-weight:900;color:#FFD700;">🍔 ' + (typeof coins !== 'undefined' ? coins.toLocaleString() : 0) + '</div><button id="cp-x" style="background:none;border:none;color:#ddd;font-size:22px;cursor:pointer;">✕</button></div></div>' +
      '<div style="display:flex;gap:6px;padding:0 12px 8px;">' + tabs.map(function (t) {
        var on = ST.tab === t[0];
        return '<button data-tab="' + t[0] + '" style="flex:1;padding:9px 4px;border:none;border-radius:10px;font-size:12px;font-weight:900;font-family:inherit;cursor:pointer;color:#fff;background:' + (on ? 'linear-gradient(135deg,#ffb86b,#ff6fb1)' : 'rgba(255,255,255,.12)') + ';">' + t[1] + '</button>';
      }).join('') + '</div>';
    var main = ST.tab === 'make' ? makeHtml() : ST.tab === 'note' ? noteHtml(note) : sellHtml(note);
    body.innerHTML = head + '<div id="cp-main" style="flex:1;overflow-y:auto;padding:0 12px 18px;-webkit-overflow-scrolling:touch;">' + (ST.msg ? '<div style="background:rgba(255,184,107,.2);border:1px solid rgba(255,184,107,.5);border-radius:10px;padding:9px 11px;font-size:12px;font-weight:900;color:#ffe2bd;margin-bottom:10px;line-height:1.5;">' + ST.msg + '</div>' : '') + main + '</div>';
    document.getElementById('cp-x').onclick = close;
    Array.prototype.forEach.call(body.querySelectorAll('[data-tab]'), function (b) { b.onclick = function () { ST.tab = b.getAttribute('data-tab'); ST.msg = ''; render(); }; });
    bindMake(); bindSell(); bindNote();
  }

  // 🎼 작곡 탭
  function selIds() { return Object.keys(ST.sel).filter(function (k) { return ST.sel[k]; }); }
  function makeHtml() {
    var ids = selIds(), n = ids.length, tier = null;
    var cats = [['note', '🎵 음표'], ['inst', '🎸 악기'], ['score', '🎼 악보'], ['lyric', '📝 가사 · 💡 영감']];
    var h = '<div style="font-size:12px;color:#e6d6c4;line-height:1.55;margin-bottom:10px;">재료 종류를 골라 곡을 만들어요 (최대 ' + MAX_KINDS + '종류). 곡마다 <b>정해진 조합</b>이 있어요. 📒 작곡노트의 단서를 보고 찾아봐요. 실패해도 재료는 안 사라져요!</div>';
    cats.forEach(function (c) {
      var list = kinds().filter(function (k) { return c[0] === 'lyric' ? (k.cat === 'lyric' || k.cat === 'spark') : k.cat === c[0]; });
      h += '<div style="font-size:11px;font-weight:900;color:#ffd9a8;margin:8px 0 5px;">' + c[1] + '</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;">';
      list.forEach(function (k) {
        var q = qtyOf(k.name, bag()), on = !!ST.sel[k.id], need = tier ? needFor(k, tier) : null, short = on && need && q < need;
        h += '<div data-k="' + k.id + '" style="cursor:pointer;background:' + (on ? 'rgba(255,184,107,.28)' : 'rgba(255,255,255,.08)') + ';border:2px solid ' + (short ? '#f87171' : on ? ACC : 'rgba(255,255,255,.14)') + ';border-radius:12px;padding:8px 4px;text-align:center;opacity:' + (q || on ? 1 : .55) + ';">' +
          '<div style="font-size:22px;color:#fff;">' + k.emoji + '</div><div style="font-size:11px;font-weight:900;color:#fff;margin-top:2px;">' + k.name + '</div>' +
          '<div style="font-size:11px;font-weight:900;color:' + (short ? '#fca5a5' : '#c9d6ff') + ';">' + (on && need ? q + ' / ' + need : '보유 ' + q) + '</div></div>';
      });
      h += '</div>';
    });
    var info = n === 0 ? '재료 종류를 골라보세요' : '이 조합으로 곡이 될까요?';
    h += '<div style="position:sticky;bottom:0;margin:12px -12px -18px;padding:10px 12px 14px;background:linear-gradient(180deg,rgba(20,12,8,0),rgba(20,12,8,.95) 30%);">' +
      '<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:900;color:#fff;margin-bottom:7px;"><span>선택 ' + n + '/' + MAX_KINDS + '종류</span><span style="color:#ffd9a8;">' + info + '</span></div>' +
      '<div style="display:flex;gap:8px;"><button id="cp-clear" style="padding:13px 14px;border:none;border-radius:12px;background:rgba(255,255,255,.14);color:#fff;font-size:13px;font-weight:900;font-family:inherit;cursor:pointer;">비우기</button>' +
      '<button id="cp-go" style="flex:1;padding:13px;border:none;border-radius:12px;background:' + (n ? 'linear-gradient(135deg,#ffb86b,#ff6fb1)' : '#555') + ';color:#fff;font-size:15px;font-weight:900;font-family:inherit;cursor:pointer;">🎶 작곡하기</button></div></div>';
    return h;
  }
  function bindMake() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-k]'), function (el) {
      el.onclick = function () {
        var id = el.getAttribute('data-k');
        if (ST.sel[id]) delete ST.sel[id];
        else if (selIds().length >= MAX_KINDS) { toast('재료는 최대 ' + MAX_KINDS + '종류까지예요'); return; }
        else ST.sel[id] = true;
        ST.msg = ''; var sc = document.getElementById('cp-main'), top = sc ? sc.scrollTop : 0; render(); sc = document.getElementById('cp-main'); if (sc) sc.scrollTop = top;
      };
    });
    var clr = document.getElementById('cp-clear'); if (clr) clr.onclick = function () { ST.sel = {}; ST.msg = ''; render(); };
    var go = document.getElementById('cp-go');
    if (go) go.onclick = function () {
      var ids = selIds();
      if (!ids.length) { toast('재료 종류를 먼저 골라주세요'); return; }
      var r = compose(ids);
      if (r.ok) {
        sfx('reward'); ST.sel = {};
        ST.msg = '🎶 〈' + esc(r.title) + '〉 발매! ' + r.tier.emoji + ' ' + r.tier.name + ' · 장르 <b>' + r.genre.name + '</b>' + (r.isNew ? '<br>✨ 작곡노트에 새로 등록됐어요!' : '<br>이미 노트에 있는 곡이에요 (앨범은 가방에 들어왔어요)');
      } else { sfx('concertDrop'); ST.msg = '❌ ' + r.reason; }
      render();
    };
  }

  // 📒 작곡노트 탭
  function noteHtml(note) {
    var b = sellBonus(note);
    var h = '<div style="font-size:12px;color:#e6d6c4;line-height:1.55;margin-bottom:8px;">곡을 만들면 장르 × 등급 칸이 채워지고, 같은 장르의 <b>다음 등급 단서</b>(재료 분류 모양)가 적혀요. 칸 하나마다 앨범 판매가 <b>+1%</b>, 한 장르의 세 등급을 다 채우면 <b>+2%</b> 더!<br><span style="color:#FFD700;font-weight:900;">현재 판매가 보너스 +' + Math.round(b * 100) + '%</span></div>';
    h += '<div style="display:grid;grid-template-columns:1.3fr repeat(3,1fr);gap:5px;align-items:center;font-size:11px;font-weight:900;color:#ffd9a8;margin-bottom:4px;"><div></div>' + TIERS.slice().reverse().map(function (t) { return '<div style="text-align:center;">' + t.emoji + ' ' + t.name.replace(' 앨범', '') + '</div>'; }).join('') + '</div>';
    GENRES.forEach(function (g) {
      var found = TIERS.some(function (t) { return note[g.id + '_' + t.id]; }), done = genreDone(note, g);
      h += '<div style="display:grid;grid-template-columns:1.3fr repeat(3,1fr);gap:5px;align-items:center;margin-bottom:5px;">' +
        '<div style="font-size:12px;font-weight:900;color:' + (done ? '#FFD700' : found ? '#fff' : '#8b7b6a') + ';">' + (found ? esc(g.name) : '???') + (done ? ' ⭐' : '') + '</div>';
      TIERS.slice().reverse().forEach(function (t, ti) {
        var e = note[g.id + '_' + t.id];
        var prev = ti > 0 ? TIERS.slice().reverse()[ti - 1] : null, hint = '';
        if (!e && prev && note[g.id + '_' + prev.id]) {          // 앞 등급을 찾았으면 이 등급 재료의 분류 모양만 알려준다
          var CI = { score: '🎼', note: '🎵', inst: '🎸', lyric: '📝', spark: '💡' };
          hint = RECIPES[g.id][t.id].map(function (id) { var k = kindById(id); return k ? (CI[k.cat] || '❔') : '❔'; }).sort().join('');
        }
        h += e ? '<div data-n="' + g.id + '_' + t.id + '" style="cursor:pointer;background:rgba(255,184,107,.28);border:1.5px solid ' + ACC + ';border-radius:9px;padding:6px 2px;text-align:center;font-size:10px;font-weight:900;color:#fff;line-height:1.3;">✔<br>' + esc(e.title) + '</div>'
          : (hint ? '<div style="background:rgba(255,184,107,.1);border:1.5px dashed ' + ACC + ';border-radius:9px;padding:5px 2px;text-align:center;font-size:10px;line-height:1.3;color:#ffd9a8;">단서<br>' + hint + '</div>'
          : '<div style="background:rgba(255,255,255,.06);border:1.5px dashed rgba(255,255,255,.18);border-radius:9px;padding:10px 2px;text-align:center;font-size:12px;color:#8b7b6a;">???</div>');
      });
      h += '</div>';
    });
    h += '<div id="cp-recipe" style="margin-top:10px;"></div>';
    return h;
  }
  function bindNote() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-n]'), function (el) {
      el.onclick = function () {
        var e = loadNote()[el.getAttribute('data-n')], box = document.getElementById('cp-recipe'); if (!e || !box) return;
        box.innerHTML = '<div style="background:rgba(255,255,255,.1);border-radius:12px;padding:10px 12px;font-size:12px;color:#fff;line-height:1.7;"><b>〈' + esc(e.title) + '〉</b> 에 쓴 재료<br>' +
          e.ids.map(function (id) { var k = kindById(id); return k ? k.emoji + ' ' + k.name : ''; }).join(' · ') + '</div>';
      };
    });
  }

  // 💿 판매 탭
  function sellHtml(note) {
    var h = '<div style="font-size:12px;color:#e6d6c4;line-height:1.55;margin-bottom:10px;">만든 앨범을 코인으로 바꿔요. 작곡노트 보너스 <b style="color:#FFD700;">+' + Math.round(sellBonus(note) * 100) + '%</b>가 적용돼요.</div>';
    TIERS.slice().reverse().forEach(function (t) {
      var own = qtyOf(t.name, bag());
      h += '<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.15);border-radius:14px;padding:11px;margin-bottom:9px;">' +
        '<div style="font-size:30px;">' + t.emoji + '</div><div style="flex:1;"><div style="font-size:14px;font-weight:900;color:#fff;">' + t.name + '</div><div style="font-size:12px;font-weight:900;color:#FFD700;">🍔 ' + priceOf(t, note).toLocaleString() + ' <span style="color:#aaa;font-weight:700;">/ 1장</span></div></div>' +
        '<button data-sell="' + t.id + '" style="padding:11px 12px;border:none;border-radius:10px;font-size:13px;font-weight:900;font-family:inherit;cursor:pointer;color:#fff;background:' + (own ? 'linear-gradient(135deg,#4ade80,#22c55e)' : '#555') + ';">💰 전부 판매 (' + own + ')</button></div>';
    });
    return h;
  }
  function bindSell() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-sell]'), function (b) {
      b.onclick = function () {
        var g = sell(b.getAttribute('data-sell'));
        if (g) { sfx('coin'); ST.msg = '💰 앨범 판매! 🍔 +' + g.toLocaleString(); } else { toast('팔 앨범이 없어요'); return; }
        render();
      };
    });
  }

  window.openAlbumStudio = function () { open('make'); };
  window.openComposeTable = open;
  window.__albumTest = { TIERS: TIERS, GENRES: GENRES, evaluate: evaluate, findRecipe: findRecipe, RECIPES: RECIPES, nearest: nearest, needFor: needFor, compose: compose, sell: sell, sellBonus: sellBonus, priceOf: priceOf, loadNote: loadNote, qtyOf: qtyOf };

  // ════════ 더보기 메뉴 타일 ════════
  (function wait() {
    if (typeof window.openMoreMenu !== 'function' || typeof window.moreMenuTileHtml !== 'function') { setTimeout(wait, 100); return; }
    var original = window.openMoreMenu;
    if (original.__albumWrapped) return;
    var wrapped = function () {
      var res = original.apply(this, arguments);
      var grid = document.getElementById('more-menu-grid');
      if (grid && !document.getElementById('more-album-tile')) {
        grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('🎼', '작곡 테이블', ACC, 'openComposeTable()'));
        if (grid.lastElementChild) grid.lastElementChild.id = 'more-album-tile';
      }
      return res;
    };
    wrapped.__albumWrapped = true;
    window.openMoreMenu = wrapped;
  })();
})();
