/* Pannello Amministratore: clienti, schede, nutrizione, monitoraggio. */
(function () {
  'use strict';
  const { el, clear, toast, modal, confirmDialog, field, formValues, initials, fmtDate } = window.UI;

  let root;
  let opts = { role: 'admin' };
  let state = { view: 'dashboard' };

  function mount(container, options) {
    root = container;
    opts = Object.assign({ role: 'admin' }, options || {});
    applyOwnTheme();
    if (window.__mtHeartbeat) clearInterval(window.__mtHeartbeat);
    API.ping().catch(() => {});
    window.__mtHeartbeat = setInterval(() => API.ping().catch(() => {}), 60000);
    navigate('dashboard');
  }

  // Applica il tema: del trainer (dal suo profilo) o dell'admin (locale).
  function applyOwnTheme() {
    if (opts.role === 'trainer') window.Theme.apply(window.Theme.fromTrainer(opts.trainer));
    else window.Theme.apply(window.Theme.loadAdmin());
  }

  // Stato del coach corrente (per limiti e sospensione lato console).
  const isTrainer = () => opts.role === 'trainer';
  const isSuspended = () => isTrainer() && opts.trainer && Number(opts.trainer.suspended);
  const clientsUnlocked = () => !isTrainer() || (opts.trainer && Number(opts.trainer.clients_unlocked));
  const clientLimitReached = (count) => isTrainer() && !clientsUnlocked() && count >= 2;

  // Pulsante "+ Nuovo cliente" che rispetta sospensione e limite gratuito.
  function addCustomerButton(count) {
    if (isSuspended()) return el('button', { class: 'btn', disabled: true, title: 'Account sospeso', html: '+ Nuovo cliente' });
    if (clientLimitReached(count)) return el('button', { class: 'btn', disabled: true, title: 'Limite gratuito: 2 clienti. Chiedi allo staff di sbloccarne altri.', html: '🔒 Limite 2 clienti' });
    return el('button', { class: 'btn btn-primary', onClick: () => openCustomerForm(), html: '+ Nuovo cliente' });
  }

  function navigate(view, params) {
    state = Object.assign({ view }, params || {});
    render();
  }

  function navItems() {
    const items = [
      { view: 'dashboard', ico: '📊', label: 'Dashboard' },
      { view: 'customers', ico: '👥', label: 'Clienti' },
      { view: 'exercises', ico: '🏋️', label: 'Esercizi' },
      { view: 'notifications', ico: '🔔', label: 'Notifiche' },
    ];
    // Solo l'amministratore gestisce i trainer e i compensi.
    if (opts.role === 'admin') {
      items.splice(1, 0, { view: 'trainers', ico: '🧑‍🏫', label: 'Coach' });
      items.push({ view: 'billing', ico: '💶', label: 'Compensi' });
    }
    // Il trainer gestisce la propria rubrica e può invitare altri trainer.
    if (opts.role === 'trainer') {
      items.push({ view: 'contacts', ico: '📇', label: 'Contatti' });
      items.push({ view: 'invite', ico: '➕', label: 'Invita coach' });
      items.push({ view: 'settings', ico: '⚙️', label: 'Impostazioni' });
    }
    // L'aspetto del coach è dentro Impostazioni; l'admin ha la sua pagina dedicata.
    if (opts.role === 'admin') items.push({ view: 'appearance', ico: '🎨', label: 'Aspetto' });
    return items;
  }

  function navItem(n) {
    const children = [el('span', { class: 'ico', text: n.ico }), el('span', { text: n.label })];
    if (n.view === 'notifications') children.push(el('span', { class: 'nav-badge', id: 'notif-badge', style: 'display:none' }));
    return el('button', {
      class: 'nav-item' + ((state.view === n.view || (n.view === 'customers' && state.view === 'customer')) ? ' active' : ''),
      onClick: () => navigate(n.view),
    }, children);
  }

  async function updateNotifBadge() {
    try {
      const notifs = await API.listNotifications();
      const unread = notifs.filter((n) => !Number(n.is_read)).length;
      const badge = document.getElementById('notif-badge');
      if (badge) { badge.textContent = String(unread); badge.style.display = unread ? 'inline-flex' : 'none'; }
    } catch (e) { /* offline: nessun badge */ }
  }

  function render() {
    clear(root);
    const brandText = (opts.role === 'trainer' && opts.trainer)
      ? (opts.trainer.brand_name || `${opts.trainer.first_name} ${opts.trainer.last_name}`)
      : 'MyTeam';
    const brandLogo = (opts.role === 'trainer' && opts.trainer && opts.trainer.logo)
      ? opts.trainer.logo : 'assets/logo.png';
    const sidebar = el('aside', { class: 'sidebar' }, [
      el('div', { class: 'brand' }, [
        el('img', { src: brandLogo, alt: '', style: 'width:32px;height:32px;object-fit:contain;border-radius:8px' }),
        el('span', { text: brandText }),
      ]),
      opts.role === 'trainer' ? el('div', { text: 'Console Coach', style: 'font-size:11px; opacity:.7; padding:0 16px 8px; letter-spacing:.04em; text-transform:uppercase' }) : null,
      isSuspended() ? el('div', { text: '⛔ Account sospeso — sola lettura', style: 'font-size:12px; color:#fff; background:var(--danger); padding:8px 16px; margin:0 0 8px; font-weight:600' }) : null,
      ...navItems().map(navItem),
      el('div', { class: 'spacer' }),
      el('button', { class: 'nav-item exit', onClick: () => window.Router.goRole(),
        }, [el('span', { class: 'ico', text: '↩' }), el('span', { text: 'Esci' })]),
      el('button', { class: 'nav-item', style: 'opacity:.65; font-size:12px', onClick: () => window.UI.showCredits(),
        }, [el('span', { class: 'ico', text: 'ⓘ' }), el('span', { text: 'Credits' })]),
      el('div', { style: 'padding:8px 14px' }, window.I18N.toggleEl()),
    ]);

    const content = el('main', { class: 'content', id: 'admin-content' });
    root.appendChild(el('div', { class: 'admin' }, [sidebar, content]));

    const views = {
      dashboard: renderDashboard,
      customers: renderCustomers,
      customer: renderCustomerDetail,
      monitor: renderMonitor,
      exercises: renderExercises,
      notifications: renderNotifications,
      trainers: renderTrainers,
      appearance: renderAppearance,
      billing: renderBilling,
      invite: renderInvite,
      contacts: renderContacts,
      settings: renderSettings,
    };
    (views[state.view] || renderDashboard)(content);
    updateNotifBadge();
  }

  // Stato scadenza di una scheda in base alla data di fine.
  function expiryInfo(endDate) {
    if (!endDate) return { label: '—', danger: false, days: null };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(0, 0, 0, 0);
    const days = Math.round((end - today) / 86400000);
    if (days < 0) return { label: 'Scaduta', danger: true, days };
    if (days <= 7) return { label: 'Ultima settimana', danger: true, days };
    return { label: `${Math.ceil(days / 7)} sett. rimaste`, danger: false, days };
  }

  function topbar(title, crumbs, actions) {
    return el('div', { class: 'topbar' }, [
      el('div', {}, [el('h2', { text: title }), crumbs ? el('div', { class: 'crumbs', text: crumbs }) : null]),
      el('div', { class: 'topbar-actions' }, actions || []),
    ]);
  }

  function loading(container) {
    container.appendChild(el('div', { class: 'empty' }, [el('div', { class: 'ico', text: '⏳' }), el('p', { text: 'Caricamento…' })]));
  }

  function fmtDateTime(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return String(d); }
  }

  // ---- Notifiche ----------------------------------------------------------
  async function renderNotifications(c) {
    c.appendChild(topbar('Notifiche', 'Aggiornamenti ricevuti dai clienti'));
    loading(c);
    try {
      const notifs = await API.listNotifications();
      clear(c);
      const unread = notifs.filter((n) => !Number(n.is_read)).length;
      c.appendChild(topbar('Notifiche', `${unread} non lette su ${notifs.length}`, [
        notifs.length ? el('button', { class: 'btn', text: 'Segna tutte come lette', onClick: async () => {
          try { await API.readAllNotifications(); toast('Notifiche segnate come lette', 'ok'); navigate('notifications'); }
          catch (err) { toast(err.message, 'err'); }
        } }) : null,
      ]));
      const card = el('div', { class: 'card' });
      if (!notifs.length) {
        card.appendChild(emptyState('Nessuna notifica', 'Quando un cliente invia l\'aggiornamento di fine settimana lo vedrai qui.'));
      } else {
        notifs.forEach((n) => {
          card.appendChild(el('div', { class: 'notif-row' + (Number(n.is_read) ? '' : ' unread'),
            onClick: async () => {
              if (!Number(n.is_read)) { try { await API.readNotification(n.id); } catch (e) { /* ignora */ } }
              if (n.plan_id && n.customer_id) navigate('monitor', { planId: n.plan_id, customerId: n.customer_id });
              else navigate('notifications');
            } }, [
            el('span', { class: 'notif-dot' }),
            el('div', { style: 'flex:1' }, [
              el('div', { text: n.message, style: 'font-size:14px' }),
              el('div', { class: 'muted', text: fmtDateTime(n.created_at), style: 'font-size:12px; margin-top:2px' }),
            ]),
            el('button', { class: 'btn btn-sm btn-ghost', html: '🗑', title: 'Elimina', onClick: (e) => {
              e.stopPropagation();
              confirmDialog('Eliminare questa notifica?', async () => {
                try { await API.deleteNotification(n.id); navigate('notifications'); } catch (err) { toast(err.message, 'err'); }
              }, { danger: true, confirmLabel: 'Elimina' });
            } }),
          ]));
        });
      }
      c.appendChild(card);
    } catch (err) { showError(c, err); }
  }

  // ---- Trainer (solo amministratore) --------------------------------------
  async function renderTrainers(c) {
    c.appendChild(topbar('Coach', 'I tuoi coach e le loro credenziali'));
    loading(c);
    try {
      const trainers = await API.listTrainers();
      clear(c);
      c.appendChild(topbar('Coach', `${trainers.length} coach`, [
        el('button', { class: 'btn btn-primary', html: '+ Nuovo coach', onClick: () => openTrainerForm() }),
      ]));
      const card = el('div', { class: 'card' });
      if (!trainers.length) {
        card.appendChild(emptyState('Nessun coach', 'Crea il primo coach e consegnagli nome utente e password.'));
      } else {
        const rows = trainers.map((t) => {
          const pending = !Number(t.active);
          const actions = pending
            ? [
              el('button', { class: 'btn btn-sm btn-accent', text: '✓ Approva', onClick: async () => {
                try { await API.approveTrainer(t.id); toast('Coach approvato', 'ok'); navigate('trainers'); }
                catch (err) { toast(err.message, 'err'); }
              } }),
              el('button', { class: 'btn btn-sm btn-danger', text: 'Rifiuta', onClick: () => {
                confirmDialog(`Rifiutare ed eliminare la richiesta di ${t.first_name} ${t.last_name}?`, async () => {
                  try { await API.deleteTrainer(t.id); navigate('trainers'); } catch (err) { toast(err.message, 'err'); }
                }, { danger: true, confirmLabel: 'Rifiuta' });
              } }),
            ]
            : [
              el('button', { class: 'btn btn-sm btn-accent', html: '🔗 Invia accesso', onClick: () => openTrainerAccess(t) }),
              el('button', { class: 'btn btn-sm', text: Number(t.clients_unlocked) ? 'Blocca a 2' : 'Sblocca clienti', onClick: async () => {
                try { await API.setTrainerFlags(t.id, { clients_unlocked: !Number(t.clients_unlocked) }); toast('Aggiornato', 'ok'); navigate('trainers'); }
                catch (err) { toast(err.message, 'err'); }
              } }),
              el('button', { class: 'btn btn-sm ' + (Number(t.suspended) ? 'btn-accent' : 'btn-danger'), text: Number(t.suspended) ? 'Riattiva' : 'Sospendi', onClick: () => {
                const sus = !Number(t.suspended);
                confirmDialog(sus ? `Sospendere ${t.first_name} ${t.last_name}? Potrà accedere ma non potrà operare.` : `Riattivare ${t.first_name} ${t.last_name}?`, async () => {
                  try { await API.setTrainerFlags(t.id, { suspended: sus }); toast(sus ? 'Coach sospeso' : 'Coach riattivato', 'ok'); navigate('trainers'); }
                  catch (err) { toast(err.message, 'err'); }
                }, { danger: sus, confirmLabel: sus ? 'Sospendi' : 'Riattiva' });
              } }),
              el('button', { class: 'btn btn-sm', text: '🧩 Moduli', onClick: () => openTrainerModules(t) }),
              el('button', { class: 'btn btn-sm', text: 'Modifica', onClick: () => openTrainerForm(t) }),
              el('button', { class: 'btn btn-sm btn-danger', text: 'Elimina', onClick: () => {
                confirmDialog(`Eliminare il coach ${t.first_name} ${t.last_name}? I suoi clienti restano, ma senza coach assegnato.`, async () => {
                  try { await API.deleteTrainer(t.id); toast('Coach eliminato', 'ok'); navigate('trainers'); }
                  catch (err) { toast(err.message, 'err'); }
                }, { danger: true, confirmLabel: 'Elimina' });
              } }),
            ];
          return el('tr', pending ? { style: 'background:var(--surface-2)' } : {}, [
            el('td', {}, el('div', { class: 'cell-name' }, [
              t.photo ? el('img', { src: t.photo, alt: '', style: 'width:36px;height:36px;border-radius:50%;object-fit:cover' }) : el('span', { class: 'avatar', text: initials(t.first_name, t.last_name) }),
              el('div', {}, [
                el('div', {}, [
                  window.UI.onlineDot(t.last_seen_secs),
                  el('span', { text: `${t.first_name} ${t.last_name}`, style: 'font-weight:600' }),
                  pending ? el('span', { class: 'badge badge-bozza', text: 'In attesa', style: 'margin-left:8px' }) : null,
                  Number(t.suspended) ? el('span', { class: 'badge badge-danger', text: 'Sospeso', style: 'margin-left:6px' }) : null,
                  Number(t.clients_unlocked) ? el('span', { class: 'badge badge-attiva', text: 'Clienti sbloccati', style: 'margin-left:6px' }) : null,
                ]),
                el('div', { class: 'muted', text: '@' + t.username + (t.sponsor_id ? ' · sponsorizzato' : ''), style: 'font-size:12px' }),
              ]),
            ])),
            el('td', { text: t.phone || '—' }),
            el('td', { text: pending ? '—' : `${t.customers_count || 0} clienti · ${t.rate}%` }),
            el('td', { style: 'text-align:right; white-space:nowrap' }, actions),
          ]);
        });
        card.appendChild(el('table', { class: 'table' }, [
          el('thead', {}, el('tr', {}, ['Coach', 'Telefono', 'Clienti', ''].map((h) => el('th', { text: h })))),
          el('tbody', {}, rows),
        ]));
      }
      c.appendChild(card);
    } catch (err) { showError(c, err); }
  }

  // Catalogo dei moduli extra attivabili dall'admin per un coach.
  const TRAINER_MODULES = [
    { key: 'advanced_appearance', label: 'Aspetto avanzato', desc: 'Personalizzazione completa di sfondo e superfici: interfaccia su misura per il coach e i suoi clienti.' },
  ];

  function openTrainerModules(t) {
    const body = el('div', {}, [
      el('p', { class: 'muted', style: 'font-size:13px', text: 'Attiva i servizi extra per questo coach. Le modifiche valgono dal suo prossimo accesso.' }),
    ]);
    TRAINER_MODULES.forEach((mod) => {
      const mods = (t.modules && typeof t.modules === 'object') ? t.modules : {};
      const toggle = el('input', { type: 'checkbox' });
      toggle.checked = !!mods[mod.key];
      toggle.addEventListener('change', async () => {
        try {
          const updated = await API.setTrainerModule(t.id, mod.key, toggle.checked);
          t.modules = updated.modules || {};
          toast(toggle.checked ? 'Modulo attivato' : 'Modulo disattivato', 'ok');
        } catch (err) { toast(err.message, 'err'); toggle.checked = !toggle.checked; }
      });
      body.appendChild(el('label', { style: 'display:flex; gap:10px; align-items:flex-start; padding:10px 0; border-top:1px solid var(--line); cursor:pointer' }, [
        toggle,
        el('div', {}, [
          el('div', { text: mod.label, style: 'font-weight:600' }),
          el('div', { class: 'muted', text: mod.desc, style: 'font-size:12.5px' }),
        ]),
      ]));
    });
    const m = modal({
      title: `Moduli extra — ${t.first_name} ${t.last_name}`,
      body,
      footer: [el('button', { class: 'btn btn-primary btn-block', text: 'Chiudi', onClick: () => m.close() })],
    });
  }

  function openTrainerForm(existing) {
    const photoState = { data: (existing && existing.photo) || null };
    const f = el('div', {}, [
      el('div', { class: 'grid-2' }, [
        field('Nome', 'first_name', existing && existing.first_name),
        field('Cognome', 'last_name', existing && existing.last_name),
      ]),
      el('div', { class: 'grid-2' }, [
        field('Email', 'email', existing && existing.email),
        field('Telefono', 'phone', existing && existing.phone),
      ]),
      field('Bio / specializzazione (vista dal cliente)', 'bio', existing && existing.bio, 'textarea'),
      el('div', { class: 'section-title' }, [el('h4', { text: 'Credenziali della console' })]),
      el('div', { class: 'grid-2' }, [
        field('Nome utente', 'username', existing && existing.username),
        field('Password', 'password', '', 'text', { placeholder: existing ? 'lascia vuoto per non cambiarla' : 'scegli una password' }),
      ]),
    ]);
    // Foto del trainer (facoltativa).
    const fileInput = el('input', { type: 'file', accept: 'image/*' });
    const preview = el('img', { style: 'max-width:120px;border-radius:12px;margin-top:8px;' + (photoState.data ? '' : 'display:none') });
    if (photoState.data) preview.src = photoState.data;
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { photoState.data = reader.result; preview.src = reader.result; preview.style.display = 'block'; };
      reader.readAsDataURL(file);
    });
    f.appendChild(el('div', { class: 'field' }, [el('label', { text: 'Foto (facoltativa)' }), fileInput, preview]));

    const m = modal({
      title: existing ? 'Modifica coach' : 'Nuovo coach',
      body: f,
      footer: [
        el('button', { class: 'btn', text: 'Annulla', onClick: () => m.close() }),
        el('button', { class: 'btn btn-primary', text: 'Salva', onClick: async () => {
          const data = formValues(f);
          data.photo = photoState.data || null;
          if (!data.first_name || !data.last_name) { toast('Nome e cognome obbligatori', 'err'); return; }
          if (!existing && (!data.username || !data.password)) { toast('Nome utente e password obbligatori', 'err'); return; }
          if (existing && !data.password) delete data.password;
          try {
            if (existing) await API.updateTrainer(existing.id, data);
            else await API.createTrainer(data);
            m.close(); toast('Coach salvato', 'ok'); navigate('trainers');
          } catch (err) { toast(err.message, 'err'); }
        } }),
      ],
    });
  }

  // Finestra "Invia accesso" al trainer: link diretto alla console + WhatsApp.
  function openTrainerAccess(t) {
    const link = `${window.location.origin}/?t=${t.console_token}`;
    const digits = (t.phone || '').replace(/\D/g, '');
    const msg = `Ciao ${t.first_name}! Ecco l'accesso alla tua console MyTeam: ${link}`;
    const wa = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
    const linkInput = el('input', { value: link, readonly: true, style: 'font-size:13px' });
    linkInput.addEventListener('click', () => linkInput.select());
    const m = modal({
      title: `Accesso console — ${t.first_name} ${t.last_name}`,
      body: el('div', {}, [
        el('p', { class: 'muted', text: 'Con questo link il coach entra direttamente nella sua console, senza digitare la password. Invialo solo al coach giusto. In alternativa può accedere dalla schermata "Coach" con nome utente e password.' }),
        el('div', { class: 'field' }, [linkInput]),
      ]),
      footer: [
        el('button', { class: 'btn', html: '📋 Copia link', onClick: () => {
          if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => toast('Link copiato', 'ok'), () => toast('Copia non riuscita', 'err'));
          else { linkInput.select(); document.execCommand('copy'); toast('Link copiato', 'ok'); }
        } }),
        el('a', { class: 'btn btn-accent', href: wa, target: '_blank', html: '🟢 Invia su WhatsApp' }),
      ],
    });
  }

  // ---- Compensi (solo amministratore) -------------------------------------
  async function renderBilling(c) {
    c.appendChild(topbar('Compensi', 'Primi 2 clienti gratis per coach; dal 3° si applica il tasso'));
    loading(c);
    try {
      const rows = await API.listBilling();
      clear(c);
      const total = rows.reduce((s, r) => s + Number(r.owed || 0), 0);
      c.appendChild(topbar('Compensi', `Totale maturato: ${fmtEuro(total) || '€ 0,00'}`));
      const card = el('div', { class: 'card' });
      if (!rows.length) {
        card.appendChild(emptyState('Nessun coach attivo', 'Approva o crea un coach per vedere i compensi.'));
      } else {
        const trs = rows.map((r) => {
          const cur = (r.commission_override == null) ? 'auto' : String(r.commission_override);
          const sel = el('select', {}, [
            { v: 'auto', l: `Automatico (${r.sponsored_count >= 3 ? '5' : '10'}%)` },
            { v: '10', l: '10%' }, { v: '5', l: '5%' }, { v: '0', l: '0%' },
          ].map((o) => {
            const opt = el('option', { value: o.v, text: o.l });
            if (o.v === cur) opt.selected = true;
            return opt;
          }));
          sel.addEventListener('change', async () => {
            try { await API.setTrainerCommission(r.id, sel.value === 'auto' ? null : Number(sel.value)); toast('Tasso aggiornato', 'ok'); navigate('billing'); }
            catch (err) { toast(err.message, 'err'); }
          });
          return el('tr', {}, [
            el('td', { text: `${r.first_name} ${r.last_name}`, style: 'font-weight:600' }),
            el('td', { text: `${r.clients_count} (${Math.max(0, r.clients_count - r.free_clients)} a pagamento)` }),
            el('td', { text: String(r.sponsored_count) }),
            el('td', {}, sel),
            el('td', { text: String(r.billable_plans) }),
            el('td', { text: fmtEuro(r.billable_revenue) || '€ 0,00' }),
            el('td', { text: fmtEuro(r.owed) || '€ 0,00', style: 'font-weight:700' }),
          ]);
        });
        card.appendChild(el('table', { class: 'table' }, [
          el('thead', {}, el('tr', {}, ['Coach', 'Clienti', 'Portati', 'Tasso', 'Voci pag.', 'Imponibile', 'Compenso'].map((h) => el('th', { text: h })))),
          el('tbody', {}, trs),
        ]));
      }
      c.appendChild(card);
      c.appendChild(el('p', { class: 'muted', style: 'margin-top:12px; font-size:13px',
        text: 'Il compenso è la percentuale sulle voci di pagamento di tipo Abbonamento e Schede effettivamente saldate, per i clienti oltre i primi 2 (gratuiti). Le prestazioni extra non rientrano. Il tasso scende a 5% in automatico quando un coach porta 3 coach sponsorizzati e attivi; puoi comunque forzarlo qui.' }));
    } catch (err) { showError(c, err); }
  }

  // ---- Invita un trainer (solo trainer) -----------------------------------
  async function renderInvite(c) {
    c.appendChild(topbar('Invita un coach', 'Porta altri coach e abbassa il tuo tasso'));
    loading(c);
    try {
      const me = await API.getMe();
      clear(c);
      c.appendChild(topbar('Invita un coach', `Tuo tasso attuale: ${me.rate}%`));
      const link = `${window.location.origin}/?invite=${me.invite_code}`;
      const msg = `Ciao! Unisciti a MyTeam come coach con il mio invito: ${link}`;
      const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      const linkInput = el('input', { value: link, readonly: true, style: 'font-size:13px' });
      linkInput.addEventListener('click', () => linkInput.select());
      c.appendChild(el('div', { class: 'card' }, [
        el('h3', { text: '🔗 Il tuo link di invito' }),
        el('p', { class: 'muted', text: "Chi si registra con questo link diventa un coach in attesa di approvazione dell'amministratore. Con 3 coach attivi portati da te, il tuo tasso scende dal 10% al 5%." }),
        el('div', { class: 'field' }, [linkInput]),
        el('div', { style: 'display:flex; gap:8px; flex-wrap:wrap' }, [
          el('button', { class: 'btn', html: '📋 Copia link', onClick: () => {
            if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => toast('Link copiato', 'ok'), () => toast('Copia non riuscita', 'err'));
            else { linkInput.select(); document.execCommand('copy'); toast('Link copiato', 'ok'); }
          } }),
          el('a', { class: 'btn btn-accent', href: wa, target: '_blank', html: '🟢 Condividi su WhatsApp' }),
        ]),
      ]));
      c.appendChild(el('div', { class: 'card' }, [
        el('h3', { text: 'Il tuo riepilogo' }),
        el('div', { class: 'grid-3' }, [
          infoLine('Coach portati (attivi)', String(me.sponsored_count)),
          infoLine('Clienti', `${me.clients_count} (primi ${me.free_clients} gratis)`),
          infoLine('Tasso attuale', me.rate + '%'),
          infoLine('Voci conteggiate', String(me.billable_plans)),
          infoLine('Imponibile', fmtEuro(me.billable_revenue) || '€ 0,00'),
          infoLine('Compenso maturato', fmtEuro(me.owed) || '€ 0,00'),
        ]),
      ]));
    } catch (err) { showError(c, err); }
  }

  // ---- Aspetto: card riutilizzabile (admin: pagina dedicata; coach: in Impostazioni) ----
  // I controlli avanzati (sfondo + superficie = "aspetto avanzato/aggressivo")
  // sono sempre attivi per l'admin; per il coach solo se l'amministratore ha
  // attivato il modulo "advanced_appearance".
  function appearanceCard() {
    const isTrainer = opts.role === 'trainer';
    const advancedOn = !isTrainer || !!(opts.trainer && opts.trainer.modules && opts.trainer.modules.advanced_appearance);
    const t = isTrainer ? (opts.trainer || {}) : window.Theme.loadAdmin();
    const cur = {
      accent: (isTrainer ? t.theme_accent : t.accent) || '',
      mode: (isTrainer ? t.theme_mode : t.mode) || 'light',
      bg: (isTrainer ? t.theme_bg : t.bg) || '',
      surface: (isTrainer ? t.theme_surface : t.surface) || '',
      logo: isTrainer ? (t.logo || null) : null,
      brand_name: isTrainer ? (t.brand_name || '') : '',
      welcome_message: isTrainer ? (t.welcome_message || '') : '',
    };
    const live = () => window.Theme.apply(cur);

    const card = el('div', { class: 'card' });

    // Modalità chiaro/scuro
    const modeRow = el('div', { class: 'week-pills' });
    [['light', '☀️ Chiaro'], ['dark', '🌙 Scuro']].forEach(([val, label]) => {
      const b = el('button', { class: 'week-pill' + (cur.mode === val ? ' active' : ''), text: label });
      b.addEventListener('click', () => {
        cur.mode = val; live();
        modeRow.querySelectorAll('.week-pill').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
      });
      modeRow.appendChild(b);
    });
    card.appendChild(el('div', { class: 'field' }, [el('label', { text: 'Modalità' }), modeRow]));

    // Accento: campioni rapidi + selettore colore
    const accentInput = el('input', { type: 'color', value: cur.accent || '#4f46e5', style: 'width:48px;height:34px;padding:2px;border-radius:8px' });
    const swatches = el('div', { style: 'display:flex; gap:8px; flex-wrap:wrap; align-items:center' });
    const swatchBtns = [];
    const refreshSwatches = () => swatchBtns.forEach((sb) => { sb.style.borderColor = (cur.accent === sb.dataset.hex) ? 'var(--ink)' : 'transparent'; });
    window.Theme.PRESETS.forEach((hex) => {
      const sb = el('button', { title: hex, style: `width:30px;height:30px;border-radius:50%;border:2px solid transparent;background:${hex};cursor:pointer` });
      sb.dataset.hex = hex;
      sb.addEventListener('click', () => { cur.accent = hex; accentInput.value = hex; live(); refreshSwatches(); });
      swatchBtns.push(sb); swatches.appendChild(sb);
    });
    accentInput.addEventListener('input', (e) => { cur.accent = e.target.value; live(); refreshSwatches(); });
    swatches.appendChild(accentInput);
    refreshSwatches();
    card.appendChild(el('div', { class: 'field' }, [el('label', { text: 'Colore principale (accento)' }), swatches]));

    // Sfondo + superficie ("aspetto avanzato") — modulo extra per il coach.
    let bgInput = null;
    let surfInput = null;
    if (advancedOn) {
      bgInput = el('input', { type: 'color', value: cur.bg || '#f1f5f9', style: 'width:48px;height:34px;padding:2px;border-radius:8px' });
      bgInput.addEventListener('input', (e) => { cur.bg = e.target.value; live(); });
      surfInput = el('input', { type: 'color', value: cur.surface || '#ffffff', style: 'width:48px;height:34px;padding:2px;border-radius:8px' });
      surfInput.addEventListener('input', (e) => { cur.surface = e.target.value; live(); });
      card.appendChild(el('div', { class: 'grid-2' }, [
        el('div', { class: 'field' }, [el('label', { text: 'Sfondo (aspetto avanzato)' }), bgInput]),
        el('div', { class: 'field' }, [el('label', { text: 'Card / superficie (aspetto avanzato)' }), surfInput]),
      ]));
    } else if (isTrainer) {
      card.appendChild(el('div', { class: 'nutri-disclaimer', style: 'margin:8px 0' }, [
        el('span', { class: 'ico', text: '✨' }),
        el('div', {}, [
          el('strong', { text: 'Aspetto avanzato — servizio extra' }),
          el('p', { text: 'La personalizzazione completa di sfondo e superfici (interfaccia su misura per i tuoi clienti) è un modulo extra. Chiedi all’amministratore di attivarlo per il tuo account.' }),
        ]),
      ]));
    }

    // Logo (solo trainer)
    let logoPreview = null;
    if (isTrainer) {
      const fileInput = el('input', { type: 'file', accept: 'image/*' });
      logoPreview = el('img', { style: 'max-width:160px;max-height:80px;object-fit:contain;margin-top:8px;' + (cur.logo ? '' : 'display:none') });
      if (cur.logo) logoPreview.src = cur.logo;
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { cur.logo = reader.result; logoPreview.src = reader.result; logoPreview.style.display = 'block'; };
        reader.readAsDataURL(file);
      });
      const rm = el('button', { class: 'btn btn-sm btn-danger', text: 'Rimuovi logo', onClick: () => { cur.logo = null; logoPreview.style.display = 'none'; } });
      card.appendChild(el('div', { class: 'field' }, [
        el('label', { text: 'Logo (mostrato a te e ai tuoi clienti)' }),
        el('div', { style: 'display:flex; align-items:center; gap:8px; flex-wrap:wrap' }, [fileInput, rm]),
        logoPreview,
      ]));

      // Nome studio/brand + messaggio di benvenuto mostrati ai clienti.
      const brandInput = el('input', { value: cur.brand_name, placeholder: 'es. Studio Rossi Personal Training', maxlength: 80 });
      brandInput.addEventListener('input', (e) => { cur.brand_name = e.target.value; });
      card.appendChild(el('div', { class: 'field' }, [
        el('label', { text: 'Nome studio / brand (mostrato ai clienti)' }), brandInput,
      ]));
      const welcomeInput = el('textarea', { rows: 2, maxlength: 200, placeholder: 'es. Benvenuto nel team! Insieme raggiungiamo i tuoi obiettivi.' });
      welcomeInput.value = cur.welcome_message;
      welcomeInput.addEventListener('input', (e) => { cur.welcome_message = e.target.value; });
      card.appendChild(el('div', { class: 'field' }, [
        el('label', { text: 'Messaggio di benvenuto (mostrato ai clienti)' }), welcomeInput,
      ]));
    }

    // Azioni
    card.appendChild(el('div', { style: 'display:flex; gap:8px; margin-top:6px; flex-wrap:wrap' }, [
      el('button', { class: 'btn btn-primary', text: 'Salva', onClick: () => saveAppearance(cur, isTrainer) }),
      el('button', { class: 'btn', text: 'Ripristina default', onClick: () => {
        cur.accent = ''; cur.mode = 'light'; cur.bg = ''; cur.surface = '';
        if (isTrainer) { cur.logo = null; if (logoPreview) logoPreview.style.display = 'none'; }
        accentInput.value = '#4f46e5';
        if (bgInput) bgInput.value = '#f1f5f9';
        if (surfInput) surfInput.value = '#ffffff';
        modeRow.querySelectorAll('.week-pill').forEach((x, i) => x.classList.toggle('active', i === 0));
        refreshSwatches(); live();
      } }),
    ]));
    live(); // anteprima immediata
    return card;
  }

  // Pagina Aspetto dedicata (solo amministratore: tema locale della sua console).
  function renderAppearance(c) {
    c.appendChild(topbar('Aspetto', 'Colori della tua console (solo per te)'));
    c.appendChild(appearanceCard());
  }

  async function saveAppearance(cur, isTrainer) {
    if (isTrainer) {
      try {
        const t = await API.updateMyBranding({
          logo: cur.logo || null, theme_accent: cur.accent || null, theme_mode: cur.mode || null,
          theme_bg: cur.bg || null, theme_surface: cur.surface || null,
          brand_name: (cur.brand_name || '').trim() || null,
          welcome_message: (cur.welcome_message || '').trim() || null,
        });
        opts.trainer = Object.assign({}, opts.trainer, t);
        window.Theme.apply(window.Theme.fromTrainer(opts.trainer));
        render(); // aggiorna logo/nome nella sidebar
        toast('Aspetto salvato — vale anche per i tuoi clienti', 'ok');
      } catch (err) { toast(err.message, 'err'); }
    } else {
      const theme = { accent: cur.accent || '', mode: cur.mode || 'light', bg: cur.bg || '', surface: cur.surface || '' };
      window.Theme.saveAdmin(theme);
      window.Theme.apply(theme);
      toast('Aspetto salvato', 'ok');
    }
  }

  // ---- Contatti (rubrica del coach) ---------------------------------------
  async function renderContacts(c) {
    c.appendChild(topbar('Contatti', 'Collaboratori del tuo team — visibili ai tuoi clienti'));
    loading(c);
    try {
      const contacts = await API.listMyContacts();
      clear(c);
      c.appendChild(topbar('Contatti', `${contacts.length} contatti — visibili ai tuoi clienti`, [
        el('button', { class: 'btn btn-primary', html: '+ Nuovo contatto', onClick: () => openContactForm() }),
      ]));
      const card = el('div', { class: 'card' });
      if (!contacts.length) {
        card.appendChild(emptyState('Nessun contatto',
          'Aggiungi i professionisti del tuo team (nutrizionista, osteopata, fisioterapista…): i tuoi clienti li vedranno nella loro app.'));
      } else {
        const rows = contacts.map((ct) => el('tr', {}, [
          el('td', {}, [
            el('div', { text: ct.name, style: 'font-weight:600' }),
            ct.role ? el('div', { class: 'muted', text: ct.role, style: 'font-size:12px' }) : null,
          ]),
          el('td', { class: 'muted' }, [
            ct.phone ? el('div', { text: '📞 ' + ct.phone }) : null,
            ct.email ? el('div', { text: '✉️ ' + ct.email }) : null,
          ]),
          el('td', { style: 'text-align:right; white-space:nowrap' }, [
            el('button', { class: 'btn btn-sm', text: 'Modifica', onClick: () => openContactForm(ct) }),
            el('button', { class: 'btn btn-sm btn-danger', text: 'Elimina', onClick: () => {
              confirmDialog(`Eliminare "${ct.name}" dalla rubrica?`, async () => {
                try { await API.deleteMyContact(ct.id); toast('Contatto eliminato', 'ok'); navigate('contacts'); }
                catch (err) { toast(err.message, 'err'); }
              }, { danger: true, confirmLabel: 'Elimina' });
            } }),
          ]),
        ]));
        card.appendChild(el('table', { class: 'table' }, [el('tbody', {}, rows)]));
      }
      c.appendChild(card);
    } catch (err) { showError(c, err); }
  }

  function openContactForm(existing) {
    const nameF = field('Nome', 'name', (existing && existing.name) || '');
    const roleF = field('Ruolo (es. Nutrizionista, Osteopata)', 'role', (existing && existing.role) || '');
    const phoneF = field('Telefono / WhatsApp', 'phone', (existing && existing.phone) || '');
    const emailF = field('Email', 'email', (existing && existing.email) || '');
    const notesF = field('Nota (facoltativa)', 'notes', (existing && existing.notes) || '');
    const val = (f) => f.querySelector('input').value.trim();
    const m = modal({
      title: existing ? 'Modifica contatto' : 'Nuovo contatto',
      body: el('div', {}, [nameF, roleF, phoneF, emailF, notesF]),
      footer: [
        el('button', { class: 'btn', text: 'Annulla', onClick: () => m.close() }),
        el('button', { class: 'btn btn-primary', text: 'Salva', onClick: async () => {
          const data = { name: val(nameF), role: val(roleF), phone: val(phoneF), email: val(emailF), notes: val(notesF) };
          if (!data.name) { toast('Il nome è obbligatorio', 'err'); return; }
          try {
            if (existing) await API.updateMyContact(existing.id, data);
            else await API.createMyContact(data);
            m.close(); toast('Contatto salvato', 'ok'); navigate('contacts');
          } catch (err) { toast(err.message, 'err'); }
        } }),
      ],
    });
  }

  // ---- Impostazioni del coach ---------------------------------------------
  // Avviso legale sull'attivazione della sezione nutrizione (art. 348 c.p.).
  function nutritionLegalHtml() {
    return 'In Italia fornire diete o anche <strong>semplici consigli alimentari</strong> è riservato a medici, '
      + 'biologi nutrizionisti e dietisti. Per un personal trainer non abilitato è <strong>esercizio abusivo della '
      + 'professione</strong> (art. 348 c.p.; Cassazione n. 20281/2017), con sanzioni penali. Attivando questa sezione '
      + 'te ne assumi la <strong>piena responsabilità</strong>: se non ti avvali di un nutrizionista, usa esclusivamente '
      + 'valori orientativi e indirizza il cliente a un professionista abilitato (vedi sezione Contatti).';
  }

  async function setNutrition(val) {
    try {
      const t = await API.updateMySettings({ nutrition_enabled: val });
      opts.trainer = Object.assign({}, opts.trainer, t);
      toast(val ? 'Sezione nutrizione attivata' : 'Sezione nutrizione disattivata', 'ok');
      navigate('settings');
    } catch (err) { toast(err.message, 'err'); }
  }

  function confirmNutritionOn() {
    confirmDialog(
      'Stai per attivare la sezione nutrizione (calorie e macronutrienti). In Italia anche i semplici consigli alimentari sono riservati a medici, biologi nutrizionisti e dietisti: per un personal trainer non abilitato è esercizio abusivo della professione (art. 348 c.p., Cassazione 20281/2017). Attivando, te ne assumi la piena responsabilità. Procedere?',
      () => setNutrition(1),
      { danger: true, confirmLabel: 'Attivo a mia responsabilità' }
    );
  }

  function renderSettings(c) {
    c.appendChild(topbar('Impostazioni', 'Aspetto, notifiche e nutrizione della tua console'));

    // 🎨 Aspetto (logo, colori, brand) — i controlli avanzati dipendono dal modulo.
    c.appendChild(el('div', { class: 'section-title' }, [el('h4', { text: '🎨 Aspetto' })]));
    c.appendChild(el('p', { class: 'muted', style: 'margin:0 0 8px; font-size:13px', text: 'Logo, colori e brand: valgono per la tua console e per l’app dei tuoi clienti.' }));
    c.appendChild(appearanceCard());

    // 🔔 Notifiche push (opzione)
    c.appendChild(el('div', { class: 'section-title', style: 'margin-top:18px' }, [el('h4', { text: '🔔 Notifiche' })]));
    c.appendChild(el('div', { class: 'card' }, [
      el('p', { class: 'muted', text: 'Attiva gli avvisi push per essere notificato quando un cliente invia un aggiornamento.' }),
      window.UI.pushButton(),
      el('p', { class: 'muted', style: 'font-size:11.5px; margin-top:6px', text: 'Su iPhone funziona solo con l’app installata nella schermata Home.' }),
    ]));

    // 🥗 Nutrizione (attivazione sotto responsabilità del coach)
    c.appendChild(el('div', { class: 'section-title', style: 'margin-top:18px' }, [el('h4', { text: '🥗 Nutrizione' })]));
    const on = isTrainer() && opts.trainer && Number(opts.trainer.nutrition_enabled);
    c.appendChild(el('div', { class: 'card' }, [
      el('h3', { text: 'Sezione nutrizione (calorie e macronutrienti)' }),
      el('div', { class: 'nutri-disclaimer', style: 'margin:10px 0' }, [
        el('span', { class: 'ico', text: on ? '⚠️' : 'ℹ️' }),
        el('div', {}, [
          el('strong', { text: on ? 'Attualmente ATTIVA — sotto la tua responsabilità' : 'Attualmente disattivata (consigliato)' }),
          el('p', { html: nutritionLegalHtml() }),
        ]),
      ]),
      on
        ? el('button', { class: 'btn btn-danger', text: 'Disattiva sezione nutrizione', onClick: () => setNutrition(0) })
        : el('button', { class: 'btn btn-primary', text: 'Attiva sotto la mia responsabilità', onClick: () => confirmNutritionOn() }),
      el('p', { class: 'muted', style: 'margin-top:10px; font-size:12px', text: 'La scelta vale per la tua console e per l’app di tutti i tuoi clienti.' }),
    ]));
  }

  // ---- Esercizi (catalogo) ------------------------------------------------
  const MUSCLE_GROUPS = ['Petto', 'Dorso', 'Spalle', 'Bicipiti', 'Tricipiti', 'Gambe', 'Addome'];

  async function renderExercises(c) {
    c.appendChild(topbar('Esercizi', 'Catalogo riutilizzabile nelle schede'));
    loading(c);
    try {
      const items = await API.listExerciseCatalog();
      clear(c);
      c.appendChild(topbar('Esercizi', `${items.length} esercizi in catalogo`, [
        el('button', { class: 'btn btn-primary', html: '+ Nuovo esercizio', onClick: () => openCatalogForm() }),
      ]));
      const card = el('div', { class: 'card' });
      if (!items.length) {
        card.appendChild(emptyState('Catalogo vuoto', 'Aggiungi il primo esercizio: poi lo ritrovi nei suggerimenti quando crei una scheda.'));
      } else {
        const groups = {};
        items.forEach((it) => { const g = it.muscle_group || 'Senza gruppo'; (groups[g] = groups[g] || []).push(it); });
        Object.keys(groups).forEach((g) => {
          card.appendChild(el('div', { class: 'section-title' }, [el('h4', { text: g }), el('span', { class: 'muted', text: groups[g].length + ' esercizi', style: 'font-size:12px' })]));
          const rows = groups[g].map((it) => el('tr', {}, [
            el('td', { text: it.name, style: 'font-weight:600' }),
            el('td', { class: 'muted', text: it.default_series
              ? `${it.default_series} serie` + (Array.isArray(it.default_reps) && it.default_reps.length ? ' × ' + it.default_reps.join('/') : '')
              : '—' }),
            el('td', { style: 'text-align:right; white-space:nowrap' }, [
              el('button', { class: 'btn btn-sm', text: 'Modifica', onClick: () => openCatalogForm(it) }),
              el('button', { class: 'btn btn-sm btn-danger', text: 'Elimina', onClick: () => {
                confirmDialog(`Eliminare "${it.name}" dal catalogo?`, async () => {
                  try { await API.deleteCatalogExercise(it.id); toast('Esercizio eliminato', 'ok'); navigate('exercises'); }
                  catch (err) { toast(err.message, 'err'); }
                }, { danger: true, confirmLabel: 'Elimina' });
              } }),
            ]),
          ]));
          card.appendChild(el('table', { class: 'table' }, [el('tbody', {}, rows)]));
        });
      }
      c.appendChild(card);
      c.appendChild(el('p', { class: 'muted', style: 'margin-top:14px; font-size:13px',
        text: 'Gli esercizi del catalogo vengono suggeriti (autocomplete) quando scrivi il nome di un esercizio in una scheda. Puoi comunque scrivere liberamente un nome non in elenco.' }));
    } catch (err) { showError(c, err); }
  }

  function openCatalogForm(existing) {
    const fit = (arr, n) => { const o = []; for (let i = 0; i < n; i += 1) o.push(arr && arr[i] != null ? String(arr[i]) : ''); return o; };
    const state = {
      name: (existing && existing.name) || '',
      muscle_group: (existing && existing.muscle_group) || '',
      num_series: (existing && existing.default_series) ? Number(existing.default_series) : 3,
      reps: (existing && Array.isArray(existing.default_reps)) ? existing.default_reps.slice() : [],
      intensity: (existing && Array.isArray(existing.default_intensity)) ? existing.default_intensity.slice() : [],
      media_url: (existing && existing.media_url) || '',
    };
    state.reps = fit(state.reps, state.num_series);
    state.intensity = fit(state.intensity, state.num_series);

    const body = el('div', {});
    function redrawForm() {
      clear(body);
      const nameF = field('Nome esercizio', 'name', state.name);
      nameF.querySelector('input').addEventListener('input', (e) => { state.name = e.target.value; });
      body.appendChild(nameF);

      const groupInput = el('input', { value: state.muscle_group, list: 'mg-list', placeholder: 'es. Petto' });
      groupInput.addEventListener('input', (e) => { state.muscle_group = e.target.value; });
      body.appendChild(el('div', { class: 'field' }, [
        el('label', { text: 'Gruppo muscolare (facoltativo)' }), groupInput,
        el('datalist', { id: 'mg-list' }, MUSCLE_GROUPS.map((g) => el('option', { value: g }))),
      ]));

      const seriesInp = el('input', { type: 'number', min: 1, max: 12, value: state.num_series });
      seriesInp.addEventListener('change', (e) => {
        state.num_series = Math.max(1, Math.min(12, Number(e.target.value) || 1));
        state.reps = fit(state.reps, state.num_series);
        state.intensity = fit(state.intensity, state.num_series);
        redrawForm();
      });
      body.appendChild(el('div', { class: 'field' }, [el('label', { text: 'Serie di default' }), seriesInp]));

      const rows = [];
      for (let s = 0; s < state.num_series; s += 1) {
        const r = el('input', { value: state.reps[s] || '', placeholder: 'rip.', style: 'width:110px' });
        r.addEventListener('input', (e) => { state.reps[s] = e.target.value; });
        const ii = el('input', { value: state.intensity[s] || '', placeholder: 'es. @8 / 80%', style: 'width:120px' });
        ii.addEventListener('input', (e) => { state.intensity[s] = e.target.value; });
        rows.push(el('tr', {}, [el('td', { class: 'muted', text: 'Serie ' + (s + 1) }), el('td', {}, r), el('td', {}, ii)]));
      }
      body.appendChild(el('div', { class: 'field' }, [
        el('label', { text: 'Ripetizioni e intensità di default (per serie)' }),
        el('table', { class: 'ex-table' }, [
          el('thead', {}, el('tr', {}, [el('th', { text: 'Serie' }), el('th', { text: 'Ripetizioni' }), el('th', { text: 'Intensità' })])),
          el('tbody', {}, rows),
        ]),
      ]));

      const mediaInp = el('input', { value: state.media_url, placeholder: 'https://… (immagine, GIF o video YouTube)' });
      mediaInp.addEventListener('input', (e) => { state.media_url = e.target.value; });
      const mediaField = el('div', { class: 'field' }, [el('label', { text: 'Media dimostrativo (link immagine/GIF/YouTube)' }), mediaInp]);
      const prev = window.UI.exerciseMedia(state.media_url);
      if (prev) mediaField.appendChild(prev);
      body.appendChild(mediaField);
    }
    redrawForm();

    const m = modal({
      title: existing ? 'Modifica esercizio' : 'Nuovo esercizio',
      body,
      footer: [
        el('button', { class: 'btn', text: 'Annulla', onClick: () => m.close() }),
        el('button', { class: 'btn btn-primary', text: 'Salva', onClick: async () => {
          if (!state.name.trim()) { toast('Il nome è obbligatorio', 'err'); return; }
          const data = { name: state.name.trim(), muscle_group: state.muscle_group.trim(),
            default_series: state.num_series, default_reps: state.reps, default_intensity: state.intensity,
            media_url: state.media_url.trim() };
          try {
            if (existing) await API.updateCatalogExercise(existing.id, data);
            else await API.createCatalogExercise(data);
            m.close(); toast('Esercizio salvato', 'ok'); navigate('exercises');
          } catch (err) { toast(err.message, 'err'); }
        } }),
      ],
    });
  }

  // ---- Dashboard ----------------------------------------------------------
  async function renderDashboard(c) {
    c.appendChild(topbar('Dashboard', 'Panoramica della palestra'));
    loading(c);
    try {
      const customers = await API.listCustomers();
      const overview = await API.plansOverview();
      clear(c);
      c.appendChild(topbar('Dashboard', 'Panoramica della palestra', [
        addCustomerButton(customers.length),
      ]));
      const totalPlans = customers.reduce((s, x) => s + Number(x.plans_count || 0), 0);
      const activePlans = customers.reduce((s, x) => s + Number(x.active_plans || 0), 0);
      const expiringSoon = overview.filter((p) => expiryInfo(p.end_date).danger).length;
      const stats = el('div', { class: 'stats' }, [
        stat('Clienti', customers.length, '👥'),
        stat('Schede attive', activePlans, '🟢'),
        stat('In scadenza (≤1 sett.)', expiringSoon, '⏰'),
        stat('Senza scheda attiva', customers.filter((x) => !Number(x.active_plans)).length, '⚠️'),
      ]);
      c.appendChild(stats);

      // Schede attive ordinate per scadenza (rosso quando manca ≤1 settimana).
      const expCard = el('div', { class: 'card' }, [el('h3', { text: 'Schede per scadenza' })]);
      if (!overview.length) {
        expCard.appendChild(emptyState('Nessuna scheda attiva', 'Attiva una scheda per vederla qui.'));
      } else {
        const rows = overview.map((p) => {
          const exp = expiryInfo(p.end_date);
          return el('tr', { class: 'row-click' + (exp.danger ? ' row-danger' : ''),
            onClick: () => navigate('monitor', { planId: p.id, customerId: p.customer_id }) }, [
            el('td', {}, el('div', { class: 'cell-name' }, [
              el('span', { class: 'avatar', text: initials(p.first_name, p.last_name) }),
              el('div', { style: 'font-weight:600' }, [window.UI.onlineDot(p.last_seen_secs), `${p.first_name} ${p.last_name}`]),
            ])),
            el('td', { text: p.name }),
            el('td', { class: 'muted', text: (p.start_date || p.end_date) ? `${fmtDate(p.start_date)} → ${fmtDate(p.end_date)}` : '—' }),
            el('td', {}, el('span', { class: 'badge ' + (exp.danger ? 'badge-danger' : 'badge-bozza'), text: exp.label })),
          ]);
        });
        expCard.appendChild(el('table', { class: 'table' }, [
          el('thead', {}, el('tr', {}, ['Cliente', 'Scheda', 'Periodo', 'Scadenza'].map((h) => el('th', { text: h })))),
          el('tbody', {}, rows),
        ]));
      }
      c.appendChild(expCard);

      const card = el('div', { class: 'card' }, [el('h3', { text: 'Clienti recenti' })]);
      if (!customers.length) {
        card.appendChild(emptyState('Nessun cliente', 'Aggiungi il primo cliente per iniziare.'));
      } else {
        card.appendChild(customerTable(customers.slice(0, 8)));
      }
      c.appendChild(card);
    } catch (err) { showError(c, err); }
  }

  function stat(label, value, ico) {
    return el('div', { class: 'stat' }, [
      el('span', { class: 'ico', text: ico }),
      el('div', { class: 'label', text: label }),
      el('div', { class: 'value', text: String(value) }),
    ]);
  }

  // ---- Clienti ------------------------------------------------------------
  async function renderCustomers(c) {
    c.appendChild(topbar('Clienti', 'Anagrafica e schede'));
    loading(c);
    try {
      const customers = await API.listCustomers();
      clear(c);
      c.appendChild(topbar('Clienti', `${customers.length} clienti`, [
        addCustomerButton(customers.length),
      ]));
      const card = el('div', { class: 'card' });
      if (!customers.length) card.appendChild(emptyState('Nessun cliente', 'Aggiungi il primo cliente.'));
      else card.appendChild(customerTable(customers));
      c.appendChild(card);
    } catch (err) { showError(c, err); }
  }

  function customerTable(customers) {
    const rows = customers.map((cu) => el('tr', { class: 'row-click', onClick: () => navigate('customer', { customerId: cu.id }) }, [
      el('td', {}, el('div', { class: 'cell-name' }, [
        el('span', { class: 'avatar', text: initials(cu.first_name, cu.last_name) }),
        el('div', {}, [
          el('div', { style: 'font-weight:600' }, [window.UI.onlineDot(cu.last_seen_secs), `${cu.first_name} ${cu.last_name}`]),
          el('div', { class: 'muted', text: cu.email || '—', style: 'font-size:12px' }),
        ]),
      ])),
      el('td', {}, paymentBadge(cu)),
      el('td', { text: String(cu.plans_count || 0) }),
      el('td', {}, Number(cu.active_plans)
        ? el('span', { class: 'badge badge-attiva', text: 'Attiva' })
        : el('span', { class: 'badge badge-bozza', text: 'Nessuna' })),
    ]));
    return el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, [
        el('th', { text: 'Cliente' }), el('th', { text: 'Pagamenti' }),
        el('th', { text: 'Schede' }), el('th', { text: 'Stato' }),
      ])),
      el('tbody', {}, rows),
    ]);
  }

  // Importo formattato in euro.
  function fmtEuro(v) {
    if (v == null || v === '') return null;
    const n = Number(v);
    if (Number.isNaN(n)) return null;
    return '€ ' + n.toFixed(2).replace('.', ',');
  }

  // Badge stato pagamenti del cliente (somma delle voci non saldate).
  function paymentBadge(cu) {
    const unpaid = Number(cu.unpaid_total || 0);
    if (unpaid > 0) return el('span', { class: 'badge badge-bozza', text: 'Da saldare ' + fmtEuro(unpaid) });
    return el('span', { class: 'badge badge-attiva', text: '✓ In regola' });
  }

  function openCustomerForm(existing) {
    const f = el('div', {}, [
      el('div', { class: 'grid-2' }, [
        field('Nome', 'first_name', existing && existing.first_name),
        field('Cognome', 'last_name', existing && existing.last_name),
      ]),
      el('div', { class: 'grid-2' }, [
        field('Email', 'email', existing && existing.email),
        field('Telefono', 'phone', existing && existing.phone),
      ]),
      el('div', { class: 'grid-3' }, [
        field('Data di nascita', 'birth_date', existing && (existing.birth_date || '').slice(0, 10), 'date'),
        field('Luogo di nascita', 'birth_place', existing && existing.birth_place),
        field('Sesso', 'gender', existing && existing.gender, 'select', { options: [
          { value: '', label: '—' }, { value: 'M', label: 'M' }, { value: 'F', label: 'F' }, { value: 'Altro', label: 'Altro' }] }),
      ]),
      addressField(existing),
      el('div', { class: 'section-title' }, [el('h4', { text: 'Misure e composizione corporea' })]),
      el('div', { class: 'grid-3' }, [
        field('Altezza (cm)', 'height_cm', existing && existing.height_cm, 'number'),
        field('Peso (kg)', 'weight_kg', existing && existing.weight_kg, 'number', { step: '0.1' }),
        field('Circonf. vita (cm)', 'waist_cm', existing && existing.waist_cm, 'number', { step: '0.1' }),
      ]),
      el('div', { class: 'grid-2' }, [
        field('Massa grassa (%)', 'fat_mass_pct', existing && existing.fat_mass_pct, 'number', { step: '0.1' }),
        field('Massa magra (kg)', 'lean_mass_kg', existing && existing.lean_mass_kg, 'number', { step: '0.1' }),
      ]),
      field('Obiettivo', 'goal', existing && existing.goal),
      field('Note', 'notes', existing && existing.notes, 'textarea'),
    ]);
    const m = modal({
      title: existing ? 'Modifica cliente' : 'Nuovo cliente',
      body: f,
      footer: [
        el('button', { class: 'btn', text: 'Annulla', onClick: () => m.close() }),
        el('button', { class: 'btn btn-primary', text: 'Salva', onClick: async () => {
          const data = formValues(f);
          if (!data.first_name || !data.last_name) { toast('Nome e cognome obbligatori', 'err'); return; }
          try {
            if (existing) await API.updateCustomer(existing.id, data);
            else await API.createCustomer(data);
            m.close(); toast('Cliente salvato', 'ok');
            if (state.view === 'customer') navigate('customer', { customerId: existing.id });
            else navigate(state.view);
          } catch (err) { toast(err.message, 'err'); }
        } }),
      ],
    });
  }

  // Indirizzo strutturato (via, CAP, città, provincia, paese) con ricerca a
  // runtime su OpenStreetMap Nominatim: scegliendo un suggerimento si compilano
  // tutti i campi. Niente API key; richieste debounced. Offline = inserimento manuale.
  function addressField(existing) {
    const ex = existing || {};
    const street = el('input', { name: 'address', type: 'text', value: ex.address || '', placeholder: 'Via e numero civico — digita per cercare', autocomplete: 'off' });
    const cap = el('input', { name: 'address_cap', value: ex.address_cap || '', placeholder: 'CAP' });
    const city = el('input', { name: 'address_city', value: ex.address_city || '', placeholder: 'Città' });
    const prov = el('input', { name: 'address_province', value: ex.address_province || '', placeholder: 'Provincia' });
    const country = el('input', { name: 'address_country', value: ex.address_country || (existing ? '' : 'Italia'), placeholder: 'Paese' });
    const list = el('div', { style: 'position:absolute; top:100%; left:0; right:0; z-index:60; background:var(--surface); border:1px solid var(--line); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,.18); display:none; max-height:220px; overflow:auto' });
    const hide = () => { list.style.display = 'none'; clear(list); };
    let timer = null;
    street.addEventListener('input', () => {
      const q = street.value.trim();
      if (timer) clearTimeout(timer);
      if (q.length < 4) { hide(); return; }
      timer = setTimeout(async () => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&accept-language=it&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
          const arr = await r.json();
          clear(list);
          if (!arr.length) { hide(); return; }
          arr.forEach((a) => {
            const it = el('div', { text: a.display_name, style: 'padding:8px 10px; cursor:pointer; font-size:13px; border-bottom:1px solid var(--line)' });
            it.addEventListener('mousedown', (e) => {
              e.preventDefault();
              const ad = a.address || {};
              const road = [ad.road, ad.house_number].filter(Boolean).join(' ');
              street.value = road || (a.display_name.split(',')[0] || '');
              cap.value = ad.postcode || '';
              city.value = ad.city || ad.town || ad.village || ad.municipality || '';
              prov.value = ad.county || ad.state_district || ad.province || ad.state || '';
              country.value = ad.country || '';
              hide();
            });
            list.appendChild(it);
          });
          list.style.display = 'block';
        } catch (e) { hide(); }
      }, 500);
    });
    street.addEventListener('blur', () => setTimeout(hide, 150));
    return el('div', {}, [
      el('div', { class: 'section-title' }, [el('h4', { text: 'Indirizzo (residenza / fatturazione)' })]),
      el('div', { class: 'field', style: 'position:relative' }, [el('label', { text: 'Via e numero civico' }), street, list]),
      el('div', { class: 'grid-3' }, [
        el('div', { class: 'field' }, [el('label', { text: 'CAP' }), cap]),
        el('div', { class: 'field' }, [el('label', { text: 'Città' }), city]),
        el('div', { class: 'field' }, [el('label', { text: 'Provincia' }), prov]),
      ]),
      el('div', { class: 'field' }, [el('label', { text: 'Paese' }), country]),
    ]);
  }

  // ---- Pagamenti del cliente ----------------------------------------------
  const PAYMENT_TYPE_LABELS = { abbonamento: 'Abbonamento', schede: 'Schede', extra: 'Prestazione extra', altro: 'Altro' };

  async function paymentsCard(customerId) {
    const card = el('div', { class: 'card' }, [
      el('div', { class: 'row-between' }, [
        el('h3', { text: 'Pagamenti', style: 'margin:0' }),
        el('button', { class: 'btn btn-sm btn-primary', html: '+ Voce', onClick: () => openPaymentForm(customerId) }),
      ]),
    ]);
    let pays = [];
    try { pays = await API.listPayments(customerId); } catch (e) { pays = []; }
    if (!pays.length) {
      card.appendChild(el('p', { class: 'muted', text: 'Nessuna voce. Aggiungi abbonamenti, schede o prestazioni extra.', style: 'margin-top:10px' }));
      return card;
    }
    const rows = pays.map((p) => el('tr', {}, [
      el('td', { text: PAYMENT_TYPE_LABELS[p.type] || p.type, style: 'font-weight:600' }),
      el('td', { text: fmtEuro(p.amount) || '—' }),
      el('td', { text: p.due_date ? fmtDate(p.due_date) : '—' }),
      el('td', {}, Number(p.paid)
        ? el('span', { class: 'badge badge-attiva', text: '✓ Pagato' })
        : el('span', { class: 'badge badge-bozza', text: 'Da saldare' })),
      el('td', { class: 'muted', text: p.note || '' }),
      el('td', { style: 'text-align:right; white-space:nowrap' }, [
        el('button', { class: 'btn btn-sm', text: 'Modifica', onClick: () => openPaymentForm(customerId, p) }),
        el('button', { class: 'btn btn-sm btn-danger', text: 'Elimina', onClick: () => {
          confirmDialog('Eliminare questa voce di pagamento?', async () => {
            try { await API.deletePayment(p.id); toast('Voce eliminata', 'ok'); navigate('customer', { customerId }); }
            catch (err) { toast(err.message, 'err'); }
          }, { danger: true, confirmLabel: 'Elimina' });
        } }),
      ]),
    ]));
    card.appendChild(el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, [
        el('th', { text: 'Tipo' }), el('th', { text: 'Importo' }), el('th', { text: 'Scadenza' }),
        el('th', { text: 'Stato' }), el('th', { text: 'Nota' }), el('th', { text: '' }),
      ])),
      el('tbody', {}, rows),
    ]));
    const totPaid = pays.filter((p) => Number(p.paid)).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totDue = pays.filter((p) => !Number(p.paid)).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    card.appendChild(el('div', { class: 'muted', style: 'margin-top:8px; font-size:13px' },
      `Incassato: ${fmtEuro(totPaid) || '€ 0,00'}  ·  Da saldare: ${fmtEuro(totDue) || '€ 0,00'}`));
    return card;
  }

  function openPaymentForm(customerId, existing) {
    const body = el('div', {}, [
      el('div', { class: 'grid-2' }, [
        field('Tipo', 'type', existing ? existing.type : 'abbonamento', 'select', { options: [
          { value: 'abbonamento', label: 'Abbonamento' }, { value: 'schede', label: 'Schede' },
          { value: 'extra', label: 'Prestazione extra' }, { value: 'altro', label: 'Altro' }] }),
        field('Importo (€)', 'amount', existing && existing.amount, 'number', { step: '0.01' }),
      ]),
      el('div', { class: 'grid-2' }, [
        field('Scadenza', 'due_date', existing && (existing.due_date || '').slice(0, 10), 'date'),
        field('Pagato', 'paid', existing ? Number(existing.paid || 0) : 0, 'select', { options: [
          { value: 0, label: 'No' }, { value: 1, label: 'Sì' }] }),
      ]),
      field('Nota', 'note', existing && existing.note, 'textarea'),
    ]);
    const m = modal({
      title: existing ? 'Modifica voce' : 'Nuova voce di pagamento',
      body,
      footer: [
        el('button', { class: 'btn', text: 'Annulla', onClick: () => m.close() }),
        el('button', { class: 'btn btn-primary', text: 'Salva', onClick: async () => {
          const data = formValues(body);
          try {
            if (existing) await API.updatePayment(existing.id, data);
            else await API.createPayment(customerId, data);
            m.close(); toast('Voce salvata', 'ok'); navigate('customer', { customerId });
          } catch (err) { toast(err.message, 'err'); }
        } }),
      ],
    });
  }

  // ---- Dettaglio cliente --------------------------------------------------
  async function renderCustomerDetail(c) {
    loading(c);
    try {
      const cu = await API.getCustomer(state.customerId);
      const plans = await API.customerPlans(state.customerId);
      clear(c);
      c.appendChild(topbar(`${window.UI.isOnlineSecs(cu.last_seen_secs) ? '🟢 ' : ''}${cu.first_name} ${cu.last_name}`, 'Clienti › Dettaglio', [
        el('button', { class: 'btn', text: '← Indietro', onClick: () => navigate('customers') }),
        el('button', { class: 'btn', text: 'Modifica', onClick: () => openCustomerForm(cu) }),
        el('button', { class: 'btn btn-primary', html: '+ Nuova scheda', onClick: () => openPlanEditor(null, cu.id) }),
      ]));

      // Anagrafica
      const bmi = (cu.weight_kg && cu.height_cm)
        ? (Number(cu.weight_kg) / Math.pow(Number(cu.height_cm) / 100, 2)) : null;
      const fullAddr = [
        cu.address,
        [cu.address_cap, cu.address_city].filter(Boolean).join(' '),
        cu.address_province, cu.address_country,
      ].filter(Boolean).join(', ');
      const info = el('div', { class: 'card' }, [
        el('h3', { text: 'Anagrafica' }),
        el('div', { class: 'grid-3' }, [
          infoLine('Email', cu.email), infoLine('Telefono', cu.phone),
          infoLine('Nascita', cu.birth_date ? (fmtDate(cu.birth_date) + (cu.birth_place ? ' · ' + cu.birth_place : '')) : (cu.birth_place || null)),
          infoLine('Sesso', cu.gender),
          infoLine('Altezza', cu.height_cm ? cu.height_cm + ' cm' : null),
          infoLine('Peso', cu.weight_kg ? cu.weight_kg + ' kg' : null),
          infoLine('BMI', bmi ? bmi.toFixed(1) : null),
          infoLine('Massa grassa', cu.fat_mass_pct ? cu.fat_mass_pct + ' %' : null),
          infoLine('Massa magra', cu.lean_mass_kg ? cu.lean_mass_kg + ' kg' : null),
          infoLine('Circonf. vita', cu.waist_cm ? cu.waist_cm + ' cm' : null),
          infoLine('Obiettivo', cu.goal),
        ]),
        fullAddr ? infoLine('Indirizzo', fullAddr) : null,
        cu.notes ? el('p', { class: 'muted', text: cu.notes, style: 'margin-top:8px' }) : null,
      ]);
      c.appendChild(info);

      // Pagamenti (registro voci: abbonamento, schede, prestazioni extra…)
      c.appendChild(await paymentsCard(cu.id));

      // Link personale del cliente (PWA) + invio rapido via WhatsApp.
      const linkCard = clientLinkCard(cu);
      if (linkCard) c.appendChild(linkCard);

      // Schede
      const plansCard = el('div', { class: 'card' }, [el('h3', { text: 'Schede di allenamento' })]);
      if (!plans.length) {
        plansCard.appendChild(emptyState('Nessuna scheda', 'Crea la prima scheda per questo cliente.'));
      } else {
        const rows = plans.map((p) => {
          const exp = expiryInfo(p.end_date);
          const danger = p.status === 'attiva' && exp.danger;
          return el('tr', danger ? { class: 'row-danger' } : {}, [
          el('td', { text: p.name, style: 'font-weight:600' }),
          el('td', { text: `${p.duration_weeks} sett.` }),
          el('td', { class: danger ? '' : 'muted', text: (p.start_date || p.end_date) ? `${fmtDate(p.start_date)} → ${fmtDate(p.end_date)}` : '—' }),
          el('td', {}, p.status === 'attiva'
            ? el('span', { class: 'badge ' + (danger ? 'badge-danger' : 'badge-attiva'), text: danger ? exp.label : 'attiva' })
            : el('span', { class: `badge badge-${p.status}`, text: p.status })),
          el('td', { text: 'v' + p.version }),
          el('td', { style: 'text-align:right; white-space:nowrap' }, [
            el('button', { class: 'btn btn-sm', text: 'Apri', onClick: () => openPlanEditor(p.id) }),
            el('button', { class: 'btn btn-sm', text: 'Monitora', onClick: () => navigate('monitor', { planId: p.id, customerId: cu.id }) }),
            el('button', { class: 'btn btn-sm', text: 'Duplica', onClick: () => openDuplicate(p) }),
            el('button', { class: 'btn btn-sm btn-danger', text: 'Elimina', onClick: () => {
              confirmDialog(`Eliminare la scheda "${p.name}"? L'azione è definitiva e rimuove anche progressi e foto collegati.`, async () => {
                try { await API.deletePlan(p.id); toast('Scheda eliminata', 'ok'); navigate('customer', { customerId: cu.id }); }
                catch (err) { toast(err.message, 'err'); }
              }, { danger: true, confirmLabel: 'Elimina' });
            } }),
          ]),
          ]);
        });
        plansCard.appendChild(el('table', { class: 'table' }, [
          el('thead', {}, el('tr', {}, ['Nome', 'Durata', 'Periodo', 'Stato', 'Ver.', ''].map((h) => el('th', { text: h })))),
          el('tbody', {}, rows),
        ]));
      }
      c.appendChild(plansCard);

      el('div', {}); // no-op
      const danger = el('div', { style: 'margin-top:18px' }, [
        el('button', { class: 'btn btn-danger btn-sm', text: 'Elimina cliente', onClick: () => {
          confirmDialog('Eliminare definitivamente il cliente e tutte le sue schede?', async () => {
            await API.deleteCustomer(cu.id); toast('Cliente eliminato', 'ok'); navigate('customers');
          }, { danger: true, confirmLabel: 'Elimina' });
        } }),
      ]);
      c.appendChild(danger);
    } catch (err) { showError(c, err); }
  }

  function infoLine(k, v) {
    return el('div', { style: 'margin-bottom:8px' }, [
      el('div', { class: 'muted', text: k, style: 'font-size:12px' }),
      el('div', { text: v || '—', style: 'font-weight:600' }),
    ]);
  }

  // Card col link personale del cliente: copia + invio su WhatsApp.
  function clientLinkCard(cu) {
    if (!cu.access_token) return null;
    const link = `${window.location.origin}/?c=${cu.access_token}`;
    const digits = (cu.phone || '').replace(/\D/g, '');
    const msg = `Ciao ${cu.first_name}! Questo è il tuo link personale per la scheda di allenamento: ${link}`;
    const wa = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
    const linkInput = el('input', { value: link, readonly: true, style: 'font-size:13px' });
    linkInput.addEventListener('click', () => linkInput.select());
    return el('div', { class: 'card' }, [
      el('h3', { text: '🔗 Link personale del cliente' }),
      el('p', { class: 'muted', text: 'Invialo una volta sola: il link resta valido e i contenuti si aggiornano da soli.' }),
      el('div', { class: 'field' }, [linkInput]),
      el('div', { style: 'display:flex; gap:8px; flex-wrap:wrap' }, [
        el('button', { class: 'btn', html: '📋 Copia link', onClick: () => {
          if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => toast('Link copiato', 'ok'), () => toast('Copia non riuscita', 'err'));
          else { linkInput.select(); document.execCommand('copy'); toast('Link copiato', 'ok'); }
        } }),
        el('a', { class: 'btn btn-accent', href: wa, target: '_blank', html: '🟢 Invia su WhatsApp' }),
      ]),
    ]);
  }

  // ---- Editor scheda ------------------------------------------------------
  async function openPlanEditor(planId, customerId) {
    let plan;
    if (planId) {
      plan = await API.getPlan(planId);
    } else {
      plan = { customer_id: customerId, name: '', duration_weeks: 8, status: 'bozza', version: 1,
        start_date: '', end_date: '', price: '',
        days: [{ name: 'Giorno A', exercises: [defaultExercise()] }],
        nutrition: { allenamento: null, riposo: null } };
    }

    let catalog = [];
    try { catalog = await API.listExerciseCatalog(); } catch (e) { catalog = []; }

    const body = el('div', {});
    const m = modal({ wide: true, persistent: true, title: planId ? 'Modifica scheda' : 'Nuova scheda', body, footer: [] });

    // Nome scheda accanto al titolo (intestazione compatta).
    const headEl = m.box.querySelector('.modal-head');
    const headName = el('input', { class: 'plan-name-input', value: plan.name || '', placeholder: 'Nome scheda…' });
    headName.addEventListener('input', (e) => { plan.name = e.target.value; });
    headEl.insertBefore(headName, headEl.querySelector('.x'));

    // Settimana su cui si stanno impostando le ripetizioni: 'all' = default (tutte).
    let editWeek = 'all';
    // Giorno attualmente visualizzato nell'editor (indice in plan.days).
    let editDay = 0;

    // Schemi per-serie/per-settimana presenti su ogni esercizio.
    const SCHEMES = ['reps_scheme', 'intensity_scheme'];

    function defaultExercise() {
      return { name: '', num_series: 3, suggested_weight: '', rest: '', notes: '', superset_group: '', unilateral: 0,
        reps_scheme: { default: ['', '', ''], overrides: {} },
        intensity_scheme: { default: ['', '', ''], overrides: {} } };
    }
    function fitArr(arr, n) {
      const o = [];
      for (let i = 0; i < n; i += 1) o.push(arr && arr[i] != null ? String(arr[i]) : '');
      return o;
    }
    function ensureScheme(ex) {
      const n = Number(ex.num_series) || 1;
      SCHEMES.forEach((key) => {
        if (!ex[key] || typeof ex[key] !== 'object') ex[key] = { default: [], overrides: {} };
        if (!Array.isArray(ex[key].default)) ex[key].default = [];
        if (!ex[key].overrides) ex[key].overrides = {};
        ex[key].default = fitArr(ex[key].default, n);
        Object.keys(ex[key].overrides).forEach((w) => { ex[key].overrides[w] = fitArr(ex[key].overrides[w], n); });
      });
    }
    function schemeArrForEdit(ex, key) {
      ensureScheme(ex);
      if (editWeek === 'all') return ex[key].default;
      return ex[key].overrides[editWeek] || ex[key].default;
    }
    function setSchemeVal(ex, key, i, val) {
      ensureScheme(ex);
      if (editWeek === 'all') { ex[key].default[i] = val; return; }
      if (!ex[key].overrides[editWeek]) ex[key].overrides[editWeek] = ex[key].default.slice();
      ex[key].overrides[editWeek][i] = val;
    }
    function setNumSeries(ex, val) {
      ex.num_series = Math.max(1, Math.min(12, Number(val) || 1));
      ensureScheme(ex);
      redraw();
    }
    // Rimuove la settimana w: scala gli override (di tutti gli schemi) delle settimane successive.
    function removeWeek(w) {
      if (plan.duration_weeks <= 1) return;
      plan.days.forEach((d) => d.exercises.forEach((ex) => {
        ensureScheme(ex);
        SCHEMES.forEach((key) => {
          const ov = ex[key].overrides; const next = {};
          Object.keys(ov).forEach((k) => {
            const kn = Number(k);
            if (kn < w) next[k] = ov[k];
            else if (kn > w) next[String(kn - 1)] = ov[k];
          });
          ex[key].overrides = next;
        });
      }));
      plan.duration_weeks -= 1;
      editWeek = 'all';
      redraw();
    }
    function labeled(label, input) { return el('div', { class: 'field' }, [el('label', { text: label }), input]); }

    // Pop-up di scelta esercizio dal catalogo, con ricerca e raggruppamento.
    function openExercisePicker(onPick) {
      const search = el('input', { placeholder: 'Cerca esercizio…' });
      const listWrap = el('div', { class: 'picker-list' });
      function renderList() {
        clear(listWrap);
        const f = (search.value || '').toLowerCase();
        const items = catalog.filter((c) => c.name.toLowerCase().includes(f));
        if (!items.length) {
          listWrap.appendChild(el('p', { class: 'muted', style: 'padding:8px', text: 'Nessun esercizio in catalogo. Puoi scriverlo a mano nel campo nome.' }));
          return;
        }
        const groups = {};
        items.forEach((it) => { const g = it.muscle_group || 'Senza gruppo'; (groups[g] = groups[g] || []).push(it); });
        Object.keys(groups).forEach((g) => {
          listWrap.appendChild(el('div', { class: 'picker-group', text: g }));
          groups[g].forEach((it) => {
            const meta = it.default_series ? `${it.default_series} serie` + (Array.isArray(it.default_reps) && it.default_reps.length ? ' × ' + it.default_reps.join('/') : '') : '';
            listWrap.appendChild(el('button', { class: 'picker-item', onClick: () => { onPick(it); m.close(); } }, [
              el('span', { text: it.name }),
              meta ? el('span', { class: 'picker-meta', text: meta }) : null,
            ]));
          });
        });
      }
      search.addEventListener('input', renderList);
      const m = modal({
        title: 'Scegli un esercizio',
        body: el('div', {}, [el('div', { class: 'field' }, [search]), listWrap]),
        footer: [el('button', { class: 'btn', text: 'Chiudi', onClick: () => m.close() })],
      });
      renderList();
    }

    function importFromPdf() {
      const inp = el('input', { type: 'file', accept: 'application/pdf' });
      inp.addEventListener('change', () => {
        const file = inp.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            toast('Lettura PDF in corso…');
            const draft = await API.importPdf(reader.result);
            if (!draft.days || !draft.days.length) { toast('Nessun esercizio riconosciuto nel PDF', 'err'); return; }
            if (!plan.name && draft.name) plan.name = draft.name;
            plan.duration_weeks = draft.duration_weeks || plan.duration_weeks;
            plan.start_date = draft.start_date || plan.start_date;
            plan.end_date = draft.end_date || plan.end_date;
            plan.days = draft.days;
            plan._imported = true;
            editDay = 0; editWeek = 'all';
            headName.value = plan.name || '';
            redraw();
            toast('Bozza importata — controlla tutto', 'ok');
          } catch (err) { toast(err.message || 'Import non riuscito', 'err'); }
        };
        reader.readAsDataURL(file);
      });
      inp.click();
    }

    function redraw() {
      clear(body);

      // Import da PDF (produce una bozza da verificare).
      body.appendChild(el('div', { style: 'margin-bottom:10px' }, [
        el('button', { class: 'btn btn-sm', html: '📄 Importa da PDF', onClick: () => importFromPdf() }),
      ]));
      if (plan._imported) {
        body.appendChild(el('div', { class: 'nutri-disclaimer', style: 'margin-bottom:12px' }, [
          el('span', { class: 'ico', text: '⚠️' }),
          el('div', {}, [
            el('strong', { text: 'Importato da PDF — da verificare' }),
            el('p', { text: "Controlla esercizi, serie, ripetizioni e giorni: l'interpretazione automatica può contenere errori o righe di troppo. Gli schemi originali di tutte le settimane sono salvati nelle note di ogni esercizio." }),
          ]),
        ]));
      }

      // Date di inizio e fine della scheda.
      const startInp = el('input', { type: 'date', value: (plan.start_date || '').slice(0, 10) });
      startInp.addEventListener('change', (e) => { plan.start_date = e.target.value; });
      const endInp = el('input', { type: 'date', value: (plan.end_date || '').slice(0, 10) });
      endInp.addEventListener('change', (e) => { plan.end_date = e.target.value; });
      const calcBtn = el('button', { class: 'btn btn-sm', text: '↳ Calcola fine (inizio + durata)', style: 'margin-top:-4px',
        onClick: () => {
          if (!plan.start_date) { toast('Imposta prima la data di inizio', 'err'); return; }
          const d = new Date(plan.start_date); d.setDate(d.getDate() + plan.duration_weeks * 7);
          plan.end_date = d.toISOString().slice(0, 10); redraw();
        } });
      body.appendChild(el('div', { class: 'grid-2' }, [labeled('Data inizio', startInp), labeled('Data fine', endInp)]));
      body.appendChild(calcBtn);

      // Settimane e ripetizioni: Default + una per settimana + "+ Settimana".
      const weekBtns = el('div', { class: 'week-pills' });
      const mkWeekBtn = (val, label) => el('button', {
        class: 'week-pill' + (editWeek === val ? ' active' : ''),
        text: label, onClick: () => { editWeek = val; redraw(); },
      });
      weekBtns.appendChild(mkWeekBtn('all', 'Default'));
      for (let w = 1; w <= plan.duration_weeks; w += 1) weekBtns.appendChild(mkWeekBtn(String(w), 'Sett. ' + w));
      weekBtns.appendChild(el('button', {
        class: 'btn btn-sm', html: '+ Settimana', style: 'flex:0 0 auto',
        onClick: () => { if (plan.duration_weeks < 52) { plan.duration_weeks += 1; editWeek = String(plan.duration_weeks); redraw(); } },
      }));
      const weekHint = editWeek !== 'all'
        ? el('div', { style: 'display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:6px' }, [
          el('small', { class: 'muted', style: 'font-size:11px', text: `Stai personalizzando solo la settimana ${editWeek}. Le altre restano sul "Default".` }),
          el('button', { class: 'btn btn-sm btn-danger', text: 'Rimuovi settimana ' + editWeek, onClick: () => removeWeek(Number(editWeek)) }),
        ])
        : el('small', { class: 'muted', style: 'font-size:11px; display:block; margin-top:6px', text: 'Le ripetizioni del "Default" valgono per tutte le settimane. Aggiungi o scegli una settimana per differenziarla.' });
      body.appendChild(el('div', { class: 'field' }, [
        el('label', { text: 'Settimane, ripetizioni e intensità' }), weekBtns, weekHint,
      ]));

      // Giorni: un pulsante per giorno, si mostra solo quello selezionato.
      if (editDay >= plan.days.length) editDay = Math.max(0, plan.days.length - 1);
      body.appendChild(el('div', { class: 'section-title' }, [el('h4', { text: 'Struttura settimanale' })]));
      const dayTabs = el('div', { class: 'week-pills' });
      plan.days.forEach((d, di) => {
        dayTabs.appendChild(el('button', {
          class: 'week-pill' + (di === editDay ? ' active' : ''),
          text: d.name || ('Giorno ' + (di + 1)),
          onClick: () => { editDay = di; redraw(); },
        }));
      });
      dayTabs.appendChild(el('button', {
        class: 'btn btn-sm', html: '+ Giorno', style: 'flex:0 0 auto',
        onClick: () => {
          plan.days.push({ name: 'Giorno ' + String.fromCharCode(65 + plan.days.length), exercises: [defaultExercise()] });
          editDay = plan.days.length - 1; redraw();
        },
      }));
      body.appendChild(dayTabs);
      if (plan.days.length) body.appendChild(dayBlock(plan.days[editDay], editDay));
      else body.appendChild(el('p', { class: 'muted', text: 'Nessun giorno. Aggiungine uno con "+ Giorno".' }));

      // Nutrizione — sezione attivabile dal coach, spenta di default (in Italia
      // la dieta è riservata a professionisti abilitati). L'admin la vede sempre.
      body.appendChild(el('hr', { class: 'hr' }));
      body.appendChild(el('div', { class: 'section-title' }, [el('h4', { text: 'Piano nutrizionale' })]));
      const nutritionOn = opts.role === 'admin' || (opts.trainer && Number(opts.trainer.nutrition_enabled));
      if (nutritionOn) {
        body.appendChild(el('div', { class: 'nutri-disclaimer', style: 'margin-bottom:12px' }, [
          el('span', { class: 'ico', text: '⚠️' }),
          el('div', {}, [
            el('strong', { text: 'Solo valori indicativi' }),
            el('p', { text: 'Calorie e macro sono indicazioni generali e orientative, non una prescrizione dietetica. La dieta personalizzata è riservata a medici, biologi nutrizionisti e dietisti: per quella indirizza il cliente a un professionista abilitato (vedi sezione Contatti).' }),
          ]),
        ]));
        body.appendChild(el('div', { class: 'nutri-grid' }, [
          nutriBlock('Giorno di allenamento', 'allenamento'),
          nutriBlock('Giorno di riposo', 'riposo'),
        ]));
        if (opts.role === 'trainer') {
          body.appendChild(el('button', { class: 'btn btn-sm', style: 'margin-top:8px', text: 'Disattiva sezione nutrizione', onClick: async () => {
            try {
              const t = await API.updateMySettings({ nutrition_enabled: 0 });
              opts.trainer = Object.assign({}, opts.trainer, t);
              toast('Sezione nutrizione disattivata', 'ok'); redraw();
            } catch (err) { toast(err.message, 'err'); }
          } }));
        }
      } else {
        body.appendChild(el('div', { class: 'nutri-disclaimer', style: 'margin-bottom:12px' }, [
          el('span', { class: 'ico', text: 'ℹ️' }),
          el('div', {}, [
            el('strong', { text: 'Sezione nutrizione disattivata' }),
            el('p', { text: 'In Italia anche i semplici consigli alimentari sono riservati a medici, biologi nutrizionisti e dietisti: per un PT non abilitato è esercizio abusivo della professione (art. 348 c.p., Cassazione 20281/2017). Consigliato: tienila spenta e collega un nutrizionista nella sezione Contatti. La puoi attivare, sotto la tua responsabilità, da Impostazioni → Sezione nutrizione.' }),
            el('button', { class: 'btn btn-sm', style: 'margin-top:8px', text: '⚙️ Vai a Impostazioni', onClick: () => { m.close(); navigate('settings'); } }),
          ]),
        ]));
      }
    }

    function dayBlock(d, di) {
      const exWrap = el('div', {});
      d.exercises.forEach((ex, ei) => exWrap.appendChild(exerciseBlock(d, ex, ei)));
      if (!d.exercises.length) exWrap.appendChild(el('p', { class: 'muted', text: 'Nessun esercizio. Aggiungine uno.', style: 'font-size:13px' }));
      return el('div', { class: 'day-block' }, [
        el('div', { class: 'day-head' }, [
          el('input', { value: d.name, onInput: (e) => { d.name = e.target.value; }, onChange: () => redraw() }),
          el('button', { class: 'btn btn-sm', html: '+ Esercizio', onClick: () => { d.exercises.push(defaultExercise()); redraw(); } }),
          el('button', { class: 'btn btn-sm btn-danger', text: 'Elimina giorno', onClick: () => { plan.days.splice(di, 1); redraw(); } }),
        ]),
        el('div', { style: 'padding:12px' }, exWrap),
      ]);
    }

    function exerciseBlock(d, ex, ei) {
      ensureScheme(ex);
      const nameInp = el('input', { value: ex.name || '', placeholder: 'Nome esercizio (scrivi o scegli dalla lista)', onInput: (e) => { ex.name = e.target.value; } });
      const pickBtn = el('button', { class: 'btn btn-sm', html: '📋 Scegli', title: 'Scegli dal catalogo', style: 'flex:0 0 auto',
        onClick: () => openExercisePicker((item) => {
          ex.name = item.name;
          // Pre-compila serie, ripetizioni e intensita' di default dell'esercizio scelto.
          if (item.default_series) ex.num_series = Number(item.default_series);
          if (Array.isArray(item.default_reps) && item.default_reps.length) {
            ex.reps_scheme = { default: item.default_reps.slice(), overrides: {} };
          }
          if (Array.isArray(item.default_intensity) && item.default_intensity.length) {
            ex.intensity_scheme = { default: item.default_intensity.slice(), overrides: {} };
          }
          ensureScheme(ex);
          redraw();
        }) });
      const seriesInp = el('input', { type: 'number', min: 1, max: 12, value: ex.num_series, style: 'width:100%' });
      seriesInp.addEventListener('change', (e) => setNumSeries(ex, e.target.value));
      const weightInp = el('input', { value: ex.suggested_weight || '', placeholder: 'es. 60 kg', onInput: (e) => { ex.suggested_weight = e.target.value; } });
      const restInp = el('input', { value: ex.rest || '', placeholder: "es. 90''", onInput: (e) => { ex.rest = e.target.value; } });
      const noteInp = el('input', { value: ex.notes || '', placeholder: "Nota valida per tutto l'esercizio", onInput: (e) => { ex.notes = e.target.value; } });

      // Tabella serie -> ripetizioni + intensita' (per la settimana selezionata)
      const reps = schemeArrForEdit(ex, 'reps_scheme');
      const inten = schemeArrForEdit(ex, 'intensity_scheme');
      const rows = [];
      for (let s = 0; s < ex.num_series; s += 1) {
        const repInp = el('input', { value: reps[s] != null ? reps[s] : '', placeholder: 'rip.', style: 'width:110px' });
        repInp.addEventListener('input', (e) => setSchemeVal(ex, 'reps_scheme', s, e.target.value));
        const intInp = el('input', { value: inten[s] != null ? inten[s] : '', placeholder: 'es. @8 / 80%', style: 'width:120px' });
        intInp.addEventListener('input', (e) => setSchemeVal(ex, 'intensity_scheme', s, e.target.value));
        rows.push(el('tr', {}, [
          el('td', { class: 'muted', text: 'Serie ' + (s + 1) }),
          el('td', {}, repInp),
          el('td', {}, intInp),
        ]));
      }
      const wkLabel = editWeek === 'all' ? '' : ' (sett. ' + editWeek + ')';
      const seriesTable = el('table', { class: 'ex-table', style: 'margin-top:8px' }, [
        el('thead', {}, el('tr', {}, [
          el('th', { text: 'Serie' }),
          el('th', { text: 'Ripetizioni' + wkLabel }),
          el('th', { text: 'Intensità' + wkLabel }),
        ])),
        el('tbody', {}, rows),
      ]);

      const ssSel = el('select', {}, [['', '—'], ['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D'], ['E', 'E']].map(([v, l]) => {
        const o = el('option', { value: v, text: l });
        if ((ex.superset_group || '') === v) o.selected = true;
        return o;
      }));
      ssSel.addEventListener('change', (e) => { ex.superset_group = e.target.value; redraw(); });

      const uniChk = el('input', { type: 'checkbox' });
      uniChk.checked = !!Number(ex.unilateral);
      uniChk.addEventListener('change', (e) => { ex.unilateral = e.target.checked ? 1 : 0; redraw(); });
      const uniRow = el('label', { style: 'display:flex; align-items:center; gap:8px; margin-top:10px; cursor:pointer; font-size:14px' }, [
        uniChk, el('span', { text: '↔️ Esercizio monolaterale (esecuzione un lato alla volta)' }),
      ]);

      return el('div', { class: 'card', style: 'margin-bottom:12px; padding:14px' }, [
        el('div', { class: 'ex-name-row' }, [
          el('div', { style: 'flex:1' }, nameInp),
          ex.superset_group ? el('span', { class: 'badge badge-attiva', text: '🔗 Superset ' + ex.superset_group, style: 'align-self:center' }) : null,
          Number(ex.unilateral) ? el('span', { class: 'badge', text: '↔️ Mono', style: 'align-self:center' }) : null,
          pickBtn,
          el('button', { class: 'btn btn-sm btn-danger', html: '🗑', title: 'Rimuovi esercizio',
            onClick: () => { d.exercises.splice(ei, 1); redraw(); } }),
        ]),
        el('div', { class: 'grid-3', style: 'margin-top:10px' }, [
          labeled('N. serie', seriesInp), labeled('Peso suggerito', weightInp), labeled('Recupero', restInp),
        ]),
        labeled('Superset (stesso codice = esercizi eseguiti insieme)', ssSel),
        uniRow,
        labeled('Nota', noteInp),
        seriesTable,
      ]);
    }

    function nutriBlock(title, type) {
      const n = plan.nutrition[type] || {};
      const wrap = el('div', { class: 'card' }, [el('h3', { text: title })]);
      const set = (k, v) => { plan.nutrition[type] = Object.assign({}, plan.nutrition[type], { [k]: v }); };
      const numField = (label, key) => {
        const f = field(label, type + '_' + key, n[key], 'number');
        f.querySelector('input').addEventListener('input', (e) => set(key, e.target.value));
        return f;
      };
      wrap.appendChild(el('div', { class: 'grid-2' }, [numField('Calorie', 'calories'), numField('Acqua (l)', 'water_l')]));
      wrap.appendChild(el('div', { class: 'grid-3' }, [
        numField('Proteine (g)', 'protein_g'), numField('Carbo (g)', 'carbs_g'), numField('Grassi (g)', 'fat_g')]));
      return wrap;
    }

    redraw();

    // Footer azioni
    const footer = m.box.appendChild(el('div', { class: 'modal-foot' }, []));
    footer.appendChild(el('button', { class: 'btn', text: 'Annulla', onClick: () => m.close() }));
    if (planId && plan.status === 'bozza') {
      footer.appendChild(el('button', { class: 'btn btn-accent', text: 'Salva e attiva', onClick: () => savePlan(true) }));
    }
    if (planId && plan.status === 'attiva') {
      footer.appendChild(el('span', { class: 'muted', text: 'Le modifiche creano una nuova versione', style: 'align-self:center;margin-right:auto;font-size:12px' }));
    }
    footer.appendChild(el('button', { class: 'btn btn-primary', text: 'Salva', onClick: () => savePlan(false) }));

    async function savePlan(activate) {
      if (!plan.name) { toast('Indica il nome della scheda', 'err'); return; }
      try {
        let saved;
        if (planId) saved = await API.updatePlan(planId, plan);
        else saved = await API.createPlan(plan);
        if (activate) await API.activatePlan(saved.id);
        m.close();
        toast(activate ? 'Scheda inviata al cliente' : 'Scheda salvata', 'ok');
        if (state.view === 'customer') navigate('customer', { customerId: plan.customer_id });
      } catch (err) { toast(err.message, 'err'); }
    }
  }

  function openDuplicate(plan) {
    let customers = [];
    const sel = el('select', { name: 'target' });
    const note = el('div', { class: 'field' }, [el('label', { text: 'Copia verso' }), sel]);
    API.listCustomers().then((cs) => {
      customers = cs;
      cs.forEach((cu) => {
        const o = el('option', { value: cu.id, text: `${cu.first_name} ${cu.last_name}` + (cu.id === plan.customer_id ? ' (stesso cliente)' : '') });
        if (cu.id === plan.customer_id) o.selected = true;
        sel.appendChild(o);
      });
    });
    const nameF = field('Nome nuova scheda', 'name', `${plan.name} (copia)`);
    const m = modal({
      title: 'Duplica scheda',
      body: el('div', {}, [
        el('p', { class: 'muted', text: 'Vengono copiati struttura ed esercizi e il piano nutrizionale. NON vengono copiati progressi, foto e dati compilati.' }),
        note, nameF,
      ]),
      footer: [
        el('button', { class: 'btn', text: 'Annulla', onClick: () => m.close() }),
        el('button', { class: 'btn btn-primary', text: 'Duplica', onClick: async () => {
          try {
            await API.duplicatePlan(plan.id, { targetCustomerId: Number(sel.value), name: nameF.querySelector('input').value });
            m.close(); toast('Scheda duplicata', 'ok');
            navigate(state.view, state);
          } catch (err) { toast(err.message, 'err'); }
        } }),
      ],
    });
  }

  // ---- Monitoraggio -------------------------------------------------------
  async function renderMonitor(c) {
    loading(c);
    try {
      const plan = await API.getPlan(state.planId);
      const updates = await API.weeklyUpdates(state.planId);
      const photos = await API.getPhotos(state.planId);
      clear(c);
      const periodo = (plan.start_date || plan.end_date) ? ` · ${fmtDate(plan.start_date)} → ${fmtDate(plan.end_date)}` : '';
      c.appendChild(topbar(`Monitoraggio — ${plan.name}`, 'Progressi del cliente' + periodo, [
        el('button', { class: 'btn', text: '← Indietro', onClick: () => navigate('customer', { customerId: state.customerId }) }),
        el('button', { class: 'btn', text: 'Apri scheda', onClick: () => openPlanEditor(plan.id) }),
      ]));

      // Grafici andamento (completamento + progressione peso)
      let allLogs = [];
      try { allLogs = await API.getLogs(state.planId); } catch (e) { allLogs = []; }
      const chartsCard = el('div', { class: 'card' }, [el('h3', { text: 'Andamento' })]);
      const compPts = updates.slice().sort((a, x) => a.week_number - x.week_number)
        .map((u) => ({ label: 'S' + u.week_number, value: Number(u.percent_complete) || 0 }));
      chartsCard.appendChild(el('div', { class: 'section-title' }, [el('h4', { text: 'Completamento per settimana' })]));
      if (compPts.length) chartsCard.appendChild(window.Charts.line(compPts, { suffix: '%', max: 100 }));
      else chartsCard.appendChild(el('p', { class: 'muted', text: 'Nessun aggiornamento inviato dal cliente.' }));
      const exL = [];
      (plan.days || []).forEach((d) => d.exercises.forEach((e) => { if (!exL.find((x) => x.id === e.id)) exL.push({ id: e.id, name: e.name }); }));
      if (exL.length) {
        const sel = el('select', {}, exL.map((e) => el('option', { value: e.id, text: e.name })));
        const holder = el('div', {});
        const draw = () => {
          clear(holder);
          const exId = Number(sel.value); const bw = {};
          allLogs.filter((l) => Number(l.exercise_id) === exId).forEach((l) => {
            const v = parseFloat(String(l.actual_weight || '').replace(',', '.'));
            if (!Number.isNaN(v)) bw[l.week_number] = Math.max(bw[l.week_number] || 0, v);
          });
          const pts = Object.keys(bw).map(Number).sort((a, x) => a - x).map((w) => ({ label: 'S' + w, value: bw[w] }));
          if (pts.length) holder.appendChild(window.Charts.line(pts, { suffix: ' kg' }));
          else holder.appendChild(el('p', { class: 'muted', text: 'Nessun peso registrato per questo esercizio.' }));
        };
        sel.addEventListener('change', draw);
        chartsCard.appendChild(el('div', { class: 'section-title' }, [el('h4', { text: 'Progressione peso' })]));
        chartsCard.appendChild(el('div', { class: 'field' }, [el('label', { text: 'Seleziona esercizio' }), sel]));
        chartsCard.appendChild(holder);
        draw();
      }
      c.appendChild(chartsCard);

      // Selettore settimana
      const weekWrap = el('div', { class: 'card' }, [el('h3', { text: 'Compilazione per settimana' })]);
      const pills = el('div', { class: 'week-pills' });
      const detail = el('div', {});
      let curWeek = 1;
      for (let w = 1; w <= plan.duration_weeks; w += 1) {
        const pill = el('button', { class: 'week-pill' + (w === 1 ? ' active' : ''), text: 'Sett. ' + w,
          onClick: () => { curWeek = w; [...pills.children].forEach((p) => p.classList.remove('active')); pill.classList.add('active'); loadWeek(); } });
        pills.appendChild(pill);
      }
      weekWrap.appendChild(pills);
      weekWrap.appendChild(detail);
      c.appendChild(weekWrap);

      async function loadWeek() {
        clear(detail);
        detail.appendChild(el('p', { class: 'muted', text: 'Caricamento…' }));
        const logs = await API.getLogs(plan.id, curWeek);
        const byKey = {};
        logs.forEach((l) => { byKey[`${l.exercise_id}_${l.series_index}`] = l; });
        clear(detail);
        plan.days.forEach((d) => {
          detail.appendChild(el('h4', { text: d.name, style: 'margin:14px 0 6px' }));
          d.exercises.forEach((ex) => {
            const reps = window.UI.repsForWeek(ex.reps_scheme, curWeek);
            const inten = window.UI.repsForWeek(ex.intensity_scheme, curWeek);
            const rows = [];
            for (let s = 1; s <= ex.num_series; s += 1) {
              const lg = byKey[`${ex.id}_${s}`];
              rows.push(el('tr', {}, [
                el('td', { text: 'Serie ' + s, class: 'muted' }),
                el('td', { text: reps[s - 1] != null && reps[s - 1] !== '' ? reps[s - 1] : '—' }),
                el('td', { text: inten[s - 1] != null && inten[s - 1] !== '' ? inten[s - 1] : '—' }),
                el('td', { text: lg && lg.actual_weight ? lg.actual_weight : '—', style: 'font-weight:600' }),
                el('td', {}, lg && Number(lg.completed)
                  ? el('span', { class: 'badge badge-attiva', text: '✓ fatto' })
                  : el('span', { class: 'badge badge-bozza', text: 'da fare' })),
              ]));
            }
            detail.appendChild(el('div', { style: 'margin:6px 0 14px' }, [
              el('div', { class: 'row-between', style: 'margin-bottom:4px' }, [
                el('strong', {}, [
                  el('span', { text: ex.name }),
                  ex.superset_group ? el('span', { class: 'badge badge-attiva', text: '🔗 ' + ex.superset_group, style: 'margin-left:6px' }) : null,
                ]),
                el('span', { class: 'muted', text: (ex.suggested_weight ? 'peso sugg. ' + ex.suggested_weight : '') + (ex.rest ? ' · rec ' + ex.rest : ''), style: 'font-size:12px' }),
              ]),
              ex.media_url ? el('div', { style: 'margin:2px 0 6px' }, window.UI.exerciseMedia(ex.media_url)) : null,
              ex.notes ? el('div', { class: 'muted', text: ex.notes, style: 'font-size:12.5px;margin-bottom:4px' }) : null,
              el('table', { class: 'table' }, [
                el('thead', {}, el('tr', {}, ['', 'Ripetizioni', 'Intensità', 'Peso usato', 'Stato'].map((h) => el('th', { text: h })))),
                el('tbody', {}, rows),
              ]),
            ]));
          });
        });
      }
      loadWeek();

      // Aggiornamenti settimanali
      const updCard = el('div', { class: 'card' }, [el('h3', { text: 'Aggiornamenti settimanali ricevuti' })]);
      if (!updates.length) updCard.appendChild(el('p', { class: 'muted', text: 'Nessun aggiornamento inviato dal cliente.' }));
      else {
        updCard.appendChild(el('table', { class: 'table' }, [
          el('thead', {}, el('tr', {}, ['Settimana', 'Completati', '%', 'Nota', 'Data'].map((h) => el('th', { text: h })))),
          el('tbody', {}, updates.map((u) => el('tr', {}, [
            el('td', { text: 'Sett. ' + u.week_number }),
            el('td', { text: `${u.exercises_done}/${u.total_exercises}` }),
            el('td', {}, el('div', { class: 'progress-ring' }, [
              el('div', { class: 'bar' }, el('span', { style: `width:${u.percent_complete}%` })),
              el('span', { text: u.percent_complete + '%', style: 'font-size:12px;font-weight:700' }),
            ])),
            el('td', { class: 'muted', text: u.note || '—' }),
            el('td', { class: 'muted', text: fmtDate(u.sent_at) }),
          ]))),
        ]));
      }
      c.appendChild(updCard);

      // Foto
      const photoCard = el('div', { class: 'card' }, [el('h3', { text: 'Foto di monitoraggio' })]);
      if (!photos.length) photoCard.appendChild(el('p', { class: 'muted', text: 'Nessuna foto caricata.' }));
      else {
        photoCard.appendChild(el('div', { class: 'photo-grid' }, photos.map((ph) => el('div', { class: 'photo-thumb' }, [
          el('span', { class: 'tag', text: ph.photo_type }),
          el('img', { src: ph.image_data, alt: ph.photo_type }),
        ]))));
      }
      c.appendChild(photoCard);

      // Versioni
      if (plan.versions && plan.versions.length) {
        const vCard = el('div', { class: 'card' }, [el('h3', { text: 'Storico versioni scheda' })]);
        vCard.appendChild(el('table', { class: 'table' }, [
          el('thead', {}, el('tr', {}, ['Versione', 'Data', 'Nota'].map((h) => el('th', { text: h })))),
          el('tbody', {}, plan.versions.map((v) => el('tr', {}, [
            el('td', { text: 'v' + v.version }), el('td', { class: 'muted', text: fmtDate(v.changed_at) }),
            el('td', { class: 'muted', text: v.note || '—' }),
          ]))),
        ]));
        c.appendChild(vCard);
      }
    } catch (err) { showError(c, err); }
  }

  // ---- Utilità ------------------------------------------------------------
  function emptyState(title, sub) {
    return el('div', { class: 'empty' }, [
      el('div', { class: 'ico', text: '📭' }),
      el('p', { text: title, style: 'font-weight:700;color:var(--ink-2)' }),
      el('p', { text: sub || '', class: 'muted' }),
    ]);
  }

  function showError(c, err) {
    clear(c);
    c.appendChild(topbar('Errore'));
    c.appendChild(el('div', { class: 'card' }, [
      el('p', { text: 'Impossibile contattare il backend locale.' }),
      el('p', { class: 'muted', text: String(err && err.message || err) }),
      el('p', { class: 'muted', text: 'Verifica che i container Docker siano avviati (Avvia.bat).' }),
    ]));
  }

  window.Admin = { mount };
})();
