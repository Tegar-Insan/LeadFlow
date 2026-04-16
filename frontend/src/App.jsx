// src/App.jsx
// App shell — mounts route tree, global Toast renderer, and page-transition loader

import AppRoutes        from './routes/appRoutes';
import Toast            from './components/common/Toast';
import TransitionLoader from './components/common/TransitionLoader';

export default function App() {
  return (
    <>
      {/* Page-transition loader — shown on every navigate(), including state-passing navigations */}
      <TransitionLoader />
      <AppRoutes />
      <Toast />
    </>
  );
}
