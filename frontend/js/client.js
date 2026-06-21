/* Lato Cliente (PWA): consulta scheda, compila esercizi, nutrizione, progressi. */
(function () {
  'use strict';
  const { el, clear, toast, modal, confirmDialog, fmtDate } = window.UI;

  let root;
  let customer = null;
  let plan = null;       // piano attivo completo
  let curWeek = 1;
  let tab = 'home';
  let notifications = [];

  function mount(container) {
    root = container;
    customer = null; plan = null; tab = 'home'; curWeek = 1; notifications = [];
    pickCustomer();
  }

  // Senza login: il cliente seleziona il proprio nominativo.
  async function pickCustomer() {
    clear(root);
    const wrap = el('div', { class: 'client' });
    wrap.appendChild(el('div', { class: 'client-header' }, [
      el('div', { class: 'hello', text: 'Benvenuto' }),
      el('h2', { text: 'Chi sei?' }),
    ]));
    const body = el('div', { class: 'client-body' });
    body.appendChild(el('p', { class: 'muted', text: 'Seleziona il tuo nominativo per vedere la tua scheda.' }));
    try {
      const customers = await API.listCustomers();
      customers.forEach((cu) => {
        body.appendChild(el('div', { class: 'client-card', onClick: () => { customer = cu; openHome(); },
          style: 'cursor:pointer;display:flex;align-items:center;gap:12px' }, [
          el('span', { class: 'avatar', text: window.UI.initials(cu.first_name, cu.last_name) }),
          el('div', {}, [
            el('div', { text: `${cu.first_name} ${cu.last_name}`, style: 'font-weight:700' }),
            el('div', { class: 'muted', text: Number(cu.active_plans) ? 'Scheda attiva disponibile' : 'Nessuna scheda attiva', style: 'font-size:12.5px' }),
          ]),
        ]));
      });
      if (!customers.length) body.appendChild(el('p', { class: 'muted', text: 'Nessun cliente presente.' }));
    } catch (err) {
      body.appendChild(el('p', { class: 'muted', text: 'Backend non raggiungibile. Avvia i container (Avvia.bat).' }));
    }
    body.appendChild(el('button', { class: 'btn btn-block', text: '↩ Cambia ruolo', style: 'margin-top:18px',
      onClick: () => window.Router.goRole() }));
    wrap.appendChild(body);
    root.appendChild(wrap);
  }

  async function openHome() {
    try { plan = await API.activePlan(customer.id); } catch (err) { plan = null; }
    try { notifications = await API.customerNotifications(customer.id); } catch (err) { notifications = []; }
    curWeek = 1; tab = 'home';
    render();
  }

  // Pop-up notifiche del cliente; all'apertura le segna come lette.
  async function openClientNotifications() {
    const list = el('div', {});
    if (!notifications.length) {
      list.appendChild(el('p', { class: 'muted', text: 'Nessuna notifica per ora.' }));
    } else {
      notifications.forEach((n) => list.appendChild(el('div', { class: 'cnotif' + (Number(n.is_read) ? '' : ' unread') }, [
        el('div', { text: n.message, style: 'font-size:14px' }),
        el('div', { class: 'muted', text: fmtDate(n.created_at), style: 'font-size:12px; margin-top:2px' }),
      ])));
    }
    const m = modal({ title: 'Notifiche', body: list,
      footer: [el('button', { class: 'btn btn-primary btn-block', text: 'Chiudi', onClick: () => m.close() })] });
    // Segna come lette e azzera il badge.
    if (notifications.some((n) => !Number(n.is_read))) {
      try {
        await API.readCustomerNotifications(customer.id);
        notifications.forEach((n) => { n.is_read = 1; });
        const badge = document.querySelector('.client-bell-badge');
        if (badge) badge.remove();
      } catch (e) { /* ignora */ }
    }
  }

  function render() {
    clear(root);
    const wrap = el('div', { class: 'client' });
    wrap.appendChild(header());
    const body = el('div', { class: 'client-body', id: 'client-body' });
    wrap.appendChild(body);
    wrap.appendChild(bottomNav());
    root.appendChild(wrap);

    const tabs = { home: viewHome, scheda: viewScheda, nutrizione: viewNutrizione, progressi: viewProgressi };
    (tabs[tab] || viewHome)(body);
  }

  function header() {
    const unread = notifications.filter((n) => !Number(n.is_read)).length;
    const bell = el('button', { class: 'client-bell', title: 'Notifiche', onClick: () => openClientNotifications() }, [
      el('span', { text: '🔔' }),
      unread ? el('span', { class: 'client-bell-badge', text: String(unread) }) : null,
    ]);
    return el('div', { class: 'client-header' }, [
      el('div', { class: 'client-header-top' }, [
        el('div', {}, [
          el('div', { class: 'hello', text: 'Ciao,' }),
          el('h2', { text: customer.first_name }),
        ]),
        bell,
      ]),
      plan
        ? el('div', { class: 'plan-name' }, `📋 ${plan.name} · ${plan.duration_weeks} settimane`
            + ((plan.start_date || plan.end_date) ? `\n📅 ${window.UI.fmtDate(plan.start_date)} → ${window.UI.fmtDate(plan.end_date)}` : ''))
        : el('div', { class: 'plan-name' }, 'Nessuna scheda attiva al momento'),
    ]);
  }

  function bottomNav() {
    const items = [
      { id: 'home', ico: '🏠', label: 'Home' },
      { id: 'scheda', ico: '🏋️', label: 'Scheda' },
      { id: 'nutrizione', ico: '🥗', label: 'Nutrizione' },
      { id: 'progressi', ico: '📈', label: 'Progressi' },
    ];
    return el('nav', { class: 'bottom-nav' }, items.map((it) => el('button', {
      class: tab === it.id ? 'active' : '', onClick: () => { tab = it.id; render(); },
    }, [el('span', { class: 'ico', text: it.ico }), el('span', { text: it.label })])));
  }

  // ---- Home ---------------------------------------------------------------
  async function viewHome(b) {
    // Avviso in evidenza per le notifiche non lette (es. nuova scheda).
    const unread = notifications.filter((n) => !Number(n.is_read));
    if (unread.length) {
      b.appendChild(el('div', { class: 'client-banner', onClick: () => openClientNotifications() }, [
        el('span', { class: 'ico', text: unread[0].type === 'new_plan' ? '🎉' : '🔔' }),
        el('div', { style: 'flex:1' }, [
          el('strong', { text: unread.length > 1 ? `Hai ${unread.length} nuove notifiche` : 'Hai una nuova notifica' }),
          el('div', { class: 'banner-msg', text: unread[0].message }),
        ]),
        el('span', { class: 'banner-arrow', text: '›' }),
      ]));
    }
    if (!plan) {
      b.appendChild(noPlan());
      return;
    }
    // Riepilogo completamento per settimana corrente.
    const logs = await API.getLogs(plan.id, curWeek);
    const total = totalExercises();
    const done = logs.filter((l) => Number(l.completed)).length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    b.appendChild(el('div', { class: 'client-card' }, [
      el('h3', { text: 'La tua settimana ' + curWeek }),
      el('p', { class: 'muted', text: `${done} di ${total} serie completate` }),
      el('div', { class: 'progress-ring', style: 'margin-top:10px' }, [
        el('div', { class: 'bar' }, el('span', { style: `width:${pct}%` })),
        el('span', { text: pct + '%', style: 'font-weight:800' }),
      ]),
    ]));

    b.appendChild(el('div', { class: 'client-card', onClick: () => { tab = 'scheda'; render(); }, style: 'cursor:pointer' }, [
      el('h3', { text: '🏋️ Allenamento di oggi' }),
      el('p', { class: 'muted', text: 'Apri la scheda, inserisci i pesi e spunta gli esercizi.' }),
    ]));
    b.appendChild(el('div', { class: 'client-card', onClick: () => { tab = 'nutrizione'; render(); }, style: 'cursor:pointer' }, [
      el('h3', { text: '🥗 Piano nutrizionale' }),
      el('p', { class: 'muted', text: 'Calorie e macro per giorni di allenamento e riposo.' }),
    ]));
    b.appendChild(el('div', { class: 'client-card', onClick: () => { tab = 'progressi'; render(); }, style: 'cursor:pointer' }, [
      el('h3', { text: '📈 Progressi e foto' }),
      el('p', { class: 'muted', text: 'Invia l\'aggiornamento settimanale e carica le foto.' }),
    ]));
  }

  function noPlan() {
    return el('div', { class: 'client-card' }, [
      el('h3', { text: 'Nessuna scheda attiva' }),
      el('p', { class: 'muted', text: 'Il tuo istruttore non ha ancora attivato una scheda. Riprova più tardi.' }),
      el('button', { class: 'btn btn-block', text: '↩ Cambia utente', style: 'margin-top:12px', onClick: () => pickCustomer() }),
    ]);
  }

  // Totale serie del piano (il completamento si misura sulle serie).
  function totalExercises() {
    return (plan.days || []).reduce((s, d) => s + d.exercises.reduce((a, e) => a + (Number(e.num_series) || 0), 0), 0);
  }

  // ---- Scheda (compilazione) ---------------------------------------------
  async function viewScheda(b) {
    if (!plan) { b.appendChild(noPlan()); return; }

    // Selettore settimana
    const pills = el('div', { class: 'week-pills' });
    for (let w = 1; w <= plan.duration_weeks; w += 1) {
      pills.appendChild(el('button', { class: 'week-pill' + (w === curWeek ? ' active' : ''), text: 'S' + w,
        onClick: () => { curWeek = w; render(); } }));
    }
    b.appendChild(pills);

    const logs = await API.getLogs(plan.id, curWeek);
    const byKey = {};
    logs.forEach((l) => { byKey[`${l.exercise_id}_${l.series_index}`] = l; });

    plan.days.forEach((d) => {
      const card = el('div', { class: 'client-card' }, [el('h3', { text: d.name })]);
      d.exercises.forEach((ex) => {
        const reps = window.UI.repsForWeek(ex.reps_scheme, curWeek);
        const inten = window.UI.repsForWeek(ex.intensity_scheme, curWeek);
        const hasIntensity = inten.some((v) => v != null && v !== '');

        // Intestazione esercizio: nome + meta + nota (generale dell'esercizio)
        card.appendChild(el('div', { class: 'ex-head' }, [
          el('div', { class: 'name', text: ex.name }),
          (ex.suggested_weight || ex.rest)
            ? el('div', { class: 'meta', text: (ex.suggested_weight ? 'peso sugg. ' + ex.suggested_weight : '') + (ex.rest ? ' · rec ' + ex.rest : '') })
            : null,
          ex.notes ? el('div', { class: 'meta', text: '📝 ' + ex.notes }) : null,
        ]));

        // Tabella: una riga per serie -> ripetizioni, peso, fatto
        const tbody = el('tbody', {});
        for (let s = 1; s <= ex.num_series; s += 1) {
          const lg = byKey[`${ex.id}_${s}`] || {};
          const wInput = el('input', { value: lg.actual_weight || '', placeholder: ex.suggested_weight || 'kg', inputmode: 'text' });
          const check = el('div', { class: 'check' + (Number(lg.completed) ? ' on' : ''), html: '✓' });
          const seriesIndex = s;
          const save = async (completed) => {
            try {
              await API.saveLog({ planId: plan.id, exerciseId: ex.id, week: curWeek, seriesIndex,
                actualWeight: wInput.value, completed });
            } catch (err) { toast('Salvataggio non riuscito', 'err'); }
          };
          wInput.addEventListener('change', () => save(check.classList.contains('on')));
          check.addEventListener('click', () => { check.classList.toggle('on'); save(check.classList.contains('on')); });

          tbody.appendChild(el('tr', { class: 'serie-row' }, [
            el('td', { class: 'serie-n', text: 'Serie ' + s }),
            el('td', { class: 'serie-reps', text: (reps[s - 1] != null && reps[s - 1] !== '') ? (reps[s - 1] + ' rip.') : '—' }),
            hasIntensity ? el('td', { class: 'serie-int', text: (inten[s - 1] != null && inten[s - 1] !== '') ? inten[s - 1] : '—' }) : null,
            el('td', { class: 'serie-w' }, wInput),
            el('td', { class: 'serie-c' }, check),
          ]));
        }
        card.appendChild(el('table', { class: 'serie-table' }, [
          el('thead', {}, el('tr', {}, [
            el('th', { text: 'Serie' }), el('th', { text: 'Rip.' }),
            hasIntensity ? el('th', { text: 'Int.' }) : null,
            el('th', { text: 'Peso' }), el('th', { text: 'Fatto' }),
          ])),
          tbody,
        ]));
      });
      b.appendChild(card);
    });

    // Fine settimana -> invia aggiornamento
    b.appendChild(el('button', { class: 'btn btn-accent btn-block', html: '📨 Invia aggiornamento settimana ' + curWeek,
      style: 'margin-top:6px', onClick: () => sendWeekly() }));
  }

  function sendWeekly() {
    const note = el('textarea', { placeholder: 'Come è andata la settimana? (facoltativo)' });
    const m = modal({
      title: 'Aggiornamento settimana ' + curWeek,
      body: el('div', {}, [
        el('p', { class: 'muted', text: 'Invii all\'istruttore esercizi svolti, pesi usati e percentuale di completamento.' }),
        el('div', { class: 'field' }, [el('label', { text: 'Nota' }), note]),
      ]),
      footer: [
        el('button', { class: 'btn', text: 'Annulla', onClick: () => m.close() }),
        el('button', { class: 'btn btn-primary', text: 'Invia', onClick: async () => {
          try {
            const r = await API.sendWeeklyUpdate(plan.id, { week: curWeek, note: note.value });
            m.close(); toast(`Inviato! Completamento ${r.percent_complete}%`, 'ok');
          } catch (err) { toast(err.message, 'err'); }
        } }),
      ],
    });
  }

  // ---- Nutrizione ---------------------------------------------------------
  function viewNutrizione(b) {
    if (!plan) { b.appendChild(noPlan()); return; }
    const blocks = [
      { title: '🏋️ Giorno di allenamento', n: plan.nutrition.allenamento },
      { title: '🛋️ Giorno di riposo', n: plan.nutrition.riposo },
    ];
    let any = false;
    blocks.forEach((blk) => {
      if (!blk.n) return;
      any = true;
      const n = blk.n;
      b.appendChild(el('div', { class: 'client-card' }, [
        el('h3', { text: blk.title }),
        el('div', { class: 'macro-grid' }, [
          macro('Calorie', n.calories ? n.calories + ' kcal' : '—'),
          macro('Acqua', n.water_l ? n.water_l + ' l' : '—'),
          macro('Proteine', n.protein_g ? n.protein_g + ' g' : '—'),
          macro('Carboidrati', n.carbs_g ? n.carbs_g + ' g' : '—'),
          macro('Grassi', n.fat_g ? n.fat_g + ' g' : '—'),
        ]),
      ]));
    });
    if (!any) b.appendChild(el('div', { class: 'client-card' }, el('p', { class: 'muted', text: 'Nessun piano nutrizionale impostato.' })));

    // Avviso: i valori sono orientativi, non una prescrizione.
    if (any) {
      b.appendChild(el('div', { class: 'nutri-disclaimer' }, [
        el('span', { class: 'ico', text: 'ℹ️' }),
        el('div', {}, [
          el('strong', { text: 'Valori indicativi' }),
          el('p', { text: 'I quantitativi di calorie e macronutrienti sono una stima orientativa di massima, non una prescrizione dietetica. Adattali alle tue esigenze e, per un piano alimentare personalizzato, rivolgiti a un nutrizionista o a un medico.' }),
        ]),
      ]));
    }
  }

  function macro(k, v) {
    return el('div', { class: 'macro' }, [el('div', { class: 'k', text: k }), el('div', { class: 'v', text: v })]);
  }

  // ---- Progressi e foto ---------------------------------------------------
  async function viewProgressi(b) {
    if (!plan) { b.appendChild(noPlan()); return; }
    const updates = await API.weeklyUpdates(plan.id);
    const photos = await API.getPhotos(plan.id);

    // Storico aggiornamenti
    const hist = el('div', { class: 'client-card' }, [el('h3', { text: 'Storico settimane' })]);
    if (!updates.length) hist.appendChild(el('p', { class: 'muted', text: 'Nessun aggiornamento inviato.' }));
    else updates.forEach((u) => {
      hist.appendChild(el('div', { style: 'margin:10px 0' }, [
        el('div', { class: 'row-between' }, [
          el('strong', { text: 'Settimana ' + u.week_number }),
          el('span', { class: 'muted', text: fmtDate(u.sent_at) }),
        ]),
        el('div', { class: 'progress-ring', style: 'margin-top:6px' }, [
          el('div', { class: 'bar' }, el('span', { style: `width:${u.percent_complete}%` })),
          el('span', { text: u.percent_complete + '%', style: 'font-size:12px;font-weight:700' }),
        ]),
        u.note ? el('p', { class: 'muted', text: u.note, style: 'font-size:13px;margin:4px 0 0' }) : null,
      ]));
    });
    b.appendChild(hist);

    // Foto
    const photoCard = el('div', { class: 'client-card' }, [
      el('div', { class: 'row-between' }, [
        el('h3', { text: 'Foto di monitoraggio', style: 'margin:0' }),
        el('button', { class: 'btn btn-sm btn-primary', html: '+ Foto', onClick: () => addPhoto() }),
      ]),
    ]);
    if (!photos.length) photoCard.appendChild(el('p', { class: 'muted', text: 'Carica le tue foto: fronte, lato, retro.' }));
    else photoCard.appendChild(el('div', { class: 'photo-grid', style: 'margin-top:12px' }, photos.map((ph) => el('div', { class: 'photo-thumb' }, [
      el('span', { class: 'tag', text: ph.photo_type }),
      el('img', { src: ph.image_data, alt: ph.photo_type }),
      el('button', { class: 'del', html: '🗑', onClick: () => {
        confirmDialog('Eliminare questa foto?', async () => { await API.deletePhoto(ph.id); render(); }, { danger: true, confirmLabel: 'Elimina' });
      } }),
    ]))));
    b.appendChild(photoCard);
  }

  function addPhoto() {
    const typeSel = el('select', {}, ['fronte', 'lato', 'retro', 'libera'].map((t) => el('option', { value: t, text: t })));
    const fileInput = el('input', { type: 'file', accept: 'image/*' });
    const preview = el('img', { style: 'max-width:100%;border-radius:12px;margin-top:10px;display:none' });
    let dataUrl = null;
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        compress(reader.result, (out) => {
          dataUrl = out;
          preview.src = out; preview.style.display = 'block';
        });
      };
      reader.readAsDataURL(file);
    });
    const m = modal({
      title: 'Carica foto',
      body: el('div', {}, [
        el('div', { class: 'field' }, [el('label', { text: 'Tipo' }), typeSel]),
        el('div', { class: 'field' }, [el('label', { text: 'Immagine' }), fileInput]),
        preview,
      ]),
      footer: [
        el('button', { class: 'btn', text: 'Annulla', onClick: () => m.close() }),
        el('button', { class: 'btn btn-primary', text: 'Carica', onClick: async () => {
          if (!dataUrl) { toast('Seleziona un\'immagine', 'err'); return; }
          try {
            await API.addPhoto(plan.id, { photo_type: typeSel.value, image_data: dataUrl });
            m.close(); toast('Foto caricata', 'ok'); render();
          } catch (err) { toast(err.message, 'err'); }
        } }),
      ],
    });
  }

  // Ridimensiona l'immagine lato client per non salvare file enormi.
  // Chiama cb(dataUrlJpeg) quando pronta.
  function compress(src, cb) {
    const img = new Image();
    img.onload = () => {
      const max = 900;
      let { width, height } = img;
      if (width > max || height > max) {
        const r = Math.min(max / width, max / height);
        width = Math.round(width * r); height = Math.round(height * r);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      cb(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => cb(src);
    img.src = src;
  }

  window.Client = { mount };
})();
