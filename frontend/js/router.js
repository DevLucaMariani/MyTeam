/* Router: link cliente (?c=token), scelta ruolo e login admin/trainer. */
(function () {
  'use strict';
  const { el, clear, toast } = window.UI;

  let appRoot;

  function start() {
    appRoot = document.getElementById('app');
    const params = new URLSearchParams(window.location.search);
    // Link personale del cliente: ?c=<token>  -> apre direttamente la sua app.
    const clientToken = params.get('c');
    if (clientToken) { clear(appRoot); window.Client.mountByToken(appRoot, clientToken); return; }
    // Link di accesso del trainer: ?t=<token>  -> entra nella console del trainer.
    const trainerToken = params.get('t');
    if (trainerToken) { loginTrainerByToken(trainerToken); return; }
    // Invito a diventare trainer: ?invite=<codice>
    const invite = params.get('invite');
    if (invite) { showRegister(invite); return; }
    goRole();
  }

  function goHome() { window.history.replaceState({}, '', '/'); goRole(); }

  async function showRegister(code) {
    window.Theme.reset();
    clear(appRoot);
    let sponsor = null;
    try { sponsor = await window.API.getInvite(code); } catch (e) { sponsor = null; }
    if (!sponsor) {
      appRoot.appendChild(el('div', { class: 'role-screen' }, el('div', { class: 'role-card' }, [
        el('h1', { text: 'Invito non valido' }),
        el('p', { class: 'sub', text: 'Questo link di invito non è valido o è scaduto.' }),
        el('button', { class: 'btn btn-block', text: 'Vai alla home', onClick: () => goHome() }),
      ])));
      return;
    }
    const inputs = {};
    const card = el('div', { class: 'role-card' }, [
      el('img', { class: 'role-logo', src: 'assets/logo.png', alt: '' }),
      el('h1', { text: 'Diventa Coach' }),
      el('p', { class: 'sub', text: `Invitato da ${sponsor.first_name} ${sponsor.last_name}. Compila per richiedere l'accesso: sarà attivato dall'amministratore.` }),
    ]);
    [['first_name', 'Nome'], ['last_name', 'Cognome'], ['email', 'Email'], ['phone', 'Telefono'],
      ['username', 'Nome utente'], ['password', 'Password', 'password']].forEach(([name, label, type]) => {
      const inp = el('input', { type: type || 'text' });
      inputs[name] = inp;
      card.appendChild(el('div', { class: 'field' }, [el('label', { text: label }), inp]));
    });
    card.appendChild(el('button', { class: 'btn btn-primary btn-block', text: 'Richiedi accesso', style: 'margin-top:8px', onClick: async () => {
      const data = { invite_code: code };
      Object.keys(inputs).forEach((k) => { data[k] = inputs[k].value; });
      if (!data.first_name || !data.last_name || !data.username || !data.password) { toast('Compila nome, cognome, utente e password', 'err'); return; }
      try {
        await window.API.registerTrainer(data);
        clear(appRoot);
        appRoot.appendChild(el('div', { class: 'role-screen' }, el('div', { class: 'role-card' }, [
          el('div', { class: 'ico', text: '✅', style: 'font-size:42px' }),
          el('h1', { text: 'Richiesta inviata!' }),
          el('p', { class: 'sub', text: "Il tuo account è in attesa di approvazione dall'amministratore. Appena approvato potrai accedere come Coach." }),
          el('button', { class: 'btn btn-block', text: 'Vai alla home', onClick: () => goHome() }),
        ])));
      } catch (err) { toast(err.message || 'Registrazione non riuscita', 'err'); }
    } }));
    appRoot.appendChild(el('div', { class: 'role-screen' }, card));
  }

  async function loginTrainerByToken(token) {
    try {
      const t = await window.API.trainerByToken(token);
      window.API.setTrainerAuth(t.console_token);
      goTrainer(t);
    } catch (err) { toast(err.message || 'Link di accesso non valido', 'err'); goRole(); }
  }

  function goRole() {
    window.API.clearAuth();
    window.Theme.reset();
    if (window.__mtHeartbeat) clearInterval(window.__mtHeartbeat);
    clear(appRoot);
    const screen = el('div', { class: 'role-screen' }, el('div', { class: 'role-card' }, [
      el('img', { class: 'role-logo', src: 'assets/logo.png', alt: '' }),
      el('h1', { text: 'MyTeam' }),
      el('p', { class: 'sub', text: 'Piattaforma di gestione team — schede, nutrizione e progressi.' }),
      el('div', { class: 'role-grid' }, [
        el('button', { class: 'role-pick', onClick: () => goAdminLogin() }, [
          el('div', { class: 'ico', text: '🧑‍💼' }),
          el('h3', { text: 'Amministratore' }),
          el('p', { text: 'Gestione dei coach e supervisione generale.' }),
        ]),
        el('button', { class: 'role-pick', onClick: () => goTrainerLogin() }, [
          el('div', { class: 'ico', text: '🧑‍🏫' }),
          el('h3', { text: 'Coach' }),
          el('p', { text: 'La tua console: clienti, schede, nutrizione e monitoraggio.' }),
        ]),
      ]),
      el('p', { class: 'role-local-note', text: '🏃 Sei un cliente? Apri il link personale che ti ha inviato il tuo coach.' }),
      window.I18N.toggleEl(),
      window.UI.copyrightLine(),
    ]));
    appRoot.appendChild(screen);
  }

  // Schermata di login riutilizzabile.
  function loginScreen(cfg) {
    clear(appRoot);
    const inputs = {};
    const card = el('div', { class: 'role-card' }, [
      el('img', { class: 'role-logo', src: 'assets/logo.png', alt: '' }),
      el('h1', { text: cfg.title }),
      cfg.subtitle ? el('p', { class: 'sub', text: cfg.subtitle }) : null,
    ]);
    const submit = () => {
      const values = {};
      Object.keys(inputs).forEach((k) => { values[k] = inputs[k].value; });
      cfg.onSubmit(values);
    };
    cfg.fields.forEach((f) => {
      const inp = el('input', { type: f.type || 'text', placeholder: f.placeholder || '' });
      inp.addEventListener('keyup', (e) => { if (e.key === 'Enter') submit(); });
      inputs[f.name] = inp;
      card.appendChild(el('div', { class: 'field' }, [el('label', { text: f.label }), inp]));
    });
    card.appendChild(el('button', { class: 'btn btn-primary btn-block', text: 'Accedi', style: 'margin-top:10px', onClick: submit }));
    card.appendChild(el('button', { class: 'btn btn-block', text: '↩ Indietro', style: 'margin-top:8px', onClick: () => goRole() }));
    appRoot.appendChild(el('div', { class: 'role-screen' }, card));
    if (cfg.fields[0]) inputs[cfg.fields[0].name].focus();
  }

  function goAdminLogin() {
    loginScreen({
      title: 'Amministratore',
      subtitle: 'Inserisci la password amministratore.',
      fields: [{ name: 'password', label: 'Password', type: 'password' }],
      onSubmit: async ({ password }) => {
        try {
          await window.API.loginAdmin(password);
          window.API.setAdminAuth(password);
          goAdmin();
        } catch (err) { toast(err.message || 'Password non corretta', 'err'); }
      },
    });
  }

  function goTrainerLogin() {
    loginScreen({
      title: 'Coach',
      subtitle: "Accedi con le credenziali che ti ha consegnato l'amministratore.",
      fields: [
        { name: 'username', label: 'Nome utente' },
        { name: 'password', label: 'Password', type: 'password' },
      ],
      onSubmit: async ({ username, password }) => {
        try {
          const t = await window.API.loginTrainer(username, password);
          window.API.setTrainerAuth(t.console_token);
          goTrainer(t);
        } catch (err) { toast(err.message || 'Credenziali non valide', 'err'); }
      },
    });
  }

  function goAdmin() { clear(appRoot); window.Admin.mount(appRoot, { role: 'admin' }); }
  function goTrainer(trainer) { clear(appRoot); window.Admin.mount(appRoot, { role: 'trainer', trainer }); }

  window.Router = { start, goRole, goAdmin, goTrainer };
})();
