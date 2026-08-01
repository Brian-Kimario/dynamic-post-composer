import { createBrowserRouter } from 'react-router';
import { PERMISSION } from '../config/permissions';
import App from '../App';
import AppLayout from '../components/layout/AppLayout';
import RequireAuth from './RequireAuth';
import RequirePermission from './RequirePermission';
import LandingRedirect from './LandingRedirect';
import LoginPage from '../pages/LoginPage';
import ComposePage from '../pages/ComposePage';
import LibraryPage from '../pages/LibraryPage';
import InsightsPage from '../pages/InsightsPage';
import SessionPage from '../pages/SessionPage';
import AdminPage from '../pages/AdminPage';
import ForbiddenPage from '../pages/ForbiddenPage';
import NotFoundPage from '../pages/NotFoundPage';

/**
 * The route table, which is also the access-control map — the two are the same
 * thing here, and that is the point of putting guards in the tree rather than
 * inside each page.
 *
 * Nesting does the work:
 *
 *   App                    holds the app until the stored token is verified
 *   └── login              public
 *   └── RequireAuth        everything below needs a session
 *       └── AppLayout      header, nav, footer
 *           └── RequirePermission   one branch per permission
 *
 * Guards are layout routes rendering `<Outlet />`, so a rule is written once and
 * covers every route beneath it. Adding a route under an existing guard inherits
 * its protection automatically — the failure mode where a new page is quietly
 * unprotected is what this arrangement is designed to prevent.
 */
export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/login', element: <LoginPage /> },

      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              // `/` is not a page — it resolves to wherever this role can go.
              { index: true, element: <LandingRedirect /> },

              {
                element: <RequirePermission permission={PERMISSION.DRAFT_WRITE} />,
                children: [{ path: 'compose', element: <ComposePage /> }],
              },
              {
                element: <RequirePermission permission={PERMISSION.CONTENT_READ} />,
                children: [{ path: 'library', element: <LibraryPage /> }],
              },
              {
                element: <RequirePermission permission={PERMISSION.INSIGHTS_VIEW} />,
                children: [{ path: 'insights', element: <InsightsPage /> }],
              },
              {
                element: <RequirePermission permission={PERMISSION.WORKSPACE_ADMIN} />,
                children: [{ path: 'admin', element: <AdminPage /> }],
              },

              // Any signed-in role: it shows the user their own session.
              { path: 'session', element: <SessionPage /> },

              // Both live inside the layout so a user who lands on one still has
              // the navigation they need to get out.
              { path: '403', element: <ForbiddenPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
