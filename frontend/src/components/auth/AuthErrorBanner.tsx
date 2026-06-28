import React from 'react';

interface AuthErrorBannerProps {
  message: string;
}

const WarningIcon: React.FC = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, marginTop: 1 }}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export default function AuthErrorBanner({ message }: AuthErrorBannerProps) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: '#fff8f0',
        border: '1px solid rgba(0,0,0,0.08)',
        borderLeft: '3px solid #f6b70a',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 24,
        color: '#1a1a1a',
        fontSize: 14,
        fontFamily: "'DM Sans', sans-serif",
        lineHeight: 1.5,
      }}
    >
      <span style={{ color: '#d4960a' }}>
        <WarningIcon />
      </span>
      <span style={{ color: '#1a1a1a' }}>{message}</span>
    </div>
  );
}
