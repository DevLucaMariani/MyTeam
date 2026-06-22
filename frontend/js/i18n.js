/* Motore bilingue IT/EN.
   Strategia: l'app è scritta in italiano; un MutationObserver traduce a video i
   testi noti (dizionario IT->EN) man mano che vengono renderizzati. I dati
   utente (nomi, esercizi, note) non sono nel dizionario e restano invariati. */
(function () {
  'use strict';

  const STORE = 'myteam-lang';
  let lang;
  try { lang = localStorage.getItem(STORE) || 'it'; } catch (e) { lang = 'it'; }

  // Dizionario statico IT -> EN.
  const EN = {
    // Ruoli / navigazione
    'Amministratore': 'Administrator', 'Coach': 'Coach', 'Cliente': 'Client',
    'Dashboard': 'Dashboard', 'Clienti': 'Clients', 'Esercizi': 'Exercises',
    'Notifiche': 'Notifications', 'Compensi': 'Earnings', 'Aspetto': 'Appearance',
    'Invita coach': 'Invite a coach', 'Home': 'Home', 'Scheda': 'Plan',
    'Nutrizione': 'Nutrition', 'Progressi': 'Progress', 'Esci': 'Log out',
    'Credits': 'Credits', 'Console Coach': 'Coach console', 'Errore': 'Error',
    // Pulsanti / azioni
    '+ Esercizio': '+ Exercise', '+ Foto': '+ Photo', '+ Giorno': '+ Day',
    '+ Nuova scheda': '+ New plan', '+ Nuovo cliente': '+ New client',
    '+ Nuovo coach': '+ New coach', '+ Nuovo esercizio': '+ New exercise',
    '+ Settimana': '+ Week', 'Accedi': 'Sign in', 'Annulla': 'Cancel',
    'Apri': 'Open', 'Apri scheda': 'Open plan', 'Carica': 'Upload', 'Chiudi': 'Close',
    'Duplica': 'Duplicate', 'Elimina': 'Delete', 'Elimina cliente': 'Delete client',
    'Elimina giorno': 'Delete day', 'Modifica': 'Edit', 'Monitora': 'Monitor',
    'Salva': 'Save', 'Salva e attiva': 'Save and activate',
    'Segna tutte come lette': 'Mark all as read', 'Invia': 'Send', 'Rifiuta': 'Reject',
    'Rimuovi logo': 'Remove logo', 'Rimuovi esercizio': 'Remove exercise',
    'Ripristina default': 'Reset to default', 'Richiedi accesso': 'Request access',
    'Vai alla home': 'Go to home', 'Scegli dal catalogo': 'Choose from catalog',
    'Scegli un esercizio': 'Choose an exercise', 'Carica foto': 'Upload photo',
    'Sblocca clienti': 'Unlock clients', 'Blocca a 2': 'Limit to 2',
    'Sospendi': 'Suspend', 'Riattiva': 'Reactivate',
    '✓ Approva': '✓ Approve', '← Indietro': '← Back', '↩ Indietro': '↩ Back',
    '↩ Torna alla scelta ruolo': '↩ Back to role selection',
    '↳ Calcola fine (inizio + durata)': '↳ Compute end (start + duration)',
    '📄 Importa da PDF': '📄 Import from PDF', '📋 Copia link': '📋 Copy link',
    '📋 Scegli': '📋 Choose', '📞 Chiama': '📞 Call', '✉️ Email': '✉️ Email',
    '🔒 Limite 2 clienti': '🔒 Limit: 2 clients', '🔗 Il tuo link di invito': '🔗 Your invite link',
    '🔗 Invia accesso': '🔗 Send access', '🔗 Link personale del cliente': '🔗 Client personal link',
    '🟢 Condividi su WhatsApp': '🟢 Share on WhatsApp', '🟢 Invia su WhatsApp': '🟢 Send on WhatsApp',
    '🟢 WhatsApp': '🟢 WhatsApp', '🥗 Piano nutrizionale': '🥗 Nutrition plan',
    '🏋️ Allenamento di oggi': "🏋️ Today's workout", '📈 Progressi e foto': '📈 Progress and photos',
    // Sezioni / titoli
    'Anagrafica': 'Personal info', 'Abbonamento': 'Subscription',
    'Abbonamento e pagamento': 'Subscription and payment', 'Pagamento': 'Payment',
    'Stato pagamento': 'Payment status', 'Stato': 'Status',
    'Schede di allenamento': 'Workout plans', 'Schede per scadenza': 'Plans by expiry',
    'Clienti recenti': 'Recent clients', 'Schede attive': 'Active plans',
    'Senza scheda attiva': 'Without active plan', 'In scadenza (≤1 sett.)': 'Expiring (≤1 week)',
    'Aggiornamenti settimanali ricevuti': 'Weekly updates received',
    'Compilazione per settimana': 'Weekly log', 'Foto di monitoraggio': 'Progress photos',
    'Storico versioni scheda': 'Plan version history', 'Storico settimane': 'Weeks history',
    'Struttura settimanale': 'Weekly structure',
    'Settimane, ripetizioni e intensità': 'Weeks, reps and intensity',
    'Piano nutrizionale': 'Nutrition plan', 'Le tue schede': 'Your plans',
    'Il tuo coach': 'Your coach', 'Il tuo riepilogo': 'Your summary',
    'Credenziali della console': 'Console credentials', 'Valori indicativi': 'Indicative values',
    'Catalogo vuoto': 'Empty catalog', 'Accesso cliente': 'Client access',
    'Diventa Coach': 'Become a Coach', 'Invita un coach': 'Invite a coach',
    'Richiesta inviata!': 'Request sent!', 'Invito non valido': 'Invalid invite',
    'Link non valido': 'Invalid link', 'Importato da PDF — da verificare': 'Imported from PDF — please verify',
    'Carica foto': 'Upload photo', 'Duplica scheda': 'Duplicate plan',
    // Campi / etichette
    'Nome': 'Name', 'Cognome': 'Last name', 'Email': 'Email', 'Telefono': 'Phone',
    'Data di nascita': 'Date of birth', 'Sesso': 'Gender', 'Altezza': 'Height',
    'Altezza (cm)': 'Height (cm)', 'Peso': 'Weight', 'Peso (kg)': 'Weight (kg)',
    'Obiettivo': 'Goal', 'Note': 'Notes', 'Nota': 'Note', 'Nascita': 'Birth',
    'Scadenza': 'Expiry', 'Scadenza abb.': 'Sub. expiry', 'Importo dovuto': 'Amount due',
    'Importo dovuto (€)': 'Amount due (€)', 'Pagato': 'Paid', 'Data pagamento': 'Payment date',
    'No': 'No', 'Sì': 'Yes', 'Altro': 'Other', 'N. serie': 'No. sets',
    'Serie di default': 'Default sets', 'Serie': 'Set', 'Ripetizioni': 'Reps',
    'Ripetizioni e intensità di default (per serie)': 'Default reps and intensity (per set)',
    'Intensità': 'Intensity', 'Rip.': 'Reps', 'Int.': 'Int.', 'Peso suggerito': 'Suggested weight',
    'Recupero': 'Rest', 'Tipo': 'Type', 'Immagine': 'Image', 'Foto (facoltativa)': 'Photo (optional)',
    'Logo (mostrato a te e ai tuoi clienti)': 'Logo (shown to you and your clients)',
    'Gruppo muscolare (facoltativo)': 'Muscle group (optional)',
    'Bio / specializzazione (vista dal cliente)': 'Bio / specialization (seen by the client)',
    'Nome utente': 'Username', 'Password': 'Password', 'Modalità': 'Mode',
    'Colore principale (accento)': 'Primary color (accent)', 'Sfondo (facoltativo)': 'Background (optional)',
    'Card / superficie (facoltativo)': 'Card / surface (optional)',
    'Superset (stesso codice = esercizi eseguiti insieme)': 'Superset (same code = exercises performed together)',
    'Prezzo della scheda (€) — usato per i compensi': 'Plan price (€) — used for earnings',
    'Nome esercizio': 'Exercise name', 'Nome nuova scheda': 'New plan name',
    'Data inizio': 'Start date', 'Data fine': 'End date', 'Copia verso': 'Copy to',
    // Stat / macro
    'Calorie': 'Calories', 'Acqua': 'Water', 'Acqua (l)': 'Water (L)', 'Proteine': 'Protein',
    'Proteine (g)': 'Protein (g)', 'Carboidrati': 'Carbs', 'Carbo (g)': 'Carbs (g)',
    'Grassi': 'Fat', 'Grassi (g)': 'Fat (g)',
    'Giorno di allenamento': 'Training day', 'Giorno di riposo': 'Rest day',
    '🏋️ Giorno di allenamento': '🏋️ Training day', '🛋️ Giorno di riposo': '🛋️ Rest day',
    // Badge / stato
    'Attiva': 'Active', 'attiva': 'active', 'Nessuna': 'None', 'In attesa': 'Pending',
    'Sospeso': 'Suspended', 'Clienti sbloccati': 'Clients unlocked', 'Conclusa': 'Completed',
    'da fare': 'to do', '✓ fatto': '✓ done', '✓ Pagato': '✓ Paid', 'Scaduta': 'Expired',
    'Ultima settimana': 'Last week', 'Fatto': 'Done', 'Account sospeso': 'Account suspended',
    'Scegli dal catalogo': 'Choose from catalog',
    '⛔ Account sospeso — sola lettura': '⛔ Account suspended — read only',
    // Header tabella
    'Cliente': 'Client', 'Periodo': 'Period', 'Durata': 'Duration', 'Ver.': 'Ver.',
    'Schede': 'Plans', 'Settimana': 'Week', 'Completati': 'Completed', 'Data': 'Date',
    'Versione': 'Version', 'Peso usato': 'Weight used', 'Portati': 'Brought',
    'Schede pag.': 'Billable plans', 'Imponibile': 'Taxable', 'Compenso': 'Earnings',
    'Tasso': 'Rate', 'Tasso attuale': 'Current rate', 'Compenso maturato': 'Earnings accrued',
    'Coach portati (attivi)': 'Coaches brought (active)', 'Schede a pagamento': 'Billable plans',
    // Gruppi muscolari (standard; quelli personalizzati restano)
    'Petto': 'Chest', 'Dorso': 'Back', 'Spalle': 'Shoulders', 'Bicipiti': 'Biceps',
    'Tricipiti': 'Triceps', 'Gambe': 'Legs', 'Addome': 'Abs',
    // Tipi foto
    'fronte': 'front', 'lato': 'side', 'retro': 'back', 'libera': 'free',
    // Messaggi / toast
    'Coach salvato': 'Coach saved', 'Cliente salvato': 'Client saved',
    'Esercizio salvato': 'Exercise saved', 'Scheda salvata': 'Plan saved',
    'Scheda eliminata': 'Plan deleted', 'Cliente eliminato': 'Client deleted',
    'Coach eliminato': 'Coach deleted', 'Esercizio eliminato': 'Exercise deleted',
    'Scheda inviata al cliente': 'Plan sent to the client', 'Scheda duplicata': 'Plan duplicated',
    'Foto caricata': 'Photo uploaded', 'Link copiato': 'Link copied', 'Copia non riuscita': 'Copy failed',
    'Notifiche segnate come lette': 'Notifications marked as read', 'Tasso aggiornato': 'Rate updated',
    'Aggiornato': 'Updated', 'Coach approvato': 'Coach approved', 'Coach sospeso': 'Coach suspended',
    'Coach riattivato': 'Coach reactivated', 'Aspetto salvato': 'Appearance saved',
    'Aspetto salvato — vale anche per i tuoi clienti': 'Appearance saved — also applies to your clients',
    'Bozza importata — controlla tutto': 'Draft imported — check everything',
    'Lettura PDF in corso…': 'Reading PDF…', 'Salvataggio non riuscito': 'Save failed',
    'Import non riuscito': 'Import failed', 'Impossibile aprire la scheda': 'Unable to open the plan',
    'Nessun esercizio riconosciuto nel PDF': 'No exercise recognized in the PDF',
    'Il nome è obbligatorio': 'Name is required',
    'Nome e cognome obbligatori': 'First and last name are required',
    'Indica il nome della scheda': 'Enter the plan name',
    'Imposta prima la data di inizio': 'Set the start date first',
    'Nome utente e password obbligatori': 'Username and password are required',
    'Compila nome, cognome, utente e password': 'Fill in name, last name, username and password',
    'Compila nome, cognome, utente e password': 'Fill in name, last name, username and password',
    'Password non corretta': 'Wrong password', 'Credenziali non valide': 'Invalid credentials',
    'Registrazione non riuscita': 'Registration failed',
    'Limite gratuito: 2 clienti. Chiedi allo staff di sbloccarne altri.': 'Free limit: 2 clients. Ask the staff to unlock more.',
    // Testi lunghi
    'Apri la scheda, inserisci i pesi e spunta gli esercizi.': 'Open the plan, enter weights and check off the exercises.',
    'Calorie e macro per giorni di allenamento e riposo.': 'Calories and macros for training and rest days.',
    'Carica le tue foto: fronte, lato, retro.': 'Upload your photos: front, side, back.',
    'Caricamento…': 'Loading…', 'Cerca esercizio…': 'Search exercise…',
    'Le modifiche creano una nuova versione': 'Changes create a new version',
    'Nessun aggiornamento inviato dal cliente.': 'No update sent by the client.',
    'Nessun aggiornamento inviato.': 'No update sent.',
    'Nessun esercizio in catalogo. Puoi scriverlo a mano nel campo nome.': 'No exercise in catalog. You can type it by hand in the name field.',
    'Nessun esercizio. Aggiungine uno.': 'No exercises. Add one.',
    'Nessun piano nutrizionale impostato.': 'No nutrition plan set.',
    'Nessuna foto caricata.': 'No photos uploaded.', 'Nessuna notifica per ora.': 'No notifications yet.',
    'Nessuna scheda attiva': 'No active plan', 'Nessuna scheda attiva al momento': 'No active plan at the moment',
    'Per contatti: ': 'Contact: ', 'Ideato e sviluppato da': 'Designed and developed by',
    'Piattaforma di gestione team': 'Team management platform',
    'Piattaforma di gestione team — schede, nutrizione e progressi.': 'Team management platform — plans, nutrition and progress.',
    'Questo link di invito non è valido o è scaduto.': 'This invite link is invalid or has expired.',
    'Questo link non è più valido. Chiedi al tuo coach di inviartene uno nuovo.': 'This link is no longer valid. Ask your coach to send you a new one.',
    'Il tuo coach non ha ancora attivato una scheda. Riprova più tardi.': 'Your coach has not activated a plan yet. Try again later.',
    'Apri il link personale che ti ha inviato il tuo coach per vedere la tua scheda.': 'Open the personal link your coach sent you to see your plan.',
    'Vengono copiati struttura ed esercizi e il piano nutrizionale. NON vengono copiati progressi, foto e dati compilati.': 'Structure, exercises and the nutrition plan are copied. Progress, photos and filled-in data are NOT copied.',
    'Impossibile contattare il backend locale.': 'Unable to reach the server.',
    'Verifica che i container Docker siano avviati (Avvia.bat).': 'Make sure the Docker containers are running (Avvia.bat).',
    'Invialo una volta sola: il link resta valido e i contenuti si aggiornano da soli.': 'Send it once: the link stays valid and the content updates by itself.',
    'La tua console: clienti, schede, nutrizione e monitoraggio.': 'Your console: clients, plans, nutrition and monitoring.',
    'Gestione dei coach e supervisione generale.': 'Coach management and overall supervision.',
    'Inserisci la password amministratore.': 'Enter the administrator password.',
    "Accedi con le credenziali che ti ha consegnato l'amministratore.": 'Sign in with the credentials given to you by the administrator.',
    'Porta altri coach e abbassa il tuo tasso': 'Bring more coaches and lower your rate',
    'I tuoi coach e le loro credenziali': 'Your coaches and their credentials',
    'Crea il primo coach e consegnagli nome utente e password.': 'Create the first coach and give them a username and password.',
    'Approva o crea un coach per vedere i compensi.': 'Approve or create a coach to see earnings.',
    'Primi 2 clienti gratis per coach; dal 3° si applica il tasso': 'First 2 clients free per coach; from the 3rd the rate applies',
    'Anagrafica e schede': 'Profile and plans', 'Catalogo riutilizzabile nelle schede': 'Reusable catalog for plans',
    'Aggiungi il primo cliente per iniziare.': 'Add the first client to get started.',
    'Aggiungi il primo cliente.': 'Add the first client.',
    'Aggiungi il primo esercizio: poi lo ritrovi nei suggerimenti quando crei una scheda.': 'Add the first exercise: you will then find it in suggestions when creating a plan.',
    'Attiva una scheda per vederla qui.': 'Activate a plan to see it here.',
    'Crea la prima scheda per questo cliente.': 'Create the first plan for this client.',
    'Panoramica della palestra': 'Overview', 'Aggiornamenti ricevuti dai clienti': 'Updates received from clients',
    'Nessun cliente': 'No clients', 'Nessun coach': 'No coaches', 'Nessun coach attivo': 'No active coach',
    'Nessuna notifica': 'No notifications', 'Nessuna scheda': 'No plans',
    'Le ripetizioni del "Default" valgono per tutte le settimane. Aggiungi o scegli una settimana per differenziarla.': 'The "Default" reps apply to every week. Add or pick a week to differentiate it.',
    'Nessun giorno. Aggiungine uno con "+ Giorno".': 'No days. Add one with "+ Day".',
    'Gli esercizi del catalogo vengono suggeriti (autocomplete) quando scrivi il nome di un esercizio in una scheda. Puoi comunque scrivere liberamente un nome non in elenco.': 'Catalog exercises are suggested (autocomplete) when you type an exercise name in a plan. You can still freely type a name that is not in the list.',
    'I quantitativi di calorie e macronutrienti sono una stima orientativa di massima, non una prescrizione dietetica. Adattali alle tue esigenze e, per un piano alimentare personalizzato, rivolgiti a un nutrizionista o a un medico.': 'Calorie and macronutrient amounts are a rough indicative estimate, not a dietary prescription. Adapt them to your needs and, for a personalized meal plan, consult a nutritionist or doctor.',
    "Chi si registra con questo link diventa un coach in attesa di approvazione dell'amministratore. Con 3 coach attivi portati da te, il tuo tasso scende dal 10% al 5%.": "Anyone who registers with this link becomes a coach pending the administrator's approval. With 3 active coaches you brought in, your rate drops from 10% to 5%.",
    'Con questo link il coach entra direttamente nella sua console, senza digitare la password. Invialo solo al coach giusto. In alternativa può accedere dalla schermata "Coach" con nome utente e password.': 'With this link the coach enters their console directly, without typing the password. Send it only to the right coach. Alternatively they can sign in from the "Coach" screen with username and password.',
    "Il tuo account è in attesa di approvazione dall'amministratore. Appena approvato potrai accedere come Coach.": 'Your account is pending approval by the administrator. Once approved you will be able to sign in as a Coach.',
    "Controlla esercizi, serie, ripetizioni e giorni: l'interpretazione automatica può contenere errori o righe di troppo. Gli schemi originali di tutte le settimane sono salvati nelle note di ogni esercizio.": 'Check exercises, sets, reps and days: the automatic interpretation may contain errors or extra rows. The original schemes for all weeks are saved in each exercise notes.',
    'Il compenso è la percentuale sul prezzo delle schede dei clienti oltre i primi 2 (gratuiti). Il tasso scende a 5% in automatico quando un coach porta 3 coach sponsorizzati e attivi; puoi comunque forzarlo qui.': 'The fee is the percentage on the price of plans for clients beyond the first 2 (free). The rate automatically drops to 5% when a coach brings 3 sponsored, active coaches; you can still force it here.',
    '🏃 Sei un cliente? Apri il link personale che ti ha inviato il tuo coach.': '🏃 Are you a client? Open the personal link your coach sent you.',
    "Invia l'aggiornamento settimanale e carica le foto.": 'Send the weekly update and upload photos.',
    'Come è andata la settimana? (facoltativo)': 'How did the week go? (optional)',
    "Invii all'istruttore esercizi svolti, pesi usati e percentuale di completamento.": 'You send the coach the exercises done, weights used and completion percentage.',
    'Nome esercizio (scrivi o scegli dalla lista)': 'Exercise name (type or pick from the list)',
    'Nome scheda…': 'Plan name…', "Nota valida per tutto l'esercizio": 'Note for the whole exercise',
    // Tooltip / title
    'Rimuovi esercizio': 'Remove exercise', 'Scegli dal catalogo': 'Choose from catalog',
    'Limite gratuito: 2 clienti. Chiedi allo staff di sbloccarne altri.': 'Free limit: 2 clients. Ask the staff to unlock more.',
    // Titolo pagina
    'MyTeam — Gestione Team': 'MyTeam — Team management',
    // Conferme statiche / badge / mancanti
    'Eliminare definitivamente il cliente e tutte le sue schede?': 'Permanently delete the client and all their plans?',
    'Eliminare questa foto?': 'Delete this photo?',
    'Eliminare questa notifica?': 'Delete this notification?',
    "Seleziona un'immagine": 'Select an image',
    'Hai una nuova notifica': 'You have a new notification',
    'bozza': 'draft', 'archiviata': 'archived',
    '— esegui insieme agli esercizi con lo stesso codice': '— perform together with the exercises sharing the same code',
    'mai connesso': 'never connected', 'Online': 'Online',
  };

  // Pattern per i testi dinamici (numeri, settimane, ecc.).
  const PATTERNS = [
    { re: /^(\d+) clienti$/, en: (m) => m[1] + ' clients' },
    { re: /^(\d+) coach$/, en: (m) => m[1] + ' coaches' },
    { re: /^(\d+) esercizi in catalogo$/, en: (m) => m[1] + ' exercises in catalog' },
    { re: /^(\d+) esercizi$/, en: (m) => m[1] + ' exercises' },
    { re: /^Serie (\d+)$/, en: (m) => 'Set ' + m[1] },
    { re: /^Sett\. (\d+)$/, en: (m) => 'Week ' + m[1] },
    { re: /^Settimana (\d+)$/, en: (m) => 'Week ' + m[1] },
    { re: /^S(\d+)$/, en: (m) => 'W' + m[1] },
    { re: /^La tua settimana (\d+)$/, en: (m) => 'Your week ' + m[1] },
    { re: /^Tuo tasso attuale: (\d+)%$/, en: (m) => 'Your current rate: ' + m[1] + '%' },
    { re: /^Aggiornamento settimana (\d+)$/, en: (m) => 'Week ' + m[1] + ' update' },
    { re: /^📨 Invia aggiornamento settimana (\d+)$/, en: (m) => '📨 Send week ' + m[1] + ' update' },
    { re: /^(\d+) di (\d+) serie completate$/, en: (m) => m[1] + ' of ' + m[2] + ' sets completed' },
    { re: /^Totale maturato: (.+)$/, en: (m) => 'Total accrued: ' + m[1] },
    { re: /^(\d+) sett\. rimaste$/, en: (m) => m[1] + ' wk left' },
    { re: /^(\d+) sett\.$/, en: (m) => m[1] + ' wk' },
    { re: /^Da saldare (.+)$/, en: (m) => 'To pay ' + m[1] },
    { re: /^(\d+) \((\d+) a pagamento\)$/, en: (m) => m[1] + ' (' + m[2] + ' billable)' },
    { re: /^Rimuovi settimana (\d+)$/, en: (m) => 'Remove week ' + m[1] },
    { re: /^Accesso console — (.+)$/, en: (m) => 'Console access — ' + m[1] },
    { re: /^(\d+) non lette su (\d+)$/, en: (m) => m[1] + ' unread of ' + m[2] },
    { re: /^Hai (\d+) nuove notifiche$/, en: (m) => 'You have ' + m[1] + ' new notifications' },
    { re: /^Inviato! Completamento (\d+)%$/, en: (m) => 'Sent! Completion ' + m[1] + '%' },
    { re: /^Giorno (.+)$/, en: (m) => 'Day ' + m[1] },
    { re: /^peso sugg\. (.+) · rec (.+)$/, en: (m) => 'sugg. weight ' + m[1] + ' · rest ' + m[2] },
    { re: /^peso sugg\. (.+)$/, en: (m) => 'sugg. weight ' + m[1] },
    { re: /^Stai personalizzando solo la settimana (\d+)\. Le altre restano sul "Default"\.$/, en: (m) => 'You are customizing only week ' + m[1] + '. The others stay on "Default".' },
    { re: /^(\d+) trainer$/, en: (m) => m[1] + ' coaches' },
    { re: /^(\d+) serie( .+)?$/, en: (m) => m[1] + ' sets' + (m[2] || '') },
    { re: /^(\d+) \(primi (\d+) gratis\)$/, en: (m) => m[1] + ' (first ' + m[2] + ' free)' },
    { re: /^(\d+) clienti · (\d+)%$/, en: (m) => m[1] + ' clients · ' + m[2] + '%' },
    { re: /^Automatico \((\d+)%\)$/, en: (m) => 'Automatic (' + m[1] + '%)' },
    { re: /^📋 (.+) · (\d+) settimane$/, en: (m) => '📋 ' + m[1] + ' · ' + m[2] + ' weeks' },
    { re: /^Monitoraggio — (.+)$/, en: (m) => 'Monitoring — ' + m[1] },
    { re: /^Progressi del cliente( · .+)?$/, en: (m) => 'Client progress' + (m[1] || '') },
    { re: /^· rec (.+)$/, en: (m) => '· rest ' + m[1] },
    { re: /^Eliminare "(.+)" dal catalogo\?$/, en: (m) => 'Delete "' + m[1] + '" from the catalog?' },
    { re: /^Eliminare il coach (.+)\? I suoi clienti restano, ma senza coach assegnato\.$/, en: (m) => 'Delete coach ' + m[1] + '? Their clients remain, but with no assigned coach.' },
    { re: /^Eliminare la scheda "(.+)"\? L'azione è definitiva e rimuove anche progressi e foto collegati\.$/, en: (m) => 'Delete the plan "' + m[1] + '"? This is permanent and also removes linked progress and photos.' },
    { re: /^Riattivare (.+)\?$/, en: (m) => 'Reactivate ' + m[1] + '?' },
    { re: /^Rifiutare ed eliminare la richiesta di (.+)\?$/, en: (m) => 'Reject and delete the request from ' + m[1] + '?' },
    { re: /^Sospendere (.+)\? Potrà accedere ma non potrà operare\.$/, en: (m) => 'Suspend ' + m[1] + '? They can sign in but cannot operate.' },
    { re: /^Invitato da (.+)\. Compila per richiedere l'accesso: sarà attivato dall'amministratore\.$/, en: (m) => 'Invited by ' + m[1] + '. Fill in to request access: it will be activated by the administrator.' },
    { re: /^visto adesso$/, en: () => 'seen just now' },
    { re: /^visto (\d+) min fa$/, en: (m) => 'seen ' + m[1] + ' min ago' },
    { re: /^visto (\d+) h fa$/, en: (m) => 'seen ' + m[1] + ' h ago' },
    { re: /^visto ieri$/, en: () => 'seen yesterday' },
    { re: /^visto (\d+) giorni fa$/, en: (m) => 'seen ' + m[1] + ' days ago' },
  ];

  function trOf(o) {
    const k = o.trim();
    if (!k) return o;
    if (EN[k] != null) return o.replace(k, EN[k]);
    for (const p of PATTERNS) { const m = k.match(p.re); if (m) return o.replace(k, p.en(m)); }
    return o;
  }

  const origText = new WeakMap();
  const origAttr = new WeakMap();
  let titleOrig = null;

  function applyTextNode(n) {
    if (!origText.has(n)) origText.set(n, n.data);
    const o = origText.get(n);
    const v = lang === 'en' ? trOf(o) : o;
    if (n.data !== v) n.data = v;
  }
  function applyAttr(el) {
    ['placeholder', 'title'].forEach((a) => {
      if (!el.hasAttribute(a)) return;
      let store = origAttr.get(el);
      if (!store) { store = {}; origAttr.set(el, store); }
      if (store[a] === undefined) store[a] = el.getAttribute(a);
      el.setAttribute(a, lang === 'en' ? trOf(store[a]) : store[a]);
    });
  }
  function walk(node) {
    if (node.nodeType === 3) { applyTextNode(node); return; }
    if (node.nodeType !== 1) return;
    const tw = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
    const texts = [];
    let t; while ((t = tw.nextNode())) texts.push(t);
    texts.forEach(applyTextNode);
    if (node.hasAttribute && (node.hasAttribute('placeholder') || node.hasAttribute('title'))) applyAttr(node);
    if (node.querySelectorAll) node.querySelectorAll('[placeholder],[title]').forEach(applyAttr);
  }
  function translateAll() {
    if (document.body) walk(document.body);
    if (titleOrig === null) titleOrig = document.title;
    document.title = lang === 'en' ? trOf(titleOrig) : titleOrig;
  }

  const obs = new MutationObserver((muts) => {
    for (const m of muts) m.addedNodes.forEach((n) => { try { walk(n); } catch (e) { /* ignora */ } });
  });

  function setLang(l) {
    lang = l;
    try { localStorage.setItem(STORE, l); } catch (e) { /* ignora */ }
    document.documentElement.lang = l;
    translateAll();
    document.querySelectorAll('.lang-btn').forEach((b) => b.classList.toggle('active', b.getAttribute('data-lang') === lang));
  }

  // Selettore lingua IT/EN (elemento riutilizzabile).
  function toggleEl() {
    const wrap = document.createElement('div');
    wrap.className = 'lang-toggle';
    [['it', 'IT'], ['en', 'EN']].forEach(([code, label]) => {
      const b = document.createElement('button');
      b.className = 'lang-btn' + (lang === code ? ' active' : '');
      b.setAttribute('data-lang', code);
      b.textContent = label;
      b.addEventListener('click', () => setLang(code));
      wrap.appendChild(b);
    });
    return wrap;
  }

  function start() {
    obs.observe(document.body, { childList: true, subtree: true });
    translateAll();
  }
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);

  window.I18N = { setLang, getLang: () => lang, toggleEl, t: (s) => (lang === 'en' ? trOf(s) : s) };
})();
