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
      const isDevEnv = window.location.hostname.includes('run.app') || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
                       
      if (!isDevEnv && typeof input === 'string' && input.startsWith('/api/')) {
        const baseUrl = (import.meta as any).env.VITE_API_URL || '';
        if (baseUrl && baseUrl.startsWith('http') && !baseUrl.includes('your-ubuntu-vps-ip')) {
          const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
          input = `${cleanBase}${input}`;
        }
      }
      return originalFetch(input, init);
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
