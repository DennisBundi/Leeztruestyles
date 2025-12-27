'use client';

import { useEffect } from 'react';

export default function PWAMetaTags() {
  useEffect(() => {
    // Add custom meta tags that aren't supported by Next.js Metadata API
    const addMetaTag = (name: string, content: string, attribute = 'name') => {
      if (!document.querySelector(`meta[${attribute}="${name}"]`)) {
        const meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      }
    };

    const addLinkTag = (rel: string, href: string) => {
      if (!document.querySelector(`link[rel="${rel}"][href="${href}"]`)) {
        const link = document.createElement('link');
        link.setAttribute('rel', rel);
        link.setAttribute('href', href);
        document.head.appendChild(link);
      }
    };

    // Add Apple-specific meta tags
    addMetaTag('apple-mobile-web-app-capable', 'yes');
    addMetaTag('apple-mobile-web-app-status-bar-style', 'default');
    addMetaTag('apple-mobile-web-app-title', 'Leeztruestyles');
    
    // Add mobile web app capability
    addMetaTag('mobile-web-app-capable', 'yes');
    
    // Add Microsoft tile color
    addMetaTag('msapplication-TileColor', '#f9a8d4');
    addMetaTag('msapplication-tap-highlight', 'no');
    
    // Add Apple touch icon
    addLinkTag('apple-touch-icon', '/icons/icon-192x192.png');
  }, []);

  return null;
}

