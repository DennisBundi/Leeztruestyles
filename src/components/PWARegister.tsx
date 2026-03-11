'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Snapshot whether there was already a controller before we register.
    // If null → first-time install (no update toast needed).
    // If set → existing install, any controllerchange = update.
    const hadController = !!navigator.serviceWorker.controller;

    navigator.serviceWorker
      .register('/sw.js')
      .then(() => {
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) {
        // A new SW has taken over — notify the update prompt
        window.dispatchEvent(new CustomEvent('pwa-updated'));
      }
    });
  }, []);

  return null;
}
