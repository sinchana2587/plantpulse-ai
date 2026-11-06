import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './views/DashboardView';
import { PlantsView } from './views/PlantsView';
import { PlantDetailView } from './views/PlantDetailView';
import { AnalyticsView } from './views/AnalyticsView';
import { DatasetsView } from './views/DatasetsView';
import { TreatmentRecoveryView } from './views/TreatmentRecoveryView';
import { ChatbotView } from './views/ChatbotView';
import { SettingsView } from './views/SettingsView';
import { AddPlantModal } from './views/AddPlantModal';
import { LoginView } from './views/auth/LoginView';
import { SignupView } from './views/auth/SignupView';
import { VerifyEmailView } from './views/auth/VerifyEmailView';
import { ForgotPasswordView } from './views/auth/ForgotPasswordView';
import { ResetPasswordView } from './views/auth/ResetPasswordView';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './api/client';
import { Plant, DashboardData } from './types';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

type AuthScreen = 'login' | 'signup' | 'verify' | 'forgot' | 'reset';

function MainApp() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { t } = useLanguage();

  // Navigation & Plant Selection State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);

  // Auth Navigation State (when not authenticated)
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [targetEmail, setTargetEmail] = useState<string>('');
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string>('');
  const [isGuestDemo, setIsGuestDemo] = useState(false);

  // Data State
  const [plants, setPlants] = useState<Plant[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Notifications
  const [isAddPlantOpen, setIsAddPlantOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [plantsRes, dashRes, modelRes] = await Promise.all([
        api.getPlants(),
        api.getDashboard(),
        api.getModelStatus().catch(() => null),
      ]);
      setPlants(plantsRes);
      setDashboardData(dashRes);
      if (modelRes && modelRes.is_available) {
        setIsModelReady(true);
      }
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      showToast(err.message || 'Failed to connect to backend service', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Re-load data when authentication state changes
  useEffect(() => {
    if (isAuthenticated || isGuestDemo) {
      loadAll();
    }
  }, [isAuthenticated, isGuestDemo]);

  // Check URL query parameters for reset token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      setAuthScreen('reset');
    }
  }, []);

  const handleSelectPlant = (plantId: string) => {
    setSelectedPlantId(plantId);
  };

  const handleBackToPlants = () => {
    setSelectedPlantId(null);
  };

  const handlePlantCreated = (newPlant: Plant) => {
    showToast(`Plant "${newPlant.name}" registered successfully!`);
    loadAll();
    setSelectedPlantId(newPlant.id);
  };

  const handleDeletePlant = async (plantId: string) => {
    if (!window.confirm('Are you sure you want to delete this plant and all its historical observations?')) {
      return;
    }
    try {
      await api.deletePlant(plantId);
      showToast('Plant deleted successfully.');
      if (selectedPlantId === plantId) {
        setSelectedPlantId(null);
      }
      loadAll();
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleSeedDemoData = async () => {
    try {
      const res = await api.seedDemo();
      showToast('Demonstration dataset loaded successfully!');
      await loadAll();
      setSelectedPlantId(res.plant_id);
    } catch (err: any) {
      showToast(`Demo load error: ${err.message}`, 'error');
    }
  };

  // 1. Session Loading Screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-xs font-semibold text-slate-400">Verifying agricultural security session...</p>
      </div>
    );
  }

  // 2. Unauthenticated Flow (Login, Signup, OTP Verify, Forgot Password, Reset Password)
  if (!isAuthenticated && !isGuestDemo) {
    if (authScreen === 'signup') {
      return (
        <SignupView
          onNavigateToLogin={() => setAuthScreen('login')}
          onSignupSuccess={(email) => {
            setTargetEmail(email);
            setAuthScreen('verify');
          }}
        />
      );
    }

    if (authScreen === 'verify') {
      return (
        <VerifyEmailView
          email={targetEmail}
          onNavigateToLogin={(notice) => {
            setAuthSuccessMessage(notice || 'Email verified successfully! Please sign in with your credentials.');
            setAuthScreen('login');
          }}
          onChangeEmail={() => setAuthScreen('signup')}
        />
      );
    }

    if (authScreen === 'forgot') {
      return (
        <ForgotPasswordView
          onNavigateToLogin={() => setAuthScreen('login')}
          onNavigateToReset={(token) => {
            setResetToken(token);
            setAuthScreen('reset');
          }}
        />
      );
    }

    if (authScreen === 'reset') {
      return (
        <ResetPasswordView
          initialToken={resetToken}
          onNavigateToLogin={(notice) => {
            setAuthSuccessMessage(notice || 'Password reset successful! Please sign in with your new password.');
            setAuthScreen('login');
          }}
        />
      );
    }

    // Default to Login
    return (
      <LoginView
        initialMessage={authSuccessMessage}
        onNavigateToSignup={() => {
          setAuthSuccessMessage(null);
          setAuthScreen('signup');
        }}
        onNavigateToForgotPassword={() => {
          setAuthSuccessMessage(null);
          setAuthScreen('forgot');
        }}
        onNavigateToVerify={(email) => {
          setTargetEmail(email);
          setAuthScreen('verify');
        }}
        onLoadDemoMode={() => {
          setIsGuestDemo(true);
        }}
      />
    );
  }

  // 3. Authenticated Application Flow
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSelectedPlantId(null);
        }}
        onOpenAddPlant={() => setIsAddPlantOpen(true)}
        onSeedDemo={handleSeedDemoData}
        isModelReady={isModelReady}
        totalPlants={plants.length}
      />

      {/* Floating Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold transition-all transform animate-bounce ${
            notification.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700'
              : 'bg-emerald-900 text-white border-emerald-700'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-300" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-300" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1 pb-16">
        {selectedPlantId ? (
          <PlantDetailView
            plantId={selectedPlantId}
            onBack={handleBackToPlants}
            onPlantUpdated={loadAll}
            onNavigateToTreatment={() => {
              setSelectedPlantId(null);
              setActiveTab('treatment');
            }}
          />
        ) : activeTab === 'dashboard' ? (
          <DashboardView
            data={dashboardData}
            isLoading={isLoading}
            onSelectPlant={handleSelectPlant}
            onOpenAddPlant={() => setIsAddPlantOpen(true)}
            onSeedDemo={handleSeedDemoData}
            onNavigateTab={setActiveTab}
          />
        ) : activeTab === 'plants' ? (
          <PlantsView
            plants={plants}
            onSelectPlant={handleSelectPlant}
            onOpenAddPlant={() => setIsAddPlantOpen(true)}
            onDeletePlant={handleDeletePlant}
            onSeedDemo={handleSeedDemoData}
          />
        ) : activeTab === 'analysis' ? (
          <AnalyticsView
            onOpenAddPlant={() => setIsAddPlantOpen(true)}
            onSeedDemo={handleSeedDemoData}
          />
        ) : activeTab === 'treatment' ? (
          <TreatmentRecoveryView
            onNavigateToPlant={handleSelectPlant}
            onNavigateToRegister={() => setIsAddPlantOpen(true)}
          />
        ) : activeTab === 'datasets' ? (
          <DatasetsView />
        ) : activeTab === 'chatbot' ? (
          <ChatbotView />
        ) : (
          <SettingsView onRefreshAll={loadAll} />
        )}
      </main>

      {/* Modal: Register New Plant */}
      <AddPlantModal
        isOpen={isAddPlantOpen}
        onClose={() => setIsAddPlantOpen(false)}
        onSuccess={handlePlantCreated}
      />
    </div>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
