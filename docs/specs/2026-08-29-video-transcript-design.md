# Transcript del video — design

Stato: approvato, pronto per il piano di implementazione.
Data: 2026-08-29.

## Obiettivo

Nel player, un terzo tab accanto a "Commenti" e "Segnalibri" che mostra il
transcript del video: righe `[mm:ss] testo`, riga corrente evidenziata
durante la riproduzione, click su una riga per saltare a quel punto,
ricerca nel testo e copia negli appunti.

## Vincolo di fattibilità: non esiste una via ufficiale

Verificato il 2026-08-29, prima del design:

- `captions.download` della YouTube Data API richiede OAuth **del
  proprietario del video** e risponde 403 su qualsiasi video di terzi.
  Non è aggirabile con scope più larghi, service account o altre chiavi.
- L'endpoint non documentato `youtube.com/api/timedtext` oggi richiede un
  proof-of-origin token e blocca gli IP datacenter (429 o risposte vuote
  con 200). Un Cloudflare Worker è un IP datacenter: si romperebbe subito.
- Dal browser è comunque irraggiungibile: `timedtext` non espone header
  CORS.

Conseguenza: il testo può arrivare **solo da un provider esterno** che
esegue l'estrazione al posto nostro. Questo comporta una dipendenza da un
servizio che accede a YouTube in modo non autorizzato dai ToS: appoggiarsi
a quel servizio sposta la responsabilità sul fornitore, non la elimina —
e questo vale identicamente sul piano gratuito. La scelta
è stata presa consapevolmente, tenendo conto che questo repo aveva già
rimosso il fallback Piped per compliance prima della pubblicazione.

## Vincolo: costo zero

La feature non deve generare alcun costo, né ora né in futuro. Questo
determina la scelta del fornitore e il comportamento al raggiungimento del
limite.

- Si usa un provider il cui piano gratuito è **ricorrente** (si rinnova
  ogni mese) e **non richiede una carta di credito**. Quest'ultimo punto è
  la garanzia vera: non è un contatore scritto bene a impedire un
  addebito, è l'assenza di uno strumento con cui addebitare.
- Fornitori con crediti gratuiti **una tantum**, seguiti da pagamento a
  consumo, sono esclusi anche quando costano meno a volume.
- Il tetto è di circa **100 video nuovi al mese**, non 100
  visualizzazioni: grazie alla cache permanente un video già aperto una
  volta, da chiunque, resta gratuito per sempre e per tutti.
- **Nessun contatore di budget lato worker.** Sarebbe stato uno stato in
  più da mantenere e da azzerare ogni mese senza aggiungere alcuna
  protezione: senza carta registrata l'addebito è impossibile, e
  l'esaurimento dei crediti lo comunica il provider stesso. Il worker si
  limita a tradurre quella risposta in uno stato esplicito.

Limite accettato consapevolmente: un piano gratuito è una concessione del
fornitore, non un contratto. Se venisse chiuso, la feature smetterebbe di
funzionare per i video non ancora in cache. Quelli già cachati
continuerebbero a funzionare.

## Vincolo permanente: repo pubblico

Questo repository (`youtube-player`, frontend) è **pubblico**. Il worker
vive in un repository **privato** separato (`Y:\youtube-player-worker`,
branch `master` — vedi memoria `cloudflare-worker-proxy-and-deploy`).

Il provider che fornisce i transcript **non deve mai essere nominato,
referenziato o reso deducibile** nel repo pubblico — né in codice, né in
nomi di funzioni o endpoint, né in commenti, né nei test. Stessa regola
già in vigore per la fonte che risolve i brani della radio. Il frontend
chiama `GET /transcript` sul worker e riceve dei segmenti: da dove
arrivano è un dettaglio interno del worker, non un contratto del frontend.

## Approccio

Il worker incapsula provider, chiave e cache. Il frontend riceve una
struttura neutra e fa tutto il resto (ricerca, evidenziazione, copia) in
locale, con funzioni pure e senza costi aggiuntivi.

## 1. Worker — `GET /transcript` (repo privato, qui solo il contratto)

```text
GET /transcript?videoId=<id>
→ 200 { videoId, lang: string, segments: [{ start: number, dur: number, text: string }] }
```

- `start` e `dur` in secondi.
- Video senza sottotitoli → `200` con `segments: []`. **Non** è un errore:
  è uno stato normale che la UI sa mostrare.
- Crediti mensili del provider esauriti → `429`. Stato distinto da "nessun
  sottotitolo": il video potrebbe avere un transcript, semplicemente non
  possiamo recuperarlo adesso. La UI lo dice con parole diverse.
- `TRANSCRIPT_API_KEY` assente → `503`, come già fa `/radio` con
  `LASTFM_API_KEY`.
- Lingua: si prende la traccia predefinita del video. Nessun parametro di
  lingua in questa versione (vedi Fuori scope).
- Costo: **1 subrequest**. Il tetto di 50 per invocazione documentato in
  `cloudflare-worker-proxy-and-deploy` non è un tema qui.

### Cache: KV permanente

Nuovo binding KV `TRANSCRIPTS` (il worker oggi non ha storage durevole,
solo `caches.default`, che è per-colo e volatile).

- Chiave `t:<videoId>`, valore la risposta serializzata.
- **Nessuna scadenza** sui transcript trovati: il testo di un video non
  cambia. Ogni video costa una richiesta al provider una volta sola nella
  vita dell'app; dal secondo accesso in poi, per qualunque utente, è
  gratis.
- Risultato vuoto (video senza sottotitoli) cachato con **TTL 7 giorni**,
  non permanente: i sottotitoli possono comparire in seguito.
- È questa cache a rendere sostenibile il piano gratuito del provider. I
  limiti free di KV (1k scritture/giorno, 100k letture/giorno) restano
  lontani.

## 2. Frontend — `src/utils/transcript.ts` (nuovo, puro)

Nessun fetch, nessun DOM, interamente testabile:

```ts
export interface TranscriptSegment { start: number; dur: number; text: string }

export const formatCue = (seconds: number): string
export const findActiveIndex = (segments: TranscriptSegment[], t: number): number
export const filterSegments = (segments: TranscriptSegment[], query: string): TranscriptSegment[]
export const toPlainText = (segments: TranscriptSegment[]): string
```

- `formatCue`: `mm:ss`, e `h:mm:ss` oltre l'ora.
- `findActiveIndex`: ultimo segmento con `start <= t`; `-1` prima del
  primo o su lista vuota. Ricerca binaria — viene chiamata in polling.
- `filterSegments`: match case-insensitive sul testo; query vuota o solo
  spazi restituisce la lista intera.
- `toPlainText`: righe unite da `\n`, senza timestamp, per la copia.

## 3. Frontend — integrazione

- `useYouTubeAPI.getTranscript(videoId)` → chiama `GET /transcript`.
- `activeTab` in `VideoPlayer.vue` passa da `'comments' | 'bookmarks'` a
  `'comments' | 'bookmarks' | 'transcript'`.
- **Caricamento pigro**: il fetch parte al primo click sul tab, mai al
  cambio video. È il controllo di costo principale — chi non apre il tab
  non consuma credito. Al cambio video lo stato del transcript si azzera e
  torna pigro.
- Nuovo componente `TranscriptPanel.vue` + `TranscriptPanel.css`:
  `VideoPlayer.vue` è già a 445 righe e assorbire lì anche ricerca,
  polling ed evidenziazione lo renderebbe difficile da tenere in testa.
  Props: `segments`, `loading`, `currentTime` e `status:
  'ok' | 'empty' | 'quota' | 'error'`. Uno stato unico e non due booleani
  separati, perché i quattro casi si escludono a vicenda e ognuno ha un
  messaggio diverso. Emette `seek` (secondi) e non tocca il player
  direttamente.
- Click su una riga → `seekTo(segment.start)`, riusando lo stesso percorso
  già in uso per i segnalibri (`handleSeekToBookmark`).
- Evidenziazione: `getCurrentTime()` in polling ogni 500ms, **avviato solo
  a tab aperto** e fermato al cambio tab, al cambio video e in
  `onUnmounted`. La riga attiva si porta in vista solo se l'utente non ha
  scrollato manualmente.
- Copia: `navigator.clipboard.writeText(toPlainText(segments))` con
  conferma visiva temporanea, come già fa `bookmarkFeedback`.
- i18n: nuove chiavi in **tutti e 9 i locali**. `TranslationKeys` è
  tipizzata: se ne manca una, `vue-tsc` fallisce.

## 4. Errori

- `segments: []` → messaggio "nessun transcript disponibile", nessun
  bottone di copia. Non è un errore.
- `429` → messaggio dedicato: il limite mensile gratuito è esaurito, i
  video già aperti in precedenza restano disponibili. Testo diverso dal
  caso precedente, perché la causa e l'attesa sono diverse.
- Fetch fallito o `503` → messaggio di errore con possibilità di riprovare;
  il resto del player non viene toccato.
- Clipboard negata dal browser → la conferma non compare, nessun crash.

## 5. Test

Worker (repo privato): mapping della risposta del provider sul contratto,
hit e miss di KV, video senza sottotitoli (incluso il TTL breve), crediti
esauriti → 429, chiave mancante → 503. Il caso "crediti esauriti" verifica
anche che **non venga scritto nulla in KV**: una risposta vuota per quota
non deve sporcare la cache e impedire il recupero il mese successivo.

Frontend (questo repo):

- `src/utils/transcript.test.ts` per le quattro funzioni pure, inclusi i
  bordi: lista vuota, `t` prima del primo segmento, query senza match,
  durate oltre l'ora.
- Test del pannello: click su una riga emette `seek` col valore giusto,
  la ricerca filtra, lo stato vuoto non mostra il bottone di copia.

## 6. Deploy

Ordine obbligato: **worker prima, frontend dopo**. Netlify pubblica in
automatico sul push a `main`, quindi invertire l'ordine metterebbe live un
tab che fallisce.

1. Creare il namespace KV e aggiungere il binding in `wrangler.toml`.
2. `npx wrangler secret put TRANSCRIPT_API_KEY` (input interattivo: la
   chiave non passa mai dalla chat).
3. `./scripts/deploy.sh` nel repo del worker.
4. Verifica con `curl` sull'URL `workers.dev` — non in locale: `dev:worker`
   esegue la copia stale in `worker/`, che non è il codice in produzione.
5. Push del frontend su `main`.

## Fuori scope

Traduzione del transcript in lingue che il video non ha e riassunto
automatico: entrambi sono richieste a pagamento aggiuntive (il riassunto
richiederebbe anche un LLM, quindi un secondo fornitore e un secondo
secret), quindi incompatibili con il vincolo di costo zero. Selettore fra
più tracce di sottotitoli. Export `.srt` o download del testo come file.
