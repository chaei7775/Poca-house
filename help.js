// ════════════════════════════════
// ❓ 콘텐츠 도움말 (help.js)
// 콘텐츠 화면이 열려 있으면 오른쪽 위에 동그란 ? 버튼이 뜨고, 누르면 그 콘텐츠 설명이 팝업으로 나온다.
// - 아직 안 읽은 도움말은 ? 버튼이 반짝인다 (한 번 열어보면 멈춤)
// - 문구를 고치려면 아래 TOPICS 만 보면 됨. 새 콘텐츠를 넣으려면 한 덩어리를 추가:
//     { id: '이름', sel: '#화면요소id', title: '제목', lines: ['설명1', '설명2', ...] }
//   (sel 은 그 화면이 열려 있을 때만 존재하는/보이는 요소. 목록 앞쪽일수록 우선 — 겹쳐 열리면 위쪽 화면 도움말을 보여줌)
// 되돌리려면 loader.js 에서 이 파일 줄만 지우면 됨.
// 저장: localStorage 'ph_help_seen' (읽음 표시)
// ════════════════════════════════
(function () {
  'use strict';
  if (window.__phHelp) return; window.__phHelp = true;

  var SEEN_KEY = 'ph_help_seen';
  var TOPICS = [
    { id: 'skillset', sel: '#fs-editor', title: '⚔️ 스킬 장착 · 세트',
      lines: [
        '멤버마다 스킬을 5칸까지 장착해요. 그 멤버가 배운 스킬만 끼울 수 있어요 (더보기 → 팬 스킬 상점에서 배워요).',
        '빈 칸을 누르고 → 아래 스킬을 고르면 장착돼요. 장착된 칸을 누르면 해제돼요.',
        '세트 1·2·3번: 장착을 바꾸면 쓰던 세트에 자동으로 저장돼요. 번호를 누르면 그 세트로 한 번에 바뀌어요.',
        '장착한 스킬은 모든 팬덤 원정 맵에서 똑같이 쓰여요.'
      ] },
    { id: 'cf', sel: '#cf-setup-overlay, #cf-overlay', title: '🎬 CF 촬영',
      lines: [
        '매일 CF 의뢰서가 3장 들어와요. 의뢰서마다 최소 등급 · 성공률 · 보상이 달라요.',
        '출연은 데뷔한 아이돌만 할 수 있고, 하루에 한 번씩만 촬영해요.',
        '촬영 소품(숲·해변·공원 재료)을 걸면 성공률이 올라요. 소품은 쓰면 사라져요.',
        '분양받은 동물을 게스트로 함께 출연시키면 성공률과 보상이 늘어요. 동물과의 친밀도가 높을수록 더 좋아요 (동물은 사라지지 않아요).',
        '성공하면 CF 포스터가 보관함에 저장되고, 팬카페에 반응이 와요.'
      ] },
    { id: 'kennel', sel: '#kn-root', title: '🐾 분양소 · 동물 친밀도',
      lines: [
        '마당을 눌러 먹이를 놓으면 동물이 다가와요. 맞는 먹이면 클로즈업 화면에서 타이밍을 맞춰 분양받아요 (틀린 먹이면 가버려요).',
        '먹이는 분양소 가게에서 코인으로 사요. 강아지는 육포, 고양이는 멸치, 아기돼지는 고구마, 새는 곡식을 좋아해요.',
        '같은 동물을 또 분양받으면 친밀도가 올라요. 1·3·6·10·15번째 분양에 Lv.1~5가 돼요.',
        '친밀도가 오를수록 CF 촬영의 게스트 보너스(성공 확률)가 커져요. Lv.1은 +10%p, Lv.5는 +20%p예요.',
        '🐾 분양 도감에서 동물마다 친밀도와 다음 레벨까지 남은 횟수를 볼 수 있어요.'
      ] },
    { id: 'drama', sel: '#dr-root', title: '🎥 드라마 촬영',
      lines: [
        '데뷔한 아이돌 카드로 대본과 감독을 골라 촬영해요. 촬영 중 스킬을 눌러 타이밍을 맞추면 시청률이 올라가요.',
        '끝나면 출연료(코인) · 소원의 조각 · 새 스킬이 나와요. 무료 촬영은 하루 3번이고, 더 하려면 체력 음료(소 1,000만 / 대 2,800만)가 필요해요.',
        '대본·감독은 책 모양 버튼을 눌러 팝업에서 골라요. 페이지를 탭하면 다음 장으로 넘어가요. 2인·3인 대본은 상대역이 랜덤으로 정해지고 출연료가 +20%(3인은 +30%) 올라요.',
        '히든 카드로 찍어야 인지도가 올라요 (일반·레어 카드는 안 올라요). 인지도는 하루 첫 3번 촬영만 올라서, 체력 음료로 더 찍어도 안 올라요. 인지도 400이 차면 탑스타로 승급해요!',
        '탑스타가 되면 기획사 수익 ×2 · 출연료 ×1.5 · 그 아이돌 카드의 스킬 슬롯 +1을 받아요.',
        '스킬 세트 1·2·3번을 만들어 두면 대본마다 스킬을 한 번에 갈아끼울 수 있어요.'
      ] },
    { id: 'expedition', sel: '#bc-view', title: '🌟 팬덤 원정',
      lines: [
        '맵 위의 ❗ 이벤트까지 걸어가면 미니게임이 시작돼요. 이벤트 한 번마다 스태미나가 들어요.',
        '이벤트 가까이 가서 아래 스킬 버튼(⚙️에서 장착)을 누르면 미니게임 없이 바로 결과가 나오고 HP도 덜 깎여요.',
        'HP가 0이 되면 이번 원정에서 얻은 보상을 모두 잃고 쫓겨나요. 회복약을 챙겨 가요.',
        '🌟 황금 셔터와 🚨 특별 NPC는 보상이 커요. 제한시간 안에 가야 해요!',
        '가끔 나타나는 💐 꽃집 할머니에게 고마움을 전하면 데이트 티켓을 줘요. 티켓은 인연 화면에서 멤버에게 선물해요.',
        '프리미엄 조각 100개를 모으면 프리미엄 카드를 얻어요.'
      ] },
    { id: 'agency', sel: '#agency-overlay', title: '🎤 기획사',
      lines: [
        '카드를 뽑아 연습생이 된 멤버는 여기서 데뷔에 도전해요 (재료와 코인이 들어요).',
        '데뷔하면 시간이 지날수록 수익이 쌓여요. 기본 8시간치까지 쌓이고, 정산하기를 눌러 받아요.',
        '히든 카드를 강화·초월하거나 드라마에서 탑스타가 되면 수익이 늘어요 (탑스타는 ×2).',
        '📅 스케줄·식사에서 일정을 잡고 식사를 챙기면 컨디션이 올라 정산 수익이 커져요.',
        '매니저 카드: 신입 매니저는 데뷔 확률을, 배우·탑스타 매니저는 출연료와 수익 한도를 올려줘요.'
      ] },
    { id: 'fancafe', sel: '#fancafe-overlay', title: '☕ 팬카페',
      lines: [
        '데뷔한 아이돌마다 팬카페가 열려요. 처음엔 회원이 나 혼자예요.',
        '대표 팬 10명이 하나둘 가입해요. 팬마다 말투와 좋아하는 답글 톤(다정 / 장난 / 담백)이 달라요.',
        '팬들은 3시간마다 글을 써요. 접속하지 않은 동안 쌓인 글은 열 때 한꺼번에 보여요 (최대 48시간치).',
        '♥를 누르고 답글 톤을 골라요. 팬이 좋아하는 톤이면 애착도가 더 크게 올라요.',
        '애착도가 낮은 팬은 "탈덕 고민" 글을 올려요. 48시간 안에 붙잡지 못하면 떠나요.',
        'CF가 성공하면 반응이 오고, 가끔 바이럴로 회원이 폭증해요. 팬과 아주 친해지면 팬 포카를 받아요.'
      ] },
    { id: 'invest', sel: '#invest-overlay', title: '💼 포카 인베스트',
      lines: [
        '코인을 넣고 게임 속 7일 동안 키우는 보조 콘텐츠예요. 하루는 📅 스케줄·식사의 "하루 보내기"로 넘어가요.',
        '하루가 갈 때마다 가치가 움직이고, 내가 한 활동(드라마·CF·팬·공연장 등)이 보너스로 더해져요.',
        '사건 카드가 오면 선택지를 골라요. 안 고르면 첫 번째가 자동으로 선택돼요.',
        '언제든 팔 수 있어요 (중간에 팔면 -10%). 7일 만기에 정산하면 페널티가 없고, 잘되면 특별 배당이 나와요.',
        '📰 정보 카드의 소문·악재를 보고 투자처를 골라요. 망해도 원금 전액 손실은 없어요.'
      ] },
    { id: 'enhance', sel: '#enhance-overlay', title: '⚒️ 히든카드 강화 · 초월',
      lines: [
        '강화는 히든 카드만 할 수 있어요. 한 회차에 +1~+10강이고, 강화석과 코인이 들어요.',
        '+5강까지는 실패해도 카드가 사라지지 않아요. +6강부터는 방지권 없이 실패하면 카드가 사라져요!',
        '방지권을 쓰고 실패하면 방지권만 사라지고 카드는 그대로예요.',
        '+10강이 되면 초월할 수 있어요 (초월석 + 같은 멤버의 여분 SSR/UR 카드 + 코인). 초월하면 +0부터 다시 올리지만 쌓은 수익 보너스는 남아요. 최대 3단계예요.',
        '강화·초월하면 그 멤버의 기획사 수익이 올라가요.'
      ] }
  ];

  function seen() { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function markSeen(id) { var s = seen(); s[id] = 1; try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch (e) {} }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function visible(el) { return !!el && el.offsetWidth > 0 && el.offsetHeight > 0; }

  function currentTopic() {
    for (var i = 0; i < TOPICS.length; i++) {
      var els = document.querySelectorAll(TOPICS[i].sel);
      for (var j = 0; j < els.length; j++) if (visible(els[j])) return TOPICS[i];
    }
    return null;
  }

  function injectStyle() {
    if (document.getElementById('ph-help-style')) return;
    var st = document.createElement('style'); st.id = 'ph-help-style';
    st.textContent = '@keyframes phHelpGlow{0%,100%{box-shadow:0 0 0 0 rgba(255,215,0,.0)}50%{box-shadow:0 0 12px 4px rgba(255,215,0,.85)}}';
    document.head.appendChild(st);
  }

  var btn = null, shown = null;
  function ensureBtn() {
    if (btn && btn.isConnected) return btn;
    injectStyle();
    btn = document.createElement('button'); btn.id = 'ph-help-btn';
    btn.textContent = '?';
    btn.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 56px);right:10px;z-index:99990;width:34px;height:34px;border-radius:50%;border:2px solid #FFD700;background:rgba(30,20,50,.88);color:#FFD700;font-size:18px;font-weight:900;font-family:inherit;line-height:1;cursor:pointer;display:none;padding:0;';
    btn.style.touchAction = 'none';
    var pos = null; try { pos = JSON.parse(localStorage.getItem('ph_help_pos') || 'null'); } catch (e) {}
    function place(x, y) {       // 화면 안으로 가둬서 놓는다
      x = Math.max(4, Math.min(window.innerWidth - 38, x)); y = Math.max(4, Math.min(window.innerHeight - 38, y));
      btn.style.left = x + 'px'; btn.style.top = y + 'px'; btn.style.right = 'auto'; return { x: x, y: y };
    }
    if (pos && isFinite(pos.x) && isFinite(pos.y)) place(pos.x, pos.y);
    // 누르면 도움말, 꾹 눌러 끌면 ? 버튼을 원하는 곳으로 옮길 수 있다 (다른 버튼과 겹칠 때)
    var drag = null, justDragged = false;
    btn.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      var r = btn.getBoundingClientRect();
      drag = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
      try { btn.setPointerCapture(e.pointerId); } catch (x) {}
    });
    btn.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 8) return;
      drag.moved = true; place(drag.ox + dx, drag.oy + dy);
    });
    btn.addEventListener('pointerup', function (e) {
      e.stopPropagation();
      if (!drag) return;
      if (drag.moved) { justDragged = true; setTimeout(function () { justDragged = false; }, 400); var r = btn.getBoundingClientRect(); try { localStorage.setItem('ph_help_pos', JSON.stringify({ x: r.left, y: r.top })); } catch (x) {} }
      drag = null;
    });
    btn.addEventListener('pointercancel', function () { drag = null; });
    btn.addEventListener('click', function (e) {       // 열기는 click 으로 (손가락 뗄 때 pointerup 이 안 와도 열리게)
      e.stopPropagation();
      if (justDragged) { justDragged = false; return; }
      if (shown) openHelp(shown);
    });
    ['touchstart', 'mousedown'].forEach(function (t) { btn.addEventListener(t, function (e) { e.stopPropagation(); }); });
    document.body.appendChild(btn);
    return btn;
  }

  function openHelp(tp) {
    var old = document.getElementById('ph-help-ov'); if (old) old.remove();
    markSeen(tp.id);
    var ov = document.createElement('div'); ov.id = 'ph-help-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99995;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Noto Sans KR",sans-serif;';
    ['pointerdown', 'touchstart', 'mousedown'].forEach(function (t) { ov.addEventListener(t, function (e) { e.stopPropagation(); }); });
    ov.innerHTML = '<div style="width:100%;max-width:360px;max-height:86vh;overflow-y:auto;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FFD700;border-radius:20px;padding:18px 16px;color:#fff;">' +
      '<div style="font-size:17px;font-weight:900;text-align:center;margin-bottom:12px;">' + esc(tp.title) + ' 도움말</div>' +
      tp.lines.map(function (l) { return '<div style="display:flex;gap:8px;margin-bottom:9px;font-size:13px;line-height:1.6;color:#eee;"><span style="color:#FFD700;flex:none;">•</span><span>' + esc(l) + '</span></div>'; }).join('') +
      '<button id="ph-help-ok" style="width:100%;margin-top:8px;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit;">알겠어요</button></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    ov.querySelector('#ph-help-ok').onclick = function () { ov.remove(); };
    if (btn) btn.style.animation = '';
  }

  setInterval(function () {
    try {
      if (!document.body) return;
      var tp = currentTopic();
      if (!tp) { if (btn) btn.style.display = 'none'; shown = null; return; }
      var b = ensureBtn();
      shown = tp;
      b.style.display = 'block';
      b.style.animation = seen()[tp.id] ? '' : 'phHelpGlow 1.2s ease-in-out infinite';
    } catch (e) { console.error('[help]', e); }
  }, 600);

  window.__phHelp = { open: function (id) { var t = TOPICS.filter(function (x) { return x.id === id; })[0]; if (t) openHelp(t); }, topics: TOPICS };
})();
