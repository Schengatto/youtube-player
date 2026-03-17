const OBFUSCATION_KEY = 'yt-player-secret-key-2024';

const xorCipher = (input: string): string =>
  input.split('').map((char, i) =>
    String.fromCharCode(char.charCodeAt(0) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length))
  ).join('');

export const encrypt = (text: string): string => btoa(xorCipher(text));

export const decrypt = (encoded: string): string => {
  try {
    return xorCipher(atob(encoded));
  } catch {
    return '';
  }
};
