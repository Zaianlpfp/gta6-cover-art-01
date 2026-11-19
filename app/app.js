// VICE COVER — GTA-style multi-panel cover art maker.
// All state lives in this one module. Photos are read on the user's machine
// (FileReader / bundled samples) and never uploaded anywhere.

const canvas = document.getElementById('coverCanvas');
const ctx = canvas.getContext('2d');

const SAMPLE_PHOTOS = [
  { name: 'Boulevard sunset', src: 'samples/boulevard.jpg' },
  { name: 'Golden-hour convertible', src: 'samples/convertible.jpg' },
  { name: 'Neon street couple', src: 'samples/neon-couple.jpg' },
];

// Four poster layouts. Each panel is a fraction rect [x, y, w, h] of the cover.
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
];

// Three Vice City colour grades. Each tints the photos and the whole cover.
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
];

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

const state = {
  layoutId: 'hero-side',
  gradeId: 'sunset',
  gradeStrength: 0.7,
  sizeKey: '1920x1080',
  title: 'VICE CITY',
  subtitle: 'one summer. no rules.',
  titleScale: 1.0,
  letterSpacing: 6,
  titleColor: '#ffd166',
  titleOutline: 'black',
  titlePos: 'bottom',
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

// Deterministic pseudo-random generator (fixed seed) for grain + halftone,
// so every render of the same cover is pixel-identical.
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

function drawSpacedText(c, text, cx, y, spacing) {
  // Draws centred text with manual letter spacing, returns total width.
  const chars = Array.from(text);
  const widths = chars.map((ch) => c.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
  let x = cx - total / 2;
  chars.forEach((ch, i) => {
    c.fillText(ch, x, y);
    if (c.strokeText && c.lineWidth > 0) c.strokeText(ch, x, y);
    x += widths[i] + spacing;
  });
  return total;
}

function drawCover(c, W, H) {
  const layout = currentLayout();
  const grade = currentGrade();
  const gap = Math.max(4, Math.round(W * 0.006));
  const s = W / 1920; // scale factor for strokes / text

  c.clearRect(0, 0, W, H);
  c.fillStyle = '#120a1c';
  c.fillRect(0, 0, W, H);

  // Panels: photo, grade wash, comic-book border.
  layout.panels.forEach((panel, idx) => {
    const px = panel.x * W + gap / 2;
    const py = panel.y * H + gap / 2;
    const pw = panel.w * W - gap;
    const ph = panel.h * H - gap;
    const ps = state.panels[idx] || { photo: null, zoom: 1, panX: 0, panY: 0, filter: 'none' };

    c.save();
    c.beginPath();
    c.rect(px, py, pw, ph);
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

    // Panel border: white comic edge + dark keyline.
    c.lineWidth = Math.max(3, 5 * s);
    c.strokeStyle = '#ffffff';
    c.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    c.lineWidth = Math.max(2, 2.5 * s);
    c.strokeStyle = 'rgba(10,5,18,0.85)';
    c.strokeRect(px + 5 * s, py + 5 * s, pw - 10 * s, ph - 10 * s);
    c.restore();

    // Selected-panel marker in the live preview only.
    if (c === ctx && idx === state.selected) {
      c.save();
      c.lineWidth = Math.max(3, 4 * s);
      c.strokeStyle = '#37e0d8';
      c.setLineDash([14 * s, 8 * s]);
      c.strokeRect(px - 3, py - 3, pw + 6, ph + 6);
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

  // Caption: big condensed title + subtitle.
  const pad = Math.round(W * 0.045);
  const titleSize = Math.round(W * 0.115 * state.titleScale);
  const subSize = Math.round(W * 0.032 * state.titleScale);
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = Math.round(10 * s);
  c.shadowOffsetY = Math.round(5 * s);
  const titleY = state.titlePos === 'top'
    ? pad + titleSize
    : H - pad - subSize - Math.round(10 * s);
  const subY = state.titlePos === 'top'
    ? titleY + subSize + Math.round(12 * s)
    : H - pad;

  c.font = `${titleSize}px "Bebas Neue", "Anton", sans-serif`;
  c.fillStyle = state.titleColor;
  if (state.titleOutline !== 'none') {
    c.strokeStyle = state.titleOutline === 'white' ? '#ffffff' : '#0a0512';
    c.lineWidth = Math.max(3, titleSize * 0.09);
    c.lineJoin = 'round';
  } else {
    c.lineWidth = 0;
  }
  // Left-aligned spaced text: draw from the left pad.
  const titleChars = Array.from(state.title.toUpperCase());
  {
    const widths = titleChars.map((ch) => c.measureText(ch).width);
    let x = pad;
    titleChars.forEach((ch, i) => {
      c.fillText(ch, x, titleY);
      if (state.titleOutline !== 'none') c.strokeText(ch, x, titleY);
      x += widths[i] + state.letterSpacing * s;
    });
  }

  c.shadowBlur = Math.round(6 * s);
  c.shadowOffsetY = Math.round(3 * s);
  c.font = `${subSize}px "Anton", "Bebas Neue", sans-serif`;
  c.fillStyle = '#ffffff';
  c.lineWidth = Math.max(2, subSize * 0.12);
  c.strokeStyle = 'rgba(10,5,18,0.9)';
  c.lineJoin = 'round';
  {
    const subChars = Array.from(state.subtitle);
    const widths = subChars.map((ch) => c.measureText(ch).width);
    let x = pad;
    subChars.forEach((ch, i) => {
      c.fillText(ch, x, subY);
      c.strokeText(ch, x, subY);
      x += widths[i] + 1.5 * s;
    });
  }
  c.shadowColor = 'transparent';
  c.shadowBlur = 0;
  c.shadowOffsetY = 0;

  // Small app mark, bottom-right.
  c.font = `${Math.round(15 * s + 8)}px "Anton", sans-serif`;
  c.textAlign = 'right';
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.fillText('VICE COVER', W - pad, H - pad * 0.55);
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
    state.title = 'VICE CITY';
    state.subtitle = 'one summer. no rules.';
    state.titleScale = 1.0;
    state.letterSpacing = 6;
    state.titleColor = '#ffd166';
    state.titleOutline = 'black';
    state.titlePos = 'bottom';
    state.panels = defaultPanels(currentLayout().panels.length);
    state.selected = 0;
    $('titleText').value = state.title;
    $('subText').value = state.subtitle;
    $('titleSize').value = 100;
    $('titleSizeOut').textContent = '100%';
    $('letterSpacing').value = 6;
    $('letterSpacingOut').textContent = '6 px';
    $('titleColor').value = state.titleColor;
    $('titleOutline').value = 'black';
    $('titlePos').value = 'bottom';
    $('gradeStrength').value = 70;
    $('gradeStrengthOut').textContent = '70%';
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
  $('titleColor').addEventListener('input', (e) => { state.titleColor = e.target.value; render(); });
  $('titleOutline').addEventListener('change', (e) => { state.titleOutline = e.target.value; render(); });
  $('titlePos').addEventListener('change', (e) => { state.titlePos = e.target.value; render(); });

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
};
