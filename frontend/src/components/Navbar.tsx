import React from 'react';
import {
  Leaf,
  LayoutDashboard,
  Sprout,
  TrendingUp,
  Settings,
  Plus,
  Sparkles,
  Activity,
  Database,
  Bot,
  LogOut,
  User,
  Globe,
  HeartPulse,
} from 'lucide-react';
import { useLanguage, Language } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export type NavTab = 'dashboard' | 'plants' | 'analysis' | 'treatment' | 'datasets' | 'chatbot' | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAddPlant: () => void;
  onSeedDemo: () => void;
  isModelReady: boolean;
  totalPlants: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddPlant,
  onSeedDemo,
  isModelReady,
  totalPlants,
}) => {
  const { language, setLanguage, languages, t } = useLanguage();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div
            className="flex items-center gap-3 cursor-pointer shrink-0"
            onClick={() => onSelectTab('dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-800 to-green-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/10">
              <Leaf className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">PlantPulse</span>
                <span className="px-1.5 py-0.5 text-[10px] font-black tracking-wider uppercase rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Phenology & Growth Forecaster</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-50 text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{t('nav.dashboard')}</span>
            </button>

            <button
              onClick={() => onSelectTab('plants')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'plants'
                  ? 'bg-emerald-50 text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sprout className="w-3.5 h-3.5" />
              <span>{t('nav.plants')}</span>
              {totalPlants > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                  {totalPlants}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('analysis')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'analysis'
                  ? 'bg-emerald-50 text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t('nav.predictions')}</span>
            </button>

            <button
              onClick={() => onSelectTab('treatment')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'treatment'
                  ? 'bg-emerald-50 text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5 text-emerald-700" />
              <span>Treatment & Recovery</span>
            </button>

            <button
              onClick={() => onSelectTab('datasets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'datasets'
                  ? 'bg-emerald-50 text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{t('nav.datasets')}</span>
            </button>

            <button
              onClick={() => onSelectTab('chatbot')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'chatbot'
                  ? 'bg-emerald-50 text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('nav.assistant')}</span>
            </button>

            <button
              onClick={() => onSelectTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'settings'
                  ? 'bg-emerald-50 text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{t('nav.settings')}</span>
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Language Selector Dropdown */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
              <Globe className="w-3.5 h-3.5 text-emerald-700" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-transparent text-xs font-bold focus:outline-hidden cursor-pointer"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeLabel}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Status Indicator */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isModelReady
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={isModelReady ? 'Growth stage vision model active' : 'Model initializing'}
            >
              <span className={`w-2 h-2 rounded-full ${isModelReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{isModelReady ? 'AI Vision Ready' : 'Model Standby'}</span>
            </div>

            {/* Load Demo Button */}
            <button
              onClick={onSeedDemo}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Load demo crop data"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('nav.loadDemo')}</span>
            </button>

            {/* Register Plant Button */}
            <button
              onClick={onOpenAddPlant}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-sm shadow-emerald-900/15"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden xs:inline">{t('nav.registerPlant')}</span>
            </button>

            {/* User Avatar / Logout */}
            {user && (
              <div className="flex items-center gap-1 pl-1">
                <button
                  onClick={() => onSelectTab('settings')}
                  title={`Signed in as ${user.email}`}
                  className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold hover:ring-2 hover:ring-emerald-500 transition-all cursor-pointer"
                >
                  {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
                </button>
                <button
                  onClick={logout}
                  title={t('nav.logout')}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Sub-bar */}
        <div className="xl:hidden flex items-center justify-around py-2 border-t border-slate-100 overflow-x-auto text-[11px] font-bold">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-2 py-1 rounded ${activeTab === 'dashboard' ? 'text-emerald-800 bg-emerald-50' : 'text-slate-600'}`}
          >
            {t('nav.dashboard')}
          </button>
          <button
            onClick={() => onSelectTab('plants')}
            className={`px-2 py-1 rounded ${activeTab === 'plants' ? 'text-emerald-800 bg-emerald-50' : 'text-slate-600'}`}
          >
            {t('nav.plants')}
          </button>
          <button
            onClick={() => onSelectTab('analysis')}
            className={`px-2 py-1 rounded ${activeTab === 'analysis' ? 'text-emerald-800 bg-emerald-50' : 'text-slate-600'}`}
          >
            {t('nav.predictions')}
          </button>
          <button
            onClick={() => onSelectTab('datasets')}
            className={`px-2 py-1 rounded ${activeTab === 'datasets' ? 'text-emerald-800 bg-emerald-50' : 'text-slate-600'}`}
          >
            {t('nav.datasets')}
          </button>
          <button
            onClick={() => onSelectTab('chatbot')}
            className={`px-2 py-1 rounded ${activeTab === 'chatbot' ? 'text-emerald-800 bg-emerald-50' : 'text-slate-600'}`}
          >
            {t('nav.assistant')}
          </button>
          <button
            onClick={() => onSelectTab('settings')}
            className={`px-2 py-1 rounded ${activeTab === 'settings' ? 'text-emerald-800 bg-emerald-50' : 'text-slate-600'}`}
          >
            {t('nav.settings')}
          </button>
        </div>
      </div>
    </header>
  );
};
