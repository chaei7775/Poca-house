// ════════════════════════════════
// 🎼 작곡 테이블 + 📒 작곡노트 (album-studio.js)
// 🎹 작곡 스튜디오(studio-explore.js)에서 모은 재료 20종으로 직접 곡을 만들어 앨범으로 낸다.
// 들어가는 곳: 작곡 스튜디오 장소 화면의 "🎼 작곡 테이블" 버튼 / 더보기 > 🎼 작곡 테이블
//
// 규칙
//  · 재료 종류를 최대 12종까지 골라 "작곡하기". 45칸(장르 15 × 등급 3)마다 정해진 레시피(재료 조합)가 있고,
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
  function ti(t, px) { return window.matIcon ? window.matIcon(t.name, px, t.emoji) : t.emoji; }   // 앨범 그림 (mat-icons.js), 없으면 이모지
  var TIERS = [                                  // 종류 수 → 등급. per = 고른 종류 하나당 드는 개수
    { id: 'full', min: 10, emoji: '📀', name: '정규 앨범', per: 11, price: 600000 },
    { id: 'mini', min: 7,  emoji: '💽', name: '미니 앨범', per: 7,  price: 180000 },
    { id: 'demo', min: 4,  emoji: '💿', name: '데모 앨범', per: 4,  price: 40000 }
  ];
  var HINT_MIN_J = 0.3;                          // 비슷한 정도가 이 이상이면 실패할 때마다 재료 하나를 알려준다 (0이면 항상, 2면 끔)
  var SPARK_DIV = 3;                             // 💡 영감의불꽃은 다른 재료의 1/3개만 든다
  // 📜 저작권(정규앨범): 계약금(직판가) + 30일 동안 매일 저작권료. 직판의 약 4배 (히트 포함)
  var ROY_KEY = 'ph_royalty';
  var ROY_DAYS = 30, ROY_DAILY = 0.08, ROY_CAP_DAYS = 3, ROY_HIT = 0.15, ROY_HIT_MULT = 3, DAY_MS = 86400000;
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
    { id: 'fusion',name: '퓨전',       need: [], fusion: true },
    { id: 'rnb',   name: 'R&B',        need: ['mic', 'pno'] },
    { id: 'swing', name: '스윙',       need: ['sax', 'tpt'] },
    { id: 'city',  name: '시티팝',     need: ['syn', 'sax'] },
    { id: 'funk',  name: '펑크',       need: ['bas', 'tpt'] },
    { id: 'trot',  name: '트로트',     need: ['mic', 'syn'] }
  ];
  // ★ 레시피 45개 (장르 15 × 등급 3). 재료 id: n1 온음표 n2 2분 n4 4분 n8 8분 n16 16분 / gtr 기타 bas 베이스 drm 드럼 pno 피아노 syn 신스 str 스트링 / scr 악보용지 lyr 가사조각 spk 영감의불꽃
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
    fusion: { demo: ['scr', 'n4', 'gtr', 'syn'],  mini: ['scr', 'n4', 'n16', 'gtr', 'syn', 'str'], full: ['scr', 'n1', 'n2', 'n4', 'n8', 'n16', 'gtr', 'bas', 'drm', 'pno', 'syn', 'str'] },
    // ── 새 장르 5개 (새 재료 6종이 들어감): 마이크·색소폰·트럼펫·셋잇단음표·코러스·믹싱콘솔
    rnb:    { demo: ['scr', 'n2', 'mic', 'pno'],  mini: ['scr', 'n2', 'n8', 'mic', 'pno', 'cho'],  full: ['scr', 'n2', 'n4', 'n8', 'mic', 'pno', 'bas', 'cho', 'spk'] },
    swing:  { demo: ['scr', 'trp', 'sax', 'drm'], mini: ['scr', 'trp', 'n4', 'sax', 'tpt', 'drm'], full: ['scr', 'trp', 'n4', 'n8', 'sax', 'tpt', 'drm', 'bas', 'pno', 'spk'] },
    city:   { demo: ['scr', 'n8', 'syn', 'sax'],  mini: ['scr', 'n8', 'n16', 'syn', 'sax', 'bas'], full: ['scr', 'n4', 'n8', 'n16', 'syn', 'sax', 'bas', 'gtr', 'mix'] },
    funk:   { demo: ['scr', 'n16', 'bas', 'mix'], mini: ['scr', 'n8', 'n16', 'bas', 'tpt', 'mix'], full: ['scr', 'n4', 'n8', 'n16', 'bas', 'gtr', 'drm', 'tpt', 'mix', 'spk'] },
    trot:   { demo: ['scr', 'n4', 'mic', 'syn'],  mini: ['scr', 'n4', 'trp', 'mic', 'syn', 'cho'], full: ['scr', 'n2', 'n4', 'trp', 'mic', 'syn', 'drm', 'cho', 'lyr', 'mix'] }
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
    if (missing.length) { var k = pick(missing); return '💡 힌트: ' + mi(k, 16) + ' <b>' + k.name + '</b>' + josa(k.name, '이', '가') + ' 들어가요!'; }
    if (extra.length) { var e = pick(extra); return '💡 힌트: ' + mi(e, 16) + ' <b>' + e.name + '</b>' + josa(e.name, '은', '는') + ' 안 들어가는 것 같아요'; }
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

  // 🎉 앨범 발매 팝업
  function releasePopup(r) {
    var old = document.getElementById('cp-release'); if (old) old.remove();
    if (!document.getElementById('cp-release-css')) {
      var st = document.createElement('style'); st.id = 'cp-release-css';
      st.textContent = '@keyframes cpSpin{to{transform:rotate(360deg)}}@keyframes cpPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.06);opacity:1}100%{transform:scale(1)}}' +
        '@keyframes cpRise{0%{transform:translateY(0) scale(.6);opacity:0}15%{opacity:1}100%{transform:translateY(-340px) scale(1.2);opacity:0}}@keyframes cpGlow{0%,100%{box-shadow:0 0 30px rgba(255,184,107,.5)}50%{box-shadow:0 0 70px rgba(255,111,177,.8)}}' +
        '@keyframes cpShine{0%{left:-60%}100%{left:130%}}';
      document.head.appendChild(st);
    }
    var note = loadNote(), cnt = noteCount(note), price = priceOf(r.tier, note);
    var p = document.createElement('div'); p.id = 'cp-release';
    p.style.cssText = 'position:fixed;inset:0;z-index:1200;background:radial-gradient(circle at 50% 38%,rgb(70,32,58),rgb(8,4,12));display:flex;align-items:center;justify-content:center;padding:18px;font-family:\'Noto Sans KR\',sans-serif;overflow:hidden;';
    var sp = '';
    for (var i = 0; i < 22; i++) {
      var em = ['✨', '🎵', '🎶', '⭐', '💖'][i % 5];
      sp += '<span style="position:absolute;bottom:' + (Math.random() * 30) + '%;left:' + (Math.random() * 96) + '%;font-size:' + (14 + Math.random() * 16) + 'px;opacity:0;animation:cpRise ' + (2.4 + Math.random() * 2.2) + 's ease-out ' + (Math.random() * 2.4) + 's infinite;">' + em + '</span>';
    }
    var isFull = r.tier.id === 'full', accent = isFull ? '#ffd76a' : (r.tier.id === 'mini' ? '#ff9ad0' : '#9fd8ff');
    p.innerHTML = sp +
      '<div style="position:relative;width:100%;max-width:340px;text-align:center;animation:cpPop .55s ease-out;">' +
        '<div style="font-size:12px;font-weight:900;letter-spacing:4px;color:' + accent + ';">NEW RELEASE</div>' +
        '<div style="position:relative;width:190px;height:190px;margin:16px auto 14px;border-radius:50%;background:conic-gradient(from 30deg,#1a1a22,#3b2c4a,#1a1a22,#4a2c3a,#1a1a22);animation:cpSpin 5s linear infinite,cpGlow 2.2s ease-in-out infinite;border:3px solid ' + accent + ';">' +
          '<div style="position:absolute;inset:34px;border-radius:50%;background:radial-gradient(circle,#ffe6b8,#ff8fc0);display:flex;align-items:center;justify-content:center;font-size:44px;">' + ti(r.tier, 64) + '</div>' +
          '<div style="position:absolute;inset:88px;border-radius:50%;background:#140c10;"></div></div>' +
        '<div style="font-size:23px;font-weight:900;color:#fff;line-height:1.35;text-shadow:0 0 18px ' + accent + ';">〈' + esc(r.title) + '〉</div>' +
        '<div style="margin-top:8px;display:inline-block;padding:5px 14px;border-radius:20px;background:rgba(255,255,255,.12);border:1px solid ' + accent + ';font-size:13px;font-weight:900;color:' + accent + ';">' + r.tier.name + ' · ' + esc(r.genre.name) + '</div>' +
        (r.isNew ? '<div style="margin-top:14px;font-size:14px;font-weight:900;color:#ffe2bd;">✨ 작곡노트에 새로 등록!</div><div style="font-size:12px;color:#d9c3ae;margin-top:2px;">📒 ' + cnt + ' / ' + (GENRES.length * TIERS.length) + '칸 완성</div>' : '<div style="margin-top:14px;font-size:12px;color:#d9c3ae;">이미 노트에 있는 곡이에요 · 앨범만 가방에 들어왔어요</div>') +
        '<div style="margin-top:10px;font-size:12px;color:#d9c3ae;">💰 판매가 🍔 ' + price.toLocaleString() + '</div>' +
        '<button id="cp-release-ok" style="margin-top:20px;width:100%;padding:14px;border:none;border-radius:14px;font-size:15px;font-weight:900;font-family:inherit;color:#2a1208;cursor:pointer;background:linear-gradient(135deg,#ffd9a0,#ff9ec4);">좋아요!</button>' +
      '</div>';
    document.body.appendChild(p);
    document.getElementById('cp-release-ok').onclick = function () { p.remove(); };
  }

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
  function close() { var o = document.getElementById(ROOT); if (o) o.remove(); var pp = document.getElementById('compose-pop'); if (pp) pp.remove(); ST = null; }

  function render() {
    var body = document.getElementById('compose-body'); if (!body || !ST) return;
    var note = loadNote();
    var tabs = [['make', '🎼 작곡'], ['note', '📒 작곡노트 ' + noteCount(note) + '/' + (GENRES.length * TIERS.length)], ['sell', '💿 판매'], ['roy', '📜 저작권']];
    var head = '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px 6px;"><div style="font-size:17px;font-weight:900;color:#fff;">🎼 작곡 테이블</div>' +
      '<div style="display:flex;align-items:center;gap:10px;"><div style="font-size:12px;font-weight:900;color:#FFD700;">🍔 ' + (typeof coins !== 'undefined' ? coins.toLocaleString() : 0) + '</div><button id="cp-x" style="background:none;border:none;color:#ddd;font-size:22px;cursor:pointer;">✕</button></div></div>' +
      '<div style="display:flex;gap:6px;padding:0 12px 8px;">' + tabs.map(function (t) {
        var on = ST.tab === t[0];
        return '<button data-tab="' + t[0] + '" style="flex:1;padding:9px 4px;border:none;border-radius:10px;font-size:12px;font-weight:900;font-family:inherit;cursor:pointer;color:#fff;background:' + (on ? 'linear-gradient(135deg,#ffb86b,#ff6fb1)' : 'rgba(255,255,255,.12)') + ';">' + t[1] + '</button>';
      }).join('') + '</div>';
    var main = ST.tab === 'make' ? makeHtml() : ST.tab === 'note' ? noteHtml(note) : ST.tab === 'roy' ? royHtml(note) : sellHtml(note);
    body.innerHTML = head + '<div id="cp-main" style="flex:1;overflow-y:auto;padding:0 12px 18px;-webkit-overflow-scrolling:touch;">' + (ST.msg ? '<div style="background:rgba(255,184,107,.2);border:1px solid rgba(255,184,107,.5);border-radius:10px;padding:9px 11px;font-size:12px;font-weight:900;color:#ffe2bd;margin-bottom:10px;line-height:1.5;">' + ST.msg + '</div>' : '') + main + '</div>';
    document.getElementById('cp-x').onclick = close;
    Array.prototype.forEach.call(body.querySelectorAll('[data-tab]'), function (b) { b.onclick = function () { ST.tab = b.getAttribute('data-tab'); ST.msg = ''; render(); }; });
    bindMake(); bindSell(); bindNote(); bindRoy();
  }

  // 🎼 작곡 탭 — 작곡하기를 누르면 팝업이 뜬다 (위: 재료 슬롯 칸 / 아래: 재료 가방 → 터치하면 슬롯에 들어감 → 확인)
  function selIds() { return Object.keys(ST.sel).filter(function (k) { return ST.sel[k]; }); }
  function makeHtml() {
    var have = kinds().filter(function (k) { return qtyOf(k.name, bag()) > 0; }).length;
    return '<div style="font-size:12px;color:#e6d6c4;line-height:1.6;margin-bottom:12px;">재료 종류를 골라 곡을 만들어요. 곡마다 <b>정해진 조합</b>이 있어요. 📒 작곡노트의 단서를 보고 찾아봐요. 실패해도 재료는 안 사라져요!<br><span style="color:#ffd9a8;">📍 재료는 🎹 작곡 스튜디오 탐험에서 모아요</span></div>' +
      '<div style="background:rgba(255,255,255,.08);border:1.5px solid rgba(255,184,107,.4);border-radius:16px;padding:18px 14px;text-align:center;">' +
        '<div style="font-size:40px;">🎼</div>' +
        '<div style="font-size:13px;color:#fff;font-weight:900;margin:6px 0 2px;">가지고 있는 재료 ' + have + '/' + kinds().length + '종류</div>' +
        '<div style="font-size:11px;color:#c9b8a6;margin-bottom:12px;">슬롯 ' + MAX_KINDS + '칸 · 재료를 눌러 넣고 확인!</div>' +
        '<button id="cp-open" style="width:100%;padding:14px;border:none;border-radius:13px;background:linear-gradient(135deg,#ffb86b,#ff6fb1);color:#fff;font-size:16px;font-weight:900;font-family:inherit;cursor:pointer;">🎶 작곡하기</button></div>';
  }
  function bindMake() {
    var o = document.getElementById('cp-open'); if (o) o.onclick = function () { ST.sel = {}; openPop(); };
  }
  // ── 작곡 팝업 ──
  function mi(k, px) { return (window.matIcon ? window.matIcon(k.name, px, k.emoji) : k.emoji) || k.emoji; }
  var POP = 'compose-pop';
  function closePop() { var e = document.getElementById(POP); if (e) e.remove(); }
  function openPop() { closePop(); var pop = document.createElement('div'); pop.id = POP; pop.setAttribute('data-msg', ''); pop.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(6,3,2,.82);display:flex;align-items:flex-end;justify-content:center;font-family:\'Noto Sans KR\',sans-serif;'; document.body.appendChild(pop); renderPop(); }
  function renderPop() {
    var pop = document.getElementById(POP); if (!pop || !ST) return;
    var ids = selIds(), n = ids.length, msg = pop.getAttribute('data-msg') || '';
    var slots = '';
    for (var i = 0; i < MAX_KINDS; i++) {
      var k = ids[i] ? kindById(ids[i]) : null;
      slots += k
        ? '<div data-slot="' + k.id + '" style="cursor:pointer;height:60px;border-radius:12px;background:rgba(255,184,107,.28);border:2px solid ' + ACC + ';display:flex;flex-direction:column;align-items:center;justify-content:center;"><div style="font-size:22px;line-height:1.1;">' + mi(k, 30) + '</div><div style="font-size:10px;font-weight:900;color:#fff;margin-top:2px;">' + k.name + '</div></div>'
        : '<div style="height:60px;border-radius:12px;background:rgba(255,255,255,.05);border:2px dashed rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.25);font-size:18px;">' + (i + 1) + '</div>';
    }
    var tray = kinds().map(function (k) {
      var q = qtyOf(k.name, bag()), on = !!ST.sel[k.id];
      return '<div data-k="' + k.id + '" style="cursor:pointer;position:relative;padding:7px 2px 5px;border-radius:11px;text-align:center;background:' + (on ? 'rgba(255,184,107,.25)' : 'rgba(255,255,255,.1)') + ';border:2px solid ' + (on ? ACC : 'rgba(255,255,255,.14)') + ';opacity:' + (q || on ? 1 : .4) + ';">' +
        '<div style="font-size:21px;line-height:1.1;">' + mi(k, 30) + '</div><div style="font-size:9.5px;font-weight:900;color:#fff;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + k.name + '</div>' +
        '<div style="font-size:10px;font-weight:900;color:#c9d6ff;">×' + q + '</div>' + (on ? '<div style="position:absolute;top:2px;right:4px;font-size:10px;color:' + ACC + ';">✔</div>' : '') + '</div>';
    }).join('');
    pop.innerHTML = '<div style="width:100%;max-width:430px;max-height:96vh;display:flex;flex-direction:column;background:linear-gradient(180deg,#2a1a12,#150c08);border:2px solid ' + ACC + ';border-bottom:none;border-radius:22px 22px 0 0;padding:14px 12px 12px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><div style="font-size:16px;font-weight:900;color:#fff;">🎼 작곡</div><div style="font-size:12px;font-weight:900;color:#ffd9a8;">선택 ' + n + '/' + MAX_KINDS + '</div><button id="cp-pop-x" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;">✕</button></div>' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px;">' + slots + '</div>' +
      (msg ? '<div style="background:rgba(248,113,113,.18);border:1px solid #f87171;border-radius:10px;padding:8px 10px;font-size:12px;color:#fff;line-height:1.55;margin-bottom:8px;">' + msg + '</div>' : '<div style="font-size:11px;color:#c9b8a6;text-align:center;margin-bottom:8px;">아래 재료 가방에서 재료를 눌러 슬롯에 넣어요 · 슬롯을 누르면 빼요</div>') +
      '<div style="font-size:11px;font-weight:900;color:#ffd9a8;margin-bottom:5px;">🎒 재료 가방</div>' +
      '<div style="overflow-y:auto;-webkit-overflow-scrolling:touch;display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding-bottom:4px;max-height:34vh;">' + tray + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:10px;"><button id="cp-pop-clear" style="padding:13px 14px;border:none;border-radius:12px;background:rgba(255,255,255,.14);color:#fff;font-size:13px;font-weight:900;font-family:inherit;cursor:pointer;">비우기</button>' +
      '<button id="cp-pop-go" style="flex:1;padding:13px;border:none;border-radius:12px;background:' + (n ? 'linear-gradient(135deg,#ffb86b,#ff6fb1)' : '#555') + ';color:#fff;font-size:15px;font-weight:900;font-family:inherit;cursor:pointer;">✅ 확인</button></div></div>';
    var keep = function (fn) { return function () { var sc = pop.querySelector('[style*="overflow-y:auto"]'), top = sc ? sc.scrollTop : 0; fn.apply(this, arguments); var sc2 = pop.querySelector('[style*="overflow-y:auto"]'); if (sc2) sc2.scrollTop = top; }; };
    document.getElementById('cp-pop-x').onclick = closePop;
    Array.prototype.forEach.call(pop.querySelectorAll('[data-k]'), function (el) {
      el.onclick = keep(function () {
        var id = el.getAttribute('data-k');
        if (ST.sel[id]) delete ST.sel[id];
        else if (selIds().length >= MAX_KINDS) { toast('재료는 최대 ' + MAX_KINDS + '종류까지예요'); return; }
        else ST.sel[id] = true;
        pop.setAttribute('data-msg', ''); renderPop();
      });
    });
    Array.prototype.forEach.call(pop.querySelectorAll('[data-slot]'), function (el) {
      el.onclick = function () { delete ST.sel[el.getAttribute('data-slot')]; pop.setAttribute('data-msg', ''); renderPop(); };
    });
    document.getElementById('cp-pop-clear').onclick = function () { ST.sel = {}; pop.setAttribute('data-msg', ''); renderPop(); };
    document.getElementById('cp-pop-go').onclick = function () {
      var sel = selIds();
      if (!sel.length) { toast('재료를 먼저 슬롯에 넣어주세요'); return; }
      var r = compose(sel);
      if (r.ok) {
        sfx('reward'); ST.sel = {}; closePop(); try { releasePopup(r); } catch (e) {}
        ST.msg = '🎶 〈' + esc(r.title) + '〉 발매! ' + ti(r.tier, 16) + ' ' + r.tier.name + ' · 장르 <b>' + r.genre.name + '</b>' + (r.isNew ? '<br>✨ 작곡노트에 새로 등록됐어요!' : '<br>이미 노트에 있는 곡이에요 (앨범은 가방에 들어왔어요)');
        render();
      } else { sfx('concertDrop'); pop.setAttribute('data-msg', '❌ ' + r.reason); renderPop(); }
    };
  }

  // 📒 작곡노트 탭
  function noteHtml(note) {
    var b = sellBonus(note);
    var h = '<div style="font-size:12px;color:#e6d6c4;line-height:1.55;margin-bottom:8px;">곡을 만들면 장르 × 등급 칸이 채워지고, 같은 장르의 <b>다음 등급 단서</b>(재료 분류 모양)가 적혀요. 칸 하나마다 앨범 판매가 <b>+1%</b>, 한 장르의 세 등급을 다 채우면 <b>+2%</b> 더!<br><span style="color:#FFD700;font-weight:900;">현재 판매가 보너스 +' + Math.round(b * 100) + '%</span></div>';
    h += '<div style="display:grid;grid-template-columns:1.3fr repeat(3,1fr);gap:5px;align-items:center;font-size:11px;font-weight:900;color:#ffd9a8;margin-bottom:4px;"><div></div>' + TIERS.slice().reverse().map(function (t) { return '<div style="text-align:center;">' + ti(t, 20) + ' ' + t.name.replace(' 앨범', '') + '</div>'; }).join('') + '</div>';
    GENRES.forEach(function (g) {
      var found = TIERS.some(function (t) { return note[g.id + '_' + t.id]; }), done = genreDone(note, g);
      h += '<div style="display:grid;grid-template-columns:1.3fr repeat(3,1fr);gap:5px;align-items:center;margin-bottom:5px;">' +
        '<div style="font-size:12px;font-weight:900;color:' + (done ? '#FFD700' : found ? '#fff' : '#8b7b6a') + ';">' + (found ? esc(g.name) : '???') + (done ? ' ⭐' : '') + '</div>';
      TIERS.slice().reverse().forEach(function (t, ti) {
        var e = note[g.id + '_' + t.id];
        var prev = ti > 0 ? TIERS.slice().reverse()[ti - 1] : null, hint = '';
        if (!e && prev && note[g.id + '_' + prev.id]) {          // 앞 등급을 찾았으면 이 등급 재료의 분류 모양만 알려준다
          var CI = { score: 'scr', note: 'n4', inst: 'gtr', lyric: 'lyr', spark: 'spk', gear: 'mix' };   // 분류 대표 재료 그림
          hint = RECIPES[g.id][t.id].map(function (id) { var k = kindById(id); return k ? k.cat : '?'; }).sort().map(function (c) {
            var rk = CI[c] && kindById(CI[c]); return rk ? mi(rk, 18) : '❔';
          }).join('');
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
          e.ids.map(function (id) { var k = kindById(id); return k ? mi(k, 16) + ' ' + k.name : ''; }).join(' · ') + '</div>';
      };
    });
  }

  // 💿 판매 탭
  function sellHtml(note) {
    var h = '<div style="font-size:12px;color:#e6d6c4;line-height:1.55;margin-bottom:10px;">만든 앨범을 코인으로 바꿔요. 작곡노트 보너스 <b style="color:#FFD700;">+' + Math.round(sellBonus(note) * 100) + '%</b>가 적용돼요.</div>';
    TIERS.slice().reverse().forEach(function (t) {
      var own = qtyOf(t.name, bag());
      h += '<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.15);border-radius:14px;padding:11px;margin-bottom:9px;">' +
        '<div style="font-size:30px;">' + ti(t, 40) + '</div><div style="flex:1;"><div style="font-size:14px;font-weight:900;color:#fff;">' + t.name + '</div><div style="font-size:12px;font-weight:900;color:#FFD700;">🍔 ' + priceOf(t, note).toLocaleString() + ' <span style="color:#aaa;font-weight:700;">/ 1장</span></div></div>' +
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

  // ════════ 📜 저작권 ════════
  function loadRoy() { try { var d = JSON.parse(localStorage.getItem(ROY_KEY) || '{}'); if (!d || typeof d !== 'object') d = {}; if (!Array.isArray(d.slots)) d.slots = []; return d; } catch (e) { return { slots: [] }; } }
  function saveRoy(d) { try { localStorage.setItem(ROY_KEY, JSON.stringify(d)); } catch (e) {} try { if (typeof saveAll === 'function') saveAll(); } catch (e) {} }
  function roySlots() { var lv = 1; try { lv = Number(playerLevel) || 1; } catch (e) {} return 3 + (lv >= 30 ? 1 : 0) + (lv >= 50 ? 1 : 0); }
  function ownedIdols() {
    try { return Object.keys(CHARS).filter(function (cid) { return CARDS.some(function (c) { return c.charId === cid && owned.indexOf(c.id) >= 0; }); }); } catch (e) { return []; }
  }
  function cardMult(cid) { var lv = 1; try { lv = getCardLevel(cid); } catch (e) {} return 1 + 0.02 * (lv - 1); }   // 카드 Lv.50 이면 약 2배
  function royPending(sl, now) {
    var endT = sl.start + ROY_DAYS * DAY_MS, t = Math.min(now, endT), el = Math.max(0, t - sl.last);
    return { el: el, ended: now >= endT, amt: Math.round(sl.daily * Math.min(el, ROY_CAP_DAYS * DAY_MS) / DAY_MS) };
  }
  function royRegister(cid) {
    var t = TIERS[0], have = qtyOf(t.name, bag());
    var d = loadRoy();
    if (have < 1) return { ok: false, why: '정규 앨범이 없어요' };
    if (d.slots.length >= roySlots()) return { ok: false, why: '등록 칸이 가득 찼어요' };
    var fee = priceOf(t, loadNote());
    useFromBag(t.name, 1);
    coins += fee;
    var now = Date.now();
    d.slots.push({ title: albumTitle(), cid: cid, start: now, last: now, daily: Math.round(fee * ROY_DAILY * cardMult(cid)) });
    d.ever = true;
    saveRoy(d);
    try { updateCoinsDisplay(); } catch (e) {}
    return { ok: true, fee: fee };
  }
  function royClaim(idx) {
    var d = loadRoy(), now = Date.now(), list = (idx === undefined) ? d.slots.slice() : [d.slots[idx]], total = 0, hits = 0;
    list.forEach(function (sl) {
      if (!sl) return;
      var r = royPending(sl, now);
      var days = Math.min(ROY_CAP_DAYS, Math.floor(r.el / DAY_MS));
      var extra = 0;
      for (var i = 0; i < days; i++) if (Math.random() < ROY_HIT) { extra += sl.daily * (ROY_HIT_MULT - 1); hits++; }
      total += r.amt + Math.round(extra);
      sl.last = Math.min(now, sl.start + ROY_DAYS * DAY_MS);
    });
    d.slots = d.slots.filter(function (sl) { return now < sl.start + ROY_DAYS * DAY_MS || royPending(sl, now).el > 0; });
    if (total > 0) { coins += total; try { updateCoinsDisplay(); } catch (e) {} }
    saveRoy(d);
    return { total: total, hits: hits };
  }
  function royHtml(note) {
    var d = loadRoy(), now = Date.now(), full = TIERS[0], own = qtyOf(full.name, bag()), fee = priceOf(full, note), cap = roySlots();
    var h = '<div style="font-size:12px;color:#e6d6c4;line-height:1.6;margin-bottom:10px;">📀 <b>정규 앨범</b>을 아이돌에게 타이틀곡으로 줘요. 등록하면 <b style="color:#FFD700;">계약금 🍔 ' + fee.toLocaleString() + '</b>을 바로 받고, ' + ROY_DAYS + '일 동안 <b>매일 저작권료</b>가 쌓여요. 접속해서 수령하세요! (최대 ' + ROY_CAP_DAYS + '일치까지만 쌓여요 · 가끔 🔥 차트 진입으로 그날 ' + ROY_HIT_MULT + '배)</div>';
    h += '<div style="font-size:11px;color:#ffd9a8;margin-bottom:6px;">등록 ' + d.slots.length + ' / ' + cap + '칸</div>';
    d.slots.forEach(function (sl, i) {
      var r = royPending(sl, now), left = Math.max(0, Math.ceil((sl.start + ROY_DAYS * DAY_MS - now) / DAY_MS));
      var nm = (typeof CHARS !== 'undefined' && CHARS[sl.cid]) ? CHARS[sl.cid].name : '아이돌';
      h += '<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.15);border-radius:14px;padding:11px;margin-bottom:9px;">' +
        '<div style="font-size:28px;">📀</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(sl.title) + '</div>' +
        '<div style="font-size:11px;color:#c9d6ff;">' + esc(nm) + ' · 하루 🍔 ' + sl.daily.toLocaleString() + ' · 남은 ' + left + '일</div>' +
        '<div style="font-size:12px;font-weight:900;color:#FFD700;">쌓인 저작권료 🍔 ' + r.amt.toLocaleString() + '</div></div>' +
        '<button data-roy-claim="' + i + '" style="padding:11px 12px;border:none;border-radius:10px;font-size:13px;font-weight:900;font-family:inherit;cursor:pointer;color:#fff;background:' + (r.amt > 0 ? 'linear-gradient(135deg,#4ade80,#22c55e)' : '#555') + ';">💰 수령</button></div>';
    });
    if (d.slots.length > 1) h += '<button data-roy-all="1" style="width:100%;padding:11px;margin-bottom:10px;border:none;border-radius:10px;font-size:13px;font-weight:900;font-family:inherit;cursor:pointer;color:#fff;background:linear-gradient(135deg,#f59e0b,#ef4444);">💰 전부 수령</button>';
    if (ST.pick) {
      var ids = ownedIdols();
      h += '<div style="background:rgba(0,0,0,.45);border:1.5px solid #FFB86B;border-radius:14px;padding:11px;margin-bottom:10px;"><div style="font-size:13px;font-weight:900;color:#fff;margin-bottom:8px;">🎤 누구에게 타이틀곡을 줄까요? <span style="font-size:10px;color:#ffd9a8;">(카드 레벨이 높을수록 저작권료 ↑)</span></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;">';
      ids.forEach(function (cid) {
        var lv = 1; try { lv = getCardLevel(cid); } catch (e) {}
        h += '<button data-roy-pick="' + cid + '" style="padding:9px 4px;border:1.5px solid rgba(255,255,255,.2);border-radius:10px;background:rgba(255,255,255,.08);color:#fff;font-size:12px;font-weight:900;font-family:inherit;cursor:pointer;">' + esc(CHARS[cid].name) + '<br><span style="font-size:10px;color:#9fd8ff;">Lv.' + lv + ' · ×' + cardMult(cid).toFixed(2) + '</span></button>';
      });
      h += '</div><button data-roy-cancel="1" style="width:100%;margin-top:8px;padding:8px;border:none;border-radius:8px;background:rgba(255,255,255,.1);color:#ccc;font-size:12px;font-family:inherit;cursor:pointer;">취소</button></div>';
    }
    var can = own > 0 && d.slots.length < cap;
    h += '<button data-roy-new="1" style="width:100%;padding:13px;border:none;border-radius:12px;font-size:14px;font-weight:900;font-family:inherit;cursor:pointer;color:#fff;background:' + (can ? 'linear-gradient(135deg,#FFB86B,#ef4444)' : '#555') + ';">📜 정규 앨범 등록하기 (보유 ' + own + '장)</button>';
    return h;
  }
  function bindRoy() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-roy-claim]'), function (b) {
      b.onclick = function () {
        var r = royClaim(parseInt(b.getAttribute('data-roy-claim'), 10));
        if (r.total > 0) { sfx('coin'); ST.msg = '💰 저작권료 🍔 +' + r.total.toLocaleString() + (r.hits ? ' · 🔥 차트 진입 ' + r.hits + '일!' : ''); } else toast('아직 쌓인 저작권료가 없어요');
        render();
      };
    });
    var all = document.querySelector('[data-roy-all]');
    if (all) all.onclick = function () {
      var r = royClaim();
      if (r.total > 0) { sfx('coin'); ST.msg = '💰 저작권료 🍔 +' + r.total.toLocaleString() + (r.hits ? ' · 🔥 차트 진입 ' + r.hits + '일!' : ''); } else toast('아직 쌓인 저작권료가 없어요');
      render();
    };
    var nw = document.querySelector('[data-roy-new]');
    if (nw) nw.onclick = function () {
      var d = loadRoy();
      if (qtyOf(TIERS[0].name, bag()) < 1) { toast('정규 앨범이 없어요 (종류 10개 이상으로 작곡해요)'); return; }
      if (d.slots.length >= roySlots()) { toast('등록 칸이 가득 찼어요'); return; }
      if (!ownedIdols().length) { toast('타이틀곡을 줄 아이돌이 없어요'); return; }
      ST.pick = true; render();
    };
    var cn = document.querySelector('[data-roy-cancel]'); if (cn) cn.onclick = function () { ST.pick = false; render(); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-roy-pick]'), function (b) {
      b.onclick = function () {
        var r = royRegister(b.getAttribute('data-roy-pick'));
        ST.pick = false;
        if (r.ok) { sfx('rarePick'); ST.msg = '📜 저작권 등록! 계약금 🍔 +' + r.fee.toLocaleString() + ' · 이제 매일 저작권료가 쌓여요'; } else toast(r.why);
        render();
      };
    });
  }

  window.openAlbumStudio = function () { open('make'); };
  window.openComposeTable = open;
  window.__albumTest = { royRegister: royRegister, royClaim: royClaim, loadRoy: loadRoy, royPending: royPending, TIERS: TIERS, GENRES: GENRES, evaluate: evaluate, findRecipe: findRecipe, RECIPES: RECIPES, nearest: nearest, needFor: needFor, compose: compose, releasePopup: releasePopup, sell: sell, sellBonus: sellBonus, priceOf: priceOf, loadNote: loadNote, qtyOf: qtyOf };

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
