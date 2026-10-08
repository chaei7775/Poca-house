// ════════════════════════════════
// 🏫 등교 화면 개편 (school-popup.js)
// 연성고등학교 "등교시키기"를 큰 팝업으로 보여주고, 국어 → 수학 → 체육 순서대로 한 과목씩 진행한다.
//  · 허브(오늘의 수업) / 과목 결과 / 성적표 모두 같은 큰 팝업에서 보임
//  · 미니게임 자체(받아쓰기·암기카드·칸밟기)와 점수·티켓·보상 계산은 game.js 그대로 사용
//  · 과목 순서·문구는 아래 SUBJ 만 고치면 됨
// ════════════════════════════════
(function () {
  'use strict';
  var SUBJ = [
    { k: 'korean', icon: '📚', img: 'school-korean.png', name: '국어', game: '받아쓰기', desc: '선생님이 읽어주는 단어를 맞게 고르기', start: 'startDictationGame' },
    { k: 'memory', icon: '🧠', img: 'school-math.png', name: '수학', game: '암기카드', desc: '9장 카드의 위치를 기억해서 짝 맞추기', start: 'startMemoryCardGame' },
    { k: 'pe',     icon: '🏃', img: 'school-pe.png', name: '체육', game: '칸밟기',   desc: '12칸 중 초록칸 6개를 기억해서 밟기', start: 'startStepTileGame' }
  ];
  var FONT = "font-family:'Noto Sans KR',sans-serif;";

  function ready() { return typeof window.renderSchoolHome === 'function' && typeof window.showSchoolResult === 'function' && typeof window.finishSchoolReport === 'function' && typeof ensureSchoolOverlay === 'function'; }

  function css() {
    if (document.getElementById('sp-style')) return;
    var s = document.createElement('style'); s.id = 'sp-style';
    s.textContent = '@keyframes sp-pulse{0%,100%{box-shadow:0 0 0 0 rgba(96,165,250,.55)}50%{box-shadow:0 0 0 9px rgba(96,165,250,0)}}' +
      '@keyframes sp-pop{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}' +
      '#school-pop button{font-family:inherit}';
    document.head.appendChild(s);
  }
  function host() {
    var el = document.getElementById('school-pop');
    if (el) return el;
    css();
    el = document.createElement('div'); el.id = 'school-pop';
    el.style.cssText = 'display:none;position:fixed;inset:0;z-index:901;background:rgba(15,10,35,.62);align-items:center;justify-content:center;padding:14px;' + FONT;
    document.body.appendChild(el);
    return el;
  }
  function hidePop() { var el = document.getElementById('school-pop'); if (el) el.style.display = 'none'; }
  function showPop(inner) {
    var el = host();
    el.innerHTML = '<div style="position:relative;width:min(92vw,400px);max-height:92vh;overflow-y:auto;background:linear-gradient(180deg,#ffffff,#fdf2f8);border-radius:28px;box-shadow:0 20px 60px rgba(0,0,0,.45);animation:sp-pop .22s ease-out;">' +
      '<button onclick="__schoolPop.close()" style="position:absolute;top:10px;right:10px;z-index:3;width:34px;height:34px;border:none;border-radius:50%;background:rgba(0,0,0,.28);color:#fff;font-size:16px;font-weight:900;cursor:pointer;">✕</button>' + inner + '</div>';
    el.style.display = 'flex';
    var ov = document.getElementById('school-overlay'); if (ov) ov.style.display = 'none';
  }
  // 아이콘 이미지(없으면 이모지로 대체)
  function ico(img, emoji, px) {
    return '<img src="' + img + '" alt="" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain;display:block;" onerror="this.outerHTML=\'<span style=&quot;font-size:' + Math.round(px * 0.6) + 'px;line-height:1;&quot;>' + emoji + '</span>\'">';
  }
  function chip(t) { return '<span style="background:rgba(255,255,255,.25);border-radius:14px;padding:4px 10px;font-size:12px;font-weight:900;color:#fff;">' + t + '</span>'; }
  function bigBtn(label, onclick, bg, dis) {
    return '<button ' + (dis ? 'disabled' : 'onclick="' + onclick + '"') + ' style="width:100%;padding:16px;border:none;border-radius:18px;font-size:16px;font-weight:900;color:' + (dis ? '#94a3b8' : '#fff') + ';background:' + (dis ? '#e2e8f0' : bg) + ';cursor:' + (dis ? 'not-allowed' : 'pointer') + ';">' + label + '</button>';
  }

  function isDone(k, scores, cd) { return typeof scores[k] === 'number' || !!cd.done[k]; }
  function nextSubject(scores, cd) { for (var i = 0; i < SUBJ.length; i++) if (!isDone(SUBJ[i].k, scores, cd)) return SUBJ[i]; return null; }

  // ── 허브: 오늘의 수업 ──
  function renderHub() {
    normalizeSchoolDaily();
    var card = getSchoolSelectedCard();
    if (!card) {
      showPop('<div style="padding:34px 22px 26px;text-align:center;"><div style="font-size:54px;">🎒</div>' +
        '<div style="font-size:21px;font-weight:900;color:#1d4ed8;margin:8px 0;">등교시킬 포카가 없어요</div>' +
        '<div style="font-size:13.5px;color:#64748b;line-height:1.6;margin-bottom:20px;">카드 뽑기에서 포카를 먼저 뽑은 뒤<br>연성고등학교에 보내주세요.</div>' +
        bigBtn('✨ 카드 뽑으러 가기', "__schoolPop.close();goTo('gacha')", 'linear-gradient(135deg,#C084FC,#FF6B9D)') + '</div>');
      return;
    }
    var scores = getSchoolScores(), cd = getSchoolCardDaily();
    var doneN = SUBJ.filter(function (s) { return isDone(s.k, scores, cd); }).length;
    var allDone = doneN === SUBJ.length;
    var paid = !!(cd.paid || Object.keys(cd.done || {}).some(function (k) { return cd.done[k]; }));
    var noTicket = !paid && schoolDaily.tickets <= 0;
    var next = nextSubject(scores, cd);

    var head = '<div style="background:linear-gradient(135deg,#60a5fa,#C084FC);border-radius:28px 28px 0 0;padding:20px 18px 16px;color:#fff;">' +
      '<div style="font-size:12px;font-weight:900;opacity:.9;margin-bottom:10px;">🏫 연성고등학교 · 오늘의 수업</div>' +
      '<div style="display:flex;align-items:center;gap:14px;">' +
        '<img src="' + card.img + '" style="width:84px;height:112px;object-fit:cover;border-radius:14px;border:3px solid #fff;box-shadow:0 6px 16px rgba(0,0,0,.3);background:#fff3;flex-shrink:0;" onerror="this.style.display=\'none\'">' +
        '<div style="flex:1;min-width:0;"><div style="font-size:20px;font-weight:900;line-height:1.25;word-break:keep-all;">🎒 ' + card.name + '</div>' +
        '<div style="font-size:12.5px;opacity:.95;margin:3px 0 10px;">등교 중 · 수업 끝나면 성적표!</div>' +
        '<button onclick="__schoolPop.change()" style="border:none;border-radius:12px;background:#fff;color:#1d4ed8;font-size:12.5px;font-weight:900;padding:7px 14px;cursor:pointer;">🔄 포카 바꾸기</button></div></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:14px;">' + chip('🎫 ' + schoolDaily.tickets + '/3') + chip('⭐ ' + honorStars) + chip('✨ ' + honorFragments + '/100') + '</div></div>';

    var bar = '<div style="padding:16px 18px 4px;"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:900;color:#334155;margin-bottom:7px;"><span>오늘의 수업 진행</span><span>' + doneN + ' / 3</span></div>' +
      '<div style="height:10px;border-radius:6px;background:#e2e8f0;overflow:hidden;"><div style="height:100%;width:' + Math.round(doneN / 3 * 100) + '%;background:linear-gradient(90deg,#60a5fa,#C084FC);border-radius:6px;transition:width .4s;"></div></div></div>';

    var steps = SUBJ.map(function (s, i) {
      var done = isDone(s.k, scores, cd), cur = !done && next && next.k === s.k, locked = !done && !cur;
      var right, border, bg, op = 1;
      if (done) { right = '<div style="text-align:right;flex-shrink:0;"><div style="font-size:22px;font-weight:900;color:#F59E0B;line-height:1;">' + (typeof scores[s.k] === 'number' ? scores[s.k] : '✓') + '</div><div style="font-size:11px;color:#16a34a;font-weight:900;margin-top:2px;">✅ 완료</div></div>'; border = '#bbf7d0'; bg = '#f0fdf4'; }
      else if (cur) { right = '<div style="flex-shrink:0;background:linear-gradient(135deg,#60a5fa,#C084FC);color:#fff;font-weight:900;font-size:14px;border-radius:14px;padding:10px 14px;">시작 ▶</div>'; border = '#60a5fa'; bg = '#fff'; }
      else { right = '<div style="font-size:22px;flex-shrink:0;">🔒</div>'; border = '#e2e8f0'; bg = '#f8fafc'; op = .6; }
      var clickable = cur && !noTicket;
      return '<button ' + (clickable ? 'onclick="__schoolPop.go(\'' + s.k + '\')"' : 'disabled') + ' style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px 14px;margin-bottom:10px;border:2.5px solid ' + border + ';background:' + bg + ';border-radius:20px;opacity:' + op + ';cursor:' + (clickable ? 'pointer' : 'default') + ';' + (cur ? 'animation:sp-pulse 1.6s infinite;' : '') + '">' +
        '<div style="width:58px;height:58px;border-radius:16px;background:' + (done ? '#dcfce7' : '#eff6ff') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + ico(s.img, s.icon, 50) + '</div>' +
        '<div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:900;color:#94a3b8;">' + (i + 1) + '교시</div><div style="font-size:17px;font-weight:900;color:#0f172a;">' + s.name + ' · ' + s.game + '</div><div style="font-size:12px;color:#64748b;line-height:1.4;margin-top:1px;word-break:keep-all;">' + s.desc + '</div></div>' + right + '</button>';
    }).join('');

    var notice = noTicket ? '<div style="background:#fef2f2;border:1.5px solid #fecaca;color:#dc2626;border-radius:14px;padding:10px 12px;font-size:12.5px;font-weight:800;margin-bottom:10px;">🎫 등교티켓이 없어요. 내일 다시 충전돼요!</div>'
      : (!paid ? '<div style="font-size:11.5px;color:#64748b;text-align:center;margin-bottom:10px;">🎫 이 포카는 첫 수업을 시작할 때 티켓 1장만 써요 (세 과목 모두 포함)</div>' : '');

    var report;
    if (cd.report) report = bigBtn('📋 오늘 성적표는 받았어요 ✅', '', '', true);
    else if (allDone) report = bigBtn(ico('school-report.png','📋',26).replace('display:block','display:inline-block;vertical-align:middle;margin-right:6px') + '성적표 받기', '__schoolPop.report()', 'linear-gradient(135deg,#F59E0B,#FF6B9D)');
    else report = bigBtn('📋 세 과목을 모두 마치면 성적표를 받아요', '', '', true);

    showPop(head + bar + '<div style="padding:12px 18px 20px;">' + notice + steps + '<div style="margin-top:4px;">' + report + '</div></div>');
  }

  // ── 과목 결과 ──
  function renderResult(title, score, sub) {
    normalizeSchoolDaily();
    var scores = getSchoolScores(), cd = getSchoolCardDaily();
    var next = nextSubject(scores, cd);
    var curImg = /국어|받아쓰기/.test(title) ? 'school-korean.png' : /암기|수학/.test(title) ? 'school-math.png' : 'school-pe.png';
    var stars = score >= 90 ? '⭐⭐⭐' : score >= 70 ? '⭐⭐' : '⭐';
    var msg = score >= 90 ? '완벽해요! 🎉' : score >= 70 ? '잘했어요! 👏' : '조금 아쉬워요, 다음엔 더 잘할 수 있어요!';
    var action = next
      ? bigBtn('다음 수업 · ' + next.name + ' ▶', "__schoolPop.go('" + next.k + "')", 'linear-gradient(135deg,#60a5fa,#C084FC)')
      : bigBtn('📋 성적표 받으러 가기', '__schoolPop.report()', 'linear-gradient(135deg,#F59E0B,#FF6B9D)');
    showPop('<div style="background:linear-gradient(135deg,#60a5fa,#C084FC);border-radius:28px 28px 0 0;padding:22px 18px;text-align:center;color:#fff;"><div style="display:flex;justify-content:center;">' + ico(curImg, '🎓', 64) + '</div><div style="font-size:17px;font-weight:900;margin-top:4px;">' + title + '</div></div>' +
      '<div style="padding:24px 20px 20px;text-align:center;">' +
      '<div style="font-size:30px;letter-spacing:4px;margin-bottom:2px;">' + stars + '</div>' +
      '<div style="font-size:68px;font-weight:900;color:#F59E0B;line-height:1.05;">' + score + '<span style="font-size:20px;color:#94a3b8;margin-left:3px;">점</span></div>' +
      '<div style="font-size:15px;font-weight:900;color:#334155;margin:8px 0 4px;">' + msg + '</div>' +
      '<div style="font-size:12.5px;color:#64748b;margin-bottom:20px;line-height:1.5;">' + (sub || '') + '</div>' +
      action +
      '<button onclick="__schoolPop.hub()" style="width:100%;margin-top:10px;padding:12px;border:none;background:none;color:#64748b;font-size:13.5px;font-weight:800;cursor:pointer;">오늘의 수업 보기</button></div>');
  }

  function install() {
    if (!ready()) return false;
    if (window.__schoolPopInstalled) return true;
    window.__schoolPopInstalled = true;
    host();

    window.renderSchoolHome = function () { try { renderHub(); } catch (e) { console.warn('school-popup', e); } };

    var origResult = window.showSchoolResult;
    window.showSchoolResult = function (title, score, sub) {
      var r = origResult.apply(this, arguments);   // 점수 보너스·퀘스트 집계 등 다른 파일의 처리까지 그대로 실행
      try {
        var ov = document.getElementById('school-overlay');
        var sc = ov && ov.querySelector('div[style*="font-size:52px"]');
        if (sc) { var sb = sc.nextElementSibling; renderResult(title, parseInt(sc.textContent, 10) || 0, sb ? sb.innerHTML : sub); }
      } catch (e) { console.warn('school-popup result', e); }
      return r;
    };

    var origReport = window.finishSchoolReport;
    window.finishSchoolReport = function () {
      try { var ov0 = document.getElementById('school-overlay'); if (ov0) ov0.innerHTML = ''; } catch (e) {}
      var r = origReport.apply(this, arguments);
      try {
        var ov = document.getElementById('school-overlay');
        var c = ov && ov.querySelector('div[style*="border:2px solid #fde68a"]');
        if (c) {
          var inner = c.cloneNode(true);
          inner.style.cssText = 'padding:28px 20px 22px;text-align:center;';
          var btn = inner.querySelector('button'); if (btn) btn.setAttribute('onclick', '__schoolPop.hub()');
          showPop('<div style="background:linear-gradient(135deg,#F59E0B,#FF6B9D);border-radius:28px 28px 0 0;padding:20px 18px;text-align:center;color:#fff;font-size:18px;font-weight:900;">' + ico('school-report.png', '📋', 64) + '<div style="margin-top:4px;">오늘의 성적표</div></div>' + inner.outerHTML);
        }
      } catch (e) { console.warn('school-popup report', e); }
      return r;
    };

    var origSelect = window.renderSchoolSelect;
    window.renderSchoolSelect = function () { hidePop(); return origSelect.apply(this, arguments); };
    var origClose = window.closeSchoolGames;
    window.closeSchoolGames = function () { origClose.apply(this, arguments); renderHub(); };   // 게임·포카선택 화면의 ← 는 오늘의 수업 팝업으로 돌아감

    window.__schoolPop = {
      close: function () { hidePop(); try { origClose.call(window); } catch (e) {} },
      hub: function () { renderHub(); },
      change: function () { window.renderSchoolSelect(); },
      go: function (k) {
        var s = SUBJ.filter(function (x) { return x.k === k; })[0]; if (!s) return;
        hidePop();
        var ov = ensureSchoolOverlay(); ov.style.display = 'block';
        try { window[s.start](); } catch (e) { console.warn(e); renderHub(); }
      },
      report: function () { window.finishSchoolReport(); },
      SUBJ: SUBJ
    };
    return true;
  }
  var n = 0;
  (function t() { if (!install() && n++ < 300) setTimeout(t, 200); })();
})();
