/* Motore temi: applica accento, sfondo e modalità chiaro/scuro via variabili CSS.
   - Admin: tema salvato in locale (solo per lui).
   - Trainer: tema salvato sul proprio profilo, applicato anche ai suoi clienti. */
(function () {
  'use strict';

  const DEFAULT = { accent: '#4f46e5', mode: 'light', bg: '', surface: '' };

  function clampHex(h) {
    if (!h || typeof h !== 'string') return null;
    const v = h.trim();
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : null;
  }

  // Schiarisce (+)/scurisce (-) un colore hex di una percentuale.
  function shade(hex, percent) {
    const h = clampHex(hex); if (!h) return hex;
    let c = h.slice(1);
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const num = parseInt(c, 16);
    const amt = Math.round(2.55 * percent);
    const r = Math.max(0, Math.min(255, (num >> 16) + amt));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
    const b = Math.max(0, Math.min(255, (num & 0xff) + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function apply(theme) {
    const t = theme || {};
    const dark = t.mode === 'dark';
    const base = dark
      ? { bg: '#0f172a', surface: '#1e293b', surface2: '#273449', ink: '#f1f5f9', ink2: '#cbd5e1', ink3: '#94a3b8', line: '#334155' }
      : { bg: '#f1f5f9', surface: '#ffffff', surface2: '#f8fafc', ink: '#0f172a', ink2: '#475569', ink3: '#94a3b8', line: '#e2e8f0' };
    const cbg = clampHex(t.bg); if (cbg) base.bg = cbg;
    const csurf = clampHex(t.surface);
    if (csurf) { base.surface = csurf; base.surface2 = shade(csurf, dark ? 6 : -2); }
    const accent = clampHex(t.accent) || DEFAULT.accent;
    const s = document.documentElement.style;
    s.setProperty('--bg', base.bg);
    s.setProperty('--surface', base.surface);
    s.setProperty('--surface-2', base.surface2);
    s.setProperty('--ink', base.ink);
    s.setProperty('--ink-2', base.ink2);
    s.setProperty('--ink-3', base.ink3);
    s.setProperty('--line', base.line);
    s.setProperty('--indigo', accent);
    s.setProperty('--indigo-600', shade(accent, -12));
    s.setProperty('--cyan', accent);
  }

  function reset() {
    const s = document.documentElement.style;
    ['--bg', '--surface', '--surface-2', '--ink', '--ink-2', '--ink-3', '--line', '--indigo', '--indigo-600', '--cyan']
      .forEach((v) => s.removeProperty(v));
  }

  // Tema dell'amministratore: salvato in locale (riguarda solo la sua console).
  const ADMIN_KEY = 'myteam-admin-theme';
  function loadAdmin() {
    try { return JSON.parse(localStorage.getItem(ADMIN_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveAdmin(theme) {
    try { localStorage.setItem(ADMIN_KEY, JSON.stringify(theme || {})); } catch (e) { /* ignora */ }
  }

  // Converte i campi theme_* di un trainer nel formato del motore.
  function fromTrainer(t) {
    if (!t) return {};
    return { accent: t.theme_accent, mode: t.theme_mode, bg: t.theme_bg, surface: t.theme_surface };
  }

  window.Theme = {
    apply, reset, loadAdmin, saveAdmin, fromTrainer, DEFAULT,
    PRESETS: ['#4f46e5', '#0ea5e9', '#059669', '#e11d48', '#d97706', '#7c3aed', '#0f766e', '#db2777'],
  };
})();
