/* Router minimale: schermata iniziale di scelta ruolo + avvio del pannello. */
(function () {
  'use strict';
  const { el, clear } = window.UI;

  let appRoot;

  function start() {
    appRoot = document.getElementById('app');
    goRole();
  }

  function goRole() {
    clear(appRoot);
    const screen = el('div', { class: 'role-screen' }, el('div', { class: 'role-card' }, [
      el('img', { class: 'role-logo', src: 'assets/icon.svg', alt: '' }),
      el('h1', { text: 'Client Configurator' }),
      el('p', { class: 'sub', text: 'Piattaforma di gestione palestra — schede, nutrizione e progressi.' }),
      el('div', { class: 'role-grid' }, [
        el('button', { class: 'role-pick', onClick: () => goAdmin() }, [
          el('div', { class: 'ico', text: '🧑‍💼' }),
          el('h3', { text: 'Amministratore' }),
          el('p', { text: 'Gestione clienti, creazione schede, piano nutrizionale e monitoraggio.' }),
        ]),
        el('button', { class: 'role-pick', onClick: () => goClient() }, [
          el('div', { class: 'ico', text: '🏃' }),
          el('h3', { text: 'Cliente' }),
          el('p', { text: 'Consulta la scheda, registra i pesi, segui i progressi e carica le foto.' }),
        ]),
      ]),
      el('p', { class: 'role-local-note', text: '🔒 Tutto in locale su questo PC. I dati restano nel database locale, niente sulla rete aziendale.' }),
    ]));
    appRoot.appendChild(screen);
  }

  function goAdmin() { clear(appRoot); window.Admin.mount(appRoot); }
  function goClient() { clear(appRoot); window.Client.mount(appRoot); }

  window.Router = { start, goRole, goAdmin, goClient };
})();
