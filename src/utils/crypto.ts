const CRYPTO_KEY = 'yt-player-secret-key-2024';

export const encrypt = (text: string): string => {
  const encrypted = text.split('').map((char, i) => {
    return String.fromCharCode(char.charCodeAt(0) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length));
  }).join('');
  return btoa(encrypted);
};

export const decrypt = (encryptedText: string): string => {
  try {
    const decrypted = atob(encryptedText);
    return decrypted.split('').map((char, i) => {
      return String.fromCharCode(char.charCodeAt(0) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length));
    }).join('');
  } catch {
    return '';
  }
};
