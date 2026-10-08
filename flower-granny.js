// ════════════════════════════════
// 💐 꽃집 할머니 (flower-granny.js)
// - 팬덤 원정 맵(방송국 앞 · 팬미팅장 · 공연장)에 가끔 동네 꽃집 할머니가 나타난다.
// - 할머니를 눌러서 고마움을 전하면, 만족한 할머니가 '데이트 티켓'을 준다. (확률 DROP_CHANCE)
// - 데이트 티켓은 인연 화면(설렘 버튼)에서 멤버에게 선물한다. 하루에 멤버당 1개. (romance.js 가 처리)
// - 숫자를 바꾸고 싶으면 아래 "설정"만 고치면 됨. 할머니 그림은 repo 맨 위 폴더에 npc-flower-granny.png 로 올리면 자동 적용 (없으면 👵)
// ════════════════════════════════
(function () {
  'use strict';
  if (window.__flowerGrannyApplied) return; window.__flowerGrannyApplied = true;

  // ════════ 설정 ════════
  var TICKET_NAME = '데이트 티켓', TICKET_EMOJI = '🎟️';
  var DROP_CHANCE = 0.30;       // 고마움을 전했을 때 티켓이 나올 확률
  var TICK_MS = 15000;          // 이 간격마다 할머니가 나올지 확인
  var APPEAR_CHANCE = 0.40;     // 확인할 때마다 나올 확률 (평균 40초에 한 번쯤)
  var STAY_SEC = 35;            // 나타나 있는 시간
  var IMG = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/npc-flower-granny.png';

  function face(sz) {
    return '<div style="width:' + sz + 'px;height:' + sz + 'px;margin:0 auto;border-radius:50%;background:#fff0f6;border:3px solid #FF9EC4;display:flex;align-items:center;justify-content:center;font-size:' + Math.round(sz * 0.52) + 'px;overflow:hidden;">' +
      '<img src="' + IMG + '" alt="" style="width:100%;height:100%;object-fit:cover;object-position:50% 30%;" onerror="var p=this.parentNode;if(p)p.textContent=\'👵\'"></div>';
  }
  var cur = null;               // 지금 떠 있는 할머니 {el, timer}
  function $(id) { return document.getElementById(id); }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }

  function inExpedition() { return !!($('bc-layer') && $('bc-player')); }
  function busy() { return !!($('bc-panel') || $('fg-ov') || $('special-overlay')); }

  function remove() {
    if (!cur) return;
    try { clearTimeout(cur.timer); } catch (e) {}
    try { if (cur.el && cur.el.parentNode) cur.el.parentNode.removeChild(cur.el); } catch (e) {}
    cur = null;
  }

  function spawn() {
    var layer = $('bc-layer'); if (!layer) return;
    var x = 0.16 + Math.random() * 0.68, y = 0.30 + Math.random() * 0.48;
    var el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:' + (x * 100) + '%;top:' + (y * 100) + '%;transform:translate(-50%,-50%);z-index:11;text-align:center;cursor:pointer;animation:bcPulse 1.2s ease-in-out infinite;';
    el.innerHTML = '<div style="box-shadow:0 0 18px #FF9EC4;border-radius:50%;">' + face(54) + '</div>' +
      '<div style="margin-top:2px;font-size:11px;font-weight:900;color:#fff;text-shadow:0 1px 4px #000;">꽃집 할머니</div>';
    ['pointerdown', 'touchstart', 'mousedown'].forEach(function (t) { el.addEventListener(t, function (e) { e.stopPropagation(); }); });
    el.addEventListener('click', function (e) { e.stopPropagation(); talk(); });
    layer.appendChild(el);
    cur = { el: el, timer: setTimeout(remove, STAY_SEC * 1000) };
    toast('💐 꽃집 할머니가 어디선가 두리번거리고 있어요');
  }

  function dlg(html) {
    var old = $('fg-ov'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'fg-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:18px;font-family:"Noto Sans KR",sans-serif;';
    ov.innerHTML = '<div style="width:100%;max-width:340px;background:#2a1330;border:2px solid #FF9EC4;border-radius:18px;padding:18px;color:#fff;text-align:center;">' + html + '</div>';
    ['pointerdown', 'touchstart', 'mousedown'].forEach(function (t) { ov.addEventListener(t, function (e) { e.stopPropagation(); }); });
    document.body.appendChild(ov);
    return ov;
  }
  function closeDlg() { var o = $('fg-ov'); if (o) o.remove(); }

  var BTN = 'display:block;width:100%;margin-top:8px;padding:12px;border:1px solid #FF6B9D66;border-radius:12px;background:rgba(255,255,255,.1);color:#fff;font-size:14px;font-family:inherit;';
  function talk() {
    if (!cur) return;
    remove();
    var ov = dlg(
      face(64) +
      '<div style="font-size:12px;color:#FF9EC4;font-weight:700;margin:4px 0 8px;">꽃집 할머니</div>' +
      '<div style="font-size:14px;line-height:1.7;min-height:64px;">아이고, 우리 아이돌 왔구나.<br>저 애들 둘이 좀 더 가까워지게 내가 몰래 도와주고 싶은데… 말 안 해도 알지?</div>' +
      '<button data-i="0" style="' + BTN + '">🙇 늘 감사합니다, 할머니</button>' +
      '<button data-i="1" style="' + BTN + '">💐 꽃 향기가 참 좋아요</button>' +
      '<button data-i="2" style="' + BTN + '">🤫 비밀은 지킬게요</button>');
    var LINES = [
      '허허, 예의 바른 것 좀 봐. 내 마음이 다 놓이는구나.',
      '꽃은 말이다, 마음을 대신 전해 주는 거란다. 알아봐 주니 고맙네.',
      '그래그래, 그 비밀은 우리 둘만 아는 거다.'
    ];
    Array.prototype.forEach.call(ov.querySelectorAll('button'), function (b) {
      b.onclick = function () {
        var i = +b.getAttribute('data-i'), got = Math.random() < DROP_CHANCE, added = false;
        if (got) { try { added = !!addToBag(TICKET_EMOJI, TICKET_NAME, 'item', 1, '인연 화면에서 멤버에게 선물하면 설렘 이벤트가 하나씩 열려요 (멤버당 하루 1개)'); } catch (e) {} }
        var tail = got
          ? (added ? '<div style="margin-top:12px;font-size:15px;font-weight:900;color:#ffe08a;">' + TICKET_EMOJI + ' ' + TICKET_NAME + ' +1</div><div style="font-size:12px;color:#ddd;margin-top:4px;">"이걸 그 아이한테 슬쩍 쥐여줘 보렴. 하루에 한 번만이야, 급하면 체해."</div>'
                       : '<div style="margin-top:12px;font-size:12px;color:#ff9a9a;">가방이 꽉 차서 티켓을 못 받았어요… 슬롯을 비우고 다시 만나요</div>')
          : '<div style="margin-top:12px;font-size:12px;color:#ddd;">"오늘은 줄 게 없구나. 다음에 또 오렴."</div>';
        ov.firstChild.innerHTML = '<div style="font-size:34px;">👵</div><div style="font-size:12px;color:#FF9EC4;font-weight:700;margin:4px 0 8px;">꽃집 할머니</div>' +
          '<div style="font-size:14px;line-height:1.7;">' + LINES[i] + '</div>' + tail +
          '<button id="fg-ok" style="' + BTN + 'background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;font-weight:700;">확인</button>';
        ov.querySelector('#fg-ok').onclick = closeDlg;
      };
    });
  }

  setInterval(function () {
    try {
      if (cur && !(cur.el && cur.el.isConnected)) remove();       // 원정이 끝나서 맵이 사라졌으면 정리
      if (!inExpedition()) return;
      if (cur || busy()) return;
      if (Math.random() < APPEAR_CHANCE) spawn();
    } catch (e) { console.error('[flower-granny]', e); }
  }, TICK_MS);
})();
