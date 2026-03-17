import { ref, onMounted, onUnmounted } from 'vue';

export const useInfiniteScroll = (callback: () => void | Promise<void>, threshold = 300) => {
  const isEnabled = ref(true);
  let isFetching = false;

  const handleScroll = async () => {
    if (!isEnabled.value || isFetching) return;

    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = document.documentElement.scrollTop;
    const clientHeight = document.documentElement.clientHeight;

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      isFetching = true;
      try {
        await callback();
      } finally {
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
