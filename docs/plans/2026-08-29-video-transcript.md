# Transcript del video — piano di implementazione (frontend)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un terzo tab nel player mostra il transcript del video, con riga corrente
evidenziata, click per saltare, ricerca nel testo e copia negli appunti.

**Architecture:** Il worker espone `GET /transcript` e restituisce segmenti neutri; il
frontend fa tutto il resto in locale. Le quattro operazioni sul testo vivono in un modulo puro
(`src/utils/transcript.ts`), la UI in un componente dedicato (`TranscriptPanel.vue`), e
`VideoPlayer.vue` si limita a caricare i dati e a collegare il player.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Vitest, `@vue/test-utils`.

**Spec:** `docs/specs/2026-08-29-video-transcript-design.md`

## Global Constraints

- **Il worker va deployato e verificato per primo.** Netlify pubblica a ogni push su `main`:
  invertire l'ordine mette live un tab che fallisce. Il piano del worker sta nel repo privato.
- **Il fornitore dei transcript non va mai nominato in questo repository** — né in codice, né
  in nomi di funzioni, endpoint o variabili, né in commenti, né nei test, né in questo piano.
  Prima di ogni commit: `git diff --cached | grep -i` sul nome del fornitore, che deve dare
  zero risultati. Stessa regola già in vigore per la fonte della radio.
- **Contratto del worker**, unico punto di contatto:

  ```text
  GET /transcript?videoId=<id>
  → 200 { videoId, lang: string, segments: [{ start: number, dur: number, text: string }] }
  → 202 { status: 'pending', retryAfter: number }
  → 429 crediti esauriti   → 503 servizio non configurato
  ```

  `start` e `dur` sono **in secondi**, già convertiti dal worker.
- **Caricamento pigro**: il fetch parte al primo click sul tab, mai al cambio video. È il
  controllo di costo principale.
- `npm test`, `npm run type-check` e `npm run lint` devono passare a ogni commit.
- Le chiavi i18n vanno aggiunte a **tutti e 9 i locali**: `TranslationKeys` è tipizzata e
  `vue-tsc` fallisce se ne manca una.

---

### Task 1: `formatSeconds` come funzione condivisa

Il transcript deve stampare `mm:ss` esattamente come i segnalibri. La funzione esiste già,
ma è chiusa dentro `useBookmarks()` e non è importabile: va spostata fra le utility, dove
per la prima volta finisce anche sotto test.

**Files:**

- Modify: `src/utils/duration.ts`
- Modify: `src/utils/duration.test.ts`
- Modify: `src/composables/useBookmarks.ts:57-63`

**Interfaces:**

- Consumes: niente.
- Produces: `formatSeconds(seconds: number): string` da `@/utils/duration`.

- [ ] **Step 1: Scrivere il test che fallisce**

In `src/utils/duration.test.ts`, aggiungere l'import e il blocco:

```ts
import { formatDuration, formatSeconds } from './duration';

describe('formatSeconds', () => {
  it('formats minutes and seconds', () => {
    expect(formatSeconds(90)).toBe('1:30');
  });

  it('pads single-digit seconds', () => {
    expect(formatSeconds(65)).toBe('1:05');
  });

  it('adds hours past the hour mark', () => {
    expect(formatSeconds(3661)).toBe('1:01:01');
  });

  it('formats the start of the video', () => {
    expect(formatSeconds(0)).toBe('0:00');
  });

  it('truncates fractions of a second', () => {
    expect(formatSeconds(12.9)).toBe('0:12');
  });
});
```

- [ ] **Step 2: Eseguire il test e verificare che fallisca**

Run: `npm test -- duration`
Expected: FAIL — `formatSeconds is not a function`.

- [ ] **Step 3: Spostare la funzione**

Aggiungere in fondo a `src/utils/duration.ts`:

```ts
/** Secondi in `m:ss`, o `h:mm:ss` oltre l'ora. Usata dai segnalibri e dal transcript. */
export function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
```

In `src/composables/useBookmarks.ts` aggiungere l'import:

```ts
import { formatSeconds } from '@/utils/duration';
```

e sostituire le righe 57-63 (l'intera definizione di `formatTimestamp`) con:

```ts
  const formatTimestamp = formatSeconds;
```

`useBookmarks` continua a esporre `formatTimestamp`: nessun chiamante cambia.

- [ ] **Step 4: Eseguire i test**

Run: `npm test` → Expected: PASS, incluso `VideoPlayer.test.ts` che usa i segnalibri.
Run: `npm run type-check` → Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add src/utils/duration.ts src/utils/duration.test.ts src/composables/useBookmarks.ts
git commit -m "refactor: share the seconds formatter between bookmarks and utils"
```

---

### Task 2: Modulo puro del transcript

**Files:**

- Create: `src/utils/transcript.ts`
- Create: `src/utils/transcript.test.ts`

**Interfaces:**

- Consumes: niente.
- Produces:
  `interface TranscriptSegment { start: number; dur: number; text: string }`,
  `type TranscriptStatus = 'loading' | 'pending' | 'ok' | 'empty' | 'quota' | 'error'`,
  `findActiveIndex(segments: TranscriptSegment[], t: number): number`,
  `filterSegments(segments: TranscriptSegment[], query: string): TranscriptSegment[]`,
  `toPlainText(segments: TranscriptSegment[]): string`.

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `src/utils/transcript.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { findActiveIndex, filterSegments, toPlainText, type TranscriptSegment } from './transcript';

const segments: TranscriptSegment[] = [
  { start: 0, dur: 2, text: 'Benvenuti nel video' },
  { start: 2, dur: 3, text: 'Oggi parliamo di CUCINA' },
  { start: 5, dur: 4, text: 'Iniziamo dagli ingredienti' },
];

describe('findActiveIndex', () => {
  it('returns the segment that has already started', () => {
    expect(findActiveIndex(segments, 3)).toBe(1);
  });

  it('switches exactly on the start of a segment', () => {
    expect(findActiveIndex(segments, 5)).toBe(2);
  });

  it('stays on the last segment past the end', () => {
    expect(findActiveIndex(segments, 999)).toBe(2);
  });

  it('returns -1 before the first segment starts', () => {
    expect(findActiveIndex([{ start: 4, dur: 1, text: 'tardi' }], 1)).toBe(-1);
  });

  it('returns -1 on an empty list', () => {
    expect(findActiveIndex([], 10)).toBe(-1);
  });
});

describe('filterSegments', () => {
  it('matches regardless of case', () => {
    expect(filterSegments(segments, 'cucina')).toEqual([segments[1]]);
  });

  it('returns everything for an empty query', () => {
    expect(filterSegments(segments, '')).toEqual(segments);
  });

  it('returns everything for a query of only spaces', () => {
    expect(filterSegments(segments, '   ')).toEqual(segments);
  });

  it('returns nothing when there is no match', () => {
    expect(filterSegments(segments, 'astronavi')).toEqual([]);
  });
});

describe('toPlainText', () => {
  it('joins the lines without timestamps', () => {
    expect(toPlainText(segments)).toBe(
      'Benvenuti nel video\nOggi parliamo di CUCINA\nIniziamo dagli ingredienti',
    );
  });

  it('returns an empty string for an empty list', () => {
    expect(toPlainText([])).toBe('');
  });
});
```

- [ ] **Step 2: Eseguire il test e verificare che fallisca**

Run: `npm test -- transcript`
Expected: FAIL — `Failed to resolve import "./transcript"`.

- [ ] **Step 3: Scrivere l'implementazione**

Creare `src/utils/transcript.ts`:

```ts
export interface TranscriptSegment {
  /** Secondi dall'inizio del video, nella stessa unità di `seekTo` e dei segnalibri. */
  start: number;
  dur: number;
  text: string;
}

export type TranscriptStatus = 'loading' | 'pending' | 'ok' | 'empty' | 'quota' | 'error';

/**
 * Ultimo segmento già iniziato, `-1` prima del primo. Ricerca binaria perché viene richiamata
 * due volte al secondo mentre il video scorre.
 */
export function findActiveIndex(segments: TranscriptSegment[], t: number): number {
  let low = 0;
  let high = segments.length - 1;
  let found = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (segments[mid]!.start <= t) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

export function filterSegments(segments: TranscriptSegment[], query: string): TranscriptSegment[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return segments;
  return segments.filter(segment => segment.text.toLowerCase().includes(needle));
}

export function toPlainText(segments: TranscriptSegment[]): string {
  return segments.map(segment => segment.text).join('\n');
}
```

- [ ] **Step 4: Eseguire i test**

Run: `npm test -- transcript` → Expected: PASS.
Run: `npm run type-check` → Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add src/utils/transcript.ts src/utils/transcript.test.ts
git commit -m "feat: pure helpers for the video transcript"
```

---

### Task 3: Chiamata al worker

`fetchApi`, usata dagli altri endpoint, solleva un'eccezione su qualsiasi risposta non `ok`:
qui servirebbe il contrario, perché `202`, `429` e `503` sono stati previsti da mostrare
all'utente, non guasti. Questa chiamata usa quindi `fetch` direttamente.

**Files:**

- Modify: `src/composables/useYouTubeAPI.ts`
- Modify: `src/composables/useYouTubeAPI.test.ts`

**Interfaces:**

- Consumes: `TranscriptSegment` da `@/utils/transcript`.
- Produces:
  `type TranscriptResponse = { status: 'ok'; segments: TranscriptSegment[] } | { status: 'pending'; retryAfter: number } | { status: 'quota' } | { status: 'error' }`,
  e `getTranscript(videoId: string): Promise<TranscriptResponse>` nell'oggetto restituito da
  `useYouTubeAPI()`.

- [ ] **Step 1: Scrivere il test che fallisce**

In `src/composables/useYouTubeAPI.test.ts`, aggiungere in fondo:

```ts
describe('getTranscript', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the segments of a video that has a transcript', async () => {
    respondWith({ videoId: 'abc', lang: 'it', segments: [{ start: 0, dur: 1, text: 'ciao' }] });

    const result = await useYouTubeAPI().getTranscript('abc');

    expect(result).toEqual({ status: 'ok', segments: [{ start: 0, dur: 1, text: 'ciao' }] });
  });

  it('sends the video id as a query parameter', async () => {
    const fetchMock = respondWith({ videoId: 'abc', lang: 'it', segments: [] });

    await useYouTubeAPI().getTranscript('abc');

    expect(requestedUrl(fetchMock).searchParams.get('videoId')).toBe('abc');
  });

  it('returns an empty list for a video without subtitles', async () => {
    respondWith({ videoId: 'abc', lang: '', segments: [] });

    expect(await useYouTubeAPI().getTranscript('abc')).toEqual({ status: 'ok', segments: [] });
  });

  it('reports a transcript still being prepared, with the wait it was given', async () => {
    respondWith({ status: 'pending', retryAfter: 7 }, true, 202);

    expect(await useYouTubeAPI().getTranscript('abc')).toEqual({ status: 'pending', retryAfter: 7 });
  });

  it('falls back to a default wait when none is given', async () => {
    respondWith({ status: 'pending' }, true, 202);

    expect(await useYouTubeAPI().getTranscript('abc')).toEqual({ status: 'pending', retryAfter: 5 });
  });

  it('distinguishes an exhausted quota from a failure', async () => {
    respondWith({ error: 'quota' }, false, 429);

    expect(await useYouTubeAPI().getTranscript('abc')).toEqual({ status: 'quota' });
  });

  it('reports any other failure as an error', async () => {
    respondWith({ error: 'unavailable' }, false, 503);

    expect(await useYouTubeAPI().getTranscript('abc')).toEqual({ status: 'error' });
  });

  it('reports a network failure as an error instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    expect(await useYouTubeAPI().getTranscript('abc')).toEqual({ status: 'error' });
  });
});
```

- [ ] **Step 2: Eseguire il test e verificare che fallisca**

Run: `npm test -- useYouTubeAPI`
Expected: FAIL — `getTranscript is not a function`.

- [ ] **Step 3: Scrivere l'implementazione**

In `src/composables/useYouTubeAPI.ts` aggiungere agli import in cima:

```ts
import type { TranscriptSegment } from '@/utils/transcript';
```

Aggiungere, accanto alle altre interfacce di risposta in cima al file:

```ts
export type TranscriptResponse =
  | { status: 'ok'; segments: TranscriptSegment[] }
  | { status: 'pending'; retryAfter: number }
  | { status: 'quota' }
  | { status: 'error' };

/** Attesa di ripiego se il server non indica quanto manca. */
const TRANSCRIPT_DEFAULT_RETRY = 5;
```

Aggiungere dentro `useYouTubeAPI()`, prima del `return`:

```ts
  /**
   * Non passa da `fetchApi`: qui 202, 429 e 503 non sono guasti ma stati che il pannello
   * mostra all'utente, e `fetchApi` li trasformerebbe in eccezioni indistinguibili.
   */
  const getTranscript = async (videoId: string): Promise<TranscriptResponse> => {
    try {
      const params = new URLSearchParams({ videoId });
      const response = await fetch(`${API_BASE}/transcript?${params}`);

      if (response.status === 202) {
        const data = await response.json() as { retryAfter?: number };
        return { status: 'pending', retryAfter: data.retryAfter ?? TRANSCRIPT_DEFAULT_RETRY };
      }
      if (response.status === 429) return { status: 'quota' };
      if (!response.ok) return { status: 'error' };

      const data = await response.json() as { segments?: TranscriptSegment[] };
      return { status: 'ok', segments: data.segments || [] };
    } catch {
      return { status: 'error' };
    }
  };
```

e aggiungerlo all'oggetto restituito, dopo `getSimilarTracks`:

```ts
    getTranscript,
```

- [ ] **Step 4: Eseguire i test**

Run: `npm test -- useYouTubeAPI` → Expected: PASS.
Run: `npm run type-check` → Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useYouTubeAPI.ts src/composables/useYouTubeAPI.test.ts
git commit -m "feat: fetch the video transcript from the proxy"
```

---

### Task 4: Traduzioni

Il pannello non compila senza queste chiavi, quindi arrivano prima. Dieci chiavi in nove
locali; `TranslationKeys` è tipizzata e `vue-tsc` segnala qualsiasi omissione.

**Files:**

- Modify: `src/i18n/translations.ts`

**Interfaces:**

- Produces: `t.transcript`, `t.transcriptLoading`, `t.transcriptPending`, `t.transcriptEmpty`,
  `t.transcriptQuota`, `t.transcriptError`, `t.transcriptSearch`, `t.transcriptNoMatches`,
  `t.transcriptCopy`, `t.transcriptCopied`.

- [ ] **Step 1: Dichiarare le chiavi nel tipo**

In `src/i18n/translations.ts`, dentro `type TranslationKeys` (riga 27), aggiungere in fondo
al blocco:

```ts
  transcript: string;
  transcriptLoading: string;
  transcriptPending: string;
  transcriptEmpty: string;
  transcriptQuota: string;
  transcriptError: string;
  transcriptSearch: string;
  transcriptNoMatches: string;
  transcriptCopy: string;
  transcriptCopied: string;
```

- [ ] **Step 2: Verificare che il type check fallisca**

Run: `npm run type-check`
Expected: FAIL — nove errori, uno per locale, su proprietà mancanti.

- [ ] **Step 3: Tradurre in tutti i locali**

Aggiungere in fondo a ciascun oggetto (`it`, `en`, `fr`, `de`, `es`, `pt`, `zh`, `ja`, `hi`),
rispettando lo stile del file, che usa in prevalenza forme senza accenti:

```ts
// it
  transcript: 'Trascrizione',
  transcriptLoading: 'Caricamento trascrizione...',
  transcriptPending: 'Trascrizione in preparazione...',
  transcriptEmpty: 'Nessuna trascrizione disponibile per questo video',
  transcriptQuota: 'Limite mensile raggiunto, riprova il mese prossimo',
  transcriptError: 'Impossibile caricare la trascrizione',
  transcriptSearch: 'Cerca nella trascrizione...',
  transcriptNoMatches: 'Nessun risultato',
  transcriptCopy: 'Copia',
  transcriptCopied: 'Copiato',

// en
  transcript: 'Transcript',
  transcriptLoading: 'Loading transcript...',
  transcriptPending: 'Preparing transcript...',
  transcriptEmpty: 'No transcript available for this video',
  transcriptQuota: 'Monthly limit reached, try again next month',
  transcriptError: 'Could not load the transcript',
  transcriptSearch: 'Search the transcript...',
  transcriptNoMatches: 'No matches',
  transcriptCopy: 'Copy',
  transcriptCopied: 'Copied',

// fr
  transcript: 'Transcription',
  transcriptLoading: 'Chargement de la transcription...',
  transcriptPending: 'Preparation de la transcription...',
  transcriptEmpty: 'Aucune transcription disponible pour cette video',
  transcriptQuota: 'Limite mensuelle atteinte, reessayez le mois prochain',
  transcriptError: 'Impossible de charger la transcription',
  transcriptSearch: 'Rechercher dans la transcription...',
  transcriptNoMatches: 'Aucun resultat',
  transcriptCopy: 'Copier',
  transcriptCopied: 'Copie',

// de
  transcript: 'Transkript',
  transcriptLoading: 'Transkript wird geladen...',
  transcriptPending: 'Transkript wird vorbereitet...',
  transcriptEmpty: 'Kein Transkript fur dieses Video verfugbar',
  transcriptQuota: 'Monatliches Limit erreicht, versuche es nachsten Monat',
  transcriptError: 'Transkript konnte nicht geladen werden',
  transcriptSearch: 'Im Transkript suchen...',
  transcriptNoMatches: 'Keine Treffer',
  transcriptCopy: 'Kopieren',
  transcriptCopied: 'Kopiert',

// es
  transcript: 'Transcripcion',
  transcriptLoading: 'Cargando transcripcion...',
  transcriptPending: 'Preparando la transcripcion...',
  transcriptEmpty: 'No hay transcripcion disponible para este video',
  transcriptQuota: 'Limite mensual alcanzado, intentalo el proximo mes',
  transcriptError: 'No se pudo cargar la transcripcion',
  transcriptSearch: 'Buscar en la transcripcion...',
  transcriptNoMatches: 'Sin resultados',
  transcriptCopy: 'Copiar',
  transcriptCopied: 'Copiado',

// pt
  transcript: 'Transcricao',
  transcriptLoading: 'Carregando transcricao...',
  transcriptPending: 'Preparando a transcricao...',
  transcriptEmpty: 'Nenhuma transcricao disponivel para este video',
  transcriptQuota: 'Limite mensal atingido, tente no proximo mes',
  transcriptError: 'Nao foi possivel carregar a transcricao',
  transcriptSearch: 'Pesquisar na transcricao...',
  transcriptNoMatches: 'Nenhum resultado',
  transcriptCopy: 'Copiar',
  transcriptCopied: 'Copiado',

// zh
  transcript: '字幕文本',
  transcriptLoading: '正在加载字幕文本...',
  transcriptPending: '正在准备字幕文本...',
  transcriptEmpty: '此视频没有可用的字幕文本',
  transcriptQuota: '已达每月上限，请下个月再试',
  transcriptError: '无法加载字幕文本',
  transcriptSearch: '在字幕文本中搜索...',
  transcriptNoMatches: '没有匹配结果',
  transcriptCopy: '复制',
  transcriptCopied: '已复制',

// ja
  transcript: '文字起こし',
  transcriptLoading: '文字起こしを読み込み中...',
  transcriptPending: '文字起こしを準備中...',
  transcriptEmpty: 'この動画には文字起こしがありません',
  transcriptQuota: '月間の上限に達しました。来月お試しください',
  transcriptError: '文字起こしを読み込めませんでした',
  transcriptSearch: '文字起こしを検索...',
  transcriptNoMatches: '一致する結果がありません',
  transcriptCopy: 'コピー',
  transcriptCopied: 'コピーしました',

// hi
  transcript: 'ट्रांसक्रिप्ट',
  transcriptLoading: 'ट्रांसक्रिप्ट लोड हो रहा है...',
  transcriptPending: 'ट्रांसक्रिप्ट तैयार हो रहा है...',
  transcriptEmpty: 'इस वीडियो के लिए कोई ट्रांसक्रिप्ट उपलब्ध नहीं है',
  transcriptQuota: 'मासिक सीमा पूरी हो गई, अगले महीने कोशिश करें',
  transcriptError: 'ट्रांसक्रिप्ट लोड नहीं हो सका',
  transcriptSearch: 'ट्रांसक्रिप्ट में खोजें...',
  transcriptNoMatches: 'कोई परिणाम नहीं',
  transcriptCopy: 'कॉपी करें',
  transcriptCopied: 'कॉपी हो गया',
```

- [ ] **Step 4: Verificare**

Run: `npm run type-check` → Expected: nessun errore.
Run: `npm test` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/translations.ts
git commit -m "feat: transcript strings in every locale"
```

---

### Task 5: `TranscriptPanel.vue`

`VideoPlayer.vue` è già a 445 righe: ricerca, evidenziazione e copia stanno in un componente
a sé, che non conosce il player e comunica solo con l'evento `seek`.

**Files:**

- Create: `src/components/TranscriptPanel.vue`
- Create: `src/components/TranscriptPanel.css`
- Create: `src/components/TranscriptPanel.test.ts`

**Interfaces:**

- Consumes: `findActiveIndex`, `filterSegments`, `toPlainText`, `TranscriptSegment`,
  `TranscriptStatus` da `@/utils/transcript`; `formatSeconds` da `@/utils/duration`;
  le chiavi del Task 4.
- Produces: componente con props `{ segments: TranscriptSegment[]; currentTime: number; status: TranscriptStatus }`
  ed evento `seek: [seconds: number]`.

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `src/components/TranscriptPanel.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { TranscriptSegment } from '@/utils/transcript';
import TranscriptPanel from './TranscriptPanel.vue';

const segments: TranscriptSegment[] = [
  { start: 0, dur: 2, text: 'Benvenuti nel video' },
  { start: 62, dur: 3, text: 'Oggi parliamo di cucina' },
  { start: 125, dur: 4, text: 'Iniziamo dagli ingredienti' },
];

const panel = (props: Partial<InstanceType<typeof TranscriptPanel>['$props']> = {}) =>
  mount(TranscriptPanel, {
    props: { segments, currentTime: 0, status: 'ok', ...props },
  });

describe('TranscriptPanel', () => {
  it('shows one line per segment with its timestamp', () => {
    const rows = panel().findAll('.transcript-line');
    expect(rows).toHaveLength(3);
    expect(rows[1]!.text()).toContain('1:02');
    expect(rows[1]!.text()).toContain('Oggi parliamo di cucina');
  });

  it('emits the start of the line that was clicked', async () => {
    const wrapper = panel();

    await wrapper.findAll('.transcript-line')[2]!.trigger('click');

    expect(wrapper.emitted('seek')).toEqual([[125]]);
  });

  it('marks the line playing right now', () => {
    const rows = panel({ currentTime: 70 }).findAll('.transcript-line');

    expect(rows[1]!.classes()).toContain('active');
    expect(rows[0]!.classes()).not.toContain('active');
  });

  it('filters the lines by the search box', async () => {
    const wrapper = panel();

    await wrapper.find('.transcript-search input').setValue('cucina');

    expect(wrapper.findAll('.transcript-line')).toHaveLength(1);
  });

  it('says so when the search matches nothing', async () => {
    const wrapper = panel();

    await wrapper.find('.transcript-search input').setValue('astronavi');

    expect(wrapper.findAll('.transcript-line')).toHaveLength(0);
    expect(wrapper.text()).toContain('Nessun risultato');
  });

  it('copies the text without timestamps', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const wrapper = panel();

    await wrapper.find('.transcript-copy').trigger('click');

    expect(writeText).toHaveBeenCalledWith(
      'Benvenuti nel video\nOggi parliamo di cucina\nIniziamo dagli ingredienti',
    );
    vi.unstubAllGlobals();
  });

  it('survives a browser that refuses the clipboard', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const wrapper = panel();

    await wrapper.find('.transcript-copy').trigger('click');
    await Promise.resolve();

    expect(wrapper.text()).not.toContain('Copiato');
    vi.unstubAllGlobals();
  });

  it('offers neither search nor copy when there is no transcript', () => {
    const wrapper = panel({ segments: [], status: 'empty' });

    expect(wrapper.text()).toContain('Nessuna trascrizione disponibile');
    expect(wrapper.find('.transcript-copy').exists()).toBe(false);
    expect(wrapper.find('.transcript-search').exists()).toBe(false);
  });

  it('gives each waiting or failing state its own message', () => {
    expect(panel({ segments: [], status: 'loading' }).text()).toContain('Caricamento trascrizione');
    expect(panel({ segments: [], status: 'pending' }).text()).toContain('in preparazione');
    expect(panel({ segments: [], status: 'quota' }).text()).toContain('Limite mensile');
    expect(panel({ segments: [], status: 'error' }).text()).toContain('Impossibile caricare');
  });
});
```

- [ ] **Step 2: Eseguire il test e verificare che fallisca**

Run: `npm test -- TranscriptPanel`
Expected: FAIL — `Failed to resolve import "./TranscriptPanel.vue"`.

- [ ] **Step 3: Scrivere il componente**

Creare `src/components/TranscriptPanel.vue`:

```vue
<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { findActiveIndex, filterSegments, toPlainText, type TranscriptSegment, type TranscriptStatus } from '@/utils/transcript';
import { formatSeconds } from '@/utils/duration';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();

interface Props {
  segments: TranscriptSegment[];
  currentTime: number;
  status: TranscriptStatus;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  seek: [seconds: number];
}>();

const query = ref('');
const copied = ref(false);
const listEl = ref<HTMLElement | null>(null);
/** Si smette di inseguire la riga corrente appena l'utente scorre da solo. */
const following = ref(true);
let autoScrolling = false;

const visibleSegments = computed(() => filterSegments(props.segments, query.value));

/** Si confronta l'istante di inizio e non l'indice, perché la ricerca cambia le posizioni. */
const activeStart = computed(() => {
  const index = findActiveIndex(props.segments, props.currentTime);
  return index === -1 ? null : props.segments[index]!.start;
});

const statusMessage = computed(() => {
  switch (props.status) {
    case 'loading': return t.value.transcriptLoading;
    case 'pending': return t.value.transcriptPending;
    case 'empty': return t.value.transcriptEmpty;
    case 'quota': return t.value.transcriptQuota;
    case 'error': return t.value.transcriptError;
    default: return '';
  }
});

const onScroll = () => {
  if (autoScrolling) return;
  following.value = false;
};

const handleSeek = (seconds: number) => {
  following.value = true;
  emit('seek', seconds);
};

const copy = async () => {
  try {
    await navigator.clipboard.writeText(toPlainText(props.segments));
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    // Un browser che nega gli appunti non deve rompere il pannello.
  }
};

watch(activeStart, async () => {
  if (!following.value || props.status !== 'ok') return;
  await nextTick();
  const row = listEl.value?.querySelector('.transcript-line.active');
  if (!row) return;
  autoScrolling = true;
  row.scrollIntoView({ block: 'nearest' });
  setTimeout(() => { autoScrolling = false; }, 150);
});
</script>

<template>
  <div class="transcript-panel">
    <div v-if="status === 'ok'" class="transcript-toolbar">
      <div class="transcript-search">
        <input v-model="query" type="search" :placeholder="t.transcriptSearch" />
      </div>
      <button class="transcript-copy" @click="copy">
        {{ copied ? t.transcriptCopied : t.transcriptCopy }}
      </button>
    </div>

    <p v-if="statusMessage" class="no-data">{{ statusMessage }}</p>

    <div v-else ref="listEl" class="transcript-list" @scroll="onScroll">
      <button
        v-for="segment in visibleSegments"
        :key="segment.start"
        :class="['transcript-line', { active: segment.start === activeStart }]"
        @click="handleSeek(segment.start)"
      >
        <span class="transcript-time">{{ formatSeconds(segment.start) }}</span>
        <span class="transcript-text">{{ segment.text }}</span>
      </button>
      <p v-if="visibleSegments.length === 0" class="no-data">{{ t.transcriptNoMatches }}</p>
    </div>
  </div>
</template>

<style scoped src="./TranscriptPanel.css"></style>
```

- [ ] **Step 4: Scrivere il foglio di stile**

Creare `src/components/TranscriptPanel.css`, riusando le variabili già definite in
`src/style.css` (verificare i nomi esatti lì prima di scrivere: usare le stesse usate da
`VideoPlayer.css` per testo e superfici):

```css
.transcript-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.transcript-search {
  flex: 1;
}

.transcript-search input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.9rem;
}

.transcript-copy {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  white-space: nowrap;
}

.transcript-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 420px;
  overflow-y: auto;
}

.transcript-line {
  display: flex;
  gap: 10px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  text-align: left;
  font-size: 0.9rem;
  line-height: 1.5;
  cursor: pointer;
}

.transcript-line:hover {
  background: var(--surface-hover);
}

.transcript-line.active {
  background: var(--surface-hover);
  font-weight: 600;
}

.transcript-time {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}
```

- [ ] **Step 5: Eseguire i test**

Run: `npm test -- TranscriptPanel` → Expected: PASS.
Run: `npm run type-check` → Expected: nessun errore.
Run: `npm run lint` → Expected: nessun errore.

- [ ] **Step 6: Commit**

```bash
git add src/components/TranscriptPanel.vue src/components/TranscriptPanel.css src/components/TranscriptPanel.test.ts
git commit -m "feat: transcript panel with search, seeking and copy"
```

---

### Task 6: Il terzo tab nel player

**Files:**

- Modify: `src/utils/constants.ts`
- Modify: `src/components/VideoPlayer.vue` (stato riga 94, reset riga ~143, tab riga ~365)
- Modify: `src/components/VideoPlayer.test.ts`

**Interfaces:**

- Consumes: `getTranscript` (Task 3), `TranscriptPanel` (Task 5), le chiavi i18n (Task 4).
- Produces: niente per altri task; è l'ultimo.

- [ ] **Step 1: Aggiungere le costanti**

In fondo a `src/utils/constants.ts`:

```ts
/** Oltre questi tentativi un transcript in preparazione viene dato per perso. */
export const TRANSCRIPT_MAX_RETRIES = 12;
/** Millisecondi fra due letture della posizione del player per l'evidenziazione. */
export const TRANSCRIPT_HIGHLIGHT_INTERVAL = 500;
```

- [ ] **Step 2: Scrivere il test che fallisce**

In `src/components/VideoPlayer.test.ts`, estendere il mock esistente di
`@/composables/useYouTubeAPI` (righe 25-30) aggiungendo la nuova funzione:

```ts
let transcriptResponses: unknown[] = [];

vi.mock('@/composables/useYouTubeAPI', () => ({
  useYouTubeAPI: () => ({
    getVideoDetails: () => Promise.resolve(videoDetails),
    getVideoComments: () => Promise.resolve({ comments: [], nextPageToken: undefined }),
    getTranscript: () => Promise.resolve(transcriptResponses.shift() ?? { status: 'ok', segments: [] })
  })
}));
```

e aggiungere in fondo al file:

```ts
describe('transcript tab', () => {
  const openTranscript = async (wrapper: VueWrapper) => {
    const tab = wrapper.findAll('.tab').find(button => button.text().includes('Trascrizione'));
    await tab!.trigger('click');
    await flushPromises();
  };

  it('does not ask for the transcript until the tab is opened', async () => {
    transcriptResponses = [];
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();

    expect(wrapper.find('.transcript-panel').exists()).toBe(false);
  });

  it('shows the lines once the tab is opened', async () => {
    transcriptResponses = [{ status: 'ok', segments: [{ start: 0, dur: 1, text: 'ciao' }] }];
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();

    await openTranscript(wrapper);

    expect(wrapper.findAll('.transcript-line')).toHaveLength(1);
  });

  it('shows the empty state for a video without subtitles', async () => {
    transcriptResponses = [{ status: 'ok', segments: [] }];
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();

    await openTranscript(wrapper);

    expect(wrapper.text()).toContain('Nessuna trascrizione disponibile');
  });

  it('retries a transcript still being prepared and then shows it', async () => {
    vi.useFakeTimers();
    transcriptResponses = [
      { status: 'pending', retryAfter: 1 },
      { status: 'ok', segments: [{ start: 0, dur: 1, text: 'ciao' }] },
    ];
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();
    await openTranscript(wrapper);

    expect(wrapper.text()).toContain('in preparazione');

    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();

    expect(wrapper.findAll('.transcript-line')).toHaveLength(1);
    vi.useRealTimers();
  });

  it('gives up after too many retries instead of waiting for ever', async () => {
    vi.useFakeTimers();
    transcriptResponses = Array.from({ length: 20 }, () => ({ status: 'pending', retryAfter: 1 }));
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();
    await openTranscript(wrapper);

    await vi.advanceTimersByTimeAsync(20000);
    await flushPromises();

    expect(wrapper.text()).toContain('Impossibile caricare');
    vi.useRealTimers();
  });

  it('seeks the player when a line is clicked', async () => {
    transcriptResponses = [{ status: 'ok', segments: [{ start: 42, dur: 1, text: 'ciao' }] }];
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();
    await openTranscript(wrapper);

    await wrapper.find('.transcript-line').trigger('click');

    expect(seeked).toEqual([42]);
  });

  it('goes back to the comments and forgets the transcript on a new video', async () => {
    transcriptResponses = [{ status: 'ok', segments: [{ start: 0, dur: 1, text: 'ciao' }] }];
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();
    await openTranscript(wrapper);

    await wrapper.setProps({ video: video('b') });
    await flushPromises();

    expect(wrapper.find('.transcript-panel').exists()).toBe(false);
  });
});
```

Il test del seek ha bisogno che il mock del player registri le chiamate: nel mock di
`@/composables/useYTPlayer` (righe 10-21) sostituire `seekTo: () => {}` con
`seekTo: (seconds: number) => { seeked.push(seconds); }` e dichiarare
`let seeked: number[] = [];` accanto a `let currentTime = 0;`, azzerandolo in un
`beforeEach` (`seeked = [];`).

- [ ] **Step 3: Eseguire il test e verificare che fallisca**

Run: `npm test -- VideoPlayer`
Expected: FAIL — il tab "Trascrizione" non esiste, `tab!` è `undefined`.

- [ ] **Step 4: Collegare il pannello**

In `src/components/VideoPlayer.vue`:

Aggiungere agli import:

```ts
import TranscriptPanel from './TranscriptPanel.vue';
import type { TranscriptSegment, TranscriptStatus } from '@/utils/transcript';
import { TRANSCRIPT_MAX_RETRIES, TRANSCRIPT_HIGHLIGHT_INTERVAL } from '@/utils/constants';
```

Estendere il tipo di `activeTab` (riga 94):

```ts
const activeTab = ref<'comments' | 'bookmarks' | 'transcript'>('comments');
```

Aggiungere lo stato subito dopo:

```ts
const transcriptSegments = ref<TranscriptSegment[]>([]);
const transcriptStatus = ref<TranscriptStatus>('loading');
const transcriptTime = ref(0);
let transcriptLoaded = false;
let transcriptRetries = 0;
let transcriptTimer: ReturnType<typeof setTimeout> | null = null;
let highlightTimer: ReturnType<typeof setInterval> | null = null;

const stopHighlight = () => {
  if (highlightTimer) { clearInterval(highlightTimer); highlightTimer = null; }
};

const stopTranscriptTimers = () => {
  if (transcriptTimer) { clearTimeout(transcriptTimer); transcriptTimer = null; }
  stopHighlight();
};

const startHighlight = () => {
  if (highlightTimer) return;
  highlightTimer = setInterval(() => {
    transcriptTime.value = getCurrentTime();
  }, TRANSCRIPT_HIGHLIGHT_INTERVAL);
};

const loadTranscript = async () => {
  if (!props.video) return;
  const result = await getTranscript(props.video.videoId);

  if (result.status === 'pending') {
    if (transcriptRetries >= TRANSCRIPT_MAX_RETRIES) {
      transcriptStatus.value = 'error';
      return;
    }
    transcriptRetries += 1;
    transcriptStatus.value = 'pending';
    transcriptTimer = setTimeout(loadTranscript, result.retryAfter * 1000);
    return;
  }

  if (result.status === 'ok') {
    transcriptSegments.value = result.segments;
    transcriptStatus.value = result.segments.length > 0 ? 'ok' : 'empty';
    if (result.segments.length > 0 && activeTab.value === 'transcript') startHighlight();
    return;
  }

  transcriptStatus.value = result.status === 'quota' ? 'quota' : 'error';
};

/** Il fetch parte solo qui: chi non apre il tab non consuma nulla. */
const openTranscriptTab = () => {
  activeTab.value = 'transcript';
  if (transcriptStatus.value === 'ok') startHighlight();
  if (transcriptLoaded) return;
  transcriptLoaded = true;
  transcriptStatus.value = 'loading';
  loadTranscript();
};
```

Uscendo dal tab va fermata **solo** l'evidenziazione: il timer di attesa (`transcriptTimer`)
deve continuare, perché un video lungo si prepara mentre l'utente legge i commenti.
Nei due tab esistenti, sostituire `@click="activeTab = 'comments'"` con
`@click="selectTab('comments')"` e `@click="activeTab = 'bookmarks'"` con
`@click="selectTab('bookmarks')"`, e aggiungere:

```ts
const selectTab = (tab: 'comments' | 'bookmarks') => {
  activeTab.value = tab;
  stopHighlight();
};
```

`stopHighlight` è già definita sopra, insieme a `stopTranscriptTimers`.

Aggiungere `getTranscript` alla destrutturazione di `useYouTubeAPI()` già presente nel file.

Nel blocco di reset al cambio video (riga ~140, dove ci sono già `comments.value = []` e
`activeTab.value = 'comments'`), aggiungere:

```ts
  stopTranscriptTimers();
  transcriptSegments.value = [];
  transcriptStatus.value = 'loading';
  transcriptTime.value = 0;
  transcriptLoaded = false;
  transcriptRetries = 0;
```

Aggiungere `stopTranscriptTimers()` dentro l'`onUnmounted` già presente nel file (se non
c'è, aggiungerlo importando `onUnmounted` da `vue`).

Nel template, dopo il bottone dei segnalibri (riga ~373):

```vue
            <button :class="['tab', { active: activeTab === 'transcript' }]" @click="openTranscriptTab">
              {{ t.transcript }}
            </button>
```

e dopo il `div` del tab segnalibri (riga ~410 e seguenti):

```vue
          <div v-if="activeTab === 'transcript'" class="tab-content">
            <TranscriptPanel
              :segments="transcriptSegments"
              :current-time="transcriptTime"
              :status="transcriptStatus"
              @seek="handleSeekToBookmark"
            />
          </div>
```

`handleSeekToBookmark` è già il percorso verso `seekTo` usato dai segnalibri: si riusa senza
duplicarlo.

- [ ] **Step 5: Eseguire tutta la suite**

Run: `npm test` → Expected: PASS.
Run: `npm run type-check` → Expected: nessun errore.
Run: `npm run lint` → Expected: nessun errore.
Run: `npm run build` → Expected: build completata.

- [ ] **Step 6: Verificare che il fornitore non compaia**

Il nome del fornitore non è scritto da nessuna parte in questo repo, nemmeno qui: prenderlo
dalla memoria di progetto `transcript-feature-constraints`, e da lì anche i nomi dei campi
propri della sua API. Poi:

```bash
git diff --cached --name-only
git diff --cached | grep -ic "<nome del fornitore>"
```

Expected: `0`, e lo stesso per ciascun nome di campo proprietario. Il frontend deve conoscere
solo `videoId`, `lang`, `segments`, `start`, `dur`, `text`, `status`, `retryAfter`.

- [ ] **Step 7: Commit**

```bash
git add src/components/VideoPlayer.vue src/components/VideoPlayer.test.ts src/utils/constants.ts
git commit -m "feat: transcript tab in the video player"
```

---

## Verifica finale, a mano

Il worker deve essere già in produzione (piano nel repo privato, Task 5).

1. `npm run dev`, aprire un video con sottotitoli, aprire il tab Trascrizione: le righe
   compaiono e i tempi corrispondono a quelli mostrati da YouTube. **Se ogni riga è spostata
   di un fattore mille, la conversione millisecondi/secondi nel worker è sbagliata.**
2. Riprodurre: la riga corrente si evidenzia e la lista la seguono.
3. Scorrere a mano: la lista smette di inseguire. Cliccare una riga: il video salta e
   l'inseguimento riprende.
4. Cercare una parola: restano solo le righe che la contengono; l'evidenziazione continua a
   funzionare su quelle.
5. Copiare: gli appunti contengono il testo senza timestamp.
6. Aprire un video senza sottotitoli: messaggio dedicato, niente bottone di copia.
7. Aprire un video di oltre venti minuti mai richiesto prima: "in preparazione", poi il testo.
8. Cambiare video: il tab torna sui commenti e il transcript precedente sparisce.
9. Riaprire lo stesso video: il transcript arriva subito, dalla cache del worker.

## Fuori scope

Traduzione, riassunto, selettore fra più tracce di sottotitoli, export `.srt`.
