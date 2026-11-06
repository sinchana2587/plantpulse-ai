import React, { useState, useEffect, useRef } from 'react';
import { Leaf, ShieldCheck, RefreshCw, ArrowLeft, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface VerifyEmailViewProps {
  email: string;
  onNavigateToLogin: (successNotice?: string) => void;
  onChangeEmail: () => void;
}

export const VerifyEmailView: React.FC<VerifyEmailViewProps> = ({
  email,
  onNavigateToLogin,
  onChangeEmail,
}) => {
  const { verifyEmail, resendOtp } = useAuth();
  const { t } = useLanguage();

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // 10-minute expiry countdown (600 seconds)
  const [secondsLeft, setSecondsLeft] = useState(600);
  // Resend cooldown (60 seconds)
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    // Timer for OTP expiration
    const expiryTimer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    // Timer for resend cooldown
    const cooldownTimer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(expiryTimer);
      clearInterval(cooldownTimer);
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleDigitChange = (index: number, val: string) => {
    // Only accept numeric characters
    const clean = val.replace(/[^0-9]/g, '');
    const newOtp = [...otp];

    if (clean.length > 1) {
      // Handle paste of multiple characters
      const pastedDigits = clean.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedDigits[i] || '';
      }
      setOtp(newOtp);
      const nextIdx = Math.min(pastedDigits.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    newOtp[index] = clean;
    setOtp(newOtp);

    // Auto-advance to next input
    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await verifyEmail(email, fullOtp);
      // Success constraint: DO NOT auto-login, redirect to Login with notice
      onNavigateToLogin(t('auth.verifySuccessNotice'));
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setError(null);
    try {
      await resendOtp(email);
      setInfoMessage('A new 6-digit code has been delivered to your email inbox.');
      setResendCooldown(60);
      setSecondsLeft(600);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white shadow-xl shadow-emerald-500/20 mb-3">
          <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          {t('auth.verifyTitle')}
        </h2>
        <p className="mt-1.5 text-xs text-slate-300">
          {t('auth.verifySubtitle')}{' '}
          <span className="font-bold text-emerald-400">{email}</span>
        </p>
        <button
          type="button"
          onClick={onChangeEmail}
          className="mt-1 text-[11px] text-slate-400 hover:text-emerald-300 underline underline-offset-2"
        >
          Change email address
        </button>
      </div>

      {/* Main Form Box */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-white/20">
          {infoMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 flex items-start gap-2.5 text-xs text-emerald-900 font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-2.5 text-xs text-rose-900 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            {/* 6-Digit OTP Input Grid */}
            <div className="flex items-center justify-between gap-2 sm:gap-2.5">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-12 h-14 text-center text-xl font-black bg-slate-50 border-2 border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition-all"
                />
              ))}
            </div>

            {/* Expiration Timer & Notice */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Code expires in:</span>
                <span className={`font-mono font-bold ${secondsLeft < 60 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {formatTime(secondsLeft)}
                </span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isLoading}
                  className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 disabled:opacity-50 disabled:hover:text-emerald-700 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {resendCooldown > 0
                    ? t('auth.resendOtpCooldown', { seconds: resendCooldown })
                    : t('auth.resendOtpButton')}
                </button>
              </div>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={isLoading || otp.join('').length < 6}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 shadow-md shadow-emerald-900/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>{isLoading ? t('common.loading') : t('auth.verifyOtpButton')}</span>
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigateToLogin()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('auth.backToSignIn')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
