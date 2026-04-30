import React from 'react';

// StaffProfileDesktop
// Lightweight stitch preview component — no sidebar/navbar.
// Renders a white page with dotted-line background and the exported screenshot.

const screenshotPath = '/stitch/14449637018964627466/screens/80e00bc8cb874937be7a0b04e4759658/screenshot.png';

const containerStyle = {
  minHeight: '100vh',
  background: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '48px',
};

const dottedBg = {
  width: '100%',
  maxWidth: 1200,
  background: 'white',
  borderRadius: 10,
  padding: 28,
  boxSizing: 'border-box',
  // dotted grid subtle background using radial-gradient
  backgroundImage: `radial-gradient(#e6e6e6 1px, rgba(0,0,0,0) 1px)`,
  backgroundSize: '14px 14px',
  boxShadow: '0 6px 24px rgba(16,24,40,0.08)',
};

const innerCard = {
  width: '100%',
  background: '#fff',
  borderRadius: 8,
  padding: 18,
  border: '1px dashed rgba(0,0,0,0.06)',
  display: 'flex',
  gap: 16,
  alignItems: 'flex-start',
  justifyContent: 'center',
};

export default function StaffProfileDesktop() {
  return (
    <div style={containerStyle}>
      <div style={dottedBg}>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Staff Profile — Desktop (Stitch export)</div>
        <div style={innerCard}>
          <img
            src={screenshotPath}
            alt="Staff Profile - Desktop"
            style={{ width: '100%', height: 'auto', borderRadius: 6, display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
}
