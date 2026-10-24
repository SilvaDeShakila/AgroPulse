import React, { useState, useEffect } from 'react';
import {
  Bell,
  LogOut,
  UserCheck,
  AlertTriangle,
  Package,
  CheckCircle2,
  Database,
  ExternalLink
} from 'lucide-react';
import { User } from '../../types';
import { NavItemKey } from './Sidebar';
import { db } from '../../services/storage';
import { api } from '../../services/apiClient';

interface HeaderProps {
  currentTab: NavItemKey;
  currentUser: User;
  onLogout: () => void;
}

export function Header({
  currentTab,
  currentUser,
  onLogout,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>(null);

  useEffect(() => {
    api.system.getDbStatus().then(res => {
      if (res.data) setDbStatus(res.data);
    });
  }, []);

  const recommendations = db.getRecommendations();
  const highPriorityRecs = recommendations.filter(r => r.priority === 'high');

  const tabLabels: Record<NavItemKey, string> = {
    dashboard: 'Operational Dashboard',
    farms: 'Farm & Plot Infrastructure',
    crops: 'Crop Lifecycle Tracking',
    tasks: 'Field Dispatch & Task Management',
    inventory: 'Transactional Inventory & Inputs',
    weather: 'Microclimate & Weather Intelligence',
    finance: 'Harvest Ledger & Financial Analytics',
    marketplace: 'Produce Marketplace & Orders',
    recommendations: 'Agronomic Rules & Advisories',
    audit: 'System Audit Trail & Compliance',
    laravel_docs: 'Laravel Architecture & Migration Blueprint',
  };

  const roleColors: Record<string, { bg: string; text: string; border: string }> = {
    super_admin: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
    farmer: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
    farm_worker: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    agronomist: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
    buyer: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
    supplier: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
    support_staff: { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200' },
  };

  const badgeStyle = roleColors[currentUser.role] || roleColors.farmer;

  return (
    <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
        <span className="font-medium text-slate-400">AgroPulse</span>
        <span>/</span>
        <span className="font-semibold text-slate-900 truncate">
          {tabLabels[currentTab] || currentTab}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Database Status Indicator */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg"
          title={`Database Engine: ${dbStatus?.driver || 'Persistent Disk Engine'} (${dbStatus?.recordCounts?.farms || 0} farms, ${dbStatus?.recordCounts?.inventory || 0} SKUs)`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span className="capitalize">{dbStatus?.driver === 'postgresql' ? 'PostgreSQL' : 'Persistent DB'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>

        {/* Real User Profile Badge (Server Authorized) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <UserCheck className="w-4 h-4 text-[#2D6A4F]" />
          <div className="text-left hidden sm:block">
            <span className="font-bold text-slate-900 block leading-tight">{currentUser.name}</span>
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
              {currentUser.role.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {highPriorityRecs.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Operational Alerts
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  {highPriorityRecs.length} Active
                </span>
              </div>

              <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
                {highPriorityRecs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    All operations normal. No urgent alerts.
                  </p>
                ) : (
                  highPriorityRecs.map(rec => (
                    <div
                      key={rec.id}
                      className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-1"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{rec.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-snug">
                        {rec.description || rec.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
          title="Sign out of AgroPulse"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
