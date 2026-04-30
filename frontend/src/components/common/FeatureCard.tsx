import React, { useState } from 'react';

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface FeatureCardProps {
  feature: FeatureItem;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1.5px solid ${hovered ? '#f5c518' : '#e8e8e8'}`,
        borderRadius: 14,
        padding: '20px 18px',
        cursor: 'default',
        transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
        boxShadow: hovered ? '0 6px 28px rgba(245,197,24,0.14)' : '0 0 0 transparent',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div style={{ width: 32, height: 32, marginBottom: 10, color: '#e6a800' }}>{feature.icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 5 }}>{feature.title}</div>
      <div style={{ fontSize: 12, color: '#666', lineHeight: 1.55 }}>{feature.description}</div>
    </div>
  );
};

export default FeatureCard;
