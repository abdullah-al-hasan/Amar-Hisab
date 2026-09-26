import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Separate native status bar on real devices so it never overlaps header
if (Capacitor.isNativePlatform()) {
  try {
    StatusBar.setOverlaysWebView({ overlay: false });
    StatusBar.setBackgroundColor({ color: '#0F172A' });
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.show();
  } catch (e) {
    console.warn('StatusBar init:', e);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
