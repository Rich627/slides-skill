#!/usr/bin/env node
/*
 * build_deck.js — render a `slides` JSON spec to .pptx with pptxgenjs.
 *
 *   node build_deck.js spec.json out.pptx
 *
 * Design tokens, chrome (kicker chip, section label, logo, title, subtitle,
 * footer, page number) and every slide pattern live here so the spec only
 * carries content. See ../SKILL.md and ../references/.
 */
'use strict';
const fs = require('fs');
const path = require('path');

let pptxgen;
try {
  pptxgen = require('pptxgenjs');
} catch (e) {
  console.error('pptxgenjs not found. Run once:  npm install --prefix ' + path.resolve(__dirname, '..'));
  process.exit(2);
}

const [specPath, outPath] = process.argv.slice(2);
if (!specPath || !outPath) {
  console.error('usage: node build_deck.js spec.json out.pptx');
  process.exit(1);
}
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const specDir = path.dirname(path.resolve(specPath));

// ---------- theme ----------
const BASE = {
  ink: '191919',      // dark backgrounds, primary text
  muted: '555555',    // secondary text, footer
  accent: 'FFC627',   // chips, arrows, edges, rules
  onAccent: '191919', // text placed on the accent colour
  panel: 'F5F5F2',    // light card fill
  rule: 'D5D5D0',     // hairlines
  callout: 'FFF4CD',  // takeaway bar fill
  white: 'FFFFFF',
  link: '2A5DB0',
  font: 'Calibri',
};
const PRESETS = {
  gold:   {},
  navy:   { accent: '1F3A93', onAccent: 'FFFFFF', callout: 'E8EDF8', panel: 'F4F5F8', link: '1F3A93' },
  forest: { accent: '2E7D4F', onAccent: 'FFFFFF', callout: 'E6F2EA', panel: 'F3F6F3', link: '2E7D4F' },
  coral:  { accent: 'E4573D', onAccent: 'FFFFFF', callout: 'FBE9E4', panel: 'F7F4F2', link: 'C2432B' },
  violet: { accent: '6A4C93', onAccent: 'FFFFFF', callout: 'EEE8F5', panel: 'F5F3F7', link: '6A4C93' },
  sky:    { accent: '1E88E5', onAccent: 'FFFFFF', callout: 'E3F1FC', panel: 'F2F6FA', link: '1E6FBF' },
  mono:   { accent: '191919', onAccent: 'FFFFFF', callout: 'ECECEC', panel: 'F5F5F5', link: '191919' },
};
let themeIn = spec.theme || 'gold';
if (typeof themeIn === 'string') themeIn = { preset: themeIn };
if (themeIn.preset && !PRESETS[themeIn.preset]) {
  console.error(`unknown theme preset "${themeIn.preset}"; use one of ${Object.keys(PRESETS).join(', ')}`);
  process.exit(1);
}
const T = Object.assign({}, BASE, PRESETS[themeIn.preset || 'gold'], themeIn);
delete T.preset;

const W = 13.333, H = 7.5, M = 0.5, CW = 12.333; // wide 16:9, 0.5in side margins
const brand = Object.assign({ kicker: '', logo: null, logoBox: true }, spec.brand || {});  // logoBox: white plate behind the logo on dark slides
const logoPath = brand.logo ? path.resolve(specDir, brand.logo) : null;
if (logoPath && !fs.existsSync(logoPath)) {
  console.error('warning: brand.logo not found: ' + logoPath + ' (continuing without logo)');
}
const resolveImg = (p) => {
  if (!p) return null;
  const abs = path.resolve(specDir, p);
  if (!fs.existsSync(abs)) { warnings.push(`slide ${currentSlideNo}: image not found: ${abs}`); return null; }
  return abs;
};

const warnings = [];
let currentSlideNo = 0;
let sectionCount = 0;

// ---------- helpers ----------
// "**bold**" inline markup + "\n" line breaks -> pptxgenjs runs
function runs(str, base) {
  const lines = String(str).split('\n');
  const out = [];
  lines.forEach((line, li) => {
    const parts = line.split('**');
    parts.forEach((seg, pi) => {
      if (seg === '' && parts.length > 1) return;
      out.push({ text: seg, options: Object.assign({}, base, { bold: !!base.bold || pi % 2 === 1 }) });
    });
    if (li < lines.length - 1) {
      if (out.length) out[out.length - 1].options = Object.assign({}, out[out.length - 1].options, { breakLine: true });
      else out.push({ text: '', options: Object.assign({}, base, { breakLine: true }) });
    }
  });
  if (!out.length) out.push({ text: '', options: base });
  return out;
}

function estimateOverflow(str, w, h, fontSize, label) {
  const plain = String(str).replace(/\*\*/g, '');
  // width in em units: CJK / fullwidth glyphs ≈ 1.0 em, Latin ≈ 0.43 em (Calibri average)
  const emWidth = (l) => Array.from(l).reduce((a, ch) => a + (/[\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFFEF]/.test(ch) ? 1.0 : 0.43), 0);
  const lineEm = w / (fontSize / 72);
  let lines = 0;
  plain.split('\n').forEach(l => { lines += Math.max(1, Math.ceil(emWidth(l) / lineEm)); });
  const need = lines * fontSize / 72 * 1.15;
  if (need > h + 0.1) {
    warnings.push(`slide ${currentSlideNo}: possible overflow in ${label} (${lines} lines @${fontSize}pt need ${need.toFixed(2)}in, box ${h.toFixed(2)}in): "${plain.slice(0, 60)}"`);
  }
}

function txt(slide, str, x, y, w, h, o) {
  if (str === undefined || str === null || str === '') return;
  const base = {
    fontFace: T.font,
    fontSize: o.size || 18,
    color: o.color || T.ink,
    bold: !!o.bold,
    italic: !!o.italic,
    underline: o.underline ? { style: 'sng' } : undefined,
  };
  estimateOverflow(str, w, h, base.fontSize, o.label || 'text');
  slide.addText(runs(str, base), {
    x, y, w, h, margin: 0,
    align: o.align || 'left',
    valign: o.valign || 'middle',
    fill: o.fill ? { color: o.fill } : undefined,
    hyperlink: o.url ? { url: o.url } : undefined,
    paraSpaceAfter: o.paraAfter || 0,
    lineSpacingMultiple: o.lineMult || 1.0,
  });
}

function rect(slide, x, y, w, h, fill, shape) {
  slide.addShape(shape || 'rect', { x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 } });
}

// Read pixel dimensions from a PNG / JPEG / GIF header so we can fit images ourselves
// (LibreOffice does not honour pptxgenjs "contain" sizing; PowerPoint does, but a real
// box is safer everywhere).
function imgSize(abs) {
  try {
    const fd = fs.openSync(abs, 'r');
    const buf = Buffer.alloc(64 * 1024);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    if (buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    if (buf[0] === 0x47 && buf[1] === 0x49) return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
    if (buf[0] === 0xFF && buf[1] === 0xD8) {
      let i = 2;
      while (i < n) {
        if (buf[i] !== 0xFF) { i++; continue; }
        const m = buf[i + 1];
        if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  } catch (e) { /* fall through */ }
  return null;
}

// Fit an image into a box. contain (default): letterbox, centred; cover: crop via pptxgenjs sizing.
function image(slide, p, x, y, w, h, fit, align) {
  const abs = resolveImg(p);
  if (!abs) { rect(slide, x, y, w, h, T.panel); txt(slide, 'image missing', x, y, w, h, { size: 14, color: T.muted, align: 'center' }); return; }
  if (fit === 'cover') { slide.addImage({ path: abs, x, y, w, h, sizing: { type: 'cover', w, h } }); return; }
  const dim = imgSize(abs);
  if (!dim || !dim.w || !dim.h) { slide.addImage({ path: abs, x, y, w, h }); return; }
  const scale = Math.min(w / dim.w, h / dim.h);
  const fw = dim.w * scale, fh = dim.h * scale;
  const fx = align === 'left' ? x : align === 'right' ? x + w - fw : x + (w - fw) / 2;
  const fy = align === 'top' ? y : y + (h - fh) / 2;
  slide.addImage({ path: abs, x: fx, y: fy, w: fw, h: fh });
}

// small accent chip with 12pt bold uppercase label (auto width)
function chip(slide, text, x, y, o) {
  if (text === undefined || text === null || text === '') return 0;
  o = o || {};
  const s = String(text);
  const cjk = Array.from(s).filter(ch => /[\u2E80-\u9FFF\uFF00-\uFFEF]/.test(ch)).length;
  const w = o.w || Math.max(0.44, 0.2 + 0.115 * (s.length - cjk) + 0.2 * cjk);
  rect(slide, x, y, w, 0.31, o.fill || T.accent);
  txt(slide, s, x + 0.1, y, w - 0.2, 0.31, { size: 12, bold: true, color: o.color || T.onAccent, label: 'chip' });
  return w;
}

function logo(slide, x, y, w, h, align) {
  if (!logoPath || !fs.existsSync(logoPath)) return;
  image(slide, brand.logo, x, y, w, h, 'contain', align || 'right');
}

function callout(slide, text, y, o) {
  if (!text) return;
  o = o || {};
  y = y === undefined ? 6.5 : y;
  rect(slide, M, y, CW, 0.45, o.fill || T.callout);
  rect(slide, M, y, 0.06, 0.45, T.accent);
  txt(slide, text, M + 0.19, y + 0.02, CW - 0.39, 0.41, { size: 16.5, bold: true, color: T.ink, label: 'callout' });
}

// Optional one-line remark above the callout: string or {text, muted:true}
function note(slide, n, y) {
  if (!n) return;
  const muted = typeof n === 'object' && n.muted;
  const text = typeof n === 'object' ? n.text : n;
  txt(slide, text, M, y, CW, 0.45, { size: muted ? 15.75 : 17.25, color: muted ? T.muted : T.ink, label: 'note' });
}

function pageNo() { return String(currentSlideNo).padStart(2, '0'); }

function footer(slide, s, dark) {
  const c = dark ? T.white : T.muted;
  if (!dark) rect(slide, M, 7.07, CW, 0.01, T.rule);
  txt(slide, s.source || spec.footer || '', M, 7.15, 11.72, 0.23, { size: 10.5, color: c, label: 'source' });
  txt(slide, pageNo(), 12.34, 7.12, 0.49, 0.25, { size: 12, color: c, align: 'right' });
}

// Standard light chrome: chip, section label, logo, title, subtitle, footer
function chrome(slide, s) {
  slide.background = { color: T.white };
  const cw = chip(slide, brand.kicker, M, 0.25);
  const lx = cw ? M + cw + 0.23 : M;
  txt(slide, (s.section || spec.section || '').toUpperCase(), lx, 0.25, 8.33, 0.31, { size: 12, color: T.muted });
  logo(slide, 11.08, 0.18, 1.43, 0.56);
  txt(slide, s.title, M, 0.75, CW, 0.58, { size: 27, bold: true, label: 'title' });
  txt(slide, s.subtitle, M, 1.39, CW, 0.42, { size: 15.75, color: T.muted, label: 'subtitle' });
  footer(slide, s, false);
}

// Bottom stack: optional note above the callout. Returns the y where content must end.
function bottomStack(slide, s) {
  const hasCallout = !!s.callout;
  const hasNote = !!s.note;
  if (hasCallout) callout(slide, s.callout, 6.5);
  if (hasNote) note(slide, s.note, hasCallout ? 5.91 : 6.3);
  if (hasNote) return hasCallout ? 5.72 : 6.1;
  return hasCallout ? 6.3 : 6.85;
}

function columns(n, gap, x0, total) {
  gap = gap === undefined ? 0.17 : gap;
  x0 = x0 === undefined ? M : x0;
  total = total === undefined ? CW : total;
  const w = (total - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (w + gap), w }));
}

// Content top after chrome (lower when there is no subtitle)
const contentTop = (s) => (s.subtitle ? 2.05 : 1.7);

// ---------- slide types ----------
const types = {};

// dark opening slide
types.cover = (slide, s) => {
  slide.background = { color: T.ink };
  chip(slide, brand.kicker, M, 0.44);
  const f = s.footer || {};
  const hasBand = f.org || f.line || f.meta || logoPath;
  txt(slide, s.title, M, 1.23, 7.5, 0.88, { size: 40.5, bold: true, color: T.white, label: 'title' });
  txt(slide, s.subtitle, M, 2.29, 6.5, 1.15, { size: 27, bold: true, color: T.white, label: 'subtitle' });
  txt(slide, s.body, M, 3.82, 6.5, 0.96, { size: 18.75, color: T.white, label: 'body' });
  rect(slide, M, 5.18, 5.98, 0.03, T.accent);
  if (s.milestone) {
    const label = s.milestone.label || 'Next milestone';
    txt(slide, `${label}\n${s.milestone.text}`, M, 5.45, 6.5, 0.75, { size: 18.75, bold: true, color: T.white, label: 'milestone' });
  } else if (s.byline) {
    txt(slide, s.byline, M, 5.45, 6.5, 0.75, { size: 18.75, bold: true, color: T.white, label: 'byline' });
  }
  if (s.image) image(slide, s.image, 7.6, 1.0, 5.2, 5.0, s.fit, 'right');
  if (hasBand) {
    rect(slide, 0, 6.5, W, 1.0, T.white);
    logo(slide, 0.73, 6.67, 1.51, 0.59, 'left');
    const tx = logoPath ? 2.8 : 0.73;
    txt(slide, f.org, tx, 6.64, 5.62, 0.34, { size: 18, bold: true, color: T.ink });
    txt(slide, f.line, tx, 7.05, 5.68, 0.26, { size: 13.5, color: T.muted });
    txt(slide, f.meta, 8.92, 6.69, 3.92, 0.64, { size: 12.75, color: T.muted, label: 'footer meta' });
  } else {
    txt(slide, s.date, M, 6.7, 8, 0.3, { size: 13.5, color: 'BBBBBB' });
  }
};

// dark section divider: big number + title
types.section = (slide, s) => {
  slide.background = { color: T.ink };
  chip(slide, brand.kicker, M, 0.44);
  sectionCount += 1;
  const n = s.number || String(sectionCount).padStart(2, '0');
  txt(slide, n, M, 1.6, 4, 1.4, { size: 84, bold: true, color: T.accent });
  rect(slide, M, 3.25, 1.5, 0.05, T.accent);
  txt(slide, s.title, M, 3.55, 10, 1.0, { size: 40.5, bold: true, color: T.white, label: 'title' });
  txt(slide, s.subtitle, M, 4.65, 9, 0.9, { size: 18.75, color: 'DDDDDD', valign: 'top', label: 'subtitle' });
  txt(slide, pageNo(), 12.34, 7.12, 0.49, 0.25, { size: 12, color: T.white, align: 'right' });
};

// 2-4 numbered panel cards: heading / body / emphasis (bold), optional divider between body and emphasis
types.cards = (slide, s) => {
  chrome(slide, s);
  const bottom = bottomStack(slide, s);
  const y = contentTop(s), h = bottom - 0.12 - y;
  const cols = columns(s.cards.length);
  s.cards.forEach((c, i) => {
    const { x, w } = cols[i];
    rect(slide, x, y, w, h, T.panel);
    let cy = y + 0.17;
    if (c.image) { image(slide, c.image, x + 0.19, cy, w - 0.38, 1.5, c.fit || 'cover'); cy += 1.65; }
    else if (s.numbering !== 'none') {
      const n = s.numbering === '01' ? String(i + 1).padStart(2, '0') : String(i + 1);
      chip(slide, c.number || n, x + 0.19, cy);
      cy += 0.56;
    }
    txt(slide, c.heading, x + 0.19, cy, w - 0.38, 0.48, { size: 21.75, bold: true, label: 'card heading' });
    cy += 0.6;
    const bodyH = c.emphasis ? 0.95 : (y + h - cy - 0.2);
    txt(slide, c.body, x + 0.19, cy, w - 0.38, bodyH, { size: 18, valign: 'top', label: 'card body' });
    if (c.emphasis) {
      cy += bodyH + 0.1;
      if (s.divider) { rect(slide, x + 0.19, cy, w - 0.38, 0.02, T.rule); cy += 0.12; }
      txt(slide, c.emphasis, x + 0.19, cy, w - 0.38, y + h - cy - 0.12, { size: 17.25, bold: true, valign: 'top', label: 'card emphasis' });
    }
  });
};

// 1-2 columns of marked list items (accent tick or number), optional column heading
types.bullets = (slide, s) => {
  chrome(slide, s);
  const bottom = bottomStack(slide, s);
  const colsIn = s.columns || [{ items: s.items || [] }];
  const y0 = contentTop(s);
  const cols = columns(colsIn.length, 0.5);
  colsIn.forEach((col, ci) => {
    const { x, w } = cols[ci];
    let y = y0;
    if (col.heading) { txt(slide, col.heading, x, y, w, 0.45, { size: 21.75, bold: true, label: 'list heading' }); y += 0.6; }
    const n = col.items.length;
    const avail = bottom - y - 0.1;
    const ih = Math.min(1.15, avail / n);
    col.items.forEach((it, i) => {
      const text = typeof it === 'string' ? it : it.text;
      const sub = typeof it === 'string' ? null : it.detail;
      if (s.numbered) chip(slide, String(i + 1).padStart(2, '0'), x, y + 0.08);
      else rect(slide, x, y + 0.2, 0.12, 0.12, T.accent);
      const tx = x + (s.numbered ? 0.65 : 0.32);
      if (sub) {
        txt(slide, text, tx, y, w - (tx - x), 0.45, { size: 18, bold: true, label: 'item' });
        txt(slide, sub, tx, y + 0.42, w - (tx - x), ih - 0.5, { size: 15.75, color: T.muted, valign: 'top', label: 'item detail' });
      } else {
        txt(slide, text, tx, y, w - (tx - x), ih - 0.12, { size: 18, valign: 'top', label: 'item' });
      }
      y += ih;
    });
  });
};

// header row + hairline rows; first column bold
types.table = (slide, s) => {
  chrome(slide, s);
  const bottom = bottomStack(slide, s);
  const n = s.columns.length;
  const widths = s.widths || Array(n).fill(1);
  const sum = widths.reduce((a, b) => a + b, 0);
  const gap = 0.25;
  const usable = CW - gap * (n - 1);
  const xs = []; let x = M;
  widths.forEach(wv => { const w = usable * wv / sum; xs.push({ x, w }); x += w + gap; });
  let y = contentTop(s) - 0.09;
  s.columns.forEach((c, i) => txt(slide, c, xs[i].x, y, xs[i].w, 0.4, { size: 17.25, bold: true, label: 'table header' }));
  y += 0.49;
  rect(slide, M, y, CW, 0.01, T.rule);
  const rowH = Math.min(1.05, (bottom - y - 0.1) / s.rows.length);
  s.rows.forEach((r, ri) => {
    r.forEach((cell, i) => txt(slide, cell, xs[i].x, y + 0.03, xs[i].w, rowH - 0.09, {
      size: i === 0 ? 18 : 15.75, bold: i === 0 && s.first_col_bold !== false, label: `row ${ri + 1} col ${i + 1}`,
    }));
    y += rowH;
    if (ri < s.rows.length - 1) rect(slide, M, y - 0.03, CW, 0.01, T.rule);
  });
};

// big-number panels + dark caveat banner + note lines
types.stats = (slide, s) => {
  chrome(slide, s);
  callout(slide, s.callout, 6.5);
  const y = contentTop(s) + 0.07;
  const limit = (s.callout ? 6.4 : 6.9) - (s.banner ? 0.9 : 0.1);
  const h = s.note ? 2.38 : Math.min(3.4, limit - y);
  const cols = columns(s.stats.length, 0.33);
  s.stats.forEach((st, i) => {
    const { x, w } = cols[i];
    rect(slide, x, y, w, h, T.panel);
    const oy = y + (h - 2.38) / 2;   // centre the value/label/detail block in taller panels
    txt(slide, st.value, x + 0.25, oy + 0.12, w - 0.5, 0.86, { size: s.stats.length > 3 ? 36 : 45, bold: true, label: 'stat value' });
    txt(slide, st.label, x + 0.25, oy + 1.11, w - 0.5, 0.49, { size: 18.75, bold: true, label: 'stat label' });
    txt(slide, st.detail, x + 0.25, oy + 1.73, w - 0.5, 0.55, { size: 15.75, valign: 'top', label: 'stat detail' });
  });
  let cy = y + h + 0.27;
  if (s.banner) {
    rect(slide, M, cy, CW, 0.59, T.ink);
    txt(slide, s.banner, M + 0.2, cy + 0.05, CW - 0.4, 0.49, { size: 19.5, bold: true, color: T.white, label: 'banner' });
    cy += 0.87;
  }
  txt(slide, s.note, M, cy, CW, (s.callout ? 6.4 : 6.9) - cy, { size: 18, valign: 'top', label: 'note' });
};

// left-to-right process boxes joined by accent arrows; optional stacked branches in the last slot,
// then either a dark banner {heading, body} or a bold statement + small cards row
types.flow = (slide, s) => {
  chrome(slide, s);
  const hasCards = s.cards && s.cards.length;
  const bottom = bottomStack(slide, s);
  const y = contentTop(s) + 0.15;
  const rowH = (hasCards || s.statement) ? 1.6 : (s.banner ? 2.39 : Math.min(3.2, bottom - y - 0.2));
  const slots = s.steps.length + (s.branches ? 1 : 0);
  const gap = 0.5;
  const w = (CW - gap * (slots - 1)) / slots;
  const arrow = (x) => slide.addShape('rightArrow', { x, y: y + rowH / 2 - 0.12, w: 0.32, h: 0.23, fill: { color: T.accent }, line: { color: T.accent, width: 0 } });
  s.steps.forEach((st, i) => {
    const x = M + i * (w + gap);
    rect(slide, x, y, w, rowH, T.panel);
    txt(slide, st.heading, x + 0.19, y + 0.18, w - 0.38, 0.45, { size: 19.5, bold: true, label: 'step heading' });
    txt(slide, st.body, x + 0.19, y + 0.72, w - 0.38, rowH - 0.85, { size: 17.25, valign: 'top', label: 'step body' });
    if (i < slots - 1) arrow(x + w + 0.09);
  });
  let rowBottom = y + rowH;
  if (s.branches) {
    const x = M + s.steps.length * (w + gap);
    const extra = (hasCards || s.statement) ? 0.6 : 0;
    const bh = (rowH + extra - 0.12 * (s.branches.length - 1)) / s.branches.length;
    s.branches.forEach((b, i) => {
      const by = y + i * (bh + 0.12);
      rect(slide, x, by, w, bh, T.panel);
      txt(slide, b.heading, x + 0.19, by + 0.1, w - 0.38, 0.34, { size: 17.25, bold: true, label: 'branch heading' });
      txt(slide, b.body, x + 0.19, by + 0.47, w - 0.38, bh - 0.55, { size: 15.75, valign: 'top', label: 'branch body' });
    });
    rowBottom = y + rowH + extra;
  }
  let cy = rowBottom + 0.22;
  if (s.banner) {
    const bh = Math.min(1.31, bottom - cy - 0.1);
    rect(slide, M, cy, CW, bh, T.ink);
    txt(slide, s.banner.heading, M + 0.21, cy + 0.12, CW - 0.42, 0.36, { size: 19.5, bold: true, color: T.white, label: 'banner heading' });
    txt(slide, s.banner.body, M + 0.21, cy + 0.6, CW - 0.42, bh - 0.72, { size: 18, color: T.white, valign: 'top', label: 'banner body' });
    cy += bh + 0.2;
  }
  if (s.statement) {
    txt(slide, s.statement, M, cy, CW, 0.4, { size: 17.25, bold: true, label: 'statement' });
    cy += 0.5;
  }
  if (hasCards) {
    const ch = Math.max(0.9, bottom - cy - 0.1);
    const cols = columns(s.cards.length);
    s.cards.forEach((c, i) => {
      const { x, w: cw } = cols[i];
      rect(slide, x, cy, cw, ch, T.panel);
      txt(slide, c.heading, x + 0.19, cy + 0.1, cw - 0.38, 0.36, { size: 18, bold: true, label: 'small card heading' });
      txt(slide, c.body, x + 0.19, cy + 0.5, cw - 0.38, ch - 0.6, { size: 15.75, valign: 'top', label: 'small card body' });
    });
  }
};

// horizontal timeline / roadmap: 3-6 items with date label, heading, body
types.timeline = (slide, s) => {
  chrome(slide, s);
  const bottom = bottomStack(slide, s);
  const n = s.items.length;
  const cols = columns(n, 0.2);
  const lineY = contentTop(s) + 0.85;
  rect(slide, M, lineY, CW, 0.03, T.rule);
  s.items.forEach((it, i) => {
    const { x, w } = cols[i];
    const state = it.state || 'next';
    const filled = state !== 'next';
    slide.addShape('ellipse', { x: x + 0.02, y: lineY - 0.13, w: 0.3, h: 0.3, fill: { color: filled ? T.accent : T.white }, line: { color: filled ? T.accent : T.muted, width: 1.5 } });
    txt(slide, it.label, x, lineY - 0.65, w, 0.4, { size: 12, bold: true, color: state === 'now' ? T.ink : T.muted, label: 'timeline label' });
    txt(slide, it.heading, x, lineY + 0.35, w - 0.1, 0.45, { size: 18.75, bold: true, label: 'timeline heading' });
    txt(slide, it.body, x, lineY + 0.85, w - 0.1, bottom - lineY - 1.0, { size: 15.75, color: T.ink, valign: 'top', label: 'timeline body' });
  });
};

// native chart (bar | col | line | pie | doughnut) with optional insight panel on the right
types.chart = (slide, s, pres) => {
  chrome(slide, s);
  const bottom = bottomStack(slide, s);
  const y = contentTop(s);
  const hasSide = !!(s.insight || s.side);
  const cw = hasSide ? 7.6 : CW;
  const kind = { bar: pres.ChartType.bar, col: pres.ChartType.bar, line: pres.ChartType.line, pie: pres.ChartType.pie, doughnut: pres.ChartType.doughnut, area: pres.ChartType.area }[s.chart || 'col'];
  if (!kind) { warnings.push(`slide ${currentSlideNo}: unknown chart "${s.chart}"`); return; }
  const data = s.series.map(se => ({ name: se.name, labels: s.labels, values: se.values }));
  const palette = [T.accent, T.ink, '9A9A9A', 'C9C9C9', '6E6E6E', 'E0E0E0'];
  const isPie = s.chart === 'pie' || s.chart === 'doughnut';
  const opts = {
    x: M, y, w: cw, h: bottom - y - 0.1,
    barDir: s.chart === 'bar' ? 'bar' : 'col',
    chartColors: isPie ? palette : palette.slice(0, data.length),
    showLegend: data.length > 1 || isPie,
    legendPos: isPie ? 'r' : 'b',
    legendFontFace: T.font, legendFontSize: 12, legendColor: T.muted,
    catAxisLabelFontFace: T.font, catAxisLabelFontSize: 12, catAxisLabelColor: T.muted,
    valAxisLabelFontFace: T.font, valAxisLabelFontSize: 11, valAxisLabelColor: T.muted,
    valGridLine: { color: T.rule, style: 'solid', size: 0.5 },
    catGridLine: { style: 'none' },
    valAxisLineShow: false, catAxisLineShow: false,
    showValue: s.show_values !== false && !isPie,
    dataLabelFontFace: T.font, dataLabelFontSize: 11, dataLabelColor: T.ink,
    dataLabelPosition: s.chart === 'line' ? 't' : 'outEnd',
    showPercent: isPie, dataLabelFormatCode: s.format || undefined,
    lineSize: 2.5, lineDataSymbolSize: 7,
    holeSize: s.chart === 'doughnut' ? 55 : undefined,
    valAxisMinVal: s.min, valAxisMaxVal: s.max,
    barGapWidthPct: 60,
  };
  if (isPie) { delete opts.dataLabelPosition; opts.showLabel = true; opts.dataLabelFontSize = 12; }
  slide.addChart(kind, data, opts);
  if (hasSide) {
    const sx = M + cw + 0.33, sw = CW - cw - 0.33;
    const side = s.side || {};
    const heading = side.heading || 'What it shows';
    const body = side.body || s.insight;
    rect(slide, sx, y, sw, bottom - y - 0.1, T.panel);
    txt(slide, heading, sx + 0.2, y + 0.2, sw - 0.4, 0.45, { size: 19.5, bold: true, label: 'chart side heading' });
    txt(slide, body, sx + 0.2, y + 0.8, sw - 0.4, bottom - y - 1.1, { size: 16.5, valign: 'top', label: 'chart side body' });
  }
};

// image with text: side 'right' (default) | 'left' | 'full'
types.image = (slide, s) => {
  chrome(slide, s);
  const bottom = bottomStack(slide, s);
  const y = contentTop(s);
  const h = bottom - y - 0.1;
  const side = s.side || 'right';
  if (side === 'full') {
    const capH = s.caption ? 0.4 : 0;
    image(slide, s.image, M, y, CW, h - capH, s.fit);
    txt(slide, s.caption, M, y + h - capH + 0.05, CW, 0.35, { size: 12.75, color: T.muted, label: 'caption' });
    return;
  }
  const iw = 6.9, tw = CW - iw - 0.4;
  const ix = side === 'left' ? M : M + tw + 0.4;
  const tx = side === 'left' ? M + iw + 0.4 : M;
  const capH = s.caption ? 0.4 : 0;
  image(slide, s.image, ix, y, iw, h - capH, s.fit);
  txt(slide, s.caption, ix, y + h - capH + 0.05, iw, 0.35, { size: 12.75, color: T.muted, label: 'caption' });
  let ty = y;
  txt(slide, s.heading, tx, ty, tw, 0.5, { size: 21.75, bold: true, label: 'image heading' }); if (s.heading) ty += 0.65;
  txt(slide, s.body, tx, ty, tw, (s.points ? 1.6 : h - (ty - y)), { size: 17.25, valign: 'top', label: 'image body' });
  if (s.points) {
    ty += s.body ? 1.75 : 0;
    const ih = Math.min(0.7, (y + h - ty) / s.points.length);
    s.points.forEach(p => {
      rect(slide, tx, ty + 0.17, 0.12, 0.12, T.accent);
      txt(slide, p, tx + 0.3, ty, tw - 0.3, ih - 0.08, { size: 16.5, valign: 'top', label: 'image point' });
      ty += ih;
    });
  }
};

// one big statement or quotation in a panel with an accent edge
types.quote = (slide, s) => {
  chrome(slide, s);
  const bottom = bottomStack(slide, s);
  const y = contentTop(s) + 0.2;
  const h = Math.min(3.4, bottom - y - 0.3);
  rect(slide, M, y, CW, h, T.panel);
  rect(slide, M, y, 0.08, h, T.accent);
  txt(slide, s.text, M + 0.5, y + 0.3, CW - 1.0, h - (s.attribution ? 1.1 : 0.6), { size: s.size || 27, bold: true, valign: 'middle', label: 'quote' });
  txt(slide, s.attribution, M + 0.5, y + h - 0.7, CW - 1.0, 0.4, { size: 15.75, color: T.muted, label: 'attribution' });
};

// tag + headline + excerpt panel on the left; heading + accent-edged option list on the right
types.options = (slide, s) => {
  chrome(slide, s);
  bottomStack(slide, s);
  chip(slide, s.tag, M, 2.04);
  txt(slide, s.headline, M, 2.5, 7.34, 0.47, { size: 19.5, bold: true, label: 'headline' });
  const ex = s.excerpt || {};
  const py = 3.15, ph = 2.49, pw = 7.1;
  rect(slide, M, py, pw, ph, T.panel);
  let cy = py + 0.16;
  if (ex.tag) { chip(slide, ex.tag, M + 0.17, cy); cy += 0.51; }
  txt(slide, ex.heading, M + 0.17, cy, pw - 0.34, 0.42, { size: 21, bold: true, label: 'excerpt heading' }); cy += 0.52;
  txt(slide, ex.subheading, M + 0.17, cy, pw - 0.34, 0.39, { size: 18.75, bold: true, label: 'excerpt subheading' }); cy += 0.55;
  txt(slide, ex.body, M + 0.17, cy, pw - 0.34, py + ph - cy - 0.15, { size: 18, valign: 'top', label: 'excerpt body' });
  const rx = 8.25, rw = 4.58;
  txt(slide, s.right_heading, rx, 2.04, rw, 0.4, { size: 18.75, bold: true, label: 'right heading' });
  let oy = 2.61;
  const oh = Math.min(0.94, (5.64 - oy - 0.17 * (s.options.length - 1)) / s.options.length);
  s.options.forEach(op => {
    rect(slide, rx, oy, rw, oh, T.panel);
    rect(slide, rx, oy, 0.05, oh, T.accent);
    txt(slide, op.label, rx + 0.2, oy + 0.1, rw - 0.38, 0.31, { size: 18, bold: true, label: 'option label' });
    txt(slide, op.text, rx + 0.2, oy + 0.46, rw - 0.38, oh - 0.52, { size: 16.5, valign: 'top', label: 'option text' });
    oy += oh + 0.17;
  });
};

// dark slide with white cards (accent top edge) and an accent banner — "next steps", "the ask", "summary"
types.next = (slide, s) => {
  slide.background = { color: T.ink };
  chip(slide, brand.kicker, M, 0.25);
  if (logoPath && fs.existsSync(logoPath)) { if (brand.logoBox) rect(slide, 10.63, 0.15, 2.32, 0.57, T.white); logo(slide, 10.75, 0.2, 2.08, 0.47); }
  txt(slide, s.title, M, 1.0, CW, 0.6, { size: 27, bold: true, color: T.white, label: 'title' });
  txt(slide, s.subtitle, M, 1.7, CW, 0.75, { size: 18, color: T.white, valign: 'top', label: 'subtitle' });
  const y = 3.0, h = 2.7;
  const cols = columns(s.cards.length);
  s.cards.forEach((c, i) => {
    const { x, w } = cols[i];
    rect(slide, x, y, w, h, T.white);
    rect(slide, x, y, w, 0.08, T.accent);
    txt(slide, c.heading, x + 0.25, y + 0.42, w - 0.5, 0.45, { size: 19.5, bold: true, label: 'card heading' });
    txt(slide, c.body, x + 0.25, y + 1.08, w - 0.5, 0.8, { size: 16.5, valign: 'top', label: 'card body' });
    txt(slide, c.detail, x + 0.25, y + 1.92, w - 0.5, 0.72, { size: 15, color: T.muted, valign: 'top', label: 'card detail' });
  });
  if (s.banner) {
    rect(slide, M, 6.1, CW, 0.6, T.accent);
    txt(slide, s.banner, M + 0.2, 6.13, CW - 0.4, 0.54, { size: 18, bold: true, color: T.onAccent, label: 'banner' });
  }
  const label = s.footer_label ? `${s.footer_label.toUpperCase()}  |  ` : '';
  txt(slide, label + (s.source || ''), M, 7.05, 11.7, 0.3, { size: 10.5, color: T.white, label: 'source' });
  txt(slide, pageNo(), 12.34, 7.07, 0.49, 0.25, { size: 12, color: T.white, align: 'right' });
};

// two-column reference list: [n] label / text / link
types.references = (slide, s) => {
  chrome(slide, s);
  bottomStack(slide, s);
  const ncol = s.columns_count || 2;
  const cols = columns(ncol, 0.33);
  const perCol = Math.ceil(s.entries.length / ncol);
  const eh = 1.4;
  s.entries.forEach((e, i) => {
    const { x, w } = cols[Math.floor(i / perCol)];
    const y = 2.05 + (i % perCol) * eh;
    rect(slide, x, y, w, 0.01, T.rule);
    txt(slide, e.label, x, y + 0.11, w, 0.39, { size: 18, bold: true, label: 'ref label' });
    txt(slide, e.text, x, y + 0.51, w, 0.56, { size: 15.75, valign: 'top', label: 'ref text' });
    if (e.link) {
      const lt = typeof e.link === 'string' ? e.link : e.link.text;
      const url = typeof e.link === 'string' ? undefined : e.link.url;
      txt(slide, lt, x, y + 1.11, w, 0.27, { size: 13.5, color: url ? T.link : T.muted, underline: !!url, url, label: 'ref link' });
    }
  });
};

// dark closing slide: title, body, contact lines
types.closing = (slide, s) => {
  slide.background = { color: T.ink };
  chip(slide, brand.kicker, M, 0.44);
  txt(slide, s.title, M, 1.6, 9, 1.2, { size: 40.5, bold: true, color: T.white, label: 'title' });
  rect(slide, M, 3.0, 1.5, 0.05, T.accent);
  txt(slide, s.body, M, 3.3, 8, 1.2, { size: 18.75, color: T.white, valign: 'top', label: 'body' });
  if (s.lines) txt(slide, s.lines.join('\n'), M, 4.8, 8, 1.4, { size: 15.75, color: 'DDDDDD', valign: 'top', label: 'contact lines' });
  if (logoPath) { if (brand.logoBox) rect(slide, 10.63, 6.5, 2.32, 0.57, T.white); logo(slide, 10.75, 6.55, 2.08, 0.47); }
  txt(slide, pageNo(), 12.34, 7.12, 0.49, 0.25, { size: 12, color: T.white, align: 'right' });
};

// ---------- build ----------
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = spec.author || brand.kicker || 'slides';
pres.title = spec.title || 'Deck';

spec.slides.forEach((s, i) => {
  currentSlideNo = i + 1;
  const fn = types[s.type];
  if (!fn) { console.error(`slide ${currentSlideNo}: unknown type "${s.type}" (known: ${Object.keys(types).join(', ')})`); process.exit(1); }
  const slide = pres.addSlide();
  fn(slide, s, pres);
  if (s.notes) slide.addNotes(s.notes);
});

pres.writeFile({ fileName: outPath }).then(() => {
  console.log(`wrote ${outPath} (${spec.slides.length} slides, theme ${themeIn.preset || 'custom'})`);
  if (warnings.length) {
    console.error('\nWARNINGS (overflow figures are estimates; confirm by rendering):');
    warnings.forEach(w => console.error('  - ' + w));
    process.exitCode = 3;
  }
});
