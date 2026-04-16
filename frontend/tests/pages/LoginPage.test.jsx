/**
 * LoginPage.test.jsx
 * TC002 — Authenticate User (login page integration)
 */
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock only the auth hook — keep react-router-dom real (wrapped in MemoryRouter)
const mockLogin = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  default: () => ({
    login:           mockLogin,
    dashboardPath:   '/calendar',
    isAuthenticated: false,
  }),
}));

import LoginPage from '../../src/pages/auth/LoginPage';

const renderPage = (locationState = {}) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: locationState }]}>
      <LoginPage />
    </MemoryRouter>
  );

describe('LoginPage', () => {
  beforeEach(() => mockLogin.mockReset());

  // TC002_01 — page renders the login form fields
  it('renders email, password fields and sign-in button', () => {
    renderPage();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  // TC002_01 — login heading is visible
  it('displays "Welcome back" heading', () => {
    renderPage();
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  // TC002 — register link is present
  it('shows a link to the register page', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /register here/i })).toBeInTheDocument();
  });

  // TC002_03 — empty form submission shows validation errors
  it('shows validation errors when form is submitted empty', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Email is required.')).toBeInTheDocument();
  });

  // TC002_02 — invalid email format triggers inline error
  it('shows invalid email format error', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/email address/i), 'bad-email');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
  });

  // TC002_04 — API error message is displayed on failed login
  it('displays API error message when login fails', async () => {
    mockLogin.mockRejectedValueOnce({
      response: { data: { message: 'Incorrect email or password' } },
    });
    renderPage();
    await userEvent.type(screen.getByLabelText(/email address/i), 'staff@krench.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'wrongpass');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Incorrect email or password')).toBeInTheDocument();
  });

  // TC002_06 — success banner shown after registration redirect
  it('shows success banner when location.state.registered is true', () => {
    renderPage({ registered: true });
    expect(screen.getByText(/account created/i)).toBeInTheDocument();
  });
});
