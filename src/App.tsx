import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './components/common/Toast';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LandingPage } from './components/landing/LandingPage';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { FarmerDashboard } from './components/dashboard/FarmerDashboard';
import {
  WorkerDashboard,
  AgronomistDashboard,
  BuyerDashboard,
  SupplierDashboard,
  AdminDashboard
} from './components/dashboard/RoleDashboards';
import { FarmManagement } from './components/farms/FarmManagement';
import { CropLifecycleManagement } from './components/crops/CropLifecycleManagement';
import { TaskManagement } from './components/tasks/TaskManagement';
import { InventoryManagement } from './components/inventory/InventoryManagement';
import { WeatherIntelligence } from './components/weather/WeatherIntelligence';
import { HarvestFinance } from './components/finance/HarvestFinance';
import { MarketplaceView } from './components/marketplace/MarketplaceView';
import { RecommendationsView } from './components/recommendations/RecommendationsView';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { LaravelMigrationDoc } from './components/docs/LaravelMigrationDoc';
import { db } from './services/storage';
import { api } from './services/apiClient';
import { User, UserRole } from './types';

function AgroPulseApp() {
  const [inApp, setInApp] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [publicView, setPublicView] = useState<'landing' | 'login' | 'register'>('landing');
  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(db.getCurrentUser());
  const [publicSection, setPublicSection] = useState<'landing' | 'features' | 'marketplace' | 'about' | 'contact'>('landing');

  // Verify server authentication session on startup
  useEffect(() => {
    async function checkAuthSession() {
      const token = api.getToken();
      if (token) {
        try {
          const res = await api.auth.getMe();
          if (res.status === 200 && res.data) {
            setCurrentUser(res.data);
            db.setCurrentUser(res.data);
            setInApp(true);
          } else {
            api.setToken(null);
            setInApp(false);
          }
        } catch {
          api.setToken(null);
          setInApp(false);
        }
      }
      setIsInitializing(false);
    }

    checkAuthSession();

    // Register 401 unauthenticated listener
    api.onUnauthorized(() => {
      setInApp(false);
      setPublicView('login');
    });

    const unsubscribe = db.subscribe(() => {
      setCurrentUser(db.getCurrentUser());
    });
    return () => unsubscribe();
  }, []);

  const handleEnterApp = async (_role?: UserRole) => {
    // Never enter a dashboard based only on a client-selected role.
    if (!api.getToken()) {
      db.clearCurrentUser();
      setCurrentUser(db.getCurrentUser());
      setInApp(false);
      setPublicView('login');
      return;
    }

    try {
      // Verify the token and obtain the actual role from the server.
      const res = await api.auth.getMe();

      if (res.status === 200 && res.data?.id && res.data?.role) {
        setCurrentUser(res.data);
        db.setCurrentUser(res.data);
        setInApp(true);
        setCurrentTab('dashboard');
        return;
      }
    } catch {
      // Fail closed if the server cannot verify the session.
    }

    api.setToken(null);
    db.clearCurrentUser();
    setCurrentUser(db.getCurrentUser());
    setInApp(false);
    setPublicView('login');
  };

  const handleLogout = () => {
    api.setToken(null);
    setInApp(false);
    setPublicView('landing');
    setPublicSection('landing');
  };

  // Render role-specific dashboard
  const renderDashboardByRole = () => {
    switch (currentUser.role) {
      case 'farmer':
        return <FarmerDashboard onNavigate={setCurrentTab} />;
      case 'farm_worker':
        return <WorkerDashboard onNavigate={setCurrentTab} />;
      case 'agronomist':
        return <AgronomistDashboard onNavigate={setCurrentTab} />;
      case 'buyer':
        return <BuyerDashboard onNavigate={setCurrentTab} />;
      case 'supplier':
        return <SupplierDashboard onNavigate={setCurrentTab} />;
      case 'super_admin':
      case 'support_staff':
        return <AdminDashboard onNavigate={setCurrentTab} />;
      default:
        return <FarmerDashboard onNavigate={setCurrentTab} />;
    }
  };

  // Render active module tab
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return renderDashboardByRole();
      case 'farms':
        return <FarmManagement />;
      case 'crops':
        return <CropLifecycleManagement />;
      case 'tasks':
        return <TaskManagement />;
      case 'inventory':
        return <InventoryManagement />;
      case 'weather':
        return <WeatherIntelligence />;
      case 'finance':
        return <HarvestFinance />;
      case 'marketplace':
        return <MarketplaceView />;
      case 'recommendations':
        return <RecommendationsView onNavigate={setCurrentTab} />;
      case 'audit':
        return <AuditLogsView />;
      case 'laravel_docs':
        return <LaravelMigrationDoc />;
      default:
        return renderDashboardByRole();
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBFA]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Verifying security session...</p>
        </div>
      </div>
    );
  }

  // 1. Dedicated Split-Screen Authentication Views
  if (!inApp && publicView === 'login') {
    return (
      <LoginPage
        onSuccess={role => handleEnterApp(role)}
        onNavigateRegister={() => setPublicView('register')}
        onBackToHome={() => setPublicView('landing')}
      />
    );
  }

  if (!inApp && publicView === 'register') {
    return (
      <RegisterPage
        onSuccess={role => handleEnterApp(role)}
        onNavigateLogin={() => setPublicView('login')}
        onBackToHome={() => setPublicView('landing')}
      />
    );
  }

  // 2. Public Landing & Discovery View
  if (!inApp) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FBFBFA]">
        <Navbar
          activeSection={publicSection}
          onNavigate={sec => {
            setPublicSection(sec);
            if (sec === 'marketplace') {
              const el = document.getElementById('marketplace-preview');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            } else if (sec === 'features') {
              const el = document.getElementById('capabilities');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            } else if (sec === 'about') {
              const el = document.getElementById('about');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            } else if (sec === 'contact') {
              const el = document.getElementById('contact');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          onOpenAuth={mode => setPublicView(mode)}
        />

        <main className="flex-1">
          <LandingPage
            onViewMarketplace={() => {
              setPublicSection('marketplace');
              const el = document.getElementById('marketplace-preview');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            onNavigateLogin={() => setPublicView('login')}
            onNavigateRegister={() => setPublicView('register')}
            onOpenDemoAccess={() => setPublicView('login')}
          />
        </main>
      </div>
    );
  }

  // 3. Authenticated Enterprise Application Layout
  return (
    <div className="min-h-screen flex bg-[#F4F5F2]">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        userRole={currentUser.role}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          currentTab={currentTab}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{renderTabContent()}</div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AgroPulseApp />
    </ToastProvider>
  );
}
