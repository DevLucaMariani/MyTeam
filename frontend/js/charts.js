/* Grafici minimali in SVG (nessuna libreria, niente build).
   window.Charts.line(points, opts) -> elemento <svg>.
   points: [{ label, value }]; opts: { height, suffix, color, max }. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach((k) => n.setAttribute(k, attrs[k]));
    return n;
  }
  function cssVar(name, fb) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  }

  function line(points, opts) {
    opts = opts || {};
    const W = 320;
    const H = opts.height || 150;
    const pad = 30;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart' });
    if (!points || !points.length) return svg;

    const color = opts.color || cssVar('--indigo', '#4f46e5');
    const lineCol = cssVar('--line', '#e2e8f0');
    const ink2 = cssVar('--ink-2', '#475569');
    const ink3 = cssVar('--ink-3', '#94a3b8');

    const vals = points.map((p) => Number(p.value) || 0);
    const max = opts.max != null ? opts.max : Math.max(...vals, 1);
    const innerW = W - pad * 2;
    const innerH = H - pad - 16;
    const x = (i) => (points.length === 1 ? pad + innerW / 2 : pad + (i / (points.length - 1)) * innerW);
    const y = (v) => (pad - 8) + innerH - (max ? (v / max) * innerH : 0);

    svg.appendChild(svgEl('line', { x1: pad, y1: y(0), x2: W - pad, y2: y(0), stroke: lineCol, 'stroke-width': 1 }));

    let d = '';
    points.forEach((p, i) => { d += (i === 0 ? 'M' : 'L') + x(i) + ' ' + y(Number(p.value) || 0) + ' '; });
    if (points.length > 1) {
      svg.appendChild(svgEl('path', { d: d.trim(), fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    }
    points.forEach((p, i) => {
      const px = x(i);
      const py = y(Number(p.value) || 0);
      svg.appendChild(svgEl('circle', { cx: px, cy: py, r: 3.5, fill: color }));
      const tv = svgEl('text', { x: px, y: py - 7, 'text-anchor': 'middle', 'font-size': 10, fill: ink2 });
      tv.textContent = p.value + (opts.suffix || '');
      svg.appendChild(tv);
      const tl = svgEl('text', { x: px, y: H - 5, 'text-anchor': 'middle', 'font-size': 10, fill: ink3 });
      tl.textContent = p.label;
      svg.appendChild(tl);
    });
    return svg;
  }

  window.Charts = { line };
})();
