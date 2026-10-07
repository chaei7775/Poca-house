// ════════════════════════════════
// 🧑‍💼 매니저 (manager.js) — 1단계: 신입 전담 매니저
// 데뷔 전 연습생을 담당하는 "신입 전담 매니저". 데뷔를 앞둔 멤버의 데뷔 확률을 올려준다 (데뷔하면 그 멤버는 졸업).
//  · 처음 데뷔 도전 화면을 열면 매니저가 등장하는 스토리가 한 번 나온다
//  · 데뷔 확률 +BONUS %p (agency.js 의 window.__debutBonus 로 연결됨)
//  · 기획사 화면 맨 위에 매니저 카드 + 앞으로 만날 3명(🔒)이 표시된다
// 매니저 4종 (신입 → 배우 → 아이돌 → 탑스타): 지금은 신입만 열림, 나머지는 자리만.
// 이미지: manager-rookie.png (없으면 🧑‍💼 이모지로 보임) — 저장소 루트에 올리면 자동 적용
// 저장: localStorage 'ph_manager' (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// 값을 바꾸고 싶으면 아래 [설정]만 고치면 된다.
// ════════════════════════════════
(function () {
  'use strict';
  // ── 설정 ──
  var KEY = 'ph_manager';
  var BONUS = 30;                       // 데뷔 확률 증가 (%p)
  var NAME = '한지우';
  var TITLE = '신입 전담 매니저';
  var IMG = 'manager-rookie.png?v=2';
  var LOCKED = [
    { icon: '🎭', title: '배우 전담 매니저',   when: '드라마 촬영이 익숙해지면 만나요' },
    { icon: '🎤', title: '아이돌 전담 매니저', when: '컴백 무대를 준비할 때 만나요' },
    { icon: '🌟', title: '탑스타 전담 매니저', when: '탑스타가 되면 만나요' }
  ];
  var STORY = [
    '안녕! 너가 이 친구들 담당이지? 나는 새로 배정된 신입 전담 매니저 ' + NAME + '이야.',
    '데뷔 전 연습생에겐 나 같은 신입 전담이 붙어. 심사 자료 챙기고, 심사위원 앞에서 첫인상 만드는 걸 도와줄게.',
    '심사위원들이 처음 보는 얼굴한테 박한 편이거든. 내가 같이 가면 데뷔 확률이 +' + BONUS + '%p 올라갈 거야!',
    '단, 나는 \'신입 전용\'이야. 데뷔하고 나면 그 아이는 배우 · 아이돌 · 탑스타 전담 매니저들한테 넘어가.',
    '자, 첫 데뷔부터 같이 가보자. 잘 부탁해!'
  ];

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function plv() { try { return Number(playerLevel) || 1; } catch (e) { return 1; } }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  var FONT = "font-family:'Noto Sans KR',sans-serif;";

  // 데뷔 확률 버프: 매니저를 만난 뒤부터 (agency.js debutChance 가 부름). 데뷔한 멤버는 도전 자체가 없어서 자동으로 졸업.
  window.__debutBonus = function () { return load().met ? BONUS : 0; };

  function avatar(px) {
    return '<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:' + px + 'px;height:' + px + 'px;border-radius:50%;background:linear-gradient(135deg,#60a5fa,#C084FC);overflow:hidden;font-size:' + Math.round(px * 0.55) + 'px;flex:none;">🧑‍💼' +
      '<img src="' + IMG + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;" onload="this.parentNode.style.fontSize=\'0\'" onerror="this.remove()"></span>';
  }

  // ════════ 첫 만남 스토리 ════════
  function showStory(done) {
    if (document.getElementById('mgr-story')) return;
    var i = 0;
    var ov = document.createElement('div'); ov.id = 'mgr-story';
    ov.style.cssText = 'position:fixed;inset:0;z-index:1300;background:rgba(0,0,0,.85);display:flex;align-items:flex-end;justify-content:center;padding:16px 16px 40px;' + FONT;
    document.body.appendChild(ov);
    function draw() {
      var last = i >= STORY.length - 1;
      ov.innerHTML = '<div style="width:100%;max-width:360px;">' +
        '<div style="text-align:center;margin-bottom:14px;">' + avatar(120) + '</div>' +
        '<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #C084FC;border-radius:18px;padding:16px 18px;color:#fff;">' +
          '<div style="font-size:12px;font-weight:900;color:#9fd8ff;margin-bottom:6px;">🧑‍💼 ' + esc(NAME) + ' <span style="color:#aaa;font-weight:400;">· ' + esc(TITLE) + '</span></div>' +
          '<div style="font-size:14px;line-height:1.7;min-height:72px;">' + esc(STORY[i]) + '</div>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;"><span style="font-size:11px;color:#888;">' + (i + 1) + ' / ' + STORY.length + '</span>' +
          '<button id="mgr-next" style="border:none;border-radius:12px;padding:10px 20px;font-weight:900;font-size:14px;color:#fff;cursor:pointer;background:linear-gradient(135deg,#FF6B9D,#C084FC);' + FONT + '">' + (last ? '계약 완료 🤝' : '다음 ▶') + '</button></div>' +
        '</div></div>';
      ov.querySelector('#mgr-next').onclick = function () {
        if (!last) { i++; draw(); return; }
        var s = load(); s.met = true; s.metAt = Date.now(); save(s);
        ov.remove(); if (typeof showBagToast === 'function') showBagToast('🧑‍💼 ' + NAME + ' 매니저가 함께해요! 데뷔 확률 +' + BONUS + '%p');
        if (done) done();
      };
    }
    draw();
  }


  // ════════ 🎭 2단계: 배우 전담 매니저 (드라마를 한 번 찍으면 만나요) ════════
  var ACT = { name: '윤서진', title: '배우 전담 매니저', img: 'manager-actor.png?v=1', pay: 20 };   // 드라마 출연료 +pay%
  var ACT_STORY = [
    '첫 촬영 잘 봤어. 나는 배우 전담 매니저 ' + ACT.name + '이야.',
    '신입 때는 한지우가 챙겼겠지만, 카메라 앞에 선 순간부터는 내 담당이야.',
    '대본 분석, 촬영장 스케줄, 감독님 취향까지 내가 다 정리해 둘게. 너는 연기만 해.',
    '계약하면 드라마 출연료가 +' + ACT.pay + '% 올라가. 시청률이 잘 나올수록 더 크게 느껴질 거야.',
    '자, 다음 촬영 가보자. 시계는 내가 볼게.'
  ];
  function actorMet() { return !!load().actMet; }
  function actorReady() {
    if (load().actReady) return true;
    try { var d = JSON.parse(localStorage.getItem('ph_drama') || '{}'); return (d.shoots || 0) >= 1; } catch (e) { return false; }
  }
  window.__actorPayMult = function () { return actorMet() ? 1 + ACT.pay / 100 : 1; };
  window.addEventListener('ph-drama-shot', function () { var s = load(); s.actReady = true; save(s); });
  function actAvatar(px) {
    return '<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:' + px + 'px;height:' + px + 'px;border-radius:50%;background:linear-gradient(135deg,#be123c,#C084FC);overflow:hidden;font-size:' + Math.round(px * 0.55) + 'px;flex:none;">🎭' +
      '<img src="' + ACT.img + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 25%;" onload="this.parentNode.style.fontSize=\'0\'" onerror="this.remove()"></span>';
  }
  function showActorStory() {
    if (document.getElementById('mgr-story')) return;
    var i = 0, ov = document.createElement('div'); ov.id = 'mgr-story';
    ov.style.cssText = 'position:fixed;inset:0;z-index:1300;background:rgba(0,0,0,.85);display:flex;align-items:flex-end;justify-content:center;padding:16px 16px 40px;' + FONT;
    document.body.appendChild(ov);
    function draw() {
      var last = i >= ACT_STORY.length - 1;
      ov.innerHTML = '<div style="width:100%;max-width:360px;"><div style="text-align:center;margin-bottom:14px;">' + actAvatar(130) + '</div>' +
        '<div style="background:linear-gradient(135deg,#1a1a2e,#3b1230);border:2px solid #fb7185;border-radius:18px;padding:16px 18px;color:#fff;">' +
        '<div style="font-size:12px;font-weight:900;color:#fda4af;margin-bottom:6px;">🎭 ' + esc(ACT.name) + ' <span style="color:#aaa;font-weight:400;">· ' + esc(ACT.title) + '</span></div>' +
        '<div style="font-size:14px;line-height:1.7;min-height:72px;">' + esc(ACT_STORY[i]) + '</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;"><span style="font-size:11px;color:#888;">' + (i + 1) + ' / ' + ACT_STORY.length + '</span>' +
        '<button id="mgr-next" style="border:none;border-radius:12px;padding:10px 20px;font-weight:900;font-size:14px;color:#fff;cursor:pointer;background:linear-gradient(135deg,#fb7185,#C084FC);' + FONT + '">' + (last ? '계약하기' : '다음') + '</button></div></div></div>';
      ov.querySelector('#mgr-next').onclick = function () {
        if (!last) { i++; draw(); return; }
        var s = load(); s.actMet = true; s.actMetAt = Date.now(); save(s); ov.remove();
        if (typeof showBagToast === 'function') showBagToast('🎭 ' + ACT.name + ' 매니저가 함께해요! 드라마 출연료 +' + ACT.pay + '%');
        var c = document.getElementById('mgr-card'); if (c) { var n = document.createElement('div'); n.innerHTML = cardHtml(); c.replaceWith(n.firstChild); }
      };
    }
    draw();
  }

  // ════════ 기획사 화면 / 데뷔 도전 화면에 매니저 표시 ════════
  function cardHtml() {
    var met = !!load().met;
    var h = '<div id="mgr-card" style="margin:10px 0;padding:10px 12px;border-radius:14px;background:rgba(96,165,250,.12);border:1.5px solid rgba(96,165,250,.5);' + FONT + '">' +
      '<div style="display:flex;align-items:center;gap:10px;">' + avatar(44) +
      '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:900;color:#fff;">' + esc(NAME) + ' <span style="font-size:11px;color:#9fd8ff;font-weight:400;">' + esc(TITLE) + '</span></div>' +
      '<div style="font-size:11px;color:#cfe3ff;margin-top:2px;">' + (met ? '데뷔 도전 확률 <b style="color:#FFD700;">+' + BONUS + '%p</b> 지원 중 (데뷔하면 졸업)' : '데뷔 도전 화면에서 처음 만나요') + '</div></div></div>';
    if (actorMet()) {
      h += '<div style="display:flex;align-items:center;gap:10px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(251,113,133,.35);">' + actAvatar(44) +
        '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:900;color:#fff;">' + esc(ACT.name) + ' <span style="font-size:11px;color:#fda4af;font-weight:400;">' + esc(ACT.title) + '</span></div>' +
        '<div style="font-size:11px;color:#ffd6dd;margin-top:2px;">드라마 출연료 <b style="color:#FFD700;">+' + ACT.pay + '%</b> 지원 중</div></div></div>';
    } else if (actorReady()) {
      h += '<div id="mgr-act-meet" style="display:flex;align-items:center;gap:10px;margin-top:8px;padding:8px;border-radius:12px;background:rgba(251,113,133,.15);border:1.5px dashed #fb7185;cursor:pointer;">' + actAvatar(40) +
        '<div style="flex:1;font-size:12px;color:#fff;font-weight:900;">🎭 배우 전담 매니저가 찾아왔어요!<div style="font-size:10px;color:#fda4af;font-weight:400;">눌러서 만나보기</div></div></div>';
    }
    (function () {          // 🚗 로드 매니저 (road-manager.js): 기획사에서도 바로 파견 화면으로
      var T = window.__roadMgrTest, lv = plv(), RM = 12;
      if (!T) return;
      var st = ''; try { st = T.status(); } catch (e) {}
      var met = !!(T.load && T.load().met), lock = lv < RM;
      var line = lock ? '플레이어 Lv.' + RM + '부터 만나요 (지금 Lv.' + lv + ')' : (!met ? '눌러서 만나보기' : (st === 'ready' ? '✅ 다녀왔어요! 눌러서 받기' : (st === 'running' ? '🚗 탐험 파견 중…' : '탐험을 대신 다녀와요 · 눌러서 파견')));
      h += '<div id="mgr-road" style="display:flex;align-items:center;gap:10px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(52,211,153,.35);' + (lock ? 'opacity:.55;' : 'cursor:pointer;') + '">' +
        '<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#34d399,#3b82f6);overflow:hidden;font-size:22px;flex:none;">🚗' +
        '<img src="road-manager.png?v=1" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 25%;" onload="this.parentNode.style.fontSize=\'0\'" onerror="this.remove()"></span>' +
        '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:900;color:#fff;">박현수 <span style="font-size:11px;color:#6ee7b7;font-weight:400;">로드 매니저</span></div>' +
        '<div style="font-size:11px;color:#d1fae5;margin-top:2px;">' + (lock ? '🔒 ' : '') + line + '</div></div></div>';
    })();
    h += '<div style="display:flex;gap:6px;margin-top:8px;">' + LOCKED.filter(function (l) { return l.icon !== '🎭' || !(actorMet() || actorReady()); }).map(function (l) {
      return '<div style="flex:1;text-align:center;padding:6px 2px;border-radius:10px;background:rgba(0,0,0,.25);opacity:.75;"><div style="font-size:16px;">' + l.icon + '🔒</div><div style="font-size:9px;color:#aaa;line-height:1.3;margin-top:2px;">' + esc(l.title.replace(' 전담 매니저', '')) + '<br>매니저</div></div>';
    }).join('') + '</div></div>';
    return h;
  }

  function decorate() {
    var ag = document.getElementById('agency-overlay');
    if (ag && !ag.querySelector('#mgr-card')) {
      var host = ag.firstElementChild;
      if (host) { var d = document.createElement('div'); d.innerHTML = cardHtml(); host.insertBefore(d.firstChild, host.children[2] || null); }
    }
    var db = document.getElementById('agency-debut-overlay');
    if (db) {
      var inner = db.firstElementChild;
      if (inner && !inner.querySelector('#mgr-mini')) {
        var met = !!load().met;
        var m = document.createElement('div'); m.id = 'mgr-mini';
        m.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:8px 10px;border-radius:12px;background:rgba(96,165,250,.14);border:1px solid rgba(96,165,250,.5);' + FONT;
        m.innerHTML = avatar(32) + '<div style="font-size:12px;color:#cfe3ff;line-height:1.4;"><b style="color:#fff;">' + esc(NAME) + ' 매니저</b><br>' + (met ? '데뷔 확률 <b style="color:#FFD700;">+' + BONUS + '%p</b> 적용 중' : '인사부터 할게!') + '</div>';
        inner.insertBefore(m, inner.firstChild);
      }
      if (!load().met && !document.getElementById('mgr-story')) {
        showStory(function () {      // 만난 직후: 데뷔 화면을 닫았다가 같은 멤버로 다시 열어서 올라간 확률이 보이게
          var o = document.getElementById('agency-debut-overlay'); if (o) o.remove();
          setTimeout(function () { try { var b = document.querySelector('#agency-overlay [data-debut="' + lastCid + '"]'); if (b) b.click(); } catch (e) {} }, 100);
        });
      }
    }
  }

  document.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('#mgr-act-meet')) showActorStory(); }, true);
  document.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('#mgr-road') && typeof window.openRoadManager === 'function') window.openRoadManager(); }, true);
  var lastCid = '';
  document.addEventListener('click', function (e) { var b = e.target && e.target.closest && e.target.closest('[data-debut]'); if (b) lastCid = b.getAttribute('data-debut'); }, true);

  var tm = null;
  new MutationObserver(function () { if (tm) return; tm = setTimeout(function () { tm = null; decorate(); }, 120); }).observe(document.body, { childList: true, subtree: true });

  window.__manager = { load: load, bonus: BONUS, showStory: showStory, showActorStory: showActorStory };
})();
