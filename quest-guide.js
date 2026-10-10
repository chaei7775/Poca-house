// ════════════════════════════════
// 🧭 길잡이 (튜토리얼 가이드) — game.js / index.html 건드리지 않는 별도 모듈
// 다음에 할 일 1개를 항상 보여주고 [가기] 버튼으로 바로 이동시킴.
// 홈 화면(배너 아래) + 퀘스트 화면 맨 위에 카드로 표시됨.
// 등록: loader.js 의 NEW_CONTENT_FILES 에 'quest-guide.js' (이미 있음 — 이 파일로 통째 교체)
// v2: 기획사 이후 단계(CF·팬카페·히든카드·팬덤 원정·강화·프리미엄·초월) 추가
// ════════════════════════════════
(function () {
  var KEY = 'ph_guide';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  var S = load(); // { flags:{}, rewarded:{}, off:false }
  S.flags = S.flags || {};
  S.rewarded = S.rewarded || {};

  function flag(name) { if (!S.flags[name]) { S.flags[name] = 1; save(S); } }
  function newAcct() { try { return localStorage.getItem('ph_starter_v1') === '1'; } catch (e) { return false; } }   // 새 계정이면 레벨 shortcut 없이 진짜로 해야 단계 완료
  function story(id) { try { return typeof storyProgress !== 'undefined' && storyProgress[id] === 'done'; } catch (e) { return false; } }
  function quest(id) { try { return typeof questProgress !== 'undefined' && questProgress[id] === 'done'; } catch (e) { return false; } }
  function hiLv() { try { return typeof getHighestCardLevel === 'function' ? getHighestCardLevel() : 1; } catch (e) { return 1; } }
  function J(key, def) {
    try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return (v === null || v === undefined) ? def : v; } catch (e) { return def; }
  }
  function keys(o) { try { return Object.keys(o || {}); } catch (e) { return []; } }

  // ── 진행 상황 읽기 (각 기능 파일이 저장해 둔 값을 직접 읽음) ──
  function debutCount() {
    var d = (J('ph_agency', {}) || {}).done || {};
    return keys(d).filter(function (k) { return d[k] && ['minjun','sion','doyun','harin','yuna','ara'].indexOf(k) >= 0; }).length;
  }
  function lessonN(d) { var n = 0; if (d && d.count) keys(d.count).forEach(function (k) { n += d.count[k] || 0; }); return n; }
  function sionDebut() { var d = (J('ph_agency', {}) || {}); return !!((d.done && d.done.sion) || (d.debut && d.debut.sion)); }
  function cfDone() {
    var c = J('ph_cf', {}) || {};
    return (c.posters && c.posters.length > 0) || keys(c.charDone).length > 0;
  }
  function fancafeOpened() { return keys((J('ph_fancafe', {}) || {}).idols).length > 0; }
  function hiddenCount() { try { return typeof ownedHiddenCards !== 'undefined' ? ownedHiddenCards.length : 0; } catch (e) { return 0; } }
  function enhLevels() { return (J('ph_enhance', {}) || {}).level || {}; }
  function enhStages() { return (J('ph_enhance', {}) || {}).stage || {}; }
  function anyEnhanced() { var l = enhLevels(); return keys(l).some(function (k) { return l[k] > 0; }); }
  function anyTranscended() { var s = enhStages(); return keys(s).some(function (k) { return s[k] > 0; }); }
  function premiumOwned() {
    var d = J('ph_premiumCards', {}) || {};
    return keys(d).filter(function (k) { return d[k] && d[k].lv >= 1; }).length;
  }
  function goodsCrafted() { return !!(J('ph_goods_flags', {}) || {}).crafted; }
  function premEquipped() {
    var d = J('ph_premiumEquip', {}) || {};
    return keys(d).some(function (h) { return Array.isArray(d[h]) && d[h].some(Boolean); });
  }
  function q3(n) { return !!(J('ph_quest3', {}) || {})[n]; }          // quest-concert.js 가 기록
  function labEnhanced() {
    var e = J('ph_engrave', {}) || {};
    return keys(e).some(function (id) { return e[id] && (e[id].slots || []).some(function (x) { return x && x.lv >= 1; }); });
  }
  function goodsFlagG(n) { return !!(J('ph_goods_flags', {}) || {})[n]; }
  function hasGift() {   // 가방/인벤토리에 줄 수 있는 선물이 있는지 (game.js showGiftMenu 와 같은 기준)
    try { if (bagItems.some(function (i) { return i && i.type === 'gift' && (i.qty == null || i.qty > 0); })) return true; } catch (e) {}
    try { if (Object.keys(inventory || {}).some(function (k) { return inventory[k] > 0; })) return true; } catch (e) {}
    return false;
  }
  function fishInBag() {   // 낚시로 잡은 물고기가 가방에 있으면 낚시를 해본 것 (story-quest.js 와 같은 기준)
    try { return bagItems.some(function (i) { return i && i.desc && String(i.desc).indexOf('낚시로 잡은 물고기') !== -1; }); } catch (e) { return false; }
  }
  function hiddenTried() {   // 히든카드 재조합 시도: 실패하면 천장 카운터(ph_rc_pity)가 오르고, 성공하면 히든카드가 생김
    try { if (parseInt(localStorage.getItem('ph_rc_pity') || '0', 10) > 0) return true; } catch (e) {}
    return hiddenCount() >= 1;
  }
  function mysterySeen() { try { return localStorage.getItem('ph_mystery_seen') === '1'; } catch (e) { return false; } }

  // ── 단계 정의 (순서대로 진행) ──
  // done(): 완료 판정 / go(): [가기] 눌렀을 때 이동 / target: 홈에서 반짝일 버튼
  var REWARD_MULT = 5;
  var STEPS = [
    { id: 'alba', icon: '🍔', title: '알바로 첫 코인 벌기',
      hint: '주머니가 텅 비었어요! 선물과 뽑기에 쓸 코인부터 벌어봐요. 🍔 알바하기 → 포카버거나 카페에서 게이지가 가운데 구간에 올 때 화면을 탭!',
      done: function () { try { return albaDone > 0 || quest('tut_alba') || story('story_04'); } catch (e) { return false; } }, reward: 200,
      go: function () { goTo('alba'); }, target: '.btn-alba' },
    { id: 'gacha', icon: '✨', title: '카드 1장 뽑기',
      hint: '🎟️ 뽑기권이 있어요! ✨ 카드 뽑기에서 첫 아이돌을 만나봐요. 첫 뽑기는 좋은 카드가 나와요.',
      done: function () { try { return owned.length >= 1 || quest('tut_gacha') || story('story_05'); } catch (e) { return false; } }, reward: 100,
      go: function () { goTo('gacha'); }, target: '#nav-gacha' },
    { id: 'meet', icon: '💞', title: '아이돌 만나보기',
      hint: '아래 메뉴 💞 인연 → 뽑은 아이돌을 눌러 대화해 보세요. 선물도 줄 수 있어요.',
      done: function () { return quest('tut_meet') || story('story_06'); }, reward: 200,
      go: function () { goTo('bond'); }, target: '#nav-bond' },
    { id: 'gift', icon: '💝', title: '선물로 마음 얻기',
      hint: '💞 인연 → 아이돌을 눌러 → 💝 호감작하기! 가방의 선물을 주면 호감도가 올라요. 호감도가 오르면 이야기와 새 기능이 열려요.',
      noGiftHint: '🎁 가방에 선물이 없어요! 아래 ⋯ 더보기 → 🛍️ 잡화점에서 선물을 먼저 사요. 그다음 💞 인연 → 아이돌 → 💝 호감작하기에서 선물을 주면 호감도가 올라요.',
      done: function () { return quest('tut_gift'); }, reward: 200,
      go: function () { if (!hasGift() && typeof window.openShop === 'function') window.openShop('gift'); else goTo('bond'); },
      target: '#nav-bond', noGiftTarget: '#nav-shop' },
    { id: 'drink', icon: '🧃', title: '사과주스 마셔서 스태미나 채우기',
      hint: '🎒 가방 → 🧃 사과주스 → 사용하기. 스태미나(⚡)가 있어야 탐험을 나갈 수 있어요. 퀘스트를 깨면 주스를 계속 줘요!',
      done: function () { return quest('tut_drink'); }, reward: 200,
      go: function () { goTo('bag'); }, target: '#nav-bag' },
    { id: 'explore', icon: '🚐', title: '스케줄 나가서 재료 모으기',
      hint: '🚐 스케줄 가기 → 촬영 세트장·뷰티 살롱·공원에서 재료를 모아요. 🏕️ 워크숍 캠프에선 진짜 낚시도 할 수 있어요!',
      done: function () { return story('story_10') || !!S.flags.first_explore || (!newAcct() && hiLv() >= 3); }, reward: 300,
      go: function () { goTo('map'); }, target: '.btn-collection' },
    { id: 'school', icon: '🏫', title: '아이돌 학교 보내기',
      hint: '맵 → 🏫 연성고등학교. 학교 미니게임을 하면 아이돌(포카) 경험치가 올라요. 포카 레벨이 오르면 새 기능이 열려요!',
      done: function () { return story('story_07') || (!newAcct() && hiLv() >= 2); }, reward: 300,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'lv3', icon: '🏠', title: '포카 레벨 3 만들기',
      hint: '학교·알바·탐험으로 포카 경험치를 모아 레벨 3을 찍으면 방 꾸미기가 열려요.',
      done: function () { return hiLv() >= 3; },
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'room', icon: '🛋️', title: '내 방 꾸미기',
      hint: '🛍️ 맵 → 상점거리 → 방 테마 구매 → 🏠 내 집에서 적용! 포카 레벨 3부터 열려요.',
      done: function () { try { return typeof ownedRooms !== 'undefined' && ownedRooms.length > 0 || quest('tut_room'); } catch (e) { return false; } }, reward: 300,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'agency', icon: '🎤', title: '기획사에서 데뷔 도전하기',
      hint: '맵 → 광장 → 🎤 기획사. 촬영 세트장·뷰티 살롱·공원 재료 6개씩 + 코인 2000이 필요해요. 데뷔하면 시간마다 코인이 쌓여요!',
      done: function () { return !!S.flags.first_agency || debutCount() >= 1; }, reward: 300,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'concert', icon: '🎤', title: '첫 공연 · 선배의 무대',
      hint: '플레이어 Lv.5 이상이고 첫 데뷔를 하고 나면 탑스타 세연 선배가 무대에 초대해요! 팬 하트를 가득 채우면 🎁 7일 체험 히든카드를 선물로 줘요. 홈의 🎤 버튼을 눌러요.',
      when: function () { try { return Number(playerLevel) >= 5; } catch (e) { return false; } },
      done: function () { try { return !!localStorage.getItem('ph_trialCard'); } catch (e) { return false; } }, reward: 600,
      go: function () { if (typeof window.startConcertTutorial === 'function') window.startConcertTutorial(); else goTo('home'); }, target: '#concert-tut-btn' },
    { id: 'recombine', icon: '🔮', title: '카드 재조합 해보기',
      hint: '아래 ⋯ 더보기 → 🔮 카드 재조합기. 겹치는 카드 2장 + 재료로 더 높은 등급을 노려봐요. (재료는 탐험에서!)',
      done: function () { return !!S.flags.first_recombine; }, reward: 200,
      go: function () { if (typeof openRecombine === 'function') openRecombine(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'fishing', icon: '🎣', title: '캠프에서 낚시하기',
      hint: '맵 → 워크숍 캠프 → 낚시하기. 물고기가 다가오면 탭해서 낚싯대를 던져요. 잡은 건 재료로 쓰거나 팔 수 있어요.',
      done: function () { return !!S.flags.first_fishing || fishInBag(); }, reward: 200,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'studio', icon: '🎹', title: '작곡 스튜디오에서 재료 모으기',
      hint: '맵 → 🎹 작곡 스튜디오 탐험. 음표·악기·악보 재료가 20초 동안 튀어나와요! 이게 앨범의 재료예요.',
      done: function () { var v = false; try { v = localStorage.getItem('ph_studio_visited') === '1'; } catch (e) {} return !!S.flags.first_studio || v; }, reward: 300,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'album', icon: '💿', title: '첫 앨범 만들기',
      hint: '스튜디오 → 🎼 작곡 테이블. 재료를 조합해 곡을 만들어요. 실패해도 재료는 안 사라지고 힌트를 줘요! 만든 앨범은 팔 수 있어요.',
      done: function () { try { return Object.keys(JSON.parse(localStorage.getItem('ph_composeNote') || '{}')).length > 0; } catch (e) { return false; } }, reward: 600,
      go: function () { if (typeof openComposeTable === 'function') openComposeTable('make'); else goTo('map'); }, target: '#nav-map' },
    { id: 'mystery', icon: '🏝️', title: '신비의 섬 들어가기',
      hint: '인연에서 아무 아이돌이나 친절 Lv.3을 만들면 맵의 ✨ 신비의 섬이 열려요. 선물을 꾸준히 주면 금방 올라요!',
      done: function () { return mysterySeen() || quest('main_mystery'); }, reward: 300,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'lv10', icon: '⭐', title: '플레이어 레벨 5 달성하기',
      hint: '플레이어 레벨 5가 되면 🎤 기획사(데뷔)가 열리고, 신입 매니저가 데뷔를 도와줘요. 알바·탐험·퀘스트로 경험치를 모아요!',
      done: function () { try { return playerLevel >= 5; } catch (e) { return false; } },
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'cf', icon: '🎬', title: '데뷔한 아이돌 CF 찍기',
      hint: '맵 → 광장 → 🎬 CF 촬영. 매일 새 의뢰가 3개 올라와요. 포스터가 쌓일수록 팬카페가 들썩여요!',
      done: function () { return cfDone(); }, reward: 400,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'drama', icon: '🎥', title: '드라마 촬영 해보기',
      hint: '맵 → 광장 → 🎥 드라마 촬영. 대본·감독·아이돌 카드를 고르고 촬영! 연기 스킬이 드랍되고, 스킬 슬롯 확장권도 나와요.',
      done: function () { return (J('ph_drama', {}) || {}).shoots > 0; }, reward: 400,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'star_fame', icon: '⭐', title: '히든 카드로 촬영해서 인지도 올리기',
      hint: '인지도는 🎥 드라마 촬영에 히든 카드로 나가야 올라요 (일반·레어 카드는 안 올라요). 시청률이 높을수록 많이 오르고, 400이 되면 탑스타가 돼요!',
      when: function () { return hiddenCount() >= 1 && (J('ph_drama', {}) || {}).shoots > 0; },
      done: function () { var d = J('ph_drama', {}) || {}; return keys(d.star).some(function (k) { return d.star[k]; }) || keys(d.fame).some(function (k) { return d.fame[k] > 0; }); }, reward: 500,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'star_top', icon: '🌟', title: '탑스타로 승급시키기',
      hint: '히든 카드로 촬영해서 인지도 400을 채워요 (인지도는 하루 첫 3번 촬영만 올라요). 탑스타가 되면 🎤 기획사 수익 ×2, 출연료 ×1.5, 그 아이돌의 모든 카드 스킬 슬롯 +1!',
      when: function () { var d = J('ph_drama', {}) || {}; return keys(d.fame).some(function (k) { return d.fame[k] > 0; }) || keys(d.star).some(function (k) { return d.star[k]; }); },
      done: function () { var d = J('ph_drama', {}) || {}; return keys(d.star).some(function (k) { return d.star[k]; }); }, reward: 3000,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'mgr_top', icon: '🌟', title: '탑스타 전담 매니저 만나기',
      hint: '탑스타가 한 명이라도 나오면 🌟 탑스타 전담 매니저 차민재가 찾아와요. 맵 → 광장 → 🎤 기획사의 매니저 카드에서 만나요. 출연료가 오르고 수익이 쌓이는 한도가 늘어나요!',
      when: function () { var m = J('ph_manager', {}) || {}; var d = J('ph_drama', {}) || {}; return !!(m.topReady || m.topMet) || keys(d.star).some(function (k) { return d.star[k]; }); },
      done: function () { return !!(J('ph_manager', {}) || {}).topMet; }, reward: 1500,
      go: function () { if (window.__manager && window.__manager.showTopStory) window.__manager.showTopStory(); else if (typeof openAgency === 'function') openAgency(); else goTo('map'); }, target: '#nav-map' },
    { id: 'mgr_actor', icon: '🎭', title: '배우 전담 매니저 만나기',
      hint: '드라마 촬영을 한 번 하면 🎭 배우 전담 매니저 윤서진이 찾아와요. 맵 → 광장 → 🎤 기획사의 매니저 카드에서 만나요. 드라마 출연료가 올라가요!',
      when: function () { var m = J('ph_manager', {}) || {}; return !!(m.actReady || m.actMet); },
      done: function () { return !!(J('ph_manager', {}) || {}).actMet; }, reward: 400,
      go: function () { if (window.__manager && window.__manager.showActorStory) window.__manager.showActorStory(); else if (typeof openAgency === 'function') openAgency(); else goTo('map'); }, target: '#nav-map' },
    { id: 'mgr_road', icon: '🚗', title: '로드 매니저 박현수 만나기',
      hint: '플레이어 Lv.12부터! ⋯ 더보기 → 🚗 로드 매니저에서 계약하면, 내가 바쁠 때 대신 심부름을 다녀와 줘요. 첫 파견까지 보내봐요!',
      when: function () { try { return Number(playerLevel) >= 12; } catch (e) { return false; } },
      done: function () { var r = J('ph_roadmgr', {}) || {}; return (r.done || 0) >= 1 || !!r.job; }, reward: 500,
      go: function () { if (typeof window.openRoadManager === 'function') window.openRoadManager(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'invest', icon: '💼', title: '포카 인베스트 첫 투자',
      hint: '(Lv.20부터) 마을 지도 오른쪽 아래 <b>💼 포카 인베스트</b>! 굿즈 사업에 코인을 넣고, 스케줄에서 하루 보내기를 7번 하면 정산돼요. 사건 카드 선택으로 수익이 달라져요.',
      when: function () { try { return Number(playerLevel) >= 10; } catch (e) { return false; } },
      done: function () { try { var v = JSON.parse(localStorage.getItem('ph_invest') || 'null'); return !!(v && ((v.pos && v.pos.length) || (v.hist && v.hist.length))); } catch (e) { return false; } }, reward: 500,
      go: function () { goTo('map'); }, target: '#btn-invest-map' },
    { id: 'fancafe', icon: '☕', title: '팬카페 열어보기',
      hint: '맵 → 🏘️ 연습생 숙소촌 → ☕ 팬카페. 데뷔시킨 아이돌마다 팬카페 버튼이 생겨요. 처음엔 회원이 나 혼자뿐이에요. CF가 터지면 팬들이 하나둘 들어와요!',
      done: function () { return fancafeOpened(); }, reward: 400,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'hidden', icon: '🌟', title: '히든카드 재조합해보기',
      hint: '더보기 → 🔮 카드 재조합기에서 카드 2장을 재조합해 보세요. 낮은 확률로 히든카드가 나와요! 실패해도 시도만 하면 완료예요. SR 이상 조합은 실패가 쌓일수록 확률이 오르고 30번째엔 레어히든이 확정이에요.',
      done: function () { return !!S.flags.hidden_try || hiddenTried(); }, reward: 500,
      go: function () { if (typeof openRecombine === 'function') openRecombine(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'expedition', icon: '🚌', title: '팬덤 원정 떠나기',
      hint: '🌟 팬덤 원정은 히든카드를 가진 멤버만 갈 수 있어요! (체험 카드도 가능) 🚐 스케줄 가기 → 🎬 팬덤 원정 → 방송국 앞. 현장을 돌아다니며 🖼️ 프리미엄 조각과 강화석을 모아요. 스태미나는 드링크로 채워요!',
      done: function () { return !!S.flags.first_expedition; }, reward: 500,
      go: function () { goTo('map'); }, target: '.btn-collection' },
    { id: 'potion', icon: '🧪', title: '원정에서 회복약 마시기',
      hint: '팬덤 원정에선 팬한테 치이면 ❤️HP가 깎여요. HP가 줄면 맵 오른쪽 위의 🧪 회복약 버튼을 눌러 마셔요! (처음 입장하면 작은 회복약을 3개 줘요. 더 필요하면 더보기 → 💖 팬 스킬 상점)',
      when: function () { return !!S.flags.first_expedition; },
      done: function () { return !!S.flags.first_potion; }, reward: 300,
      go: function () { goTo('map'); }, target: '.btn-collection' },
    { id: 'fanskill', icon: '🤝', title: '팬 스킬 배우기',
      hint: '더보기 → 💖 팬 스킬 상점에서 멤버에게 🤝 악수(30만 코인)를 가르쳐요. 팬덤 원정에서는 팬 머리 위에 뜬 스킬을 순서대로 써야 해요!',
      when: function () { try { return Number(playerLevel) >= 10; } catch (e) { return false; } },
      done: function () { var d = J('ph_fanskills', {}); return Object.keys(d || {}).some(function (c) { var o = d[c] && d[c].owned; return o && Object.keys(o).some(function (k) { return !!o[k]; }); }); }, reward: 500,
      go: function () { if (typeof window.openFanSkillShop === 'function') window.openFanSkillShop(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'fanserve', icon: '💖', title: '팬덤 원정에서 스킬로 팬 응대하기',
      hint: '맵 → 팬덤 원정 → 방송국 앞. 팬 머리 위에 뜬 스킬 버튼을 눌러 하트 게이지를 채우세요. 틀리면 실패예요!',
      when: function () { try { return Number(playerLevel) >= 5; } catch (e) { return false; } },
      done: function () { var d = J('ph_fanskills', {}); return Object.keys(d || {}).some(function (c) { return d[c] && d[c].serves > 0; }); }, reward: 500,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'skillbook', icon: '📘', title: '스킬북으로 숙련도 올리기',
      hint: '팬 응대나 공항 입국장에서 📘 스킬북이 가끔 나와요! 🎒 가방에서 스킬북을 열어 멤버를 고르면 스킬 숙련도가 올라가요.',
      when: function () { try { return Number(playerLevel) >= 10; } catch (e) { return false; } },
      done: function () { var d = J('ph_fanskills', {}); var inBag = false; try { inBag = bagItems.some(function (i) { return i && i.type === 'skillbook' && i.qty > 0; }); } catch (e) {} if (inBag) return true; return Object.keys(d || {}).some(function (c) { var b = d[c] && d[c].books; return b && Object.keys(b).some(function (k) { return b[k] > 0; }); }); }, reward: 1000,
      go: function () { goTo('bag'); }, target: '#nav-bag' },
    { id: 'invest_done', icon: '🧾', title: '투자 7일 채워서 만기 정산하기',
      hint: '💼 포카 인베스트에서 투자를 시작하고 📅 하루 보내기를 7번 해 만기가 되면 [만기 정산]! 중도 매각(−10%)과 달리 페널티가 없고, 잘되면 특별 배당(프리미엄 조각·강화석)이 나와요.',
      when: function () { try { return Number(playerLevel) >= 10; } catch (e) { return false; } },
      done: function () { var v = J('ph_invest', {}); return !!(v && Array.isArray(v.hist) && v.hist.some(function (h) { return h && h.mature; })); }, reward: 700,
      go: function () { goTo('map'); }, target: '#btn-invest-map' },
    { id: 'goods', icon: '🎁', title: '굿즈 만들어서 장착하기',
      hint: '맵 → 🛍️ 상점거리 → 🎁 굿즈 공방. 재료 + 코인으로 굿즈를 만들면 능력치가 랜덤으로 붙어요(실패할 수도!). 만든 굿즈를 캐릭터 카드 옆 칸에 장착해 보세요.',
      done: function () { return goodsCrafted(); }, reward: 500,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'goods_equip', icon: '🎒', title: '굿즈 캐릭터에게 장착하기',
      hint: '🎁 굿즈 공방 → 🎒 장착 탭에서 만든 굿즈를 캐릭터 카드 옆 칸(머리·손·액세서리 3칸)에 달아요. 그 캐릭터의 팬덤 원정이 강해져요!',
      done: function () { return goodsFlagG('equipped'); }, reward: 300,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'premium', icon: '💎', title: '프리미엄 카드 받기',
      hint: '팬덤 원정에서 🖼️ 프리미엄 조각 100개를 모아 더보기 → 💎 프리미엄 카드에서 교환! 연예인 활동을 도와주는 능력치 카드예요.',
      done: function () { return premiumOwned() >= 1; }, reward: 1000,
      go: function () { goTo('map'); }, target: '.btn-collection' },
    { id: 'prem_equip', icon: '💎', title: '프리미엄 카드 장착하기',
      hint: '⋯ 더보기 → 🎤 트레이닝룸 → 💎 프리미엄 카드 탭 맨 아래 <b>히든카드에 장착</b> 칸! 히든카드 1장에 2칸, 종류가 다른 카드만 끼울 수 있어요. 끼울 때 코인이 들고, 장착한 히든카드를 갖고 있어야 효과가 켜져요.',
      done: function () { return premEquipped(); }, reward: 400,
      go: function () { if (typeof openEnhance === 'function') openEnhance(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'equip_view', icon: '🎽', title: '장착 현황 한눈에 보기',
      hint: '🎒 가방을 열면 오른쪽에 <b>🎽 장착 현황</b> 탭이 있어요. 내 의상·프리미엄 카드·굿즈가 누구에게 뭐가 장착돼 있는지 한눈에 보여요!',
      done: function () { try { return !!S.flags.equip_view || localStorage.getItem('ph_equip_viewed') === '1'; } catch (e) { return false; } }, reward: 100,
      go: function () { goTo('bag'); }, target: '#nav-bag' },
    { id: 'royalty', icon: '📜', title: '정규 앨범 저작권 등록하기',
      hint: '작곡 테이블에서 재료 종류 10개 이상으로 📀 정규 앨범을 만들고 → 📜 저작권 탭에서 아이돌에게 등록하면 30일 동안 저작권료가 쌓여요!',
      when: function () { try { return Number(playerLevel) >= 10; } catch (e) { return false; } },
      done: function () { var d = J('ph_royalty', {}); return !!(d && ((d.slots && d.slots.length) || d.ever)); }, reward: 1500,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'lesson1', icon: '🎓', title: '아이돌에게 첫 레슨 시키기',
      hint: '더보기 → 📅 스케줄·식사 → 데뷔한 아이돌 화면 아래 🎓 레슨! 레슨을 하면 능력치가 영구히 올라가요. (하루 1번)',
      when: function () { try { return Number(playerLevel) >= 12 && debutCount() >= 1; } catch (e) { return false; } },
      done: function () { var d = J('ph_training', {}); return lessonN(d) >= 1; }, reward: 500,
      go: function () { if (typeof window.openMealSchedule === 'function') window.openMealSchedule(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'sweet1', icon: '🧁', title: '디저트 공방에서 간식 만들기',
      hint: '📅 스케줄·식사 → 디저트 공방! 탐험 재료로 별빛 마카롱 같은 간식을 만들어 가방에 넣어요.',
      when: function () { try { return Number(playerLevel) >= 13; } catch (e) { return false; } },
      done: function () { var d = J('ph_sweets', {}); return !!(d && d.cooked && Object.keys(d.cooked).some(function (k) { return d.cooked[k] > 0; })); }, reward: 600,
      go: function () { if (typeof window.openMealSchedule === 'function') window.openMealSchedule(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'sweet_fed', icon: '🍬', title: '아이돌에게 간식 먹이기',
      hint: '만든 간식을 먹이면 기분이 쑥! 아이돌마다 좋아하는 간식이 있어요 (좋아하면 기분 +4 더).',
      when: function () { try { return Number(playerLevel) >= 14 && debutCount() >= 1; } catch (e) { return false; } },
      done: function () { var d = J('ph_sweets', {}); return !!(d && d.everFed) || !!S.flags.sweet_fed; }, reward: 600,
      go: function () { if (typeof window.openMealSchedule === 'function') window.openMealSchedule(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'kennel1', icon: '🐾', title: '분양소 구경하기',
      hint: '더보기 → 🐾 분양소 (Lv.15). 아이돌과 함께할 친구를 만나봐요.',
      when: function () { try { return Number(playerLevel) >= 15; } catch (e) { return false; } },
      done: function () { return !!S.flags.kennel_seen; }, reward: 500,
      go: function () { if (typeof window.openKennel === 'function') { flag('kennel_seen'); window.openKennel(); } else goTo('home'); }, target: '#nav-shop' },
    { id: 'trade1', icon: '🏪', title: '거래소 구경하기',
      hint: '더보기 → 🏪 거래소 (Lv.15). 남는 재료나 간식을 올려서 코인으로 바꿔요.',
      when: function () { try { return Number(playerLevel) >= 15; } catch (e) { return false; } },
      done: function () { return !!S.flags.trade_seen; }, reward: 500,
      go: function () { if (typeof window.openTrade === 'function') { flag('trade_seen'); window.openTrade(); } else goTo('home'); }, target: '#nav-shop' },
    { id: 'chart_in', icon: '📈', title: '내 곡 음원차트에 올리기',
      hint: '정규 앨범을 아이돌에게 타이틀곡으로 주면 더보기 → 📈 음원차트에 올라가요. 순위는 🌙 하루 보내기를 할 때마다 바뀌어요!',
      when: function () { try { return Number(playerLevel) >= 10; } catch (e) { return false; } },
      done: function () { var d = J('ph_chart', {}); return !!(d && d.songs && d.songs.length); }, reward: 800,
      go: function () { if (typeof window.openMusicChart === 'function') window.openMusicChart(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'chart_stream', icon: '📣', title: '스밍 총공 해보기',
      hint: '📈 음원차트 → 내 곡 탭에서 📣 스밍 총공을 눌러요. 10초 동안 연타하면 차트 점수가 올라가요. 곡마다 하루 1번!',
      when: function () { try { return Number(playerLevel) >= 10; } catch (e) { return false; } },
      done: function () { var d = J('ph_chart', {}); return !!(d && d.songs && d.songs.some(function (x) { return (x.streamedDay || -1) >= 0; })); }, reward: 600,
      go: function () { if (typeof window.openMusicChart === 'function') window.openMusicChart(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'chart_book', icon: '📅', title: '음악방송 활동 일정 잡기',
      hint: '🍙 식사·일정표 → 아이돌 고르기 → 📺 음악방송 활동 날짜 누르기. (곡이 차트에 있어야 보여요! 작곡 → 정규 앨범 타이틀곡)',
      when: function () { try { return Number(playerLevel) >= 10; } catch (e) { return false; } },
      done: function () { try { if (localStorage.getItem('ph_musicBooked') === '1') return true; } catch (e) {} var d = J('ph_chart', {}); return !!(d && d.stats && d.stats.stages >= 1); }, reward: 600,
      go: function () { if (typeof window.openMealSchedule === 'function') window.openMealSchedule(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'chart_act', icon: '🎙️', title: '활동 날 음방 무대 미니게임 하기',
      hint: '일정 잡은 날이 되면(🌙 하루 보내기로 넘겨요) 정산 팝업에 [🎙️ 음방 무대 올라가기] 버튼이 떠요. 누르면 패턴 따라치기 + 퍼펙트 게이지 미니게임!',
      when: function () { try { return localStorage.getItem('ph_musicBooked') === '1'; } catch (e) { return false; } },
      done: function () { var d = J('ph_chart', {}); return !!(d && d.stats && d.stats.stages >= 1); }, reward: 1200,
      go: function () { if (typeof window.openMealSchedule === 'function') window.openMealSchedule(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'chart_show', icon: '🏆', title: '음악방송 1위 하기',
      hint: '차트 3위 안에 들면 금·토·일(게임 DAY)에 음악방송 후보로 나가요! 이기면 앵콜 무대 + 소원의 조각을 받아요.',
      when: function () { try { return Number(playerLevel) >= 15; } catch (e) { return false; } },
      done: function () { var d = J('ph_chart', {}); return !!(d && d.stats && d.stats.trophies >= 1); }, reward: 2000,
      go: function () { if (typeof window.openMusicChart === 'function') window.openMusicChart(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'chart_one', icon: '👑', title: '차트 1위 올킬하기',
      hint: '팬을 늘리고 히든카드를 강화하고, 총공으로 점수를 모아서 콘크리트 1위를 밀어내요! 1위 하는 날 투자 [앨범 제작]도 +30%예요.',
      when: function () { try { return Number(playerLevel) >= 20; } catch (e) { return false; } },
      done: function () { var d = J('ph_chart', {}); return !!(d && d.stats && d.stats.first); }, reward: 3000,
      go: function () { if (typeof window.openMusicChart === 'function') window.openMusicChart(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'premgacha', icon: '✨', title: '고급 뽑기 도전하기',
      hint: '플레이어 Lv.20부터! ✨ 카드 뽑기 화면 아래 <b>고급 뽑기</b>에서 한 번 뽑아봐요. UR 5% · SSR 15%로 일반 뽑기보다 훨씬 좋아요 (한 번 2만 코인, 5연은 SR 이상 보장).',
      when: function () { try { return Number(playerLevel) >= 20; } catch (e) { return false; } },
      done: function () { try { return localStorage.getItem('ph_premgacha_used') === '1'; } catch (e) { return false; } }, reward: 800,
      go: function () { goTo('gacha'); }, target: '#nav-gacha' },
    { id: 'concert_hall', icon: '🎪', title: '공연장 입장하기',
      hint: '🚐 스케줄 가기 → 🎬 팬덤 원정 → 🎪 공연장. 입장엔 🌟우등생별 1개가 들어요 (학교 미니게임으로 등교권 → 우등생 조각 100개 = 별 1개). 이벤트 20번을 채우면 앵콜 스테이지가 열려요!',
      done: function () { return q3('concert'); }, reward: 500,
      go: function () { goTo('map'); }, target: '.btn-collection' },
    { id: 'develop', icon: '📷', title: '시크릿 포토랩 첫 현상',
      hint: '앵콜 스테이지에서 📷 시크릿 포토랩으로! 프리미엄 카드를 골라 <b>현상</b>하면 슬롯 3칸에 랜덤 효과가 붙어요. 필름 🎞️ + 코인이 필요해요 (필름은 공연장에서 나와요).',
      done: function () { return q3('develop'); }, reward: 600,
      go: function () { goTo('map'); }, target: '.btn-collection' },
    { id: 'devsol', icon: '🧪', title: '현상액으로 옵션 강화하기',
      hint: '📷 포토랩에서 <b>센터·컴백·연습생</b> 칸을 눌러 🧪 현상액 + 코인으로 강화해요 (최대 +5강, 1강마다 효과 +10%). 현상액은 공연장에서만 나와요. 다시 현상하면 그 칸 강화는 사라지니 마음에 드는 칸은 🔒 잠그세요!',
      done: function () { return labEnhanced(); }, reward: 800,
      go: function () { goTo('map'); }, target: '.btn-collection' },
    { id: 'devlock', icon: '🔒', title: '옵션 잠그고 다시 현상하기',
      hint: '📷 포토랩에서 마음에 드는 칸(센터·컴백)은 🔒 잠그고 나머지 칸만 <b>다시 현상</b>해 보세요. 잠금 1개마다 비용이 +1배지만 좋은 효과를 지킬 수 있어요. 구설수(손해)·흑역사(장식)가 떴다면 그 칸만 풀고 다시 굴려요! 📋 <b>옵션표</b>에서 효과 종류와 확률을 볼 수 있어요.',
      done: function () { try { return localStorage.getItem('ph_lab_lockroll') === '1'; } catch (e) { return false; } }, reward: 800,
      go: function () { goTo('map'); }, target: '.btn-collection' },
    { id: 'airport', icon: '✈️', title: '공항 입국장 클리어하기',
      hint: '플레이어 Lv.20부터! 팬덤 원정 → ✈️ 공항 입국장. 몰려오는 팬을 스킬 순서대로 응대하고 8웨이브+보스를 깨요. 단타 스킬만으로는 못 깨요! 한꺼번에 여러 팬을 받아내는 <b>광역 스킬</b>(하이라이트·윙크샤워 등, 하이라이트는 Lv.20부터 · 더보기 → 💖 팬 스킬 상점)을 배우고 장착해서 가야 해요. 🕶️ 보디가드를 고용하면 든든해요.',
      when: function () { try { return Number(playerLevel) >= 20; } catch (e) { return false; } },
      done: function () { try { return localStorage.getItem('ph_fr_clear') === '1'; } catch (e) { return false; } }, reward: 5000,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'group_make', icon: '🧑‍🎤', title: '우리 그룹 결성하기',
      hint: '플레이어 Lv.20부터! 더보기 → 🧑‍🎤 그룹에서 데뷔한 아이돌 2~4명을 골라 그룹을 만들어요. 이름도 지어줘요!',
      done: function () { return !!(J('ph_group', {}) || {}).group; }, reward: 3000,
      go: function () { if (typeof window.openGroup === 'function') window.openGroup(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'group_act', icon: '🎤', title: '첫 그룹 활동 하기',
      hint: '더보기 → 🧑‍🎤 그룹에서 합동 무대·그룹 음원 같은 활동을 해봐요. 멤버 능력치가 높을수록 결과가 좋아져요. 하루 3번은 무료예요!',
      done: function () { return ((J('ph_group', {}) || {}).total || 0) >= 1; }, reward: 3000,
      go: function () { if (typeof window.openGroup === 'function') window.openGroup(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'group_10', icon: '🌟', title: '그룹 활동 10번 채우기',
      hint: '그룹 활동을 모두 합쳐 10번! 체력 음료를 쓰면 하루에 더 할 수 있고, 활동할수록 인기도가 올라 그룹 레벨이 커져요.',
      done: function () { return ((J('ph_group', {}) || {}).total || 0) >= 10; }, reward: 5000,
      go: function () { if (typeof window.openGroup === 'function') window.openGroup(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'invest_grade', icon: '🎖️', title: '투자 등급 올리기 (주요 투자자)',
      hint: '만기 정산을 3번 하면 🎖️ 주요 투자자가 돼요. 투자 한도·슬롯이 늘고 💿 앨범 제작 투자가 열려요. 등급이 높아지면 더 큰 기회도 찾아와요…',
      when: function () { try { return Number(playerLevel) >= 10; } catch (e) { return false; } },
      done: function () { var v = J('ph_invest', {}); return !!(v && v.done >= 3); }, reward: 1000,
      go: function () { goTo('map'); }, target: '#btn-invest-map' },
    { id: 'alldebut', icon: '👑', title: '멤버 6명 모두 데뷔시키기',
      hint: '민준·시온·도윤·하린·윤아·아라 전원 데뷔! 멤버가 늘수록 정산 수익도 늘어요. 맵 → 광장 → 🎤 기획사.',
      done: function () { return debutCount() >= 6; }, reward: 2000,
      go: function () { goTo('map'); }, target: '#nav-map' },
    { id: 'enhance', icon: '⚒️', title: '히든카드 강화하기',
      hint: '더보기 → 🎤 트레이닝룸. 히든카드 + 강화석 + 코인으로 강화하면 데뷔 수익이 확 올라요. 높은 단계는 실패하면 카드가 사라질 수 있으니 방지권을 챙기세요!',
      done: function () { return anyEnhanced() || !!S.flags.first_enhance; }, reward: 800,
      go: function () { if (typeof openEnhance === 'function') openEnhance(); else goTo('home'); }, target: '#nav-shop' },
    { id: 'transcend', icon: '🌠', title: '히든카드 초월하기',
      hint: '히든카드를 10강까지 올린 뒤 트레이닝룸에서 초월! 같은 멤버 여분 카드 + 초월석이 필요해요. 여기부터는 진짜 엔드 콘텐츠예요.',
      done: function () { return anyTranscended(); }, reward: 3000,
      go: function () { if (typeof openEnhance === 'function') openEnhance(); else goTo('home'); }, target: '#nav-shop' },
  ];


  // 🔒 unlock-gate.js 의 해금 레벨과 맞춤: 레벨이 모자란 단계는 길잡이가 건너뛴다 (잠긴 곳으로 보내지 않게)
  var STEP_LV = { agency: 5, explore: 3, school: 3, lv3: 3, room: 3, fishing: 3, mystery: 3, recombine: 12, hidden: 12, premium: 12, prem_equip: 12, enhance: 10, transcend: 10, studio: 15, album: 15, royalty: 15, goods: 15, goods_equip: 15, drama: 8, star_fame: 8, star_top: 8, mgr_top: 8, cf: 10, fancafe: 12, invest: 20, invest_done: 20, invest_grade: 20, chart_in: 18, chart_stream: 18, chart_book: 18, chart_act: 18, chart_show: 18, chart_one: 20, group_make: 20, group_act: 20, group_10: 20 };
  STEPS.forEach(function (st) {
    var need = STEP_LV[st.id]; if (!need) return;
    var prev = st.when;
    st.when = function () { try { if (Number(playerLevel) < need) return false; } catch (e) { return false; } return prev ? prev() : true; };
  });

  STEPS.forEach(function (st) { if (st.reward) st.reward = st.reward * REWARD_MULT; });   // 길잡이 보상 배율 (코인)

  function currentIndex() {
    // 원정에 한 번이라도 들어갔으면 회복약 퀘스트를 앞순서와 상관없이 바로 보여준다 (원정을 일찍 간 사람도 놓치지 않게)
    for (var k = 0; k < STEPS.length; k++) { if (STEPS[k].id === 'potion') { if (STEPS[k].when() && !STEPS[k].done()) return k; break; } }
    // 데뷔를 시작한 사람은 '멤버 6명 모두 데뷔'를 항상 먼저 보여준다
    if (debutCount() >= 1) { for (var m = 0; m < STEPS.length; m++) { if (STEPS[m].id === 'alldebut') { if (!STEPS[m].done()) return m; break; } } }
    for (var i = 0; i < STEPS.length; i++) { if (STEPS[i].when && !STEPS[i].when()) continue; if (!STEPS[i].done()) return i; }
    return -1;
  }

  function hintOf(st) { return (st.noGiftHint && !hasGift()) ? st.noGiftHint : st.hint; }
  function targetOf(st) { return (st.noGiftTarget && !hasGift()) ? st.noGiftTarget : st.target; }

  // ── 새 기능 첫 사용 감지용 후킹 (원래 함수는 그대로 실행) ──
  function hookLater(name, wrapperFactory) {
    (function tryHook() {
      if (typeof window[name] !== 'function') { setTimeout(tryHook, 80); return; }
      var orig = window[name];
      if (orig.__qgHooked) return;
      var wrapped = wrapperFactory(orig);
      wrapped.__qgHooked = true;
      window[name] = wrapped;
    })();
  }

  hookLater('doRecombine', function (orig) {
    return function () {
      var ok = true;
      try { if (typeof canDoRecombine === 'function') ok = !!canDoRecombine(); } catch (e) {}
      var r = orig.apply(this, arguments);
      if (ok) { flag('first_recombine'); flag('hidden_try'); }
      return r;
    };
  });
  hookLater('explorePlace', function (orig) {
    return function (id) {
      var r = orig.apply(this, arguments);
      flag('first_explore');
      if (id === 'lake') flag('first_fishing');
      return r;
    };
  });
  hookLater('startStudio', function (orig) {
    return function () { var r = orig.apply(this, arguments); flag('first_studio'); return r; };
  });
  hookLater('openEquipPanel', function (orig) {
    return function () { var r = orig.apply(this, arguments); flag('equip_view'); return r; };
  });
  hookLater('startFishing', function (orig) {
    return function () {
      var r = orig.apply(this, arguments);
      flag('first_fishing');
      return r;
    };
  });
  hookLater('openAgency', function (orig) {
    return function () {
      var r = orig.apply(this, arguments);
      try {
        if (typeof isPocaHouseFeatureUnlocked !== 'function' || isPocaHouseFeatureUnlocked('agency')) flag('first_agency');
      } catch (e) {}
      return r;
    };
  });
  hookLater('startSpecialExplore', function (orig) {
    return function () {
      var r = orig.apply(this, arguments);
      flag('first_expedition');
      return r;
    };
  });
  // 🧪 팬덤 원정 첫 입장 선물: 작은 회복약 3개 (팬 스킬 상점은 Lv.10부터라 초보는 살 곳이 없음). 한 번만.
  function giveStarterPotions() {
    if (S.flags.potion_gift) return;
    try {
      if (typeof addToBag === 'function' && addToBag('🧪', '작은 회복약', 'potion', 3, '원정 중 HP +40 · 맵 오른쪽 위 버튼으로 써요')) {
        flag('potion_gift');
        if (typeof showBagToast === 'function') showBagToast('🎁 작은 회복약 3개를 받았어요! 원정 중 HP가 줄면 마셔요');
      }
    } catch (e) {}
  }
  setInterval(function () { if (S.flags.first_expedition && !S.flags.potion_gift && document.getElementById('bc-view')) giveStarterPotions(); }, 600);
  // 회복약을 마시면(가방에서 빠지면) 완료 표시
  hookLater('useFromBag', function (orig) {
    return function (name) {
      var r = orig.apply(this, arguments);
      try { if (/회복약/.test(String(name))) flag('first_potion'); } catch (e) {}
      return r;
    };
  });
  // fishing.js 는 호수(캠프) 입구에서 window.startFishing / 위쪽 explorePlace 를 거치지 않고 안쪽 함수를 바로 부르므로,
  // 위 후킹만으로는 '낚시 해봄' 표시가 안 남는다 → 낚시 화면(#fishing-overlay)이 뜨는 순간을 직접 감지
  setInterval(function () {
    if (!S.flags.first_fishing && document.getElementById('fishing-overlay')) { flag('first_fishing'); flag('first_explore'); }
  }, 400);

  // 팬덤 원정(broadcast-expedition.js)은 startSpecialExplore 를 다시 감싸서 맵이면 원래 함수를 부르지 않고 바로 시작하므로,
  // 위 후킹이 안 걸릴 수 있다 → 원정 맵 화면(#bc-view)이 뜨는 순간을 직접 감지
  setInterval(function () {
    if (!S.flags.first_expedition && document.getElementById('bc-view')) flag('first_expedition');
  }, 400);

  // ── 보상 (새 기능 첫 체험 보너스, 1회만) ──
  function giveRewards() {
    STEPS.forEach(function (st) {
      if (!st.reward || S.rewarded[st.id] || !st.done()) return;
      S.rewarded[st.id] = 1; save(S);
      try {
        coins += st.reward;
        if (typeof saveAll === 'function') saveAll();
        if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
        if (typeof showBagToast === 'function') showBagToast('🧭 ' + st.title + ' 완료! 🍔+' + st.reward);
      } catch (e) {}
    });
  }

  // ── 스타일 ──
  function ensureStyle() {
    if (document.getElementById('qg-style')) return;
    var st = document.createElement('style');
    st.id = 'qg-style';
    st.textContent =
      '@keyframes qgFinger{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,10px)}}#qg-finger{position:fixed;z-index:880;font-size:34px;line-height:1;pointer-events:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.6));animation:qgFinger .8s ease-in-out infinite;display:none;}' +
      '@keyframes qgPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.95)}50%{box-shadow:0 0 0 7px rgba(255,255,255,0)}}' +
      '.qg-pulse{animation:none !important;outline:none !important;}#qg-finger{display:none !important;}' +   // 손가락·깜빡임 끔 (되살리려면 이 줄을 원래대로)
      '.qg-card{margin:8px 14px;background:#fff;border:2px solid #000;border-radius:14px;padding:10px 12px;font-family:"Noto Sans KR",sans-serif;}' +
      '.qg-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}' +
      '.qg-label{font-size:10px;font-weight:900;color:#9333ea;letter-spacing:1px;}' +
      '.qg-prog{font-size:10px;font-weight:900;color:#888;}' +
      '.qg-title{font-size:14px;font-weight:900;color:#111;margin-bottom:3px;}' +
      '.qg-hint{font-size:12px;color:#333;line-height:1.5;margin-bottom:8px;}' +
      '.qg-go{width:100%;padding:9px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:900;cursor:pointer;font-family:inherit;}' +
      '.qg-bar{height:5px;background:#eee;border-radius:3px;overflow:hidden;margin-bottom:6px;}' +
      '.qg-bar>div{height:100%;background:linear-gradient(90deg,#FFD700,#F59E0B);}';
    document.head.appendChild(st);
  }

  // 진행도: 지금 열려 있는(레벨·조건이 맞는) 퀘스트 중 끝낸 수 / 열린 수. (잠긴 퀘스트는 세지 않아서 레벨이 낮아도 '거의 다 끝남'처럼 안 보임)
  function progressOf() {
    var done = 0, total = 0;
    STEPS.forEach(function (x) {
      var d = false, open = true;
      try { d = !!x.done(); } catch (e) {}
      try { if (x.when && !x.when()) open = false; } catch (e) { open = false; }
      if (d) { done++; total++; } else if (open) total++;
    });
    return { done: done, total: total };
  }
  function cardHtml(idx) {
    var st = STEPS[idx];
    var pg = progressOf();
    var pct = pg.total ? Math.round((pg.done / pg.total) * 100) : 0;
    return '<div class="qg-top"><span class="qg-label">🧭 다음 할 일</span><span class="qg-prog">' + pg.done + ' / ' + pg.total + '</span></div>' +
      '<div class="qg-bar"><div style="width:' + pct + '%"></div></div>' +
      '<div class="qg-title">' + st.icon + ' ' + st.title + (st.reward ? ' <span style="font-size:11px;color:#F59E0B;">🍔+' + st.reward + '</span>' : '') + '</div>' +
      '<div class="qg-hint">' + hintOf(st) + '</div>' +
      '<button class="qg-go" data-qg-go="1">가기 👉</button>';
  }

  function bindGo(card) {
    var b = card.querySelector('[data-qg-go]');
    if (b) b.onclick = function () {
      var i = currentIndex();
      if (i >= 0) { try { STEPS[i].go(); } catch (e) {} }
    };
  }

  function clearPulse() {
    var els = document.querySelectorAll('.qg-pulse');
    for (var i = 0; i < els.length; i++) els[i].classList.remove('qg-pulse');
  }

  // ── 👆 손가락: 초반 단계(처음 FINGER_STEPS개)에서만, 목표 버튼 바로 아래에서 위를 가리킴 ──
  var FINGER_STEPS = 9;
  var curTarget = null, lastScrolled = '';
  function placeFinger() {
    var f = document.getElementById('qg-finger');
    if (!f) { f = document.createElement('div'); f.id = 'qg-finger'; document.body.appendChild(f); }
    var t = curTarget && document.body.contains(curTarget) ? curTarget : null;
    var home = document.getElementById('screen-home');
    var onHome = !!(home && home.classList.contains('active'));
    if (t) t.classList.toggle('qg-pulse', onHome);          // 홈이 아닌 화면(인연·가방 등)에선 깜빡임도 끔 → 홈으로 돌아오면 다시 켜짐
    if (!t || !onHome || !t.offsetParent) { f.style.display = 'none'; return; }
    var r = t.getBoundingClientRect(), vh = window.innerHeight;
    if (r.width === 0 || r.height === 0) { f.style.display = 'none'; return; }
    f.style.display = 'block';
    f.style.left = Math.min(Math.max(r.left + r.width / 2, 24), window.innerWidth - 24) + 'px';
    if (r.top > vh - 90) { f.textContent = '👇'; f.style.top = (vh - 130) + 'px'; }      // 화면 아래에 가려져 있으면 아래쪽에서 "스크롤 해봐" 느낌
    else if (r.bottom < 70) { f.textContent = '👆'; f.style.top = '70px'; }
    else { f.textContent = '👆'; f.style.top = (r.bottom + 4) + 'px'; }
  }
  setInterval(placeFinger, 250);

  function render() {
    ensureStyle();
    // 강화·초월 등 감지된 첫 체험은 기록해 둠 (나중에 카드가 사라져도 완료 유지)
    if (anyEnhanced()) flag('first_enhance');
    giveRewards();
    var idx = currentIndex();
    clearPulse();

    // 홈 카드
    var home = document.getElementById('screen-home');
    var old = document.getElementById('qg-home-card');
    if (home) {
      if (idx < 0) { if (old) old.remove(); curTarget = null; }
      else {
        if (!old) {
          old = document.createElement('div');
          old.id = 'qg-home-card';
          old.className = 'qg-card';
          var actions = home.querySelector('.home-actions');
          if (actions) home.insertBefore(old, actions); else home.appendChild(old);
        }
        old.innerHTML = cardHtml(idx);
        bindGo(old);
        curTarget = null;
        if (idx < FINGER_STEPS) {
          var t = document.querySelector(targetOf(STEPS[idx]));
          if (t) {
            curTarget = t;                                    // 손가락·깜빡임은 placeFinger 가 '홈 화면일 때만' 보여줌
            if (home.classList.contains('active')) {
              t.classList.add('qg-pulse');
              var key = STEPS[idx].id + (STEPS[idx].noGiftTarget && !hasGift() ? ':ng' : '');
              if (lastScrolled !== key) { lastScrolled = key; try { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {} }
            }
          }
        }
      }
    }

    // 퀘스트 화면 카드
    var list = document.getElementById('quest-list');
    var oldQ = document.getElementById('qg-quest-card');
    if (list) {
      if (idx < 0) { if (oldQ) oldQ.remove(); }
      else {
        if (!oldQ) {
          oldQ = document.createElement('div');
          oldQ.id = 'qg-quest-card';
          oldQ.className = 'qg-card';
          oldQ.style.margin = '0 0 12px';
          list.insertBefore(oldQ, list.firstChild);
        }
        oldQ.innerHTML = cardHtml(idx);
        bindGo(oldQ);
      }
    }
  }

  // 화면 이동 / 퀘스트 목록 갱신 때마다 다시 그리기
  hookLater('goTo', function (orig) {
    return function () {
      var r = orig.apply(this, arguments);
      setTimeout(render, 30);
      return r;
    };
  });
  hookLater('renderQuestList', function (orig) {
    return function () {
      var r = orig.apply(this, arguments);
      var o = document.getElementById('qg-quest-card'); if (o) o.remove();
      render();
      return r;
    };
  });

  // 진행 상황(코인 벌기·레벨업 등) 자동 감지 — 가벼운 주기 체크
  var lastIdx = -2, lastGift = null;
  setInterval(function () {
    var i = currentIndex(), g = hasGift();
    if (i !== lastIdx || g !== lastGift) { lastIdx = i; lastGift = g; render(); }
  }, 600);

  window.__guideTest = { STEPS: STEPS, currentIndex: currentIndex };
  setTimeout(render, 900);
  setTimeout(render, 1800);
})();
