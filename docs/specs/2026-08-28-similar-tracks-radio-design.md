# Radio di brani simili (Last.fm) — design

Stato: approvato, pronto per il piano di implementazione.
Data: 2026-08-28.

## Obiettivo

Quando il video aperto è un brano musicale, mostrare un bottone "Ascolta
brani simili" nel player. Al click parte una radio: la coda di
riproduzione viene sostituita da brani simili (Last.fm `track.getSimilar`)
e parte subito il primo.

## Vincolo permanente: repo pubblico

Questo repository (`youtube-player`, frontend) è **pubblico**. Il worker
che lo serve vive in un repository **privato** separato
(`Y:\youtube-player-worker`, branch `master` — vedi memoria
`cloudflare-worker-proxy-and-deploy`). La risoluzione di un brano
("Artista - Titolo") in un videoId YouTube passa da una fonte alternativa
a YouTube Data API per non consumare quota; quella fonte **non deve mai
essere nominata, referenziata o resa deducibile** nel repo pubblico — né
in codice, né in nomi di funzioni/endpoint, né in commenti, né nei test.
Il frontend chiama `GET /radio` sul worker e riceve `Video[]`: da dove
arrivano i video è un dettaglio del worker, non un contratto del
frontend.

## Approccio

Detection nel frontend (euristiche pure, testabili, senza segreti).
Risoluzione Last.fm + brano→videoId nel worker (ha già le API key come
secret Cloudflare e il pattern `withFallback`/`mapWithConcurrency` per
girare attorno al limite di 50 subrequest per invocazione).

## 1. Rilevamento brano — `src/utils/music.ts` (nuovo, frontend, puro)

```ts
export const parseTrack = (video: Video, details: VideoDetails | null): { artist: string; track: string } | null
export const isTrack = (video: Video, details: VideoDetails | null): boolean
```

`parseTrack`:
- Canale che termina con `" - Topic"` (upload auto-generati YouTube
  Music) → `artist` = nome canale senza `" - Topic"`, `track` = titolo
  ripulito. Segnale più affidabile, va provato per primo.
- Altrimenti: split del titolo sul primo separatore ` - ` / ` – ` /
  ` — ` → `artist` = parte sinistra, `track` = parte destra.
- Ripulitura di `track` (regex, entrambi i rami): rimuove blocchi tra
  `[...]`/`(...)`  che contengono parole come `official|video|audio|
  lyrics|visualizer|hd|4k|remaster|live|clip ufficiale`, rimuove
  `feat.`/`ft.` e quanto segue fino al prossimo separatore o fine
  stringa, rimuove suffisso `| <etichetta>`. Trim finale; stringa vuota
  dopo pulizia → nessun match.
- Nessun separatore nel titolo e canale non-Topic → `null`.

`isTrack`: `true` se `video.categoryId === '10'` (Musica) **oppure**
`parseTrack(...) !== null`. Uno dei due segnali basta: copre sia i brani
non taggati "Musica" sia i canali "- Topic" senza categoria nota lato
frontend.

`VideoDetails` (src/types/index.ts) guadagna `categoryId?: string`.

### Falsi positivi accettati
Un titolo con un trattino che non è un brano (es. un episodio con
sottotitolo) genera comunque un tentativo di risoluzione lato worker;
se Last.fm/la risoluzione non trovano nulla, la richiesta torna vuota e
il bottone — già mostrato per l'euristica testuale — porta a un messaggio
di errore invece che a una radio. Accettabile: non c'è modo di
distinguerlo lato frontend senza analisi audio, fuori scope.

## 2. Worker — `GET /radio` (repo privato, non in questo spec in dettaglio)

Contratto verso il frontend:

```
GET /radio?artist=<string?>&track=<string>&limit=<int, default 12, max 20>
→ 200 { seed: { artist: string; track: string }, videos: Video[] }
→ 4xx/5xx { error: string }
```

- `artist` opzionale: se assente, il worker risolve prima artista/brano
  canonici prima di cercare i simili.
- `videos` può essere `[]` (nessun simile trovato o nessuno risolvibile
  in un video) — non è un errore, il frontend lo tratta come "niente
  trovato".
- Un brano simile che non si risolve in un videoId viene scartato, non
  incluso come voce vuota.
- Cache `caches.default`, chiave normalizzata su
  `artist.toLowerCase()|track.toLowerCase()|limit`, TTL 7 giorni.
- Budget subrequest per invocazione: nel caso peggiore risoluzione
  artista (1) + brani simili (1) + risoluzione di `limit` brani in
  videoId (≤20, con eventuale doppio tentativo) — resta sotto il tetto
  di 50 già documentato in memoria. `limit` di default 12 tiene un
  margine ampio.
- `LASTFM_API_KEY` nuovo secret Cloudflare (`Env`), stesso meccanismo di
  `YOUTUBE_API_KEY`.

Questo comportamento verrà dettagliato nel piano di implementazione del
repo worker (fuori dal piano che seguirà in questo repo, ma il contratto
sopra è vincolante per l'integrazione frontend).

## 3. Frontend — integrazione

Nessuna nuova modalità di coda: la radio riusa `playbackSource = 'feed'`
già esistente in `useAppState`.

- `useYouTubeAPI`: nuova `getSimilarTracks(artist, track, limit?)` che
  chiama `/radio` e ritorna `{ seed, videos }`, sullo stesso
  `fetchApi`/pattern di errore delle altre funzioni del composable.
- `useAppState`: nuova azione `startRadio(video, details)` —
  - calcola il seed con `parseTrack`,
  - se `null`, non dovrebbe essere chiamabile (bottone assente/disabilitato
    — vedi sotto),
  - chiama `getSimilarTracks`, in caso di lista vuota o errore mostra un
    toast/alert esistente (`useDialog`) e non tocca `videos`,
  - altrimenti: `videos.value = risultato`, `nextPageToken = undefined`
    (spegne l'infinite scroll, `canLoadMore` è già derivato da questo),
    `playbackSource.value = 'feed'`, poi `selectVideo(videos.value[0])`.
  - `viewMode` guadagna il valore `'radio'` (per eventuale intestazione
    UI, non cambia la logica di coda).
- `VideoPlayer.vue`: bottone "Ascolta brani simili" nella barra azioni
  esistente (accanto alle azioni canale), `v-if="musicSeed"` dove
  `musicSeed = computed(() => details.value && parseTrack(props.video, details.value))`.
  Spinner locale sul bottone durante la chiamica (~1-2s attesi). Emit
  `radio-requested` verso `App.vue`/`useAppState`, sullo stesso pattern
  degli altri eventi del player (es. subscribe canale).
- i18n (`src/i18n/translations.ts`, it + en): `similarTracks`,
  `loadingSimilar`, `noSimilarTracks`, `radioError`.

## 4. Errori

- Rete/worker giù, Last.fm giù, o `videos: []`: alert/toast esistente,
  la lista a schermo e la riproduzione corrente non cambiano.
- Nessun retry automatico: l'utente ripreme il bottone se vuole
  riprovare.

## 5. Test (frontend, questo repo)

- `src/utils/music.test.ts`: canale "- Topic", separatori ` - `/` – `/
  ` — `, rumore fra parentesi (`(Official Video)`, `[Lyrics]`), `feat.`/
  `ft.`, suffisso etichetta, titolo senza separatore → `null`, stringa
  vuota dopo pulizia → `null`; `isTrack` con `categoryId` presente/assente
  combinato con parsing riuscito/fallito.
- `useYouTubeAPI.getSimilarTracks`: `fetch` mockato, happy path e
  risposta vuota.
- `VideoPlayer.test.ts`: bottone presente quando `musicSeed` è truthy,
  assente altrimenti; click emette l'evento con il seed corretto.
- `useAppState` (o test mirato su `startRadio` se estratto): lista vuota
  → nessuna modifica a `videos`/`playbackSource`; lista non vuota →
  `playbackSource = 'feed'`, `videos` sostituiti, `nextPageToken`
  azzerato.

## 6. Deploy

Ordine: prima il worker (`Y:\youtube-player-worker`, `./scripts/deploy.sh`,
richiede `LASTFM_API_KEY` come secret già impostato), poi il frontend.
Stesso ordine già seguito per `/channels/recent` (memoria
`favorites-week-feed-and-channel-actions`).

## Fuori scope

- Salvare la radio come playlist.
- Mostrare in coda i brani simili non ancora risolti (placeholder).
- Qualsiasi UI di generi/tag (`track.getTopTags`) — non richiesta.
- Analisi audio o disambiguazione oltre l'euristica testuale.
