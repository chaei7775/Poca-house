// 🏠 홈 위쪽 레벨 줄을 누르면 포카별 레벨/경험치를 보여주는 창
// 등록: loader.js NEW_CONTENT_FILES 맨 끝에 'poca-exp-popup.js'
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function ownedChars() {
    var ids = [];
    try { Object.keys(CHARS).forEach(function (cid) { if (CARDS.some(function (c) { return c.charId === cid && owned.indexOf(c.id) !== -1; })) ids.push(cid); }); } catch (e) {}
    return ids;
  }
  function open() {
    var old = $('poca-exp-ov'); if (old) { old.remove(); return; }
    var ids = ownedChars(), top = 0;
    try { top = getHighestCardLevel(); } catch (e) {}
    var rows = ids.map(function (cid) {
      var ch = CHARS[cid], lv = getCardLevel(cid), exp = getCardExp(cid), req = getCardExpRequired(lv);
      var max = lv >= POCAHOUSE_MAX_LEVEL, pct = max ? 100 : Math.min(100, Math.round(exp / req * 100));
      return '<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:900;color:#111;"><span>' + (ch.emoji || '') + ' ' + ch.name + (lv === top ? ' <span style="color:#F59E0B;">★ 최고</span>' : '') + '</span><span style="color:#9333ea;">Lv.' + lv + (max ? ' MAX' : '') + '</span></div>' +
        '<div style="height:8px;background:#FFE4EF;border-radius:99px;overflow:hidden;margin:4px 0 2px;"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#FF6B9D,#C084FC);"></div></div>' +
        '<div style="font-size:11px;color:#666;text-align:right;">' + (max ? '만렙' : exp + ' / ' + req + ' EXP') + '</div></div>';
    }).join('') || '<div style="color:#888;text-align:center;padding:16px 0;font-size:13px;">아직 포카가 없어요</div>';
    var ov = document.createElement('div');
    ov.id = 'poca-exp-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:970;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:20px;font-family:\'Noto Sans KR\',sans-serif;';
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    ov.innerHTML = '<div style="background:#fff;border:2px solid #000;border-radius:18px;padding:20px;width:92%;max-width:340px;max-height:80vh;overflow-y:auto;">' +
      '<div style="font-size:16px;font-weight:900;color:#111;margin-bottom:4px;">🏠 아이돌 레벨 (최고 Lv.' + top + ')</div>' +
      '<div style="font-size:11px;color:#666;line-height:1.6;margin-bottom:12px;">아이돌별 성장 레벨이에요. (홈의 ⭐ 레벨은 플레이어 레벨!)<br>경험치: 🏫 학교 성적표(세 과목 완료) · 🎬 팬덤 원정 이벤트</div>' + rows +
      '<button onclick="document.getElementById(\'poca-exp-ov\').remove()" style="width:100%;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;">확인</button></div>';
    document.body.appendChild(ov);
  }
  window.openPocaExpPopup = open;
  setInterval(function () {
    var bar = $('pocahouse-level-bar');
    if (bar && !bar.dataset.expTap) { bar.dataset.expTap = '1'; bar.style.cursor = 'pointer'; bar.addEventListener('click', open); }
  }, 1000);
})();
