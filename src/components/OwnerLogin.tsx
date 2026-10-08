import React, { useState, useEffect } from 'react';
import {
  loginUser,
  apiForgotPassword,
  apiVerifyResetOtp,
  apiResendResetOtp,
  apiResetPassword,
  verifyResetCode,
  confirmNewPassword,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithOtp,
  getLocalSettings,
  getPrimaryOwnerId,
} from '../services/authService';
import { UserProfile } from '../types';
import {
  ArrowLeft,
  Mail,
  Lock,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  ClipboardPaste,
  Clock,
  AlertCircle,
  Check,
} from 'lucide-react';
import { ChaiDenLogo } from './ChaiDenLogo';

interface OwnerLoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  onBackToMenu: () => void;
  initialMode?: 'login' | 'forgot' | 'reset';
  initialOobCode?: string;
}

export const OwnerLogin: React.FC<OwnerLoginProps> = ({
  onLoginSuccess,
  onBackToMenu,
  initialMode = 'login',
  initialOobCode = '',
}) => {
  // Modes:
  // 'login': standard credentials form
  // 'forgot-email': step 1 enter email to send code
  // 'forgot-code': step 2 enter OTP with countdown timer
  // 'forgot-new-password': step 3 set new password with validation checklist
  // 'forgot-success': step 4 password changed successfully
  // 'link-reset': direct link reset from email
  const [viewMode, setViewMode] = useState<
    'login' | 'forgot-email' | 'forgot-code' | 'forgot-new-password' | 'forgot-success' | 'link-reset'
  >(
    initialMode === 'reset'
      ? 'link-reset'
      : initialMode === 'forgot'
      ? 'forgot-email'
      : 'login'
  );

  // Login Form Fields (Primary Owner ID required for all user roles)
  const [primaryOwnerId, setPrimaryOwnerId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password / OTP State
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Timers & Attempt Tracking
  const [countdownSeconds, setCountdownSeconds] = useState(600); // 10 minutes
  const [resendCooldown, setResendCooldown] = useState(0); // 60s cooldown
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  // Action Code State (from direct email link)
  const [oobCode, setOobCode] = useState(initialOobCode);
  const [linkResetEmail, setLinkResetEmail] = useState('');

  // Status & Feedback States
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 10-Minute OTP Expiration Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (viewMode === 'forgot-code' && countdownSeconds > 0) {
      timer = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [viewMode, countdownSeconds]);

  // 60-Second Resend Cooldown Timer
  useEffect(() => {
    let cooldownTimer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      cooldownTimer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownTimer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(cooldownTimer);
  }, [resendCooldown]);

  // Check URL parameters for direct email link reset
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');

      const code = urlParams.get('oobCode') || hashParams.get('oobCode') || initialOobCode;
      const mode = urlParams.get('mode') || hashParams.get('mode');

      if (code && (mode === 'resetPassword' || window.location.hash.includes('reset-password'))) {
        setOobCode(code);
        setViewMode('link-reset');
        setLoading(true);
        verifyResetCode(code)
          .then((verifiedEmail) => {
            setLinkResetEmail(verifiedEmail);
          })
          .catch((err) => {
            setError(err instanceof Error ? err.message : 'Invalid or expired recovery link.');
          })
          .finally(() => {
            setLoading(false);
          });
      }
    } catch {
      // ignore
    }
  }, [initialOobCode]);

  // Format MM:SS for countdown timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Live Password Validation Checklist Checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid =
    hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar && passwordsMatch;

  // Handle Standard Login with Primary Owner ID
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPrimaryId = primaryOwnerId.trim();
    if (!cleanPrimaryId) {
      setError('Primary Owner ID is required. Please enter the valid Primary Owner ID to sign in.');
      return;
    }

    if (!password) {
      setError('Password is required. Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const profile = await loginUser(cleanPrimaryId, password);
      onLoginSuccess(profile);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invalid credentials. Please verify your Primary Owner ID & password.'
      );
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: Submit Email to Request OTP (Dispatched to Gmail)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    const clean = recoveryEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setError('Please provide a valid registered Gmail address.');
      return;
    }

    setLoading(true);
    try {
      // Dispatch via backend endpoint (stores in Firestore and sends via SMTP)
      try {
        const response = await apiForgotPassword(clean);
        setStatusMessage(response.message);
      } catch {
        // Fallback to client-side service if backend unavailable
        await requestPasswordResetOtp(clean);
        setStatusMessage(`A 4-digit verification code has been dispatched to your Gmail (${clean}).`);
      }

      // Also trigger Firebase Auth password reset email directly
      try {
        await requestPasswordResetOtp(clean);
      } catch {
        // ignore if already dispatched
      }

      setViewMode('forgot-code');
      setEnteredOtp('');
      setCountdownSeconds(600); // 10 minutes
      setResendCooldown(60); // 60s cooldown
      setAttemptsRemaining(5);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify 4-Digit OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = enteredOtp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setError('Please enter your 4-digit verification code.');
      return;
    }

    if (countdownSeconds <= 0) {
      setError('Verification code has expired. Please click "Resend Code".');
      return;
    }

    setLoading(true);
    try {
      // Try backend verification first
      try {
        const res = await apiVerifyResetOtp(recoveryEmail, cleanOtp);
        if (res.resetToken) {
          setResetToken(res.resetToken);
        }
      } catch (backendErr: any) {
        // Check if attempts exceeded or invalid
        if (backendErr.message && backendErr.message.includes('attempts')) {
          setError(backendErr.message);
          setLoading(false);
          return;
        }
        // Fallback verification
        await verifyPasswordResetOtp(recoveryEmail, cleanOtp);
        setResetToken(`fallback_token_${Date.now()}`);
      }

      // OTP passed! Proceed to Step 3
      setViewMode('forgot-new-password');
      setError(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invalid verification code. Please check your email and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // STEP 2b: Resend OTP (with 60-second cooldown)
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError(null);
    setLoading(true);

    try {
      try {
        const res = await apiResendResetOtp(recoveryEmail);
        setStatusMessage(res.message);
      } catch {
        await requestPasswordResetOtp(recoveryEmail);
        setStatusMessage(`A new verification code has been sent to your Gmail (${recoveryEmail}).`);
      }

      setEnteredOtp('');
      setCountdownSeconds(600); // Reset 10 minutes
      setResendCooldown(60); // 60 seconds cooldown
      setAttemptsRemaining(5);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Submit New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError('Please satisfy all password security requirements before saving.');
      return;
    }

    setLoading(true);
    try {
      try {
        await apiResetPassword(recoveryEmail, resetToken, newPassword, confirmPassword);
      } catch (backendErr) {
        console.warn('Backend reset password notice (using local/firestore sync):', backendErr);
      }
      // Always synchronize updated password into user storage & credentials so immediate login works
      await resetPasswordWithOtp(recoveryEmail, enteredOtp || resetToken, newPassword);

      setViewMode('forgot-success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Direct Link Based Reset (via Firebase action link)
  const handleLinkBasedReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await confirmNewPassword(oobCode, newPassword);
      setViewMode('forgot-success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save new password.');
    } finally {
      setLoading(false);
    }
  };

  // Clipboard Paste Helper
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const clean = text.replace(/[^0-9]/g, '').slice(0, 6);
      if (clean) {
        setEnteredOtp(clean);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0603] text-[#f5efe6] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-vignette opacity-85 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#c59b41]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-[#160a04] border-2 border-[#dfb76c] rounded-2xl p-6 sm:p-8 shadow-[0_12px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(223,183,108,0.2)] relative z-10">
        {/* Subtle decorative gold brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#dfb76c] pointer-events-none" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#dfb76c] pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#dfb76c] pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#dfb76c] pointer-events-none" />

        {/* Top Back Navigation */}
        <div className="flex items-center justify-between mb-5">
          {viewMode !== 'login' ? (
            <button
              onClick={() => {
                if (viewMode === 'forgot-code') setViewMode('forgot-email');
                else if (viewMode === 'forgot-new-password') setViewMode('forgot-code');
                else setViewMode('login');
                setError(null);
              }}
              className="flex items-center gap-1.5 text-xs font-outfit text-[#dfb76c]/90 hover:text-[#dfb76c] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <button
              onClick={onBackToMenu}
              className="flex items-center gap-1.5 text-xs font-outfit text-[#dfb76c]/90 hover:text-[#dfb76c] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Menu</span>
            </button>
          )}

          <span className="text-[10px] font-outfit uppercase tracking-widest text-[#dfb76c]/60">
            Secure Portal
          </span>
        </div>

        {/* Cafe Logo & Header */}
        <div className="text-center mb-6">
          <ChaiDenLogo size="md" showSubtitle={false} className="mb-2" />
          <h1 className="font-cinzel text-xl sm:text-2xl font-bold text-gold-gradient tracking-wider">
            THE CHAI DEN
          </h1>
          <p className="text-[11px] font-outfit uppercase tracking-widest text-[#dfb76c]/80 mt-0.5">
            {viewMode === 'login'
              ? 'Owner & Staff Access'
              : viewMode === 'forgot-email'
              ? 'Forgot Password Recovery'
              : viewMode === 'forgot-code'
              ? 'Enter Verification Code'
              : viewMode === 'forgot-new-password'
              ? 'Create New Password'
              : 'Password Reset'}
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-xs text-red-200 flex items-start gap-2.5 shadow-inner animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: STANDARD OWNER & STAFF LOGIN                     */}
        {/* ======================================================== */}
        {viewMode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Primary Owner ID (Required for all roles) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-outfit text-[#dfb76c] uppercase tracking-wider font-semibold">
                  Primary Owner ID
                </label>
              </div>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-[#dfb76c]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={primaryOwnerId}
                  onChange={(e) => setPrimaryOwnerId(e.target.value)}
                  placeholder="Enter Primary Owner ID"
                  className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl pl-9 pr-3 py-2 text-xs text-[#f5efe6] placeholder-[#dfb76c]/40 focus:outline-none focus:border-[#dfb76c]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-outfit text-[#dfb76c] uppercase tracking-wider font-semibold">
                  Password
                </label>
                {/* Forgot Password Link (Step 1 Requirement) */}
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('forgot-email');
                    setRecoveryEmail(
                      getLocalSettings().primaryOwnerEmail || 'cherry1011705897@gmail.com'
                    );
                    setError(null);
                  }}
                  className="text-[11px] text-[#dfb76c]/90 hover:text-[#f5e29f] underline font-outfit cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-[#dfb76c]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl pl-9 pr-10 py-2 text-xs text-[#f5efe6] placeholder-[#dfb76c]/40 focus:outline-none focus:border-[#dfb76c]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dfb76c]/60 hover:text-[#dfb76c]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Show Password Toggle */}
              <div className="mt-2 flex items-center justify-between">
                <label
                  htmlFor="login-show-pwd"
                  className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#dfb76c]/90 hover:text-[#dfb76c] font-outfit"
                >
                  <input
                    id="login-show-pwd"
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-[#dfb76c]/50 bg-[#200f07] accent-[#dfb76c] cursor-pointer"
                  />
                  <span>Show Password</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#dfb76c] via-[#f5e29f] to-[#b8860b] text-[#1c0e07] font-bold text-xs uppercase tracking-widest font-outfit hover:brightness-110 shadow-lg disabled:opacity-50 transition-all mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: STEP 1 — FORGOT PASSWORD EMAIL ENTRY             */}
        {/* ======================================================== */}
        {viewMode === 'forgot-email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <p className="text-xs text-[#dfb76c]/90 leading-relaxed font-outfit">
              Enter your registered Owner or Co-Owner email. A 4-digit verification code will be sent to your email to verify your identity.
            </p>

            <div>
              <label className="block text-xs font-outfit text-[#dfb76c] uppercase tracking-wider mb-1">
                Registered Owner or Co-Owner Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#dfb76c]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="e.g. owner@gmail.com or coowner@chaiden.com"
                  className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl pl-9 pr-3 py-2 text-xs text-[#f5efe6] placeholder-[#dfb76c]/40 focus:outline-none focus:border-[#dfb76c]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#dfb76c] via-[#f5e29f] to-[#b8860b] text-[#1c0e07] font-bold text-xs uppercase tracking-widest font-outfit hover:brightness-110 shadow-lg disabled:opacity-50 transition-all"
            >
              {loading ? 'Sending Code...' : 'Send Verification Code'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setViewMode('login');
                  setError(null);
                }}
                className="text-xs text-[#dfb76c]/80 hover:text-[#dfb76c] underline font-outfit"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: STEP 2 — OTP VERIFICATION SCREEN                 */}
        {/* ======================================================== */}
        {viewMode === 'forgot-code' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {/* Status Info Box with Countdown */}
            <div className="p-3.5 rounded-xl bg-[#200f07] border border-[#dfb76c]/50 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Code Sent to Gmail</span>
                </div>
                {/* 10-Minute Expiration Countdown Timer */}
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-xs ${
                    countdownSeconds <= 60
                      ? 'bg-red-950 text-red-400 border border-red-500/40 animate-pulse'
                      : 'bg-[#150a04] text-[#f5e29f] border border-[#dfb76c]/40'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Code expires in {formatTimer(countdownSeconds)}</span>
                </div>
              </div>

              <p className="text-[#eedfca] text-[11.5px] leading-relaxed">
                A 4-digit verification code has been dispatched to your Gmail:{' '}
                <strong className="text-[#dfb76c]">{recoveryEmail}</strong>.
                Please check your Gmail inbox (and spam or junk folder) and enter the code below.
              </p>
            </div>

            {/* 4-Digit OTP Input Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-outfit text-[#dfb76c] uppercase tracking-wider">
                  Enter Verification Code (4 Digits) *
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="text-[11px] text-[#dfb76c] hover:text-[#f5e29f] flex items-center gap-1 underline font-outfit"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  <span>Paste</span>
                </button>
              </div>

              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#dfb76c]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••"
                  className="w-full bg-[#200f07] border-2 border-[#dfb76c]/50 rounded-xl pl-9 pr-3 py-2.5 text-base text-[#f5efe6] font-mono font-bold tracking-[8px] text-center focus:outline-none focus:border-[#dfb76c]"
                />
              </div>
            </div>

            {/* Verify Code Button */}
            <button
              type="submit"
              disabled={loading || countdownSeconds <= 0}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#dfb76c] via-[#f5e29f] to-[#b8860b] text-[#1c0e07] font-bold text-xs uppercase tracking-widest font-outfit hover:brightness-110 shadow-lg disabled:opacity-50 transition-all"
            >
              {loading ? 'Verifying Code...' : 'Verify Code'}
            </button>

            {/* Action Links: Resend with Cooldown & Back */}
            <div className="flex items-center justify-between pt-2 text-xs font-outfit">
              <button
                type="button"
                onClick={() => {
                  setViewMode('forgot-email');
                  setError(null);
                }}
                className="text-[#dfb76c]/80 hover:text-[#dfb76c] underline"
              >
                Back to Email
              </button>

              {/* Resend with 60-Second Cooldown */}
              <button
                type="button"
                disabled={resendCooldown > 0 || loading}
                onClick={handleResendOtp}
                className={`flex items-center gap-1.5 transition-colors ${
                  resendCooldown > 0
                    ? 'text-[#dfb76c]/40 cursor-not-allowed'
                    : 'text-[#dfb76c] hover:underline font-bold'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: STEP 3 — CREATE NEW PASSWORD (REQUIREMENTS LIST)  */}
        {/* ======================================================== */}
        {viewMode === 'forgot-new-password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Identity verified. Create your new Owner password.</span>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-outfit text-[#dfb76c] uppercase tracking-wider mb-1">
                New Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#dfb76c]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter strong password"
                  className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl pl-9 pr-10 py-2 text-xs text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dfb76c]/60 hover:text-[#dfb76c]"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-outfit text-[#dfb76c] uppercase tracking-wider mb-1">
                Confirm New Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#dfb76c]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl pl-9 pr-10 py-2 text-xs text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dfb76c]/60 hover:text-[#dfb76c]"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Validation Checklist (Step 6 Requirement) */}
            <div className="p-3 rounded-xl bg-[#200f07] border border-[#dfb76c]/30 text-[11px] space-y-1 font-outfit">
              <span className="text-[10px] uppercase tracking-wider text-[#dfb76c] font-bold block mb-1">
                Password Requirements:
              </span>
              <div
                className={`flex items-center gap-1.5 ${
                  hasMinLength ? 'text-emerald-400 font-semibold' : 'text-[#dfb76c]/50'
                }`}
              >
                <Check className="w-3 h-3" />
                <span>At least 8 characters</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasUppercase ? 'text-emerald-400 font-semibold' : 'text-[#dfb76c]/50'
                }`}
              >
                <Check className="w-3 h-3" />
                <span>At least one uppercase letter (A-Z)</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasLowercase ? 'text-emerald-400 font-semibold' : 'text-[#dfb76c]/50'
                }`}
              >
                <Check className="w-3 h-3" />
                <span>At least one lowercase letter (a-z)</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasNumber ? 'text-emerald-400 font-semibold' : 'text-[#dfb76c]/50'
                }`}
              >
                <Check className="w-3 h-3" />
                <span>At least one number (0-9)</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasSpecialChar ? 'text-emerald-400 font-semibold' : 'text-[#dfb76c]/50'
                }`}
              >
                <Check className="w-3 h-3" />
                <span>At least one special character (!@#$%^&*)</span>
              </div>
              {confirmPassword.length > 0 && (
                <div
                  className={`flex items-center gap-1.5 ${
                    passwordsMatch ? 'text-emerald-400 font-semibold' : 'text-red-400'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#dfb76c] via-[#f5e29f] to-[#b8860b] text-[#1c0e07] font-bold text-xs uppercase tracking-widest font-outfit hover:brightness-110 shadow-lg disabled:opacity-50 transition-all mt-2"
            >
              {loading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* VIEW 5: STEP 4 — PASSWORD CHANGED SUCCESSFULLY           */}
        {/* ======================================================== */}
        {viewMode === 'forgot-success' && (
          <div className="space-y-5 text-center py-2 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-950 border-2 border-emerald-500/80 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="font-cinzel text-lg font-bold text-[#fff4db]">
                Password Changed Successfully
              </h2>
              <p className="text-xs text-[#eedfca] leading-relaxed mt-2 font-outfit max-w-xs mx-auto">
                Your Owner password has been securely updated. You can now log in using your new credentials.
              </p>
            </div>

            <button
              onClick={() => {
                setViewMode('login');
                setPrimaryOwnerId(recoveryEmail);
                setPassword('');
                setError(null);
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#dfb76c] via-[#f5e29f] to-[#b8860b] text-[#1c0e07] font-bold text-xs uppercase tracking-widest font-outfit hover:brightness-110 shadow-lg transition-all"
            >
              Go to Owner Login
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 6: DIRECT EMAIL ACTION LINK RESET                   */}
        {/* ======================================================== */}
        {viewMode === 'link-reset' && (
          <form onSubmit={handleLinkBasedReset} className="space-y-4">
            {linkResetEmail && (
              <div className="p-2.5 rounded-xl bg-[#200f07] border border-[#dfb76c]/30 text-xs text-[#dfb76c]">
                <span className="block text-[10px] uppercase text-[#dfb76c]/70">Account:</span>
                <span className="font-mono text-white font-bold">{linkResetEmail}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-outfit text-[#dfb76c] uppercase tracking-wider mb-1">
                New Password (Min 8 chars) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#dfb76c]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl pl-9 pr-10 py-2 text-xs text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dfb76c]/60 hover:text-[#dfb76c]"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-outfit text-[#dfb76c] uppercase tracking-wider mb-1">
                Confirm New Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#dfb76c]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-[#200f07] border border-[#dfb76c]/40 rounded-xl pl-9 pr-10 py-2 text-xs text-[#f5efe6] focus:outline-none focus:border-[#dfb76c]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dfb76c]/60 hover:text-[#dfb76c]"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#dfb76c] via-[#f5e29f] to-[#b8860b] text-[#1c0e07] font-bold text-xs uppercase tracking-widest font-outfit hover:brightness-110 shadow-lg disabled:opacity-50 transition-all mt-2"
            >
              {loading ? 'Saving Password...' : 'Save New Password'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setViewMode('login')}
                className="text-xs text-[#dfb76c]/80 hover:text-[#dfb76c] underline font-outfit"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
