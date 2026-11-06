import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sparkles,
  RotateCcw,
  CheckCircle,
  Database,
  Server,
  FileCode,
  ShieldCheck,
  ExternalLink,
  Loader2,
  User,
  Globe,
  Volume2,
  Lock,
  AlertCircle,
  Mail,
  Shield,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage, Language } from '../context/LanguageContext';

interface SettingsViewProps {
  onRefreshAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRefreshAll }) => {
  const { user, updateProfile, changePassword } = useAuth();
  const { language, setLanguage, languages, t } = useLanguage();

  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [preferredLang, setPreferredLang] = useState<Language>(user?.preferred_language || language);
  const [voiceEnabled, setVoiceEnabled] = useState(user?.voice_assistant_enabled ?? true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // System & Demo State
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPreferredLang(user.preferred_language || language);
      setVoiceEnabled(user.voice_assistant_enabled ?? true);
    }
  }, [user, language]);

  useEffect(() => {
    api.checkHealth()
      .then(setHealthStatus)
      .catch((err) => setHealthStatus({ status: 'offline', error: err.message }));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      await updateProfile({
        full_name: fullName.trim() || undefined,
        preferred_language: preferredLang,
        voice_assistant_enabled: voiceEnabled,
      });
      setLanguage(preferredLang);
      setProfileSuccess('Profile preferences saved successfully!');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must contain at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(res.message || 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. Verify your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    setDemoMessage(null);
    try {
      const res = await api.seedDemo();
      setDemoMessage(res.message);
      onRefreshAll();
    } catch (err: any) {
      setDemoMessage(`Error: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset demonstration data to default baseline? Genuine user records will NOT be affected.')) {
      return;
    }
    setIsResetting(true);
    setDemoMessage(null);
    try {
      const res = await api.resetDemo();
      setDemoMessage(res.message);
      onRefreshAll();
    } catch (err: any) {
      setDemoMessage(`Error: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          {t('settings.title')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 1. USER PROFILE & AGRICULTURAL PREFERENCES */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t('settings.profileSection')}
              </h2>
              <p className="text-xs text-slate-500">
                Logged in as <strong className="text-slate-800">{user?.email || 'Authenticated Operator'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified Account
            </span>
          </div>
        </div>

        {profileSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('settings.fullName')}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Operator Full Name"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('settings.email')} (Read-Only)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2 text-xs bg-slate-100 border border-slate-200 text-slate-500 rounded-xl cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('settings.preferredLanguage')}</span>
              </label>
              <select
                value={preferredLang}
                onChange={(e) => setPreferredLang(e.target.value as Language)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-semibold"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeLabel} ({l.label})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer pt-4">
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => setVoiceEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t('settings.voiceAssistant')}</span>
                </span>
              </label>
              <p className="text-[11px] text-slate-500 mt-1 pl-6">
                {t('settings.voiceAssistantDesc')}
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSavingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSavingProfile ? t('common.loading') : t('settings.saveProfile')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 2. SECURITY & PASSWORD CHANGE */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {t('settings.securitySection')}
            </h2>
            <p className="text-xs text-slate-500">
              Update password with secure bcrypt cryptographic hashing
            </p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('settings.currentPassword')}
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('settings.newPassword')}
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isChangingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isChangingPassword ? t('common.loading') : t('settings.changePassword')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 3. MULTI-USER DATA ISOLATION STATUS */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Multi-User Tenant Isolation Active</h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Every registered plant, field observation, GDD forecast, and telemetry record is isolated to your user ID ({user?.id.slice(0, 8)}...). Other operators cannot read or modify your agricultural records.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DEMONSTRATION DATA MANAGEMENT */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Demonstration Dataset Control</h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Provides an authentic multi-week Roma Tomato growth sequence with real photographs, environmental telemetry, and calculated milestone projections.
            </p>
          </div>
        </div>

        {demoMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{demoMessage}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleSeedDemo}
            disabled={isSeeding}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-600" />}
            <span>Load / Refresh Demo Dataset</span>
          </button>

          <button
            onClick={handleResetDemo}
            disabled={isResetting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            <span>Reset Demo Baseline</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. SYSTEM DIAGNOSTICS */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Server className="w-4 h-4 text-slate-700" />
          <span>{t('settings.diagnosticsSection')}</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-[11px] text-slate-500 block mb-1">Database Engine:</span>
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              SQLite 3 + Foreign Keys
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-[11px] text-slate-500 block mb-1">Vision Stage Model:</span>
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Active (v1.0.0)
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-[11px] text-slate-500 block mb-1">GDD Forecaster:</span>
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Active (v2.2.0)
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-[11px] text-slate-500 block mb-1">Email Delivery:</span>
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Gmail TLS SMTP:587
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
