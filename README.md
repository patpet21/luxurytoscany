# Super Tuscany

Ricostruzione del sito **supertuscany.org** con grafica editoriale, contenuti e media originali, pronta per Netlify. Sito statico: nessuna dipendenza da Wix per il rendering, nessun framework o pacchetto necessario in produzione.

## Collegamento a Netlify

1. In Netlify scegli **Add new project → Import an existing project → GitHub**.
2. Seleziona `patpet21/luxurytoscany`, branch `main`.
3. Build command: `npm run build`. Publish directory: `dist`. Node: `22`.
4. Il file `netlify.toml` contiene già queste impostazioni.
5. Abilita **form detection** nella sezione Forms, poi esegui un deploy. I moduli rilevati devono essere `stay-request`, `information-request` e `concierge-message`.
6. Configura le notifiche dei moduli verso l'indirizzo scelto dal cliente. Fai una richiesta di prova sul sito pubblicato e controlla che compaia in Forms. Nessuna email viene inviata direttamente dal browser.

Il sito contiene numerosi media originali: usa l'importazione Git, non il caricamento manuale del repository completo nel browser.

## Anteprima e controlli

```sh
npm run build
npm run check
npm run dev
```

Anteprima locale: `http://127.0.0.1:4173`. È possibile cambiare porta tramite la variabile `PORT`.

`npm run check` verifica le pagine generate, i collegamenti interni, i file media delle gallerie, i titoli e la separazione tra i due moduli. In localhost i moduli sono intenzionalmente in modalità anteprima e non inviano richieste.

## Contenuti inclusi

- Tutte le 75 pagine recuperate dal sito originale, più pagine di contatto, conferma e alias di navigazione.
- Le 11 ville, con caratteristiche, descrizioni, servizi, condizioni, posizione, gallerie complete e collegamenti ai calendari originali.
- Destinazioni, esperienze indoor/outdoor, pacchetti, attività per bambini, storia del brand, FAQ, foto e video.
- Logo e fotografie originali conservati localmente; 30 filmati originali, ottimizzati senza tagli per la distribuzione web.
- Navigazione completa, filtri delle ville, lightbox delle foto, layout responsive e controlli per limitare il caricamento di contenuti esterni.

La fonte dei contenuti è `content/source.json`; `content/media-manifest.json` conserva gli URL di provenienza dei media. `content/inventory.json` documenta il recupero. `content/delivery-media.json` documenta l'ottimizzazione dei video e la conservazione della durata. I file HTML originali e i download non utilizzati restano solo nella cache locale esclusa da Git.

## Moduli e prenotazioni

La home e le pagine delle collezioni includono una ricerca per ville oppure esperienze, senza dover conoscere il nome di una proprietà. Le ville si filtrano per destinazione, numero di adulti e bambini, camere, bagni e servizi combinabili. Capienza, camere e bagni sono recuperati dai campi esplicitamente etichettati nella pagina originale delle ville; i servizi sono ricavati dalle descrizioni tramite `src/finder.mjs`. Le date facoltative sono preferenze per la richiesta, non un controllo automatico della disponibilità: vengono trasferite al modulo insieme agli ospiti. Le esperienze si filtrano per interesse e contesto; il gruppo viene riportato nella richiesta senza campi data.

La navigazione è divisa in ville, esperienze, destinazioni, famiglie e il team, con menu illustrati e collegamenti raggruppati. I filmati locali hanno 30 anteprime fotografiche estratte dal video originale: passaggio del mouse per un'anteprima silenziosa, uscita del mouse per fermarla e ripristinare l'immagine, pulsante per la visione con audio. Su dispositivi touch e con movimento ridotto resta la riproduzione esplicita. Rigenerare le immagini con `python scripts/video_posters.py` (richiede FFmpeg); i filmati non vengono modificati.

CSS e JavaScript hanno URL con la versione del contenuto, così gli aggiornamenti non riutilizzano una copia precedente degli stili nella cache.

**Plan a stay** richiede arrivo, partenza e numero di ospiti. La partenza deve essere successiva all'arrivo. **Ask a question** e le richieste su esperienze/proprietari non hanno campi data. Entrambi i moduli includono honeypot antispam e informativa privacy.

I moduli raccolgono richieste: non confermano prenotazioni, non incassano pagamenti e non bloccano automaticamente i calendari. I calendari Google sono quelli già collegati sul sito originale; vengono caricati solo su richiesta. Per Villa Roncovisi è preservato anche il feed iCal originale.

La sincronizzazione con gli altri siti richiede identificazione dei rispettivi gestionali e accesso ai feed iCal/API. Il sistema di sincronizzazione non è implementato in questa ricostruzione.

## Concierge e pagina About

Il concierge è presente in tutte le pagine, con schede delle ville e delle esperienze originali, preferenze mantenute durante la conversazione, risposte alle principali FAQ e passaggio al modulo Netlify. La conversazione viene riportata nel messaggio: il visitatore la rivede, inserisce i contatti e invia personalmente. Le richieste generali e sulle esperienze non chiedono date. La chat non è una conversazione in diretta con un operatore e non invia richieste automaticamente.

Il concierge funziona interamente nel browser come **guida del sito**, con risposte e filtri in italiano/inglese basati sul catalogo. Non richiede chiavi API, abbonamenti AI o servizi AI a pagamento. Usa regole e contenuti pubblicati: riconosce preferenze e domande previste; per domande senza risposta verificata propone di contattare il team. Non è un'AI generativa.

Il catalogo pubblico viene generato da `src/concierge.mjs` durante `npm run build` e caricato dal sito stesso. La conversazione resta in memoria nella scheda, senza cookie o localStorage, e “Start again” la azzera. I messaggi vengono riportati nel modulo solo quando il visitatore sceglie di preparare una richiesta; l'invio al team avviene con il normale modulo Netlify.

Nel box concierge sono sempre visibili WhatsApp (link fornito dal cliente) e il telefono **+1 917 724 3124**. La scheda **Leave a message** contiene il modulo rapido `concierge-message`, con email e messaggio obbligatori, consenso privacy e honeypot. Non chiede nomi o date. Il visitatore scrive e invia direttamente al team tramite Netlify Forms; non viene simulata una risposta di un operatore. Le richieste generali dalla guida aprono questo box, precompilando l'ultima domanda se il campo è vuoto. Le richieste esplicite di soggiorno mantengono il modulo dedicato con date. Configurare su Netlify anche le notifiche del nuovo modulo: l'indirizzo `email` della richiesta serve per rispondere al visitatore. Il collegamento WhatsApp apre la chat con il messaggio iniziale proposto; l'invio resta una scelta del visitatore.

**Prezzi e disponibilità aggiornati non sono collegati**: il concierge indirizza queste domande al team e non conferma prenotazioni. Per interrogarli occorre prima identificare e collegare il gestionale/API delle proprietà.

About ha un impaginato dedicato: paesaggio originale, racconto in capitoli, foto di Christian e amici distribuite lungo lo scorrimento, mappa e valori. Le foto vengono mostrate nei singoli riquadri della striscia originale tramite CSS; i file originali e la galleria completa sono preservati. Nessuno scorrimento forzato o animazione indispensabile.

Per queste modifiche, su richiesta del cliente, **non sono stati eseguiti build, test locali o verifiche nel browser**. Il deploy Netlify compila le nuove pagine.

## Grafica luxury

La direzione visiva usa avorio caldo, tonalità scure e dettagli in ottone, con la tipografia serif e sans già ospitata nel sito. Titoli ampi, spaziature editoriali, fotografie verticali nella collezione, cornici sottili, ricerca essenziale e sezioni scure per esperienze e servizio personale. Lo stile è esteso a menu, pagine delle proprietà, gallerie, filmati, About, moduli e concierge, con adattamenti per tablet e telefono e rispetto delle preferenze di movimento ridotto.

`public/assets/luxury.css` viene caricato dopo gli stili esistenti e usa una versione basata sul contenuto, così ogni deploy aggiorna anche la cache. Questa modifica riguarda la presentazione: struttura, ordine delle sezioni, logo, testi, file fotografici e video, filtri, anteprime al passaggio del mouse, moduli, WhatsApp e telefono sono conservati. Nessun servizio AI o altro servizio esterno aggiunto. Su richiesta del cliente non sono stati eseguiti build, test locali o controlli nel browser per questa modifica grafica.

## File da modificare

- Contenuti, immagini e dati delle ville: `content/source.json`.
- Struttura e componenti: `src/render.mjs`, `src/navigation.mjs`, `src/finder.mjs`.
- Grafica responsive: `public/assets/site.css` e `public/assets/experience.css`.
- Menu, moduli, filtri e gallerie: `public/assets/app.js`.
- Generazione delle pagine, redirect, sitemap e informative: `scripts/build.mjs`.
- About: `src/about.mjs`; concierge: `src/concierge.mjs`, `public/assets/concierge.js`, `public/assets/concierge-engine.js`.
- Stili About e concierge: `public/assets/story-concierge.css`.
- Direzione visiva luxury per tutte le pagine: `public/assets/luxury.css`.

Il sito è in inglese come l'originale, rivolto soprattutto al pubblico americano. Non include ancora un pannello CMS per modifiche autonome del cliente; può essere aggiunto successivamente.

## Note prima di sostituire il sito Wix

- Le tariffe originali, spesso riferite a stagioni passate, sono conservate sotto **Published rate archive**. Le tariffe correnti vengono richieste al team.
- Informative privacy/cookie adattate al comportamento del nuovo sito: il cliente dovrà completare e verificare i dettagli del trattamento e le impostazioni effettive dell'account Netlify.
- Canonical e sitemap usano `https://www.supertuscany.org`. Prima di pubblicare con un dominio definitivo diverso, aggiornare gli URL in `src/render.mjs` e `scripts/build.mjs`.
- I percorsi originali sono conservati. Gli alias più chiari hanno redirect 301.
- Foto e filmati provengono dal sito originale; il manifest ne mantiene la provenienza. Non sono utilizzati contenuti sostitutivi generati.

Dominio, notifiche email, sincronizzazione calendari e verifica dell'invio effettivo dei moduli si completano nell'account del cliente dopo il collegamento a Netlify.


## Ricerca ville con mappa

La voce “Plan your stay” nel menu e il richiamo generale portano alla collezione ville, con elenco e mappa affiancati su desktop e selettore List / Map su telefono. I filtri per destinazione, ospiti, camere, bagni e servizi aggiornano sia i risultati sia gli indicatori. Le date vengono riportate nella richiesta al team: non sono usate per dichiarare disponibilità confermata.

La mappa usa Leaflet **1.9.4**, conservato in `public/assets/vendor/leaflet/` insieme alla licenza BSD, e le immagini cartografiche di OpenStreetMap. Non richiede chiavi API o servizi a pagamento. Si inizializza quando visibile; su telefono resta inattiva finché viene selezionata Map. L’attribuzione OpenStreetMap rimane visibile e le richieste rispettano il caricamento ordinario e la cache del browser, senza download massivi o pre-caricamento offline. Il servizio pubblico delle immagini non offre una garanzia di disponibilità; il provider è configurabile con `data-tile-url` in `src/finder.mjs`. La pagina Privacy descrive questa connessione esterna.

Le coordinate provengono dai dati originali e indicano aree approssimative. Ville con coordinate identiche vengono raggruppate nel medesimo indicatore; le ville senza coordinate rimangono nell’elenco. I popup mostrano foto originali, capienza e camere, consentono di ritrovare la villa nell’elenco e aprono il modulo esistente con villa, ospiti e date già scelti. Non vengono inventati indirizzi, prezzi o disponibilità.

La sezione “Other homes to fall for” propone fino a tre alternative non presenti nei risultati attualmente mostrati. Rispetta la capienza richiesta, preferisce zona e servizi affini e chiarisce che le altre preferenze possono differire. Si aggiorna quando cambiano i filtri o si espande l’elenco; scompare se non esistono alternative.

Implementazione: `src/finder.mjs`, `public/assets/app.js`, `public/assets/villa-map.js` e `public/assets/villa-map.css`. Gli asset specifici della mappa vengono caricati solo sulla collezione ville. Su richiesta del cliente non sono stati eseguiti build, test locali o verifiche nel browser per questa modifica.
