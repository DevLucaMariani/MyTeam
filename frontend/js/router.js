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
    goRole();
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
    clear(appRoot);
    const screen = el('div', { class: 'role-screen' }, el('div', { class: 'role-card' }, [
      el('img', { class: 'role-logo', src: 'assets/icon.svg', alt: '' }),
      el('h1', { text: 'MyTeam' }),
      el('p', { class: 'sub', text: 'Piattaforma di gestione palestra — schede, nutrizione e progressi.' }),
      el('div', { class: 'role-grid' }, [
        el('button', { class: 'role-pick', onClick: () => goAdminLogin() }, [
          el('div', { class: 'ico', text: '🧑‍💼' }),
          el('h3', { text: 'Amministratore' }),
          el('p', { text: 'Gestione dei trainer e supervisione generale.' }),
        ]),
        el('button', { class: 'role-pick', onClick: () => goTrainerLogin() }, [
          el('div', { class: 'ico', text: '🧑‍🏫' }),
          el('h3', { text: 'Trainer' }),
          el('p', { text: 'La tua console: clienti, schede, nutrizione e monitoraggio.' }),
        ]),
      ]),
      el('p', { class: 'role-local-note', text: '🏃 Sei un cliente? Apri il link personale che ti ha inviato il tuo trainer.' }),
    ]));
    appRoot.appendChild(screen);
  }

  // Schermata di login riutilizzabile.
  function loginScreen(cfg) {
    clear(appRoot);
    const inputs = {};
    const card = el('div', { class: 'role-card' }, [
      el('img', { class: 'role-logo', src: 'assets/icon.svg', alt: '' }),
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
      title: 'Trainer',
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
