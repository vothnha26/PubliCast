
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import RootApp from './app/RootApp';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <RootApp />
    </Provider>
  </React.StrictMode>
);
  