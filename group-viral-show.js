// ════════════════════════════════════════════════════════════
// 📱 바이럴 전체화면 연출 (group-viral-show.js)
// group-viral.js 의 작은 SNS 카드 대신, 바이럴이 터지면 화면 전체를 쓰는 연출을 보여준다. (group-viral.js 뒤에 불러옴)
//  ① 📱 알림이 연달아 울린다 → ② 실시간 트렌드 순위가 와르르 올라가고 조회수가 폭발 (하트·팬 댓글이 쏟아짐)
//  ③ 순위 1위 도장(초대박이면 황금 화면 + 화면 흔들림 + 색종이) → ④ 보상 카드(코인 ×배율, 인기도 +)
//  화면을 톡 치면 다음 단계로 넘어가고, 보상 카드에서 '확인'을 누르면 끝. (안 눌러도 자동으로 넘어감)
// 되돌리려면 loader.js 에서 이 파일 줄만 지우면 됨 (그러면 예전 작은 카드 연출로 돌아감)
// ✏️ 고치는 법: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var V = window.__groupViral; if (!V || V.__fx) return; V.__fx = true;
  var legacy = V.show;

  // ── 설정 ──
  var T_NOTI = 1500;          // ① 알림 단계 길이(ms)
  var T_RISE = 2800;          // ② 순위 상승 단계 길이(ms)
  var T_STAMP = 1600;         // ③ 1위 도장 단계 길이(ms)
  var AUTO_END = 20000;       // 보상 카드에서 안 눌러도 넘어가는 시간
  var HEART_EVERY = 160, HEART_MAX = 22;   // 하트 간격 / 동시에 떠 있는 최대 개수 (폰 메모리 보호)
  var KIND = {
    stage: { t: '직캠', tag: '직캠' }, dance: { t: '챌린지 영상', tag: '챌린지' }, variety: { t: '예능 짤', tag: '짤' },
    photo: { t: '화보 직찍', tag: '화보' }, album: { t: '음원 역주행', tag: '음원' }, drama: { t: '명장면 클립', tag: '명장면' }
  };
  var NOTI = ['💬 "이 영상 봤어?" 단톡방 알림', '❤ 좋아요 10만 돌파!', '🔁 공유가 폭주하고 있어요', '📣 실시간 급상승 영상에 올랐어요'];
  var COMMENTS = [
    '미쳤다 이거 보고 하루종일 돌려봄 ㅠㅠ', '조회수 실화냐 ㅋㅋㅋㅋ', '입덕했다 책임져라', '이 그룹 모르는 사람 없게 해줘야 한다',
    '친구 단톡방에 다 돌렸다 ㅋㅋ', '이건 못 참지 ㅠㅠ 또 봐도 또 좋아', '실검 1위 가자!!!', '이번 활동 진짜 레전드다', '캡처해서 프사 바꿈', '벌써 100번 봄 ㅋㅋㅋ'
  ];
  var CSS = '@keyframes gvfFloat{0%{transform:translateY(0) scale(.6);opacity:0}12%{opacity:1}100%{transform:translateY(-78vh) scale(1.15);opacity:0}}' +
    '@keyframes gvfPop{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.18);opacity:1}100%{transform:scale(1)}}' +
    '@keyframes gvfSlam{0%{transform:scale(3.4) rotate(-8deg);opacity:0}55%{transform:scale(.92) rotate(-8deg);opacity:1}75%{transform:scale(1.06) rotate(-8deg)}100%{transform:scale(1) rotate(-8deg)}}' +
    '@keyframes gvfShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-7px,4px)}40%{transform:translate(6px,-5px)}60%{transform:translate(-5px,-3px)}80%{transform:translate(4px,5px)}}' +
    '@keyframes gvfNoti{0%{transform:translateY(-120%);opacity:0}15%{transform:translateY(0);opacity:1}85%{transform:translateY(0);opacity:1}100%{transform:translateY(-30%);opacity:0}}' +
    '@keyframes gvfSlideUp{0%{transform:translateY(60px);opacity:0}100%{transform:translateY(0);opacity:1}}' +
    '@keyframes gvfFall{0%{transform:translateY(-10vh) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(540deg);opacity:.9}}' +
    '@keyframes gvfGlow{0%,100%{opacity:.55}50%{opacity:1}}' +
    '@keyframes gvfFlash{0%{opacity:.95}100%{opacity:0}}' +
    '@keyframes gvfRays{to{transform:translate(-50%,-50%) rotate(360deg)}}';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function sfx(n) { try { window.pocaSfx.play(n); } catch (e) {} }
  function nameOf(c) { try { return CHARS[c].name; } catch (e) { return c; } }
  function sdSrc(c, kind) { try { return window.__groupAnimal ? window.__groupAnimal.sdSrc(c, kind) : 'group-assets/sd/' + c + '.png'; } catch (e) { return 'group-assets/sd/' + c + '.png'; } }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function show(res, done) {
    var v = res && res.viral;
    if (!v) { done && done(); return; }
    var mega = !!v.mega, K = KIND[v.kind] || KIND.stage, mem = (res.members || []).slice(), star = pick(mem) || mem[0];
    var gname = ''; try { gname = window.__groupTest.load().group.name; } catch (e) {}
    var GOLD = mega ? '#ffd76a' : '#ff9ecb', GOLD2 = mega ? '#ff9a3c' : '#c084fc';
    var finalRank = mega ? 1 : rnd(2, 9), startRank = rnd(48, 99), finalViews = rnd(18, 260) * (mega ? 6 : 1), shares = rnd(2, 40) * (mega ? 5 : 1);
    var timers = [], raf = 0, hearts = 0, ended = false, phase = 0, heartTimer = 0, cmtTimer = 0;
    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var ov = document.createElement('div');
    ov.id = 'gvf-ov';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;height:100dvh;z-index:99998;overflow:hidden;color:#fff;font-family:inherit;-webkit-user-select:none;user-select:none;touch-action:manipulation;' +
      'background:' + (mega ? 'radial-gradient(ellipse at 50% 40%,#5b3a00 0%,#2a1245 55%,#07061a 100%)' : 'radial-gradient(ellipse at 50% 40%,#3a1f6b 0%,#150f33 60%,#05061a 100%)') + ';';
    document.body.appendChild(ov);

    function end() {
      if (ended) return; ended = true;
      timers.forEach(clearTimeout); clearInterval(heartTimer); clearInterval(cmtTimer); cancelAnimationFrame(raf);
      ov.style.transition = 'opacity .35s'; ov.style.opacity = '0';
      setTimeout(function () { ov.remove(); st.remove(); done && done(); }, 350);
    }

    // ── ① 알림 ──
    function phaseNoti() {
      phase = 1;
      sfx('grpViral'); try { if (navigator.vibrate) navigator.vibrate(mega ? [60, 40, 60] : 50); } catch (e) {}
      var list = NOTI.slice(0, 3), html = '<div style="position:absolute;top:0;left:0;right:0;padding:calc(env(safe-area-inset-top,0px) + 14px) 14px 0;">';
      list.forEach(function (t, i) {
        html += '<div style="margin-bottom:8px;padding:11px 14px;border-radius:16px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);font-size:13.5px;font-weight:800;animation:gvfNoti ' + (T_NOTI - i * 250) + 'ms ease both;animation-delay:' + (i * 320) + 'ms;opacity:0;">' + t + '</div>';
      });
      ov.innerHTML = html + '</div><div style="position:absolute;left:0;right:0;bottom:12%;text-align:center;font-size:15px;font-weight:900;color:#cbd5ff;animation:gvfGlow 1s infinite;">📱 …무슨 일이 벌어지고 있어요!</div>';
      later(phaseRise, T_NOTI);
    }

    // ── ② 순위 상승 ──
    function phaseRise() {
      phase = 2;
      var gn = esc(gname || '우리그룹'), name = star ? esc(nameOf(star)) : '';
      var starImg = star ? '<img src="' + sdSrc(star, v.kind) + '" alt="" height="200" style="height:200px;width:auto;filter:drop-shadow(0 0 18px ' + GOLD + ');" onerror="this.onerror=null;this.src=\'face-' + esc(star) + '.png\';this.style.cssText=\'height:130px;width:130px;border-radius:26px;object-fit:cover;\'">' : '';
      ov.innerHTML =
        '<div id="gvf-rays" style="position:absolute;left:50%;top:44%;width:150vmax;height:150vmax;transform:translate(-50%,-50%);opacity:.22;animation:gvfRays 14s linear infinite;background:repeating-conic-gradient(' + GOLD + ' 0deg 8deg,transparent 8deg 24deg);"></div>' +
        '<div style="position:absolute;top:0;left:0;right:0;padding:calc(env(safe-area-inset-top,0px) + 14px) 16px 0;display:flex;align-items:center;gap:8px;"><span style="font-size:13px;font-weight:900;color:#9fd8ff;">📱 실시간 트렌드</span><span style="margin-left:auto;font-size:11px;font-weight:900;color:#ff8fb0;animation:gvfGlow 1s infinite;">LIVE ●</span></div>' +
        '<div style="position:absolute;top:calc(env(safe-area-inset-top,0px) + 46px);left:16px;right:16px;text-align:center;">' +
          '<div style="font-size:12px;color:#c9d2ff;">#' + gn + '_' + K.tag + '</div>' +
          '<div style="font-size:15px;font-weight:900;margin-top:2px;">급상승 순위</div>' +
          '<div id="gvf-rank" style="font-size:78px;font-weight:900;line-height:1.05;color:' + GOLD + ';text-shadow:0 0 24px ' + GOLD + '99;">' + startRank + '<span style="font-size:30px;">위</span></div></div>' +
        '<div style="position:absolute;left:0;right:0;top:40%;text-align:center;">' + starImg + '<div style="font-size:14px;font-weight:900;margin-top:2px;">' + name + ' ' + K.t + '</div></div>' +
        '<div style="position:absolute;left:0;right:0;bottom:22%;text-align:center;"><div style="font-size:12px;color:#c9d2ff;">조회수</div><div id="gvf-views" style="font-size:34px;font-weight:900;color:#fff;">0<span style="font-size:18px;">만</span></div><div id="gvf-share" style="font-size:12px;color:#ffd0e0;margin-top:2px;">공유 0만</div></div>' +
        '<div id="gvf-cm" style="position:absolute;left:14px;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);display:flex;flex-direction:column;gap:6px;"></div>' +
        '<div id="gvf-hearts" style="position:absolute;left:0;right:0;bottom:0;height:100%;pointer-events:none;"></div>';
      var rankEl = ov.querySelector('#gvf-rank'), vEl = ov.querySelector('#gvf-views'), sEl = ov.querySelector('#gvf-share'), t0 = performance.now();
      function tick(now) {
        if (ended || phase !== 2) return;
        var t = Math.min(1, (now - t0) / T_RISE), e = ease(t);
        rankEl.innerHTML = Math.round(startRank + (finalRank - startRank) * e) + '<span style="font-size:30px;">위</span>';
        vEl.innerHTML = fmt(finalViews * e) + '<span style="font-size:18px;">만</span>'; sEl.textContent = '공유 ' + fmt(shares * e) + '만';
        if (t < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
      // 하트·댓글
      var hb = ov.querySelector('#gvf-hearts'), cm = ov.querySelector('#gvf-cm'), cmCount = 0;
      heartTimer = setInterval(function () {
        if (hearts >= HEART_MAX) return; hearts++;
        var h = document.createElement('div'); h.textContent = pick(['💖', '💖', '💖', '✨', '💗']);
        h.style.cssText = 'position:absolute;bottom:' + rnd(8, 30) + '%;left:' + rnd(4, 92) + '%;font-size:' + rnd(20, 34) + 'px;animation:gvfFloat ' + rnd(1800, 2800) + 'ms ease-out forwards;';
        h.addEventListener('animationend', function () { h.remove(); hearts--; }); hb.appendChild(h);
      }, HEART_EVERY);
      function addCm() {
        var d = document.createElement('div');
        d.style.cssText = 'padding:7px 11px;border-radius:14px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.14);font-size:12px;line-height:1.4;animation:gvfSlideUp .3s ease both;';
        d.innerHTML = '<span style="color:#ff9ecb;font-weight:900;">@팬' + rnd(100, 999) + '</span> ' + esc(pick(COMMENTS));
        cm.appendChild(d); cmCount++; while (cm.children.length > 3) cm.removeChild(cm.firstChild);
      }
      addCm(); cmCount = 1; cmtTimer = setInterval(addCm, 620);
      later(phaseStamp, T_RISE + 150);
    }

    // ── ③ 1위 도장 ──
    function phaseStamp() {
      phase = 3; cancelAnimationFrame(raf); clearInterval(cmtTimer);
      sfx(mega ? 'grpBig' : 'reward');
      try { if (navigator.vibrate) navigator.vibrate(mega ? [100, 40, 140] : 80); } catch (e) {}
      var fl = document.createElement('div'); fl.style.cssText = 'position:absolute;inset:0;background:' + (mega ? '#fff3c4' : '#ffd6f0') + ';animation:gvfFlash .7s ease-out forwards;pointer-events:none;z-index:5;';
      ov.appendChild(fl);
      var rankTxt = finalRank === 1 ? '실시간 1위' : '실시간 ' + finalRank + '위';
      var stamp = document.createElement('div');
      stamp.style.cssText = 'position:absolute;left:0;right:0;top:34%;text-align:center;z-index:4;pointer-events:none;';
      stamp.innerHTML = '<div style="display:inline-block;padding:14px 26px;border-radius:20px;border:5px solid ' + GOLD + ';background:rgba(10,6,30,.82);box-shadow:0 0 40px ' + GOLD + '99;animation:gvfSlam .55s cubic-bezier(.2,.9,.3,1.2) both;">' +
        '<div style="font-size:' + (mega ? 18 : 15) + 'px;font-weight:900;color:#fff;">' + (mega ? '🔥🔥 초대박 바이럴 🔥🔥' : '🔥 바이럴 터졌어요!') + '</div>' +
        '<div style="font-size:' + (mega ? 46 : 38) + 'px;font-weight:900;line-height:1.15;background:linear-gradient(135deg,' + GOLD + ',' + GOLD2 + ');-webkit-background-clip:text;-webkit-text-fill-color:transparent;">' + rankTxt + '</div></div>';
      ov.appendChild(stamp);
      if (mega) {
        ov.style.animation = 'gvfShake .5s ease';
        for (var i = 0; i < 26; i++) {
          var c = document.createElement('div'), col = pick(['#ffd76a', '#ff9ecb', '#9fd8ff', '#c9a0ff', '#7fe8b0']);
          c.style.cssText = 'position:absolute;top:0;left:' + rnd(0, 98) + '%;width:' + rnd(6, 10) + 'px;height:' + rnd(10, 16) + 'px;background:' + col + ';border-radius:2px;z-index:4;pointer-events:none;animation:gvfFall ' + rnd(1800, 3200) + 'ms linear ' + rnd(0, 600) + 'ms forwards;';
          c.addEventListener('animationend', function (e) { e.target.remove(); }); ov.appendChild(c);
        }
      }
      later(phaseReward, T_STAMP);
    }

    // ── ④ 보상 ──
    function phaseReward() {
      phase = 4; clearInterval(heartTimer);
      var fameTo = v.famePlus || 0;
      var card = document.createElement('div');
      card.style.cssText = 'position:absolute;left:0;right:0;bottom:0;padding:22px 20px calc(env(safe-area-inset-bottom,0px) + 22px);z-index:6;background:linear-gradient(180deg,rgba(10,6,30,0),rgba(10,6,30,.92) 28%);text-align:center;animation:gvfSlideUp .5s ease both;';
      card.innerHTML = '<div style="font-size:13px;color:#c9d2ff;">바이럴 보너스</div>' +
        '<div style="font-size:44px;font-weight:900;margin:2px 0;background:linear-gradient(135deg,' + GOLD + ',' + GOLD2 + ');-webkit-background-clip:text;-webkit-text-fill-color:transparent;">코인 ×' + v.mul + '</div>' +
        '<div style="font-size:16px;font-weight:900;color:#ffe08a;">인기도 <span id="gvf-fame">+0</span></div>' +
        '<button id="gvf-ok" style="margin-top:16px;width:100%;max-width:360px;padding:15px;border:0;border-radius:16px;font-size:16px;font-weight:900;color:#fff;background:linear-gradient(135deg,#ff6b9d,#c084fc);touch-action:manipulation;">확인</button>';
      ov.appendChild(card);
      var fe = card.querySelector('#gvf-fame'), t0 = performance.now();
      (function cnt(now) { if (ended) return; var t = Math.min(1, (now - t0) / 900); fe.textContent = '+' + fmt(fameTo * ease(t)); if (t < 1) requestAnimationFrame(cnt); })(t0);
      sfx('coin');
      card.querySelector('#gvf-ok').onclick = function (e) { e.stopPropagation(); end(); };
      later(end, AUTO_END);
    }

    // 화면을 톡 치면 다음 단계로 (보상 카드가 뜬 뒤엔 '확인' 버튼만)
    ov.addEventListener('click', function () {
      if (ended) return;
      var p = phase; if (p === 1) { timers.forEach(clearTimeout); phaseRise(); } else if (p === 2) { timers.forEach(clearTimeout); clearInterval(cmtTimer); phaseStamp(); } else if (p === 3) { timers.forEach(clearTimeout); phaseReward(); }
    });
    window.__groupViralFx = { cur: function () { return { phase: phase, mega: mega, finalRank: finalRank }; }, skip: function () { ov.click(); } };
    phaseNoti();
  }

  V.show = function (res, done) { try { show(res, done); } catch (e) { try { legacy(res, done); } catch (e2) { done && done(); } } };
  V.showLegacy = legacy;
})();
