import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import './index.css';
import App from './App.jsx';

// Provider puts the store on React context, which is what lets useSelector and
// useDispatch reach it from any depth without passing anything through props.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
