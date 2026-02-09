export const parseYouTubeUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    }

    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }

    return null;
  } catch {
    return null;
  }
};

export const extractVideoIdFromUrl = (input: string): string | null => {
  const trimmed = input.trim();

  if (trimmed.length === 11 && /^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  return parseYouTubeUrl(trimmed);
};

export const getVideoFromId = (videoId: string) => {
  return {
    title: 'Video YouTube',
    videoId,
    thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    channel: 'YouTube',
    channelId: undefined,
    publishedAt: undefined
  };
};
