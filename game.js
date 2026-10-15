/* ============================================================
   미궁 방어대 (Labyrinth Defense) — W1 프로토타입 v0.1
   16비트 도트 / 밝은 팔레트 · 논리 180×320 → 4배 = 720×1280
   조작: 조각 탭=회전, 칸 탭=배치  (런 90초 · 웨이브 15)
   게이트 G1: 결과 화면의 "한 판 더?" 응답을 기록
   ============================================================ */
(() => {
  'use strict';

  // ---------------------------------------------------------
  // 0. 설정
  // ---------------------------------------------------------
  const CFG = {
    LW: 180, LH: 320, SCALE: 4,
    RS: 6,                                // HD 렌더 배율(논리 180×320 → 버퍼 1080×1920)
    COLS: 7, ROWS: 9, CELL: 20,
    GX: 20, GY: 44,
    TRAY_Y: 252, TRAY_W: 52, TRAY_H: 46, TRAY_GAP: 6,
    runSeconds: 90,
    waves: 15,
    waveSeconds: 5,
    hpMax: 5,
    spawnStart: 1.60, spawnEnd: 0.55,     // 웨이브 1 → 15 스폰 간격
    speedStart: 1.15, speedEnd: 2.10,     // 칸/초
    ballistaEvery: 1.35,
    ballistaRange: 4.4,
    boltSpeed: 11,                        // 칸/초
    scoreKill: 10, scoreWave: 100, scoreNoDamage: 250, scoreHp: 200,
    blockRedrawMs: 240,                   // 경로 재계산 연출 시간
    goldStart: 20,                        // 시작 골드
    goldKill: 2,                          // 석궁 격퇴 골드
    goldLineKill: 4,                      // 줄 폭발 격퇴 골드
    goldWave: 10,                         // 웨이브 클리어 보너스
    goldGrantSec: 4,                      // 보급(무료 조각) 주기 — 소유 조각 없고 골드 부족일 때
    wavesPerStage: 10,                    // 스테이지 = 10웨이브 (클리어 시 강화 상점)
    stageSpeedStep: 0.06,                 // 스테이지마다 적 속도 +6%
    stageSpawnStep: 0.05,                 // 스테이지마다 스폰 간격 -5% (하한 0.45배)
    stageHpEvery: 2,                      // 2스테이지마다 적 HP +1
    stageClearHp: 1,                      // 스테이지 클리어 시 성 HP +1(최대까지)
    atkEvery: 0.85,                       // 적이 벽을 때리는 간격(초)
    atkDmg: 1,                            // 적 1회 타격 데미지
    duraMaxLv: 5, duraCost0: 15, duraCostStep: 10,   // 벽 내구도 업그레이드
    dmgMaxLv: 5, dmgCost0: 12, dmgCostStep: 8,       // 석궁 공격력 업그레이드
  };
  const HOLE = -2, BLOCK = 1, FLOOR = 0, CASTLE = 9, BALLISTA = 8, HOLE_C = 7;

  // 스폰 3구멍(상단 좌/중/우) + 성(하단 중앙)
  const HOLES = [[0, 0], [3, 0], [6, 0]];
  const CASTLE_CELL = [[3, 7], [3, 8]];      // 2칸 성
  const BALLISTAS = [[1, 3], [5, 3], [3, 5]];

  // 조각 정의 (셀 오프셋)
  const PIECES = [
    { id: 'dot',  cells: [[0, 0]], w: 1, h: 1, weight: 3 },
    { id: 'i2',   cells: [[0, 0], [0, 1]], w: 1, h: 2, weight: 5 },
    { id: 'i3',   cells: [[0, 0], [0, 1], [0, 2]], w: 1, h: 3, weight: 5 },
    { id: 'l3',   cells: [[0, 0], [1, 0], [1, 1]], w: 2, h: 2, weight: 3 },
    { id: 'i4',   cells: [[0, 0], [0, 1], [0, 2], [0, 3]], w: 1, h: 4, weight: 2 },
    { id: 'o4',   cells: [[0, 0], [0, 1], [1, 0], [1, 1]], w: 2, h: 2, weight: 2 },
    { id: 't4',   cells: [[0, 0], [1, 0], [2, 0], [1, 1]], w: 3, h: 2, weight: 2 },
  ];
  // 조각 가격(골드) — 도트는 싸고 길수록 비싸다
  const PRICE = { dot: 3, i2: 4, i3: 6, l3: 5, i4: 9, o4: 7, t4: 7 };

  // ---------------------------------------------------------
  // 1. 팔레트 (밝은 16비트 감성)
  // ---------------------------------------------------------
  const C = {
    ink:    '#252d44', inkSoft:'#3e4a68',
    sky:    '#7ec6f6', skyDk:  '#5aa9e0',
    grass1: '#a3e070', grass2: '#8cce5c', grass3:'#79bb4c',
    soil1:  '#e9d6a6', soil2:  '#d9c187', soil3:'#c0a370',
    rock1:  '#e2c69a', rock2:  '#c39a67', rock3:'#9c7648', rock4:'#7a5a36',
    wood1:  '#dda45f', wood2:  '#ad7333', wood3:'#7f5223',
    metal1: '#dfe7f3', metal2: '#a8b5cd', metal3:'#7f8ca6',
    castle1:'#fff6da', castle2:'#f4cf78', castle3:'#dda142', castle4:'#a9722a',
    path1:  '#fffdf0', path2:  '#ffe9a8',
    uiBg:   '#3f63b0', uiBg2:  '#2c4784', uiEdge:'#1c2f5c',
    cream:  '#fff8e0', white:  '#ffffff', gold: '#f7c64a', gold2:'#e0a52c',
    red:    '#f4595a', redDk:  '#c53b3f',
    blue:   '#4f8fe8', blueDk: '#2f66b8',
    green:  '#6cd755', greenDk:'#3f9a34',
    purple: '#b06be8', purpleDk:'#7c41ad',
    shadow: 'rgba(24,30,46,.30)',
  };
  const ENEMY_TINT = [C.red, C.blue, C.green, C.purple, C.gold];
  const ENEMY_DARK = [C.redDk, C.blueDk, C.greenDk, C.purpleDk, C.gold2];

  // ---------------------------------------------------------
  // 2. 캔버스 (논리 180×320 → 확대 720×1280, 보간 없음)
  // ---------------------------------------------------------
  const out = document.getElementById('game');
  const octx = out.getContext('2d');
  const buf = document.createElement('canvas');
  buf.width = CFG.LW * CFG.RS; buf.height = CFG.LH * CFG.RS;   // HD 버퍼(1080×1920)
  const ctx = buf.getContext('2d');
  ctx.scale(CFG.RS, CFG.RS);                                   // 논리 좌표 유지 + 6배 해상도
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';

  const UI = {
    start: document.getElementById('startScreen'),
    result: document.getElementById('resultScreen'),
    startBtn: document.getElementById('startButton'),
    nameInput: document.getElementById('nameInput'),
    resultTitle: document.getElementById('resultTitle'),
    rScore: document.getElementById('resultScore'),
    rWave: document.getElementById('resultWave'),
    rHp: document.getElementById('resultHp'),
    rStage: document.getElementById('resultStage'),
    rTime: document.getElementById('resultTime'),
    gateBox: document.getElementById('gateBox'),
    gateYes: document.getElementById('playAgainYes'),
    gateNo: document.getElementById('playAgainNo'),
    gateStat: document.getElementById('gateStat'),
    restart: document.getElementById('restartButton'),
    hint: document.getElementById('hintBar'),
    stageScreen: document.getElementById('stageScreen'),
    stageTitle: document.getElementById('stageTitle'),
    stageGold: document.getElementById('stageGold'),
    upCannon: document.getElementById('upCannon'),
    upDura: document.getElementById('upDura'),
    nextStage: document.getElementById('nextStage'),
  };
  const show = (el, on) => { el.classList.toggle('on', !!on); el.setAttribute('aria-hidden', on ? 'false' : 'true'); };

  // ---------------------------------------------------------
  // 3. 유틸 · 난수(시드)
  // ---------------------------------------------------------
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist2 = (x1, y1, x2, y2) => Math.abs(x1 - x2) + Math.abs(y1 - y2);

  // 사각형 (HD: 소수 좌표 허용 → 안티에일리어싱)
  function px(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }

  // ── HD 아트 헬퍼 ────────────────────────────────────────────
  function hash01(a, b, c = 0) {            // 좌표 기반 결정론 노이즈(0~1)
    let h = Math.imul((a * 374761393 + b * 668265263 + c * 2147483647) | 0, 1274126177);
    h ^= h >>> 13;
    return ((h >>> 0) % 1000) / 1000;
  }
  function linGrad(x, y, w, h, stops) {     // 세로 그라디언트
    const g = ctx.createLinearGradient(x, y, x, y + h);
    for (const [p, c] of stops) g.addColorStop(p, c);
    return g;
  }
  function rrect(x, y, w, h, r) {           // 둥근 사각 패스
    const rr0 = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, rr0);
    else {
      ctx.moveTo(x + rr0, y); ctx.lineTo(x + w - rr0, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr0);
      ctx.lineTo(x + w, y + h - rr0); ctx.quadraticCurveTo(x + w, y + h, x + w - rr0, y + h);
      ctx.lineTo(x + rr0, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rr0);
      ctx.lineTo(x, y + rr0); ctx.quadraticCurveTo(x, y, x + rr0, y); ctx.closePath();
    }
  }
  function fillRR(x, y, w, h, r, fill) { rrect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
  function strokeRR(x, y, w, h, r, stroke, lw = 1) { rrect(x, y, w, h, r); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }

  // 작은 픽셀 폰트(3×5) — 숫자와 기호만
  const GLYPH = {
    '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
    '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '111', '001', '111'],
    '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
    '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'],
    '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'],
    ' ': ['000', '000', '000', '000', '000'],
    ':': ['000', '010', '000', '010', '000'], '+': ['000', '010', '111', '010', '000'],
    '-': ['000', '000', '111', '000', '000'], '/': ['001', '001', '010', '100', '100'],
    '!': ['010', '010', '010', '000', '010'], '.': ['000', '000', '000', '000', '010'],
    'A': ['010', '101', '111', '101', '101'], 'B': ['110', '101', '110', '101', '110'],
    'C': ['011', '100', '100', '100', '011'], 'D': ['110', '101', '101', '101', '110'],
    'E': ['111', '100', '110', '100', '111'], 'F': ['111', '100', '110', '100', '100'],
    'G': ['011', '100', '101', '101', '011'], 'H': ['101', '101', '111', '101', '101'],
    'I': ['111', '010', '010', '010', '111'], 'J': ['001', '001', '001', '101', '010'],
    'K': ['101', '101', '110', '101', '101'], 'L': ['100', '100', '100', '100', '111'],
    'M': ['101', '111', '111', '101', '101'], 'N': ['101', '111', '101', '101', '101'],
    'O': ['010', '101', '101', '101', '010'], 'P': ['111', '101', '111', '100', '100'],
    'Q': ['010', '101', '101', '111', '011'], 'R': ['111', '101', '111', '110', '101'],
    'S': ['111', '100', '111', '001', '111'], 'T': ['111', '010', '010', '010', '010'],
    'U': ['101', '101', '101', '101', '111'], 'V': ['101', '101', '101', '101', '010'],
    'W': ['101', '101', '101', '111', '101'], 'X': ['101', '101', '010', '101', '101'],
    'Y': ['101', '101', '010', '010', '010'], 'Z': ['111', '001', '010', '100', '111'],
  };
  const UI_FONT = '"Trebuchet MS","Segoe UI",system-ui,sans-serif';
  const fontOf = (s) => '900 ' + (6.6 * s).toFixed(2) + 'px ' + UI_FONT;
  function text(str, x, y, col, s = 1) {
    ctx.save();
    ctx.font = fontOf(s);
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(12,16,30,.55)'; ctx.shadowBlur = 1.8 * s; ctx.shadowOffsetY = .7 * s;
    ctx.fillStyle = col;
    ctx.fillText(String(str), x, y - .6 * s);
    ctx.restore();
    return x + textW(str, s);
  }
  const textW = (str, s = 1) => {
    ctx.save(); ctx.font = fontOf(s);
    const w = ctx.measureText(String(str)).width;
    ctx.restore();
    return w;
  };

  // ---------------------------------------------------------
  // 4. 스프라이트(문자열 아트) — 16비트 도트 캐릭터
  // ---------------------------------------------------------
  const SPRITE_MAP = {
    K: C.ink, w: C.rock1, W: C.rock2, b: C.rock3, B: C.rock4,
    c: C.castle1, C2: C.castle2, C3: C.castle3, C4: C.castle4,
    t: C.wood1, T: C.wood2, U: C.wood3,
    m: C.metal1, M: C.metal2, n: C.metal3,
    e: C.cream, g: C.gold, G: C.gold2, s: C.shadow,
  };
  const ART = {
    castle: [
      '..KKKKKKKKKK..',
      '.KcCC2C2C2C2cK',
      'KcC2C2C2C2C2C2K',
      'KC2C2C2C2C2C2C2K',
      'KC2C2C3C3C2C2C2K',
      'KC3KC3C3KC3C3C2K',
      'KC3C3C3C3C3C3C2K',
      'KBC4C4C4C4C4C4BK',
      '.KBBBBBBBBBBBK.',
      '..KKKKKKKKKK..',
    ],
    ballista: [
      '..KttttK..',
      '.KtTtTttK.',
      'KtTnnnnTtK',
      'KtUnmnUmTK',
      '.KUnnnmUK.',
      '..KUttUK..',
      '...KTTK...',
      '..KTTTTK..',
    ],
    enemy: [
      '..KKKK..',
      '.KaaaaK.',
      'KaKKaaK.',   // 눈
      'KaKKaaK.',
      'KaaaaaaK',
      'KaKaaKaK',   // 이빨
      '.KKKKKK.',
    ],
  };
  // 문자열 아트를 '프리렌더 스프라이트'로 → 둥근 셀 + 셀별 그라디언트 + 실루엣 외곽선
  const spriteCache = {};
  const SS = 8;                                   // 슈퍼샘플링 배율(안티에일리어싱)
  function shade(hex, amt) {
    if (typeof hex !== 'string' || hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt))));
    return 'rgb(' + f((n >> 16) & 255) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
  }
  function sprite(name, scale, tint) {
    const key = name + '|' + scale + '|' + (tint || '');
    if (spriteCache[key]) return spriteCache[key];
    const art = ART[name];
    const cell = scale * SS;
    const cv = document.createElement('canvas');
    cv.width = art[0].length * cell; cv.height = art.length * cell;
    cv.logicalW = art[0].length * scale; cv.logicalH = art.length * scale;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = true;
    const radius = cell * 0.34;
    const cellRR = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
    const colOf = (ch) => {
      let col = SPRITE_MAP[ch];
      if (tint) col = (ch === 'K') ? C.ink : (ch === 'a' ? tint : col);
      return col;
    };
    const solid = (r, c) => r >= 0 && r < art.length && c >= 0 && c < art[r].length && art[r][c] !== '.';
    // 1) 실루엣 외곽선 — 셀을 이어 붙여 '하나의 덩어리'로
    g.fillStyle = 'rgba(20,24,42,.95)';
    for (let r = 0; r < art.length; r++) for (let c = 0; c < art[r].length; c++) {
      if (!solid(r, c)) continue;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        cellRR(c * cell + dx * cell * .16, r * cell + dy * cell * .16, cell, cell, radius);
      }
    }
    // 2) 본체 — 빈틈없이 붙여 부드러운 실루엣
    for (let r = 0; r < art.length; r++) for (let c = 0; c < art[r].length; c++) {
      if (!solid(r, c)) continue;
      const ch = art[r][c];
      const col = colOf(ch) || '#888888';
      cellRR(c * cell + .25, r * cell + .25, cell - .5, cell - .5, radius * .8);
      g.fillStyle = (ch === 'K') ? '#2a3150' : col;
      g.fill();
    }
    // 3) 생물감 — 몸통에 맞닿은 K 셀(눈·이빨)에 밝은 하이라이트
    for (let r = 0; r < art.length; r++) for (let c = 0; c < art[r].length; c++) {
      if (art[r][c] !== 'K') continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => solid(r + dy, c + dx) && art[r + dy][c + dx] === 'a');
      if (!near) continue;
      const ex = c * cell + cell * .5, ey = r * cell + cell * .5;
      const gg = g.createRadialGradient(ex, ey, 0, ex, ey, cell * .34);
      gg.addColorStop(0, 'rgba(255,250,232,.92)');
      gg.addColorStop(.55, 'rgba(255,246,210,.42)');
      gg.addColorStop(1, 'rgba(255,240,190,0)');
      g.fillStyle = gg; g.beginPath(); g.arc(ex, ey, cell * .34, 0, Math.PI * 2); g.fill();
    }
    // 4) 스프라이트 전체 위→아래 조명(프리렌더 감성) — 실루엣 안쪽만
    g.globalCompositeOperation = 'source-atop';
    const lgBody = g.createLinearGradient(0, 0, 0, cv.height);
    lgBody.addColorStop(0, 'rgba(255,255,255,.34)');
    lgBody.addColorStop(.42, 'rgba(255,255,255,.05)');
    lgBody.addColorStop(1, 'rgba(22,18,38,.32)');
    g.fillStyle = lgBody; g.fillRect(0, 0, cv.width, cv.height);
    // 5) 좌상단 광택
    const sp = g.createRadialGradient(cv.width * .30, cv.height * .24, 0, cv.width * .30, cv.height * .24, cv.width * .46);
    sp.addColorStop(0, 'rgba(255,255,255,.40)');
    sp.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sp; g.fillRect(0, 0, cv.width, cv.height);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    spriteCache[key] = cv;
    return cv;
  }

  // ---------------------------------------------------------
  // 5. 상태
  // ---------------------------------------------------------
  const S = {
    phase: 'title',          // title | playing | result | gate
    seed: 1, rnd: Math.random,
    grid: [],                // ROWS×COLS: FLOOR/BLOCK/CASTLE/BALLISTA/HOLE_C
    dist: [],                // 성까지 거리(칸) — BFS
    distOfHoles: [],
    pieces: [],              // 현재 3택1
    sel: 0,
    rot: 0,
    enemies: [], bolts: [], fx: [],
    hp: CFG.hpMax, score: 0, wave: 1, kills: 0,
    time: 0, waveTime: 0, spawnT: 0, waveDmg: false, noDmgStreak: 0, bestStreak: 0,
    runTime: 0, dtScale: 1, autoplay: false,
    redraw: 0, flash: 0, shake: 0, banner: 0, bannerSub: '',
    name: '', gateAnswer: null, gateLog: [],
    hspeed: 0,
    paused: false, stepCount: 0, traceOn: false, traceEvery: 1, trace: [],
    gridVer: 0, hintCache: null, jamT: 0, rerollCount: 0,
    gold: 0, shop: [false, false, false], grantT: 0, goldPulse: 0, bought: 0,
    bhp: [], durLv: 1, dmgLv: 1, durUp: 0, dmgUp: 0, wallBreak: 0,
    stage: 1, bestStage: 1, stageClears: 0,
  };

  /** 결정론 진단용 상태 해시 */
  function stateHash() {
    const e = S.enemies.map(v => v.id + ':' + v.x.toFixed(3) + ':' + v.y.toFixed(3) + ':' + v.hp).join('|');
    const b = S.bolts.map(v => v.target + ':' + v.x.toFixed(3) + ':' + v.y.toFixed(3)).join('|');
    return [S.score, S.hp, S.kills, S.wave, S.runTime.toFixed(2), S.enemies.length, S.pieces.map(p => p.id).join(''), e, b,
      S.grid.flat().join('')].join('#');
  }

  // ---------------------------------------------------------
  // 6. 격자 · BFS 경로
  // ---------------------------------------------------------
  function newGrid() {
    const g = [];
    for (let r = 0; r < CFG.ROWS; r++) {
      const row = [];
      for (let c = 0; c < CFG.COLS; c++) row.push(FLOOR);
      g.push(row);
    }
    for (const [c, r] of CASTLE_CELL) g[r][c] = CASTLE;
    for (const [c, r] of BALLISTAS) g[r][c] = BALLISTA;
    for (const [c, r] of HOLES) g[r][c] = HOLE_C;
    return g;
  }
  const isFree = (c, r) => c >= 0 && c < CFG.COLS && r >= 0 && r < CFG.ROWS && S.grid[r][c] === FLOOR;
  const isBlocked = (c, r) => c < 0 || c >= CFG.COLS || r < 0 || r >= CFG.ROWS ||
    S.grid[r][c] === BLOCK || S.grid[r][c] === CASTLE || S.grid[r][c] === BALLISTA;

  /** 성에서 BFS → 모든 칸의 거리(칸 단위). 도달 불가 = -1 */
  function computeDist() {
    const d = [];
    for (let r = 0; r < CFG.ROWS; r++) d.push(new Array(CFG.COLS).fill(-1));
    const q = [];
    // 성 칸에서 시작
    for (const [c, r] of CASTLE_CELL) {
      if (S.grid[r][c] === CASTLE) { d[r][c] = 0; q.push([c, r]); }
    }
    for (let i = 0; i < q.length; i++) {
      const [c, r] = q[i];
      const nd = d[r][c] + 1;
      const nb = [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]];
      for (const [nc, nr] of nb) {
        if (nc < 0 || nc >= CFG.COLS || nr < 0 || nr >= CFG.ROWS) continue;
        if (d[nr][nc] !== -1) continue;
        const t = S.grid[nr][nc];
        if (t === BLOCK || t === BALLISTA) continue;   // 성은 진입 가능(목표)
        d[nr][nc] = nd; q.push([nc, nr]);
      }
    }
    S.dist = d;
    S.distOfHoles = HOLES.map(([c, r]) => d[r][c]);
    return d;
  }
  /** 경로 총 길이(가장 긴 구멍 경로) — "경로 +N칸" 미리보기용 */
  function pathLen() {
    let best = -1, alive = 0;
    for (const v of S.distOfHoles) { if (v >= 0) { alive++; if (v > best) best = v; } }
    return { len: best, reach: alive };
  }
  /** 배치 후보가 세 구멍 모두를 막지 않는지 */
  function placementKeepsPaths(cells) {
    const saved = cells.map(([c, r]) => S.grid[r][c]);
    cells.forEach(([c, r]) => { S.grid[r][c] = BLOCK; });
    computeDist();
    const ok = S.distOfHoles.every(v => v >= 0);
    // 2026-10-14 수정: 복원 인덱스가 전치되어 있었다([c,r] → S.grid[c][r]).
    //   임시 블록이 지워지지 않고 남아 격자가 오염되고(유령 블록) 행 길이까지 늘어났다(v0.1부터 있던 버그).
    cells.forEach(([c, r], i) => { S.grid[r][c] = saved[i]; });
    computeDist();
    return ok;
  }
  function pieceCells(p, rot) {
    const list = p.cells;
    let out2 = list;
    const r = ((rot % 4) + 4) % 4;
    for (let i = 0; i < r; i++) out2 = out2.map(([c, r2]) => [r2, -(c)]);
    const minc = Math.min(...out2.map(v => v[0])), minr = Math.min(...out2.map(v => v[1]));
    return out2.map(([c, r2]) => [c - minc, r2 - minr]);
  }
  function canPlaceAt(cells, c0, r0) {
    for (const [dc, dr] of cells) {
      const c = c0 + dc, r = r0 + dr;
      if (!isFree(c, r)) return false;
    }
    return true;
  }

  // ---------------------------------------------------------
  // 7. 런 시작 / 종료
  // ---------------------------------------------------------
  function startRun(seed) {
    S.seed = (seed === undefined || seed === null) ? (Date.now() & 0x7fffffff) : (seed | 0);
    S.rnd = mulberry32(S.seed);
    S.grid = newGrid();
    S.bhp = S.grid.map(row => row.map(() => 0));   // 블록 내구도
    computeDist();
    S.pieces = drawPieces(3);
    S.sel = 0; S.rot = 0;
    S.enemies = []; S.bolts = []; S.fx = [];
    S.hp = CFG.hpMax; S.score = 0; S.wave = 1; S.kills = 0;
    S.time = 0; S.waveTime = 0; S.spawnT = 0.7;
    S.waveDmg = false; S.noDmgStreak = 0; S.bestStreak = 0;
    S.runTime = 0; S.dtScale = 1; S.hspeed = 0;
    autoplayTick._t = 0; spawn._id = 0;   // 런 간 잔존 상태 초기화(결정론)
    S.redraw = .3; S.flash = 0; S.shake = 0; S.gridVer = 0; S.hintCache = null;
    S.jamT = 0; S.rerollCount = 0;
    S.gold = CFG.goldStart; S.shop = [false, false, false];
    S.grantT = CFG.goldGrantSec; S.goldPulse = 0; S.bought = 0;
    S.durLv = 1; S.dmgLv = 1; S.durUp = 0; S.dmgUp = 0; S.wallBreak = 0;
    S.stage = 1; S.bestStage = 1; S.stageClears = 0;
    S.banner = 1.6; S.bannerSub = 'GO!';
    S.gateAnswer = null;
    S.phase = 'playing';
    show(UI.start, false); show(UI.result, false);
    UI.hint.textContent = '드래그 = 배치 · 탭 = 회전 · 잠긴 슬롯 = 구매 · 하단 칩 = 업그레이드';
  }
  function drawPieces(n) {
    const total = PIECES.reduce((a, p) => a + p.weight, 0);
    const pick = () => {
      let v = S.rnd() * total;
      for (const p of PIECES) { v -= p.weight; if (v <= 0) return p; }
      return PIECES[0];
    };
    const out2 = [];
    while (out2.length < n) { const p = pick(); if (!out2.includes(p)) out2.push(p); }
    return out2;
  }

  // ── 상점(골드로 조각 구매) ──────────────────────────────
  function priceOf(p) { return (p && PRICE[p.id]) || 5; }
  /** 슬롯 i 를 '판매 중' 상태로 (미구매) */
  function offerSlot(i, forced) {
    S.pieces[i] = forced || drawPieces(1)[0];
    S.shop[i] = true;
  }
  function canAfford(i) { return !S.shop[i] || S.gold >= priceOf(S.pieces[i]); }
  // ── 업그레이드(골드) ────────────────────────────────
  function duraCost() { return CFG.duraCost0 + (S.durLv - 1) * CFG.duraCostStep; }
  function dmgCost() { return CFG.dmgCost0 + (S.dmgLv - 1) * CFG.dmgCostStep; }
  function buyDurability() {
    if (S.durLv >= CFG.duraMaxLv) return false;
    const cost = duraCost();
    if (S.gold < cost) { S.flash = .18; S.goldPulse = -1; return false; }
    S.gold -= cost; S.durLv++; S.durUp++; S.goldPulse = 1;
    for (let r = 0; r < CFG.ROWS; r++) for (let c = 0; c < CFG.COLS; c++)
      if (S.grid[r][c] === BLOCK) S.bhp[r][c] = Math.min(S.durLv, (S.bhp[r][c] || 1) + 1);  // 기존 벽 보강
    S.banner = 1.0; S.bannerSub = '보강 Lv' + S.durLv;
    if (S.phase === 'stageclear') refreshStageUI();
    return true;
  }
  function buyDamage() {
    if (S.dmgLv >= CFG.dmgMaxLv) return false;
    const cost = dmgCost();
    if (S.gold < cost) { S.flash = .18; S.goldPulse = -1; return false; }
    S.gold -= cost; S.dmgLv++; S.dmgUp++; S.goldPulse = 1;
    S.banner = 1.0; S.bannerSub = '대포 Lv' + S.dmgLv;
    if (S.phase === 'stageclear') refreshStageUI();
    return true;
  }

  function buySlot(i) {
    if (!S.shop[i]) return true;
    const cost = priceOf(S.pieces[i]);
    if (S.gold < cost) { S.flash = .18; S.goldPulse = -1; return false; }
    S.gold -= cost; S.shop[i] = false; S.goldPulse = 1; S.bought++;
    return true;
  }

  // ── 스테이지 진행(10웨이브 = 1스테이지) ──────────────
  function stageClear() {
    S.phase = 'stageclear';
    S.stageClears++;
    S.bestStage = Math.max(S.bestStage, S.stage);
    S.hp = Math.min(CFG.hpMax, S.hp + CFG.stageClearHp);   // 보상: 성 HP 회복
    S.gold += 10 + S.stage * 5;                            // 보상: 골드
    S.goldPulse = 1;
    refreshStageUI();
    show(UI.stageScreen, true);
    computationPause();
  }
  function computationPause() { /* phase==='stageclear' 이면 update()가 멈춘다 */ }
  function nextStage() {
    S.stage++; S.bestStage = Math.max(S.bestStage, S.stage);
    S.wave = 1; S.waveTime = 0; S.spawnT = 0.7;
    S.enemies = []; S.bolts = []; S.fx = [];
    S.waveDmg = false;
    S.banner = 1.5; S.bannerSub = 'STAGE ' + S.stage;
    S.phase = 'playing';
    computeDist();
    show(UI.stageScreen, false);
  }
  /** 스테이지 클리어 화면의 강화 버튼/수치 갱신 */
  function refreshStageUI() {
    if (!UI.stageScreen) return;
    UI.stageTitle.textContent = 'STAGE ' + S.stage + ' 클리어!';
    UI.stageGold.textContent = String(S.gold);
    const dOk = S.dmgLv < CFG.dmgMaxLv, uOk = S.durLv < CFG.duraMaxLv;
    UI.upCannon.textContent = dOk
      ? '대포 공격력 Lv' + S.dmgLv + ' → ' + (S.dmgLv + 1) + '  (' + dmgCost() + 'G)'
      : '대포 공격력 MAX (Lv' + S.dmgLv + ')';
    UI.upDura.textContent = uOk
      ? '벽 내구도 Lv' + S.durLv + ' → ' + (S.durLv + 1) + '  (' + duraCost() + 'G)'
      : '벽 내구도 MAX (Lv' + S.durLv + ')';
    UI.upCannon.disabled = !dOk || S.gold < dmgCost();
    UI.upDura.disabled = !uOk || S.gold < duraCost();
  }

  function endRun(reason) {
    S.phase = 'result';
    const waveScore = (S.wave - 1) * CFG.scoreWave;
    const hpBonus = S.hp * CFG.scoreHp;
    const streakBonus = S.bestStreak * CFG.scoreNoDamage;
    S.score += waveScore + hpBonus + streakBonus;
    UI.rScore.textContent = S.score.toLocaleString();
    UI.rWave.textContent = ((S.stage - 1) * CFG.wavesPerStage + Math.max(0, S.wave - 1)) + ' / 스테이지당 ' + CFG.wavesPerStage;
    UI.rStage.textContent = 'STAGE ' + S.stage + ' (클리어 ' + S.stageClears + '회)';
    UI.rHp.textContent = S.hp + ' / ' + CFG.hpMax;
    UI.rTime.textContent = S.runTime.toFixed(0) + '초';
    UI.resultTitle.textContent = reason === 'time' ? '시간 종료' : '성이 함락됐다';
    UI.gateBox.classList.remove('hidden');
    UI.restart.classList.add('hidden');
    show(UI.result, true);
    refreshGateStat();
  }

  // 게이트 G1 기록
  const GATE_KEY = 'ld_gate_v1';
  function gateLogLoad() { try { return JSON.parse(localStorage.getItem(GATE_KEY) || '[]'); } catch (e) { return []; } }
  function gateLogSave(v) { try { localStorage.setItem(GATE_KEY, JSON.stringify(v)); } catch (e) { } }
  function refreshGateStat() {
    const log = gateLogLoad();
    const yes = log.filter(v => v === 'yes').length;
    const pct = log.length ? Math.round(yes * 100 / log.length) : 0;
    S.gateLog = log;
    UI.gateStat.textContent = log.length
      ? `지금까지 ${log.length}명 응답 · "한 판 더" ${yes}명 (${pct}%)`
      : '첫 응답입니다';
  }
  function answerGate(yes) {
    S.gateAnswer = yes ? 'yes' : 'no';
    const log = gateLogLoad(); log.push(S.gateAnswer); gateLogSave(log);
    if (yes) { startRun(S.seed + 1); }           // 재시작 0.4초 규칙(즉시)
    else {
      UI.gateBox.classList.add('hidden');
      UI.restart.classList.remove('hidden');
      refreshGateStat();
    }
  }

  // ---------------------------------------------------------
  // 8. 배치 · 줄 폭발
  // ---------------------------------------------------------
  function previewPath(cells, c0, r0) {
    const saved = cells.map(([dc, dr]) => S.grid[r0 + dr][c0 + dc]);
    cells.forEach(([dc, dr]) => { S.grid[r0 + dr][c0 + dc] = BLOCK; });
    computeDist();
    const p = pathLen();
    cells.forEach(([dc, dr], i) => { S.grid[r0 + dr][c0 + dc] = saved[i]; });
    computeDist();
    return p;
  }

  function tryPlace(c0, r0) {
    if (S.phase !== 'playing') return false;
    const p = S.pieces[S.sel];
    if (!p) return false;
    if (S.shop[S.sel]) return false;             // 미구매 슬롯은 배치 불가(먼저 구매)
    const cells = pieceCells(p, S.rot);
    // 격자 안으로 보정(가운데 정렬감)
    if (!canPlaceAt(cells, c0, r0)) return false;
    // v0.5: 길을 막아도 배치 가능 — 막히면 적이 벽을 부수고 뚫는다
    cells.forEach(([dc, dr]) => {
      S.grid[r0 + dr][c0 + dc] = BLOCK;
      S.bhp[r0 + dr][c0 + dc] = S.durLv;        // 이 시점 내구도 Lv 가 HP
    });
    computeDist();
    S.gridVer++; S.hintCache = null;
    S.redraw = CFG.blockRedrawMs / 1000;
    addFx('place', c0, r0);
    // 사용한 슬롯은 다시 판매 중 → 골드로 재구매
    offerSlot(S.sel);
    S.sel = 0; S.rot = 0;
    checkLines();
    return true;
  }

  /** 선택 조각으로 얻을 수 있는 최대 경로 증가분 — "PATH +N" 학습 보조 */
  function bestGain() {
    const p = S.pieces[S.sel];
    if (!p) return null;
    const key = [S.sel, S.rot, S.pieces.length, S.gridVer].join('/');
    if (S.hintCache && S.hintCache.key === key) return S.hintCache;
    const cur = pathLen().len;
    let best = null;
    for (let rot = 0; rot < 4; rot++) {
      const cells = pieceCells(p, rot);
      for (let r = 0; r < CFG.ROWS; r++) {
        for (let c = 0; c < CFG.COLS; c++) {
          let ok = true;
          for (const [dc, dr] of cells) if (!isFree(c + dc, r + dr)) { ok = false; break; }
          if (!ok) continue;
          const pv = previewPath(cells, c, r);
          if (pv.len < 0) continue;
          const gain = pv.len - cur;
          if (!best || gain > best.gain) best = { gain: gain, at: [c, r] };
        }
      }
    }
    S.hintCache = { key: key, cur: cur, gain: best ? best.gain : null, at: best ? best.at : null };
    return S.hintCache;
  }

  /** 막힘 해소: 배치 가능한 수가 하나도 없으면 (1) 조각 리롤 → (2) 숨통(최다 채운 줄 자동 폭발) */
  function jamRelief(dt) {
    S.jamT += dt;
    if (S.jamT < 1.2) return;
    S.jamT = 0;
    const anyFit = S.pieces.some(p => {
      for (let rot = 0; rot < 4; rot++) {
        const cells = pieceCells(p, rot);
        for (let r = 0; r < CFG.ROWS; r++) {
          for (let c = 0; c < CFG.COLS; c++) {
            let ok = true;
            for (const [dc, dr] of cells) if (!isFree(c + dc, r + dr)) { ok = false; break; }
            if (!ok) continue;
            const pv = previewPath(cells, c, r);
            if (pv.len >= 0) return true;
          }
        }
      }
      return false;
    });
    if (anyFit) { S.rerollCount = 0; return; }
    if (S.rerollCount < 2) {                       // 1단계: 조각 3개 교체
      S.rerollCount++;
      S.pieces = drawPieces(3); S.sel = 0; S.rot = 0; S.hintCache = null;
      S.banner = 1.1; S.bannerSub = 'REROLL!';
      return;
    }
    // 2단계: 가장 많이 채워진 줄을 폭발시켜 공간 회복
    S.rerollCount = 0;
    let pick = null, pickN = -1;
    for (let r = 0; r < CFG.ROWS; r++) {
      const n = S.grid[r].filter(v => v === BLOCK).length;
      if (n > pickN) { pickN = n; pick = { kind: 'row', i: r }; }
    }
    for (let c = 0; c < CFG.COLS; c++) {
      let n = 0;
      for (let r = 0; r < CFG.ROWS; r++) if (S.grid[r][c] === BLOCK) n++;
      if (n > pickN) { pickN = n; pick = { kind: 'col', i: c }; }
    }
    if (!pick || pickN <= 0) return;
    if (pick.kind === 'row') {
      for (let c = 0; c < CFG.COLS; c++) if (S.grid[pick.i][c] === BLOCK) { S.grid[pick.i][c] = FLOOR; addFx('burst', c, pick.i); }
    } else {
      for (let r = 0; r < CFG.ROWS; r++) if (S.grid[r][pick.i] === BLOCK) { S.grid[r][pick.i] = FLOOR; addFx('burst', pick.i, r); }
    }
    S.gridVer++; S.hintCache = null;
    S.shake = 6; S.flash = .25;
    S.banner = 1.3; S.bannerSub = 'RELIEF!';
    computeDist();
  }

  /** 가로/세로가 블록으로 꽉 찬 줄 폭발 */
  function checkLines() {
    const rows = [], cols = [];
    for (let r = 0; r < CFG.ROWS; r++) {
      let full = true;
      for (let c = 0; c < CFG.COLS; c++) if (S.grid[r][c] !== BLOCK) { full = false; break; }
      if (full) rows.push(r);
    }
    for (let c = 0; c < CFG.COLS; c++) {
      let full = true;
      for (let r = 0; r < CFG.ROWS; r++) if (S.grid[r][c] !== BLOCK) { full = false; break; }
      if (full) cols.push(c);
    }
    if (!rows.length && !cols.length) return;
    let hit = 0;
    for (const r of rows) for (let c = 0; c < CFG.COLS; c++) { if (S.grid[r][c] === BLOCK) S.grid[r][c] = FLOOR; addFx('burst', c, r); }
    for (const c of cols) for (let r = 0; r < CFG.ROWS; r++) { if (S.grid[r][c] === BLOCK) S.grid[r][c] = FLOOR; addFx('burst', c, r); }
    // 줄 위 적 전멸
    S.enemies = S.enemies.filter(e => {
      const onRow = rows.includes(Math.round(e.y)), onCol = cols.includes(Math.round(e.x));
      if (onRow || onCol) { hit++; S.kills++; S.score += CFG.scoreKill * 2; S.gold += CFG.goldLineKill; addFx('kill', e.x, e.y); return false; }
      return true;
    });
    const lines = rows.length + cols.length;
    S.score += lines * 60 + hit * 15;
    S.hp = Math.min(CFG.hpMax, S.hp + 1);
    S.noDmgStreak++;
    S.bestStreak = Math.max(S.bestStreak, S.noDmgStreak);
    S.shake = 7; S.flash = .3;
    S.banner = 1.3; S.bannerSub = lines > 1 ? 'DOUBLE CLEAR!' : 'LINE CLEAR!';
    S.gridVer++; S.hintCache = null;
    computeDist();
  }

  // ---------------------------------------------------------
  // 9. 적 · 석궁
  // ---------------------------------------------------------
  const waveT = (a, b) => lerp(a, b, (S.wave - 1) / (CFG.waves - 1));
  function enemySpeed() {
    const base = lerp(CFG.speedStart, CFG.speedEnd, (S.wave - 1) / (CFG.wavesPerStage - 1));
    return base * (1 + (S.stage - 1) * CFG.stageSpeedStep);
  }

  function spawn() {
    // v0.5: 구멍이 막혀 있어도 스폰한다(적이 벽을 부수고 뚫는다)
    const cand = HOLES;
    const h = cand[Math.floor(S.rnd() * cand.length)];
    const tintIdx = Math.min(ENEMY_TINT.length - 1, Math.floor((S.wave - 1) / 3));
    S.enemies.push({
      id: ++spawn._id || (spawn._id = 1),
      x: h[0], y: h[1] + 0.15,
      hp: 1 + Math.floor((S.stage - 1) / CFG.stageHpEvery) + (S.wave >= CFG.wavesPerStage - 1 ? 1 : 0),
      tint: tintIdx,
      spd: enemySpeed() * (1 + (S.rnd() - .5) * .12), t: 0,
    });
  }
  function moveEnemies(dt) {
    for (const e of S.enemies) {
      e.t += dt;
      if (e.atkAnim > 0) e.atkAnim = Math.max(0, e.atkAnim - dt);
      let step = e.spd * dt;
      let guard = 0;
      // 2026-10-14 수정: 기존 로직은 '셀 중심 정렬창(0.02)'이 프레임당 이동량(spd/60)보다 커서
      // 적이 스폰 칸에서 앞뒤로 진동하며 영원히 전진하지 못했다(v0.1부터 있던 버그).
      // 목표 칸을 유지(e.tx/e.ty)하고 도달 시에만 다음 칸을 재계산하도록 바꿔 경로를 따라 진행한다.
      while (step > 1e-9 && guard++ < 128) {
        if (e.tx === undefined) {
          const tc = Math.round(e.x), tr = Math.round(e.y);
          const row = S.dist[tr];
          const here = (row && row[tc] !== undefined) ? row[tc] : -1;
          if (here === 0) {                       // 성 도달
            e.dead = true; S.hp -= 1; S.shake = 6; S.flash = .22;
            S.waveDmg = true; S.noDmgStreak = 0;
            addFx('hit', tc, tr);
            break;
          }
          let best = here, bc = tc, br = tr;
          const nb = [[tc + 1, tr], [tc - 1, tr], [tc, tr + 1], [tc, tr - 1]];
          for (const [c2, r2] of nb) {
            if (c2 < 0 || c2 >= CFG.COLS || r2 < 0 || r2 >= CFG.ROWS) continue;
            const d = S.dist[r2][c2];
            if (d >= 0 && (best < 0 || d < best)) { best = d; bc = c2; br = r2; }
          }
          if (best < 0) {                          // v0.5: 막힘 → 앞을 막은 벽을 부순다
            const tgt = pickBlockTarget(tc, tr);
            if (tgt) {
              e.atkCd = (e.atkCd === undefined ? 0 : e.atkCd) - dt;
              if (e.atkCd <= 0) { e.atkCd = CFG.atkEvery; hitBlock(tgt[0], tgt[1], CFG.atkDmg); }
              e.atkAnim = .28;
            }
            break;
          }
          e.tx = bc; e.ty = br;
        }
        const dx = e.tx - e.x, dy = e.ty - e.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-9) { e.tx = undefined; continue; }
        const mv = Math.min(step, len);
        e.x += dx / len * mv; e.y += dy / len * mv;
        step -= mv;
        if (len - mv < 1e-9) e.tx = undefined;    // 칸 도달 → 다음 칸 재계산
      }
      if (S.hp <= 0) break;
    }
    S.enemies = S.enemies.filter(e => !e.dead);
    if (S.noDmgStreak > S.bestStreak) S.bestStreak = S.noDmgStreak;
  }

  /** 막혔을 때 부술 인접 벽 고르기 — 가장 가까운 통로(dist 낮은 칸)에 붙은 벽을 우선 */
  function pickBlockTarget(c, r) {
    let best = null, bestScore = 1e9;
    for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
      if (nc < 0 || nc >= CFG.COLS || nr < 0 || nr >= CFG.ROWS) continue;
      if (S.grid[nr][nc] !== BLOCK) continue;
      let score = 1e9;
      for (const [mc, mr] of [[nc + 1, nr], [nc - 1, nr], [nc, nr + 1], [nc, nr - 1]]) {
        if (mc < 0 || mc >= CFG.COLS || mr < 0 || mr >= CFG.ROWS) continue;
        const d = S.dist[mr][mc];
        if (d >= 0 && d < score) score = d;
      }
      if (score < bestScore) { bestScore = score; best = [nc, nr]; }
    }
    return best;
  }
  /** 벽 타격 — 내구도 감소, 0 이하면 부서지고 경로 재계산 */
  function hitBlock(c, r, dmg) {
    if (S.grid[r][c] !== BLOCK) return false;
    S.bhp[r][c] = (S.bhp[r][c] || 1) - dmg;
    addFx('chip', c, r);
    if (S.bhp[r][c] <= 0) {
      S.grid[r][c] = FLOOR; S.bhp[r][c] = 0;
      S.gridVer++; S.hintCache = null;
      computeDist();
      addFx('burst', c, r);
      S.shake = Math.max(S.shake, 2.6);
      S.wallBreak++;
    }
    return true;
  }

  const fireCd = new Map();
  function fireBallistae(dt) {
    for (const [c, r] of BALLISTAS) {
      if (S.grid[r][c] !== BALLISTA) continue;
      const key = c + ',' + r;
      const left = (fireCd.get(key) || 0) - dt;
      if (left > 0) { fireCd.set(key, left); continue; }
      let tgt = null, bd = 1e9;
      for (const e of S.enemies) {
        const d = dist2(e.x, e.y, c, r);
        if (d <= CFG.ballistaRange && d < bd) { bd = d; tgt = e; }
      }
      if (!tgt) continue;
      S.bolts.push({ x: c, y: r, tx: tgt.x, ty: tgt.y, target: tgt.id, t: 0, life: 1, dmg: S.dmgLv });
      S.lastBoltDmg = S.dmgLv;
      fireCd.set(key, CFG.ballistaEvery);
    }
  }
  function moveBolts(dt) {
    for (const b of S.bolts) {
      const tgt = S.enemies.find(e => e.id === b.target);
      if (tgt) { b.tx = tgt.x; b.ty = tgt.y; }
      const dx = b.tx - b.x, dy = b.ty - b.y, len = Math.hypot(dx, dy) || 1;
      b.x += dx / len * CFG.boltSpeed * dt; b.y += dy / len * CFG.boltSpeed * dt;
      b.t += dt;
      if (len < .28 || b.t > 1.2) {
        b.dead = true;
        if (tgt) {
          tgt.hp -= (b.dmg || 1);      // v0.5: 석궁 공격력 업그레이드 반영
          addFx('hit', tgt.x, tgt.y);
          if (tgt.hp <= 0) {
            tgt.dead = true; S.kills++; S.score += CFG.scoreKill; S.gold += CFG.goldKill;
            addFx('kill', tgt.x, tgt.y); S.shake = Math.max(S.shake, 3);
          }
        }
      }
    }
    S.bolts = S.bolts.filter(b => !b.dead);
    S.enemies = S.enemies.filter(e => !e.dead);
  }

  function addFx(kind, x, y, extra) {
    S.fx.push({ kind, x, y, t: 0, dur: kind === 'burst' ? .42 : kind === 'deny' ? .3 : .34, extra });
    if (S.fx.length > 220) S.fx.splice(0, 40);
  }

  // ---------------------------------------------------------
  // 10. 웨이브 · 시간
  // ---------------------------------------------------------
  function update(dt) {
    if (S.phase !== 'playing') return;
    S.stepCount++;
    if (S.traceOn && (S.stepCount % (S.traceEvery || 1)) === 0) S.trace.push(S.stepCount + '|' + stateHash());
    S.runTime += dt; S.time += dt; S.waveTime += dt;
    S.redraw = Math.max(0, S.redraw - dt);
    S.flash = Math.max(0, S.flash - dt * 1.6);
    S.shake = Math.max(0, S.shake - dt * 22);
    S.banner = Math.max(0, S.banner - dt);

    // 스폰
    S.spawnT -= dt;
    if (S.spawnT <= 0 && S.wave <= CFG.waves) {
      spawn();
      const stageMul = Math.max(0.45, 1 - (S.stage - 1) * CFG.stageSpawnStep);
      S.spawnT = lerp(CFG.spawnStart, CFG.spawnEnd, (S.wave - 1) / (CFG.wavesPerStage - 1))
        * (0.85 + S.rnd() * .3) * stageMul;
    }
    if (S.autoplay) autoplayTick(dt);
    jamRelief(dt);
    moveEnemies(dt); fireBallistae(dt); moveBolts(dt);
    for (const f of S.fx) f.t += dt;
    S.fx = S.fx.filter(f => f.t < f.dur);

    // 웨이브 진행
    if (S.waveTime >= CFG.waveSeconds && S.wave <= CFG.wavesPerStage) {
      S.waveTime = 0; S.wave++;
      S.gold += CFG.goldWave; S.goldPulse = 1;   // 웨이브 클리어 보너스
      if (!S.waveDmg) { S.noDmgStreak++; S.bestStreak = Math.max(S.bestStreak, S.noDmgStreak); }
      S.waveDmg = false;
      if (S.wave > CFG.wavesPerStage) { stageClear(); return; }   // 10웨이브 = 1스테이지 클리어
      S.banner = 1.1; S.bannerSub = `WAVE ${S.wave}/${CFG.wavesPerStage}`;
    }
    // 보급 — 살 수 있는 조각도, 소유한 조각도 없으면 주기적으로 무료 dot 1개
    const anyOwned = S.pieces.some((_, i) => !S.shop[i]);
    const cheapest = Math.min.apply(null, S.pieces.map((_, i) => S.shop[i] ? priceOf(S.pieces[i]) : 999));
    if (!anyOwned && S.gold < cheapest) {
      S.grantT -= dt;
      if (S.grantT <= 0) {
        S.grantT = CFG.goldGrantSec;
        let idx = S.shop.indexOf(true); if (idx < 0) idx = 0;
        offerSlot(idx, PIECES[0]); S.shop[idx] = false;
        S.sel = idx; S.rot = 0;
        S.banner = .9; S.bannerSub = '보급 +1';
      }
    } else S.grantT = CFG.goldGrantSec;

    // 종료 조건 — 성이 함락되면 런 종료(스테이지는 계속 이어진다)
    if (S.hp <= 0) { endRun('hp'); return; }
  }

  // ---------------------------------------------------------
  // 11. 그리기 — HD(32비트) 렌더 레이어
  //   · 논리 좌표는 그대로 두고 버퍼 해상도만 RS배(기본 6배 = 1080×1920)로 올린다
  //   · 게임 로직/결정론은 손대지 않는다(렌더 전용 교체)
  // ---------------------------------------------------------
  function cellRect(c, r) { return [CFG.GX + c * CFG.CELL, CFG.GY + r * CFG.CELL]; }

  const HAIR = 0.5;                                   // 실루엣 보정 두께
  const round1 = (v) => Math.round(v * 1000) / 1000;

  function drawSprite(spr, x, y) {                    // 논리 크기로 확대 없이 배치
    ctx.drawImage(spr, x, y, spr.logicalW, spr.logicalH);
  }

  function shadowOn(blur, col, ox = 0, oy = 0) {
    ctx.shadowBlur = blur; ctx.shadowColor = col; ctx.shadowOffsetX = ox; ctx.shadowOffsetY = oy;
  }
  function shadowOff() { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }

  // ------------------------------------------------------------------
  // 배경: 하늘 그라디언트 · 태양 글로우 · 원경 언덕 · 잔디밭
  // ------------------------------------------------------------------
  function drawBackdrop(t) {
    const W = CFG.LW, H = CFG.LH;

    // 하늘
    let g = ctx.createLinearGradient(0, 0, 0, CFG.GY + 8);
    g.addColorStop(0, '#4aa7ef'); g.addColorStop(.55, '#7ec6f6'); g.addColorStop(1, '#bfe6ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, CFG.GY + 8);

    // 태양 + 후광
    const sx = 146, sy = 14;
    g = ctx.createRadialGradient(sx, sy, 1.5, sx, sy, 34);
    g.addColorStop(0, 'rgba(255,250,214,.95)');
    g.addColorStop(.28, 'rgba(255,238,160,.42)');
    g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fffbe2'; ctx.beginPath(); ctx.arc(sx, sy, 6.4, 0, Math.PI * 2); ctx.fill();

    // 구름 (부드러운 원형 조합)
    const cloud = (cx, cy, s, a) => {
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#ffffff';
      for (const [dx, dy, r] of [[-8, 0, 5], [0, -2.4, 6.6], [8, 0, 4.6], [0, 2.4, 5.4]]) {
        ctx.beginPath(); ctx.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    };
    cloud(34 - (t * 0.6) % (CFG.LW + 60), 16, 1.0, .85);
    cloud(118 - (t * 0.42) % (CFG.LW + 80), 27, .78, .7);

    // 원경 언덕 2겹
    const hill = (baseY, amp, colTop, colBot, phase) => {
      const gg = ctx.createLinearGradient(0, baseY - amp, 0, baseY + 8);
      gg.addColorStop(0, colTop); gg.addColorStop(1, colBot);
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.moveTo(0, baseY + 10);
      for (let x = 0; x <= CFG.LW; x += 4) {
        const y = baseY - Math.sin((x + phase) / 26) * amp - Math.sin((x + phase) / 9) * (amp * .28);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(CFG.LW, baseY + 10); ctx.closePath(); ctx.fill();
    };
    hill(CFG.GY - 7, 4.2, '#7fc4a8', '#5fa98d', 0);
    hill(CFG.GY - 2.5, 2.6, '#8ed86f', '#66bb50', 40);

    // 잔디밭(격자 뒤 배경)
    g = ctx.createLinearGradient(0, CFG.GY - 2, 0, CFG.GY + CFG.ROWS * CFG.CELL + 6);
    g.addColorStop(0, '#9ddc6b'); g.addColorStop(.5, '#8ccf5d'); g.addColorStop(1, '#79bb4c');
    ctx.fillStyle = g; ctx.fillRect(0, CFG.GY - 2, W, CFG.ROWS * CFG.CELL + 8);

    // 아래 영역(흙) — 부드러운 경계 + 결
    g = ctx.createLinearGradient(0, CFG.GY + CFG.ROWS * CFG.CELL, 0, H);
    g.addColorStop(0, '#e0cb9a'); g.addColorStop(1, '#c8ac76');
    ctx.fillStyle = g; ctx.fillRect(0, CFG.GY + CFG.ROWS * CFG.CELL, W, H - (CFG.GY + CFG.ROWS * CFG.CELL));
    ctx.save(); ctx.globalAlpha = .18; ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = .8;
    for (let i = 0; i < 22; i++) {
      const yy = CFG.GY + CFG.ROWS * CFG.CELL + 3 + (i * 5) % (H - CFG.GY - CFG.ROWS * CFG.CELL);
      const xx = (i * 37) % W;
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 9 + (i % 3) * 3, yy + 1.2); ctx.stroke();
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------
  // 벡터 캐릭터 — 도트 아트 대신 패스로 그린 32비트 캐릭터(2차 시안)
  //   적 · 석궁 · 성 상단을 벡터 패스 + 그라디언트 + 림라이트로 재작성
  // ------------------------------------------------------------------
  function drawEnemyVector(x, y, tintIdx, t, tOff, atk) {
    const base = ENEMY_TINT[tintIdx] || C.red;
    const dark = ENEMY_DARK[tintIdx] || C.redDk;
    const cx = x + 10;
    const bob = Math.sin((t + tOff) * 7) * 1.0;
    const sq = Math.sin((t + tOff) * 7) * .22;              // 숨쉬기
    const footY = y + 17.3;
    const w = 6.5 * (1 + sq * .12);
    const h = 9.0 * (1 - sq * .10);
    const topY = footY - h;

    ctx.save();
    // 바닥 그림자
    ctx.globalAlpha = .32; ctx.fillStyle = '#12351c';
    ctx.beginPath(); ctx.ellipse(cx, footY + .7, w * .95, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    const lunge = atk ? (atk / .28) * 1.9 : 0;      // 벽을 때릴 때 앞으로 찌르는 모션
    ctx.save();
    ctx.translate(0, bob + lunge);
    // 몸통 — 젤리 실루엣
    ctx.beginPath();
    ctx.moveTo(cx - w, footY);
    ctx.bezierCurveTo(cx - w * 1.08, footY - h * .62, cx - w * .78, topY, cx, topY);
    ctx.bezierCurveTo(cx + w * .78, topY, cx + w * 1.08, footY - h * .62, cx + w, footY);
    ctx.quadraticCurveTo(cx, footY + 2.0, cx - w, footY);
    ctx.closePath();
    const bg = ctx.createLinearGradient(0, topY, 0, footY + 2);
    bg.addColorStop(0, shade(base, .40));
    bg.addColorStop(.42, base);
    bg.addColorStop(1, dark);
    ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = 'rgba(18,22,42,.85)'; ctx.lineWidth = .9; ctx.stroke();

    // 내부 광(림라이트 + 하단 반사)
    ctx.save(); ctx.clip();
    const rim = ctx.createLinearGradient(cx - w, topY, cx + w * .3, footY);
    rim.addColorStop(0, 'rgba(255,255,255,.55)');
    rim.addColorStop(.5, 'rgba(255,255,255,.04)');
    rim.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rim; ctx.fillRect(cx - w * 1.3, topY - 2, w * 2.6, h + 6);
    const refl = ctx.createRadialGradient(cx, footY - h * .1, 0, cx, footY - h * .1, w * 1.15);
    refl.addColorStop(0, 'rgba(255,255,255,.20)');
    refl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = refl; ctx.fillRect(cx - w * 1.3, footY - h * .8, w * 2.6, h + 4);
    // 표면 점(결정론)
    ctx.globalAlpha = .20; ctx.fillStyle = dark;
    for (let i = 0; i < 3; i++) {
      const dx0 = cx - w * .55 + hash01(tintIdx, i, 7) * w * 1.1;
      const dy0 = topY + h * (.3 + hash01(tintIdx, i, 13) * .45);
      ctx.beginPath(); ctx.ellipse(dx0, dy0, w * .17, w * .11, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.restore();

    // 눈 — 아래(성 쪽)를 응시
    const eyeY = topY + h * .43, eyeDX = w * .42, eyeR = w * .27;
    for (const sgn of [-1, 1]) {
      const ex = cx + sgn * eyeDX;
      ctx.beginPath(); ctx.ellipse(ex, eyeY, eyeR, eyeR * 1.14, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#fffdf4'; ctx.fill();
      ctx.strokeStyle = 'rgba(18,22,42,.8)'; ctx.lineWidth = .7; ctx.stroke();
      const pg = ctx.createRadialGradient(ex, eyeY + eyeR * .2, 0, ex, eyeY + eyeR * .2, eyeR * .62);
      pg.addColorStop(0, '#3a2f52'); pg.addColorStop(1, '#1d1830');
      ctx.beginPath(); ctx.arc(ex, eyeY + eyeR * .22, eyeR * .52, 0, Math.PI * 2);
      ctx.fillStyle = pg; ctx.fill();
      ctx.beginPath(); ctx.arc(ex - eyeR * .2, eyeY - eyeR * .12, eyeR * .19, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
    }
    // 입 + 이빨
    const my = topY + h * .76;
    ctx.beginPath();
    ctx.moveTo(cx - w * .5, my);
    ctx.quadraticCurveTo(cx, my + h * .2, cx + w * .5, my);
    ctx.strokeStyle = 'rgba(24,18,40,.8)'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.fillStyle = '#fffdf4';
    for (let i = -1; i <= 1; i++) {
      const tx = cx + i * w * .27;
      ctx.beginPath();
      ctx.moveTo(tx - w * .1, my + .3); ctx.lineTo(tx + w * .1, my + .3); ctx.lineTo(tx, my + h * .15);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  }

  function drawBallistaVector(x, y, t, tOff) {
    const cx = x + 10, base = y + 16.6;
    const rec = Math.sin(t * 2.2 + tOff) * .35;             // 미세 반동
    ctx.save();
    ctx.globalAlpha = .3; ctx.fillStyle = '#12351c';
    ctx.beginPath(); ctx.ellipse(cx, base + .6, 7.2, 2.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // 목재 받침대(사다리꼴 + 나뭇결)
    ctx.beginPath();
    ctx.moveTo(cx - 6.4, base); ctx.lineTo(cx - 5.2, base - 6.2);
    ctx.lineTo(cx + 5.2, base - 6.2); ctx.lineTo(cx + 6.4, base);
    ctx.closePath();
    const wg = ctx.createLinearGradient(0, base - 6.2, 0, base);
    wg.addColorStop(0, '#e6bd7e'); wg.addColorStop(.5, '#b8813c'); wg.addColorStop(1, '#7d5222');
    ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = 'rgba(60,38,12,.75)'; ctx.lineWidth = .8; ctx.stroke();
    ctx.save(); ctx.clip();
    ctx.globalAlpha = .22; ctx.strokeStyle = '#6a4418'; ctx.lineWidth = .5;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(cx + i * 2.2, base - 6.6); ctx.lineTo(cx + i * 2.2, base + .4); ctx.stroke();
    }
    ctx.restore();

    // 금속 활 + 시위
    const topY = base - 12.6 - rec;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx, topY + 3.8);
      ctx.quadraticCurveTo(cx + sgn * 7.4, topY + 1.2, cx + sgn * 6.2, topY + 6.8 + rec * .2);
      ctx.strokeStyle = 'rgba(38,48,72,.92)'; ctx.lineWidth = 2.6; ctx.stroke();
      ctx.strokeStyle = '#d7e0f2'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - 6.2, topY + 6.8 + rec);
    ctx.lineTo(cx, topY + 3.9);
    ctx.lineTo(cx + 6.2, topY + 6.8 + rec);
    ctx.strokeStyle = 'rgba(240,246,255,.9)'; ctx.lineWidth = .8; ctx.stroke();

    // 장전된 화살 — 시위가 걸린 상태
    ctx.beginPath(); ctx.moveTo(cx, topY + 4.0); ctx.lineTo(cx, topY - 2.2);
    ctx.strokeStyle = '#e8d6ae'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(150,120,70,.55)'; ctx.lineWidth = .5;
    ctx.beginPath(); ctx.moveTo(cx - .45, topY + 3.6); ctx.lineTo(cx - .45, topY - 1.6); ctx.stroke();
    const hg = ctx.createLinearGradient(0, topY - 5, 0, topY - 1.1);
    hg.addColorStop(0, '#ffffff'); hg.addColorStop(1, '#8fa0bd');
    ctx.beginPath();
    ctx.moveTo(cx, topY - 5.4); ctx.lineTo(cx + 2.4, topY - 1.1); ctx.lineTo(cx - 2.4, topY - 1.1);
    ctx.closePath(); ctx.fillStyle = hg; ctx.fill();
    ctx.strokeStyle = 'rgba(40,52,76,.7)'; ctx.lineWidth = .45; ctx.stroke();
    // 깃(3분할)
    const fletch = (sgn) => {
      ctx.beginPath();
      ctx.moveTo(cx, topY + 3.6); ctx.lineTo(cx + sgn * 2.2, topY + 2.0);
      ctx.lineTo(cx + sgn * 1.9, topY + .5); ctx.lineTo(cx, topY + 1.5);
      ctx.closePath();
      const fg = ctx.createLinearGradient(cx, topY, cx + sgn * 2.4, topY + 3.8);
      fg.addColorStop(0, '#e8605f'); fg.addColorStop(1, '#a92e33');
      ctx.fillStyle = fg; ctx.fill();
      ctx.strokeStyle = 'rgba(120,30,34,.6)'; ctx.lineWidth = .4; ctx.stroke();
    };
    fletch(1); fletch(-1);
    ctx.restore();
  }

  function drawCastleTopVector(x, y, t) {
    const left = x - 4, w = 30, h = 20, bottom = y - 8 + h;
    const cx = left + w / 2;
    ctx.save();
    ctx.globalAlpha = .28; ctx.fillStyle = '#12351c';
    ctx.beginPath(); ctx.ellipse(cx, bottom + .9, w * .34, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // 탑 본체
    const tw = 13.4, th = 12.6, towerTop = bottom - th - 3.2;
    ctx.beginPath();
    ctx.moveTo(cx - tw / 2, bottom - 3.2); ctx.lineTo(cx - tw / 2, towerTop);
    ctx.lineTo(cx + tw / 2, towerTop); ctx.lineTo(cx + tw / 2, bottom - 3.2);
    ctx.closePath();
    const stone = ctx.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0);
    stone.addColorStop(0, '#fff6da'); stone.addColorStop(.32, '#f4cf78');
    stone.addColorStop(.74, '#dda142'); stone.addColorStop(1, '#a9722a');
    ctx.fillStyle = stone; ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,24,.7)'; ctx.lineWidth = .9; ctx.stroke();
    // 벽돌 줄눈
    ctx.save(); ctx.clip();
    ctx.globalAlpha = .32; ctx.strokeStyle = '#a9722a'; ctx.lineWidth = .55;
    for (let yy = towerTop + 2.6; yy < bottom - 3.2; yy += 2.8) {
      ctx.beginPath(); ctx.moveTo(cx - tw / 2, yy); ctx.lineTo(cx + tw / 2, yy); ctx.stroke();
    }
    ctx.globalAlpha = .5; ctx.fillStyle = '#fffdf2';
    ctx.fillRect(cx - tw / 2, towerTop, tw * .22, th);              // 좌측 하이라이트
    ctx.restore();

    // 발광 총안창
    for (const sx of [-tw * .26, tw * .26]) {
      const gx = cx + sx, gy = towerTop + 4.2;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(gx, gy + 1.9, 0, gx, gy + 1.9, 5.4);
      halo.addColorStop(0, 'rgba(255,222,140,.85)');
      halo.addColorStop(.45, 'rgba(255,196,90,.35)');
      halo.addColorStop(1, 'rgba(255,190,80,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(gx, gy + 1.9, 5.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      const gg = ctx.createLinearGradient(0, gy, 0, gy + 3.8);
      gg.addColorStop(0, '#fff2c4'); gg.addColorStop(.55, '#ffc65c'); gg.addColorStop(1, '#e08a20');
      fillRR(gx - 1.05, gy, 2.1, 3.8, 1.05, gg);
      ctx.strokeStyle = 'rgba(120,80,24,.65)'; ctx.lineWidth = .5;
      strokeRR(gx - 1.05, gy, 2.1, 3.8, 1.05, 'rgba(120,80,24,.65)', .5);
    }
    // 성가퀴 5개
    const merlW = 2.6, merlH = 2.4, span = tw + 2.4;
    for (let i = 0; i < 5; i++) {
      const mx = cx - span / 2 + i * (span - merlW) / 4;
      fillRR(mx, towerTop - merlH, merlW, merlH + .7, .9,
        linGrad(0, towerTop - merlH, 0, merlH, [[0, '#fff6da'], [1, '#dda142']]));
      strokeRR(mx, towerTop - merlH, merlW, merlH + .7, .9, 'rgba(120,80,24,.6)', .6);
    }
    // 깃발(긴 깃대 + 물결 천)
    const fx = cx + 5.4, fy = towerTop - 2.6;
    const poleTop = fy - 6.4;
    ctx.beginPath(); ctx.moveTo(fx, fy + 8.4); ctx.lineTo(fx, poleTop);
    ctx.strokeStyle = '#8a6338'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.beginPath(); ctx.arc(fx, poleTop - .9, 1.05, 0, Math.PI * 2);
    ctx.fillStyle = '#f7c64a'; ctx.fill();
    const amp = Math.sin(t * 3.2) * 1.15;
    ctx.beginPath();
    ctx.moveTo(fx, poleTop);
    ctx.quadraticCurveTo(fx + 5.4, poleTop + amp, fx + 10.4, poleTop + 1.4 + amp * .55);
    ctx.quadraticCurveTo(fx + 6.2, poleTop + 4.6 - amp * .5, fx, poleTop + 6.2);
    ctx.closePath();
    const fg = ctx.createLinearGradient(fx, poleTop, fx + 10.4, poleTop + 6);
    fg.addColorStop(0, '#f7746f'); fg.addColorStop(.55, '#e0504f'); fg.addColorStop(1, '#b5323a');
    ctx.fillStyle = fg; ctx.fill();
    ctx.strokeStyle = 'rgba(120,30,34,.6)'; ctx.lineWidth = .55; ctx.stroke();
    // 천의 물결 주름
    ctx.globalAlpha = .35; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = .5;
    ctx.beginPath();
    ctx.moveTo(fx + 1.2, poleTop + 1.2);
    ctx.quadraticCurveTo(fx + 5.4, poleTop + 2.2 + amp * .6, fx + 8.6, poleTop + 2.4 + amp * .5);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawBoard(t) {
    const [gx, gy] = [CFG.GX, CFG.GY];
    const w = CFG.COLS * CFG.CELL, h = CFG.ROWS * CFG.CELL;

    drawBackdrop(t);

    // 경로 트레일 — 흐르는 빛 점(성 쪽으로)
    const phase = Math.floor(t * 18) % 8;
    const bright = S.redraw > 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let r = 0; r < CFG.ROWS; r++) {
      for (let c = 0; c < CFG.COLS; c++) {
        const d = S.dist[r][c];
        if (d <= 0) continue;
        let tc = -1, tr = -1;
        for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
          if (nc < 0 || nc >= CFG.COLS || nr < 0 || nr >= CFG.ROWS) continue;
          if (S.dist[nr][nc] === d - 1) { tc = nc; tr = nr; break; }
        }
        if (tc < 0) continue;
        const [x1, y1] = cellRect(c, r), [x2, y2] = cellRect(tc, tr);
        const ax = x1 + 10, ay = y1 + 10, bx = x2 + 10, by = y2 + 10;
        // 연결 선(은은한 빛)
        ctx.save();
        ctx.globalAlpha = bright ? .5 : .28;
        ctx.strokeStyle = bright ? '#fff3c4' : '#fffdf0';
        ctx.lineWidth = bright ? 2.6 : 1.8;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        ctx.restore();
        for (let i = 0; i < 5; i++) {
          const f = (i * 4 + phase) / CFG.CELL;
          if (f >= 1) break;
          const dx = ax + (bx - ax) * f, dy = ay + (by - ay) * f;
          const on = (i % 2) === 0;
          const rad = bright ? 4.6 : 3.4;
          const col = bright ? 'rgba(255,246,214,1)' : (on ? 'rgba(255,253,240,.95)' : 'rgba(255,233,168,.9)');
          const gg = ctx.createRadialGradient(dx, dy, 0, dx, dy, rad);
          gg.addColorStop(0, col); gg.addColorStop(.45, col.replace(/[\d.]+\)$/, '.42)')); gg.addColorStop(1, 'rgba(255,240,200,0)');
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(dx, dy, rad, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    ctx.restore();

    // 셀 내용
    for (let r = 0; r < CFG.ROWS; r++) {
      for (let c = 0; c < CFG.COLS; c++) {
        const [x, y] = cellRect(c, r);
        const v = S.grid[r][c];
        drawTile(x, y, c, r, v);
        if (v === BLOCK) drawBlock(x, y, c, r);
        else if (v === HOLE_C) drawHole(x, y, c, r, t);
        else if (v === BALLISTA) drawBallista(x, y, c, r, t);
        else if (v === CASTLE) drawCastlePart(x, y, c, r, t);
      }
    }

    if (S.phase === 'playing') drawGhost(t);

    // 적 — 벡터 캐릭터
    for (const e of S.enemies) {
      const [x, y] = cellRect(e.x, e.y);
      drawEnemyVector(x, y, e.tint, t, e.t, e.atkAnim);
      if (e.hp > 1) {
        const pillW = 8, pillX = x + 6, pillY = y + 1.2;
        ctx.save(); shadowOn(1.6, 'rgba(10,14,26,.5)', 0, .6);
        fillRR(pillX, pillY, pillW, 2.1, 1.05, 'rgba(20,16,32,.85)'); shadowOff();
        fillRR(pillX + .35, pillY + .35, Math.max(1.2, (pillW - .7) * clamp(e.hpMax ? e.hp / e.hpMax : .6, 0, 1)), 1.4, .7, '#7bf06a');
        ctx.restore();
      }
    }
    // 석궁 화살
    for (const b of S.bolts) {
      const [x, y] = cellRect(b.x, b.y);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(x + 10, y + 10, 0, x + 10, y + 10, 7);
      gg.addColorStop(0, 'rgba(226,240,255,.95)'); gg.addColorStop(1, 'rgba(150,190,255,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x + 10, y + 10, 7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      fillRR(x + 7.4, y + 7.4, 5.2, 5.2, 2.2, linGrad(x, y + 7, 0, 5.2, [[0, '#ffffff'], [1, '#a8b5cd']]));
    }
    // 이펙트
    for (const f of S.fx) {
      const [x, y] = cellRect(f.x, f.y);
      const p = f.t / f.dur;
      ctx.save();
      if (f.kind === 'burst') {
        ctx.globalCompositeOperation = 'lighter';
        const r0 = 4 + p * 17;
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * Math.PI * 2 + p * 1.4;
          const px0 = x + 10 + Math.cos(a) * r0, py0 = y + 10 + Math.sin(a) * r0;
          const col = i % 2 ? 'rgba(247,198,74,' : 'rgba(244,89,90,';
          const gg = ctx.createRadialGradient(px0, py0, 0, px0, py0, 5.2 * (1 - p * .45));
          gg.addColorStop(0, col + (0.95 * (1 - p)) + ')'); gg.addColorStop(1, col + '0)');
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(px0, py0, 5.2 * (1 - p * .45), 0, Math.PI * 2); ctx.fill();
        }
      } else if (f.kind === 'kill') {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * Math.PI * 2;
          const rr0 = 3 + p * 10;
          const px0 = x + 10 + Math.cos(a) * rr0, py0 = y + 10 + Math.sin(a) * rr0;
          const gg = ctx.createRadialGradient(px0, py0, 0, px0, py0, 4.4);
          gg.addColorStop(0, 'rgba(255,250,224,' + (0.9 * (1 - p)) + ')'); gg.addColorStop(1, 'rgba(255,245,210,0)');
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(px0, py0, 4.4, 0, Math.PI * 2); ctx.fill();
        }
      } else if (f.kind === 'hit') {
        ctx.globalAlpha = .8 * (1 - p);
        fillRR(x + 5, y + 5, 10 - p * 4, 10 - p * 4, 4, 'rgba(244,89,90,.9)');
      } else if (f.kind === 'place') {
        ctx.globalAlpha = .55 * (1 - p);
        strokeRR(x + 1.2, y + 1.2, CFG.CELL - 2.4, CFG.CELL - 2.4, 5, p < .5 ? '#f7c64a' : '#fff8e0', 2.2);
      } else if (f.kind === 'chip') {                 // 벽 타격 — 부스러기
        ctx.globalAlpha = .9 * (1 - p);
        ctx.fillStyle = '#c39a67';
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * Math.PI * 2 + p * 2.2;
          const rr0 = 2 + p * 7;
          ctx.fillRect(x + 10 + Math.cos(a) * rr0 - 1, y + 10 + Math.sin(a) * rr0 - 1, 2.3, 2.3);
        }
      } else if (f.kind === 'deny') {
        ctx.globalAlpha = .85 * (1 - p);
        ctx.strokeStyle = '#f4595a'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + CFG.CELL - 2, y + CFG.CELL - 2);
        ctx.moveTo(x + CFG.CELL - 2, y + 2); ctx.lineTo(x + 2, y + CFG.CELL - 2); ctx.stroke();
      }
      ctx.restore();
    }

    // 격자 프레임 — 유리 패널 느낌
    ctx.save();
    shadowOn(4, 'rgba(20,30,50,.35)', 0, 1.2);
    strokeRR(gx - 2.2, gy - 2.2, w + 4.4, h + 4.4, 4.5, 'rgba(28,47,92,.85)', 2.2);
    shadowOff();
    ctx.restore();
  }

  // 타일 — 유리·잔디 질감
  function drawTile(x, y, c, r, v) {
    const alt = (c + r) % 2 === 0;
    const top = alt ? '#a9e578' : '#96d967';
    const bot = alt ? '#8ccf5d' : '#7ec455';
    fillRR(x + .35, y + .35, CFG.CELL - .7, CFG.CELL - .7, 3.2, linGrad(x, y, 0, CFG.CELL, [[0, top], [1, bot]]));
    // 상단 하이라이트
    ctx.save(); ctx.globalAlpha = .35; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 1.6, y + 1.2, CFG.CELL - 3.2, 3.4, 1.7) : ctx.rect(x + 1.6, y + 1.2, CFG.CELL - 3.2, 3.4);
    ctx.fill(); ctx.restore();
    // 잔디 결(결정론 노이즈)
    const n = hash01(c, r);
    ctx.save(); ctx.globalAlpha = .3; ctx.strokeStyle = '#5da83c'; ctx.lineWidth = .7;
    for (let i = 0; i < 3; i++) {
      const nx = x + 3 + hash01(c, r, i) * (CFG.CELL - 6);
      const ny = y + 4 + hash01(c, r, i + 9) * (CFG.CELL - 8);
      ctx.beginPath(); ctx.moveTo(nx, ny + 2.4); ctx.quadraticCurveTo(nx + (n > .5 ? .9 : -.9), ny + 1, nx + (n > .5 ? 1.8 : -1.8), ny); ctx.stroke();
    }
    ctx.restore();
    // 안쪽 아래 음영(살짝 파인 타일) + 바닥 광택
    ctx.save();
    ctx.globalAlpha = .18; ctx.fillStyle = '#3f6d24';
    rrect(x + 1.1, y + CFG.CELL - 4.6, CFG.CELL - 2.2, 3.4, 1.8); ctx.fill();
    ctx.globalAlpha = .10; ctx.fillStyle = '#ffffff';
    rrect(x + 1.4, y + 1.1, CFG.CELL - 2.8, 1.4, .7); ctx.fill();
    ctx.restore();
    // 소품 — 자잘한 돌/꽃(결정론 배치)
    const n2 = hash01(c, r, 21), n3 = hash01(c, r, 33);
    if (n2 > .74) {                              // 조약돌
      ctx.save(); ctx.globalAlpha = .55;
      ctx.fillStyle = '#b9ae8f';
      ctx.beginPath(); ctx.ellipse(x + 5 + n3 * 8, y + 7 + n2 * 6, 2.1, 1.4, n3 * 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .35; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(x + 4.6 + n3 * 8, y + 6.6 + n2 * 6, .9, .6, n3 * 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (n3 > .84) {                       // 들꽃
      const fx = x + 6 + n2 * 7, fy = y + 8 + n3 * 5;
      ctx.save();
      ctx.strokeStyle = 'rgba(76,132,48,.7)'; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.moveTo(fx, fy + 3); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.globalAlpha = .9; ctx.fillStyle = n2 > .5 ? '#fff0a8' : '#ffd0e4';
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + .4;
        ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 1.5, fy + Math.sin(a) * 1.5, 1.05, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ffb43c'; ctx.beginPath(); ctx.arc(fx, fy, .8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function drawBlock(x, y, c, r) {
    const warm = (c + r) % 2 === 0;
    const top = warm ? '#e7cfa6' : '#d8bd93';
    const mid = warm ? '#c39a67' : '#b98f5e';
    const bot = warm ? '#8f6a40' : '#84603a';
    ctx.save();
    // 바닥 그림자
    shadowOn(2.4, 'rgba(24,32,20,.42)', 0, 1.6);
    fillRR(x + 1, y + 1, 18, 18, 4.2, linGrad(x, y, 0, 18, [[0, top], [.45, mid], [1, bot]]));
    shadowOff();
    // 상단 하이라이트 / 하단 음영
    ctx.globalAlpha = .5; ctx.fillStyle = '#fff2d6';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 2.6, y + 2, 14.8, 3.6, 1.8) : ctx.rect(x + 2.6, y + 2, 14.8, 3.6); ctx.fill();
    ctx.globalAlpha = .38; ctx.fillStyle = '#5c3f22';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 3, y + 14.6, 14, 3, 1.5) : ctx.rect(x + 3, y + 14.6, 14, 3); ctx.fill();
    // 좌우 베벨
    ctx.globalAlpha = .28; ctx.fillStyle = '#fff0d0';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 2, y + 4.5, 2.6, 11, 1.3) : ctx.rect(x + 2, y + 4.5, 2.6, 11); ctx.fill();
    ctx.globalAlpha = .3; ctx.fillStyle = '#6b4a28';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 15.4, y + 4.5, 2.6, 11, 1.3) : ctx.rect(x + 15.4, y + 4.5, 2.6, 11); ctx.fill();
    // 암석 무늬(결정론)
    ctx.globalAlpha = .22; ctx.fillStyle = '#7a5a36';
    for (let i = 0; i < 4; i++) {
      const bx0 = x + 3.4 + hash01(c, r, i) * 11;
      const by0 = y + 4.5 + hash01(c, r, i + 5) * 10;
      ctx.beginPath(); ctx.ellipse(bx0, by0, 1.5 + hash01(c, r, i + 3) * 1.5, .9 + hash01(c, r, i + 7), hash01(c, r, i + 11) * 1.2, 0, Math.PI * 2); ctx.fill();
    }
    // 이끼(부드러운 블롭)
    ctx.globalAlpha = .55;
    const moss = (mx, my, mr) => {
      const gg = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
      gg.addColorStop(0, 'rgba(163,224,112,.95)'); gg.addColorStop(1, 'rgba(121,187,76,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    };
    moss(x + 6, y + 14.5, 2.6); moss(x + 13.6, y + 6.4, 2.1); moss(x + 4.4, y + 6.6, 1.6);
    // 내구도 균열 — 손상 단계(현재 Lv - 남은 HP)만큼 갈라진다
    const bip = S.bhp[r][c] || 1;
    const hurt = Math.max(0, Math.min(4, S.durLv - bip));
    if (hurt > 0) {
      ctx.globalAlpha = .5; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = .8;
      for (let i = 0; i < hurt; i++) {
        const sx0 = x + 4 + hash01(c, r, i + 41) * 10;
        const sy0 = y + 4 + hash01(c, r, i + 51) * 9;
        ctx.beginPath();
        ctx.moveTo(sx0, sy0);
        ctx.lineTo(sx0 + (hash01(c, r, i + 61) - .5) * 6, sy0 + 3.2);
        ctx.lineTo(sx0 + (hash01(c, r, i + 71) - .5) * 8, sy0 + 6.4);
        ctx.stroke();
      }
      ctx.globalAlpha = .85;
      for (let i = 0; i < Math.min(4, bip); i++) {      // 남은 내구도 핍
        ctx.fillStyle = '#ffe08a';
        ctx.beginPath(); ctx.arc(x + 6 + i * 3.4, y + 17.6, .9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // 외곽선
    strokeRR(x + 1, y + 1, 18, 18, 4.2, 'rgba(70,48,26,.5)', .9);
  }

  function drawHole(x, y, c, r, t) {
    const cx = x + 10, cy = y + 10;
    ctx.save();
    // 구덩이
    fillRR(x + 1, y + 1, 18, 18, 4.6, linGrad(x, y, 0, 18, [[0, '#2b2242'], [1, '#181228']]));
    // 소용돌이
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = t * 1.6 + i * 2.1;
      const rr0 = 5.4 - i * 1.3;
      const gx0 = cx + Math.cos(a) * 1.8, gy0 = cy + Math.sin(a * 1.2) * 1.6;
      const gg = ctx.createRadialGradient(gx0, gy0, 0, gx0, gy0, rr0 + 2.6);
      gg.addColorStop(0, 'rgba(176,107,232,' + (0.5 - i * 0.12) + ')');
      gg.addColorStop(1, 'rgba(120,70,190,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(gx0, gy0, rr0 + 2.6, 0, Math.PI * 2); ctx.fill();
    }
    // 입구 테두리 하이라이트
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = .8; ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(196,150,255,.75)';
    ctx.beginPath(); ctx.arc(cx, cy, 7.6, 0, Math.PI * 2); ctx.stroke();
    // 눈 — 발광
    const blink = ((t * .9 + c) % 3.2) > 3.05 ? 0 : 1;
    ctx.globalAlpha = 1;
    for (const ex of [cx - 2.6, cx + 2.6]) {
      const gg = ctx.createRadialGradient(ex, cy - 1.6, 0, ex, cy - 1.6, 3.2);
      gg.addColorStop(0, 'rgba(255,246,200,.98)'); gg.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(ex, cy - 1.6, 3.2, 0, Math.PI * 2); ctx.fill();
      if (blink) { ctx.fillStyle = '#2a2140'; ctx.beginPath(); ctx.arc(ex, cy - 1.6, 1, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }

  function drawCastlePart(x, y, c, r, t) {
    const top = r === CASTLE_CELL[0][1];
    if (top) { drawCastleTopVector(x, y, t); return; }
    // 성벽 — 석조 블록
    ctx.save();
    shadowOn(2, 'rgba(30,22,10,.35)', 0, 1.2);
    fillRR(x + 1, y + 1, 18, 18, 3.6, linGrad(x, y, 0, 18, [[0, '#fff6da'], [.5, '#f4cf78'], [1, '#dda142']]));
    shadowOff();
    ctx.globalAlpha = .45; ctx.fillStyle = '#fffdf2';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 2.4, y + 1.8, 15.2, 2.8, 1.4) : ctx.rect(x + 2.4, y + 1.8, 15.2, 2.8); ctx.fill();
    // 벽돌 줄눈
    ctx.globalAlpha = .3; ctx.strokeStyle = '#a9722a'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(x + 1.4, y + 7); ctx.lineTo(x + 18.6, y + 7);
    ctx.moveTo(x + 1.4, y + 13); ctx.lineTo(x + 18.6, y + 13);
    ctx.moveTo(x + 10, y + 1.4); ctx.lineTo(x + 10, y + 7);
    ctx.moveTo(x + 6, y + 7); ctx.lineTo(x + 6, y + 13);
    ctx.moveTo(x + 13.5, y + 13); ctx.lineTo(x + 13.5, y + 18.6);
    ctx.stroke();
    // 문
    ctx.globalAlpha = 1;
    fillRR(x + 5.5, y + 6, 9, 13, 3, linGrad(x, y + 6, 0, 13, [[0, '#4a3b22'], [1, '#241c10']]));
    ctx.globalAlpha = .6; ctx.fillStyle = '#f4cf78';
    ctx.beginPath(); ctx.arc(x + 12.6, y + 12.8, .8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    strokeRR(x + 1, y + 1, 18, 18, 3.6, 'rgba(140,96,32,.55)', .9);
  }

  function drawBallista(x, y, c, r, t) { drawBallistaVector(x, y, t, c * 1.7 + r * 0.9); }

  // 드래그 중 — 착지 그림자(스냅 위치) + 손가락 위로 떠 있는 조각
  function drawDragPiece(t) {
    const p = S.pieces[S.sel]; if (!p) return;
    const cells = pieceCells(p, S.rot);
    const okDrop = DRAG.free;
    const warn = okDrop && DRAG.seals;               // 길을 막는 배치 — 경고색
    // 1) 착지 그림자 — 놓일 자리를 미리 보여준다
    for (const [dc, dr] of cells) {
      const [x, y] = cellRect(DRAG.gc + dc, DRAG.gr + dr);
      ctx.save();
      fillRR(x + .9, y + .9, 18.2, 18.2, 4.6,
        !okDrop ? 'rgba(244,89,90,.40)' : (warn ? 'rgba(255,150,60,.42)' : 'rgba(247,198,74,.42)'));
      ctx.setLineDash([3.2, 2.2]);
      strokeRR(x + .9, y + .9, 18.2, 18.2, 4.6,
        !okDrop ? 'rgba(255,150,150,.95)' : (warn ? 'rgba(255,190,110,.95)' : 'rgba(255,232,160,.95)'), 1.8);
      ctx.setLineDash([]);
      if (warn) {                                     // 막는 배치 — ! 경고
        ctx.globalAlpha = .9;
        ctx.fillStyle = '#ffd28a';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x + 8.6, y + 3.4, 2.8, 7.4, 1.4); else ctx.rect(x + 8.6, y + 3.4, 2.8, 7.4);
        ctx.fill();
        ctx.beginPath(); ctx.arc(x + 10, y + 13.4, 1.7, 0, Math.PI * 2); ctx.fill();
      } else if (!okDrop) {                           // 못 놓는 자리 — X
        ctx.globalAlpha = .8;
        ctx.strokeStyle = 'rgba(255,120,120,.95)'; ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x + 5.5, y + 5.5); ctx.lineTo(x + 14.5, y + 14.5);
        ctx.moveTo(x + 14.5, y + 5.5); ctx.lineTo(x + 5.5, y + 14.5);
        ctx.stroke();
      }
      ctx.restore();
    }
    // 2) 떠 있는 조각(손가락 위 lift 만큼)
    ctx.save();
    ctx.translate(0, -DRAG.lift);
    for (const [dc, dr] of cells) {
      const [x, y] = cellRect(DRAG.gc + dc, DRAG.gr + dr);
      shadowOn(3, 'rgba(18,12,4,.5)', 0, 2);
      fillRR(x + 1, y + 1, 18, 18, 4.2, linGrad(x, y, 0, 18, [[0, '#f6e2bd'], [.5, '#c39a67'], [1, '#8a6338']]));
      shadowOff();
      ctx.save();
      ctx.globalAlpha = .5; ctx.fillStyle = '#fff2d6';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x + 2.6, y + 2, 14.8, 3.6, 1.8); else ctx.rect(x + 2.6, y + 2, 14.8, 3.6);
      ctx.fill();
      ctx.globalAlpha = .35; ctx.fillStyle = '#5c3f22';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x + 3, y + 14.6, 14, 3, 1.5); else ctx.rect(x + 3, y + 14.6, 14, 3);
      ctx.fill();
      ctx.restore();
      strokeRR(x + 1, y + 1, 18, 18, 4.2, 'rgba(70,48,26,.5)', .9);
    }
    ctx.restore();
  }

  function drawGhost(t) {
    const p = S.pieces[S.sel]; if (!p) return;
    const cells = pieceCells(p, S.rot);
    drawTray(t);
    if (DRAG.on) { drawDragPiece(t); return; }        // 드래그 중 — 착지 그림자·떠 있는 조각
    const hintC = Math.floor((CFG.COLS - p.w) / 2), hintR = 3;
    if (canPlaceAt(cells, hintC, hintR)) {
      const pv = previewPath(cells, hintC, hintR);
      if (pv.len >= 0 && pv.reach >= 3) {
        const pulse = ((Math.sin(t * 6) + 1) / 2);
        for (const [dc, dr] of cells) {
          const [x, y] = cellRect(hintC + dc, hintR + dr);
          ctx.save();
          ctx.globalAlpha = .55 + pulse * .3;
          fillRR(x + 1, y + 1, 18, 18, 4, linGrad(x, y, 0, 18, [[0, '#fff3d4'], [1, '#e2cb9e']]));
          ctx.globalAlpha = .5 + pulse * .4; ctx.strokeStyle = '#f7c64a'; ctx.lineWidth = 1.6;
          strokeRR(x + 1, y + 1, 18, 18, 4, 'rgba(247,198,74,' + (.5 + pulse * .45) + ')', 1.6);
          ctx.restore();
        }
      }
    }
  }

  function drawTray(t) {
    const totalW = 3 * CFG.TRAY_W + 2 * CFG.TRAY_GAP;
    const x0 = Math.floor((CFG.LW - totalW) / 2);
    for (let i = 0; i < 3; i++) {
      const sel = i === S.sel;
      const x = x0 + i * (CFG.TRAY_W + CFG.TRAY_GAP), y = CFG.TRAY_Y;
      ctx.save();
      // 패널
      shadowOn(sel ? 5 : 3, 'rgba(18,26,44,.45)', 0, 1.6);
      fillRR(x, y, CFG.TRAY_W, CFG.TRAY_H, 6, sel
        ? linGrad(x, y, 0, CFG.TRAY_H, [[0, '#fffdf0'], [1, '#f0ddb0']])
        : linGrad(x, y, 0, CFG.TRAY_H, [[0, '#f7efd8'], [1, '#e5d7b4']]));
      shadowOff();
      // 상단 하이라이트
      ctx.globalAlpha = .65; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 3, y + 2, CFG.TRAY_W - 6, 3.2, 1.6) : ctx.rect(x + 3, y + 2, CFG.TRAY_W - 6, 3.2); ctx.fill();
      ctx.globalAlpha = 1;
      strokeRR(x + .6, y + .6, CFG.TRAY_W - 1.2, CFG.TRAY_H - 1.2, 5.4,
        sel ? 'rgba(247,198,74,.95)' : 'rgba(62,74,104,.55)', sel ? 1.8 : 1.2);

      const p = S.pieces[i];
      if (p && !(DRAG.on && i === S.sel)) {          // 드래그 중인 조각은 트레이에서 숨김
        const cl = i === S.sel ? pieceCells(p, S.rot) : pieceCells(p, 0);
        const bw = 10, gap = 2;
        const w = (Math.max(...cl.map(v => v[0])) + 1) * (bw + gap) - gap;
        const h = (Math.max(...cl.map(v => v[1])) + 1) * (bw + gap) - gap;
        const ox = x + Math.floor((CFG.TRAY_W - w) / 2), oy = y + Math.floor((CFG.TRAY_H - h) / 2);
        for (const [dc, dr] of cl) {
          const bx = ox + dc * (bw + gap), by = oy + dr * (bw + gap);
          shadowOn(1.6, 'rgba(30,24,12,.4)', 0, 1);
          fillRR(bx, by, bw, bw, 3, linGrad(bx, by, 0, bw, [[0, '#e7cfa6'], [.5, '#c39a67'], [1, '#8f6a40']]));
          shadowOff();
          ctx.globalAlpha = .5; ctx.fillStyle = '#fff2d6';
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx + 1.6, by + 1.2, bw - 3.2, 2.4, 1.2) : ctx.rect(bx + 1.6, by + 1.2, bw - 3.2, 2.4); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      if (sel) {
        const pulse = (Math.sin(t * 7) + 1) / 2;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const gg = ctx.createRadialGradient(x + CFG.TRAY_W / 2, y + CFG.TRAY_H / 2, 0, x + CFG.TRAY_W / 2, y + CFG.TRAY_H / 2, CFG.TRAY_W * .85);
        gg.addColorStop(0, 'rgba(255,214,110,' + (.12 + pulse * .14) + ')'); gg.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x + CFG.TRAY_W / 2, y + CFG.TRAY_H / 2, CFG.TRAY_W * .85, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        strokeRR(x - 1.6, y - 1.6, CFG.TRAY_W + 3.2, CFG.TRAY_H + 3.2, 7,
          'rgba(247,198,74,' + (.55 + pulse * .45) + ')', 1.6);
      }
      ctx.restore();
    }
    // 미구매 슬롯 — 딤 처리 + 가격표(살 수 있으면 골드색, 부족하면 붉은색)
    for (let i = 0; i < 3; i++) {
      if (!S.shop[i]) continue;
      const x = x0 + i * (CFG.TRAY_W + CFG.TRAY_GAP), y = CFG.TRAY_Y;
      const afford = S.gold >= priceOf(S.pieces[i]);
      ctx.save();
      ctx.globalAlpha = .55;
      fillRR(x, y, CFG.TRAY_W, CFG.TRAY_H, 6, 'rgba(18,26,44,.85)');
      ctx.globalAlpha = 1;
      const label = String(priceOf(S.pieces[i]));
      const tw = textW(label, 1) + 15;
      const bx = x + (CFG.TRAY_W - tw) / 2, by = y + CFG.TRAY_H - 16;
      shadowOn(2, 'rgba(10,14,26,.5)', 0, 1);
      fillRR(bx, by, tw, 13.5, 6.7, afford
        ? linGrad(bx, by, 0, 13.5, [[0, '#ffe9a8'], [1, '#e0a52c']])
        : linGrad(bx, by, 0, 13.5, [[0, '#8b5a5f'], [1, '#5e3a40']]));
      shadowOff();
      ctx.beginPath(); ctx.arc(bx + 6.6, by + 6.8, 4.1, 0, Math.PI * 2);
      ctx.fillStyle = afford ? '#f7c64a' : '#7d5f5f'; ctx.fill();
      ctx.strokeStyle = 'rgba(120,80,20,.55)'; ctx.lineWidth = .5; ctx.stroke();
      ctx.beginPath(); ctx.arc(bx + 5.6, by + 5.8, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill();
      text(label, bx + 12.4, by + 3.2, afford ? '#3a2a08' : '#ffd7d7', 1);
      ctx.restore();
    }
    // 경로 미리보기 안내 — 둥근 칩
    const gInfo = bestGain();
    if (gInfo && gInfo.gain !== null) {
      const d = gInfo.gain;
      const str = 'PATH ' + (d >= 0 ? '+' + d : d);
      const tw = textW(str, 2), w = tw + 14, bx = (CFG.LW - w) / 2, by = CFG.TRAY_Y - 26;
      ctx.save();
      shadowOn(3, 'rgba(18,26,44,.4)', 0, 1.2);
      fillRR(bx, by, w, 20, 6, 'rgba(28,47,92,.92)');
      shadowOff();
      ctx.globalAlpha = .9;
      fillRR(bx + 1.4, by + 1.4, w - 2.8, 17.2, 5, d > 0
        ? linGrad(bx, by, 0, 18, [[0, '#fffbe8'], [1, '#ffe9a8']])
        : linGrad(bx, by, 0, 18, [[0, '#fff8f8'], [1, '#f2d9d9']]));
      ctx.restore();
      text(str, bx + 7, by + 4.4, '#252d44', 2);
    }
  }

  function drawHud(t) {
    ctx.save();
    // 상단 바
    let g = ctx.createLinearGradient(0, 0, 0, 36);
    g.addColorStop(0, '#5478c8'); g.addColorStop(.5, '#3f63b0'); g.addColorStop(1, '#2c4784');
    ctx.fillStyle = g; ctx.fillRect(0, 0, CFG.LW, 36);
    ctx.globalAlpha = .35; ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CFG.LW, 1.4);
    // 하단 엣지
    ctx.globalAlpha = 1;
    fillRR(0, 33.4, CFG.LW, 3.2, 1.6, linGrad(0, 33, 0, 3, [[0, '#1c2f5c'], [1, '#0f1c3c']]));
    // 미세 격자
    ctx.globalAlpha = .12; ctx.fillStyle = '#ffffff';
    for (let x = 2; x < CFG.LW; x += 8) ctx.fillRect(x, 0, 2, 1.2);
    ctx.restore();

    const waveShown = Math.min(S.wave, CFG.wavesPerStage);
    text('STAGE ' + S.stage + '  WAVE ' + waveShown + '/' + CFG.wavesPerStage, 6, 6.5, '#fff8e0', 2);
    text('SCORE ' + S.score, 6, 21, '#f7c64a', 1);
    // 골드 — 획득/지출 시 잠깐 강조
    const gx = 6 + textW('SCORE ' + S.score, 1) + 8;
    text('GOLD ' + S.gold, gx, 21, (Math.sin(t * 8) > 0 && S.goldPulse > 0) ? '#fff8e0' : '#ffe08a', 1);

    // 성 HP 하트
    for (let i = 0; i < CFG.hpMax; i++) {
      const hx = CFG.LW - 15 - i * 16, hy = 9;
      if (i < S.hp) {
        // 하트 패스
        const heart = () => {
          ctx.beginPath();
          ctx.moveTo(hx + 6, hy + 11.4);
          ctx.bezierCurveTo(hx - 1.6, hy + 5.6, hx + .2, hy - 1.4, hx + 6, hy + 2.4);
          ctx.bezierCurveTo(hx + 11.8, hy - 1.4, hx + 13.6, hy + 5.6, hx + 6, hy + 11.4);
          ctx.closePath();
        };
        ctx.save();
        shadowOn(2.4, 'rgba(120,20,30,.5)', 0, .8);
        heart();
        ctx.fillStyle = linGrad(0, hy - 1, 0, 12, [[0, '#ff8f8f'], [.55, '#f4595a'], [1, '#c53b3f']]);
        ctx.fill();
        shadowOff();
        // 광택
        ctx.globalAlpha = .55; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(hx + 4.4, hy + 3.4, 2.1, 1.4, -.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        ctx.save(); ctx.globalAlpha = .55;
        fillRR(hx + 1, hy + 1, 10, 10, 3.2, 'rgba(22,34,66,.75)');
        ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = .8;
        strokeRR(hx + 1, hy + 1, 10, 10, 3.2, 'rgba(255,255,255,.22)', .8);
        ctx.restore();
      }
    }
    // 경과 시간(무한 스테이지) — 90초 제한 제거
    const elapsed = Math.floor(S.runTime);
    const ems = Math.floor(elapsed / 60), esec = elapsed % 60;
    const tstr = 'TIME ' + ems + ':' + String(esec).padStart(2, '0');
    text(tstr, CFG.LW - 8 - textW(tstr), 21, '#fff8e0', 1);
    // 웨이브 게이지
    const gp = clamp(S.waveTime / CFG.waveSeconds, 0, 1);
    fillRR(0, 30.4, CFG.LW, 3.4, 1.7, 'rgba(16,26,50,.8)');
    if (gp > 0.01) {
      const gg = ctx.createLinearGradient(0, 30, 0, 34);
      gg.addColorStop(0, '#ffe08a'); gg.addColorStop(1, '#e0a52c');
      fillRR(.6, 31, Math.max(1.2, (CFG.LW - 1.2) * gp), 2.2, 1.1, gg);
    }
    // 콤보
    if (S.noDmgStreak > 1) {
      const str = 'COMBO ' + S.noDmgStreak;
      const w = textW(str, 1) + 8, bx = CFG.LW / 2 - w / 2;
      ctx.save(); shadowOn(2, 'rgba(0,0,0,.35)', 0, .8);
      fillRR(bx, 19, w, 11, 5, 'rgba(247,198,74,.22)'); shadowOff(); ctx.restore();
      text(str, bx + 4, 21, '#fff8e0', 1);
    }
  }

  function drawBanner(t) {
    if (S.banner <= 0) return;
    const a = clamp(S.banner * 1.4, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    const tw = textW(S.bannerSub, 2);
    const w = Math.max(tw + 20, 104), h = 30, bx = (CFG.LW - w) / 2, by = CFG.GY + 40;
    ctx.save();
    shadowOn(6, 'rgba(10,16,32,.5)', 0, 2);
    fillRR(bx, by, w, h, 9, linGrad(bx, by, 0, h, [[0, '#2f4478'], [1, '#1c2f5c']]));
    shadowOff();
    ctx.restore();
    strokeRR(bx + .8, by + .8, w - 1.6, h - 1.6, 8.2, 'rgba(247,198,74,.75)', 1.4);
    ctx.save();
    shadowOn(4, 'rgba(247,198,74,.35)', 0, 0);
    fillRR(bx + 3.4, by + 3.4, w - 6.8, h - 6.8, 6.2, linGrad(bx, by, 0, h, [[0, '#fffdf4'], [1, '#f6e6bd']]));
    shadowOff();
    ctx.restore();
    text(S.bannerSub, bx + (w - tw) / 2, by + 7, '#252d44', 2);
    ctx.restore();
  }

  // 하단 업그레이드 칩(벽 내구도 / 석궁 공격력) — 탭해서 골드로 구매
  const UPG = { y: 299, w: 86, h: 17, gap: 4 };
  function upgRect(i) { return [4 + i * (UPG.w + UPG.gap), UPG.y, UPG.w, UPG.h]; }
  function drawUpgrades(t) {
    const defs = [
      { lv: S.durLv, max: CFG.duraMaxLv, cost: duraCost(), label: '벽 내구도' },
      { lv: S.dmgLv, max: CFG.dmgMaxLv, cost: dmgCost(), label: '대포 공격력' },
    ];
    for (let i = 0; i < 2; i++) {
      const [x, y, w, h] = upgRect(i);
      const d = defs[i];
      const maxed = d.lv >= d.max;
      const afford = !maxed && S.gold >= d.cost;
      ctx.save();
      shadowOn(2.4, 'rgba(12,18,34,.45)', 0, 1.2);
      fillRR(x, y, w, h, 6, maxed
        ? linGrad(x, y, 0, h, [[0, '#6a7a95'], [1, '#46536b']])
        : (afford ? linGrad(x, y, 0, h, [[0, '#5b7fd0'], [1, '#33508f']])
                  : linGrad(x, y, 0, h, [[0, '#8b5a5f'], [1, '#5e3a40']])));
      shadowOff();
      ctx.globalAlpha = .32; ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x + 3, y + 1.6, w - 6, 2.6, 1.3);
      else ctx.rect(x + 3, y + 1.6, w - 6, 2.6);
      ctx.fill(); ctx.globalAlpha = 1;
      text(d.label + ' Lv' + d.lv, x + 5, y + 3.6, '#fff8e0', 1);
      const right = maxed ? 'MAX' : String(d.cost);
      const rx = x + w - 5 - textW(right, 1);
      text(right, rx, y + 3.6, maxed ? '#dfe7f3' : (afford ? '#ffe08a' : '#ffd0d0'), 1);
      if (!maxed) {
        ctx.beginPath(); ctx.arc(rx - 4, y + 7, 3.6, 0, Math.PI * 2);
        ctx.fillStyle = afford ? '#f7c64a' : '#7d5f5f'; ctx.fill();
        ctx.strokeStyle = 'rgba(120,80,20,.5)'; ctx.lineWidth = .45; ctx.stroke();
        ctx.beginPath(); ctx.arc(rx - 5, y + 6, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
      }
      ctx.restore();
    }
  }
  /** 업그레이드 칩 탭 처리 — 처리했으면 true */
  function upgradeAt(lx, ly) {
    if (S.phase !== 'playing') return false;
    if (ly < UPG.y - 4 || ly > UPG.y + UPG.h + 4) return false;
    for (let i = 0; i < 2; i++) {
      const [x, y, w, h] = upgRect(i);
      if (lx >= x - 4 && lx <= x + w + 4) {
        if (i === 0) buyDurability(); else buyDamage();
        return true;
      }
    }
    return false;
  }

  // 검증용: 벡터 캐릭터를 크게 그린 시트(적 5종 · 석궁 · 성탑 · 성벽)
  function drawCharSheet(t) {
    ctx.save();
    ctx.fillStyle = '#eef3f8'; ctx.fillRect(0, 0, CFG.LW, CFG.LH);
    const K = 2.5;
    for (let i = 0; i < 5; i++) {
      ctx.save(); ctx.translate(8 + i * 34, 14); ctx.scale(K, K);
      drawEnemyVector(0, 0, i, t, 0);
      ctx.restore();
    }
    ctx.save(); ctx.translate(16, 78); ctx.scale(K, K); drawBallistaVector(0, 0, t, 0); ctx.restore();
    ctx.save(); ctx.translate(80, 78); ctx.scale(K, K); drawBallistaVector(0, 0, t, 1.9); ctx.restore();
    ctx.save(); ctx.translate(20, 132); ctx.scale(K, K); drawCastleTopVector(0, 0, t); ctx.restore();
    ctx.save(); ctx.translate(24, 186); ctx.scale(K, K); drawCastlePart(0, 0, 3, 8, t); ctx.restore();
    ctx.restore();
  }

  function draw(t) {
    if (window.__LD_SHEET) {          // 검증용 캐릭터 시트(샘플 확인)
      drawCharSheet(t);
      octx.clearRect(0, 0, out.width, out.height);
      octx.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, out.width, out.height);
      return;
    }
    if (S.shake > 0) {
      // 화면 흔들림은 시각 효과 — 게임 RNG(S.rnd)를 소비하면 결정론이 깨지므로 Math.random 사용
      const sx = (Math.random() - .5) * S.shake * .3, sy = (Math.random() - .5) * S.shake * .3;
      ctx.save(); ctx.translate(sx, sy);
    }
    drawBoard(t);
    drawHud(t);
    drawUpgrades(t);
    drawBanner(t);
    // 비네트(화면 가장자리 어둡게) — 32비트 프리렌더 감성
    ctx.save();
    const vg = ctx.createRadialGradient(CFG.LW / 2, CFG.LH / 2, CFG.LH * .34, CFG.LW / 2, CFG.LH / 2, CFG.LH * .72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(12,18,36,.22)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, CFG.LW, CFG.LH);
    ctx.restore();
    if (S.flash > 0) { ctx.globalAlpha = clamp(S.flash, 0, .55); px(0, 0, CFG.LW, CFG.LH, C.white); ctx.globalAlpha = 1; }
    if (S.shake > 0) ctx.restore();
    // 확대 출력
    octx.clearRect(0, 0, out.width, out.height);
    octx.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, out.width, out.height);
  }

  // ---------------------------------------------------------
  // 12. 루프
  // ---------------------------------------------------------
  const STEP = 1 / 60;
  let acc = 0, last = 0;
  function frame(ts) {
    if (!last) last = ts;
    const dtReal = Math.min(0.05, (ts - last) / 1000); last = ts;
    acc += dtReal * S.dtScale;
    let guard = 0;
    while (acc >= STEP && guard++ < 260) { update(STEP); acc -= STEP; }
    draw(ts / 1000);
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------
  // 13. 자동 플레이(테스트/검증용) — AI 대리 지표
  // ---------------------------------------------------------
  function autoplayTick(dt) {
    autoplayTick._t = (autoplayTick._t || 0) - dt;
    if (autoplayTick._t > 0) return;
    autoplayTick._t = 0.35;
    // 현재 배치 가능한 후보 중 경로를 가장 길게 만드는 위치 선택(그리디)
    // 골드가 넉넉하면 업그레이드(내구도 ↔ 공격력 교차)
    if (S.gold > 34) {
      if (S.durUp <= S.dmgUp) { if (!buyDurability()) buyDamage(); }
      else if (!buyDamage()) buyDurability();
    }
    // 미구매 슬롯이면 먼저 구매 시도(골드 충분할 때)
    if (S.shop[S.sel] && !buySlot(S.sel)) {
      const k = S.pieces.findIndex((_, i) => S.shop[i] && S.gold >= priceOf(S.pieces[i]));
      if (k >= 0) { S.sel = k; buySlot(k); S.rot = 0; }
    }
    const p = S.pieces[S.sel];
    if (!p) return;
    if (S.shop[S.sel]) return;                   // 살 수 없으면 대기(보급 대기)
    let best = null;
    for (let rot = 0; rot < 4; rot++) {
      const cells = pieceCells(p, rot);
      for (let r = 0; r <= CFG.ROWS - p.h; r++) {
        for (let c = 0; c <= CFG.COLS - p.w; c++) {
          if (!canPlaceAt(cells, c, r)) continue;
          const pv = previewPath(cells, c, r);
          if (pv.len < 0) continue;                  // 경로 자체가 없으면 제외
          const score = pv.len + (pv.reach - 3) * 6; // v0.5: 구멍을 막으면 감점(그래도 배치는 가능)
          if (!best || score > best.score) best = { c, r, rot, score };
        }
      }
    }
    if (best) { S.rot = best.rot; tryPlace(best.c, best.r); }
    else { S.rot = (S.rot + 1) % 4; }             // 놓을 곳이 없으면 회전만(슬롯은 판매 상태 유지)
  }

  // ---------------------------------------------------------
  // 14. 입력 (탭 = 회전/배치, 드래그 = 조각을 끌어다 놓기)
  //   · 트레이 조각을 잡고 끌면 손가락을 따라 스냅된 위치에 '착지 그림자'가 뜬다
  //   · 놓으면 그 자리에 배치, 못 놓는 자리면 붉은 플래시
  //   · 움직이지 않고 떼면 기존 탭 동작(같은 조각=회전, 다른 조각=선택)
  // ---------------------------------------------------------
  function toLogical(ev) {
    const rect = out.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * CFG.LW;
    const y = ((ev.clientY - rect.top) / rect.height) * CFG.LH;
    return [x, y];
  }

  const DRAG_THRESHOLD = 5;            // 논리 px — 이 이상 움직이면 드래그 판정
  const DRAG = {
    armed: false, on: false, tapped: false, switched: false, slot: -1,
    startX: 0, startY: 0, px: 0, py: 0,
    lift: 8,                           // 손가락 위로 띄우는 높이(논리 px)
    gc: 0, gr: 0, free: false, legal: false, seals: false,
  };

  function traySlotAt(lx, ly) {
    if (ly < CFG.TRAY_Y || ly > CFG.TRAY_Y + CFG.TRAY_H) return -1;
    const totalW = 3 * CFG.TRAY_W + 2 * CFG.TRAY_GAP;
    const tx0 = (CFG.LW - totalW) / 2;
    for (let i = 0; i < 3; i++) {
      const x = tx0 + i * (CFG.TRAY_W + CFG.TRAY_GAP);
      if (lx >= x && lx <= x + CFG.TRAY_W) return i;
    }
    return -1;
  }

  /** 손가락 위치 → 스냅된 조각 원점 + 배치 가능 여부(고스트 계산) */
  function snapDrag(lx, ly) {
    const p = S.pieces[S.sel];
    if (!p) return null;
    const cells = pieceCells(p, S.rot);
    // 손가락이 '칸 중앙'에 있을 때 그 칸에 조각 중심이 오도록 0.5칸 보정(이전엔 한 칸 밀렸다)
    const gc = clamp(Math.round((lx - CFG.GX) / CFG.CELL - (p.w - 1) / 2 - 0.5), 0, CFG.COLS - p.w);
    const gr = clamp(Math.round((ly - CFG.GY - DRAG.lift) / CFG.CELL - (p.h - 1) / 2 - 0.5), 0, CFG.ROWS - p.h);
    const inside = lx > CFG.GX - CFG.CELL * 1.3 && lx < CFG.GX + CFG.COLS * CFG.CELL + CFG.CELL * 1.3 &&
      ly > CFG.GY - CFG.CELL * 2.6 && ly < CFG.GY + CFG.ROWS * CFG.CELL + CFG.CELL * 2.6;
    const free = canPlaceAt(cells, gc, gr);
    // v0.5: 막아도 배치 가능 → legal = 점유 여부만. seals 는 '길이 막힘' 경고(주황).
    const seals = free && !placementKeepsPaths(cells.map(([dc, dr]) => [gc + dc, gr + dr]));
    return { gc, gr, cells, free, legal: free, seals, inside };
  }

  function onTap(lx, ly) {
    if (S.phase !== 'playing') return;
    // 트레이
    const slot = traySlotAt(lx, ly);
    if (slot >= 0) {
      if (S.shop[slot]) {                       // 미구매 슬롯 탭 = 구매
        if (buySlot(slot)) { S.sel = slot; S.rot = 0; }
        return;
      }
      if (S.sel === slot) S.rot = (S.rot + 1) % 4; else { S.sel = slot; S.rot = 0; }
      return;
    }
    // 격자
    const c = Math.floor((lx - CFG.GX) / CFG.CELL), r = Math.floor((ly - CFG.GY) / CFG.CELL);
    if (c < 0 || c >= CFG.COLS || r < 0 || r >= CFG.ROWS) return;
    const p = S.pieces[S.sel]; if (!p) return;
    const cells = pieceCells(p, S.rot);
    const oc = clamp(c - Math.floor(p.w / 2), 0, CFG.COLS - p.w);
    const or = clamp(r - Math.floor(p.h / 2), 0, CFG.ROWS - p.h);
    if (canPlaceAt(cells, oc, or)) tryPlace(oc, or);
    else { S.flash = .18; addFx('deny', clamp(c, 0, CFG.COLS - 1), clamp(r, 0, CFG.ROWS - 1)); }
  }

  function arm(lx, ly) {
    DRAG.armed = false; DRAG.on = false; DRAG.tapped = false; DRAG.switched = false; DRAG.slot = -1;
    if (S.phase !== 'playing') return;
    const slot = traySlotAt(lx, ly);
    if (slot < 0 || !S.pieces[slot]) return;
    if (S.shop[slot]) {                           // 미구매 슬롯은 잡는 순간 구매(골드 필요)
      if (!buySlot(slot)) return;
      S.sel = slot; S.rot = 0; DRAG.switched = true;
    }
    if (S.sel !== slot) { S.sel = slot; S.rot = 0; DRAG.switched = true; }
    DRAG.armed = true; DRAG.slot = slot;
    DRAG.startX = lx; DRAG.startY = ly; DRAG.px = lx; DRAG.py = ly;
    const s = snapDrag(lx, ly);
    if (s) { DRAG.gc = s.gc; DRAG.gr = s.gr; DRAG.free = s.free; DRAG.legal = s.legal; DRAG.seals = s.seals; }
  }

  function moveDrag(lx, ly) {
    if (!DRAG.armed) return;
    if (!DRAG.on) {
      if (Math.hypot(lx - DRAG.startX, ly - DRAG.startY) < DRAG_THRESHOLD) return;
      DRAG.on = true;
    }
    DRAG.px = lx; DRAG.py = ly;
    const s = snapDrag(lx, ly);
    if (s) { DRAG.gc = s.gc; DRAG.gr = s.gr; DRAG.free = s.free; DRAG.legal = s.legal; DRAG.seals = s.seals; }
  }

  /** 드래그 종료 — 실제로 놓였으면 true(탭 처리 안 함) */
  function endDrag(lx, ly, cancelled) {
    if (!DRAG.on) { DRAG.armed = false; return false; }
    const s = snapDrag(lx, ly);
    if (!cancelled && s && s.inside) {
      if (s.free) tryPlace(s.gc, s.gr);            // v0.5: 막는 배치도 허용
      else { S.flash = .18; addFx('deny', clamp(s.gc, 0, CFG.COLS - 1), clamp(s.gr, 0, CFG.ROWS - 1)); }
    }
    DRAG.on = false; DRAG.armed = false;
    return true;
  }

  out.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    if (ev.pointerId !== undefined && out.setPointerCapture) {
      try { out.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ }
    }
    const [lx, ly] = toLogical(ev);
    if (upgradeAt(lx, ly)) { DRAG.tapped = true; return; }   // 하단 업그레이드 칩
    arm(lx, ly);
    if (!DRAG.armed) { onTap(lx, ly); DRAG.tapped = true; }
  });
  out.addEventListener('pointermove', (ev) => {
    if (!DRAG.armed) return;
    ev.preventDefault();
    const [lx, ly] = toLogical(ev);
    moveDrag(lx, ly);
  });
  out.addEventListener('pointerup', (ev) => {
    const [lx, ly] = toLogical(ev);
    if (DRAG.tapped) { DRAG.tapped = false; return; }        // 누를 때 이미 처리한 탭
    if (DRAG.on) { endDrag(lx, ly, false); return; }
    if (DRAG.armed) {                                        // 움직이지 않고 뗌 → 탭
      const slot = traySlotAt(lx, ly);
      DRAG.armed = false;
      if (DRAG.switched && slot === DRAG.slot) return;        // 조각 선택만
      onTap(lx, ly);
    }
  });
  out.addEventListener('pointercancel', (ev) => {
    const [lx, ly] = toLogical(ev);
    endDrag(lx, ly, true);
  });

  // ---------------------------------------------------------
  // 15. UI 연결
  // ---------------------------------------------------------
  UI.startBtn.addEventListener('click', () => {
    S.name = (UI.nameInput.value || '').trim() || ('방어대' + (1000 + Math.floor(Math.random() * 9000)));
    startRun();
  });
  UI.upCannon.addEventListener('click', () => { buyDamage(); refreshStageUI(); });
  UI.upDura.addEventListener('click', () => { buyDurability(); refreshStageUI(); });
  UI.nextStage.addEventListener('click', () => nextStage());
  UI.gateYes.addEventListener('click', () => answerGate(true));
  UI.gateNo.addEventListener('click', () => answerGate(false));
  UI.restart.addEventListener('click', () => startRun());

  // ---------------------------------------------------------
  // 16. 테스트 훅 (자동 검증용)
  // ---------------------------------------------------------
  window.__LD = {
    CFG, S,
    start: (seed) => startRun(seed),
    speed: (v) => { S.dtScale = v; },
    pause: (on) => { S.dtScale = on ? 0 : 1; },
    step: (n) => { const k = n || 1; for (let i = 0; i < k; i++) update(STEP); return +S.runTime.toFixed(3); },
    hash: () => stateHash(),
    trace: (on, every) => { S.traceOn = !!on; S.traceEvery = every || 1; if (on) S.trace = []; S.stepCount = 0; },
    traceData: () => S.trace,
    autoplay: (on) => { S.autoplay = !!on; },
    tap: (lx, ly) => onTap(lx, ly),
    gold: () => S.gold,
    durLv: () => S.durLv,
    stage: () => S.stage,
    stageClears: () => S.stageClears,
    nextStage: () => { nextStage(); return S.stage; },
    setWave: (n) => { S.wave = n; },
    setWaveTime: (v) => { S.waveTime = v; },
    dmgLv: () => S.dmgLv,
    buyDura: () => buyDurability(),
    buyDmg: () => buyDamage(),
    duraCost: () => duraCost(),
    dmgCost: () => dmgCost(),
    bhp: (c, r) => S.bhp[r][c],
    setBhp: (c, r, v) => { S.bhp[r][c] = v; },
    wallBreak: () => S.wallBreak,
    sealedHoles: () => HOLES.filter(([c, r]) => S.dist[r][c] < 0).length,
    setGold: (v) => { S.gold = v; },
    buy: (i) => buySlot(i),
    shop: () => S.pieces.map((p, i) => ({ offer: S.shop[i], id: p && p.id, price: S.shop[i] ? priceOf(p) : 0 })),
    drag: DRAG,
    dragBegin: (lx, ly) => { arm(lx, ly); return { armed: DRAG.armed, slot: DRAG.slot }; },
    dragTo: (lx, ly) => { moveDrag(lx, ly); return { on: DRAG.on, gc: DRAG.gc, gr: DRAG.gr, free: DRAG.free, legal: DRAG.legal }; },
    dragDrop: (lx, ly) => { const t = DRAG.on; endDrag(lx, ly, false); return t; },
    tapCell: (c, r) => { const [x, y] = cellRect(c, r); onTap(x + 10, y + 10); },
    selectTray: (i) => { const totalW = 3 * CFG.TRAY_W + 2 * CFG.TRAY_GAP, tx0 = (CFG.LW - totalW) / 2; onTap(tx0 + i * (CFG.TRAY_W + CFG.TRAY_GAP) + 10, CFG.TRAY_Y + 10); },
    rotate: () => { S.rot = (S.rot + 1) % 4; },
    place: (c, r) => tryPlace(c, r),
    path: () => pathLen(),
    checkLines: () => { checkLines(); return S.grid.flat().filter(v => v === BLOCK).length; },
    dist: () => S.dist,
    gate: (yes) => answerGate(!!yes),
    gateLog: () => gateLogLoad(),
    resend: () => { S.hp = 0; update(1 / 60); },
    snapshot: () => ({
      phase: S.phase, stage: S.stage, stageClears: S.stageClears, durLv: S.durLv, dmgLv: S.dmgLv,
      wave: S.wave, score: S.score, hp: S.hp, kills: S.kills,
      runTime: +S.runTime.toFixed(2), enemies: S.enemies.length, bolts: S.bolts.length,
      pathLen: pathLen().len, reach: pathLen().reach,
      blocks: S.grid.flat().filter(v => v === BLOCK).length,
      pieces: S.pieces.map(p => p.id), sel: S.sel,
      gateAnswer: S.gateAnswer, gateLogLen: gateLogLoad().length,
      seed: S.seed, redraw: +S.redraw.toFixed(2),
    }),
    setGridText: (txt) => {
      txt.replace(/^\n|\n$/g, '').split('\n').forEach((line, r) => {
        if (r >= CFG.ROWS) return;
        for (let c = 0; c < Math.min(line.length, CFG.COLS); c++) {
          const ch = line[c];
          S.grid[r][c] = ch === '#' ? BLOCK : ch === 'C' ? CASTLE : ch === 'B' ? BALLISTA : ch === 'O' ? HOLE_C : FLOOR;
        }
      });
      S.gridVer++; S.hintCache = null;
      computeDist();
      return S.grid.map(row => row.join('')).length;
    },
    gridText: () => S.grid.map(row => row.map(v =>
      v === BLOCK ? '#' : v === CASTLE ? 'C' : v === BALLISTA ? 'B' : v === HOLE_C ? 'O' : '.').join('')).join('\n'),
  };

  // ---------------------------------------------------------
  // 17. 부팅
  // ---------------------------------------------------------
  S.grid = newGrid(); computeDist();
  S.pieces = drawPieces(3);
  refreshGateStat();
  requestAnimationFrame(frame);
})();
