export const normalizeText = (string: string) => {
  return string
    // decodifica HTML
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
    // minuscole
    .toLowerCase()
    // normalizzazione Unicode (accenti)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // rimuove punteggiatura
    .replace(/[^\w\s]/g, "")
    // spazi multipli
    .replace(/\s+/g, " ")
    .trim();
}
