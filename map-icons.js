// ════════════════════════════════
// 🗺️ 지도·장소 이모지 → 이미지 교체 (map-icons.js)
// 포카마을 지도 핀 / 장소 안 버튼 / 특별탐험·팬덤원정 목록의 맨 앞 이모지를 이미지로 바꾼다.
//  · 이미지 이름: pin-<이름>.png  (아래 ICONS 표 참고). 파일이 없으면 이모지가 그대로 남는다 → 한 장씩 추가해도 안전
//  · 글자(라벨)로 찾기 때문에 index.html 은 건드리지 않음
// ════════════════════════════════
(function () {
  'use strict';
  var ICONS = [
    // 포카마을 지도 핀 / 장소 이름
    ['연성고등학교', 'school'], ['뷰티 살롱', 'beauty'], ['촬영 세트장', 'set'], ['상점거리', 'shop'], ['연습생 숙소촌', 'housing'],
    ['신비의 섬', 'mystery'], ['카페거리', 'cafestreet'], ['중앙광장', 'square'], ['워크숍 캠프', 'camp'], ['내 집', 'home'], ['꽃길공원', 'park'], ['포카버거', 'burger'],
    // 장소 안 버튼
    ['카페 알바', 'cafealba'], ['이벤트 알바', 'eventalba'], ['알바하기', 'burgeralba'],
    ['윤아 만나기', 'yuna'], ['민준 만나기', 'minjun'], ['시온 만나기', 'sion'], ['도윤 만나기', 'doyun'], ['하린 만나기', 'harin'], ['아라 만나기', 'ara'],
    ['도서관', 'library'], ['음악실', 'musicroom'], ['학생회실', 'council'], ['옥상', 'rooftop'], ['기술학원', 'academy'],
    ['촬영장 가기', 'shoot'], ['낚시하기', 'fishing'], ['스타일링', 'styling'], ['연습실', 'practice'],
    ['팬클럽 의뢰소', 'fanclub'], ['기획사', 'agency'], ['음원차트', 'chart'], ['방 꾸미기', 'deco'], ['잡화점', 'giftshop'], ['가구샵', 'furniture'],
    // 특별탐험 · 팬덤원정
    ['등교시키기', 'schoolgames'], ['굿즈 공방', 'goodsworks'], ['작곡 스튜디오', 'studioexp'], ['작곡 테이블', 'compose'], ['소원의 샘', 'spring'],
    ['CF 촬영', 'cf'], ['드라마 촬영', 'drama'], ['공항 입국장', 'airport'], ['VIP 게이트', 'vipgate'], ['팬카페', 'fancafe'], ['분양소', 'kennel'], ['공연장', 'concert'],
    ['특별 탐험', 'special'], ['팬덤 원정', 'fandom'], ['방송국 앞', 'broadcast'], ['팬미팅장', 'fanmeeting'], ['콘서트', 'concert'],
    ['천공성 유적', 'skyruins'], ['달빛 회랑', 'moonlit'], ['공방 지하', 'workshop']
  ].sort(function (a, b) { return b[0].length - a[0].length; });
  var ROOTS = '#screen-map,#place-overlay,#stamina-floating';
  var EMO = /^(\s*)((?:\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*))\s*([^\s].*)$/u;
  var ONLY = /^\s*(?:\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)\s*$/u;
  // 글자 중간에 끼어 있는 작은 이모지 → 이미지 (파일이 없으면 이모지 그대로)
  var INLINE = { '⚡': 'vip-bolt.png', '🧩': 'mat-wishpiece.png', '🖼️': 'mat-premiumpiece.png', '🖼': 'mat-premiumpiece.png' };
  var INLINE_RE = /(🖼️|🖼|⚡|🧩)/;
  var fileOk = {}, fileWait = {};
  function probeFile(f) {
    if (fileWait[f]) return; fileWait[f] = true;
    var im = new Image(); im.onload = function () { fileOk[f] = true; schedule(); }; im.src = f;
  }
  function inline(t) {
    var v = t.nodeValue; if (!v || !INLINE_RE.test(v)) return;
    var parts = v.split(INLINE_RE), p = t.parentNode, did = false;
    var frag = document.createDocumentFragment();
    parts.forEach(function (part) {
      var f = INLINE[part];
      if (f && fileOk[f]) {
        var img = document.createElement('img'); img.src = f; img.alt = ''; img.setAttribute('data-pin', 'inline');
        img.style.cssText = 'width:1.2em;height:1.2em;object-fit:contain;vertical-align:-0.25em;pointer-events:none;';
        frag.appendChild(img); did = true;
      } else { if (f) probeFile(f); if (part) frag.appendChild(document.createTextNode(part)); }
    });
    if (did) p.replaceChild(frag, t);
  }
  var ok = {}, bad = {}, waiting = {}, queued = false;

  function keyOf(text) { for (var i = 0; i < ICONS.length; i++) if (text.indexOf(ICONS[i][0]) !== -1) return ICONS[i][1]; return null; }
  function probe(key) {
    if (waiting[key]) return; waiting[key] = true;
    var im = new Image();
    im.onload = function () { ok[key] = true; schedule(); };
    im.onerror = function () { bad[key] = true; };
    im.src = 'pin-' + key + '.png';
  }
  function scan() {
    queued = false;
    var roots = document.querySelectorAll(ROOTS);
    Array.prototype.forEach.call(roots, function (root) {
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [], n;
      while ((n = w.nextNode())) nodes.push(n);
      nodes.forEach(function (t) {
        var p = t.parentNode; if (!p || /^(SCRIPT|STYLE)$/.test(p.nodeName)) return;
        var only = ONLY.exec(t.nodeValue), m = only ? null : EMO.exec(t.nodeValue), key, rest;
        if (m) { key = keyOf(m[3]); rest = m[3]; }
        else {   // 이모지만 따로 든 칸(팬덤 원정 목록 등): 옆 칸 글자로 찾는다
          if (!only) { inline(t); return; }
          if (p.textContent.trim() !== t.nodeValue.trim()) { inline(t); return; }   // 이모지만 따로 든 칸일 때만
          var host = p.nextElementSibling; if (!host) { inline(t); return; }
          key = keyOf((host.textContent || '').slice(0, 24)); rest = '';
          if (!key) { inline(t); return; }
        }
        if (!key || bad[key]) { inline(t); return; }
        if (!ok[key]) { probe(key); return; }
        var img = document.createElement('img');
        img.src = 'pin-' + key + '.png'; img.alt = ''; img.setAttribute('data-pin', key);
        img.style.cssText = 'width:1.45em;height:1.45em;object-fit:contain;vertical-align:-0.35em;margin-right:4px;pointer-events:none;';
        p.insertBefore(img, t);
        if (m) t.nodeValue = m[3]; else { img.style.marginRight = '0'; p.removeChild(t); }
      });
    });
  }
  function schedule() { if (queued) return; queued = true; Promise.resolve().then(scan); }

  // 포카마을 지도 위의 장소 이름표: 검은 바탕 + 금색 글씨
  (function pinStyle() {
    if (document.getElementById('mi-pin-style')) return;
    var st = document.createElement('style'); st.id = 'mi-pin-style';
    st.textContent = '#screen-map button[style*="absolute"]{background:rgba(12,10,8,.92) !important;border:1.5px solid #D4AF37 !important;color:#FFD966 !important;box-shadow:0 2px 10px rgba(0,0,0,.6) !important;text-shadow:none !important;}';
    (document.head || document.documentElement).appendChild(st);
  })();

  function attach() {
    Array.prototype.forEach.call(document.querySelectorAll(ROOTS), function (r) {
      if (r.getAttribute('data-mi-obs')) return;
      r.setAttribute('data-mi-obs', '1');
      try { new MutationObserver(schedule).observe(r, { childList: true, subtree: true, characterData: true }); } catch (e) {}
    });
    schedule();
  }
  function start() {
    if (!document.body) { setTimeout(start, 50); return; }
    attach();
    setInterval(attach, 1500);   // 나중에 생기는 칸(스태미나 표시 등)도 붙잡기
  }
  window.__mapIcons = { ICONS: ICONS, scan: scan, ok: ok, bad: bad };
  start();
})();
