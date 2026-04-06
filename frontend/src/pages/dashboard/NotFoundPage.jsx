// src/pages/NotFoundPage.jsx
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function NotFoundPage() {
  const { isAuthenticated, dashboardPath } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="text-center animate-slide-up">
        <p className="font-mono text-brand text-6xl font-bold mb-4">404</p>
        <h1 className="font-display font-bold text-2xl text-text-primary mb-3">Page not found</h1>
        <p className="text-text-secondary text-sm mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
        <button onClick={() => navigate(isAuthenticated ? dashboardPath : '/login')} className="btn-primary px-8 py-3 rounded-xl">
          {isAuthenticated ? 'Go to Dashboard' : 'Go to Login'}
        </button>
      </div>
    </div>
  );
}