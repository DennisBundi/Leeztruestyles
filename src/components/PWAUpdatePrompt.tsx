'use client';

import { useEffect, useState } from 'react';

export default function PWAUpdatePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setShow(true);
    window.addEventListener('pwa-updated', handleUpdate);
    return () => window.removeEventListener('pwa-updated', handleUpdate);
  }, []);

  if (!show) return null;

  const handleUpdate = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    setShow(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-xl bg-pink-300 px-4 py-3 shadow-lg sm:left-auto sm:right-4 sm:w-80">
      <p className="text-sm font-medium text-pink-900">
        New version available — tap to get the latest look!
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={handleUpdate}
          className="rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-700 active:bg-pink-800"
        >
          Update
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="text-pink-700 hover:text-pink-900"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
