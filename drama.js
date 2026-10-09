// ════════════════════════════════
// 🎥 드라마 촬영 (drama.js)
// 광장 메뉴에 "🎥 드라마 촬영" 버튼을 붙인다. (game.js / index.html은 건드리지 않음)
//
// - 기획사에서 "데뷔 완료"한 캐릭터만 출연 가능. 그 캐릭터의 보유 카드(N~UR, 히든)를 골라 출연.
//   N·R=일반(슬롯1) / SR·SSR·UR=레어(슬롯2) / 히든=슬롯3. 일반·레어 카드는 시청률 상한 10%.
// - 60초 촬영 → 시청률 → 출연료(코인) + 소원의 조각 + 스킬 드랍. 히든 카드로 찍으면 인지도 → 탑스타.
// - 촬영 체력은 이 모드 전용 (하루 무료 3회 + 체력 음료). 저장 키: ph_drama
// - 이미지: drama/ 폴더 (actors·dir·bg·icons)
//
// 값을 바꾸고 싶으면 아래 CFG와 CAP, DROP, SKILLS만 고치면 됨.
// ════════════════════════════════
(function () {
'use strict';
if(window.__dramaLoaded)return;window.__dramaLoaded=true;
const CSS=`#dr-root{position:fixed;inset:0;z-index:780;overflow:hidden;
  --bg:#14111c; --panel:#1d1928; --panel-2:#272134; --line:#3b3450; --fg:#f4f0fa; --muted:#a69ebb;
  --slate:#ffcf4a; --rec:#ff5468; --ok:#4fe3c1;
  --emo:#ff7aa8; --act:#ff9d4a; --adl:#b793ff; --aux:#5cc8ea;
  --f-display:"Black Han Sans","Noto Sans KR",system-ui,sans-serif;
  --f-body:"Noto Sans KR",system-ui,-apple-system,"Apple SD Gothic Neo",sans-serif;
  --f-mono:"JetBrains Mono",ui-monospace,Menlo,monospace;
  color-scheme:dark;background:var(--bg);color:var(--fg);font-family:var(--f-body);font-size:14px;line-height:1.5;-webkit-tap-highlight-color:transparent;overscroll-behavior:none}
#dr-root[hidden],#dr-root [hidden]{display:none!important}
#dr-root,#dr-root *{box-sizing:border-box}
#dr-root button{font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0}
#dr-root button:focus-visible{outline:2px solid var(--slate);outline-offset:2px}
#dr-app{height:100%;max-width:520px;margin:0 auto;padding-inline:16px;display:flex;flex-direction:column;position:relative}
#dr-root .screen{flex:1;min-height:0;display:flex;flex-direction:column}
#dr-root .screen[hidden]{display:none!important}
#dr-root h1,#dr-root h2,#dr-root h3{margin:0;font-weight:400;text-wrap:balance}
#dr-root .disp{font-family:var(--f-display);letter-spacing:.01em}
#dr-root .mono{font-family:var(--f-mono);font-variant-numeric:tabular-nums}
#dr-root .scroll{flex:1;min-height:0;overflow-y:auto;padding-block:14px 16px;display:flex;flex-direction:column;gap:22px;scrollbar-width:thin}
#dr-root .brand{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
#dr-root .brand h1{font-family:var(--f-display);font-size:26px;line-height:1.1}
#dr-root .brand small{color:var(--muted);font-size:12px}
#dr-root .res{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#dr-root .res>div{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px;min-width:0}
#dr-root .res .wide{grid-column:1/-1}
#dr-root .lab{font-size:11px;letter-spacing:.08em;color:var(--muted);text-transform:uppercase}
#dr-root .val{font-size:18px;font-weight:700}
#dr-root .bar{height:8px;border-radius:99px;background:var(--panel-2);overflow:hidden;margin-top:6px}
#dr-root .bar>i{display:block;height:100%;background:var(--slate);border-radius:99px;transition:width .3s}
#dr-root .pips{display:flex;gap:6px;margin-top:6px;align-items:center}
#dr-root .pip{width:18px;height:18px;border-radius:50%;border:2px solid var(--ok);background:var(--ok)}
#dr-root .pip.off{background:none;border-color:var(--line)}
#dr-root .pip.pot{border-color:var(--slate);background:var(--slate)}
#dr-root .sec>h2{font-size:15px;font-weight:700;display:flex;gap:8px;align-items:center;margin-bottom:10px}
#dr-root .sec>h2 .n{font-family:var(--f-mono);font-size:12px;width:22px;height:22px;border-radius:6px;background:var(--slate);color:#1a1405;display:grid;place-items:center;font-weight:700}
#dr-root .opts{display:grid;gap:8px}
#dr-root .opt{text-align:left;background:var(--panel);border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;display:grid;gap:3px;min-width:0}
#dr-root .opt.on{border-color:var(--slate);background:var(--panel-2)}
#dr-root .opt .t{font-weight:700;font-size:15px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#dr-root .opt .s{color:var(--muted);font-size:12.5px}
#dr-root .tag{font-size:11px;padding:1px 8px;border-radius:99px;background:var(--panel-2);border:1px solid var(--line);color:var(--muted);font-weight:500}
#dr-root .tag.g-레어{color:var(--aux);border-color:var(--aux)}
#dr-root .tag.g-히든{color:var(--adl);border-color:var(--adl)}
#dr-root .tag.g-프리미엄{color:var(--slate);border-color:var(--slate)}
#dr-root .tag.learned{color:var(--ok);border-color:var(--ok)}
#dr-root .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
#dr-root .pc{background:var(--panel);border:1.5px solid var(--line);border-radius:12px;padding:10px 8px 12px;display:grid;justify-items:center;gap:6px;text-align:center;min-width:0}
#dr-root .pc.on{border-color:var(--slate);background:var(--panel-2)}
#dr-root .pc.lock{opacity:.8}
#dr-root .face{width:52px;height:64px;border-radius:8px;display:grid;place-items:center;font-family:var(--f-display);font-size:26px;color:#1a1405;position:relative}
#dr-root .face::after{content:"";position:absolute;inset:3px;border:1.5px solid rgba(255,255,255,.55);border-radius:5px}
#dr-root .pc b{font-size:14px}
#dr-root .pc small{color:var(--muted);font-size:11.5px}
#dr-root .exch{font-size:11.5px;font-weight:700;background:var(--slate);color:#1a1405;border-radius:99px;padding:4px 10px}
#dr-root .exch[disabled]{background:var(--panel-2);color:var(--muted)}
#dr-root .slotrow{display:flex;gap:10px;align-items:center;margin-bottom:12px}
#dr-root .slotrow .lab{margin-right:4px}
#dr-root .sl{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-family:var(--f-display);font-size:18px;color:#1a1405;border:2px solid transparent;position:relative}
#dr-root .sl.empty{background:none;border:2px dashed var(--line);color:var(--muted);font-family:var(--f-body);font-size:20px}
#dr-root .c-감정{background:var(--emo)}
#dr-root .c-액션{background:var(--act)}
#dr-root .c-애드리브{background:var(--adl)}
#dr-root .c-보조{background:var(--aux)}
#dr-root .g-히든.sl{box-shadow:0 0 0 3px var(--bg),0 0 0 5px var(--adl)}
#dr-root .g-프리미엄.sl{box-shadow:0 0 0 3px var(--bg),0 0 0 5px var(--slate)}
#dr-root .grp{margin-top:12px}
#dr-root .grp h3{font-size:12px;color:var(--muted);margin-bottom:6px;letter-spacing:.06em}
#dr-root .chips{display:grid;gap:6px}
#dr-root .chip{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:center;text-align:left;background:var(--panel);border:1.5px solid var(--line);border-radius:10px;padding:8px 10px;min-width:0}
#dr-root .chip.on{border-color:var(--slate);background:var(--panel-2)}
#dr-root .chip.other{opacity:.5}
#dr-root .chip .dot{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-family:var(--f-display);font-size:14px;color:#1a1405}
#dr-root .chip b{font-size:13.5px}
#dr-root .chip span{display:block;font-size:12px;color:var(--muted)}
#dr-root .shop{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#dr-root .buy{background:var(--panel);border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;text-align:left;display:grid;gap:2px}
#dr-root .buy b{font-size:14px}
#dr-root .buy span{font-size:12px;color:var(--muted)}
#dr-root .buy[disabled]{opacity:.45}
#dr-root .buy.hot{border-color:var(--slate)}
#dr-root details.tools{border:1px dashed var(--line);border-radius:10px;padding:8px 12px;color:var(--muted)}
#dr-root details.tools summary{cursor:pointer;font-size:12.5px}
#dr-root .tools .row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
#dr-root .tools button{font-size:12px;border:1px solid var(--line);border-radius:8px;padding:6px 10px;color:var(--fg)}
#dr-root .dock{padding-block:10px;padding-bottom:max(10px,env(safe-area-inset-bottom,0px));border-top:1px solid var(--line);background:var(--bg);display:grid;gap:8px}
#dr-root .dock .sum{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#dr-root .go{background:var(--slate);color:#1a1405;border-radius:12px;font-family:var(--f-display);font-size:20px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center}
#dr-root .go small{font-family:var(--f-body);font-size:12px;font-weight:700}
#dr-root .go[disabled]{background:var(--panel-2);color:var(--muted)}
#dr-root #dr-shoot{gap:10px;padding-block:12px}
#dr-root .hud{display:grid;gap:8px}
#dr-root .timebar{height:22px;border-radius:6px;background:var(--panel-2);position:relative;overflow:hidden;border:1px solid var(--line)}
#dr-root .timebar i{position:absolute;inset:0 auto 0 0;width:100%;background:var(--rec);transition:none}
#dr-root .timebar b{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--f-mono);font-size:12px}
#dr-root .timebar.low i{animation:dr-blink .5s steps(2) infinite}
@keyframes dr-blink{50%{opacity:.55}}
#dr-root .perfect{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center}
#dr-root .perfect .dir{font-size:12px;color:var(--muted)}
#dr-root .pbar{height:16px;border-radius:99px;background:var(--panel-2);border:1px solid var(--line);position:relative;overflow:hidden}
#dr-root .pbar i{position:absolute;inset:0 auto 0 0;width:0;background:linear-gradient(90deg,var(--ok),var(--slate))}
#dr-root .perfect b{font-family:var(--f-mono);font-size:15px;min-width:5ch;text-align:right}
#dr-root .est{font-size:11.5px;color:var(--muted);text-align:right;margin-top:-4px}
#dr-root .stagewrap{position:relative;flex:1;min-height:200px;border-radius:14px;overflow:hidden;border:1px solid var(--line);background:var(--panel);touch-action:manipulation;user-select:none;-webkit-user-select:none}
#dr-root .stagewrap.shake{animation:dr-shake .35s}
@keyframes dr-shake{20%{transform:translate(-5px,3px)}40%{transform:translate(5px,-3px)}60%{transform:translate(-4px,-2px)}80%{transform:translate(3px,3px)}}
#dr-root #dr-stage{position:absolute;inset:0;width:100%;height:100%;display:block}
#dr-root #dr-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
#dr-root .pop{position:absolute;left:50%;font-family:var(--f-display);font-size:22px;white-space:nowrap;text-shadow:0 2px 0 rgba(0,0,0,.6);animation:dr-rise 1.1s ease-out forwards}
#dr-root .pop.sm{font-size:16px}
@keyframes dr-rise{0%{transform:translate(-50%,0) scale(.7);opacity:0}15%{transform:translate(-50%,-8px) scale(1.15);opacity:1}100%{transform:translate(-50%,-70px) scale(1);opacity:0}}
#dr-root #dr-banner{position:absolute;left:0;right:0;top:0;padding:8px 12px;text-align:center;font-family:var(--f-display);font-size:20px;color:#1a1405;animation:dr-flash .45s steps(2) infinite}
@keyframes dr-flash{50%{filter:brightness(1.3)}}
#dr-root #dr-bubble{position:absolute;left:12px;right:12px;bottom:10px;background:var(--fg);color:#1b1626;border-radius:14px;padding:9px 14px;font-weight:700;font-size:14.5px;text-align:center}
#dr-root #dr-dirSay{position:absolute;right:74px;top:50px;max-width:52%;background:var(--slate);color:#1a1405;border-radius:12px 12px 2px 12px;padding:6px 10px;font-weight:700;font-size:13px}
#dr-root #dr-cut{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:8px;background:rgba(10,8,16,.78);text-align:center;padding:16px}
#dr-root #dr-cut h2{font-family:var(--f-display);font-size:64px;line-height:1;color:var(--slate);animation:dr-slam .35s ease-out}
@keyframes dr-slam{0%{transform:scale(2.4);opacity:0}100%{transform:scale(1);opacity:1}}
#dr-root #dr-cut p{margin:0;font-size:18px;font-weight:700}
#dr-root #dr-cut small{color:var(--ok);font-family:var(--f-display);font-size:22px;letter-spacing:.06em}
#dr-root .below{display:grid;gap:10px;min-height:150px;align-content:end}
#dr-root #dr-choices{display:grid;gap:8px}
#dr-root .ch{background:var(--panel);border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;text-align:left;font-weight:500;font-size:14.5px}
#dr-root .ch:active{border-color:var(--slate);background:var(--panel-2)}
#dr-root .ctimer{height:5px;border-radius:99px;background:var(--panel-2);overflow:hidden}
#dr-root .ctimer i{display:block;height:100%;width:100%;background:var(--slate)}
#dr-root .cue{font-size:12.5px;color:var(--muted)}
#dr-root .slots.dense{gap:8px}
#dr-root .slots.dense .slot{width:62px}
#dr-root .slots.dense .slot .orb{width:56px;height:56px}
#dr-root .slots{display:flex;gap:14px;justify-content:center;padding-bottom:max(4px,env(safe-area-inset-bottom,0px))}
#dr-root .slot{display:grid;justify-items:center;gap:4px;width:76px}
#dr-root .slot .orb{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font-family:var(--f-display);font-size:24px;color:#1a1405;position:relative;overflow:hidden}
#dr-root .slot small{font-size:11.5px;color:var(--muted);white-space:nowrap}
#dr-root .slot .cd{position:absolute;inset:0;background:conic-gradient(rgba(14,11,20,.78) var(--p,0%),transparent 0);}
#dr-root .slot .cdn{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--f-mono);font-size:15px;font-weight:700;color:#fff;text-shadow:0 1px 2px #000}
#dr-root .slot.hot::after{content:'지금!';position:absolute;top:-6px;right:2px;background:#ff3d6e;color:#fff;font-size:10px;font-weight:900;border-radius:8px;padding:1px 6px;animation:dr-pulse .5s ease-in-out infinite alternate;z-index:3}
#dr-root .slot{position:relative}
#dr-root .slot.hot .orb{animation:dr-pulse .5s ease-in-out infinite alternate;box-shadow:0 0 0 4px var(--bg),0 0 0 7px var(--slate)}
@keyframes dr-pulse{to{transform:scale(1.1)}}
#dr-root .slot.pas .orb{opacity:.55}
#dr-root .slot.emptyslot .orb{background:none;border:2px dashed var(--line);color:var(--muted)}
#dr-root #dr-result{position:absolute;inset:0;background:var(--bg);z-index:5;padding-inline:16px;padding-block:18px;overflow-y:auto;display:flex;flex-direction:column;gap:14px}
#dr-root #dr-result[hidden]{display:none}
#dr-root .rating{text-align:center;display:grid;gap:2px;padding-block:6px}
#dr-root .rating .big{font-family:var(--f-display);font-size:76px;line-height:1;color:var(--slate)}
#dr-root .rating .big small{font-size:28px}
#dr-root .rating p{margin:0;color:var(--muted)}
#dr-root .rows{display:grid;gap:0;border:1px solid var(--line);border-radius:12px;overflow:hidden}
#dr-root .rows>div{display:flex;justify-content:space-between;gap:12px;padding:10px 14px;border-bottom:1px solid var(--line);background:var(--panel)}
#dr-root .rows>div:last-child{border:0}
#dr-root .rows b{font-family:var(--f-body);font-variant-numeric:tabular-nums;text-align:right}
#dr-root .btns{display:grid;gap:8px;padding-bottom:max(8px,env(safe-area-inset-bottom,0px))}
#dr-root .btn{border-radius:12px;padding:13px 16px;font-weight:700;text-align:center;border:1.5px solid var(--line);background:var(--panel)}
#dr-root .btn.pri{background:var(--slate);color:#1a1405;border-color:var(--slate);font-family:var(--f-display);font-size:18px;font-weight:400}
#dr-root .btn[disabled]{opacity:.45}
#dr-root .drop{display:flex;gap:12px;align-items:center;border:1.5px solid var(--adl);border-radius:12px;padding:10px 14px;background:var(--panel)}
#dr-root #dr-snack{position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:var(--fg);color:#1b1626;border-radius:99px;padding:8px 16px;font-weight:700;font-size:13px;z-index:9;max-width:calc(100% - 32px);text-align:center}
#dr-root .ic{background-size:cover;background-position:center;background-repeat:no-repeat;color:transparent;font-size:0!important;outline:2.5px solid transparent;outline-offset:1px}
#dr-root .ic.c-감정{outline-color:var(--emo)}
#dr-root .ic.c-액션{outline-color:var(--act)}
#dr-root .ic.c-애드리브{outline-color:var(--adl)}
#dr-root .ic.c-보조{outline-color:var(--aux)}
#dr-root .dav{width:56px;height:56px;border-radius:50%;background-color:var(--panel-2);background-size:cover;background-position:center;border:1.5px solid var(--line);flex:none}
#dr-root .dopt{grid-template-columns:56px 1fr;align-items:center;column-gap:12px}
#dr-root .dopt>div{display:grid;gap:3px;min-width:0}
#dr-root #dr-dirPic{position:absolute;top:46px;right:10px;z-index:2}
#dr-root .dav.sth{border-radius:10px;width:64px;height:64px}
#dr-root .dopt.sc{grid-template-columns:64px 1fr}
@media (prefers-reduced-motion:reduce){#dr-root .pop,#dr-root #dr-banner,#dr-root .slot.hot .orb,#dr-root .timebar.low i,#dr-root #dr-cut h2,#dr-root .stagewrap.shake{animation:none}}
#dr-root .face{background-size:cover;background-position:center top}
#dr-root .face.lockd{filter:grayscale(1) brightness(.55)}
#dr-root .ic.ic-smile{background-image:url(drama/icons/smile.png)}
#dr-root .ic.ic-gaze{background-image:url(drama/icons/gaze.png)}
#dr-root .ic.ic-sob{background-image:url(drama/icons/sob.png)}
#dr-root .ic.ic-tears{background-image:url(drama/icons/tears.png)}
#dr-root .ic.ic-rage{background-image:url(drama/icons/rage.png)}
#dr-root .ic.ic-dead{background-image:url(drama/icons/dead.png)}
#dr-root .ic.ic-chase{background-image:url(drama/icons/chase.png)}
#dr-root .ic.ic-wire{background-image:url(drama/icons/wire.png)}
#dr-root .ic.ic-act{background-image:url(drama/icons/act.png)}
#dr-root .ic.ic-stunt{background-image:url(drama/icons/stunt.png)}
#dr-root .ic.ic-laugh{background-image:url(drama/icons/laugh.png)}
#dr-root .ic.ic-adlib{background-image:url(drama/icons/adlib.png)}
#dr-root .ic.ic-song{background-image:url(drama/icons/song.png)}
#dr-root .ic.ic-makeup{background-image:url(drama/icons/makeup.png)}
#dr-root .ic.ic-guard{background-image:url(drama/icons/guard.png)}
#dr-root .ic.ic-extend{background-image:url(drama/icons/extend.png)}
#dr-root .ic.ic-chemi{background-image:url(drama/icons/chemi.png)}
#dr-root .ic.ic-close{background-image:url(drama/icons/close.png)}
#dr-root .ic.ic-memo{background-image:url(drama/icons/memo.png)}
#dr-root .ic.ic-dash{background-image:url(drama/icons/dash.png),url(drama/icons/chase.png)}
#dr-root .ic.ic-tumble{background-image:url(drama/icons/tumble.png),url(drama/icons/wire.png)}
#dr-root .ic.ic-gag{background-image:url(drama/icons/gag.png),url(drama/icons/laugh.png)}
#dr-root .ic.ic-hum{background-image:url(drama/icons/hum.png),url(drama/icons/song.png)}
#dr-root .ic.ic-one{background-image:url(drama/icons/one.png)}
#dr-root .dr.dr-calm{background-image:url(drama/dir/calm.png)}
#dr-root .dr.dr-feel{background-image:url(drama/dir/feel.png)}
#dr-root .dr.dr-fun{background-image:url(drama/dir/fun.png)}
#dr-root .bg-letter{background-image:url(drama/bg/thumb-letter.jpg)}
#dr-root .bg-dawn{background-image:url(drama/bg/thumb-dawn.jpg)}
#dr-root .bg-romance{background-image:url(drama/bg/thumb-letter.jpg)}
#dr-root .bg-action{background-image:url(drama/bg/thumb-dawn.jpg)}
#dr-root .bg-comedy{background-image:url(drama/bg/thumb-comedy.jpg)}
#dr-root .bg-horror{background-image:url(drama/bg/thumb-horror.jpg)}
#dr-root .bg-umbrella{background-image:url(drama/bg/thumb-umbrella.jpg)}
#dr-root .bg-warehouse{background-image:url(drama/bg/thumb-warehouse.jpg)}
#dr-root .bg-cafe{background-image:url(drama/bg/thumb-cafe.jpg)}
#dr-root .bg-elevator{background-image:url(drama/bg/thumb-elevator.jpg)}
#dr-root .bg-camp{background-image:url(drama/bg/thumb-camp.jpg)}
#dr-root .bg-school{background-image:url(drama/bg/thumb-school.jpg)}
#dr-root .face{background-image:var(--face);background-color:var(--panel-2)}
#dr-root .bookbtn{display:grid;grid-template-columns:64px 1fr;column-gap:12px;align-items:center;width:100%;text-align:left;padding:12px 14px 12px 18px;border-radius:6px 16px 16px 6px;border:1.5px solid var(--line);border-left:10px solid var(--slate);background:linear-gradient(135deg,var(--panel),var(--panel-2));box-shadow:2px 3px 0 rgba(0,0,0,.25);position:relative}
#dr-root .bookbtn>div{display:grid;gap:3px;min-width:0}
#dr-root .bookbtn .hintl{font-size:12px;color:var(--slate);font-weight:700;text-align:right}
#dr-root #dr-book{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.78);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;gap:12px}
#dr-root #dr-book[hidden]{display:none}
#dr-root .bk{display:flex;width:100%;max-width:360px;min-height:300px;border-radius:8px 18px 18px 8px;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,.5);perspective:900px}
#dr-root .bk-spine{width:22px;flex:none;background:linear-gradient(90deg,#6b4a1e,#a8782f 60%,#8d6325);box-shadow:inset -3px 0 6px rgba(0,0,0,.35)}
#dr-root .bk-page{flex:1;padding:18px 16px;background:linear-gradient(135deg,#fff8e6,#f3e3bd);color:#2a1d0a;display:grid;gap:10px;align-content:start;cursor:pointer;transform-origin:left center;position:relative}
#dr-root .bk-page.flip{animation:bkFlip .32s ease-out}
@keyframes bkFlip{from{transform:rotateY(-75deg);opacity:.3}to{transform:rotateY(0);opacity:1}}
#dr-root .bk-top{display:flex;gap:12px;align-items:center}
#dr-root .bk-t{font-family:var(--f-display);font-size:22px;line-height:1.2}
#dr-root .bk-page .tag{background:rgba(0,0,0,.1);color:#4a3715;border-color:rgba(0,0,0,.15)}
#dr-root .bk-d{font-size:14px;line-height:1.55}
#dr-root .bk-s{font-size:12.5px;color:#6b5527;line-height:1.5}
#dr-root .bk-n{font-size:12.5px;color:#a8460f;font-weight:700}
#dr-root .bk-tap{position:absolute;right:12px;bottom:8px;font-size:12px;color:#8d6325;font-weight:700}
#dr-root .bk-pg{color:#fff;font-weight:700;font-size:13px}
#dr-root .bk-btns{display:flex;gap:8px;width:100%;max-width:360px}
#dr-root .bk-btns .btn{flex:1;padding:12px 8px}
#dr-root .bk-dir{width:92px;height:92px;border-radius:50%;margin:4px auto 0}
`;
const HTML=`<div id="dr-app">
  <section id="dr-prep" class="screen"></section>
  <section id="dr-shoot" class="screen" hidden>
    <div class="hud">
      <div class="timebar" id="dr-timebar"><i id="dr-timeFill"></i><b id="dr-timeNum">60.0초</b></div>
      <div class="perfect"><span class="dir" id="dr-dirName"></span><div class="pbar"><i id="dr-pFill"></i></div><b id="dr-pNum">0%</b></div>
      <div class="est" id="dr-est">예상 시청률 0.4%</div>
    </div>
    <div class="stagewrap" id="dr-stageWrap">
      <canvas id="dr-stage"></canvas>
      <div id="dr-fx"></div>
      <div id="dr-banner" hidden></div>
      <div id="dr-dirPic" class="dav dr"></div>
      <div id="dr-dirSay" hidden></div>
      <div id="dr-bubble" hidden></div>
      <div id="dr-cut" hidden><h2>CUT!!</h2><p>OK! 이걸로 갑시다!</p><small>PERFECT SCENE</small><p id="dr-cutBonus" class="mono" style="font-size:14px;color:var(--muted)"></p></div>
    </div>
    <div class="below">
      <div id="dr-choices"></div>
      <div class="slots" id="dr-slots"></div>
    </div>
  </section>
  <section id="dr-result" hidden></section>
</div>
<div id="dr-snack" hidden></div>
<div id="dr-book" hidden></div>`;
(function fonts(){if(document.getElementById('dr-fonts'))return;const l=document.createElement('link');l.id='dr-fonts';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=JetBrains+Mono:wght@500;700&family=Noto+Sans+KR:wght@400;500;700&display=swap';document.head.appendChild(l)})();
const st=document.createElement('style');st.id='dr-style';st.textContent=CSS;document.head.appendChild(st);
const R=document.createElement('div');R.id='dr-root';R.hidden=true;R.innerHTML=HTML;document.body.appendChild(R);

"use strict";
/* ====================== DATA ====================== */
const FAME_DAILY=3;
const CFG={SK:0.6,AUTO:0.25,TIME:60,TAPWIN:1.6,CHANCE:2.5,CHOICE:3,HEAL_FREE:3,SMALL:10000000,BIG:28000000,SLOT_MAX:5,SLOT_EXP_MAX:2,SLOT_DROP:0.04,SLOT_DROP_GOOD:0.08};
const SLOTX='슬롯 확장권';
const GR={'일반':0,'레어':1,'히든':2,'프리미엄':3};
const CATS=['감정','액션','애드리브','보조'];
const KIND_LABEL={emotion:'감정',action:'액션',adlib:'애드리브'};
const KIND_COLOR={emotion:'var(--emo)',action:'var(--act)',adlib:'var(--adl)'};
const KIND_BANNER={emotion:'EMOTION CHANCE!',action:'ACTION CHANCE!',adlib:'AD-LIB CHANCE!'};
const TONE_TRAIT={'수줍음':'plain','당당함':'funny','감성':'emotional'};
const fmt=n=>Math.round(n*10)/10;
/* ── 스킬 숙련도 ── 스킬을 쓸 때마다 경험치가 쌓여서 Lv.1 → Lv.10 (스킬 종류별로 따로 올라가요)
   레벨이 오를수록 효과가 세지고 쿨타임이 줄어요. 아래 숫자만 바꾸면 밸런스 조절 가능! */
const MAST_XP=[0,5,12,22,35,52,75,105,145,200]; // Lv.1~10 에 도달하는 누적 경험치
const MAST_MAX=10;
const MAST_PER=0.05;   // 레벨 1 오를 때마다 효과 +5%  (Lv.10 = +45%)
const MAST_CD=0.02;    // 레벨 1 오를 때마다 쿨타임 -2% (Lv.10 = -18%)
const MAST_SUCC=0.02;  // 레벨 1 오를 때마다 도박 스킬(스턴트·애드리브·즉흥노래) 성공률 +2%p
const MAST_HIT=2;      // 찬스 타이밍에 맞춰 쓰면 경험치 2 (평소엔 1)
const BOOK_XP=5;   // 스킬북 1권 = 같은 종류 스킬 숙련 경험치 +5 (탐험·팬덤 원정에서 드랍 → skillbook.js / broadcast-expedition.js, 거래소에서도 거래)
const BOOKS={'감정':{n:'감정 스킬북',e:'📕'},'액션':{n:'액션 스킬북',e:'📙'},'애드리브':{n:'애드리브 스킬북',e:'📗'},'보조':{n:'보조 스킬북',e:'📘'}};   // 이름은 skillbook.js / broadcast-expedition.js / trade.js 와 같아야 해요
const BOOK_OLD='스킬북';   // 예전에 얻은 범용 스킬북: 아무 스킬에나 쓸 수 있게 그대로 인정
let MCTX=1,MLV=1;      // 스킬 설명글을 숙련도 기준으로 만들 때만 잠깐 쓰는 값
const mastXp=id=>(S&&S.mast&&S.mast[id])||0;
const mastLv=id=>{const x=mastXp(id);let l=1;for(let i=1;i<MAST_MAX;i++)if(x>=MAST_XP[i])l=i+1;return l};
const mastMult=id=>1+(mastLv(id)-1)*MAST_PER;
const mastCd=id=>1-(mastLv(id)-1)*MAST_CD;
const MM=()=>G&&G.curSkill?mastMult(G.curSkill):1;
const ML=()=>G&&G.curSkill?mastLv(G.curSkill):1;
const pr=(b,lv)=>Math.min(.95,b+MAST_SUCC*(lv-1));
const bd=n=>Math.round(n*MCTX), bu=n=>Math.round(n*MM());
function addMast(id,n){if(!S.mast)S.mast={};const b=mastLv(id);S.mast[id]=Math.min(MAST_XP[MAST_MAX-1],mastXp(id)+n);return mastLv(id)>b}
function dtext(id){MCTX=mastMult(id);MLV=mastLv(id);try{return SKILLS[id].d()}finally{MCTX=1;MLV=1}}
const sc=v=>fmt(v*CFG.SK*MCTX);
const won=n=>'₩'+Math.round(n).toLocaleString('ko-KR');

const CHARS=[
 {id:'minjun',name:'민준',trait:'당당함',color:'#7fd1ae',init:'민'},
 {id:'sion',name:'시온',trait:'감성',color:'#b793ff',init:'시'},
 {id:'doyun',name:'도윤',trait:'당당함',color:'#ff9d4a',init:'도'},
 {id:'harin',name:'하린',trait:'수줍음',color:'#7fc8ff',init:'하'},
 {id:'yuna',name:'윤아',trait:'수줍음',color:'#ffb3d1',init:'윤'},
 {id:'ara',name:'아라',trait:'감성',color:'#ff7aa8',init:'아'}
];
const BASE_SLOTS={'일반':1,'레어':2,'히든':3};
const CAP=10;
const PAY_MULT=20;   // 출연료 전체 배율 (팬덤 원정 수입에 맞춰 올림. 이 숫자만 바꾸면 조절됨)
const DIRS=[
 {id:'calm',name:'한결 감독',style:'담백파',hint:'절제된 연기를 좋아한다는 소문이 있어요.',tone:'plain',
  wrong:{emotional:'음… 너무 과해.',funny:'지금 웃을 장면 아니야.'}},
 {id:'feel',name:'서하늘 감독',style:'감정파',hint:'배우가 감정을 쏟아낼 때 눈이 반짝여요.',tone:'emotional',
  wrong:{plain:'감정이 안 실렸어.',funny:'분위기 깨지잖아.'}},
 {id:'fun',name:'오지호 감독',style:'유머파',hint:'현장 분위기가 늘 가벼운 편이에요.',tone:'funny',
  wrong:{plain:'너무 심심한데?',emotional:'너무 무거워. 좀 풀어봐.'}}
];
const RIGHT_LINES=['좋아! 그대로 가!','그거야, 바로 그거!','오케이, 느낌 온다!'];
const SCRIPTS=[
 {id:'letter',title:'첫사랑의 편지',genre:'로맨스',cast:1,desc:'오랜만에 만난 첫사랑에게 편지를 건네는 단막극',
  ev:[
  {t:4,type:'tap',line:'오랜만이야.'},
  {t:8,type:'choice',cue:'(편지를 건네며) 그동안 잘 지냈어?',o:{plain:'응, 잘 지냈어.',emotional:'매일 네 생각했어.',funny:'너 머리 왜 그래?'}},
  {t:14,type:'tap',line:'이 편지, 아직 갖고 있었구나.'},
  {t:18,type:'chance',kind:'emotion',line:'가지 마… 나 아직 할 말 있어.'},
  {t:24,type:'choice',cue:'(돌아서는 그를 붙잡는다)',o:{plain:'… 잘 가.',emotional:'가지 마. 제발.',funny:'택시비는 내가 낼게.'}},
  {t:30,type:'tap',line:'나 사실… 처음부터 알고 있었어.'},
  {t:34,type:'chance',kind:'adlib',line:'(상대 배우가 대사를 끝낸다)'},
  {t:40,type:'choice',cue:'(눈을 피하는 그에게)',o:{plain:'괜찮아. 이해해.',emotional:'나 아직도 여기 있어.',funny:'편지 읽다 졸았지?'}},
  {t:46,type:'tap',line:'그때는 말하지 못했어.'},
  {t:50,type:'chance',kind:'emotion',line:'그때 하지 못한 말, 지금 할게.'},
  {t:55,type:'choice',cue:'(마지막 대사)',o:{plain:'잘 지내.',emotional:'사랑했어, 많이.',funny:'답장은 빨리 줘!'}}
 ]},
 {id:'dawn',title:'새벽 추격',genre:'액션',cast:1,desc:'새벽 옥상에서 벌어지는 추격 단막극',
  ev:[
  {t:4,type:'tap',line:'거기 서!'},
  {t:8,type:'choice',cue:'(막다른 옥상 끝에서)',o:{plain:'더 갈 곳 없어.',emotional:'왜 너였어야 했어.',funny:'엘리베이터 타고 올걸.'}},
  {t:14,type:'tap',line:'증거는 이미 넘겼어.'},
  {t:18,type:'chance',kind:'action',line:'(상대가 몸을 날린다)'},
  {t:24,type:'choice',cue:'(숨을 몰아쉬며)',o:{plain:'끝났어.',emotional:'널 놓치기 싫었어.',funny:'운동 좀 할걸.'}},
  {t:30,type:'tap',line:'이쪽이 마지막 출구야.'},
  {t:34,type:'chance',kind:'adlib',line:'(상대 배우가 대사를 끝낸다)'},
  {t:40,type:'choice',cue:'(손을 내밀며)',o:{plain:'이리 와.',emotional:'같이 가자, 제발.',funny:'손 잡아, 안 물어.'}},
  {t:46,type:'tap',line:'날이 밝아온다.'},
  {t:50,type:'chance',kind:'action',line:'(마지막 격투)'},
  {t:55,type:'choice',cue:'(마지막 대사)',o:{plain:'수고했어.',emotional:'고마웠어, 정말.',funny:'커피 한잔할래?'}}
 ]}
 ,{id:'moving',title:'이사 첫날',genre:'코미디',cast:1,desc:'짐도 못 푼 새 집에서 벌어지는 소동극',
  ev:[
  {t:4,type:'tap',line:'여기가 우리 집이야?'},
  {t:8,type:'choice',cue:'(박스 더미 앞에서) 이 집 어때?',o:{plain:'생각보다 괜찮네.',emotional:'우리 첫 집이야, 감동이다.',funny:'박스가 집주인 같은데?'}},
  {t:14,type:'tap',line:'짐이 왜 이렇게 많아…'},
  {t:18,type:'chance',kind:'adlib',line:'(소파가 문에 끼었다)'},
  {t:24,type:'choice',cue:'(소파를 밀며) 이거 어떡하지?',o:{plain:'일단 다시 빼보자.',emotional:'이 소파, 우리 추억인데…',funny:'소파야, 다이어트 좀 하자.'}},
  {t:30,type:'tap',line:'잠깐, 이거 누구 박스야?'},
  {t:34,type:'chance',kind:'emotion',line:'(옛 사진첩이 떨어진다)'},
  {t:40,type:'choice',cue:'(사진을 주워 들며)',o:{plain:'이건 나중에 보자.',emotional:'우리 이때 참 젊었다.',funny:'이 헤어스타일 뭐야?'}},
  {t:46,type:'tap',line:'이삿짐센터 아저씨 가셨어!'},
  {t:50,type:'chance',kind:'adlib',line:'(전등이 갑자기 나간다)'},
  {t:55,type:'choice',cue:'(마지막 대사)',o:{plain:'오늘은 여기까지.',emotional:'그래도 우리 집이라 좋다.',funny:'내일은 이사 말고 휴가 가자.'}}
 ]}
 ,{id:'ramen',title:'야식 대소동',genre:'코미디',cast:1,desc:'새벽 두 시, 마지막 라면을 두고 벌어지는 선택 폭주극',
  ev:[
  {t:3,type:'choice',cue:'(냄비를 들며) 라면 끓일까?',o:{plain:'응, 하나만 끓이자.',emotional:'너랑 먹는 야식이 제일 좋아.',funny:'이 시간에 라면은 범죄지.'}},
  {t:9,type:'tap',line:'물은 내가 맞출게.'},
  {t:13,type:'choice',cue:'(스프를 뜯으며) 계란 넣을래?',o:{plain:'넣자.',emotional:'계란은 사랑이지.',funny:'계란 안 넣으면 신고할 거야.'}},
  {t:19,type:'chance',kind:'adlib',line:'(국물이 넘친다)'},
  {t:25,type:'choice',cue:'(젓가락을 들고) 누가 먼저 먹을래?',o:{plain:'네가 먼저 먹어.',emotional:'네가 먼저 먹는 거 보고 싶어.',funny:'가위바위보로 결정하자.'}},
  {t:31,type:'tap',line:'앗, 뜨거!'},
  {t:35,type:'chance',kind:'emotion',line:'(마지막 한 가닥이 남았다)'},
  {t:41,type:'choice',cue:'(젓가락이 부딪힌다)',o:{plain:'네가 먹어.',emotional:'우리 반씩 나눠 먹자.',funny:'이건 결투야.'}},
  {t:47,type:'tap',line:'배 터질 것 같아…'},
  {t:55,type:'choice',cue:'(국물을 마시며)',o:{plain:'맛있었어.',emotional:'오늘 같이 먹어서 좋았어.',funny:'내일부터 다이어트다.'}}
 ]}
 ,{id:'hospital',title:'폐병원의 밤',genre:'공포',cast:1,desc:'불 꺼진 병원 복도에서 벌어지는 스릴러',
  ev:[
  {t:4,type:'tap',line:'여기… 아무도 없어?'},
  {t:8,type:'choice',cue:'(어둠 속 발소리가 들린다)',o:{plain:'바람 소리겠지.',emotional:'무서워… 나 혼자 두지 마.',funny:'귀신 선배님, 사인 하나만요.'}},
  {t:14,type:'tap',line:'불이 왜 꺼졌지?'},
  {t:18,type:'chance',kind:'action',line:'(뒤에서 무언가 달려온다)'},
  {t:24,type:'choice',cue:'(휠체어가 저절로 굴러온다)',o:{plain:'침착하자. 이건 현실이야.',emotional:'제발… 오지 마.',funny:'장애물 달리기 하는 거야?'}},
  {t:30,type:'tap',line:'저 문 안쪽에서 소리가 나.'},
  {t:34,type:'chance',kind:'emotion',line:'(벽에 낡은 사진이 걸려 있다)'},
  {t:40,type:'choice',cue:'(속삭이듯) 저 사진 속 사람은…',o:{plain:'기록을 확인해 보자.',emotional:'이 사람, 아직 여기 있어.',funny:'포토존인가 봐.'}},
  {t:46,type:'tap',line:'출구가 막혔어!'},
  {t:50,type:'chance',kind:'action',line:'(마지막 도망)'},
  {t:55,type:'choice',cue:'(마지막 대사)',o:{plain:'나가자. 지금.',emotional:'다시는 안 올 거야.',funny:'리뷰는 별 한 개다.'}}
 ]}
 ,{id:'patrol',title:'마지막 순찰',genre:'공포',cast:1,desc:'야간 순찰 중 마주친 이상한 소리 · 탭이 많은 대본',
  ev:[
  {t:3,type:'tap',line:'순찰 시작합니다.'},
  {t:7,type:'tap',line:'이상 없음.'},
  {t:11,type:'choice',cue:'(어디선가 물 떨어지는 소리)',o:{plain:'배관 소리일 거야.',emotional:'누가 날 부르는 것 같아.',funny:'수도꼭지 잠그고 갈게요.'}},
  {t:17,type:'chance',kind:'action',line:'(그림자가 빠르게 스쳐 지나간다)'},
  {t:22,type:'tap',line:'방금 뭐였지?'},
  {t:26,type:'tap',line:'(손전등이 깜빡인다)'},
  {t:30,type:'chance',kind:'emotion',line:'(어린아이 웃음소리)'},
  {t:36,type:'tap',line:'다시 한번만 비춰 보자.'},
  {t:40,type:'chance',kind:'adlib',line:'(무전기에서 잡음이 흐른다)'},
  {t:46,type:'tap',line:'응답하세요!'},
  {t:50,type:'choice',cue:'(마지막 대사)',o:{plain:'상황 종료.',emotional:'제발… 아무도 없길.',funny:'야근 수당 두 배는 받아야겠다.'}}
 ]}
 ,{id:'umbrella',title:'우산 하나, 둘이서',genre:'로맨스',cast:2,desc:'비 오는 날 하나뿐인 우산 아래서 벌어지는 2인 단막극',
  ev:[
  {t:4,type:'tap',line:'{p1}, 우산 안 가져왔어?'},
  {t:8,type:'choice',cue:'(처마 밑에 선 {p1}에게 다가가며)',o:{plain:'같이 쓰고 가.',emotional:'네가 젖는 게 싫어서 그래.',funny:'내 우산 비싼 거니까 조심해.'}},
  {t:14,type:'tap',line:'어깨… 다 젖었잖아.'},
  {t:18,type:'chance',kind:'emotion',line:'({p1}의 손이 내 손목을 붙잡는다)'},
  {t:24,type:'choice',cue:'({p1}, 우산을 내 쪽으로 기울인다)',o:{plain:'고마워.',emotional:'왜 자꾸 나한테만 잘해줘.',funny:'우산 요금은 따로 받는다?'}},
  {t:30,type:'tap',line:'심장 소리, 들리는 거 아니야?'},
  {t:34,type:'chance',kind:'adlib',line:'(갑자기 우산이 확 뒤집힌다)'},
  {t:40,type:'choice',cue:'(버스가 도착한다)',o:{plain:'먼저 타.',emotional:'조금만 더 있다 가자.',funny:'버스야, 제발 늦게 와라.'}},
  {t:46,type:'tap',line:'내일도 비 왔으면 좋겠다.'},
  {t:50,type:'chance',kind:'emotion',line:'(말없이 {p1}의 눈을 바라본다)'},
  {t:55,type:'choice',cue:'(마지막 대사)',o:{plain:'잘 가.',emotional:'사실 많이 좋아해.',funny:'우산값은 데이트로 갚아.'}}
 ]}
 ,{id:'warehouse',title:'수상한 창고',genre:'액션',cast:2,desc:'어둠 속 창고에서 파트너와 등을 맞대는 2인 액션',
  ev:[
  {t:4,type:'tap',line:'{p1}, 신호 줘.'},
  {t:8,type:'choice',cue:'(창고 문 앞에서 {p1}에게 눈짓하며)',o:{plain:'내가 먼저 들어갈게.',emotional:'무슨 일 있으면 너부터 도망쳐.',funny:'노크부터 할까?'}},
  {t:14,type:'tap',line:'등 뒤는 맡길게.'},
  {t:18,type:'chance',kind:'action',line:'(어둠 속에서 누군가 덮쳐 온다)'},
  {t:24,type:'choice',cue:'(숨죽인 채 {p1}에게 속삭인다)',o:{plain:'왼쪽 통로야.',emotional:'살아서 나가자, 둘 다.',funny:'여기 월세 얼마래?'}},
  {t:30,type:'tap',line:'증거는 저 금고 안에 있어.'},
  {t:34,type:'chance',kind:'adlib',line:'(경보음이 요란하게 울린다)'},
  {t:40,type:'choice',cue:'({p1} 쪽으로 손을 뻗는다)',o:{plain:'뛰어!',emotional:'내 손 놓지 마.',funny:'택시 불렀어, 3분 남았어.'}},
  {t:46,type:'tap',line:'문 닫히기 전에!'},
  {t:50,type:'chance',kind:'action',line:'(마지막 몸싸움)'},
  {t:55,type:'choice',cue:'(마지막 대사)',o:{plain:'작전 종료.',emotional:'네가 있어서 해냈어.',funny:'보너스는 반반이다.'}}
 ]}
 ,{id:'cafe',title:'마감 십 분 전',genre:'코미디',cast:2,desc:'카페 마감 직전, 진상 손님과 대참사가 터지는 2인 소동극',
  ev:[
  {t:4,type:'tap',line:'마감 십 분 전인데… 손님이 왔어.'},
  {t:8,type:'choice',cue:'(진상 손님 앞, 옆에 선 {p1} 쪽을 흘끗 본다)',o:{plain:'죄송합니다, 주문 마감이에요.',emotional:'저희 정말 지쳤어요…',funny:'그럼 라떼 아트로 사과드릴게요.'}},
  {t:14,type:'tap',line:'우유가 왜 바닥에 있지?'},
  {t:18,type:'chance',kind:'adlib',line:'(쟁반이 공중으로 날아간다)'},
  {t:24,type:'choice',cue:'({p1} 쪽에서 컵이 와장창 깨진다)',o:{plain:'괜찮아, 같이 치우자.',emotional:'다친 데 없어? 제발.',funny:'저건 월급에서 깐다.'}},
  {t:30,type:'tap',line:'마감 전에 끝낼 수 있겠지?'},
  {t:34,type:'chance',kind:'emotion',line:'({p1}의 눈에 눈물이 고인다. 오늘이 마지막 출근이었다)'},
  {t:40,type:'choice',cue:'(조용해진 매장)',o:{plain:'수고했어.',emotional:'같이 일해서 행복했어.',funny:'퇴사 선물로 머그컵 줄게.'}},
  {t:46,type:'tap',line:'불 끄기 전에, 한 장 찍자.'},
  {t:50,type:'chance',kind:'adlib',line:'(폭죽이 갑자기 펑 터진다)'},
  {t:55,type:'choice',cue:'(마지막 대사)',o:{plain:'내일 보자.',emotional:'그동안 정말 고마웠어.',funny:'마감 알바 구함, 연락 바람.'}}
 ]}
 ,{id:'elevator',title:'멈춰 선 엘리베이터',genre:'공포',cast:2,desc:'불이 꺼진 엘리베이터 안, 둘뿐인 줄 알았던 2인 스릴러',
  ev:[
  {t:3,type:'tap',line:'엘리베이터가… 멈췄어.'},
  {t:7,type:'tap',line:'{p1}, 비상벨 눌러 봐.'},
  {t:11,type:'choice',cue:'(불이 깜빡이다 툭 꺼진다)',o:{plain:'침착해, 곧 올 거야.',emotional:'무서워, 옆에 있어 줘.',funny:'여기 와이파이는 터지나?'}},
  {t:17,type:'chance',kind:'action',line:'(문틈으로 손이 쑥 들어온다)'},
  {t:22,type:'tap',line:'방금… 층수가 올라갔어.'},
  {t:26,type:'tap',line:'({p1}의 숨소리만 들린다)'},
  {t:30,type:'chance',kind:'emotion',line:'(어둠 속에서 속삭임이 들린다)'},
  {t:36,type:'tap',line:'누가 우리 이름을 불러.'},
  {t:40,type:'chance',kind:'adlib',line:'(거울에 비친 건… 우리 둘뿐일까?)'},
  {t:46,type:'tap',line:'문이 열린다!'},
  {t:50,type:'chance',kind:'action',line:'(열린 문으로 달려 나간다)'},
  {t:55,type:'choice',cue:'(마지막 대사)',o:{plain:'나가자, 지금.',emotional:'같이 가, 손 놓지 마.',funny:'다음엔 계단으로 다니자.'}}
 ]}
 ,{id:'camp',title:'셋이서 캠핑',genre:'코미디',cast:3,desc:'텐트도 불도 말썽, 세 명이 벌이는 캠핑장 소동극',
  ev:[
  {t:4,type:'tap',line:'텐트 폴이 두 개밖에 없는데?'},
  {t:8,type:'choice',cue:'({p1}, {p2} 모두 나를 쳐다본다)',o:{plain:'내가 알아서 할게.',emotional:'다 같이 자려고 온 건데…',funny:'텐트는 포기, 별 보면서 자자.'}},
  {t:14,type:'tap',line:'라면 물은 누가 올렸어?'},
  {t:18,type:'chance',kind:'adlib',line:'(바람에 텐트가 날아간다)'},
  {t:24,type:'choice',cue:'({p2}, 불씨를 살리려다 눈썹이…)',o:{plain:'일단 물부터!',emotional:'다치지 않아서 다행이야.',funny:'새 헤어스타일 잘 어울려.'}},
  {t:30,type:'tap',line:'곰이 나온다던 소문, 진짜일까?'},
  {t:34,type:'chance',kind:'action',line:'(숲속에서 정체불명의 그림자가!)'},
  {t:40,type:'choice',cue:'({p1}, {p2}, 나… 셋이 등을 맞댄다)',o:{plain:'셋이 있으면 괜찮아.',emotional:'무슨 일 있어도 우리 셋이야.',funny:'곰한테 라면 줄까?'}},
  {t:46,type:'tap',line:'…그냥 고라니였네.'},
  {t:50,type:'chance',kind:'emotion',line:'(별빛 아래, 셋이 나란히 눕는다)'},
  {t:55,type:'choice',cue:'(마지막 대사)',o:{plain:'다음엔 호텔로 가자.',emotional:'오늘 밤, 평생 못 잊을 거야.',funny:'이 사진, 프로필로 쓴다.'}}
 ]}
 ,{id:'school',title:'폐교 탐험대',genre:'공포',cast:3,desc:'한밤의 폐교를 셋이서 파헤치는 3인 공포극',
  ev:[
  {t:3,type:'tap',line:'여기가 소문의 그 폐교야.'},
  {t:7,type:'tap',line:'{p1}, 손전등 켜 봐.'},
  {t:11,type:'choice',cue:'(복도 끝에서 발소리가 들린다)',o:{plain:'조용히, 셋이 같이 움직여.',emotional:'{p2}, 내 뒤에 있어.',funny:'졸업 앨범 찍으러 온 건 아니지?'}},
  {t:17,type:'chance',kind:'action',line:'(교실 문이 쾅 닫힌다)'},
  {t:22,type:'tap',line:'칠판에 글씨가… 번지고 있어.'},
  {t:26,type:'tap',line:'({p1}, {p2}의 얼굴이 하얗게 질린다)'},
  {t:30,type:'chance',kind:'emotion',line:'(어디선가 아이들 노랫소리가 들린다)'},
  {t:36,type:'tap',line:'출석부에 우리 이름이 있어.'},
  {t:40,type:'chance',kind:'adlib',line:'(스피커에서 수업 종소리가 울린다)'},
  {t:46,type:'tap',line:'교문이 사라졌어!'},
  {t:50,type:'chance',kind:'action',line:'(셋이 동시에 뛰기 시작한다)'},
  {t:55,type:'choice',cue:'(마지막 대사)',o:{plain:'다신 안 와.',emotional:'모두 무사해서 다행이야.',funny:'이 학교, 별점 한 개.'}}
 ]}
];

/* skills: use(C) with C={chance,scene,mult} ; G helpers below */
const SKILLS={
 smile:{n:'환한 미소',cat:'감정',gr:'일반',cd:8,i:'미',d:()=>`PERFECT +${sc(5)}%`,use:C=>gain(5,C,'환한 미소')},
 gaze:{n:'눈빛연기',cat:'감정',gr:'일반',cd:6,i:'눈',d:()=>`+${sc(4)}%, 다음 판정 구간 +0.3초`,use:C=>{gain(4,C,'눈빛연기');G.nextWin=0.3}},
 sob:{n:'울먹임',cat:'감정',gr:'일반',cd:10,i:'울',d:()=>`+${sc(6)}%, 감정 찬스 +1초`,use:C=>{gain(6,C,'울먹임');G.chExt=1;if(G.active&&G.active.type==='chance'&&!G.active.done)G.active.end+=1}},
 tears:{n:'눈물연기',cat:'감정',gr:'레어',cd:15,i:'눈',chance:'emotion',d:()=>`+${sc(10)}% (감정 찬스 ×1.5)`,use:C=>{gain(10,C,'눈물연기');tearFx()}},
 rage:{n:'분노폭발',cat:'감정',gr:'레어',cd:18,i:'분',d:()=>`+${sc(12)}% 확정`,use:C=>{gain(12,C,'분노폭발');burstFx('#ff5468',22)}},
 dead:{n:'무표정 열연',cat:'감정',gr:'히든',cd:20,i:'무',d:()=>'다음 판정 GOOD 이상 보장',use:C=>{G.good=true;popup('열연 대기','sm','var(--ok)')}},
 dash:{n:'전력 질주',cat:'액션',gr:'일반',cd:8,i:'질',d:()=>`액션씬 +${sc(8)}%, 그 외 +${sc(3)}%`,use:C=>{const a=C.scene==='action';gain(a?8:3,C,'전력 질주');if(a)shakeFx()}},
 tumble:{n:'구르기',cat:'액션',gr:'일반',cd:10,i:'구',d:()=>`+${sc(6)}%, 화제성 +${bd(2)}`,use:C=>{gain(6,C,'구르기');addBuzz(bu(2))}},
 chase:{n:'추격씬',cat:'액션',gr:'레어',cd:25,i:'추',d:()=>`${fmt(8*MCTX)}초간 자동 상승 2배`,use:C=>{G.chaseUntil=G.t+8*MM();popup('추격 2배!','','var(--act)')}},
 wire:{n:'와이어액션',cat:'액션',gr:'레어',cd:22,i:'와',d:()=>`액션씬 +${sc(15)}%, 화제성 +${bd(5)}`,use:C=>{const a=C.scene==='action';gain(a?15:4,C,'와이어');if(a){addBuzz(bu(5));shakeFx()}}},
 act:{n:'액션연기',cat:'액션',gr:'히든',cd:20,i:'액',chance:'action',d:()=>`액션씬 +${sc(22)}%, 그 외 +${sc(5)}%`,use:C=>{const a=C.scene==='action';gain(a?22:5,C,'액션연기');if(a||C.chance)shakeFx()}},
 stunt:{n:'스턴트',cat:'액션',gr:'프리미엄',cd:30,i:'스',d:()=>`${Math.round(pr(.6,MLV)*100)}% +${sc(30)}% / 실패 -3초`,use:C=>{if(Math.random()<pr(.6,ML())){gain(30,C,'스턴트 성공!');shakeFx();burstFx('#ffcf4a',26)}else{addTime(-3);popup('스턴트 실패 -3초','','var(--rec)')}}},
 gag:{n:'썰렁 개그',cat:'애드리브',gr:'일반',cd:9,i:'썰',d:()=>`로맨스 +${sc(8)}%, 그 외 +${sc(3)}%, 화제성 +${bd(3)}`,use:C=>{const r=C.scene==='romance';gain(r?8:3,C,'썰렁 개그');addBuzz(bu(3))}},
 hum:{n:'흥얼거리기',cat:'애드리브',gr:'일반',cd:7,i:'흥',d:()=>`+${sc(5)}%, 화제성 +${bd(2)}`,use:C=>{gain(5,C,'흥얼거리기');addBuzz(bu(2))}},
 laugh:{n:'웃음 참기 실패',cat:'애드리브',gr:'레어',cd:15,i:'웃',d:()=>`로맨스 +${sc(10)}%, 화제성 +${bd(8)}`,use:C=>{const r=C.scene==='romance';gain(r?10:3,C,'웃음 참기 실패');if(r)addBuzz(bu(8))}},
 adlib:{n:'애드리브',cat:'애드리브',gr:'히든',cd:25,i:'애',chance:'adlib',d:()=>`${Math.round(pr(.5,MLV)*100)}% +${sc(25)}%, 화제성 +${bd(10)} / 실패 -4초`,use:C=>{if(Math.random()<pr(.5,ML())){gain(25,C,'예상 밖의 명장면!');addBuzz(bu(10));burstFx('#b793ff',30)}else{addTime(-4);popup('NG! 감독 당황 -4초','','var(--rec)');dirSay('…방금 뭐였지?')}}},
 song:{n:'즉흥 노래',cat:'애드리브',gr:'히든',cd:28,i:'노',d:()=>`${Math.round(pr(.7,MLV)*100)}% +${sc(20)}% / 실패 -2초`,use:C=>{if(Math.random()<pr(.7,ML())){gain(20,C,'즉흥 노래 대성공!');burstFx('#b793ff',24)}else{addTime(-2);popup('음이탈 -2초','','var(--rec)')}}},
 makeup:{n:'메이크업 수정',cat:'보조',gr:'일반',cd:12,i:'메',d:()=>`화제성 +${bd(5)}`,use:C=>{const b=bu(5);addBuzz(b);popup(`화제성 +${b}`,'sm','var(--aux)')}},
 guard:{n:'NG 방지',cat:'보조',gr:'일반',cd:20,i:'방',d:()=>`다음 NG ${1+(MLV>=5?1:0)+(MLV>=10?1:0)}회 무효`,use:C=>{const n=1+(ML()>=5?1:0)+(ML()>=10?1:0);G.ng+=n;popup(`NG 방지 ${n}회 대기`,'sm','var(--aux)')}},
 extend:{n:'시간 연장',cat:'보조',gr:'레어',cd:30,i:'연',d:()=>`촬영시간 +${fmt(3*MCTX)}초`,use:C=>{const t=3*MM();addTime(t);popup(`촬영시간 +${fmt(t)}초`,'','var(--aux)')}},
 chemi:{n:'케미 부스트',cat:'보조',gr:'레어',cd:18,i:'케',multi:true,d:()=>'2인 이상 대본에서 다음 스킬 ×1.3',use:C=>{if(G.script.cast>1){G.nextMult=1+0.3*mastMult('chemi');popup(`케미 폭발! 다음 ×${fmt(G.nextMult)}`,'sm','var(--aux)')}else popup('1인 대본: 효과 없음','sm','var(--muted)')}},
 close:{n:'클로즈업',cat:'보조',gr:'히든',cd:25,i:'클',d:()=>`다음 스킬 효과 ×${fmt(1+0.5*MCTX)}`,use:C=>{G.nextMult=1+0.5*MM();popup(`클로즈업! 다음 ×${fmt(G.nextMult)}`,'sm','var(--aux)')}},
 memo:{n:'대본 암기',cat:'보조',gr:'일반',cd:0,i:'암',passive:true,d:()=>`판정 구간 +${fmt(0.5*MCTX)}초 (패시브)`,use:C=>{}},
 one:{n:'원테이크',cat:'보조',gr:'프리미엄',cd:40,i:'원',d:()=>`${fmt(10*MCTX)}초간 NG 무효, 게이지 상승 ×1.5`,use:C=>{G.oneUntil=G.t+10*MM();popup('원테이크!','','var(--slate)')}}
};
const DROP={low:{일반:65,레어:30,히든:5,프리미엄:0},high:{일반:40,레어:35,히든:20,프리미엄:5}};
const BG_SRC={romance:'drama/bg/romance.jpg',action:'drama/bg/action.jpg',comedy:'drama/bg/comedy.jpg',horror:'drama/bg/horror.jpg',umbrella:'drama/bg/umbrella.jpg',warehouse:'drama/bg/warehouse.jpg',cafe:'drama/bg/cafe.jpg',elevator:'drama/bg/elevator.jpg',camp:'drama/bg/camp.jpg',school:'drama/bg/school.jpg'};
const GENRE_KEY={'로맨스':'romance','액션':'action','코미디':'comedy','공포':'horror'};
const SCENE_OF={'로맨스':'romance','액션':'action','코미디':'romance','공포':'action'}; // 스킬 보너스 판정용: 코미디=웃음·애드리브 계열, 공포=액션 계열
const ACTS={};
function actImg(id,p){const k=id+p;if(!ACTS[k]){const i=new Image();i.src='drama/actors/'+id+'_'+p+'.png';ACTS[k]=i}return ACTS[k]}
const POSE_OF={sob:'cry',tears:'cry',dead:'cry',smile:'smile',laugh:'smile',adlib:'smile',song:'smile',makeup:'smile',rage:'fist',chase:'fist',wire:'fist',act:'fist',stunt:'fist',one:'fist',close:'fist'};
const BGS={};
function bgKey(sc){return sc&&BG_SRC[sc.id]?sc.id:(GENRE_KEY[sc&&sc.genre]||'romance')}
function bgFor(sc){const k=bgKey(sc);if(!BGS[k]){const i=new Image();i.src=BG_SRC[k];BGS[k]=i}return BGS[k]}
const FAME_GOAL=400;   /* 탑스타 승급에 필요한 인지도 (촬영 1번에 시청률×2 만큼 오름). 저장값(S.fame)은 계속 0~100% 로 두어서 다른 시스템(투자·음악차트)과 호환 */
const RPTS=[[0,.4],[43,2.1],[67,5.8],[89,11.7],[100,15]];
function rating(g){for(let i=1;i<RPTS.length;i++){const[a,b]=RPTS[i-1],[c,d]=RPTS[i];if(g<=c)return b+(d-b)*(g-a)/(c-a)}return 15}

/* ====================== SAVE (포카하우스 데이터 연결) ====================== */
const KEY='ph_drama';
const today=()=>{try{return new Date().toLocaleDateString('sv-SE')}catch(e){return ''+new Date().getDate()}};
function fresh(){
  return {day:today(),free:CFG.HEAL_FREE,potion:0,fame:{},star:{},learned:{},equip:{},
    inv:['smile','sob','memo'].map((s,i)=>({u:i+1,s})),uid:100,sel:{script:'letter',dir:'calm',char:'',card:''},best:0};
}
let S;
function load(){try{const r=localStorage.getItem(KEY);if(r){S=JSON.parse(r)}}catch(e){}
  if(!S||!S.inv)S=fresh();
  if(!S.equip)S.equip={};if(!S.slotExp)S.slotExp={};if(!S.fame)S.fame={};if(!S.star)S.star={};if(!S.learned)S.learned={};if(!S.mast)S.mast={};
  if(S.day!==today()){S.day=today();S.free=CFG.HEAL_FREE}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
load();
/* 게임 본체와 연결: 코인(coins) · 소원의 조각(wishFragments) · 보유 카드(owned/ownedHiddenCards) · 기획사 데뷔(__agencyTest) */
function bagQty(n){try{const b=bagItems.find(i=>i.name===n);return b?b.qty:0}catch(e){return 0}}
const bookQty=cat=>bagQty(BOOKS[cat].n);          // 그 종류 전용 책
const bookAny=cat=>bookQty(cat)+bagQty(BOOK_OLD); // 전용 책 + 예전 범용 책
function slotxQty(){try{const b=bagItems.find(i=>i.name===SLOTX);return b?b.qty:0}catch(e){return 0}}
function saveGame(){try{if(typeof saveAll==='function')saveAll()}catch(e){}}
function debutMap(){try{return (window.__agencyTest&&window.__agencyTest.load().done)||{}}catch(e){return {}}}
const isDebut=id=>!!debutMap()[id];
function awardShards(n){
  if(!n)return;
  for(let i=0;i<n;i++){
    wishFragments++;localStorage.setItem('ph_wish',wishFragments);
    if(wishFragments>=100){
      wishFragments=0;localStorage.setItem('ph_wish',0);
      try{const f=bagItems.find(x=>x.name==='소원의 조각');if(f)useFromBag('소원의 조각',f.qty)}catch(e){}
      if(typeof showWishCrystalEarned==='function')setTimeout(showWishCrystalEarned,1800);
    }else{
      try{addToBag('🧩','소원의 조각','wish',1,'100개 모으면 소원의 결정! (현재: '+wishFragments+'개)')}catch(e){}
    }
  }
}
const TIER_OF={N:'일반',R:'일반',SR:'레어',SSR:'레어',UR:'레어','레어히든':'히든','에픽히든':'히든'};
const RANK={N:0,R:1,SR:2,SSR:3,UR:4,'레어히든':5,'에픽히든':6};
function ownedCards(){
  const out=[];
  if(typeof CARDS!=='undefined')CARDS.forEach(c=>{if(owned.includes(c.id))out.push({id:c.id,char:c.charId,name:c.name,raw:c.grade,img:c.img})});
  if(typeof HIDDEN_CARDS!=='undefined'&&typeof ownedHiddenCards!=='undefined')HIDDEN_CARDS.forEach(h=>{if(ownedHiddenCards.includes(h.id))out.push({id:h.id,char:h.charId,name:h.name,raw:h.grade,img:h.img})});
  return out;
}

/* ====================== HELPERS ====================== */
const $=s=>R.querySelector(s);
const charOf=id=>CHARS.find(c=>c.id===id);
function info(o){const ch=charOf(o.char),g=TIER_OF[o.raw]||'일반';return {id:o.id,char:o.char,name:o.name,raw:o.raw,img:o.img,grade:g,trait:ch.trait,color:ch.color,init:ch.init,slots:Math.min(CFG.SLOT_MAX,BASE_SLOTS[g]+(S.star[o.char]?1:0)+(S.slotExp[o.id]||0))}}
const cardsOf=ch=>ownedCards().filter(x=>x.char===ch).sort((a,b)=>(RANK[b.raw]||0)-(RANK[a.raw]||0)).map(info);
const card=id=>{const o=ownedCards().find(x=>x.id===id);return o?info(o):null};
function pickDefault(){const ok=CHARS.find(c=>isDebut(c.id)&&cardsOf(c.id).length);return ok?ok.id:CHARS[0].id}
const script=()=>SCRIPTS.find(s=>s.id===S.sel.script);
const dir=()=>DIRS.find(d=>d.id===S.sel.dir);
const eq=cid=>(S.equip[cid]||[]).map(u=>S.inv.find(i=>i.u===u)).filter(Boolean);
/* 스킬 세트: 카드마다 1·2·3번 세트를 저장해 두고 한 번에 갈아끼운다. 장착을 바꾸면 쓰는 세트에도 자동 저장 */
const SET_N=3;
let pickU=0;   /* 스킬 목록에서 눌러 고른 스킬(장착/해제 버튼이 아래에 뜸) */
function getSets(cid){if(!S.sets)S.sets={};if(!S.sets[cid])S.sets[cid]={active:1,1:[...(S.equip[cid]||[])],2:[],3:[]};return S.sets[cid]}
function syncSet(cid){const st=getSets(cid);st[st.active||1]=[...(S.equip[cid]||[])]}
function setBar(cid){const st=getSets(cid),ac=st.active||1;return `<div class="slotrow"><span class="lab">세트</span>${[1,2,3].map(n=>`<button class="btn" data-a="set" data-n="${n}" style="padding:8px 16px;font-size:13px;${n===ac?'border:2px solid #FFD700;background:rgba(255,215,0,.15);':''}">${n}번${n===ac?'':` <span style="font-size:10px;color:var(--muted)">${(st[n]||[]).length}</span>`}</button>`).join('')}</div>`}
const onCard=u=>{for(const k in S.equip)if((S.equip[k]||[]).includes(u))return k;return null};
let snackT;
function snack(t){const e=$('#dr-snack');e.textContent=t;e.hidden=false;clearTimeout(snackT);snackT=setTimeout(()=>e.hidden=true,1800)}
const stam=()=>S.free+S.potion;

function scriptInfo(s){
  const k={};s.ev.filter(e=>e.type==='chance').forEach(e=>k[e.kind]=(k[e.kind]||0)+1);
  return `찬스 ${Object.keys(k).map(x=>KIND_LABEL[x]+' '+k[x]).join(' · ')} · 선택 대사 ${s.ev.filter(e=>e.type==='choice').length}회 · 촬영 ${CFG.TIME}초`;
}
/* 책 팝업: 대본/감독을 한 장씩 보여주고, 페이지를 탭하면 다음 장으로 넘어간다 */
let bookK='script',bookI=0;
function bookList(){return bookK==='script'?SCRIPTS:DIRS}
function openBookPop(k){
  bookK=k;const cur=k==='script'?S.sel.script:S.sel.dir;
  bookI=Math.max(0,bookList().findIndex(x=>x.id===cur));
  renderBookPop(false);$('#dr-book').hidden=false;
}
function renderBookPop(flip){
  const L=bookList(),it=L[bookI],isS=bookK==='script',on=(isS?S.sel.script:S.sel.dir)===it.id;
  const page=isS
    ?`<div class="bk-top"><span class="dav sth bg-${bgKey(it)}"></span><div><div class="bk-t">${it.title}</div><div><span class="tag">${it.genre}</span> <span class="tag">${it.cast}인</span></div></div></div>
      <div class="bk-d">${it.desc}</div><div class="bk-s">${scriptInfo(it)}</div>
      ${it.cast>1?`<div class="bk-n">💞 상대역은 촬영할 때 랜덤으로 정해져요 · 출연료 +${it.cast>=3?30:20}% · 케미 부스트 스킬이 효과를 내요</div>`:''}`
    :`<div class="bk-top"><span class="dav dr bk-dir dr-${it.id}" style="margin:0"></span><div><div class="bk-t">${it.name}</div><div>${S.learned[it.id]?`<span class="tag">${it.style} · 성향 파악 완료</span>`:'<span class="tag">성향 미확인</span>'}</div></div></div>
      <div class="bk-d">${it.hint}</div>`;
  $('#dr-book').innerHTML=`<div class="bk"><div class="bk-spine"></div><div class="bk-page ${flip?'flip':''}" data-b="next">${page}<span class="bk-tap">탭하면 다음 ▸</span></div></div>
    <div class="bk-pg">${bookI+1} / ${L.length}</div>
    <div class="bk-btns"><button class="btn" data-b="prev">◂ 이전</button><button class="btn pri" data-b="pick" style="font-size:16px">${on?'✔ 선택됨':'이걸로 결정'}</button><button class="btn" data-b="x">닫기</button></div>`;
}
$('#dr-book').addEventListener('click',e=>{
  const t=e.target.closest('[data-b]');
  if(!t){if(e.target.id==='dr-book')$('#dr-book').hidden=true;return}
  const L=bookList(),b=t.dataset.b;
  if(b==='next'){bookI=(bookI+1)%L.length;renderBookPop(true)}
  else if(b==='prev'){bookI=(bookI-1+L.length)%L.length;renderBookPop(true)}
  else if(b==='x'){$('#dr-book').hidden=true}
  else if(b==='pick'){if(bookK==='script')S.sel.script=L[bookI].id;else S.sel.dir=L[bookI].id;$('#dr-book').hidden=true;renderPrep()}
});
/* ====================== PREP ====================== */
function renderPrep(){
  if(!S.sel.char||!charOf(S.sel.char))S.sel.char=pickDefault();
  const sc_=script(),d_=dir(),ch_=charOf(S.sel.char);
  const list_=cardsOf(ch_.id),hasCard=list_.length>0;
  let c_=card(S.sel.card);if(!c_||c_.char!==ch_.id){c_=list_[0]||null;S.sel.card=c_?c_.id:''}
  if(!c_)c_={id:'',char:ch_.id,name:ch_.name,raw:'-',grade:'일반',slots:0,trait:ch_.trait};
  const lockWhy=!hasCard?`${ch_.name}의 카드가 아직 없어요. 카드를 얻으면 촬영에 나갈 수 있어요.`:`${ch_.name}은(는) 아직 데뷔 전이에요. 광장 기획사에서 데뷔시키면 촬영에 나갈 수 있어요.`;
  const kinds={};sc_.ev.filter(e=>e.type==='chance').forEach(e=>kinds[e.kind]=(kinds[e.kind]||0)+1);
  const kindTxt=Object.keys(kinds).map(k=>`${KIND_LABEL[k]} ${kinds[k]}`).join(' · ');
  const nChoice=sc_.ev.filter(e=>e.type==='choice').length;
  const locked=!isDebut(ch_.id)||!hasCard;
  const mine=eq(c_.id);
  const pips=[];for(let i=0;i<CFG.HEAL_FREE;i++)pips.push(`<span class="pip ${i<S.free?'':'off'}"></span>`);
  for(let i=0;i<S.potion;i++)pips.push('<span class="pip pot"></span>');
  const groups=CATS.map(cat=>{
    const list=S.inv.filter(i=>SKILLS[i.s].cat===cat).sort((a,b)=>GR[SKILLS[b.s].gr]-GR[SKILLS[a.s].gr]);
    if(!list.length)return '';
    return `<div class="grp"><h3>${cat}</h3><div class="chips">${list.map(i=>{
      const k=SKILLS[i.s],oc=onCard(i.u),mineOn=oc===c_.id;
      const picked=pickU===i.u;
      return `<button class="chip ${mineOn?'on':''} ${oc&&!mineOn?'other':''}" data-a="pick" data-u="${i.u}" style="${picked?'border-color:#FFD700;opacity:1;':''}"><span class="dot c-${k.cat} ic ic-${i.s}">${k.i}</span><div><b>${k.n} <span class="tag g-${k.gr}" style="display:inline">${k.gr}</span> <span class="tag" style="display:inline;color:#7ee8a5">Lv.${mastLv(i.s)}${mastLv(i.s)>=MAST_MAX?' MAX':''}</span></b><span>${dtext(i.s)}${k.cd?` · 쿨 ${fmt(k.cd*mastCd(i.s))}초`:''}${mastLv(i.s)<MAST_MAX?` · 숙련 ${mastXp(i.s)}/${MAST_XP[mastLv(i.s)]}`:''}${oc&&!mineOn?` · ${card(oc).name} ${card(oc).grade} 장착중`:''}</span></div></button>${picked?`<button class="btn" data-a="eq" data-u="${i.u}" ${locked?'disabled':''} style="width:100%;padding:11px 12px;font-size:14px;margin-bottom:4px;background:#FFD700;color:#1a1405;border-color:#FFD700">${mineOn?'해제하기':oc&&!mineOn?`${card(oc).name} 카드에서 가져와 장착하기`:'장착하기'}</button>`:''}`}).join('')}</div></div>`}).join('');
  const _sc=$('#dr-prep .scroll'),_top=_sc?_sc.scrollTop:0;
  $('#dr-prep').innerHTML=`
  <div class="scroll">
    <div class="brand"><h1>드라마 촬영</h1><button class="btn" data-a="close" style="padding:6px 14px">닫기</button></div>
    <div class="res">
      <div><div class="lab">보유 골드</div><div class="val mono">${won(coins)}</div></div>
      <div><div class="lab">체력 (오늘 무료 ${S.free}/${CFG.HEAL_FREE}${S.potion?` + 음료 ${S.potion}`:''})</div><div class="pips">${pips.join('')}</div></div>
      <div class="wide"><div class="lab">소원의조각 <span class="mono" style="color:var(--fg)">${wishFragments}/100</span> · 소원의 결정까지</div><div class="bar"><i style="width:${Math.min(100,wishFragments)}%"></i></div></div>
    </div>

    <div class="sec"><h2><span class="n">1</span>대본 선택</h2>
      <button class="bookbtn" data-a="bookpop" data-k="script"><span class="dav sth bg-${bgKey(sc_)}"></span><div><div class="t">📖 ${sc_.title}<span class="tag">${sc_.genre}</span><span class="tag">${sc_.cast}인</span></div><div class="s">${sc_.desc}</div><div class="s">${scriptInfo(sc_)}</div><div class="hintl">📖 눌러서 다른 대본 보기 ▸</div></div></button>
    </div>

    <div class="sec"><h2><span class="n">2</span>감독 선택</h2>
      <button class="bookbtn" data-a="bookpop" data-k="dir"><span class="dav dr dr-${d_.id}"></span><div><div class="t">🎬 ${d_.name}${S.learned[d_.id]?`<span class="tag learned">${d_.style} · 성향 파악 완료</span>`:'<span class="tag">성향 미확인</span>'}</div><div class="s">${d_.hint}</div><div class="hintl">🎬 눌러서 다른 감독 보기 ▸</div></div></button>
    </div>

    <div class="sec"><h2><span class="n">3</span>캐스팅</h2>
      <div class="cards">${CHARS.map(c=>{const open=isDebut(c.id);return `<button class="pc ${c.id===ch_.id?'on':''} ${open?'':'lock'}" data-a="char" data-id="${c.id}"><div class="face ${open?'':'lockd'}" style="--face:url(face-${c.id}.png);background-size:cover;background-position:center top;border:2px solid ${c.color}"></div><b>${c.name}</b><small>${open?(S.star[c.id]?'탑스타':'데뷔 완료'):'연습생'}</small></button>`}).join('')}</div>
      ${locked?`<div class="s" style="color:var(--muted);margin-top:10px">${lockWhy}</div>`:`
      <div class="opts" style="margin-top:10px">${list_.map(c=>`<button class="opt dopt ${c.id===c_.id?'on':''}" data-a="card" data-id="${c.id}"><span class="dav sth" style="background-image:url('${c.img}');border-radius:8px"></span><div><div class="t">${c.name}</div><div class="s"><span class="tag g-${c.grade}">${c.raw}</span> <span class="tag">${c.grade} · 슬롯 ${c.slots}</span> <span class="tag">${c.trait}</span></div></div></button>`).join('')}</div>
      <div class="res" style="margin-top:10px"><div class="wide"><div class="lab">${ch_.name} 인지도 <span class="mono" style="color:var(--fg)">${S.star[ch_.id]?'탑스타':Math.floor(Math.min(100,S.fame[ch_.id]||0)*FAME_GOAL/100)+'/'+FAME_GOAL}</span> · 히든 카드로 하루 첫 ${FAME_DAILY}번 촬영만 올라요 (오늘 ${Math.min(FAME_DAILY,(S.fameDay&&S.fameDay.day===today())?S.fameDay.n:0)}/${FAME_DAILY})</div><div class="bar"><i style="width:${S.star[ch_.id]?100:Math.min(100,S.fame[ch_.id]||0)}%"></i></div>${S.star[ch_.id]?'<div class="s" style="color:var(--muted);font-size:12px;margin-top:6px">탑스타 · 모든 카드 슬롯 +1 · 출연료 ×1.5</div>':(c_.grade==='히든'?'':`<div class="s" style="color:var(--muted);font-size:12px;margin-top:6px">일반·레어 카드는 시청률이 ${CAP}%까지만 나와요</div>`)}</div></div>`}
    </div>

    <div class="sec"><h2><span class="n">4</span>스킬 세팅 · ${c_.name} ${c_.grade}</h2>
      ${locked?`<div class="s" style="color:var(--muted)">${lockWhy}</div>`:`
      ${setBar(c_.id)}
      <div class="slotrow"><span class="lab">슬롯</span>${Array.from({length:c_.slots},(_,i)=>{const it=mine[i];return it?`<button class="sl c-${SKILLS[it.s].cat} g-${SKILLS[it.s].gr} ic ic-${it.s}" data-a="eq" data-u="${it.u}">${SKILLS[it.s].i}</button>`:`<span class="sl empty">+</span>`}).join('')}</div>
      ${(()=>{const base=c_.slots,ex=S.slotExp[c_.id]||0,q=slotxQty(),full=base>=CFG.SLOT_MAX||ex>=CFG.SLOT_EXP_MAX;return `<button class="btn" data-a="slotx" style="width:100%;margin-bottom:12px;padding:10px 12px;font-size:13px" ${(q<1||full)?'disabled':''}>🎟️ 슬롯 확장권 사용 · 보유 ${q}개 · 이 카드 확장 ${ex}/${CFG.SLOT_EXP_MAX}${full?' (최대)':''}</button>`})()}
      ${(()=>{const ids=[...new Set(S.inv.map(i=>i.s))].sort((a,b)=>GR[SKILLS[b].gr]-GR[SKILLS[a].gr]);
        const have=CATS.map(c=>`${window.matIcon?window.matIcon(BOOKS[c].n,16,BOOKS[c].e):BOOKS[c].e}${c} ${bookQty(c)}`).join(' · ')+(bagQty(BOOK_OLD)?` · 범용 ${bagQty(BOOK_OLD)}`:''),total=CATS.reduce((s,c)=>s+bookAny(c),0);
        const rows=total>0?ids.map(id=>{const cat=SKILLS[id].cat,q=bookAny(cat),l=mastLv(id),mx=l>=MAST_MAX;return `<div style="display:flex;align-items:center;gap:6px;padding:6px 0;border-top:1px solid var(--line)"><div style="flex:1;min-width:0;font-size:13px"><b>${SKILLS[id].n}</b> <span style="color:#7ee8a5">Lv.${l}${mx?' MAX':''}</span><div style="font-size:11px;color:var(--muted)">${mx?'최대 숙련':`숙련 ${mastXp(id)}/${MAST_XP[l]}`} · ${BOOKS[cat].e}${cat} 책 ${q}권</div></div><button class="btn" data-a="book" data-s="${id}" data-n="1" ${mx||q<1?'disabled':''} style="padding:7px 10px;font-size:12px">1권</button><button class="btn" data-a="book" data-s="${id}" data-n="5" ${mx||q<5?'disabled':''} style="padding:7px 10px;font-size:12px">5권</button></div>`}).join(''):'';
        return `<div style="border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:12px"><div style="font-size:13px"><b>📚 스킬북</b> <span style="color:var(--muted)">1권 = 숙련 +${BOOK_XP} · 같은 종류 스킬에만</span></div><div style="font-size:11px;color:var(--muted);margin-top:2px">${have}</div>${total>0?rows:'<div style="font-size:11px;color:var(--muted);margin-top:4px">탐험과 팬덤 원정에서 가끔 나와요. 거래소에서도 살 수 있어요.</div>'}</div>`})()}
      ${groups}`}
    </div>

  </div>
  <div class="dock">
    <div class="shop" style="margin-bottom:8px">
      <button class="buy ${stam()===0?'hot':''}" data-a="buy" data-n="1" style="padding:7px 10px"><b style="font-size:13px">🥤 체력 음료 (소)</b><span style="font-size:11px">촬영 1회 · ${won(CFG.SMALL)}</span></button>
      <button class="buy" data-a="buy" data-n="3" style="padding:7px 10px"><b style="font-size:13px">🥤 체력 음료 (대)</b><span style="font-size:11px">촬영 3회 · ${won(CFG.BIG)}</span></button>
    </div>
    <div class="sum">${sc_.title} · ${d_.name} · ${c_.name}(${c_.grade}) · 스킬 ${mine.length}/${c_.slots}</div>
    <button class="go" data-a="go" ${locked||stam()<1?'disabled':''}><span>${locked?(hasCard?'데뷔 전 캐릭터예요':'카드가 없어요'):stam()<1?'체력 음료가 필요해요':'촬영 시작'}</span><small>${locked||stam()<1?'':'체력 -1'}</small></button>
  </div>`;
  const _n=$('#dr-prep .scroll');if(_n)_n.scrollTop=_top;
}
$('#dr-prep').addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b||b.disabled)return;const a=b.dataset.a;if(a!=='pick'&&a!=='eq')pickU=0;
  if(a==='bookpop'){openBookPop(b.dataset.k);return}
  else if(a==='script')S.sel.script=b.dataset.id;
  else if(a==='dir')S.sel.dir=b.dataset.id;
  else if(a==='card')S.sel.card=b.dataset.id;
  else if(a==='char'){S.sel.char=b.dataset.id;const l=cardsOf(S.sel.char);S.sel.card=l[0].id}
  else if(a==='close'){closeDrama();return}
  else if(a==='slotx'){
    const c=card(S.sel.card);
    if(c&&isDebut(c.char)&&slotxQty()>0&&c.slots<CFG.SLOT_MAX&&(S.slotExp[c.id]||0)<CFG.SLOT_EXP_MAX){
      try{useFromBag(SLOTX,1)}catch(e){return}
      S.slotExp[c.id]=(S.slotExp[c.id]||0)+1;snack(c.name+' 스킬 슬롯이 늘었어요!');
    }
  }
  else if(a==='book'){
    const id=b.dataset.s,n=+b.dataset.n||1;
    if(!SKILLS[id]||!S.inv.some(i=>i.s===id)){return}
    const cat=SKILLS[id].cat;
    if(mastLv(id)>=MAST_MAX){snack('이미 최대 숙련이에요');}
    else if(bookAny(cat)<n){snack(BOOKS[cat].n+'이 부족해요');}
    else{
      // 최대 레벨을 넘겨서 낭비하지 않게 필요한 만큼만 사용. 전용 책을 먼저, 모자라면 범용 책
      const need=Math.max(1,Math.ceil((MAST_XP[MAST_MAX-1]-mastXp(id))/BOOK_XP)),use=Math.min(n,need,bookAny(cat));
      const a1=Math.min(use,bookQty(cat)),a2=use-a1;
      let ok=true;try{if(a1>0)ok=!!useFromBag(BOOKS[cat].n,a1);if(ok&&a2>0)ok=!!useFromBag(BOOK_OLD,a2)}catch(e){ok=false}
      if(ok){const before=mastLv(id);addMast(id,BOOK_XP*use);saveGame();
        const l=mastLv(id);snack(l>before?`${SKILLS[id].n} 숙련 Lv.${l}! ${BOOKS[cat].e}`:`${SKILLS[id].n} 숙련 +${BOOK_XP*use} ${BOOKS[cat].e}`)}
    }
  }
  else if(a==='eq'){
    const cid=S.sel.card,c=card(cid),u=+b.dataset.u,cur=onCard(u);
    if(!c||!isDebut(c.char))return;
    if(cur===cid){S.equip[cid]=S.equip[cid].filter(x=>x!==u)}
    else{
      const l=S.equip[cid]||[];
      if(l.length>=c.slots)snack('슬롯이 가득 찼어요');
      else{
        if(cur){S.equip[cur]=S.equip[cur].filter(x=>x!==u);syncSet(cur);snack(card(cur).name+' 카드에서 가져왔어요')}
        S.equip[cid]=[...l,u];
      }
    }
    syncSet(cid);pickU=0;
  }
  else if(a==='pick'){pickU=(pickU===+b.dataset.u)?0:+b.dataset.u}
  else if(a==='set'){
    const cid=S.sel.card,c=card(cid),n=+b.dataset.n;
    if(!c||!isDebut(c.char))return;
    const st=getSets(cid);
    if(n!==(st.active||1)){
      st[st.active||1]=[...(S.equip[cid]||[])];            /* 쓰던 세트에 지금 장착을 저장 */
      st.active=n;
      const want=(st[n]||[]).filter(u=>S.inv.some(i=>i.u===u)),out=[];let skip=0,moved=0;
      for(const u of want){
        if(out.length>=c.slots){skip++;continue}
        const oc=onCard(u);
        if(oc&&oc!==cid){S.equip[oc]=S.equip[oc].filter(x=>x!==u);syncSet(oc);moved++}   /* 다른 카드가 쓰던 스킬은 그 카드에서 빼고 가져옴 */
        out.push(u)}
      S.equip[cid]=out;
      snack(`${n}번 세트로 바꿨어요`+(moved?` (다른 카드 스킬 ${moved}개를 가져왔어요)`:'')+(skip?` · 슬롯이 모자라 ${skip}개는 빠졌어요`:''));
    }
  }
  else if(a==='buy'){const n=+b.dataset.n,p=n===1?CFG.SMALL:CFG.BIG;if(coins<p)snack('골드가 부족해요');else{coins-=p;saveGame();S.potion+=n;snack(`체력 음료로 촬영 ${n}회를 더 할 수 있어요`)}}
  else if(a==='go'){startShoot();return}
  save();renderPrep();
});

/* ====================== SHOOT ENGINE ====================== */
let G=null,cv,cx,W=0,H=0,last=0,raf=0,parts=[],col={};
const lerp=(a,b,t)=>a+(b-a)*t;
function gv(n){return getComputedStyle(R).getPropertyValue(n).trim()||'#888'}
function startShoot(){
  if(stam()<1)return;
  if(S.free>0)S.free--;else S.potion--;
  const c=card(S.sel.card),sc_=script(),d_=dir();
  const sk=eq(c.id).map(i=>({...SKILLS[i.s],id:i.s,u:i.u,cdl:0}));
  /* 2인·3인 대본: 상대역 멤버를 랜덤으로 정한다 (데뷔한 멤버 먼저) */
  const partners=[];
  if((sc_.cast||1)>1){
    const others=CHARS.filter(x=>x.id!==c.char).sort(()=>Math.random()-.5);
    others.sort((a,b)=>(isDebut(b.id)?1:0)-(isDebut(a.id)?1:0));
    others.slice(0,sc_.cast-1).forEach(x=>partners.push(x.name));
  }
  const fillP=t=>typeof t==='string'?t.replace(/\{p(\d)\}/g,(m,n)=>partners[n-1]||'상대'):t;
  const evFill=sc_.ev.map(e=>{const o={...e};if(o.line)o.line=fillP(o.line);if(o.cue)o.cue=fillP(o.cue);if(o.o){o.o={...o.o};for(const k in o.o)o.o[k]=fillP(o.o[k])}return o});
  G={t:0,limit:CFG.TIME,gauge:0,buzz:0,ng:0,nextMult:1,nextWin:0,chExt:0,good:false,oneUntil:0,chaseUntil:0,
    card:c,script:sc_,dir:d_,skills:sk,memo:sk.some(k=>k.id==='memo'),active:null,idx:0,
    ev:evFill.sort((a,b)=>a.t-b.t),partners,correct:0,choices:0,ngCount:0,frozen:false,ended:false,okRemain:0,bubbleUntil:0,dirUntil:0,perfects:0};
  $('#dr-prep').hidden=true;$('#dr-result').hidden=true;$('#dr-shoot').hidden=false;G.bg=bgFor(G.script);
  $('#dr-dirName').textContent=d_.name+' · PERFECT';$('#dr-dirPic').className='dav dr dr-'+d_.id;
  $('#dr-cut').hidden=true;$('#dr-banner').hidden=true;$('#dr-bubble').hidden=true;$('#dr-dirSay').hidden=true;$('#dr-choices').innerHTML='';$('#dr-fx').innerHTML='';
  buildSlots();
  col={floor:gv('--panel-2'),panel:gv('--panel'),line:gv('--line'),fg:gv('--fg'),slate:gv('--slate'),ok:gv('--ok'),muted:gv('--muted'),bg:gv('--bg')};
  parts=[];
  cv=$('#dr-stage');cx=cv.getContext('2d');resize();
  last=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
  dirSay(partners.length?`레디… 액션! (상대역 ${partners.join('·')})`:'레디… 액션!',partners.length?2.2:1.4);
}
function resize(){const r=cv.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1);W=r.width;H=r.height;cv.width=Math.max(1,W*d);cv.height=Math.max(1,H*d);cx.setTransform(d,0,0,d,0,0)}
window.addEventListener('resize',()=>{if(G&&!$('#dr-shoot').hidden)resize()});
function buildSlots(){
  const c=G.card,h=[];
  for(let i=0;i<c.slots;i++){const k=G.skills[i];
    h.push(k?`<button class="slot ${k.passive?'pas':''}" data-i="${i}"><span class="orb c-${k.cat} ic ic-${k.id}">${k.i}<i class="cd"></i><span class="cdn"></span></span><small>${k.n}</small></button>`
      :`<div class="slot emptyslot"><span class="orb">+</span><small>빈 슬롯</small></div>`)}
  $('#dr-slots').innerHTML=h.join('');
  $('#dr-slots').classList.toggle('dense',c.slots>=5);
}
$('#dr-slots').addEventListener('pointerdown',e=>{const b=e.target.closest('.slot[data-i]');if(!b||!G)return;e.preventDefault();useSkill(+b.dataset.i)});
$('#dr-stageWrap').addEventListener('pointerdown',e=>{if(!G||G.frozen)return;doTap()});

/* --- gauge helpers --- */
function boost(){return G.t<G.oneUntil?1.5:1}
function popup(txt,cls,color){
  const e=document.createElement('div');e.className='pop '+(cls||'');e.textContent=txt;e.style.color=color||'var(--fg)';
  e.style.top=(H*0.28+Math.random()*H*0.12)+'px';e.style.marginLeft=(Math.random()*60-30)+'px';
  $('#dr-fx').appendChild(e);setTimeout(()=>e.remove(),1150);
}
function addGauge(v,label,color){
  v*=boost();G.gauge=Math.min(100,G.gauge+v);
  popup(`${label} +${fmt(v)}%`,'',color);
  if(G.gauge>=100&&!G.frozen)triggerOK();
}
function gain(raw,C,label){
  const cm=C.chance?1.5:1;const v=raw*CFG.SK*C.mult*cm*MM();
  addGauge(v,C.chance?label+' ×1.5':label,C.chance?'var(--ok)':'var(--slate)');
  if(C.chance){popup('PERFECT TIMING!','sm','var(--ok)')}
}
function addBuzz(n){G.buzz+=n}
function addTime(s){G.limit+=s}
function dirSay(t,sec){const e=$('#dr-dirSay');e.textContent=t;e.hidden=false;G.dirUntil=(G?G.t:0)+(sec||1.6)}
function shakeFx(){const w=$('#dr-stageWrap');w.classList.remove('shake');void w.offsetWidth;w.classList.add('shake')}
function burstFx(color,n){const ax=W*.5,ay=H*.55;for(let i=0;i<n;i++){const a=Math.random()*6.283,s=60+Math.random()*140;parts.push({k:'dot',x:ax,y:ay,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:0,m:.9,c:color,r:2+Math.random()*3})}}
function tearFx(){const ax=W*.5,ay=H*.55;for(let i=0;i<3;i++)parts.push({k:'ring',x:ax,y:ay,l:-i*.15,m:.9,c:'#8fd4ff',r:20});for(let i=0;i<10;i++){const a=Math.random()*6.283,s=30+Math.random()*50;parts.push({k:'dot',x:ax,y:ay,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:0,m:1,c:'#8fd4ff',r:2.5})}}

/* --- skills --- */
const POSE_COL={cry:'#7fc8ff',smile:'#ffb3d1',fist:'#ff5a5a'};
function poseFx(k){
  const ax=W*.5,ay=H*.58,y0=ay-70;
  if(k==='cry'){for(let i=0;i<12;i++){const sd=i%2?1:-1;parts.push({k:'drop',x:ax+sd*(14+Math.random()*8),y:y0+Math.random()*8,vx:sd*(10+Math.random()*30),vy:-20+Math.random()*20,g:260,r:3+Math.random()*2,c:'#9fd8ff',l:-i*.09,m:1.1})}}
  else if(k==='smile'){for(let i=0;i<9;i++)parts.push({k:'glyph',t:i%3?'♥':'✦',x:ax+(Math.random()*110-55),y:ay-10+Math.random()*20,vx:Math.random()*20-10,vy:-50-Math.random()*40,g:0,r:12+Math.random()*8,c:i%3?'#ff8fb8':'#ffe08a',l:-i*.07,m:1.3});parts.push({k:'ring',x:ax,y:ay-30,r:20,c:'#ffb3d1',l:0,m:.8})}
  else if(k==='fist'){parts.push({k:'ring',x:ax,y:ay-30,r:10,c:'#ff5a5a',l:0,m:.6});parts.push({k:'ring',x:ax,y:ay-30,r:4,c:'#ffd24a',l:-.1,m:.6});for(let i=0;i<14;i++){const an=i/14*6.283+Math.random()*.3;parts.push({k:'line',x:ax,y:ay-30,an,r:44,c:i%2?'#ffd24a':'#ff7a5a',l:0,m:.45})}shakeFx()}
}
function useSkill(i){
  const k=G.skills[i];if(!k||k.passive||G.frozen||G.ended)return;
  if(k.cdl>0)return;
  const a=G.active;
  const inChance=!!(a&&a.type==='chance'&&!a.done&&G.t<=a.end&&k.chance===a.kind);
  const C={chance:inChance,scene:SCENE_OF[G.script.genre]||'romance',mult:G.nextMult};
  if(k.id!=='close')G.nextMult=1;
  k.cdl=k.cd*mastCd(k.id);
  if(inChance)a.hit=true;
  G.curSkill=k.id;
  try{k.use(C)}finally{G.curSkill=null}
  {const up=addMast(k.id,inChance?MAST_HIT:1);G.mast=G.mast||{};const m=G.mast[k.id]||(G.mast[k.id]={xp:0,up:false});m.xp+=inChance?MAST_HIT:1;if(up){m.up=true;popup(`${k.n} 숙련 Lv.${mastLv(k.id)}!`,'sm','var(--ok)')}}
  const pz=POSE_OF[k.id];if(pz){G.pose={k:pz,t0:G.t,until:G.t+1.6};poseFx(pz)}
  if(k.id==='close')G.nextMult=1+0.5*mastMult('close');
  if(k.id==='chemi'&&G.script.cast>1)G.nextMult=1+0.3*mastMult('chemi');
}
/* --- judgement --- */
function judgeGain(kind){
  const base=kind==='perfect'?3:1.5;
  addGauge(base,kind==='perfect'?'PERFECT':'GOOD',kind==='perfect'?'var(--ok)':'var(--slate)');
  if(kind==='perfect')G.perfects++;
}
function doTap(){
  const a=G.active;if(!a||a.type!=='tap'||a.done)return;
  const dt=G.t-a.start;a.done=true;
  if(Math.abs(dt-0.9)<=0.3)judgeGain('perfect');else judgeGain('good');
  G.bubbleUntil=G.t+0.4;
}
function pickChoice(tone){
  const a=G.active;if(!a||a.type!=='choice'||a.done)return;
  a.done=true;G.choices++;
  const right=tone===G.dir.tone;
  const trait=TONE_TRAIT[G.card.trait]===tone?1:0;
  if(right){G.correct++;addGauge(5+trait,'PERFECT','var(--ok)');dirSay(RIGHT_LINES[Math.floor(Math.random()*RIGHT_LINES.length)])}
  else{addGauge(2+trait,'GOOD','var(--slate)');dirSay(G.dir.wrong[tone]||'음…',2.2)}
  G.good=false;
  $('#dr-choices').innerHTML='';G.bubbleUntil=G.t+0.5;
}
function ngHit(why){
  G.ngCount++;
  if(G.t<G.oneUntil){popup('원테이크! NG 무효','sm','var(--slate)');return}
  if(G.ng>0){G.ng--;popup('NG 방지!','sm','var(--aux)');return}
  G.limit-=2;popup('NG! -2초','','var(--rec)');dirSay(why||'컷! 다시!',1.6);shakeFx();
}
$('#dr-choices').addEventListener('click',e=>{const b=e.target.closest('.ch');if(!b||!G||G.frozen)return;pickChoice(b.dataset.t)});

function activate(ev){
  const a={...ev,start:G.t,done:false,hit:false};
  const extra=(G.memo?0.5*mastMult('memo'):0)+G.nextWin;G.nextWin=0;
  if(ev.type==='tap'){a.win=CFG.TAPWIN+extra}
  else if(ev.type==='choice'){a.win=CFG.CHOICE+extra;
    const tones=['plain','emotional','funny'].sort(()=>Math.random()-.5);
    a.order=tones;
    $('#dr-choices').innerHTML=`<div class="cue">${ev.cue}</div>`+tones.map(t=>`<button class="ch" data-t="${t}">${ev.o[t]}</button>`).join('')+`<div class="ctimer"><i id="dr-ctI"></i></div>`;
  }
  else if(ev.type==='chance'){a.end=G.t+CFG.CHANCE+G.chExt;G.chExt=0;
    const b=$('#dr-banner');b.hidden=false;b.style.background=KIND_COLOR[ev.kind];
    const KN={emotion:'😭 감정 찬스',action:'💥 액션 찬스',adlib:'🎤 애드리브 찬스'};
    const m=G.skills.filter(k=>k.chance===ev.kind).map(k=>k.n);
    b.textContent=KN[ev.kind]+'! '+(m.length?'→ '+m.join(' / ')+' 지금 써요!':'(맞는 스킬이 없어요)');}
  G.active=a;
  const bub=$('#dr-bubble');bub.hidden=false;bub.textContent=ev.type==='choice'?ev.cue:ev.line;
}
function closeActive(){
  const a=G.active;if(!a)return;
  $('#dr-banner').hidden=true;$('#dr-choices').innerHTML='';G.active=null;
}
function triggerOK(){
  G.frozen=true;G.okRemain=Math.max(0,G.limit-G.t);
  $('#dr-cut').hidden=false;$('#dr-cutBonus').textContent=`남은 촬영시간 ${fmt(G.okRemain)}초 → 보너스`;
  $('#dr-banner').hidden=true;$('#dr-bubble').hidden=true;
  shakeFx();
  setTimeout(()=>finish(true),1900);
}

function update(dt){
  G.t+=dt;
  const rate=CFG.AUTO*(G.t<G.chaseUntil?2:1)*boost();
  G.gauge=Math.min(100,G.gauge+rate*dt);
  G.skills.forEach(k=>{if(k.cdl>0)k.cdl=Math.max(0,k.cdl-dt)});
  while(G.idx<G.ev.length&&G.ev[G.idx].t<=G.t){
    if(G.active)closeActive();
    activate(G.ev[G.idx++]);
  }
  const a=G.active;
  if(a&&!a.done){
    if(a.type==='tap'&&G.t>a.start+a.win){a.done=true;popup('MISS','sm','var(--muted)');closeActive();
      if(G.good){G.good=false;judgeGain('good')}}
    else if(a.type==='choice'&&G.t>a.start+a.win){a.done=true;
      if(G.good){G.good=false;addGauge(2,'GOOD','var(--slate)');dirSay('겨우 살렸네.')}
      else{ngHit('대사 놓쳤어!')}
      closeActive()}
    else if(a.type==='chance'&&G.t>a.end){a.done=true;if(!a.hit)popup('CHANCE MISS','sm','var(--muted)');closeActive()}
  }
  if(a&&a.done&&(a.type==='tap'||a.type==='choice')&&G.active===a&&G.t>G.bubbleUntil){closeActive()}
  if(G.t>=G.bubbleUntil&&!(G.active&&!G.active.done))$('#dr-bubble').hidden=true;
  if(G.t>=G.dirUntil)$('#dr-dirSay').hidden=true;
  if(G.gauge>=100&&!G.frozen){triggerOK();return}
  if(G.t>=G.limit&&!G.frozen){G.frozen=true;G.ended=true;finish(false)}
}
function hud(){
  const left=Math.max(0,G.limit-G.t);
  $('#dr-timeFill').style.width=Math.min(100,left/CFG.TIME*100)+'%';
  $('#dr-timeNum').textContent=fmt(left).toFixed(1)+'초';
  $('#dr-timebar').classList.toggle('low',left<10);
  $('#dr-pFill').style.width=G.gauge+'%';
  $('#dr-pNum').textContent=Math.floor(G.gauge)+'%';
  $('#dr-est').textContent='예상 시청률 '+rating(G.gauge).toFixed(1)+'%';
  const a=G.active;
  if(a&&a.type==='choice'&&!a.done){const i=$('#dr-ctI');if(i)i.style.width=Math.max(0,100-(G.t-a.start)/a.win*100)+'%'}
  const sl=$('#dr-slots').querySelectorAll('.slot[data-i]');
  sl.forEach((el,i)=>{const k=G.skills[i];if(!k)return;
    const p=k.cd?k.cdl/k.cd*100:0;el.querySelector('.cd').style.setProperty('--p',p+'%');
    el.querySelector('.cdn').textContent=k.cdl>0?Math.ceil(k.cdl):'';
    el.classList.toggle('hot',!!(a&&a.type==='chance'&&!a.done&&k.chance===a.kind&&k.cdl<=0));
  });
}

/* --- drawing (top view of the set) --- */
function rr(x,y,w,h,r){cx.beginPath();cx.roundRect?cx.roundRect(x,y,w,h,r):cx.rect(x,y,w,h)}
function draw(dt){
  const t=G.t;cx.clearRect(0,0,W,H);
  const im=G.bg;
  if(im&&im.complete&&im.naturalWidth){const k=Math.max(W/im.naturalWidth,H/im.naturalHeight),w=im.naturalWidth*k,h=im.naturalHeight*k;cx.drawImage(im,(W-w)/2,(H-h)/2,w,h)}
  else{cx.fillStyle=col.floor;cx.fillRect(0,0,W,H)}
  const vg=cx.createRadialGradient(W*.5,H*.55,Math.min(W,H)*.2,W*.5,H*.55,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(10,8,16,.35)');cx.fillStyle=vg;cx.fillRect(0,0,W,H);
  const ax=W*.5,ay=H*.58;
  cx.textAlign='center';
  // actor
  const c=G.card,po=(G.pose&&t<G.pose.until)?G.pose:null,sp=actImg(c.char,po?po.k:'idle');
  const age=po?t-po.t0:9,pop=po?1+Math.max(0,.18-age)*1.2:1,shk=(po&&po.k==='fist'&&age<.5)?Math.sin(t*60)*3:0;
  const bob=Math.sin(t*3)*2;
  if(po){const al=Math.max(0,1-age/1.6)*.55,gr=cx.createRadialGradient(ax,ay-30,10,ax,ay-30,110);gr.addColorStop(0,POSE_COL[po.k]);gr.addColorStop(1,'rgba(0,0,0,0)');cx.globalAlpha=al;cx.fillStyle=gr;cx.fillRect(ax-120,ay-150,240,240);cx.globalAlpha=1}
  cx.fillStyle='rgba(0,0,0,.3)';cx.beginPath();cx.ellipse(ax,ay+34,34,11,0,0,6.283);cx.fill();
  if(sp.complete&&sp.naturalWidth){const br=1+Math.sin(t*2.4)*.012,hh=Math.min(160,H*.32)*pop*br,ww=sp.naturalWidth*Math.min(160,H*.32)*pop/sp.naturalHeight*(2-br);cx.drawImage(sp,ax-ww/2+shk,ay+34-hh+bob,ww,hh)}
  else{cx.fillStyle=c.color;cx.beginPath();cx.ellipse(ax,ay+6+bob,22,13,0,0,6.283);cx.fill();cx.fillStyle='#f3d9c6';cx.beginPath();cx.arc(ax,ay-4+bob,14,0,6.283);cx.fill()}
  cx.fillStyle=col.fg;cx.font='700 11px Noto Sans KR, sans-serif';cx.fillText(c.name,ax,ay+52);
  // tap ring
  const a=G.active;
  if(a&&a.type==='tap'&&!a.done){
    const d=G.t-a.start,r=26+Math.max(0,1-d/.9)*46;
    cx.lineWidth=3;cx.strokeStyle='rgba(255,255,255,.9)';cx.beginPath();cx.arc(ax,ay,r,0,6.283);cx.stroke();
    cx.strokeStyle=Math.abs(d-.9)<=.3?col.ok:col.slate;cx.setLineDash([5,5]);cx.beginPath();cx.arc(ax,ay,26,0,6.283);cx.stroke();cx.setLineDash([]);
    cx.fillStyle=col.fg;cx.font='700 12px Noto Sans KR, sans-serif';cx.fillText('TAP',ax,ay-48);
  }
  // particles
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.l+=dt;if(p.l>p.m){parts.splice(i,1);continue}if(p.l<0)continue;
    const k=1-p.l/p.m;cx.globalAlpha=Math.max(0,k);
    if(p.k==='ring'){cx.strokeStyle=p.c;cx.lineWidth=3;cx.beginPath();cx.arc(p.x,p.y,p.r+p.l*70,0,6.283);cx.stroke()}
    else if(p.k==='line'){const a0=p.r+p.l*220,a1=a0+22;cx.strokeStyle=p.c;cx.lineWidth=3;cx.beginPath();cx.moveTo(p.x+Math.cos(p.an)*a0,p.y+Math.sin(p.an)*a0);cx.lineTo(p.x+Math.cos(p.an)*a1,p.y+Math.sin(p.an)*a1);cx.stroke()}
    else if(p.k==='glyph'){p.x+=p.vx*dt;p.y+=p.vy*dt;cx.fillStyle=p.c;cx.font='700 '+p.r+'px sans-serif';cx.fillText(p.t,p.x,p.y)}
    else if(p.k==='drop'){p.vy+=(p.g||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;cx.fillStyle=p.c;cx.beginPath();cx.ellipse(p.x,p.y,p.r*.7,p.r*1.2,0,0,6.283);cx.fill()}
    else{p.x+=p.vx*dt;p.y+=p.vy*dt;cx.fillStyle=p.c;cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.283);cx.fill()}
    cx.globalAlpha=1}
}
function frame(ts){
  if(!G)return;
  if(!last)last=ts;
  let dt=Math.min(.1,(ts-last)/1000);last=ts;
  if(document.hidden)dt=0;
  if(!G.frozen)update(dt);
  if(G){hud();draw(dt)}
  if(G&&!G.ended)raf=requestAnimationFrame(frame);
}

/* ====================== RESULT ====================== */
function rollSkill(high){
  const tab=DROP[high?'high':'low'];let r=Math.random()*100,gr='일반';
  for(const k of ['일반','레어','히든','프리미엄']){r-=tab[k];if(r<0){gr=k;break}}
  const pool=Object.keys(SKILLS).filter(k=>SKILLS[k].gr===gr&&!SKILLS[k].multi);
  return pool[Math.floor(Math.random()*pool.length)];
}
function giveSkill(id){S.inv.push({u:++S.uid,s:id})}
function finish(ok){
  cancelAnimationFrame(raf);
  const g=G.gauge,raw=ok?15:rating(g),ch=G.card.char;
  const star=!!S.star[ch],hid=G.card.grade==='히든';
  const capped=!hid&&!star&&raw>CAP,r=capped?CAP:raw;
  const remain=ok?G.okRemain:0;
  const buzz=G.buzz;
  const castN=G.script.cast||1,castMult=castN>=3?1.3:castN===2?1.2:1;
  const pay=Math.round(((r*43000+buzz*2500+remain*5000)*PAY_MULT*castMult*(star?1.5:1)*(typeof window.__actorPayMult==='function'?window.__actorPayMult():1))/100)*100;
  const shards=r>=10?10:r>=5?5:0;
  const drop=rollSkill(hid);
  const learned=G.correct>=3;
  G.mast=G.mast||{};
  G.skills.forEach(k=>{if(k.passive){const up=addMast(k.id,1);const m=G.mast[k.id]||(G.mast[k.id]={xp:0,up:false});m.xp+=1;if(up)m.up=true}}); // 패시브는 촬영 1회당 경험치 1
  const mastRows=Object.keys(G.mast).map(id=>{const m=G.mast[id],l=mastLv(id);return `<div><span>🎖️ ${SKILLS[id].n} 숙련</span><b>+${m.xp} ${m.up?`· Lv.${l} 달성!`:l>=MAST_MAX?'· MAX':`(Lv.${l} · ${mastXp(id)}/${MAST_XP[l]})`}</b></div>`}).join('');
  let fameGain=0,promoted=false,fameCapped=false;
  if(hid&&!star){const fd=(S.fameDay&&S.fameDay.day===today())?S.fameDay:(S.fameDay={day:today(),n:0});if(fd.n<FAME_DAILY){fd.n++;fameGain=Math.round(r*2);S.fame[ch]=(S.fame[ch]||0)+fameGain*100/FAME_GOAL;if(S.fame[ch]>=99.999){S.star[ch]=true;promoted=true}}else fameCapped=true}
  let slotGot=0;
  if(Math.random()<(ok||r>=10?CFG.SLOT_DROP_GOOD:CFG.SLOT_DROP)){try{slotGot=addToBag('🎟️',SLOTX,'material',1,'스킬 슬롯을 영구로 1칸 늘려줘요 (드라마 촬영 · 카드당 최대 +2, 총 5칸)')?1:-1}catch(e){slotGot=-1}}
  coins+=pay;awardShards(shards);giveSkill(drop);saveGame();try{if(typeof spawnCoinFloat==='function')spawnCoinFloat(pay)}catch(e){}
  if(learned)S.learned[G.dir.id]=true;
  S.best=Math.max(S.best,r);S.shoots=(S.shoots||0)+1;if(ok)S.oks=(S.oks||0)+1;
  save();
  try{window.dispatchEvent(new CustomEvent('ph-drama-shot',{detail:{r,ok,ch,promoted,pay,hid:!!hid}}))}catch(e){}
  const comment=ok?'감독이 직접 박수를 쳤어요. 조기 OK, 남은 시간은 전부 보너스예요.':r>=10?'방송 직후 화제작으로 떠올랐어요.':r>=5.8?'무난하게 방영됐고 입소문이 퍼지기 시작해요.':r>=3?'조용히 방영됐어요. 스킬 타이밍을 더 노려볼까요?':'방송은 나갔지만 반응이 싸늘해요.';
  const dk=SKILLS[drop];
  const left=stam();
  $('#dr-result').hidden=false;
  $('#dr-result').innerHTML=`
   <div class="rating"><p>${G.script.title} · ${G.dir.name} · ${G.card.name}</p>
     <div class="big mono">${r.toFixed(1)}<small>%</small></div><p>${ok?'PERFECT SCENE · ':''}퍼펙트 ${Math.floor(g)}% 시청률</p><p>${comment}</p></div>
   <div class="rows">
     <div><span>출연료</span><b>${won(pay)}</b></div>
     ${castN>1?`<div><span>케미 보너스 (상대역 ${G.partners.join('·')})</span><b>출연료 +${Math.round((castMult-1)*100)}%</b></div>`:''}
     <div><span>소원의조각</span><b>+${shards}</b></div>
     ${slotGot===1?`<div><span>🎟️ 슬롯 확장권</span><b>획득!</b></div>`:slotGot===-1?`<div><span>🎟️ 슬롯 확장권</span><b>가방이 꽉 차서 못 받았어요</b></div>`:''}
     <div><span>화제성</span><b>+${buzz}</b></div>
     ${mastRows}
     ${star?'<div><span>탑스타 보너스</span><b>출연료 ×1.5</b></div>':''}
     ${capped?`<div><span>시청률 상한</span><b>일반·레어 카드는 ${CAP}.0%까지</b></div>`:''}
     ${hid&&!star?`<div><span>${G.card.name} 인지도</span><b>${fameCapped?`오늘은 다 올랐어요 (${FAME_DAILY}/${FAME_DAILY})`:`+${fameGain} (${Math.floor(Math.min(100,S.fame[ch])*FAME_GOAL/100)}/${FAME_GOAL})`}</b></div>`:''}
     ${ok?`<div><span>남은 시간 보너스</span><b>${fmt(remain)}초</b></div>`:''}
     <div><span>선택 대사 정답</span><b>${G.correct}/${G.choices} · 감독 반응 ${learned?'성향 파악 완료':'아직 모르겠어요'}</b></div>
   </div>
   ${promoted?'<div class="drop" style="border-color:var(--slate)"><b>탑스타 승급! 이 캐릭터의 모든 카드 슬롯 +1, 출연료 ×1.5</b></div>':''}
   <div class="drop"><span class="sl c-${dk.cat} g-${dk.gr} ic ic-${drop}" style="width:40px;height:40px">${dk.i}</span><div><b>스킬 획득 · ${dk.n}</b><div class="s" style="color:var(--muted);font-size:12px">${dk.gr} · ${dk.d()}</div></div></div>
   <div class="btns">
     <button class="btn pri" data-r="${left<1?'prep':'again'}">${left<1?'체력 음료 사러 가기 🥤':'같은 설정으로 다시 촬영'}</button>
     <button class="btn" data-r="prep">준비 화면으로</button>
   </div>`;
  G=null;
}
$('#dr-result').addEventListener('click',e=>{const b=e.target.closest('[data-r]');if(!b||b.disabled)return;
  $('#dr-result').hidden=true;$('#dr-shoot').hidden=true;$('#dr-prep').hidden=false;renderPrep();
  if(b.dataset.r==='again')startShoot();
});

function openDrama(){load();renderPrep();{const s_=$('#dr-prep .scroll');if(s_)s_.scrollTop=0}R.hidden=false;$('#dr-prep').hidden=false;$('#dr-shoot').hidden=true;$('#dr-result').hidden=true}
function closeDrama(){if(G)return;R.hidden=true}
window.openDrama=openDrama;
window.__dramaTest={rating,SKILLS,SCRIPTS,CFG,MAST:{BOOK_XP,BOOKS,XP:MAST_XP,MAX:MAST_MAX,lv:mastLv,mult:mastMult,cd:mastCd,add:addMast,xp:mastXp,dtext}};
/* 광장 메뉴 버튼 (CF 촬영 버튼 아래) */
let tries=0;
(function hook(){
  tries++;
  const anchor=document.getElementById('btn-cf-square')||(tries>120?document.getElementById('btn-agency-square'):null);
  if(!anchor||typeof PLACE_BUTTONS==='undefined'||typeof ALL_PLACE_BTNS==='undefined'){if(tries<400)setTimeout(hook,50);return}
  if(document.getElementById('btn-drama-square'))return;
  const b=document.createElement('button');
  b.id='btn-drama-square';b.textContent='🎥 드라마 촬영';
  b.style.cssText='display:none;width:100%;padding:14px;margin-top:10px;background:rgba(255,207,74,0.15);border:1.5px solid #ffcf4a;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;';
  b.onclick=openDrama;
  anchor.insertAdjacentElement('afterend',b);
  if(PLACE_BUTTONS.square.indexOf('btn-drama-square')===-1)PLACE_BUTTONS.square.push('btn-drama-square');
  if(ALL_PLACE_BTNS.indexOf('btn-drama-square')===-1)ALL_PLACE_BTNS.push('btn-drama-square');
})();
})();
