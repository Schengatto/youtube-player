export const normalizeText = (input: string): string =>
  input
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
