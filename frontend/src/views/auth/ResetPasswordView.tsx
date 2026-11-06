import React, { useState } from 'react';
import { Leaf, Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';

interface ResetPasswordViewProps {
  initialToken?: string;
  onNavigateToLogin: (notice?: string) => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  initialToken = '',
  onNavigateToLogin,
}) => {
  const { t } = useLanguage();
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Please provide the reset security token.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await api.resetPassword({ token: token.trim(), new_password: password });
      onNavigateToLogin('Password updated successfully! Please sign in with your new credentials.');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link or token may be expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white shadow-xl shadow-emerald-500/20 mb-3">
          <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          {t('auth.resetPasswordTitle')}
        </h2>
        <p className="mt-1 text-xs text-slate-300 font-medium">
          {t('auth.resetPasswordSubtitle')}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-white/20">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-2.5 text-xs text-rose-900 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Security Reset Token
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste the reset token from your email"
                className="block w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 font-mono transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('auth.passwordLabel')} (New)
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
                  placeholder="Minimum 8 characters"
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
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('auth.confirmPasswordLabel')}
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
                  placeholder="Re-enter new password"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 shadow-md shadow-emerald-900/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>{isLoading ? t('common.loading') : t('auth.saveNewPasswordButton')}</span>
            </button>
          </form>

          <div className="mt-5 text-center pt-3 border-t border-slate-100">
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
