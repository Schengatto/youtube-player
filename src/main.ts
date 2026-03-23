import { createApp } from 'vue';
import App from './App.vue';
import './style.css';
import { usePostHog } from '@/composables/usePostHog';

usePostHog();

createApp(App).mount('#app');
