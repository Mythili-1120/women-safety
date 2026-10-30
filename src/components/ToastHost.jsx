import { useEffect, useState } from 'react';

/** Listens for global toast events and renders them. */
export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const t = e.detail;
      setToasts((prev) => [...prev.slice(-4), t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, t.duration || 4000);
    };
    window.addEventListener('wsa-toast', handler);
    return () => window.removeEventListener('wsa-toast', handler);
  }, []);

  const styles = {
    success: 'border-green-500/40 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200',
    error: 'border-red-500/40 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',
    warning: 'border-amber-500/40 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    info: 'border-blue-500/40 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto w-full max-w-md rounded-lg border px-4 py-3 text-sm shadow-lg ${styles[t.type] || styles.info}`}
          role="alert"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
