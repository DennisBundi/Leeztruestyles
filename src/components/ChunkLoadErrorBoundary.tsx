'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export default class ChunkLoadErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a ChunkLoadError
    const isChunkError = 
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch dynamically imported module');

    if (isChunkError) {
      return {
        hasError: true,
        error,
        retryCount: 0,
      };
    }

    // Re-throw other errors
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ChunkLoadError caught:', error);
    console.error('Error info:', errorInfo);
    
    // Don't auto-retry - let user manually retry to prevent infinite loops
    // The error boundary will show the retry button, but won't automatically reload
  }

  handleRetry = () => {
    // Clear all caches first
    const clearCaches = async () => {
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const names = await caches.keys();
          await Promise.all(
            names.map((name) => caches.delete(name))
          );
          console.log('[ChunkLoadError] All caches cleared');
        } catch (err) {
          console.warn('[ChunkLoadError] Failed to clear caches:', err);
        }
      }

      // Clear service worker cache if available
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      }
    };

    clearCaches().then(() => {
      // Force a hard reload with cache bypass - no automatic retries to prevent loops
      const currentUrl = window.location.href.split('?')[0];
      const timestamp = Date.now();
      
      // Use location.href with cache bypass parameters
      window.location.href = `${currentUrl}?_hard_reload=${timestamp}&_nocache=1&_cb=${timestamp}`;
    });
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <svg
                className="mx-auto h-16 w-16 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Failed to Load Page
            </h1>
            <p className="text-gray-600 mb-6">
              There was an error loading the page. This is usually a temporary issue.
            </p>
            <button
              onClick={this.handleRetry}
              className="w-full bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              Clear Cache & Reload
            </button>
            <p className="mt-4 text-sm text-gray-500">
              If this persists, try clearing your browser cache or restarting the dev server.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

