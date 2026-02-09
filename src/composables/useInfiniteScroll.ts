import { ref, onMounted, onUnmounted } from 'vue';

export const useInfiniteScroll = (callback: () => void, threshold = 300) => {
  const isEnabled = ref(true);

  const handleScroll = () => {
    if (!isEnabled.value) return;

    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = document.documentElement.scrollTop;
    const clientHeight = document.documentElement.clientHeight;

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      callback();
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
