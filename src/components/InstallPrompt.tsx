'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS or if beforeinstallprompt doesn't fire, show prompt after a delay
    // This ensures users see the install instructions even if the browser doesn't trigger the event
    const showDelay = setTimeout(() => {
      // Only show if not already installed and not dismissed recently
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed) {
        const dismissedTime = parseInt(dismissed, 10);
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (dismissedTime > oneDayAgo) {
          return; // Don't show if dismissed recently
        }
      }

      // Show for iOS always, or for other platforms if not in standalone mode
      // (The beforeinstallprompt event handler will override this if it fires)
      if (!standalone) {
        setShowPrompt(true);
      }
    }, 3000); // Show after 3 seconds

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(showDelay);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleClose = () => {
    setShowPrompt(false);
    // Store in localStorage to not show again for a while
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or if dismissed recently
  useEffect(() => {
    if (isStandalone) {
      setShowPrompt(false);
      return;
    }

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (dismissedTime > oneDayAgo) {
        setShowPrompt(false);
        return;
      }
    }

    // Show prompt if:
    // 1. We have a deferred prompt (Android/Desktop with beforeinstallprompt event)
    // 2. OR it's iOS (which doesn't fire beforeinstallprompt, but we can show instructions)
    if (deferredPrompt || isIOS) {
      setShowPrompt(true);
    }
  }, [deferredPrompt, isStandalone, isIOS]);

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  if (!showPrompt || isStandalone) {
    return null;
  }

  // iOS-specific instructions (show even without beforeinstallprompt event)
  if (isIOS && !isStandalone) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white border-2 border-primary rounded-lg shadow-xl p-4 z-50 animate-slide-up">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              Install Leeztruestyles
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Add to Home Screen to access quickly
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>1. Tap the Share button</p>
              <p>2. Select &quot;Add to Home Screen&quot;</p>
              <p>3. Tap &quot;Add&quot;</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="ml-2 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Android/Desktop install prompt
  // Only show install button if we have deferredPrompt (beforeinstallprompt event fired)
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white border-2 border-primary rounded-lg shadow-xl p-4 z-50 animate-slide-up">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            Install Leeztruestyles
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {deferredPrompt 
              ? 'Get quick access and a better experience'
              : 'Add to Home Screen for quick access and offline support'}
          </p>
          {!deferredPrompt && (
            <div className="text-xs text-gray-500 space-y-1 mt-2">
              <p>• Look for the install icon in your browser</p>
              <p>• Or use the browser menu: More tools → Create shortcut</p>
            </div>
          )}
        </div>
        <button
          onClick={handleClose}
          className="ml-2 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {deferredPrompt && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Install
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Later
          </button>
        </div>
      )}
      {!deferredPrompt && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}

