import { ref } from 'vue';

interface ConfirmState {
  message: string;
  resolve: (value: boolean) => void;
}

interface AlertState {
  message: string;
  resolve: () => void;
}

const confirmState = ref<ConfirmState | null>(null);
const alertState = ref<AlertState | null>(null);

export const useDialog = () => {
  const confirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmState.value = { message, resolve };
    });
  };

  const alert = (message: string): Promise<void> => {
    return new Promise((resolve) => {
      alertState.value = { message, resolve };
    });
  };

  const resolveConfirm = (value: boolean) => {
    confirmState.value?.resolve(value);
    confirmState.value = null;
  };

  const resolveAlert = () => {
    alertState.value?.resolve();
    alertState.value = null;
  };

  return { confirm, alert, confirmState, alertState, resolveConfirm, resolveAlert };
};
