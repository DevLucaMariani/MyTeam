/* Client API: piccolo wrapper su fetch verso il backend locale (/api). */
(function () {
  'use strict';

  const BASE = '/api';

  // Header di autenticazione applicati a ogni richiesta:
  //  - admin:   X-Admin-Password
  //  - trainer: X-Trainer-Token
  let authHeaders = {};
  function setAdminAuth(password) { authHeaders = { 'X-Admin-Password': password }; }
  function setTrainerAuth(token) { authHeaders = { 'X-Trainer-Token': token }; }
  function setClientAuth(token) { authHeaders = { 'X-Client-Token': token }; }
  function clearAuth() { authHeaders = {}; }

  async function request(method, path, body) {
    const opts = { method, headers: { ...authHeaders } };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(BASE + path, opts);
    if (!res.ok) {
      let msg = `Errore ${res.status}`;
      try { const j = await res.json(); if (j.error) msg = j.error; } catch (e) { /* ignora */ }
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  window.API = {
    health: () => request('GET', '/health'),
    ping: () => request('GET', '/ping'),
    getPushKey: () => request('GET', '/push/key'),
    subscribePush: (subscription) => request('POST', '/push/subscribe', { subscription }),

    // Autenticazione / ruoli
    setAdminAuth, setTrainerAuth, setClientAuth, clearAuth,
    loginAdmin: (password) => request('POST', '/auth/admin', { password }),
    loginTrainer: (username, password) => request('POST', '/auth/trainer', { username, password }),
    trainerByToken: (token) => request('GET', `/auth/trainer-by-token/${token}`),

    // Trainer (gestiti dall'amministratore)
    listTrainers: () => request('GET', '/trainers'),
    createTrainer: (data) => request('POST', '/trainers', data),
    updateTrainer: (id, data) => request('PUT', `/trainers/${id}`, data),
    deleteTrainer: (id) => request('DELETE', `/trainers/${id}`),
    approveTrainer: (id) => request('POST', `/trainers/${id}/approve`),
    setTrainerCommission: (id, override) => request('PUT', `/trainers/${id}/commission`, { override }),
    setTrainerFlags: (id, flags) => request('PUT', `/trainers/${id}/flags`, flags),

    // Sponsorizzazioni / compensi
    registerTrainer: (data) => request('POST', '/trainers/register', data),
    getInvite: (code) => request('GET', `/invite/${code}`),
    listBilling: () => request('GET', '/billing'),
    getMe: () => request('GET', '/me'),

    // Aspetto del trainer (logo + tema), applicato a console e clienti
    updateMyBranding: (data) => request('PUT', '/me/branding', data),

    // Impostazioni del trainer (es. nutrizione on/off)
    updateMySettings: (data) => request('PUT', '/me/settings', data),

    // Privacy del cliente (GDPR): consenso, revoca, esportazione, cancellazione
    acceptPrivacy: (data) => request('POST', '/client/privacy-accept', data || {}),
    revokePrivacy: () => request('POST', '/client/privacy-revoke'),
    exportMyData: () => request('GET', '/client-export'),
    requestDeletion: () => request('POST', '/client/request-deletion'),

    // Pagamenti del cliente (registro spese gestito dal coach)
    listPayments: (customerId) => request('GET', `/customers/${customerId}/payments`),
    createPayment: (customerId, data) => request('POST', `/customers/${customerId}/payments`, data),
    updatePayment: (id, data) => request('PUT', `/payments/${id}`, data),
    deletePayment: (id) => request('DELETE', `/payments/${id}`),

    // Rubrica del coach (collaboratori: nutrizionista, osteopata…)
    listMyContacts: () => request('GET', '/me/contacts'),
    createMyContact: (data) => request('POST', '/me/contacts', data),
    updateMyContact: (id, data) => request('PUT', `/me/contacts/${id}`, data),
    deleteMyContact: (id) => request('DELETE', `/me/contacts/${id}`),

    // Import scheda da PDF (bozza da verificare)
    importPdf: (pdfBase64) => request('POST', '/import/pdf', { pdf_base64: pdfBase64 }),

    // Accesso cliente tramite token (link personale)
    getClientByToken: (token) => request('GET', `/client/${token}`),

    // Clienti
    listCustomers: () => request('GET', '/customers'),
    getCustomer: (id) => request('GET', `/customers/${id}`),
    createCustomer: (data) => request('POST', '/customers', data),
    updateCustomer: (id, data) => request('PUT', `/customers/${id}`, data),
    deleteCustomer: (id) => request('DELETE', `/customers/${id}`),
    customerPlans: (id) => request('GET', `/customers/${id}/plans`),
    clientPlans: (id) => request('GET', `/customers/${id}/client-plans`),
    activePlan: (id) => request('GET', `/customers/${id}/active-plan`),
    customerNotifications: (id) => request('GET', `/customers/${id}/notifications`),
    readCustomerNotifications: (id) => request('POST', `/customers/${id}/notifications/read-all`),

    // Schede
    getPlan: (id) => request('GET', `/plans/${id}`),
    createPlan: (data) => request('POST', '/plans', data),
    updatePlan: (id, data) => request('PUT', `/plans/${id}`, data),
    deletePlan: (id) => request('DELETE', `/plans/${id}`),
    activatePlan: (id) => request('POST', `/plans/${id}/activate`),
    duplicatePlan: (id, data) => request('POST', `/plans/${id}/duplicate`, data),

    // Log e aggiornamenti
    getLogs: (planId, week) => request('GET', `/plans/${planId}/logs?week=${week}`),
    saveLog: (data) => request('PUT', '/logs', data),
    weeklyUpdates: (planId) => request('GET', `/plans/${planId}/weekly-updates`),
    sendWeeklyUpdate: (planId, data) => request('POST', `/plans/${planId}/weekly-updates`, data),

    // Catalogo esercizi (per autocomplete e gestione)
    listExerciseCatalog: () => request('GET', '/exercise-catalog'),
    createCatalogExercise: (data) => request('POST', '/exercise-catalog', data),
    updateCatalogExercise: (id, data) => request('PUT', `/exercise-catalog/${id}`, data),
    deleteCatalogExercise: (id) => request('DELETE', `/exercise-catalog/${id}`),

    // Notifiche e panoramica scadenze
    listNotifications: () => request('GET', '/notifications'),
    readNotification: (id) => request('POST', `/notifications/${id}/read`),
    readAllNotifications: () => request('POST', '/notifications/read-all'),
    deleteNotification: (id) => request('DELETE', `/notifications/${id}`),
    plansOverview: () => request('GET', '/plans/overview'),

    // Foto
    getPhotos: (planId) => request('GET', `/plans/${planId}/photos`),
    addPhoto: (planId, data) => request('POST', `/plans/${planId}/photos`, data),
    deletePhoto: (id) => request('DELETE', `/photos/${id}`),
  };
})();
