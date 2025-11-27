/**
 * main.tsx
 * 
 * Purpose: Application entry point - bootstraps React, routing, and global styles.
 * 
 * Why this structure:
 * - StrictMode helps catch potential issues during development
 * - BrowserRouter enables client-side routing for SPA navigation
 * - AuthProvider manages authentication state globally
 * - Clean separation of concerns: this file just boots the app
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
