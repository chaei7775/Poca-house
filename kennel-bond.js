// ════════════════════════════════
// 💗 동물 친밀도 (kennel-bond.js)
// 같은 동물을 분양받을 때마다 친밀도가 쌓이고, 레벨이 오를수록 CF 촬영 게스트 보너스(성공 확률)가 커진다.
// (kennel.js는 건드리지 않음. 분양 횟수는 kennel.js가 이미 저장하는 값을 그대로 읽으므로 새 저장값은 없음)
//
// - 분양 성공 화면에 "친밀도 Lv.n" 이 뜨고, 레벨이 오르면 알려줌
// - 🐾 분양 도감에 동물마다 친밀도 레벨 / 보너스 / 다음 레벨까지 남은 횟수가 보임
// - CF 촬영 게스트 보너스에 반영되려면 cf-shoot.js가 이 파일을 읽는 버전이어야 함 (교체본 cf-shoot.js)
//
// 숫자를 바꾸고 싶으면 아래 두 줄만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';
  if (window.__kennelBondLoaded) return;
  window.__kennelBondLoaded = true;

  // ── 설정 ──
  var LEVEL_AT = [1, 3, 6, 10, 15];   // 누적 분양 횟수가 이만큼이면 Lv.1 / 2 / 3 / 4 / 5
  var BONUS = [10, 12, 14, 17, 20];   // 레벨별 CF 촬영 성공 확률 보너스(%p) — 처음엔 +10, 최대 +20

  // ════════ 순수 로직 ════════
  function counts() {
    try { return (window.__kennel && window.__kennel.got && window.__kennel.got()) || {}; } catch (e) { return {}; }
  }
  function levelOf(n) {
    var lv = 0;
    for (var i = 0; i < LEVEL_AT.length; i++) if (n >= LEVEL_AT[i]) lv = i + 1;
    return lv;
  }
  function level(id) { return levelOf(counts()[id] || 0); }
  function bonus(id) { var lv = level(id); return lv > 0 ? BONUS[lv - 1] : null; }
  function nextNeed(id) {                       // 다음 레벨까지 남은 분양 횟수 (만렙이면 0)
    var n = counts()[id] || 0, lv = levelOf(n);
    return lv >= LEVEL_AT.length ? 0 : LEVEL_AT[lv] - n;
  }
  function line(id) {                           // 한 줄 설명 (도감용)
    var lv = level(id);
    if (lv < 1) return '';
    var need = nextNeed(id);
    return '💗 친밀도 Lv.' + lv + (need === 0 ? ' MAX' : '') + ' · CF 보너스 +' + BONUS[lv - 1] + '%p' + (need ? ' · 다음 Lv까지 ' + need + '회' : '');
  }

  // ════════ 분양 성공 화면에 친밀도 표시 ════════
  // kennel.js는 분양에 성공하면 'ph-kennel-got' 이벤트를 보낸다. (횟수는 이미 올라간 뒤)
  window.addEventListener('ph-kennel-got', function (e) {
    try {
      var id = e && e.detail && e.detail.id; if (!id) return;
      var n = counts()[id] || 0, now = levelOf(n), before = levelOf(n - 1);
      var box = document.getElementById('kn-close'), ok = document.getElementById('kn-ok');
      if (!box || !ok || box.querySelector('[data-bond]')) return;
      var d = document.createElement('div');
      d.setAttribute('data-bond', '1');
      d.className = 't';
      var up = now > before;
      d.style.cssText = 'font-size:' + (up ? 16 : 13) + 'px;font-weight:' + (up ? 900 : 700) + ';color:' + (up ? '#ffd54a' : '#9fe3c5') + ';text-align:center;line-height:1.5;';
      d.textContent = up ? '💗 친밀도 Lv.' + now + ' 달성! CF 보너스 +' + BONUS[now - 1] + '%p' : line(id);
      ok.parentNode.insertBefore(d, ok);
    } catch (err) {}
  });

  // ════════ 분양 도감에 친밀도 표시 ════════
  var tries = 0;
  function attachDex() {
    var btn = document.getElementById('kn-b-dex');
    if (!btn || !window.__kennel || !window.__kennel.ANIMALS) {
      if (++tries > 200) return;                // 약 20초 기다려도 없으면 포기
      setTimeout(attachDex, 100);
      return;
    }
    if (window.__kennelBondDexApplied) return;
    window.__kennelBondDexApplied = true;
    // kennel.js가 도감을 그린 "다음에" 실행됨 (같은 버튼에 나중에 붙인 리스너라서)
    btn.addEventListener('click', function () {
      try {
        var rows = document.querySelectorAll('#kn-dex .kn-row');
        window.__kennel.ANIMALS.forEach(function (a, i) {
          var row = rows[i], txt = line(a.id);
          if (!row || !txt) return;
          var holder = row.querySelector('.i');
          if (!holder || holder.querySelector('[data-bond]')) return;
          var s = document.createElement('small');
          s.setAttribute('data-bond', '1');
          s.style.color = '#9fe3c5';
          s.textContent = txt;
          holder.appendChild(s);
        });
      } catch (err) {}
    });
  }
  attachDex();

  window.__kennelBond = { level: level, bonus: bonus, nextNeed: nextNeed, line: line, LEVEL_AT: LEVEL_AT, BONUS: BONUS, MAX: LEVEL_AT.length };
})();
