# Super Tuscany

Ricostruzione del sito **supertuscany.org** con grafica editoriale, contenuti e media originali, pronta per Netlify. Sito statico: nessuna dipendenza da Wix per il rendering, nessun framework o pacchetto necessario in produzione.

## Collegamento a Netlify

1. In Netlify scegli **Add new project → Import an existing project → GitHub**.
2. Seleziona `patpet21/luxurytoscany`, branch `main`.
3. Build command: `npm run build`. Publish directory: `dist`. Node: `22`.
4. Il file `netlify.toml` contiene già queste impostazioni.
5. Abilita **form detection** nella sezione Forms, poi esegui un deploy. I moduli rilevati devono essere `stay-request` e `information-request`.
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

## Modificare il sito

- Contenuti, immagini e dati delle ville: `content/source.json`.
- Struttura e componenti: `src/render.mjs`, `src/navigation.mjs`, `src/finder.mjs`.
- Grafica responsive: `public/assets/site.css` e `public/assets/experience.css`.
- Menu, moduli, filtri e gallerie: `public/assets/app.js`.
- Generazione delle pagine, redirect, sitemap e informative: `scripts/build.mjs`.

Il sito è in inglese come l'originale, rivolto soprattutto al pubblico americano. Non include ancora un pannello CMS per modifiche autonome del cliente; può essere aggiunto successivamente.

## Note prima di sostituire il sito Wix

- Le tariffe originali, spesso riferite a stagioni passate, sono conservate sotto **Published rate archive**. Le tariffe correnti vengono richieste al team.
- Informative privacy/cookie adattate al comportamento del nuovo sito: il cliente dovrà completare e verificare i dettagli del trattamento e le impostazioni effettive dell'account Netlify.
- Canonical e sitemap usano `https://www.supertuscany.org`. Prima di pubblicare con un dominio definitivo diverso, aggiornare gli URL in `src/render.mjs` e `scripts/build.mjs`.
- I percorsi originali sono conservati. Gli alias più chiari hanno redirect 301.
- Foto e filmati provengono dal sito originale; il manifest ne mantiene la provenienza. Non sono utilizzati contenuti sostitutivi generati.

Dominio, notifiche email, sincronizzazione calendari e verifica dell'invio effettivo dei moduli si completano nell'account del cliente dopo il collegamento a Netlify.
