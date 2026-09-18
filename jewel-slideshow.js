/*!
 * jewel-slideshow.js — 보석 프레임 슬라이드쇼 (임베드용 웹 컴포넌트)
 * -----------------------------------------------------------------
 * 원본 jewel-slideshow.html(단독 풀스크린 페이지)의 연출을 그대로 유지하면서,
 * 어떤 홈페이지에도 붙일 수 있는 <jewel-slideshow> 커스텀 엘리먼트로 포팅했습니다.
 * 외부 의존성: Google Fonts(Cormorant Garamond, Noto Serif KR)만 사용, 그 외 전부 인라인.
 * Shadow DOM으로 완전히 캡슐화되어 있어 호스트 페이지의 CSS/JS와 충돌하지 않고,
 * 같은 페이지에 여러 개를 동시에 넣어도 서로 간섭하지 않습니다.
 *
 * 사용법
 * -----
 *   <script src="jewel-slideshow.js"></script>
 *   <jewel-slideshow style="width:360px;height:640px"></jewel-slideshow>
 *
 * 사진 넣는 방법 (아무것도 안 주면 데모용 샘플 5장으로 자동 시작):
 *   1) 자식 <img> 태그        <jewel-slideshow><img src="a.jpg"><img src="b.jpg"></jewel-slideshow>
 *   2) images 속성(JSON)      <jewel-slideshow images='["a.jpg","b.jpg"]'></jewel-slideshow>
 *   3) JS API                 el.setImages(['a.jpg','b.jpg']);  el.addImages([...])
 *
 * 속성(attribute)
 *   images        JSON 배열 문자열 (선택)
 *   speed         슬라이드당 초 (기본 3.4, 2~6 권장)
 *   autoplay      "false"면 정지 상태로 시작
 *   shape         "auto"(기본, 매 장 순환) 또는 star/heart/flower/diamond/hexagon/oval/rounded 고정
 *   controls      "false"면 하단 컨트롤바 전체 숨김 (키보드/API로만 조작)
 *   upload        "false"면 "사진 추가" 버튼과 안내 문구만 숨김 (재생 컨트롤은 유지)
 *   intro         "false"면 시작 타이틀 문구 숨김
 *   intro-title   시작 타이틀 대문구 (기본 "우리들의 순간")
 *   intro-sub     시작 타이틀 소문구 (기본 "Precious Moments")
 *
 * JS API
 *   el.setImages(arr) / el.addImages(arr) / el.play() / el.pause() / el.next() / el.prev()
 */
(function () {
  'use strict';
  if (customElements.get('jewel-slideshow')) return;

  const SVGNS = 'http://www.w3.org/2000/svg';
  const XLINKNS = 'http://www.w3.org/1999/xlink';

  // ---------- geometry helpers (viewBox 0 0 200 200) ----------
  const P = (x, y) => x.toFixed(2) + ' ' + y.toFixed(2);
  function poly(cx, cy, n, r, rot = -90) {
    let d = 'M';
    for (let i = 0; i < n; i++) {
      const a = ((rot + (i * 360) / n) * Math.PI) / 180;
      d += (i ? 'L' : '') + P(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    return d + 'Z';
  }
  function star(cx, cy, sp, ro, ri, rot = -90) {
    let d = 'M';
    for (let i = 0; i < sp * 2; i++) {
      const r = i % 2 ? ri : ro;
      const a = ((rot + (i * 180) / sp) * Math.PI) / 180;
      d += (i ? 'L' : '') + P(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    return d + 'Z';
  }
  function flower(cx, cy, pet, rTip, rVal) {
    let d = '';
    const step = 360 / pet;
    for (let i = 0; i < pet; i++) {
      const a0 = ((i * step - 90) * Math.PI) / 180;
      const a1 = (((i + 1) * step - 90) * Math.PI) / 180;
      const am = (((i + 0.5) * step - 90) * Math.PI) / 180;
      const v0 = [cx + rVal * Math.cos(a0), cy + rVal * Math.sin(a0)];
      const v1 = [cx + rVal * Math.cos(a1), cy + rVal * Math.sin(a1)];
      const c = [cx + rTip * 1.55 * Math.cos(am), cy + rTip * 1.55 * Math.sin(am)];
      d += (i ? '' : 'M' + P(v0[0], v0[1])) + 'Q' + P(c[0], c[1]) + ' ' + P(v1[0], v1[1]);
    }
    return d + 'Z';
  }
  const HEART = 'M100 176 C100 176 26 122 26 74 C26 46 48 30 70 30 C86 30 96 42 100 54 C104 42 114 30 130 30 C152 30 174 46 174 74 C174 122 100 176 100 176 Z';
  const DIAMOND = 'M100 8 L192 100 L100 192 L8 100 Z';

  function shapeEl(shape) {
    switch (shape) {
      case 'star': return { tag: 'path', attrs: { d: star(100, 109, 5, 95, 42) } };
      case 'heart': return { tag: 'path', attrs: { d: HEART } };
      case 'flower': return { tag: 'path', attrs: { d: flower(100, 100, 8, 58, 66) } };
      case 'diamond': return { tag: 'path', attrs: { d: DIAMOND } };
      case 'hexagon': return { tag: 'path', attrs: { d: poly(100, 100, 6, 95, -90) } };
      case 'oval': return { tag: 'ellipse', attrs: { cx: 100, cy: 100, rx: 80, ry: 96 } };
      case 'rounded': return { tag: 'rect', attrs: { x: 10, y: 10, width: 180, height: 180, rx: 30, ry: 30 } };
      default: return { tag: 'path', attrs: { d: star(100, 100, 5, 95, 42) } };
    }
  }
  function make(tag, attrs) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  const SHAPES_CYCLE = ['flower', 'diamond', 'hexagon', 'oval', 'rounded'];
  const THEMES = [
    'radial-gradient(90% 70% at 50% 40%,#6b3f14 0%,#3a1f34 45%,#180e22 100%),radial-gradient(40% 40% at 20% 80%,rgba(240,180,120,.5),transparent)',
    'radial-gradient(90% 90% at 50% 30%,#3a1f66 0%,#1c1140 55%,#0e0722 100%),radial-gradient(30% 60% at 70% 60%,rgba(150,120,255,.35),transparent)',
    'radial-gradient(80% 80% at 40% 50%,#5a2350 0%,#2a1440 55%,#160b22 100%),radial-gradient(40% 40% at 75% 25%,rgba(240,166,196,.4),transparent)',
    'radial-gradient(100% 80% at 50% 20%,#1b2a5e 0%,#161238 55%,#0b0820 100%),radial-gradient(35% 35% at 25% 75%,rgba(120,200,255,.3),transparent)',
  ];

  function demoPhoto(i) {
    const sets = [
      ['#6a2c5a', '#f0a6c4', '#ffd9a0'],
      ['#2a2f7a', '#7aa8ff', '#c9e6ff'],
      ['#7a4a1e', '#e9c877', '#fff2cf'],
      ['#3a1f5e', '#b184e6', '#f0c4ff'],
      ['#134a4a', '#57c9b8', '#d8fff4'],
    ][i % 5];
    const dots = Array.from({ length: 14 }, () => {
      const x = (Math.random() * 800).toFixed(0);
      const y = (Math.random() * 800).toFixed(0);
      const rr = (8 + Math.random() * 46).toFixed(0);
      const op = (0.04 + Math.random() * 0.12).toFixed(2);
      return `<circle cx='${x}' cy='${y}' r='${rr}' fill='#fff' opacity='${op}'/>`;
    }).join('');
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='800'>
      <defs><radialGradient id='r' cx='42%' cy='34%' r='75%'>
      <stop offset='0%' stop-color='${sets[2]}'/><stop offset='45%' stop-color='${sets[1]}'/>
      <stop offset='100%' stop-color='${sets[0]}'/></radialGradient></defs>
      <rect width='800' height='800' fill='url(#r)'/>${dots}
      <circle cx='560' cy='250' r='150' fill='#fff' opacity='0.10'/>
    </svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = `
  <style>
    :host{
      --void:#140a1e; --plum:#2a1440; --purple:#5a2a86;
      --gold:#e9c877; --gold-lite:#fff2cf; --rose:#f0a6c4;
      --aqua:#bfe9ff; --cream:#fff6ea;
      --serif:"Cormorant Garamond","Noto Serif KR",serif;
      --ui:system-ui,-apple-system,"Noto Serif KR",sans-serif;
      display:block; position:relative; width:100%; height:100%;
      min-width:180px; min-height:260px;
      background:var(--void); color:var(--cream); font-family:var(--ui);
      overflow:hidden; border-radius:var(--jewel-radius,16px);
      -webkit-tap-highlight-color:transparent;
      container: jewel / size;
      outline:none;
    }
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Noto+Serif+KR:wght@400;600&display=swap');
    *{box-sizing:border-box}
    #stage{position:absolute;inset:0;overflow:hidden;isolation:isolate}

    .bg{position:absolute;inset:-6%;opacity:0;transition:opacity 1.6s ease;filter:saturate(1.05)}
    .bg.on{opacity:1}
    #bgTint{position:absolute;inset:0;background:radial-gradient(120% 120% at 50% 120%,transparent 40%,rgba(0,0,0,.55));pointer-events:none}

    #sparkles{position:absolute;inset:0;pointer-events:none}
    .spk{position:absolute;width:3px;height:3px;border-radius:50%;
      background:radial-gradient(circle,#fff 0%,var(--gold-lite) 40%,transparent 70%);
      opacity:0;animation:twinkle var(--d,4s) ease-in-out var(--delay,0s) infinite}
    @keyframes twinkle{0%,100%{opacity:0;transform:scale(.4)}45%{opacity:.9;transform:scale(1)}}

    #slides{position:absolute;inset:0;display:grid;place-items:center}
    .layer{position:absolute;display:grid;place-items:center;opacity:0;
      width:90%;aspect-ratio:1/1;
      transition:transform .95s cubic-bezier(.2,.72,.2,1),opacity .8s ease,filter .95s ease;
      filter:drop-shadow(0 24px 46px rgba(0,0,0,.55))}
    @supports (container-type: size){ .layer{width:min(90cqw,86cqh)} }
    .layer svg{width:100%;height:100%;overflow:visible}
    .layer.enter{opacity:0;transform:rotate(-15deg) scale(.6)}
    .layer.shown{opacity:1;transform:none}
    .layer.out{opacity:0;transform:rotate(13deg) scale(1.45);filter:drop-shadow(0 0 0 transparent) blur(7px)}
    .noanim{transition:none !important}

    .kb{transform-origin:50% 50%}
    .kb.v0{animation:kb0 var(--kb,3.4s) ease-out forwards}
    .kb.v1{animation:kb1 var(--kb,3.4s) ease-out forwards}
    .kb.v2{animation:kb2 var(--kb,3.4s) ease-out forwards}
    .kb.v3{animation:kb3 var(--kb,3.4s) ease-out forwards}
    @keyframes kb0{from{transform:scale(1.02) translate(0,0)}to{transform:scale(1.16) translate(-5px,-4px)}}
    @keyframes kb1{from{transform:scale(1.16) translate(5px,3px)}to{transform:scale(1.02) translate(0,0)}}
    @keyframes kb2{from{transform:scale(1.04) translate(4px,-3px)}to{transform:scale(1.18) translate(-4px,4px)}}
    @keyframes kb3{from{transform:scale(1.14) translate(-4px,4px)}to{transform:scale(1.03) translate(3px,-3px)}}

    .gemA{animation:gemshiftA 3.2s linear infinite}
    .gemB{animation:gemshiftB 4.1s linear infinite}
    @keyframes gemshiftA{to{stroke-dashoffset:-40}}
    @keyframes gemshiftB{to{stroke-dashoffset:40}}
    .band{animation:bandpulse 3.6s ease-in-out infinite}
    @keyframes bandpulse{0%,100%{opacity:.95}50%{opacity:.78}}

    #intro{position:absolute;inset:0;display:grid;place-items:center;text-align:center;
      pointer-events:none;z-index:5;transition:opacity 1s ease}
    #intro .kr{font-family:var(--serif);font-weight:600;font-size:clamp(20px,7cqw,42px);
      letter-spacing:.02em;color:var(--cream);text-shadow:0 2px 30px rgba(233,200,119,.5)}
    #intro .sub{font-family:var(--serif);font-style:italic;font-size:clamp(12px,2.6cqw,18px);
      color:var(--gold-lite);opacity:.85;margin-top:.4em}
    #intro.hide{opacity:0}

    #hint{position:absolute;left:50%;top:clamp(10px,4cqh,26px);transform:translateX(-50%);
      z-index:6;background:rgba(20,10,30,.62);border:1px solid rgba(233,200,119,.4);
      color:var(--cream);padding:8px 14px;border-radius:999px;backdrop-filter:blur(8px);
      font-size:12.5px;display:flex;gap:7px;align-items:center;transition:opacity .5s;
      max-width:88%;}
    #hint svg{width:14px;height:14px;fill:var(--gold);flex:none}
    #hint span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #hint.hide{opacity:0;pointer-events:none}

    #bar{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);
      z-index:7;display:flex;flex-wrap:wrap;gap:7px;align-items:center;justify-content:center;
      padding:9px 12px;border-radius:18px;max-width:94%;
      background:linear-gradient(180deg,rgba(30,16,46,.5),rgba(18,10,28,.72));
      border:1px solid rgba(233,200,119,.28);backdrop-filter:blur(14px);
      box-shadow:0 12px 40px rgba(0,0,0,.5);transition:opacity .6s ease,transform .6s ease}
    #bar.idle{opacity:0;transform:translateX(-50%) translateY(14px);pointer-events:none}
    .btn{appearance:none;border:0;cursor:pointer;color:var(--cream);
      background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);
      width:38px;height:38px;border-radius:11px;display:grid;place-items:center;transition:.18s}
    .btn:hover{background:rgba(233,200,119,.16);border-color:rgba(233,200,119,.5)}
    .btn:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
    .btn svg{width:18px;height:18px;fill:currentColor}
    .btn.primary{width:auto;padding:0 14px;gap:7px;background:linear-gradient(180deg,#f4d488,#e0b354);color:#3a220a;
      border-color:transparent;font-weight:600;font-size:13px}
    .btn.primary:hover{filter:brightness(1.06)}
    .sep{width:1px;height:24px;background:rgba(255,255,255,.14);margin:0 1px}
    .ctl{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--gold-lite)}
    .ctl input[type=range]{width:76px;accent-color:var(--gold)}
    select{background:rgba(20,12,30,.9);color:var(--cream);border:1px solid rgba(255,255,255,.16);
      border-radius:9px;padding:5px 7px;font-size:12px;font-family:var(--ui)}
    .count{font-family:var(--serif);font-size:14px;color:var(--gold-lite);min-width:46px;text-align:center;letter-spacing:.04em}
    .visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
    .hidden{display:none !important}

    @container jewel (max-width: 420px){
      .ctl.speed{order:10;width:100%;justify-content:center}
      #bar{gap:6px;padding:8px 10px}
    }
    @media (prefers-reduced-motion:reduce){
      .layer{transition:opacity .5s ease}
      .layer.enter{transform:none} .layer.out{transform:none;filter:none}
      .kb,.gemA,.gemB,.band,.spk{animation:none !important}
    }
    :host(.reduced) .layer{transition:opacity .5s ease}
    :host(.reduced) .layer.enter{transform:none}
    :host(.reduced) .layer.out{transform:none;filter:none}
    :host(.reduced) .kb,:host(.reduced) .gemA,:host(.reduced) .gemB,:host(.reduced) .band,:host(.reduced) .spk{animation:none !important}
  </style>
  <div id="stage">
    <div class="bg" id="bgA"></div>
    <div class="bg" id="bgB"></div>
    <div id="bgTint"></div>
    <div id="sparkles"></div>

    <div id="slides">
      <div class="layer" id="l0"></div>
      <div class="layer" id="l1"></div>
    </div>

    <div id="intro">
      <div>
        <div class="kr" id="introKr">우리들의 순간</div>
        <div class="sub" id="introSub">Precious Moments</div>
      </div>
    </div>

    <div id="hint">
      <svg viewBox="0 0 24 24"><path d="M9 3 7.2 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3H9Zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"/></svg>
      <span>내 사진을 넣어 나만의 슬라이드쇼로 만들어 보세요</span>
    </div>

    <div id="bar">
      <button class="btn primary" id="add" aria-label="사진 추가" type="button">
        <svg viewBox="0 0 24 24"><path d="M11 5v6H5v2h6v6h2v-6h6v-2h-6V5z"/></svg><span>사진 추가</span>
      </button>
      <span class="sep" id="sepAdd"></span>
      <button class="btn" id="prev" aria-label="이전" type="button"><svg viewBox="0 0 24 24"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg></button>
      <button class="btn" id="play" aria-label="재생/일시정지" type="button"></button>
      <button class="btn" id="next" aria-label="다음" type="button"><svg viewBox="0 0 24 24"><path d="M8.6 16.6 10 18l6-6-6-6-1.4 1.4L13.2 12z"/></svg></button>
      <span class="count" id="count">– / –</span>
      <span class="sep"></span>
      <label class="ctl"><span>모양</span>
        <select id="shapeSel" aria-label="프레임 모양">
          <option value="auto">자동 순환</option>
          <option value="flower">꽃</option>
          <option value="diamond">다이아몬드</option>
          <option value="hexagon">육각형</option>
          <option value="oval">타원</option>
          <option value="rounded">사각</option>
        </select>
      </label>
      <label class="ctl speed"><span>속도</span>
        <input type="range" id="speed" min="2000" max="6000" step="250" value="3400" aria-label="슬라이드 속도">
      </label>
      <span class="sep"></span>
      <button class="btn" id="full" aria-label="전체화면" type="button"><svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3ZM5 10h2V7h3V5H5v5Zm12 7h-3v2h5v-5h-2v3ZM14 5v2h3v3h2V5h-5Z"/></svg></button>
    </div>

    <input id="file" type="file" accept="image/*" multiple class="visually-hidden">
  </div>
  `;

  class JewelSlideshow extends HTMLElement {
    static get observedAttributes() { return ['speed', 'shape']; }

    constructor() {
      super();
      this._root = this.attachShadow({ mode: 'open' });
      this._root.appendChild(TEMPLATE.content.cloneNode(true));
      this._uid = 0;
      this._idx = 0;
      this._front = 0;
      this._playing = true;
      this._timer = null;
      this._idleT = null;
      this._usingDemo = true;
      this._shapeMode = 'auto';
    }

    connectedCallback() {
      const $ = (s) => this._root.querySelector(s);
      this._reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      this.classList.toggle('reduced', this._reduced);

      this._el = {
        bgA: $('#bgA'), bgB: $('#bgB'), sparkles: $('#sparkles'),
        layers: [$('#l0'), $('#l1')],
        intro: $('#intro'), introKr: $('#introKr'), introSub: $('#introSub'),
        hint: $('#hint'), bar: $('#bar'), count: $('#count'),
        add: $('#add'), sepAdd: $('#sepAdd'), prev: $('#prev'), play: $('#play'), next: $('#next'),
        shapeSel: $('#shapeSel'), speed: $('#speed'), full: $('#full'), file: $('#file'),
      };

      this._bgFront = this._el.bgA;
      this._bgBack = this._el.bgB;

      // ---- attribute driven setup ----
      const speedAttr = parseFloat(this.getAttribute('speed'));
      this._duration = (isFinite(speedAttr) && speedAttr > 0 ? speedAttr : 3.4) * 1000;
      this._el.speed.value = String(this._duration);

      if (this.hasAttribute('shape') && (this.getAttribute('shape') === 'auto' || SHAPES_CYCLE.includes(this.getAttribute('shape')))) {
        this._shapeMode = this.getAttribute('shape');
      }
      this._el.shapeSel.value = this._shapeMode;

      // ---- optional: explicit per-photo shape list, e.g. shapes='["oval","diamond","hexagon"]' ----
      // 지정된 인덱스는 이 배열의 모양을 그대로 쓰고, 배열 길이를 넘어가는 사진은 shape/shapeMode 규칙(auto 순환 등)으로 되돌아갑니다.
      this._shapeList = null;
      const shapesRaw = this.getAttribute('shapes');
      if (shapesRaw) {
        try {
          const arr = JSON.parse(shapesRaw);
          if (Array.isArray(arr)) this._shapeList = arr.map((s) => (SHAPES_CYCLE.includes(s) ? s : null));
        } catch (e) { /* invalid JSON: ignore, fall back to shape/shapeMode */ }
      }

      if (this.getAttribute('intro') === 'false') this._el.intro.classList.add('hide');
      if (this.getAttribute('intro-title')) this._el.introKr.textContent = this.getAttribute('intro-title');
      if (this.getAttribute('intro-sub')) this._el.introSub.textContent = this.getAttribute('intro-sub');

      if (this.getAttribute('controls') === 'false') this._el.bar.classList.add('hidden');
      if (this.getAttribute('upload') === 'false') {
        this._el.add.classList.add('hidden');
        this._el.sepAdd.classList.add('hidden');
        this._el.hint.classList.add('hide');
      }
      if (this.getAttribute('hint') === 'false') this._el.hint.classList.add('hide');

      // ---- initial photos: attribute / light-dom <img> / demo fallback ----
      const initial = this._collectInitialImages();
      this._photos = initial.length ? initial : [0, 1, 2, 3, 4].map(demoPhoto);
      this._usingDemo = initial.length === 0;
      if (!this._usingDemo) {
        this._el.hint.classList.add('hide');
        this._el.intro.classList.add('hide');
      }

      this._bgFront.style.backgroundImage = THEMES[0];
      this._bgFront.classList.add('on');
      this._buildSparkles();
      this._bindEvents();

      if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');

      const autoplay = this.getAttribute('autoplay') !== 'false';
      this._setPlay(autoplay);
      this._render(0, false);
      this._el.count.textContent = '1 / ' + this._photos.length;
      if (!this._el.intro.classList.contains('hide')) {
        this._introTimer = setTimeout(() => this._el.intro.classList.add('hide'), 2600);
      }
      this._poke();
    }

    disconnectedCallback() {
      clearTimeout(this._timer);
      clearTimeout(this._idleT);
      clearTimeout(this._introTimer);
    }

    attributeChangedCallback(name, oldV, newV) {
      if (!this._el || oldV === newV) return;
      if (name === 'speed') {
        const v = parseFloat(newV);
        if (isFinite(v) && v > 0) {
          this._duration = v * 1000;
          this._el.speed.value = String(this._duration);
          if (this._playing) this._schedule();
        }
      }
      if (name === 'shape' && (newV === 'auto' || SHAPES_CYCLE.includes(newV))) {
        this._shapeMode = newV;
        this._el.shapeSel.value = newV;
        this._render(this._idx, false);
      }
    }

    _collectInitialImages() {
      const lightImgs = Array.from(this.querySelectorAll(':scope > img')).map((img) => img.getAttribute('src')).filter(Boolean);
      let attrImgs = [];
      const raw = this.getAttribute('images');
      if (raw) {
        try { attrImgs = JSON.parse(raw); } catch (e) { attrImgs = raw.split(',').map((s) => s.trim()).filter(Boolean); }
      }
      if (lightImgs.length) this.querySelectorAll(':scope > img').forEach((img) => { img.style.display = 'none'; });
      return [...attrImgs, ...lightImgs];
    }

    // ---------- Public API ----------
    setImages(arr) {
      if (!Array.isArray(arr) || !arr.length) return;
      this._photos = arr.slice();
      this._usingDemo = false;
      this._idx = 0;
      this._el.hint.classList.add('hide');
      this._el.intro.classList.add('hide');
      this._render(0, true);
      this._schedule();
    }
    addImages(arr) {
      if (!Array.isArray(arr) || !arr.length) return;
      this._photos = this._usingDemo ? arr.slice() : this._photos.concat(arr);
      this._usingDemo = false;
      this._idx = 0;
      this._el.hint.classList.add('hide');
      this._el.intro.classList.add('hide');
      this._render(0, true);
      this._schedule();
    }
    play() { this._setPlay(true); }
    pause() { this._setPlay(false); }
    next() { this._go(1); }
    prev() { this._go(-1); }

    // ---------- Internal ----------
    _shapeFor(i) {
      if (this._shapeList && this._shapeList[i]) return this._shapeList[i];
      return this._shapeMode === 'auto' ? SHAPES_CYCLE[i % SHAPES_CYCLE.length] : this._shapeMode;
    }

    _buildSlide(src, shape, dur) {
      const id = 'c' + this._uid++;
      const svg = make('svg', { viewBox: '0 0 200 200' });
      const el = shapeEl(shape);

      const defs = make('defs', {});
      const gold = make('linearGradient', { id: 'g' + id, x1: '0', y1: '0', x2: '1', y2: '1' });
      [['0%', '#8a5a1e'], ['22%', '#f6e4a6'], ['50%', '#c8912f'], ['74%', '#fff2cf'], ['100%', '#9c6a24']]
        .forEach(([o, c]) => { const s = make('stop', { offset: o }); s.setAttribute('stop-color', c); gold.appendChild(s); });
      defs.appendChild(gold);
      const clip = make('clipPath', { id: 'clip' + id });
      clip.appendChild(make(el.tag, el.attrs));
      defs.appendChild(clip);
      svg.appendChild(defs);

      const g = make('g', { 'clip-path': 'url(#clip' + id + ')' });
      // NOTE: the Ken-Burns pan/zoom transform is intentionally disabled (--kb: 0s).
      // Animating `transform` on an element inside an SVG clip-path causes iOS/mobile
      // Safari to fail to paint the clipped photo (frame renders, image stays blank).
      // Keeping the duration at 0s renders the photo statically but reliably on all devices.
      const kb = make('g', { class: 'kb v' + (this._uid % 4) });
      kb.style.setProperty('--kb', '0s');
      const img = make('image', { x: -12, y: -12, width: 224, height: 224, preserveAspectRatio: 'xMidYMid slice' });
      img.setAttributeNS(XLINKNS, 'href', src);
      img.setAttribute('href', src);
      kb.appendChild(img); g.appendChild(kb); svg.appendChild(g);

      const stroke = (cls, extra) => {
        const s = make(el.tag, Object.assign({}, el.attrs, { fill: 'none' }, extra));
        if (cls) s.setAttribute('class', cls);
        return s;
      };
      svg.appendChild(stroke('', { stroke: 'rgba(0,0,0,.4)', 'stroke-width': 9 }));
      svg.appendChild(stroke('band', { stroke: 'url(#g' + id + ')', 'stroke-width': 7, 'stroke-linejoin': 'round' }));
      svg.appendChild(stroke('gemA', { stroke: '#ffffff', 'stroke-width': 5.2, 'stroke-linecap': 'round', 'stroke-dasharray': '0.5 6', 'stroke-linejoin': 'round', opacity: .95, style: 'filter:drop-shadow(0 0 2.4px #fff)' }));
      svg.appendChild(stroke('gemB', { stroke: (this._uid % 2 ? '#f6b8d2' : '#bfe9ff'), 'stroke-width': 3.6, 'stroke-linecap': 'round', 'stroke-dasharray': '0.5 6', 'stroke-dashoffset': 3, 'stroke-linejoin': 'round', opacity: .85, style: 'filter:drop-shadow(0 0 2px currentColor)' }));
      svg.appendChild(stroke('', { stroke: '#fff2cf', 'stroke-width': 1.4, 'stroke-linejoin': 'round', opacity: .55 }));
      return svg;
    }

    _setTheme(i) {
      this._bgBack.style.backgroundImage = THEMES[i % THEMES.length];
      this._bgBack.classList.add('on');
      this._bgFront.classList.remove('on');
      const tmp = this._bgFront; this._bgFront = this._bgBack; this._bgBack = tmp;
    }

    _buildSparkles() {
      const box = this._el.sparkles;
      box.innerHTML = '';
      const n = this._reduced ? 0 : 34;
      for (let i = 0; i < n; i++) {
        const s = document.createElement('span');
        s.className = 'spk';
        s.style.left = Math.random() * 100 + '%';
        s.style.top = Math.random() * 100 + '%';
        s.style.setProperty('--d', (3 + Math.random() * 4).toFixed(1) + 's');
        s.style.setProperty('--delay', (Math.random() * 5).toFixed(1) + 's');
        s.style.width = s.style.height = (2 + Math.random() * 3).toFixed(1) + 'px';
        box.appendChild(s);
      }
    }

    _render(i, animate) {
      const layers = this._el.layers;
      const nextEl = layers[1 - this._front];
      const curEl = layers[this._front];
      nextEl.innerHTML = '';
      nextEl.appendChild(this._buildSlide(this._photos[i], this._shapeFor(i), this._duration));
      this._setTheme(i);
      if (!animate) {
        nextEl.className = 'layer shown noanim';
        void nextEl.offsetWidth;
        nextEl.classList.remove('noanim');
        curEl.className = 'layer';
      } else {
        nextEl.className = 'layer enter';
        void nextEl.offsetWidth;
        requestAnimationFrame(() => {
          nextEl.classList.remove('enter'); nextEl.classList.add('shown');
          curEl.classList.remove('shown'); curEl.classList.add('out');
        });
      }
      this._front = 1 - this._front;
      this._el.count.textContent = (i + 1) + ' / ' + this._photos.length;
    }

    _go(delta) {
      if (!this._photos.length) return;
      this._idx = (this._idx + delta + this._photos.length) % this._photos.length;
      this._render(this._idx, true);
      this._schedule();
    }

    _schedule() {
      clearTimeout(this._timer);
      if (this._playing && this._photos.length > 1) this._timer = setTimeout(() => this._go(1), this._duration);
    }

    _setPlay(p) {
      this._playing = p;
      this._el.play.innerHTML = p
        ? '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
      if (p) this._schedule(); else clearTimeout(this._timer);
    }

    _poke() {
      this._el.bar.classList.remove('idle');
      clearTimeout(this._idleT);
      this._idleT = setTimeout(() => { if (this._playing) this._el.bar.classList.add('idle'); }, 3200);
    }

    _bindEvents() {
      const e = this._el;
      e.play.addEventListener('click', () => this._setPlay(!this._playing));
      e.next.addEventListener('click', () => this._go(1));
      e.prev.addEventListener('click', () => this._go(-1));
      e.speed.addEventListener('input', (ev) => { this._duration = +ev.target.value; if (this._playing) this._schedule(); });
      e.shapeSel.addEventListener('change', (ev) => { this._shapeMode = ev.target.value; this._render(this._idx, false); });
      e.add.addEventListener('click', () => e.file.click());
      e.file.addEventListener('change', (ev) => {
        const files = Array.from(ev.target.files).filter((f) => f.type.startsWith('image/'));
        if (!files.length) return;
        const loaded = []; let done = 0;
        files.forEach((f, k) => {
          const r = new FileReader();
          r.onload = (rev) => {
            loaded[k] = rev.target.result;
            if (++done === files.length) {
              const arr = loaded.filter(Boolean);
              if (this._usingDemo) this.setImages(arr); else this.addImages(arr);
            }
          };
          r.readAsDataURL(f);
        });
        ev.target.value = '';
      });
      e.full.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else (this.requestFullscreen || this.webkitRequestFullscreen || function () {}).call(this);
      });

      // 키보드/유휴감지는 이 위젯 범위로만 한정 — 호스트 페이지의 다른 동작을 가로채지 않도록 함
      this.addEventListener('keydown', (ev) => {
        const t = ev.target;
        if (t && (t.tagName === 'SELECT' || t.tagName === 'INPUT')) return;
        if (ev.code === 'Space') { ev.preventDefault(); this._setPlay(!this._playing); }
        else if (ev.code === 'ArrowRight') this._go(1);
        else if (ev.code === 'ArrowLeft') this._go(-1);
      });
      ['mousemove', 'pointerdown', 'keydown', 'touchstart'].forEach((ev) => {
        this.addEventListener(ev, () => this._poke(), { passive: true });
      });

      if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        mq.addEventListener && mq.addEventListener('change', (ev) => {
          this._reduced = ev.matches;
          this.classList.toggle('reduced', this._reduced);
          this._buildSparkles();
        });
      }
    }
  }

  customElements.define('jewel-slideshow', JewelSlideshow);
})();
