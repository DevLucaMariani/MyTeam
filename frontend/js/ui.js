/* Helper UI: creazione elementi, toast, modali, formattazioni. */
(function () {
  'use strict';

  // Crea un elemento. attrs: {class, onClick, html, ...}; children: array o nodo.
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        const v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'onClick') node.addEventListener('click', v);
        else if (k === 'onInput') node.addEventListener('input', v);
        else if (k === 'onChange') node.addEventListener('change', v);
        else if (k === 'onKeyup') node.addEventListener('keyup', v);
        else if (k in node && k !== 'list') node[k] = v;
        else node.setAttribute(k, v);
      });
    }
    if (children != null) {
      const arr = Array.isArray(children) ? children : [children];
      arr.forEach((c) => {
        if (c == null || c === false) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  function toast(message, kind) {
    const root = document.getElementById('toast-root');
    const t = el('div', { class: `toast ${kind || ''}`, text: message });
    root.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity = '0'; t.style.transform = 'translateY(8px)';
      setTimeout(() => t.remove(), 300);
    }, 3000);
  }

  // Modale generica. opts: {title, body(node), footer(node|array), wide, persistent}
  // persistent: true -> NON si chiude cliccando fuori (sfondo) o con Esc;
  //             solo i pulsanti espliciti (X / Annulla / Salva) la chiudono.
  // Ritorna { close }.
  function modal(opts) {
    const root = document.getElementById('modal-root');
    const close = () => { backdrop.remove(); document.removeEventListener('keydown', onEsc); };
    const onEsc = (e) => { if (e.key === 'Escape' && !opts.persistent) close(); };

    const head = el('div', { class: 'modal-head' }, [
      el('h3', { text: opts.title || '' }),
      el('button', { class: 'x', html: '&times;', onClick: close }),
    ]);
    const body = el('div', { class: 'modal-body' }, opts.body);
    const parts = [head, body];
    if (opts.footer) parts.push(el('div', { class: 'modal-foot' }, opts.footer));
    const box = el('div', { class: 'modal' + (opts.wide ? ' modal-wide' : '') }, parts);
    const backdrop = el('div', { class: 'modal-backdrop' }, box);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop && !opts.persistent) close(); });
    document.addEventListener('keydown', onEsc);
    root.appendChild(backdrop);
    return { close, box };
  }

  // Conferma sì/no.
  function confirmDialog(message, onYes, opts) {
    opts = opts || {};
    const m = modal({
      title: opts.title || 'Conferma',
      body: el('p', { text: message, class: 'muted' }),
      footer: [
        el('button', { class: 'btn', text: 'Annulla', onClick: () => m.close() }),
        el('button', {
          class: 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary'),
          text: opts.confirmLabel || 'Conferma',
          onClick: () => { m.close(); onYes(); },
        }),
      ],
    });
    return m;
  }

  // Campo form etichettato. type: text|number|date|select|textarea
  function field(label, name, value, type, attrs) {
    attrs = attrs || {};
    let input;
    if (type === 'textarea') {
      input = el('textarea', { name });
      input.value = value || '';
    } else if (type === 'select') {
      input = el('select', { name });
      (attrs.options || []).forEach((o) => {
        const opt = el('option', { value: o.value, text: o.label });
        if (String(o.value) === String(value)) opt.selected = true;
        input.appendChild(opt);
      });
    } else {
      input = el('input', { name, type: type || 'text', value: value != null ? value : '' });
      if (attrs.placeholder) input.placeholder = attrs.placeholder;
      if (attrs.step) input.step = attrs.step;
    }
    return el('div', { class: 'field' }, [el('label', { text: label }), input]);
  }

  // Estrae i valori dai campi name di un contenitore.
  function formValues(container) {
    const out = {};
    container.querySelectorAll('[name]').forEach((i) => { out[i.name] = i.value; });
    return out;
  }

  const initials = (a, b) => `${(a || '?')[0]}${(b || '')[0] || ''}`.toUpperCase();

  function fmtDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('it-IT'); } catch (e) { return d; }
  }

  // Ripetizioni per serie valide in una data settimana (override settimana o default).
  function repsForWeek(scheme, week) {
    if (!scheme) return [];
    const ov = scheme.overrides && scheme.overrides[String(week)];
    return Array.isArray(ov) ? ov : (scheme.default || []);
  }

  // Anno corrente per il copyright.
  function year() { return new Date().getFullYear(); }

  // Finestra "Credits" (richiamabile da ogni schermata).
  function showCredits() {
    const m = modal({
      title: 'Credits',
      body: el('div', { style: 'text-align:center' }, [
        el('img', { src: 'assets/logo.png', alt: '', style: 'width:52px;height:52px;margin-bottom:8px;border-radius:12px' }),
        el('h3', { text: 'MyTeam', style: 'margin:0 0 4px' }),
        el('p', { class: 'muted', text: 'Piattaforma di gestione team', style: 'margin:0 0 16px' }),
        el('p', { html: 'Ideato e sviluppato da <strong>Luca Mariani</strong>', style: 'margin:0 0 6px' }),
        el('p', { class: 'muted', text: `© ${year()} Luca Mariani — Tutti i diritti riservati.`, style: 'margin:0 0 14px' }),
        el('div', {}, [
          el('span', { class: 'muted', text: 'Per contatti: ' }),
          el('a', { href: 'mailto:mariani.pwine@gmail.com', text: 'mariani.pwine@gmail.com' }),
        ]),
      ]),
      footer: [el('button', { class: 'btn btn-primary btn-block', text: 'Chiudi', onClick: () => m.close() })],
    });
  }

  // Riga di copyright cliccabile (apre i Credits).
  function copyrightLine(extraClass) {
    const a = el('a', { href: '#', text: 'Credits', onClick: (e) => { e.preventDefault(); showCredits(); } });
    return el('p', { class: 'copyright' + (extraClass ? ' ' + extraClass : '') }, [
      document.createTextNode(`© ${year()} Luca Mariani — Tutti i diritti riservati · `), a,
    ]);
  }

  // Presenza online (secondi dall'ultimo accesso, calcolati dal server).
  function isOnlineSecs(secs) { return secs != null && secs < 180; }
  function agoSecs(secs) {
    if (secs == null) return 'mai';
    if (secs < 60) return 'adesso';
    if (secs < 3600) return Math.floor(secs / 60) + ' min fa';
    if (secs < 86400) return Math.floor(secs / 3600) + ' h fa';
    if (secs < 172800) return 'ieri';
    return Math.floor(secs / 86400) + ' giorni fa';
  }
  function onlineBadge(secs) {
    if (isOnlineSecs(secs)) return el('span', { class: 'badge badge-attiva', text: '🟢 Online' });
    return el('span', { class: 'muted', text: secs == null ? 'mai connesso' : 'visto ' + agoSecs(secs), style: 'font-size:12px' });
  }

  window.UI = { el, clear, toast, modal, confirmDialog, field, formValues, initials, fmtDate, repsForWeek, showCredits, copyrightLine, year, isOnlineSecs, agoSecs, onlineBadge };
})();
