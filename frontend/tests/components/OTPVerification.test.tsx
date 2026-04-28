/**
 * OTPVerification.test.jsx
 * TC001 — Register Account (OTP entry)
 */
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/authService', () => ({ resendOTP: vi.fn() }));
vi.mock('@/utils/constants',     () => ({ OTP_RESEND_COOLDOWN: 60 }));

import OTPVerification from '../../src/components/auth/OTPVerification';

const EMAIL = 'staff@krench.com';

describe('OTPVerification', () => {
  // TC001 — renders 6 digit input boxes
  it('renders 6 digit input boxes', () => {
    render(<OTPVerification email={EMAIL} onSubmit={vi.fn()} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
  });

  // TC001 — Verify button disabled when OTP is incomplete
  it('verify button is disabled when OTP is incomplete', () => {
    render(<OTPVerification email={EMAIL} onSubmit={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /verify code/i });
    expect(btn).toBeDisabled();
  });

  // TC001 — Verify button enabled when all 6 digits are entered
  it('verify button is enabled when all 6 digits are entered', async () => {
    render(<OTPVerification email={EMAIL} onSubmit={vi.fn()} />);
    const inputs = screen.getAllByRole('textbox');
    for (const [i, input] of inputs.entries()) {
      await userEvent.type(input, String(i + 1));
    }
    expect(screen.getByRole('button', { name: /verify code/i })).not.toBeDisabled();
  });

  // TC001 — onSubmit called with 6-digit code
  it('calls onSubmit with the entered OTP when form is submitted', async () => {
    const onSubmit = vi.fn();
    render(<OTPVerification email={EMAIL} onSubmit={onSubmit} />);
    const inputs = screen.getAllByRole('textbox');
    for (const [i, input] of inputs.entries()) {
      await userEvent.type(input, String(i + 1));
    }
    fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
    expect(onSubmit).toHaveBeenCalledWith('123456');
  });

  // TC001 — shows masked email
  it('displays the masked email address', () => {
    render(<OTPVerification email={EMAIL} onSubmit={vi.fn()} />);
    // Email staff@krench.com → s****@krench.com
    expect(screen.getByText(/s\*{4}@krench\.com/)).toBeInTheDocument();
  });

  // TC001 — error prop is displayed
  it('shows error message when error prop is passed', () => {
    render(<OTPVerification email={EMAIL} onSubmit={vi.fn()} error="Invalid OTP code." />);
    expect(screen.getByText('Invalid OTP code.')).toBeInTheDocument();
  });
});
