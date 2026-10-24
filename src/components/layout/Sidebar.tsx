import React from 'react';
import {
  LayoutDashboard,
  Trees,
  Sprout,
  CheckSquare,
  Package,
  CloudSun,
  Coins,
  Store,
  FileText,
  Lightbulb,
  Code2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { UserRole } from '../../types';

export type NavItemKey =
  | 'dashboard'
  | 'farms'
  | 'crops'
  | 'tasks'
  | 'inventory'
  | 'weather'
  | 'finance'
  | 'marketplace'
  | 'recommendations'
  | 'audit'
  | 'laravel_docs';

interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  userRole: UserRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  userRole,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  // Least-privilege role navigation mapping
  const navItems = [
    {
      key: 'dashboard' as NavItemKey,
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['super_admin', 'farmer', 'farm_worker', 'agronomist', 'buyer', 'supplier', 'support_staff'],
    },
    {
      key: 'farms' as NavItemKey,
      label: 'Farms & Plots',
      icon: Trees,
      roles: ['super_admin', 'farmer', 'farm_worker', 'agronomist', 'support_staff'],
    },
    {
      key: 'crops' as NavItemKey,
      label: 'Crop Lifecycles',
      icon: Sprout,
      roles: ['super_admin', 'farmer', 'farm_worker', 'agronomist'],
    },
    {
      key: 'tasks' as NavItemKey,
      label: 'Field Tasks',
      icon: CheckSquare,
      roles: ['super_admin', 'farmer', 'farm_worker', 'agronomist'],
    },
    {
      key: 'inventory' as NavItemKey,
      label: 'Inventory & Stock',
      icon: Package,
      roles: ['super_admin', 'farmer', 'farm_worker', 'supplier'],
    },
    {
      key: 'weather' as NavItemKey,
      label: 'Weather Radar',
      icon: CloudSun,
      roles: ['super_admin', 'farmer', 'farm_worker', 'agronomist'],
    },
    {
      key: 'finance' as NavItemKey,
      label: 'Harvest & Finance',
      icon: Coins,
      roles: ['super_admin', 'farmer'],
    },
    {
      key: 'marketplace' as NavItemKey,
      label: 'Produce Market',
      icon: Store,
      roles: ['super_admin', 'farmer', 'buyer', 'supplier'],
    },
    {
      key: 'recommendations' as NavItemKey,
      label: 'Advisories',
      icon: Lightbulb,
      roles: ['super_admin', 'farmer', 'agronomist'],
    },
    {
      key: 'audit' as NavItemKey,
      label: 'Audit Trail',
      icon: FileText,
      roles: ['super_admin', 'farmer', 'support_staff'],
    },
    {
      key: 'laravel_docs' as NavItemKey,
      label: 'Laravel Architecture',
      icon: Code2,
      roles: ['super_admin', 'farmer', 'farm_worker', 'agronomist', 'buyer', 'supplier', 'support_staff'],
    },
  ];

  const allowedItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <aside
      className={`relative flex flex-col bg-[#0F2018] text-[#E8ECE9] border-r border-[#1B3629] transition-all duration-300 ease-in-out select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#1B3629]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-[#1B4332] text-[#52B788] flex items-center justify-center shrink-0 shadow-sm border border-[#2D6A4F]">
            <Sprout className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="block text-sm font-bold tracking-tight text-white whitespace-nowrap">
                AgroPulse
              </span>
              <span className="block text-[11px] text-[#74C69D] truncate">
                Operations Platform
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#1B3629] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {allowedItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectTab(item.key)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                isActive
                  ? 'bg-[#1B4332] text-white shadow-xs font-semibold'
                  : 'text-[#B7C4BD] hover:bg-[#152B21] hover:text-white'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-[#74C69D]' : 'text-[#8EA397]'
                }`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Role Indicator Footer */}
      <div className="p-3 border-t border-[#1B3629] bg-[#0B1A13]/60">
        <div className="flex items-center gap-2.5 text-xs text-[#95D5B2]">
          <ShieldCheck className="w-4 h-4 text-[#52B788] shrink-0" />
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Access Level
              </p>
              <p className="text-xs font-medium text-white capitalize truncate">
                {userRole.replace('_', ' ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
