import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Dynamic imports to ensure only the necessary code is loaded
const App = lazy(() => import('./App'));
const HitTheMeanGame = lazy(() => import('./components/HitTheMeanGame'));

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const params = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
const isTeaser = params.get('teaser') === 'true' || params.get('game') === 'true' || 
                 hashParams.get('teaser') === 'true' || hashParams.get('game') === 'true';

console.log('DIGICAP Boot:', { isTeaser, search: window.location.search, hash: window.location.hash });

const root = ReactDOM.createRoot(rootElement);

if (isTeaser) {
  // Get language from localStorage if available
  let lang: 'en' | 'sv' | 'de' | 'fr' = 'en';
  try {
    const saved = localStorage.getItem('digicap_lang');
    if (saved === 'sv' || saved === 'en' || saved === 'de' || saved === 'fr') {
      lang = saved;
    }
  } catch (e) {}

  root.render(
    <React.StrictMode>
      <Suspense fallback={<div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-white font-black uppercase tracking-widest">Loading Teaser...</div>}>
        <HitTheMeanGame 
          language={lang} 
          onClose={() => { window.location.href = window.location.origin; }} 
          isTeaserMode={true} 
        />
      </Suspense>
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <Suspense fallback={<div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-white font-black uppercase tracking-widest">Loading DIGICAP...</div>}>
        <App />
      </Suspense>
    </React.StrictMode>
  );
}

// Register Service Worker for PWA installation support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration failed: ', err);
    });
  });
}
