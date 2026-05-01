import { ref, onMounted, onUnmounted } from 'vue';

export const useInfiniteScroll = (callback: () => void | Promise<void>, threshold = 300, cooldownMs = 2000) => {
  const isEnabled = ref(true);
  let isFetching = false;
  let lastCallTime = 0;

  const handleScroll = async () => {
    if (!isEnabled.value || isFetching) return;

    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = document.documentElement.scrollTop;
    const clientHeight = document.documentElement.clientHeight;

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      if (Date.now() - lastCallTime < cooldownMs) return;

      isFetching = true;
      try {
        await callback();
      } finally {
        lastCallTime = Date.now();
        isFetching = false;
      }
    }
  };

  onMounted(() => {
    window.addEventListener('scroll', handleScroll);
  });

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
  });

  const enable = () => {
    isEnabled.value = true;
  };

  const disable = () => {
    isEnabled.value = false;
  };

  return {
    isEnabled,
    enable,
    disable
  };
};
