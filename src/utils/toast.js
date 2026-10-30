/**
 * Tiny global toast notification system (no extra dependency).
 * Usage:  toast.success('Saved!');  toast.error('Something went wrong');
 */
function emit(type, message, duration = 4000) {
  window.dispatchEvent(
    new CustomEvent('wsa-toast', {
      detail: { id: Date.now() + Math.random(), type, message, duration },
    })
  );
}

export const toast = {
  success: (msg, duration) => emit('success', msg, duration),
  error: (msg, duration = 6000) => emit('error', msg, duration),
  info: (msg, duration) => emit('info', msg, duration),
  warning: (msg, duration = 6000) => emit('warning', msg, duration),
};

export default toast;
