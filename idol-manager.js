// ════════════════════════════════
// 🎤 아이돌 전담 매니저 (idol-manager.js) — 그룹을 만들면 찾아오는 매니저 (기획사 화면의 매니저 카드에 나타남)
//  · 조건: 그룹을 만들었을 때(ph_group.group 이 있을 때) 나타남 → 눌러서 만나면 계약
//  · 계약 효과: ① 그룹 활동 보상 +10%  ② 멤버 친밀도가 떨어지는 속도 하루 3 → 2  ③ 멤버 중재 비용 추가 -20%
//  · 이미지: manager-idol.png 를 올리면 얼굴이 나온다 (없으면 🎤 이모지)
//  · 저장: 'ph_manager' 의 idolMet 칸 (다른 매니저 칸은 건드리지 않음)
// ════════════════════════════════
(function () {
  'use strict';
  var NAME = '오세라', TITLE = '아이돌 전담 매니저', IMG = 'manager-idol.png?v=1';
  var PAY = 10, DECAY = 2;
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var STORY = [
    '그룹 결성 축하해! 나는 아이돌 전담 매니저 ' + NAME + '이야.',
    '솔로와 달리 그룹은 한 명만 잘해서는 안 돼. 멤버끼리 호흡이 맞아야 무대가 살아.',
    '컨디션 나쁜 멤버 챙기고, 사이가 틀어지려는 낌새가 보이면 내가 먼저 눈치채고 풀어줄게. 친밀도가 떨어지는 속도가 하루 3에서 ' + DECAY + '로 느려질 거야.',
    '그룹 활동 보상도 내가 협상해서 +' + PAY + '% 더 받아올게.',
    '자, 우리 그룹 제대로 키워보자!'
  ];
  function J(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
  function met() { return !!J('ph_manager').idolMet; }
  function ready() { var g = J('ph_group').group; return !!(g && Array.isArray(g.members) && g.members.length); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function avatar(px) {
    return '<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:' + px + 'px;height:' + px + 'px;border-radius:50%;background:linear-gradient(135deg,#a855f7,#ec4899);overflow:hidden;font-size:' + Math.round(px * .5) + 'px;flex-shrink:0;">🎤' +
      '<img src="' + IMG + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 25%;" onload="this.parentNode.style.fontSize=\'0\'" onerror="this.remove()"></span>';
  }
  function showStory() {
    if (document.getElementById('mgr-story')) return;
    var i = 0, ov = document.createElement('div'); ov.id = 'mgr-story';
    ov.style.cssText = 'position:fixed;inset:0;z-index:1300;background:rgba(0,0,0,.85);display:flex;align-items:flex-end;justify-content:center;padding:16px 16px 40px;' + FONT;
    document.body.appendChild(ov);
    function draw() {
      var last = i >= STORY.length - 1;
      ov.innerHTML = '<div style="width:100%;max-width:360px;"><div style="text-align:center;margin-bottom:14px;">' + avatar(130) + '</div>' +
        '<div style="background:linear-gradient(135deg,#1a1a2e,#3b1250);border:2px solid #d946ef;border-radius:18px;padding:16px 18px;color:#fff;">' +
        '<div style="font-size:12px;font-weight:900;color:#f5d0fe;margin-bottom:6px;">🎤 ' + esc(NAME) + ' <span style="color:#aaa;font-weight:400;">· ' + esc(TITLE) + '</span></div>' +
        '<div style="font-size:14px;line-height:1.7;min-height:72px;">' + esc(STORY[i]) + '</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;"><span style="font-size:11px;color:#888;">' + (i + 1) + ' / ' + STORY.length + '</span>' +
        '<button id="idm-next" style="border:none;border-radius:12px;padding:10px 20px;font-weight:900;font-size:14px;color:#fff;cursor:pointer;background:linear-gradient(135deg,#d946ef,#8b5cf6);' + FONT + '">' + (last ? '계약하기' : '다음') + '</button></div></div></div>';
      ov.querySelector('#idm-next').onclick = function () {
        if (!last) { i++; draw(); return; }
        var s = J('ph_manager'); s.idolMet = true; s.idolMetAt = Date.now(); try { localStorage.setItem('ph_manager', JSON.stringify(s)); } catch (e) {}
        ov.remove();
        if (typeof showBagToast === 'function') showBagToast('🎤 ' + NAME + ' 매니저가 함께해요! 그룹 보상 +' + PAY + '%');
        var c = document.getElementById('idm-row'); if (c) c.remove();
        decorate();
      };
    }
    draw();
  }
  function decorate() {
    var card = document.getElementById('mgr-card');
    if (!card || card.querySelector('#idm-row')) return;
    // 잠금 칩 중 '아이돌 전담' 은 만나는 순간부터 숨김
    var row = document.createElement('div'); row.id = 'idm-row';
    if (met()) {
      row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(217,70,239,.35);';
      row.innerHTML = avatar(44) + '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:900;color:#fff;">' + esc(NAME) + ' <span style="font-size:11px;color:#f5d0fe;font-weight:400;">' + esc(TITLE) + '</span></div>' +
        '<div style="font-size:11px;color:#fae8ff;margin-top:2px;">그룹 보상 <b style="color:#FFD700;">+' + PAY + '%</b> · 친밀도 하락 <b style="color:#FFD700;">-1/일</b></div></div>';
    } else if (ready()) {
      row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-top:8px;padding:8px;border-radius:12px;background:rgba(217,70,239,.15);border:1.5px dashed #d946ef;cursor:pointer;';
      row.innerHTML = avatar(40) + '<div style="flex:1;font-size:12px;color:#fff;font-weight:900;">🎤 아이돌 전담 매니저가 찾아왔어요!<div style="font-size:10px;color:#f5d0fe;font-weight:400;">눌러서 만나보기</div></div>';
      row.onclick = showStory;
    } else return;
    var chips = card.lastElementChild;      // 잠금 칩 줄 앞에 넣는다
    if (chips && chips.children.length && /🔒/.test(chips.textContent)) {
      card.insertBefore(row, chips);
      Array.prototype.forEach.call(chips.children, function (c) { if (/아이돌 전담/.test(c.textContent)) c.remove(); });
    } else card.appendChild(row);
  }
  var tm = null;
  new MutationObserver(function () { if (tm) return; tm = setTimeout(function () { tm = null; decorate(); }, 150); }).observe(document.body, { childList: true, subtree: true });

  window.__idolMgr = { met: met, ready: ready, payMult: function () { return met() ? 1 + PAY / 100 : 1; }, decay: function () { return met() ? DECAY : 3; }, mediDiscount: function () { return met() ? 0.8 : 1; } };
})();
