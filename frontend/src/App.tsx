// src/App.jsx
// App shell — mounts route tree, global Toast renderer, and page-transition loader

import AppRoutes          from './routes/appRoutes';
import Toast              from './components/common/Toast';
import TransitionLoader   from './components/common/TransitionLoader';
import DirectAccessGuard  from './components/common/DirectAccessGuard';

export default function App() {
  return (
    <div className="pages-font-semibold">
      {/* Page-transition loader — shown on every navigate(), including state-passing navigations */}
      <TransitionLoader />
      {/* Blocks direct address-bar access to protected pages outside of exception routes */}
      <DirectAccessGuard>
        <AppRoutes />
      </DirectAccessGuard>
      <Toast />
    </div>
  );
}
