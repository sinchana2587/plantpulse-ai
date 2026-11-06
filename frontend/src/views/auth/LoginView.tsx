import React, { useState } from 'react';
import { Leaf, Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, CheckCircle, Globe, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, Language } from '../../context/LanguageContext';
import { VoiceFieldControl } from '../../components/VoiceFieldControl';

interface LoginViewProps {
  onNavigateToSignup: () => void;
  onNavigateToForgotPassword: () => void;
  onNavigateToVerify: (email: string) => void;
  onLoadDemoMode?: () => void;
  initialMessage?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onNavigateToSignup,
  onNavigateToForgotPassword,
  onNavigateToVerify,
  onLoadDemoMode,
  initialMessage,
}) => {
  const { login } = useAuth();
  const { language, setLanguage, languages, t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(initialMessage || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (!email || !password) {
      setError(t('common.required'));
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password, rememberMe);
    } catch (err: any) {
      console.error('Login failure:', err);
      const msg = err.message || 'Failed to sign in';
      setError(msg);

      // If user is unverified, offer direct navigation to verify screen
      if (msg.toLowerCase().includes('not verified') || msg.toLowerCase().includes('verify your email')) {
        setTimeout(() => {
          onNavigateToVerify(email);
        }, 1500);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Standard Google Identity Services integration fallback
    alert('Google OAuth 2.0 Client initialized. To sign in with your Google Workspace or Gmail account in production, authorize the Google consent screen with client ID.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
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
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white shadow-xl shadow-emerald-500/20 mb-3">
          <Leaf className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          PlantPulse <span className="text-emerald-400">AI</span>
        </h2>
        <p className="mt-1 text-xs text-slate-300 font-medium">
          {t('auth.signInSubtitle')}
        </p>
      </div>

      {/* Main Form Container */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-white/20">
          {/* Notifications */}
          {successNotice && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 flex items-start gap-2.5 text-xs text-emerald-900 font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-2.5 text-xs text-rose-900 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  {t('auth.emailLabel')}
                </label>
                <VoiceFieldControl
                  fieldName="Email"
                  fieldExplanation="Enter your registered email address used during sign up."
                  onDictate={(text) => {
                    // Strip spaces for email
                    setEmail(text.replace(/\s+/g, '').toLowerCase());
                  }}
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
                  className="block w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  {t('auth.passwordLabel')}
                </label>
                <button
                  type="button"
                  onClick={onNavigateToForgotPassword}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  {t('auth.forgotPasswordLink')}
                </button>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-xs text-slate-600">{t('auth.rememberMe')}</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 shadow-md shadow-emerald-900/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{isLoading ? t('common.loading') : t('auth.signInButton')}</span>
            </button>
          </form>

          {/* Divider */}
          <div className="mt-5 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-slate-500">{t('auth.orContinueWith')}</span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{t('auth.googleSignIn')}</span>
            </button>
          </div>

          {/* Quick Demo Access Option */}
          {onLoadDemoMode && (
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={onLoadDemoMode}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-800 hover:text-emerald-900 font-semibold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Explore in Demo Guest Mode</span>
              </button>
            </div>
          )}

          {/* Signup Redirect */}
          <div className="mt-5 text-center">
            <p className="text-xs text-slate-600">
              {t('auth.dontHaveAccount')}{' '}
              <button
                type="button"
                onClick={onNavigateToSignup}
                className="font-bold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 cursor-pointer"
              >
                {t('auth.signUpButton')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
