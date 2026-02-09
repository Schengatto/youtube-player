<script setup lang="ts">
interface Props {
  show: boolean;
}

defineProps<Props>();
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="share-toast">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Link copiato negli appunti!
    </div>
  </Teleport>
</template>

<style scoped>
.share-toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #fa0000;
  color: #fff;
  padding: 0.9rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  animation: slideUp 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }

  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@media (max-width: 768px) {
  .share-toast {
    bottom: 1rem;
    left: 1rem;
    right: 1rem;
    transform: none;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
</style>
