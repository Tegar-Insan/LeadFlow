/**
 * Loginform.test.jsx
 * TC002 — Authenticate User (login form validation)
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import LoginForm from '../../src/components/auth/LoginForm';

describe('LoginForm', () => {
  // TC002_03 — empty fields block submission
  it('shows error when email is empty on submit', async () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Email is required.')).toBeInTheDocument();
  });

  // TC002_03 — empty password blocks submission
  it('shows error when password is empty on submit', async () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'test@test.com');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Password is required.')).toBeInTheDocument();
  });

  // TC002_02 — invalid email format shows warning
  it('shows error for invalid email format', async () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'not-an-email');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
  });

  // TC002_01 — valid credentials call onSubmit
  it('calls onSubmit with email and password when form is valid', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'staff@krench.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email:    'staff@krench.com',
        password: 'password123',
      });
    });
  });

  // TC002_04 — API error is displayed
  it('displays API error message when apiError prop is passed', () => {
    render(<LoginForm onSubmit={vi.fn()} apiError="Incorrect email or password" />);
    expect(screen.getByText('Incorrect email or password')).toBeInTheDocument();
  });

  // Verify form renders both fields
  it('renders email and password fields', () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
  });
});
