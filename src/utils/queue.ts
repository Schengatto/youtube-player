import type { Video } from '@/types';

const step = (queue: Video[], currentId: string | null, offset: number): Video | null => {
  if (!currentId) return null;
  const index = queue.findIndex(v => v.videoId === currentId);
  if (index < 0) return null;
  return queue[index + offset] ?? null;
};

export const nextIn = (queue: Video[], currentId: string | null): Video | null =>
  step(queue, currentId, 1);

export const previousIn = (queue: Video[], currentId: string | null): Video | null =>
  step(queue, currentId, -1);
