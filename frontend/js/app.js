/* Bootstrap: registra il service worker (PWA) e avvia il router. */
(function () {
  'use strict';

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline non critico */ });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.Router.start();
  });

  // Se il DOM e' gia' pronto (script in fondo al body), avvia subito.
  if (document.readyState !== 'loading') {
    window.Router.start();
  }
})();
