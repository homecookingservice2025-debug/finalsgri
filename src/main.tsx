import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept window.fetch to support custom VITE_API_URL when deployed to static hosts like Vercel
const originalFetch = window.fetch;
try {
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: function (input: RequestInfo | URL, init?: RequestInit) {
      let finalInput = input;
      if (typeof finalInput === 'string' && finalInput.startsWith('/api/')) {
        console.log(`[API CLIENT REQUEST] Fetching relative API endpoint: "${finalInput}"`, { init });
        
        const isDevOrPreview = window.location.hostname.includes('run.app') || 
                               window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1';
                               
        if (!isDevOrPreview) {
          const baseUrl = (import.meta as any).env.VITE_API_URL || '';
          const isBaseLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
          const isClientLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

          // Safeguard: do not connect to localhost in Vercel production!
          const shouldRedirect = baseUrl && 
                                 baseUrl.startsWith('http') && 
                                 !baseUrl.includes('your-ubuntu-vps-ip') && 
                                 !(isBaseLocal && !isClientLocal);

          if (shouldRedirect) {
            const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            finalInput = `${cleanBase}${finalInput}`;
            console.log(`[API CLIENT REDIRECT] Redirected to production VPS / remote server: "${finalInput}"`);
          } else {
            console.log(`[API CLIENT ROUTING] Using Vercel Serverless internal route (relative URL): "${finalInput}"`);
          }
        } else {
          console.log(`[API CLIENT ROUTING] AIS Dev/Preview mode. Keeping relative path: "${finalInput}"`);
        }
      }
      return originalFetch(finalInput, init);
    }
  });
} catch (e) {
  console.error("Failed to intercept window.fetch:", e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
