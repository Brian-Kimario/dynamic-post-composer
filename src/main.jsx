import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router';
import { store } from './store';
import { router } from './routes/router';
import './index.css';

// Provider puts the store on React context, which is what lets useSelector and
// useDispatch reach it from any depth without passing anything through props.
//
// It wraps RouterProvider rather than the other way round: the route guards call
// `useSelector`, so the store has to be on context before any route renders.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
);
