// VICE COVER v3 — GTA-style multi-panel cover art maker.
// All state lives in this one module. Photos are read on the user's machine
// (FileReader / bundled samples) and never uploaded anywhere.
// v3 adds: striped retro-chrome 3D titles, per-panel role tags, full poster
// furniture (quote bar, VOL badge, seal, barcode, billing block, tagline
// strip, COMING SOON), slanted panel cuts and a Location-grid layout.

const canvas = document.getElementById('coverCanvas');
const ctx = canvas.getContext('2d');

const SAMPLE_PHOTOS = [
  { name: 'Boulevard sunset', src: 'samples/boulevard.jpg' },
  { name: 'Golden-hour convertible', src: 'samples/convertible.jpg' },
  { name: 'Neon street couple', src: 'samples/neon-couple.jpg' },
];

// Six poster layouts. Each panel is a fraction rect [x, y, w, h] of the cover.
const LAYOUTS = [
  {
    id: 'hero-side', name: 'Hero + Side',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 0.5 },
      { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
    ],
  },
  {
    id: 'grid-2x2', name: '2 × 2 Grid',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: 'strip-hero', name: 'Strip + Hero',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.34 },
      { x: 0, y: 0.34, w: 0.5, h: 0.66 },
      { x: 0.5, y: 0.34, w: 0.5, h: 0.66 },
    ],
  },
  {
    id: 'poster', name: 'Poster Mix',
    panels: [
      { x: 0, y: 0, w: 0.4, h: 1 },
      { x: 0.4, y: 0, w: 0.6, h: 0.55 },
      { x: 0.4, y: 0.55, w: 0.3, h: 0.45 },
      { x: 0.7, y: 0.55, w: 0.3, h: 0.45 },
    ],
  },
  {
    id: 'location-grid', name: 'Location Grid',
    panels: [
      { x: 0, y: 0, w: 0.55, h: 1 },
      { x: 0.55, y: 0, w: 0.225, h: 0.5 },
      { x: 0.775, y: 0, w: 0.225, h: 0.5 },
      { x: 0.55, y: 0.5, w: 0.225, h: 0.5 },
      { x: 0.775, y: 0.5, w: 0.225, h: 0.5 },
    ],
  },
  {
    id: 'band-hero', name: 'Band + Trio',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.52 },
      { x: 0, y: 0.52, w: 1 / 3, h: 0.48 },
      { x: 1 / 3, y: 0.52, w: 1 / 3, h: 0.48 },
      { x: 2 / 3, y: 0.52, w: 1 / 3, h: 0.48 },
    ],
  },
];

// Six Vice City colour grades. Each tints the photos and the whole cover.
const GRADES = [
  {
    id: 'sunset', name: 'Sunset',
    photoFilter: 'saturate(1.35) contrast(1.08) brightness(1.03) sepia(0.18)',
    top: '#ff9a3c', bottom: '#ff2e88', blend: 'overlay',
  },
  {
    id: 'neon', name: 'Neon Night',
    photoFilter: 'saturate(1.5) contrast(1.15) brightness(0.98) hue-rotate(-8deg)',
    top: '#ff2e88', bottom: '#00e5ff', blend: 'soft-light',
  },
  {
    id: 'pastel', name: 'Pastel Vice',
    photoFilter: 'saturate(1.12) contrast(0.95) brightness(1.08)',
    top: '#ffb3d9', bottom: '#7fe3d0', blend: 'soft-light',
  },
  {
    id: 'golden', name: 'Golden Hour',
    photoFilter: 'saturate(1.4) contrast(1.06) brightness(1.06) sepia(0.3)',
    top: '#ffd166', bottom: '#ff7a3c', blend: 'overlay',
  },
  {
    id: 'magenta', name: 'Magenta Dusk',
    photoFilter: 'saturate(1.45) contrast(1.12) brightness(1.0)',
    top: '#ff2e88', bottom: '#7b2ff7', blend: 'soft-light',
  },
  {
    id: 'teal', name: 'Teal Noir',
    photoFilter: 'saturate(1.25) contrast(1.1) brightness(1.02) hue-rotate(12deg)',
    top: '#37e0d8', bottom: '#ff9a3c', blend: 'soft-light',
  },
];

// Striped retro-chrome title gradients (vertical, top to bottom of the glyphs).
const CHROME = {
  sunset: ['#fff6c9', '#ffc65c', '#ff7a3c', '#ff2e88', '#c2185b'],
  gold: ['#fffbe0', '#ffe066', '#f5a623', '#c77f0a', '#8a5a00'],
  pink: ['#ffe9f4', '#ff8ac2', '#ff2e88', '#d81159', '#7a0e3d'],
  mint: ['#eafffb', '#8ef2e2', '#37e0d8', '#2b9fd8', '#1d6fb8'],
};

const PANEL_FILTERS = {
  none: '',
  warm: 'sepia(0.28) saturate(1.25) brightness(1.02)',
  cool: 'hue-rotate(18deg) saturate(1.3) brightness(1.05)',
  mono: 'grayscale(1) contrast(1.32) brightness(1.04)',
};

const SIZES = {
  '1920x1080': { w: 1920, h: 1080, note: 'Landscape · story-ready' },
  '1080x1080': { w: 1080, h: 1080, note: 'Square · feed post' },
  '1080x1350': { w: 1080, h: 1350, note: 'Portrait · feed post' },
};

const DEFAULT_ROLE_TAGS = ['THE DRIVER', 'THE INSIDER', 'THE GETAWAY', 'THE RIDER', 'THE COURIER', 'THE FIXER'];
const DEFAULT_LOCATIONS = [
  { place: 'CORAL BAY MARINA', time: '6:55 PM', note: 'LAST LIGHT' },
  { place: 'PALM ROW', time: '7:20 PM', note: 'FULL TANK' },
  { place: 'TOWER 9', time: '8:05 PM', note: 'DOORS LOCKED' },
  { place: 'NEON PIER', time: '9:40 PM', note: 'CITY ASLEEP' },
];

const state = {
  layoutId: 'hero-side',
  gradeId: 'sunset',
  gradeStrength: 0.7,
  sizeKey: '1920x1080',
  title: 'VICE HEAT',
  subtitle: 'one last drive down the coast',
  titleScale: 1.0,
  letterSpacing: 6,
  chrome: 'sunset',
  titlePos: 'bottom',
  slanted: false,
  roleTags: DEFAULT_ROLE_TAGS.slice(),
  locations: DEFAULT_LOCATIONS.map((o) => ({ ...o })),
  furn: {
    quote: 'EVERY FRAME FEELS LIKE THE LAST DAY OF SUMMER',
    source: 'THE COASTLINE REVIEW',
    vol: 'VOL. 01',
    tagline: 'THREE CARS · ONE SUNSET · NO TURNING BACK',
    billing: 'A GOLDEN HOUR PICTURES PRODUCTION · STARRING YOUR CREW · SHOT ON YOUR OWN PHONE · GRADED BY HAND',
    showQuote: true,
    showVol: true,
    showSeal: true,
    showBarcode: true,
    showBilling: true,
    showTagline: true,
    showComingSoon: true,
    showRoleTags: true,
  },
  photos: [],          // { name, img }
  panels: [],          // { photo, zoom, panX, panY, filter } per layout panel
  selected: 0,
  samplesLoaded: false,
};

function defaultPanels(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ photo: state.photos.length ? 0 : null, zoom: 1, panX: 0, panY: 0, filter: 'none' });
  }
  return out;
}

function currentLayout() {
  return LAYOUTS.find((l) => l.id === state.layoutId);
}

function currentGrade() {
  return GRADES.find((g) => g.id === state.gradeId);
}

// Deterministic pseudo-random generator (fixed seed) for grain + halftone +
// barcode, so every render of the same cover is pixel-identical.
function seededRandom(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + src));
    img.src = src;
  });
}

async function loadSamples() {
  if (state.samplesLoaded) return;
  const loaded = [];
  for (const s of SAMPLE_PHOTOS) {
    try {
      const img = await loadImage(s.src);
      loaded.push({ name: s.name, img });
    } catch (err) {
      console.warn('sample failed:', s.src);
    }
  }
  if (loaded.length) {
    const hadPhotos = state.photos.length > 0;
    state.photos = state.photos.concat(loaded);
    state.samplesLoaded = true;
    if (!hadPhotos) {
      state.panels = state.panels.map((p, i) => ({
        ...p,
        photo: Math.min(i, state.photos.length - 1),
      }));
    }
    refreshPhotoUI();
    render();
  }
}

function drawPhotoCover(c, img, px, py, pw, ph, zoom, panX, panY) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const base = Math.max(pw / iw, ph / ih) * zoom;
  const dw = iw * base, dh = ih * base;
  const dx = px + (pw - dw) / 2 + (panX / 100) * pw * 0.5;
  const dy = py + (ph - dh) / 2 + (panY / 100) * ph * 0.5;
  c.drawImage(img, dx, dy, dw, dh);
}

// Width of spaced text at the current font.
function spacedWidth(c, text, spacing) {
  const chars = Array.from(text);
  let total = 0;
  chars.forEach((ch, i) => {
    total += c.measureText(ch).width;
    if (i < chars.length - 1) total += spacing;
  });
  return total;
}

// Draws spaced text starting at x (left-aligned), returns total width.
function drawSpacedFrom(c, text, x, y, spacing) {
  const chars = Array.from(text);
  let cx = x;
  chars.forEach((ch, i) => {
    c.fillText(ch, cx, y);
    if (c.lineWidth > 0) c.strokeText(ch, cx, y);
    cx += c.measureText(ch).width + (i < chars.length - 1 ? spacing : 0);
  });
  return cx - x;
}

// Draws centred spaced text.
function drawSpacedCentered(c, text, cx, y, spacing) {
  const w = spacedWidth(c, text, spacing);
  return drawSpacedFrom(c, text, cx - w / 2, y, spacing);
}

// Shrink the current font until text fits maxW; returns the fitting size.
function fitFont(c, text, maxW, startPx, family, weight) {
  let px = startPx;
  c.font = `${weight || ''} ${px}px ${family}`;
  while (px > 8 && spacedWidth(c, text, 0) > maxW) {
    px -= 1;
    c.font = `${weight || ''} ${px}px ${family}`;
  }
  return px;
}

function panelPath(c, px, py, pw, ph, slant) {
  c.beginPath();
  if (!slant) {
    c.rect(px, py, pw, ph);
    return;
  }
  c.moveTo(px + slant, py);
  c.lineTo(px + pw, py);
  c.lineTo(px + pw - slant, py + ph);
  c.lineTo(px, py + ph);
  c.closePath();
}

// ---- Chrome title ---------------------------------------------------------
// Renders the giant striped retro-chrome title on an offscreen canvas:
// stacked dark copies for 3D depth, a vertical chrome gradient fill,
// horizontal stripe bands clipped to the glyphs, then a dark outline.
// Drawn centred at (cx, titleBaselineY).

function drawChromeTitle(c, W, titleBaselineY, size, spacing) {
  const text = state.title.toUpperCase();
  if (!text) return;
  const preset = CHROME[state.chrome] || CHROME.sunset;
  c.font = `${size}px Anton, sans-serif`;
  const textW = spacedWidth(c, text, spacing);
  const depth = Math.max(4, Math.round(size * 0.055));
  const padX = Math.ceil(size * 0.30) + depth + 2;
  const padY = Math.ceil(size * 0.28) + depth + 2;
  const off = document.createElement('canvas');
  off.width = Math.ceil(textW + padX * 2);
  off.height = Math.ceil(size * 1.35 + padY * 2);
  const o = off.getContext('2d');
  o.font = `${size}px Anton, sans-serif`;
  o.textAlign = 'left';
  o.textBaseline = 'alphabetic';
  o.lineJoin = 'round';
  const baseY = padY + size;
  const drawChars = (fillStyle) => {
    o.fillStyle = fillStyle;
    let x = padX;
    const chars = Array.from(text);
    chars.forEach((ch, i) => {
      o.fillText(ch, x, baseY);
      x += o.measureText(ch).width + (i < chars.length - 1 ? spacing : 0);
    });
  };
  // 3D depth: stacked dark copies down-right.
  for (let i = depth; i >= 1; i--) {
    o.save();
    o.translate(i * 0.9, i);
    drawChars('#150826');
    o.restore();
  }
  // Chrome gradient fill.
  const grad = o.createLinearGradient(0, baseY - size, 0, baseY + size * 0.12);
  preset.forEach((col, i) => grad.addColorStop(i / (preset.length - 1), col));
  drawChars(grad);
  // Horizontal stripes clipped to the glyphs.
  o.globalCompositeOperation = 'source-atop';
  const bandH = Math.max(3, size * 0.085);
  for (let y = 0; y < off.height; y += bandH * 2) {
    o.fillStyle = 'rgba(255,255,255,0.20)';
    o.fillRect(0, y, off.width, bandH * 0.5);
    o.fillStyle = 'rgba(16,4,28,0.16)';
    o.fillRect(0, y + bandH, off.width, bandH * 0.45);
  }
  o.globalCompositeOperation = 'source-over';
  // Dark outline around the glyphs.
  o.lineWidth = Math.max(2, size * 0.05);
  o.strokeStyle = '#12061f';
  {
    let x = padX;
    const chars = Array.from(text);
    chars.forEach((ch, i) => {
      o.strokeText(ch, x, baseY);
      x += o.measureText(ch).width + (i < chars.length - 1 ? spacing : 0);
    });
  }
  c.drawImage(off, Math.round(W / 2 - off.width / 2), Math.round(titleBaselineY - baseY));
}

// Neon subtitle: white Bebas with a pink glow (and a faint cyan echo).
function drawNeonSubtitle(c, W, subBaselineY, size, spacing) {
  const text = state.subtitle;
  if (!text) return;
  c.save();
  c.font = `${size}px "Bebas Neue", "Anton", sans-serif`;
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.lineWidth = Math.max(1.5, size * 0.09);
  c.strokeStyle = 'rgba(10,5,18,0.85)';
  c.lineJoin = 'round';
  const w = spacedWidth(c, text, spacing);
  const x0 = W / 2 - w / 2;
  // Stroke pass (outline only, no fill) for legibility.
  c.fillStyle = 'rgba(0,0,0,0)';
  drawSpacedFrom(c, text, x0, subBaselineY, spacing);
  c.fillStyle = '#ffffff';
  c.shadowColor = '#ff2e88';
  c.shadowBlur = size * 0.7;
  drawSpacedFrom(c, text, x0, subBaselineY, spacing);
  c.shadowColor = '#37e0d8';
  c.shadowBlur = size * 0.28;
  drawSpacedFrom(c, text, x0, subBaselineY, spacing);
  c.restore();
}

// ---- Poster furniture -----------------------------------------------------

function drawQuoteBar(c, W, H, s) {
  if (!state.furn.showQuote || !state.furn.quote) return 0;
  const qbH = Math.max(30, H * 0.05);
  c.save();
  c.fillStyle = 'rgba(8,4,16,0.88)';
  c.fillRect(0, 0, W, qbH);
  c.fillStyle = '#ffd166';
  c.fillRect(0, qbH - 2 * s, W, 2 * s);
  const stars = '★★★★★';
  const line = `  ${state.furn.quote}  —  ${state.furn.source}`;
  const maxW = W * 0.94;
  let px = fitFont(c, stars + line, maxW, Math.round(W * 0.016), 'Anton, sans-serif');
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  const totalW = spacedWidth(c, stars + line, 1.5 * s);
  let x = W / 2 - totalW / 2;
  const y = qbH / 2;
  c.fillStyle = '#ffd166';
  x += drawSpacedFrom(c, stars, x, y, 1.5 * s);
  c.fillStyle = '#ffffff';
  drawSpacedFrom(c, line, x, y, 1.5 * s);
  c.restore();
  return qbH;
}

function drawVolBadge(c, W, H, qbH, s) {
  if (!state.furn.showVol || !state.furn.vol) return;
  const px = Math.round(W * 0.015);
  c.save();
  c.font = `${px}px Anton, sans-serif`;
  const tw = c.measureText(state.furn.vol).width;
  const bw = tw + px * 1.6;
  const bh = px * 2.1;
  const x = W - W * 0.045 - bw;
  const y = qbH + H * 0.012;
  c.fillStyle = '#ffd166';
  c.strokeStyle = '#12061f';
  c.lineWidth = Math.max(1.5, 2 * s);
  c.beginPath();
  c.roundRect(x, y, bw, bh, bh / 2);
  c.fill();
  c.stroke();
  c.fillStyle = '#12061f';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(state.furn.vol, x + bw / 2, y + bh / 2 + px * 0.06);
  c.restore();
}

function drawBarcode(c, W, H, footerTop, footerH, pad, s) {
  if (!state.furn.showBarcode) return;
  const bw = W * 0.085;
  const bh = footerH * 0.52;
  const x = pad;
  const y = footerTop + (footerH - bh) / 2 - H * 0.008;
  c.save();
  c.fillStyle = '#ffffff';
  c.fillRect(x, y, bw, bh);
  const rnd = seededRandom(20261120);
  let bx = x + bw * 0.04;
  c.fillStyle = '#0a0512';
  while (bx < x + bw * 0.96) {
    const wBar = (1 + rnd() * 3.2) * s;
    if (rnd() > 0.42) c.fillRect(bx, y + bh * 0.06, wBar, bh * 0.82);
    bx += wBar + (0.8 + rnd() * 2.4) * s;
  }
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.font = `${Math.max(9, Math.round(W * 0.009))}px Anton, sans-serif`;
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillText('8 901234 567890', x, y + bh + Math.max(11, W * 0.011));
  c.restore();
}

function drawSeal(c, W, H, footerTop, footerH, pad, s) {
  if (!state.furn.showSeal) return;
  const R = footerH * 0.44;
  const cx = W - pad - R;
  const cy = footerTop + footerH / 2;
  c.save();
  c.translate(cx, cy);
  c.rotate(-0.21);
  c.beginPath();
  const spikes = 16;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? R : R * 0.8;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  c.fillStyle = '#f5c542';
  c.fill();
  c.lineWidth = Math.max(1.5, 2 * s);
  c.strokeStyle = '#8a5a00';
  c.stroke();
  c.beginPath();
  c.arc(0, 0, R * 0.66, 0, Math.PI * 2);
  c.fillStyle = '#ffe9a8';
  c.fill();
  c.fillStyle = '#5a3a00';
  c.font = `${Math.max(9, Math.round(R * 0.30))}px Anton, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('ORIGINAL', 0, -R * 0.17);
  c.fillText('COVER ART', 0, R * 0.17);
  c.restore();
}

function drawFooter(c, W, H, s) {
  const footerH = H * 0.15;
  const footerTop = H - footerH;
  const pad = Math.round(W * 0.045);
  const maxTextW = W - 2 * (pad + W * 0.115);
  c.save();
  // Solid footer band: the furniture sits on dark, poster-style.
  c.fillStyle = 'rgba(8,4,16,0.93)';
  c.fillRect(0, footerTop, W, footerH);
  c.fillStyle = '#ffd166';
  c.fillRect(0, footerTop, W, Math.max(2, 2.5 * s));
  // Tagline strip.
  if (state.furn.showTagline && state.furn.tagline) {
    const tagSize = fitFont(c, state.furn.tagline, maxTextW, Math.round(W * 0.017), 'Anton, sans-serif');
    c.fillStyle = '#ffd166';
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    drawSpacedCentered(c, state.furn.tagline, W / 2, footerTop + tagSize + H * 0.012, 3 * s);
  }
  // Billing block.
  if (state.furn.showBilling && state.furn.billing) {
    const billSize = fitFont(c, state.furn.billing, maxTextW, Math.round(W * 0.0115), 'Anton, sans-serif');
    c.fillStyle = 'rgba(255,255,255,0.78)';
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    drawSpacedCentered(c, state.furn.billing, W / 2, footerTop + footerH * 0.52, 1.5 * s);
  }
  // COMING SOON pill.
  if (state.furn.showComingSoon) {
    const soonSize = Math.round(W * 0.013);
    c.font = `${soonSize}px Anton, sans-serif`;
    const label = 'COMING SOON';
    const tw = spacedWidth(c, label, 3 * s);
    const bw = tw + soonSize * 2.2;
    const bh = soonSize * 2.0;
    const x = W / 2 - bw / 2;
    const y = footerTop + footerH * 0.66;
    c.fillStyle = 'rgba(10,5,18,0.65)';
    c.strokeStyle = '#ffd166';
    c.lineWidth = Math.max(1.5, 2 * s);
    c.beginPath();
    c.roundRect(x, y, bw, bh, bh / 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#ffd166';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    drawSpacedFrom(c, label, x + soonSize * 1.1, y + bh / 2 + soonSize * 0.06, 3 * s);
  }
  c.restore();
  drawBarcode(c, W, H, footerTop, footerH, pad, s);
  drawSeal(c, W, H, footerTop, footerH, pad, s);
  return footerH;
}

// ---- Role tags + location captions ----------------------------------------

function drawRoleTag(c, px, topY, s, label) {
  if (!label) return;
  const fs = Math.max(10, Math.round((c.canvas.width / 1920) * 24));
  c.save();
  c.font = `${fs}px Anton, sans-serif`;
  const tw = c.measureText(label).width;
  const bw = tw + fs * 1.5;
  const bh = fs * 1.9;
  c.translate(px + 10 * s + bw / 2, topY + bh / 2);
  c.rotate(-0.05);
  c.fillStyle = 'rgba(10,5,18,0.88)';
  c.strokeStyle = '#ffd166';
  c.lineWidth = Math.max(1.5, 2 * s);
  c.beginPath();
  c.roundRect(-bw / 2, -bh / 2, bw, bh, 3 * s);
  c.fill();
  c.stroke();
  c.fillStyle = '#ffd166';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(label, 0, fs * 0.06);
  c.restore();
}

function drawLocationCaption(c, px, py, pw, ph, s, loc, placeTop, leftPad) {
  if (!loc) return;
  const stripH = ph * 0.24;
  const y = placeTop ? py + 2 : py + ph - stripH;
  c.save();
  c.fillStyle = 'rgba(8,4,16,0.85)';
  c.fillRect(px, y, pw, stripH);
  c.fillStyle = '#ffd166';
  c.fillRect(px, y, pw, Math.max(2, 2.5 * s));
  const inset = Math.max(8, 10 * s);
  const tx = px + inset + (leftPad || 0);
  const textW = pw - inset * 2 - (leftPad || 0);
  const line1 = `${loc.place} · ${loc.time}`;
  const fs1 = fitFont(c, line1, textW, Math.round(ph * 0.085), 'Anton, sans-serif');
  c.fillStyle = '#ffffff';
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillText(line1, tx, y + stripH * 0.48);
  const fs2 = fitFont(c, loc.note, textW, Math.round(ph * 0.068), 'Anton, sans-serif');
  c.fillStyle = '#ffd166';
  c.fillText(loc.note, tx, y + stripH * 0.86);
  c.restore();
}

function drawCover(c, W, H) {
  const layout = currentLayout();
  const grade = currentGrade();
  const gap = Math.max(4, Math.round(W * 0.006));
  const s = W / 1920; // scale factor for strokes / text
  const slant = state.slanted ? Math.round(16 * s) : 0;
  // Quote-bar height (drawn later, but the role tags need it now so they
  // never slide under the bar).
  const quoteH = (state.furn.showQuote && state.furn.quote) ? Math.max(30, H * 0.05) : 0;
  const panelRects = [];

  c.clearRect(0, 0, W, H);
  c.fillStyle = '#120a1c';
  c.fillRect(0, 0, W, H);

  // Panels: photo, grade wash, location caption, comic-book border, role tag.
  layout.panels.forEach((panel, idx) => {
    const px = panel.x * W + gap / 2;
    const py = panel.y * H + gap / 2;
    const pw = panel.w * W - gap;
    const ph = panel.h * H - gap;
    const ps = state.panels[idx] || { photo: null, zoom: 1, panX: 0, panY: 0, filter: 'none' };
    panelRects.push({ px, py, pw, ph });

    c.save();
    panelPath(c, px, py, pw, ph, slant);
    c.clip();

    const photo = ps.photo != null ? state.photos[ps.photo] : null;
    if (photo) {
      const filters = [grade.photoFilter, PANEL_FILTERS[ps.filter] || ''].filter(Boolean).join(' ');
      c.filter = filters;
      drawPhotoCover(c, photo.img, px, py, pw, ph, ps.zoom, ps.panX, ps.panY);
      c.filter = 'none';
    } else {
      const g = c.createLinearGradient(px, py, px, py + ph);
      g.addColorStop(0, '#2b1b45');
      g.addColorStop(1, '#120a1c');
      c.fillStyle = g;
      c.fillRect(px, py, pw, ph);
      c.fillStyle = 'rgba(245,238,252,0.55)';
      c.font = `${Math.round(20 * s + 12)}px Anton, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('ADD A PHOTO', px + pw / 2, py + ph / 2);
    }

    // Grade wash over the panel.
    const wash = c.createLinearGradient(px, py, px + pw * 0.35, py + ph);
    wash.addColorStop(0, grade.top);
    wash.addColorStop(1, grade.bottom);
    c.globalCompositeOperation = grade.blend;
    c.globalAlpha = 0.38 * state.gradeStrength + 0.08;
    c.fillStyle = wash;
    c.fillRect(px, py, pw, ph);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;

    // Location caption on the small panels of the Location grid. Panels that
    // touch the bottom get their caption at the top instead, so the footer
    // band never covers it; the caption text starts past the role tag.
    if (layout.id === 'location-grid' && idx > 0) {
      const touchesBottom = panel.y + panel.h > 0.99;
      let leftPad = 0;
      if (touchesBottom && state.furn.showRoleTags && state.roleTags[idx]) {
        const tagFs = Math.max(10, Math.round((W / 1920) * 24));
        c.font = `${tagFs}px Anton, sans-serif`;
        leftPad = c.measureText(state.roleTags[idx]).width + tagFs * 1.5 + 16 * s;
      }
      drawLocationCaption(c, px, py, pw, ph, s, state.locations[idx - 1], touchesBottom, leftPad);
    }

    // Panel border: white comic edge (+ dark keyline when cuts are straight).
    panelPath(c, px, py, pw, ph, slant);
    c.lineWidth = Math.max(3, 5 * s);
    c.strokeStyle = '#ffffff';
    c.stroke();
    if (!slant) {
      c.lineWidth = Math.max(2, 2.5 * s);
      c.strokeStyle = 'rgba(10,5,18,0.85)';
      c.strokeRect(px + 5 * s, py + 5 * s, pw - 10 * s, ph - 10 * s);
    }
    c.restore();

    // Selected-panel marker in the live preview only.
    if (c === ctx && idx === state.selected) {
      c.save();
      c.lineWidth = Math.max(3, 4 * s);
      c.strokeStyle = '#37e0d8';
      c.setLineDash([14 * s, 8 * s]);
      panelPath(c, px - 3, py - 3, pw + 6, ph + 6, slant);
      c.stroke();
      c.restore();
    }
  });

  // Warm sun glow, top-right, part of the sunset look.
  const sunX = W * 0.86, sunY = H * 0.16, sunR = W * 0.16;
  const sun = c.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  sun.addColorStop(0, 'rgba(255, 214, 130, 0.55)');
  sun.addColorStop(0.5, 'rgba(255, 120, 90, 0.18)');
  sun.addColorStop(1, 'rgba(255, 120, 90, 0)');
  c.globalCompositeOperation = 'screen';
  c.fillStyle = sun;
  c.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
  c.globalCompositeOperation = 'source-over';

  // Halftone dots, top-left corner, deterministic.
  const rnd = seededRandom(20261119);
  c.fillStyle = 'rgba(255, 255, 255, 0.20)';
  const dotGap = Math.max(10, 14 * s);
  for (let y = dotGap; y < H * 0.22; y += dotGap) {
    for (let x = dotGap; x < W * 0.22; x += dotGap) {
      const r = (1 - y / (H * 0.22)) * 2.4 * s + 0.6;
      if (rnd() > 0.25) {
        c.beginPath();
        c.arc(x, y, Math.max(0.7, r), 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  // Vignette.
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(8,2,16,0.42)');
  c.fillStyle = vg;
  c.fillRect(0, 0, W, H);

  // Film grain, deterministic.
  const grainCount = Math.round((W * H) / 2600);
  c.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < grainCount; i++) {
    const gx = rnd() * W, gy = rnd() * H;
    c.fillRect(gx, gy, 1.4 * s + 0.6, 1.4 * s + 0.6);
  }
  c.fillStyle = 'rgba(0,0,0,0.06)';
  for (let i = 0; i < grainCount / 2; i++) {
    const gx = rnd() * W, gy = rnd() * H;
    c.fillRect(gx, gy, 1.4 * s + 0.6, 1.4 * s + 0.6);
  }

  // Poster furniture: quote bar (top), VOL badge, footer (tagline, billing,
  // COMING SOON, barcode, seal). The footer reserves the bottom 15%.
  const qbH = drawQuoteBar(c, W, H, s);
  drawVolBadge(c, W, H, qbH, s);
  const footerH = drawFooter(c, W, H, s);

  // Chrome title + neon subtitle, centred, positioned clear of the furniture.
  const pad = Math.round(W * 0.045);
  let titleSize = Math.round(W * 0.15 * state.titleScale);
  const spacing = state.letterSpacing * s;
  c.font = `${titleSize}px Anton, sans-serif`;
  const maxTitleW = W - pad * 2;
  const tw = spacedWidth(c, state.title.toUpperCase(), spacing);
  if (tw > maxTitleW) titleSize = Math.max(20, Math.round(titleSize * maxTitleW / tw));
  const subSize = Math.round(W * 0.034 * state.titleScale);
  const gapY = Math.round(H * 0.012);
  let titleY, subY;
  if (state.titlePos === 'top') {
    titleY = qbH + H * 0.03 + titleSize;
    subY = titleY + subSize + gapY;
  } else if (state.titlePos === 'center') {
    const blockH = titleSize * 1.05 + subSize + gapY;
    // Slightly above the middle so the subtitle clears the bottom panels'
    // top corners (and their role tags).
    const midY = qbH + (H - footerH - qbH) * 0.42;
    titleY = midY - blockH / 2 + titleSize;
    subY = titleY + subSize + gapY;
  } else {
    subY = H - footerH - H * 0.012;
    titleY = subY - subSize - Math.round(titleSize * 0.10);
  }
  drawChromeTitle(c, W, titleY, titleSize, spacing);
  drawNeonSubtitle(c, W, subY, subSize, Math.max(2, 4 * s));

  // Role tags last, so the quote bar and the title never cover them. Tags on
  // panels that touch the top sit just under the quote bar.
  if (state.furn.showRoleTags) {
    panelRects.forEach((r, idx) => {
      const topY = (r.py < quoteH + 4) ? quoteH + 8 * s : r.py + 10 * s;
      drawRoleTag(c, r.px, topY, s, state.roleTags[idx] || '');
    });
  }
  c.textAlign = 'left';
}

function render() {
  const size = SIZES[state.sizeKey];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(ctx, size.w, size.h);
}

// ---- Export ---------------------------------------------------------------

function exportPNG() {
  return new Promise((resolve, reject) => {
    const size = SIZES[state.sizeKey];
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    const octx = off.getContext('2d');
    drawCover(octx, size.w, size.h);
    off.toBlob((blob) => {
      if (!blob) return reject(new Error('PNG export failed'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vice-cover-${state.sizeKey}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve({ bytes: blob.size, width: size.w, height: size.h });
    }, 'image/png');
  });
}

function exportPNGDataURL(sizeKey) {
  const size = SIZES[sizeKey || state.sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off.getContext('2d'), size.w, size.h);
  return { dataUrl: off.toDataURL('image/png'), width: size.w, height: size.h };
}

// JPEG of the current cover, downscaled to fit maxW — used for screenshots.
function exportJPEGDataURL(maxW, quality) {
  const size = SIZES[state.sizeKey];
  const scale = Math.min(1, maxW / size.w);
  const off = document.createElement('canvas');
  off.width = Math.round(size.w * scale);
  off.height = Math.round(size.h * scale);
  const octx = off.getContext('2d');
  octx.drawImage(canvas, 0, 0, off.width, off.height);
  return { dataUrl: off.toDataURL('image/jpeg', quality), width: off.width, height: off.height };
}

// ---- UI -------------------------------------------------------------------

const $ = (id) => document.getElementById(id);

function buildLayoutButtons() {
  const grid = $('layoutGrid');
  grid.innerHTML = '';
  LAYOUTS.forEach((layout) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-btn' + (layout.id === state.layoutId ? ' active' : '');
    btn.dataset.layout = layout.id;
    const rects = layout.panels.map((p) => {
      const x = (p.x * 60).toFixed(1), y = (p.y * 40).toFixed(1);
      const w = (p.w * 60 - 1).toFixed(1), h = (p.h * 40 - 1).toFixed(1);
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="#8b5cf6" stroke="#ffd166" stroke-width="0.8"/>`;
    }).join('');
    btn.innerHTML = `<svg viewBox="0 0 60 40" aria-hidden="true">${rects}</svg><span>${layout.name}</span>`;
    btn.addEventListener('click', () => {
      const oldPhotos = state.panels.map((p) => p.photo);
      state.layoutId = layout.id;
      state.panels = defaultPanels(layout.panels.length);
      state.panels.forEach((p, i) => { p.photo = oldPhotos[i] != null ? oldPhotos[i] : (state.photos.length ? 0 : null); });
      state.selected = 0;
      buildLayoutButtons();
      refreshPanelTools();
      render();
    });
    grid.appendChild(btn);
  });
}

function buildGradeChips() {
  const row = $('gradeRow');
  row.innerHTML = '';
  GRADES.forEach((grade) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (grade.id === state.gradeId ? ' active' : '');
    chip.textContent = grade.name;
    chip.addEventListener('click', () => {
      state.gradeId = grade.id;
      buildGradeChips();
      render();
    });
    row.appendChild(chip);
  });
}

function refreshPhotoUI() {
  const strip = $('thumbStrip');
  strip.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = photo.img.src;
    img.alt = photo.name;
    img.title = photo.name + ' — click to put it in the selected panel';
    img.addEventListener('click', () => {
      state.panels[state.selected].photo = i;
      refreshPanelTools();
      render();
    });
    strip.appendChild(img);
  });
  refreshPanelTools();
}

function locIndex() {
  // Location captions belong to the small panels (idx > 0) of Location grid.
  return Math.max(0, state.selected - 1);
}

function refreshPanelTools() {
  const layout = currentLayout();
  const panel = state.panels[state.selected];
  $('selPanelName').textContent = `Panel ${state.selected + 1} of ${layout.panels.length}`;
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  const noneOpt = document.createElement('option');
  noneOpt.value = '';
  noneOpt.textContent = '— empty panel —';
  sel.appendChild(noneOpt);
  state.photos.forEach((photo, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = photo.name;
    sel.appendChild(opt);
  });
  sel.value = panel.photo != null ? String(panel.photo) : '';
  $('panelZoom').value = Math.round(panel.zoom * 100);
  $('zoomOut').textContent = Math.round(panel.zoom * 100) + '%';
  $('panelPanX').value = panel.panX;
  $('panXOut').textContent = String(panel.panX);
  $('panelPanY').value = panel.panY;
  $('panYOut').textContent = String(panel.panY);
  $('panelFilter').value = panel.filter;
  $('roleTagText').value = state.roleTags[state.selected] || '';
  const loc = state.locations[locIndex()] || { place: '', time: '', note: '' };
  $('locPlace').value = loc.place;
  $('locTime').value = loc.time;
  $('locNote').value = loc.note;
}

// Sync every editor input from state (reset + test hook).
function syncInputs() {
  $('titleText').value = state.title;
  $('subText').value = state.subtitle;
  $('chromeStyle').value = state.chrome;
  $('titleSize').value = Math.round(state.titleScale * 100);
  $('titleSizeOut').textContent = Math.round(state.titleScale * 100) + '%';
  $('letterSpacing').value = state.letterSpacing;
  $('letterSpacingOut').textContent = state.letterSpacing + ' px';
  $('titlePos').value = state.titlePos;
  $('slantCheck').checked = state.slanted;
  $('gradeStrength').value = Math.round(state.gradeStrength * 100);
  $('gradeStrengthOut').textContent = Math.round(state.gradeStrength * 100) + '%';
  $('furnQuote').value = state.furn.quote;
  $('furnSource').value = state.furn.source;
  $('furnVol').value = state.furn.vol;
  $('furnTagline').value = state.furn.tagline;
  $('furnBilling').value = state.furn.billing;
  $('furnQuoteChk').checked = state.furn.showQuote;
  $('furnVolChk').checked = state.furn.showVol;
  $('furnSealChk').checked = state.furn.showSeal;
  $('furnBarcodeChk').checked = state.furn.showBarcode;
  $('furnBillingChk').checked = state.furn.showBilling;
  $('furnTaglineChk').checked = state.furn.showTagline;
  $('furnSoonChk').checked = state.furn.showComingSoon;
  $('roleTagsChk').checked = state.furn.showRoleTags;
}

function bindControls() {
  document.querySelectorAll('.size-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.size === state.sizeKey);
    chip.addEventListener('click', () => {
      state.sizeKey = chip.dataset.size;
      document.querySelectorAll('.size-chip').forEach((c) => c.classList.toggle('active', c === chip));
      $('sizeNote').textContent = SIZES[state.sizeKey].note;
      render();
    });
  });

  $('gradeStrength').addEventListener('input', (e) => {
    state.gradeStrength = Number(e.target.value) / 100;
    $('gradeStrengthOut').textContent = e.target.value + '%';
    render();
  });

  $('fileInput').addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    let pending = files.length;
    if (!pending) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        loadImage(reader.result).then((img) => {
          state.photos.push({ name: file.name.replace(/\.[^.]+$/, ''), img });
          if (state.panels.every((p) => p.photo == null)) {
            state.panels.forEach((p) => { p.photo = state.photos.length - 1; });
          }
          refreshPhotoUI();
          render();
        }).catch(() => console.warn('could not read', file.name));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  });

  $('btnSample').addEventListener('click', loadSamples);
  $('btnSample2').addEventListener('click', loadSamples);

  $('btnReset').addEventListener('click', () => {
    state.layoutId = 'hero-side';
    state.gradeId = 'sunset';
    state.gradeStrength = 0.7;
    state.title = 'VICE HEAT';
    state.subtitle = 'one last drive down the coast';
    state.titleScale = 1.0;
    state.letterSpacing = 6;
    state.chrome = 'sunset';
    state.titlePos = 'bottom';
    state.slanted = false;
    state.roleTags = DEFAULT_ROLE_TAGS.slice();
    state.locations = DEFAULT_LOCATIONS.map((o) => ({ ...o }));
    Object.assign(state.furn, {
      quote: 'EVERY FRAME FEELS LIKE THE LAST DAY OF SUMMER',
      source: 'THE COASTLINE REVIEW',
      vol: 'VOL. 01',
      tagline: 'THREE CARS · ONE SUNSET · NO TURNING BACK',
      billing: 'A GOLDEN HOUR PICTURES PRODUCTION · STARRING YOUR CREW · SHOT ON YOUR OWN PHONE · GRADED BY HAND',
      showQuote: true, showVol: true, showSeal: true, showBarcode: true,
      showBilling: true, showTagline: true, showComingSoon: true, showRoleTags: true,
    });
    state.panels = defaultPanels(currentLayout().panels.length);
    state.selected = 0;
    syncInputs();
    buildLayoutButtons();
    buildGradeChips();
    refreshPanelTools();
    render();
  });

  $('panelPhoto').addEventListener('change', (e) => {
    state.panels[state.selected].photo = e.target.value === '' ? null : Number(e.target.value);
    render();
  });
  $('panelZoom').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = Number(e.target.value) / 100;
    $('zoomOut').textContent = e.target.value + '%';
    render();
  });
  $('panelPanX').addEventListener('input', (e) => {
    state.panels[state.selected].panX = Number(e.target.value);
    $('panXOut').textContent = e.target.value;
    render();
  });
  $('panelPanY').addEventListener('input', (e) => {
    state.panels[state.selected].panY = Number(e.target.value);
    $('panYOut').textContent = e.target.value;
    render();
  });
  $('panelFilter').addEventListener('change', (e) => {
    state.panels[state.selected].filter = e.target.value;
    render();
  });
  $('btnFillAll').addEventListener('click', () => {
    const photo = state.panels[state.selected].photo;
    if (photo == null) return;
    state.panels.forEach((p) => { p.photo = photo; });
    render();
  });

  $('titleText').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  $('subText').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('chromeStyle').addEventListener('change', (e) => { state.chrome = e.target.value; render(); });
  $('titleSize').addEventListener('input', (e) => {
    state.titleScale = Number(e.target.value) / 100;
    $('titleSizeOut').textContent = e.target.value + '%';
    render();
  });
  $('letterSpacing').addEventListener('input', (e) => {
    state.letterSpacing = Number(e.target.value);
    $('letterSpacingOut').textContent = e.target.value + ' px';
    render();
  });
  $('titlePos').addEventListener('change', (e) => { state.titlePos = e.target.value; render(); });
  $('slantCheck').addEventListener('change', (e) => { state.slanted = e.target.checked; render(); });

  $('roleTagText').addEventListener('input', (e) => {
    state.roleTags[state.selected] = e.target.value.toUpperCase();
    render();
  });
  $('roleTagsChk').addEventListener('change', (e) => { state.furn.showRoleTags = e.target.checked; render(); });
  const locInput = (id, key) => $(id).addEventListener('input', (e) => {
    state.locations[locIndex()][key] = e.target.value.toUpperCase();
    render();
  });
  locInput('locPlace', 'place');
  locInput('locTime', 'time');
  locInput('locNote', 'note');

  const furnText = (id, key) => $(id).addEventListener('input', (e) => {
    state.furn[key] = key === 'quote' || key === 'source' || key === 'vol' || key === 'tagline'
      ? e.target.value.toUpperCase()
      : e.target.value;
    render();
  });
  furnText('furnQuote', 'quote');
  furnText('furnSource', 'source');
  furnText('furnVol', 'vol');
  furnText('furnTagline', 'tagline');
  furnText('furnBilling', 'billing');
  const furnChk = (id, key) => $(id).addEventListener('change', (e) => {
    state.furn[key] = e.target.checked;
    render();
  });
  furnChk('furnQuoteChk', 'showQuote');
  furnChk('furnVolChk', 'showVol');
  furnChk('furnSealChk', 'showSeal');
  furnChk('furnBarcodeChk', 'showBarcode');
  furnChk('furnBillingChk', 'showBilling');
  furnChk('furnTaglineChk', 'showTagline');
  furnChk('furnSoonChk', 'showComingSoon');

  $('btnExport').addEventListener('click', () => exportPNG().catch(console.error));
  $('btnExport2').addEventListener('click', () => exportPNG().catch(console.error));

  // Canvas interaction: click selects a panel, drag pans it, wheel zooms it.
  let drag = null;
  function panelAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    const layout = currentLayout();
    for (let i = layout.panels.length - 1; i >= 0; i--) {
      const p = layout.panels[i];
      if (x >= p.x * canvas.width && x < (p.x + p.w) * canvas.width &&
          y >= p.y * canvas.height && y < (p.y + p.h) * canvas.height) {
        return i;
      }
    }
    return 0;
  }
  canvas.addEventListener('pointerdown', (e) => {
    const idx = panelAt(e.clientX, e.clientY);
    state.selected = idx;
    refreshPanelTools();
    render();
    drag = { x: e.clientX, y: e.clientY, panX: state.panels[idx].panX, panY: state.panels[idx].panY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const panel = currentLayout().panels[state.selected];
    const pw = panel.w * rect.width, ph = panel.h * rect.height;
    state.panels[state.selected].panX = Math.max(-100, Math.min(100, drag.panX + ((e.clientX - drag.x) / pw) * 200));
    state.panels[state.selected].panY = Math.max(-100, Math.min(100, drag.panY + ((e.clientY - drag.y) / ph) * 200));
    refreshPanelTools();
    render();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[state.selected];
    panel.zoom = Math.max(1, Math.min(3, panel.zoom - Math.sign(e.deltaY) * 0.1));
    refreshPanelTools();
    render();
  }, { passive: false });
}

// ---- Boot -----------------------------------------------------------------

state.panels = defaultPanels(currentLayout().panels.length);
buildLayoutButtons();
buildGradeChips();
bindControls();
refreshPanelTools();
render();
loadSamples().then(() => {
  // Re-render once the display fonts are ready so lettering is exact.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => render());
  }
});

// Test hook for the screenshot driver (not part of the UI).
window.__viceCover = {
  state,
  LAYOUTS,
  GRADES,
  SIZES,
  render,
  exportPNGDataURL,
  exportJPEGDataURL,
  loadSamples,
  setLayout(id) {
    const btn = document.querySelector(`.layout-btn[data-layout="${id}"]`);
    if (btn) btn.click();
  },
  setGrade(id) {
    state.gradeId = id;
    buildGradeChips();
    render();
  },
  setSize(key) {
    const chip = document.querySelector(`.size-chip[data-size="${key}"]`);
    if (chip) chip.click();
  },
  setTitle(t, s) {
    if (t != null) { state.title = t; $('titleText').value = t; }
    if (s != null) { state.subtitle = s; $('subText').value = s; }
    render();
  },
  applyState(patch) {
    if (!patch) return;
    for (const k of Object.keys(patch)) {
      if (k === 'furn') Object.assign(state.furn, patch.furn);
      else if (k === 'roleTags') state.roleTags = patch.roleTags.slice();
      else if (k === 'locations') state.locations = patch.locations.map((o) => ({ ...o }));
      else state[k] = patch[k];
    }
    if (patch.layoutId) {
      state.panels = defaultPanels(currentLayout().panels.length);
      state.panels.forEach((p, i) => { p.photo = Math.min(i, state.photos.length - 1); });
      state.selected = 0;
    }
    syncInputs();
    buildLayoutButtons();
    buildGradeChips();
    refreshPanelTools();
    render();
  },
};
