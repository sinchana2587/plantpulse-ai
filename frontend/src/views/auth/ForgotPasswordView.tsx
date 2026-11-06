import React, { useState } from 'react';
import { Leaf, Mail, KeyRound, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { VoiceFieldControl } from '../../components/VoiceFieldControl';

interface ForgotPasswordViewProps {
  onNavigateToLogin: () => void;
  onNavigateToReset?: (token: string) => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({
  onNavigateToLogin,
}) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email) {
      setError(t('common.required'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setSuccess(res.message || 'Password reset link sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white shadow-xl shadow-emerald-500/20 mb-3">
          <KeyRound className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          {t('auth.forgotPasswordTitle')}
        </h2>
        <p className="mt-1 text-xs text-slate-300 font-medium">
          {t('auth.forgotPasswordSubtitle')}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-white/20">
          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 flex items-start gap-2.5 text-xs text-emerald-900 font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-2.5 text-xs text-rose-900 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  {t('auth.emailLabel')}
                </label>
                <VoiceFieldControl
                  fieldName="Email"
                  fieldExplanation="Speak your account email address."
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
                  className="block w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
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
                <KeyRound className="w-4 h-4" />
              )}
              <span>{isLoading ? t('common.loading') : t('auth.sendResetLinkButton')}</span>
            </button>
          </form>

          <div className="mt-5 text-center pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onNavigateToLogin}
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
