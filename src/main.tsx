import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Configure Native Status Bar like Facebook / Standard Clean Android Apps
if (Capacitor.isNativePlatform()) {
  try {
    // 1. Never overlay the webview - keeps status bar completely separate at the top
    StatusBar.setOverlaysWebView({ overlay: false });
    
    // 2. Pure white background for status bar
    StatusBar.setBackgroundColor({ color: '#FFFFFF' });
    
    // 3. Style.Light in Capacitor instructs Android to draw DARK/BLACK icons (Time, Battery, Wifi, 5G)
    StatusBar.setStyle({ style: Style.Light });
    
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
