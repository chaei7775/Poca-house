// ════════════════════════════════
// 👑 라이징스타 (rising.js) — "내 최애가 진짜 뜨는 순간"
// 드라마 촬영(drama.js)에서 대박(시청률 10%↑ / 퍼펙트 / 탑스타 승격)이 나면 결과창 앞에 연출이 뜬다.
//  · 화면이 흔들리고 → 커뮤니티/실검/팬카페 알림이 폭발하고 → 팬카페 회원수가 단계별로 올라가고 → 칭호가 바뀐다.
//  · 회원수는 진짜로 오른다 (팬카페 '이름 없는 회원' 수 = fancafe.js 의 anon). 코인 보너스와 팬카페 바이럴 글도 같이 생긴다.
//  · 아이돌마다 하루 1번만 (실제 날짜 기준) — 계속 떠서 질리지 않게.
// 칭호: 무명(~99명) → 신인(~999) → 라이징스타(~9,999) → 스타(~49,999) → 톱스타(50,000~)
// 저장: localStorage 'ph_rising' (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// ════════════════════════════════
(function () {
  'use strict';
  var KEY = 'ph_rising';
  var FIRST_MEMBERS = [700, 1600];   // 그 아이돌의 첫 대박: 늘어나는 회원 수 범위
  var NEXT_MEMBERS = [200, 700];     // 이후 대박
  var COIN_BASE = 2500, COIN_PER_RATING = 250, COIN_MAX = 8000;
  var DELAY_MS = 700;                // 드라마 결과가 뜬 뒤 연출까지 기다리는 시간
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var TITLES = [[0, '무명'], [100, '신인'], [1000, '라이징스타'], [10000, '스타'], [50000, '톱스타']];

  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function load() {
    var s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!s.last) s.last = {};          // { cid: 'YYYY-M-D' }
    if (!s.count) s.count = {};        // { cid: 지금까지 대박 횟수 }
    return s;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} if (typeof saveAll === 'function') { try { saveAll(); } catch (e) {} } }
  function titleOf(n) { var t = TITLES[0][1]; TITLES.forEach(function (x) { if (n >= x[0]) t = x[1]; }); return t; }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(n) { return Number(n).toLocaleString(); }
  function idolName(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function idolEmoji(cid) { try { return CHARS[cid].emoji || '🎤'; } catch (e) { return '🎤'; } }

  function isBigHit(d) { return !!d && (d.ok || (Number(d.r) >= 10) || d.promoted); }

  // ── 팬카페에 회원 추가 ──
  function addMembers(cid, add, headline) {
    var T = window.__fancafeTest;
    if (!T) return null;
    var s = T.loadAll(), now = Date.now(), ic = T.getIdol(s, cid, now);
    var before = T.members(ic);
    ic.anon = (ic.anon || 0) + add;
    var after = T.members(ic);
    if (T.addPost) T.addPost(ic, { ts: now + 1000, fanId: null, kind: 'viral', title: '🔥 ' + headline,
      body: '드라마 방영 후 커뮤니티가 뒤집어졌어요.\n팬카페 ' + fmt(before) + '명 → ' + fmt(after) + '명\n칭호: ' + titleOf(before) + ' → ' + titleOf(after) });
    ic.lastCare = now;
    T.saveAllState(s);
    return { before: before, after: after };
  }

  var running = false;

  function onShot(e) {
    var d = e && e.detail; if (!isBigHit(d) || !d.ch || running) return;
    var cid = d.ch;
    if (typeof CHARS === 'undefined' || !CHARS[cid] || !window.__fancafeTest) return;
    var s = load();
    if (s.last[cid] === today()) return;                 // 오늘은 이미 터졌음
    s.last[cid] = today();
    var first = !(s.count[cid] > 0);
    s.count[cid] = (s.count[cid] || 0) + 1;
    var range = first ? FIRST_MEMBERS : NEXT_MEMBERS;
    var add = rnd(range[0], range[1]) + Math.round((Number(d.r) || 0) * 20);
    var res = addMembers(cid, add, idolName(cid) + ' 드라마 연기 미쳤다고 커뮤니티가 난리났어요');
    if (!res) return;
    var coinsGot = Math.min(COIN_MAX, COIN_BASE + Math.round((Number(d.r) || 0) * COIN_PER_RATING));
    if (typeof coins !== 'undefined') { coins += coinsGot; try { if (typeof saveAll === 'function') saveAll(); } catch (er) {} }
    save(s);
    running = true;
    setTimeout(function () { play(cid, d, res, coinsGot, first); }, DELAY_MS);
  }

  // ── 연출 ──
  function play(cid, d, res, coinsGot, first) {
    var old = document.getElementById('rising-overlay'); if (old) old.remove();
    var name = idolName(cid);
    var ov = document.createElement('div');
    ov.id = 'rising-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:900;background:radial-gradient(circle at 50% 30%,#2a1745,#07040f 70%);color:#fff;overflow:hidden;display:flex;flex-direction:column;align-items:center;padding:28px 16px;' + FONT;
    var st = document.createElement('style');
    st.textContent = '@keyframes rsShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-6px,3px)}40%{transform:translate(5px,-4px)}60%{transform:translate(-4px,-3px)}80%{transform:translate(4px,4px)}}' +
      '@keyframes rsPop{0%{transform:translateY(14px) scale(.92);opacity:0}100%{transform:none;opacity:1}}' +
      '@keyframes rsGlow{0%,100%{text-shadow:0 0 12px #ffd700}50%{text-shadow:0 0 30px #ffd700,0 0 50px #ff6b9d}}';
    ov.appendChild(st);
    var rating = Number(d.r) || 0;
    ov.insertAdjacentHTML('beforeend',
      '<div id="rs-top" style="text-align:center;margin-top:4px;">' +
        '<div style="font-size:12px;color:#c9b8ff;font-weight:900;">📺 시청률</div>' +
        '<div style="font-size:50px;font-weight:900;color:#ffd700;animation:rsGlow 1.2s infinite;">' + rating.toFixed(1) + '<span style="font-size:22px;">%</span></div>' +
        '<div style="font-size:14px;font-weight:900;margin-top:2px;">' + idolEmoji(cid) + ' ' + esc(name) + (d.ok ? ' · PERFECT SCENE' : '') + '</div></div>' +
      '<div id="rs-feed" style="width:100%;max-width:420px;margin-top:16px;display:flex;flex-direction:column;gap:7px;"></div>' +
      '<div id="rs-count" style="margin-top:auto;text-align:center;opacity:0;transition:opacity .5s;">' +
        '<div style="font-size:12px;color:#c9b8ff;font-weight:900;">☕ 팬카페 회원</div>' +
        '<div id="rs-n" style="font-size:44px;font-weight:900;line-height:1.1;">' + fmt(res.before) + '</div>' +
        '<div id="rs-title" style="font-size:14px;font-weight:900;color:#ffb3cc;margin-top:4px;">' + titleOf(res.before) + '</div></div>' +
      '<div id="rs-final" style="width:100%;max-width:420px;margin:14px 0 6px;"></div>');
    document.body.appendChild(ov);
    // 1) 화면 흔들림
    ov.style.animation = 'rsShake .5s 2';
    var feeds = [
      ['🔥', '커뮤니티', name + ' 연기 미쳤다 ㄷㄷ'],
      ['📈', '실시간 검색어', '1위 · ' + name + ' 드라마'],
      ['💬', '팬카페', '새 글이 쉴 새 없이 올라와요'],
      ['📰', '포카일보', '[단독] "' + name + '" 이 연기를 보라'],
      ['📱', 'SNS', '#' + name + ' 트렌드 급상승'],
      ['📞', '방송가', '섭외 전화가 걸려오고 있어요']
    ];
    var feed = ov.querySelector('#rs-feed');
    feeds.forEach(function (f, i) {
      setTimeout(function () {
        if (!document.getElementById('rising-overlay')) return;
        var row = document.createElement('div');
        row.style.cssText = 'background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);border-radius:12px;padding:8px 12px;font-size:13px;animation:rsPop .35s both;';
        row.innerHTML = '<span style="font-weight:900;color:#ffd700;">' + f[0] + ' ' + esc(f[1]) + '</span> <span>' + esc(f[2]) + '</span>';
        feed.appendChild(row);
        ov.style.animation = 'none'; void ov.offsetWidth; ov.style.animation = 'rsShake .25s 1';
      }, 600 + i * 650);
    });
    // 2) 회원수 카운트업 (단계별)
    var t0 = 600 + feeds.length * 650 + 300;
    setTimeout(function () {
      var box = document.getElementById('rs-count'); if (box) box.style.opacity = '1';
      var steps = [res.before, Math.round(res.before + (res.after - res.before) * 0.06), Math.round(res.before + (res.after - res.before) * 0.3), res.after];
      var idx = 0;
      (function nextStep() {
        if (!document.getElementById('rising-overlay')) return;
        var from = steps[idx], to = steps[idx + 1], t = 0, dur = 900;
        var iv = setInterval(function () {
          t += 60;
          var k = Math.min(1, t / dur), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
          var n = document.getElementById('rs-n'), ti = document.getElementById('rs-title');
          if (n) n.textContent = fmt(v);
          if (ti) ti.textContent = titleOf(v);
          if (k >= 1) {
            clearInterval(iv); idx++;
            if (idx < steps.length - 1) setTimeout(nextStep, 250); else setTimeout(final, 500);
          }
        }, 60);
      })();
    }, t0);

    function final() {
      var fin = document.getElementById('rs-final'); if (!fin) return;
      var tBefore = titleOf(res.before), tAfter = titleOf(res.after);
      var banner = tBefore !== tAfter ? '👑 ' + tBefore + ' → ' + tAfter : '🔥 ' + name + '의 인기가 또 한 번 터졌어요';
      fin.innerHTML =
        '<div style="text-align:center;font-size:20px;font-weight:900;color:#ffd700;margin-bottom:10px;animation:rsPop .5s both;">' + banner + '</div>' +
        '<div style="text-align:center;margin-bottom:12px;">' +
          '<span style="display:inline-block;margin:3px;padding:6px 12px;border-radius:999px;border:1.5px solid #4ade80;font-size:12.5px;font-weight:900;">👥 회원 +' + fmt(res.after - res.before) + '</span>' +
          '<span style="display:inline-block;margin:3px;padding:6px 12px;border-radius:999px;border:1.5px solid #ffd700;font-size:12.5px;font-weight:900;">🍔 +' + fmt(coinsGot) + ' 코인</span></div>' +
        '<button id="rs-ok" style="width:100%;padding:13px;border:none;border-radius:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:15px;font-weight:900;cursor:pointer;' + FONT + '">확인</button>';
      var b = document.getElementById('rs-ok'); if (b) b.onclick = closeIt;
      try { window.dispatchEvent(new CustomEvent('ph-rising-done', { detail: { cid: cid, members: res.after, title: tAfter } })); } catch (e) {}
    }
  }

  function closeIt() {
    var ov = document.getElementById('rising-overlay'); if (ov) ov.remove();
    running = false;
  }

  window.addEventListener('ph-drama-shot', onShot);
  window.__risingTest = { onShot: onShot, play: play, load: load, titleOf: titleOf, isBigHit: isBigHit, addMembers: addMembers, close: closeIt, CFG: { FIRST_MEMBERS: FIRST_MEMBERS, NEXT_MEMBERS: NEXT_MEMBERS, DELAY_MS: DELAY_MS } };
})();
