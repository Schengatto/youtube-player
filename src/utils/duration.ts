export function formatDuration(iso: string): string {
  if (!iso) return '';
  const match = iso.match(/^PT(?=\d)(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return '';

  const h = parseInt(match[1] ?? '0', 10);
  const m = parseInt(match[2] ?? '0', 10);
  const s = parseInt(match[3] ?? '0', 10);

  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');

  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Secondi in `m:ss`, o `h:mm:ss` oltre l'ora. Usata dai segnalibri e dal transcript. */
export function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
