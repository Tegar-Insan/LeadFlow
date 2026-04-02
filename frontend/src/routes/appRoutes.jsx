// src/routes/appRoutes.jsx
// AUTH TESTING ONLY — other routes added later
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage    from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';
import OTPPage      from '../pages/auth/OTPPage.jsx';

function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <p className="text-white text-xl">403 — Access Denied</p>
    </div>
  );
}

function PlaceholderPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <p className="text-white text-xl">Coming Soon</p>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"        element={<LoginPage />} />
      <Route path="/register"     element={<RegisterPage />} />
      <Route path="/otp"          element={<OTPPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*"             element={<Navigate to="/login" replace />} />
      <Route path="/otp" element={<OTPPage />} />
    </Routes>
  );
}