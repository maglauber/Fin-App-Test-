import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';

// Suppress React 18.3 warnings about defaultProps in function components
// This is primarily caused by third-party libraries like recharts
const originalError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Support for defaultProps will be removed from function components')) {
    return;
  }
  originalError(...args);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);