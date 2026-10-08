// 💓 설렘 이벤트 (romance.js)
// - 인연 상세 화면에 '💓 설렘' 버튼. 호감도 경험치가 기준을 넘으면 새 이벤트가 열림 (이벤트당 1번)
// - 선택지에 따라 두근 포인트(pt 1~3) → 호감도 경험치 보상 (+8 / +14 / +20)
// - 이벤트 추가는 EV 에 한 줄씩 추가하면 됨. min = 필요한 호감도 경험치(친절후반 30, 우호 120, 신뢰 550, 인연 1700)
(function applyRomance() {
  if (typeof openBondDetail !== 'function' || typeof CHARS === 'undefined' || typeof addAffectionExp !== 'function') { setTimeout(applyRomance, 150); return; }
  if (window.__romanceApplied) return; window.__romanceApplied = true;

  var EV = {
    minjun: [
      { id: 'a', min: 30, t: '우산 하나', s: ['...비 온다. 우산 없지?', '(말없이 우산을 기울여 준다) 어깨 젖잖아. 더 붙어.'], q: '가까워서 심장 소리가 들릴 것 같다…', o: [['괜찮아요, 선배가 젖어요', '난 괜찮아. ...네가 감기 걸리는 게 더 싫어서 그래.', 3], ['그럼 같이 쓸게요', '...응. (귀가 살짝 붉어졌다)', 2], ['빨리 뛰어가요!', '야, 같이 뛰면 우산 의미가 없잖아. ...하여간.', 1]] },
      { id: 'b', min: 120, t: '도서관 마감 후', s: ['오늘은 내가 문 잠글게. 먼저 가도 되는데...', '...기다려 줄 거야? 5분이면 돼.'], q: '민준이 책 한 권을 내민다. "이거, 너 읽을 것 같아서."', o: [['고마워요, 저 생각해 준 거예요?', '...다른 사람 생각은 안 하거든. 이런 건.', 3], ['무슨 책이에요?', '읽어 보면 알아. 마지막 장은 나 없을 때 읽고.', 2], ['(말없이 웃는다)', '웃지 마. ...심장에 안 좋아.', 2]] },
      { id: 'c', min: 550, t: '보고 싶었다는 말', s: ['요즘 안 보이길래... 아니, 그냥 궁금했어.', '솔직히 말하면 매일 문 쪽만 봤어. 이제 말했다.'], q: '민준이 시선을 피하며 묻는다. "나, 이상해 보여?"', o: [['아뇨, 저도 보고 싶었어요', '...그 말 한 번만 더 해줄래. 기억해 두게.', 3], ['조금 귀여워요', '귀엽다니... 처음 들어 봐. 싫진 않네.', 2], ['많이 이상해요 ㅎㅎ', '그래. 이상한 채로 네 옆에 있을게.', 1]] }
    ],
    sion: [
      { id: 'a', min: 30, t: '이어폰 한쪽', s: ['...이거 들어 봐. 아직 아무한테도 안 들려줬어.', '(한쪽 이어폰을 건넨다) 평가는 하지 마. 그냥 들어.'], q: '노래가 끝나자 시온이 힐끔 쳐다본다.', o: [['지금까지 중에 제일 좋아요', '...그래? 그럼 이건 너 전용으로 해둘게.', 3], ['눈물 날 뻔했어요', '울지 마. 안 우는 거 보고 싶어서 만든 거야.', 2], ['한 번 더 들어도 돼요?', '...몇 번이든. 어차피 네가 첫 관객이야.', 2]] },
      { id: 'b', min: 120, t: '새벽 연습실', s: ['왜 왔어. 잠도 안 자고.', '...나 때문이라고 말하면 곤란해지는데.'], q: '시온이 기타를 내려놓고 옆자리를 툭 친다. "앉아."', o: [['어깨 기대도 돼요?', '...맘대로 해. 대신 나 움직이면 안 돼.', 3], ['옆에서 듣기만 할게요', '그게 제일 어려운 거야, 가만히 있는 거.', 2], ['빨리 자요, 걱정돼요', '잔소리하는 건 너밖에 없어. ...듣기 싫진 않네.', 2]] },
      { id: 'c', min: 550, t: '무대 뒤 한 마디', s: ['오늘 무대, 객석에서 널 찾았어.', '찾으니까 노래가 달라지더라. 곤란하게.'], q: '시온이 작게 말한다. "다음 곡은 네 이름 붙여도 돼?"', o: [['좋아요, 영광이에요', '영광은 무슨. ...내가 영광이지.', 3], ['제목이 궁금해요', '비밀. 완성되면 제일 먼저 들려줄게.', 2], ['부끄러워요 ㅠㅠ', '나도 부끄러워. 그러니까 같이 부끄러워하자.', 2]] }
    ],
    doyun: [
      { id: 'a', min: 30, t: '지각 금지', s: ['5분 늦었네. 규칙 위반이야.', '...벌칙은 이거. 오늘 퇴근길, 내가 데려다 줄 테니까 기다려.'], q: '도윤이 가방을 대신 들어 준다.', o: [['이것도 규칙이에요?', '지금 만들었어. 예외는 너한테만 적용되는 규칙.', 3], ['감사해요 학생회장님', '도윤이라고 불러. 둘이 있을 땐.', 2], ['제가 들게요!', '됐어. 내 손에 있어야 안심이 돼.', 1]] },
      { id: 'b', min: 120, t: '독점 선언', s: ['아까 다른 애랑 웃고 있더라.', '아무 감정 없어. 그냥... 기록해 둔 거야.'], q: '도윤이 시선을 떼지 않고 묻는다. "나한텐 왜 그렇게 안 웃어?"', o: [['지금 웃고 있는데요?', '...봤어. 이게 더 좋다는 걸 이제 알았다.', 3], ['질투하는 거예요?', '질투 아니야. ...정당한 관심이지. 아마도.', 2], ['도윤은 특별해서요', '특별. 좋아. 그 단어, 내가 가져갈게.', 3]] },
      { id: 'c', min: 550, t: '유일한 예외', s: ['내 규칙에 예외는 없다고 했지.', '근데 너 앞에서는 매번 내가 어기고 있어.'], q: '도윤이 낮게 말한다. "책임져. 내 규칙 망가뜨린 거."', o: [['평생 책임질게요', '평생이라... 계약서 작성할까, 지금.', 3], ['그럼 새 규칙 만들어요', '좋아. 1조: 너는 내 옆에 있는다.', 3], ['그건 도윤이 문제죠 ㅋㅋ', '...맞는 말이라 더 화나네. 옆에 있어.', 1]] }
    ],
    harin: [
      { id: 'a', min: 30, t: '막차 기다리는 밤', s: ['(작게 흥얼거리다 멈춘다) ...들렸어?', '들렸으면 모른 척해 줘. 아직 가사가 없거든.'], q: '하린이 네 쪽으로 고개를 기울인다.', o: [['계속 불러 주세요', '...이 노래, 네가 제목이 될지도 몰라.', 3], ['모른 척할게요 (웃음)', '고마워. 비밀 하나 생겼다, 우리.', 2], ['가사 같이 써 볼까요?', '같이... 좋다. 그 말이 오늘의 첫 줄이야.', 3]] },
      { id: 'b', min: 120, t: '새벽의 전화', s: ['자고 있었어? ...미안, 그냥 목소리가 듣고 싶었어.', '아무 말 안 해도 돼. 숨소리만 들려줘.'], q: '잠깐의 침묵 뒤 하린이 속삭인다. "아직 거기 있지?"', o: [['여기 있어요, 끊지 말아요', '응... 그럼 이 노래가 끝날 때까지만.', 3], ['보고 싶어요', '...나도. 별이 지기 전에 한 번 더 말해줘.', 3], ['내일 만나요, 이제 자요', '내일. 그 단어가 오늘 밤 제일 좋아.', 2]] },
      { id: 'c', min: 550, t: '사라지지 않는 노래', s: ['모든 게 사라져도 괜찮다고 생각했어.', '근데 너만은 사라지지 않았으면 좋겠다고 처음 생각했어.'], q: '하린이 손끝을 살짝 잡는다. "이 마음, 노래로 말해도 돼?"', o: [['듣고 싶어요, 지금 바로', '(작게 노래한다) ...이게 내 대답이야.', 3], ['말로도 해주세요', '좋아해. ...노래보다 이게 더 어렵다.', 3], ['심장이 너무 뛰어요', '나도 들려. 박자가 똑같아.', 2]] }
    ],
    yuna: [
      { id: 'a', min: 30, t: '꽃 한 송이', s: ['짜잔! 이거 너 줄려고 아까부터 숨기고 있었어!', '(꽃을 내밀고 얼굴이 빨개진다) 아, 왜 이렇게 부끄럽지?!'], q: '윤아가 두 손을 모으고 기다린다. "...받아 줄 거지?"', o: [['당연히 받죠, 너무 예뻐요', '헤헤, 다행이다! 사실 어젯밤에 열 번 연습했어.', 3], ['윤아가 더 예뻐요', '뭐, 뭐라고?! ...다시 한 번만 말해줘! 아니 하지 마! 심장 터져!', 3], ['꽃이 시들면 어떡해요', '그럼 또 줄게! 매일매일 줄게!', 2]] },
      { id: 'b', min: 120, t: '봄 데이트', s: ['오늘은 데이트야! 아, 아니 데이트 같은 산책!', '손 잡아도 돼? 길 잃을까 봐! 진짜로!'], q: '윤아가 손을 내민다. 귀가 빨갛다.', o: [['(손을 잡는다)', '...와. 따뜻하다. 오늘 하루 종일 이대로 있고 싶어.', 3], ['길 안 잃어요 ㅎㅎ', '그, 그래도! 안 잡으면 내가 길 잃어!', 2], ['먼저 뛰어가 볼까요?', '좋아! 같이 달려! 손은 놓지 말고!', 2]] },
      { id: 'c', min: 550, t: '질투는 봄바람처럼', s: ['오늘 다른 멤버랑 얘기 많이 하더라...', '아냐 아냐! 아무것도 아냐! 나 질투 안 해!'], q: '윤아가 입을 삐죽인다. "...오늘 나랑만 있어 주면 안 돼?"', o: [['오늘은 윤아랑만 있을게요', '정말?! 그럼 오늘 하루는 완전 내 거야!', 3], ['질투하는 윤아도 귀여워요', '귀엽다고 하면 화낼 수가 없잖아! 치사해!', 2], ['저 원래 윤아 편이에요', '그 말 믿는다! 평생 기억할 거야!', 3]] }
    ],
    ara: [
      { id: 'a', min: 30, t: '대기실의 여왕', s: ['...들어와도 된다고 한 적 없는데.', '앉아. 거기. 내 시야에서 안 벗어나는 자리에.'], q: '아라가 거울 너머로 너를 본다. "무대 전에 긴장 풀어 줘."', o: [['잘할 거예요, 믿어요', '당연하지. 근데 네가 말하니까 조금 더 믿기네.', 3], ['(어깨를 주물러 준다)', '...누가 허락했어. 계속해. 아니, 조금만 더.', 3], ['립 번졌어요', '뭐?! ...거짓말이지. 놀랐잖아, 책임져.', 1]] },
      { id: 'b', min: 120, t: '둘만의 비밀', s: ['비밀 하나 알려 줄까. 나, 무대 위보다 지금이 더 떨려.', '...누구한테도 말하지 마. 특히 걔네한테는.'], q: '아라가 턱을 괴고 짓궂게 웃는다. "왜 떨리는지 맞혀 봐."', o: [['저 때문이에요?', '...눈치는 빨라서 싫어. 맞아, 너 때문이야.', 3], ['모르겠어요, 알려 주세요', '몰라도 돼. 대신 오늘 밤은 내 곁에 있어.', 2], ['추워서요?', '...아니거든. 센스 없는 건 벌이야.', 1]] },
      { id: 'c', min: 550, t: '여왕의 약점', s: ['오늘 밤 넌 내게서 벗어날 수 없다고 했지.', '사실 반대야. 내가 널 못 놓겠어.'], q: '아라가 처음으로 시선을 피한다. "...이런 말 하는 나, 싫어?"', o: [['좋아요, 더 말해 줘요', '욕심쟁이. ...좋아해. 이제 만족해?', 3], ['저도 놓고 싶지 않아요', '그럼 약속해. 내 무대 끝까지 객석 맨 앞.', 3], ['약점이 있어서 더 좋아요', '약점 잡았다고 좋아하지 마. ...네 것이니까.', 2]] }
    ]
  };
  var NAMES = { minjun: '민준', sion: '시온', doyun: '도윤', harin: '하린', yuna: '윤아', ara: '아라' };
  var KEY = 'ph_romance';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function exp(cid) { try { return getAffectionTotalExp(cid); } catch (e) { return 0; } }
  function stageName(min) { return min >= 1700 ? '인연' : min >= 400 ? '신뢰' : min >= 80 ? '우호' : '친절'; }

  function status(cid) {
    var d = load()[cid] || { done: [], pt: 0 };
    var list = EV[cid] || [], e = exp(cid), next = null;
    for (var i = 0; i < list.length; i++) if (d.done.indexOf(list[i].id) < 0) { next = list[i]; break; }
    return { d: d, next: next, ready: !!next && e >= next.min, total: list.length };
  }

  function close() { var o = document.getElementById('rom-ov'); if (o) o.remove(); }

  function play(cid, ev) {
    close();
    var ch = CHARS[cid], nm = NAMES[cid] || ch.name;
    var ov = document.createElement('div'); ov.id = 'rom-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:700;background:#1a0a1e;display:flex;flex-direction:column;font-family:"Noto Sans KR",sans-serif;color:#fff;';
    ov.innerHTML = '<div style="flex:1;min-height:0;background:url(\'' + ch.img + '\') top center/cover;position:relative;"><div style="position:absolute;inset:0;background:linear-gradient(to top,#1a0a1e 0%,rgba(26,10,30,0) 45%);"></div><div style="position:absolute;top:12px;left:14px;padding:5px 12px;border-radius:14px;background:#0008;font-size:12px;font-weight:700;">💓 ' + ev.t + '</div></div>' +
      '<div id="rom-box" style="padding:16px 18px 26px;min-height:190px;background:#1a0a1e;"></div>';
    document.body.appendChild(ov);
    var box = ov.querySelector('#rom-box'), step = 0;
    function say(text, who, next) {
      box.innerHTML = '<div style="font-size:12px;color:#FF9EC4;font-weight:700;margin-bottom:6px;">' + who + '</div><div style="font-size:15px;line-height:1.6;min-height:70px;">' + text + '</div><div style="text-align:right;font-size:11px;color:#aaa;margin-top:8px;">탭해서 계속 ▶</div>';
      box.onclick = next;
    }
    function ask() {
      box.onclick = null;
      var h = '<div style="font-size:13px;color:#FFD1E3;margin-bottom:10px;">' + ev.q + '</div>';
      ev.o.forEach(function (o, i) { h += '<button data-i="' + i + '" style="display:block;width:100%;margin-bottom:8px;padding:12px;background:rgba(255,255,255,.1);border:1px solid #FF6B9D66;border-radius:12px;color:#fff;font-size:14px;font-family:inherit;">' + o[0] + '</button>'; });
      box.innerHTML = h;
      Array.prototype.forEach.call(box.querySelectorAll('button'), function (b) {
        b.onclick = function () { var o = ev.o[+b.getAttribute('data-i')]; say(o[1], nm, function () { finish(o[2]); }); };
      });
    }
    function finish(pt) {
      var all = load(); var d = all[cid] || { done: [], pt: 0 };
      if (d.done.indexOf(ev.id) < 0) { d.done.push(ev.id); d.pt += pt; all[cid] = d; save(all); try { addAffectionExp(cid, pt === 3 ? 20 : pt === 2 ? 14 : 8); } catch (e) {} }
      var hearts = ''; for (var i = 0; i < 3; i++) hearts += i < pt ? '💗' : '🤍';
      box.onclick = null;
      box.innerHTML = '<div style="text-align:center;padding-top:8px;"><div style="font-size:30px;">' + hearts + '</div><div style="font-size:15px;font-weight:700;margin:8px 0;">두근 ' + pt + '/3</div><div style="font-size:12px;color:#ccc;">호감도 +' + (pt === 3 ? 20 : pt === 2 ? 14 : 8) + '</div><button id="rom-ok" style="margin-top:14px;width:100%;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-weight:700;font-size:14px;font-family:inherit;">확인</button></div>';
      box.querySelector('#rom-ok').onclick = function () { close(); try { openBondDetail(cid); } catch (e) {} };
    }
    (function seq() {
      if (step < ev.s.length) { var t = ev.s[step++]; say(t, nm, seq); } else ask();
    })();
  }

  function addButton(cid) {
    var area = document.querySelector('#bond-detail-overlay .bond-affection');
    if (!area || !EV[cid]) return;
    var old = document.getElementById('rom-btn'); if (old) old.remove();
    var st = status(cid), b = document.createElement('button'); b.id = 'rom-btn';
    var base = 'width:100%;margin-top:10px;padding:13px;border:none;border-radius:12px;font-size:14px;font-weight:700;font-family:"Noto Sans KR",sans-serif;';
    if (!st.next) { b.textContent = '💓 설렘 이벤트 모두 완료 (두근 ' + st.d.pt + ')'; b.disabled = true; b.style.cssText = base + 'background:rgba(255,255,255,.08);color:#FF9EC4;'; }
    else if (st.ready) { b.textContent = '💓 설렘 이벤트 — ' + st.next.t + ' (' + (st.d.done.length + 1) + '/' + st.total + ')'; b.style.cssText = base + 'background:linear-gradient(135deg,#FF4D88,#FF9EC4);color:#fff;cursor:pointer;'; b.onclick = function () { play(cid, st.next); }; }
    else { b.textContent = '🔒 ' + stageName(st.next.min) + ' 단계(호감도 ' + st.next.min + ')가 되면 설렘 이벤트가 열려요'; b.disabled = true; b.style.cssText = base + 'background:rgba(255,255,255,.08);color:#888;font-size:12px;'; }
    area.appendChild(b);
  }

  var orig = window.openBondDetail;
  window.openBondDetail = function (cid) {
    var r = orig.apply(this, arguments);
    try { addButton(cid); } catch (e) { console.error('[romance]', e); }
    return r;
  };
  window.PhRomance = { EV: EV, status: status, play: play };
})();
