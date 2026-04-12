// src/App.jsx
// App shell — mounts route tree and global Toast renderer

import AppRoutes from './routes/appRoutes';
import Toast     from './components/common/Toast';

export default function App() {
  return (
    <>
      <AppRoutes />
      <Toast />
    </>
  );
}
