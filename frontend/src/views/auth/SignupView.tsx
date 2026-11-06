import React, { useState } from 'react';
import { Leaf, Mail, Lock, User, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, Language } from '../../context/LanguageContext';
import { VoiceFieldControl } from '../../components/VoiceFieldControl';

interface SignupViewProps {
  onNavigateToLogin: () => void;
  onSignupSuccess: (email: string) => void;
}

export const SignupView: React.FC<SignupViewProps> = ({
  onNavigateToLogin,
  onSignupSuccess,
}) => {
  const { signup } = useAuth();
  const { language, setLanguage, languages, t } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute password strength
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score: 1, label: t('auth.weak'), color: 'bg-rose-500' };
    if (score <= 3) return { score: 2, label: t('auth.medium'), color: 'bg-amber-500' };
    return { score: 3, label: t('auth.strong'), color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!termsAgreed) {
      setError(t('auth.termsNotice'));
      return;
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await signup({
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        full_name: fullName.trim() || undefined,
        preferred_language: language,
        terms_accepted: termsAgreed,
      });

      // Navigate to OTP verification screen with the user's email
      onSignupSuccess(email.trim());
    } catch (err: any) {
      console.error('Signup error:', err);
      const msg = (err && typeof err.message === 'string' && err.message !== '[object Object]')
        ? err.message
        : (typeof err === 'string' ? err : 'Failed to create account. Please check your credentials.');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      {/* Top Language Bar */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex justify-end px-4 mb-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white text-xs">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-transparent text-white text-xs font-semibold focus:outline-hidden cursor-pointer"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                {l.nativeLabel} ({l.label})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white shadow-xl shadow-emerald-500/20 mb-2">
          <Leaf className="w-7 h-7 stroke-[2.2]" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          {t('auth.signUpTitle')}
        </h2>
        <p className="mt-1 text-xs text-slate-300 font-medium">
          {t('auth.signUpSubtitle')}
        </p>
      </div>

      {/* Form Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-xl py-7 px-6 sm:px-8 shadow-2xl rounded-2xl border border-white/20">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-2.5 text-xs text-rose-900 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  {t('auth.fullNameLabel')}
                </label>
                <VoiceFieldControl
                  fieldName="Full Name"
                  fieldExplanation="State your full agricultural operator name."
                  onDictate={(text) => setFullName(text)}
                />
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('auth.fullNamePlaceholder')}
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  {t('auth.emailLabel')} *
                </label>
                <VoiceFieldControl
                  fieldName="Email Address"
                  fieldExplanation="Speak your email address."
                  onDictate={(text) => setEmail(text.replace(/\s+/g, '').toLowerCase())}
                />
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('auth.passwordLabel')} *
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="block w-full pl-9 pr-10 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('auth.confirmPasswordLabel')} *
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
                />
              </div>
            </div>

            {/* Terms and Privacy Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-[11px] text-slate-600 leading-tight">
                  {t('auth.termsNotice')}
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 shadow-md shadow-emerald-900/20 disabled:opacity-50 transition-all cursor-pointer mt-2"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>{isLoading ? t('common.loading') : t('auth.signUpButton')}</span>
            </button>
          </form>

          {/* Back to Login Link */}
          <div className="mt-5 text-center pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-600">
              {t('auth.alreadyHaveAccount')}{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="font-bold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 cursor-pointer"
              >
                {t('auth.signInButton')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
