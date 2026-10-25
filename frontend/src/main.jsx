import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store.js';

import './index.css';
import App from './App.jsx';
import { Toaster } from 'sonner';

createRoot(document.getElementById('root')).render(
    <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
            <BrowserRouter>
                <Toaster closeButton={true} />
                <App />
            </BrowserRouter>
        </PersistGate>
    </Provider>,
);
