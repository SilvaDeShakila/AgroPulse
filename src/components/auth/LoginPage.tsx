import React, { useState } from 'react';
import {
  Sprout,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { db } from '../../services/storage';
import { api } from '../../services/apiClient';
import { useToast } from '../common/Toast';
import { UserRole } from '../../types';

interface LoginPageProps {
  onSuccess: (role?: UserRole) => void;
  onNavigateRegister: () => void;
  onBackToHome: () => void;
}

export function LoginPage({
  onSuccess,
  onNavigateRegister,
  onBackToHome,
}: LoginPageProps) {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your work email address.');
      return;
    }
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    setIsLoading(true);

    try {
      // Real backend authentication
      const res = await api.auth.login({ email: trimmedEmail, password });

      setIsLoading(false);

      if (res.status === 200 && res.data) {
        api.setToken(res.data.token);
        db.setCurrentUser(res.data.user);
        showToast('success', 'Authentication Successful', `Welcome back, ${res.data.user.name}.`);
        onSuccess(res.data.user.role);
      } else {
        setErrorMessage(
          res.error || 'Invalid credentials. Please verify your email and password.'
        );
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Connection to authentication service failed.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      showToast('error', 'Validation Error', 'Please enter a valid recovery email.');
      return;
    }

    try {
      await api.auth.forgotPassword(forgotEmail);
      setForgotSuccess(true);
      showToast('info', 'Recovery Dispatched', 'Password reset instructions have been dispatched.');
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setForgotSuccess(false);
        setForgotEmail('');
      }, 1800);
    } catch {
      showToast('error', 'Error', 'Failed to dispatch password recovery.');
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white text-[#1A2E22]">
      {/* LEFT SECTION: Photographic Brand Identity & Architectural Proof */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 relative flex-col justify-between p-12 overflow-hidden bg-[#0A1610] text-white">
        {/* Background Image with Cinematic Scrim */}
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/hero_agropulse_farm_1792164656749.jpg"
            alt="Sri Lankan Agricultural Farmland and Estate Canopy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-60 scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1610] via-[#0A1610]/50 to-[#0A1610]/75" />
        </div>

        {/* Top Wordmark & Home Link */}
        <div className="relative z-10 flex items-center justify-between">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-2.5 text-white hover:opacity-90 transition-opacity"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1B4332] text-[#52B788] flex items-center justify-center border border-[#2D6A4F] shadow-sm">
              <Sprout className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-lg font-bold tracking-tight block leading-none font-display">
                AgroPulse
              </span>
              <span className="text-[11px] text-[#95D5B2] tracking-wider uppercase font-semibold">
                Operations Platform
              </span>
            </div>
          </button>

          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-black/30 backdrop-blur-xs border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Website</span>
          </button>
        </div>

        {/* Center Editorial Quote & Impact Message */}
        <div className="relative z-10 max-w-xl my-auto py-12 space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#D8F3DC] bg-[#1B4332]/80 backdrop-blur-xs px-3 py-1 rounded-md border border-[#2D6A4F]">
            <span>Enterprise Farm Infrastructure</span>
            <span aria-hidden="true">·</span>
            <span>Sri Lanka Regional Agrometeorology</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight font-display">
            Precision operations and agricultural traceability from soil bed to wholesale market.
          </h2>

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded-full bg-[#1B4332] text-[#52B788] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                <strong className="text-white">Strict Transactional Integrity:</strong> Every input issue is checked against real inventory balances with guaranteed non-negative constraints.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded-full bg-[#1B4332] text-[#52B788] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                <strong className="text-white">Least-Privilege Authorization:</strong> Multi-role data isolation protecting commercial harvests, worker tasks, and buyer orders.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Credit */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between border-t border-white/10 pt-4">
          <span>Highland Green Ceylon Estate — Nuwara Eliya Sector</span>
          <span className="font-mono tabular-nums">28.5 Acres · TRI 2025 Clonal</span>
        </div>
      </div>

      {/* RIGHT SECTION: Clean, Accessible Split-Screen Login Form */}
      <div className="col-span-1 lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-6 sm:p-12 lg:p-16 xl:p-20 bg-[#FBFBFA]">
        {/* Mobile Header */}
        <div className="flex lg:hidden items-center justify-between pb-8">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-2 text-[#1B4332]"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1B4332] text-[#52B788] flex items-center justify-center">
              <Sprout className="w-4 h-4" />
            </div>
            <span className="text-base font-bold font-display">AgroPulse</span>
          </button>
          <button
            onClick={onBackToHome}
            className="text-xs text-slate-500 hover:text-slate-900"
          >
            Home
          </button>
        </div>

        <div className="max-w-md w-full mx-auto my-auto space-y-8">
          {/* Form Header */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F2018] font-display">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Enter your estate credentials to access your agricultural operations dashboard.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-start gap-2.5 animate-in fade-in duration-150"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Sign In Failed</p>
                <p className="text-rose-800 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Work Email Address
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="name@highlandfarms.lk"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-all shadow-2xs"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs font-medium text-[#2D6A4F] hover:text-[#1B4332] hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-all shadow-2xs"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-700 transition-colors rounded"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#1B4332] border-slate-300 rounded focus:ring-[#1B4332]"
                />
                <span className="text-xs text-slate-600">Keep me signed in on this workstation</span>
              </label>
            </div>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 text-xs sm:text-sm font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] active:bg-[#0B1A13] disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Authenticating credentials...</span>
              ) : (
                <>
                  <span>Sign In to AgroPulse</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Redirect Link */}
          <div className="text-center text-xs text-slate-600 pt-1">
            <span>Don't have an estate account yet? </span>
            <button
              onClick={onNavigateRegister}
              className="text-[#1B4332] font-semibold hover:underline"
            >
              Register farm operations
            </button>
          </div>
        </div>

        {/* Form Footer */}
        <div className="pt-8 text-center text-xs text-slate-400">
          <span>&copy; {new Date().getFullYear()} AgroPulse Ltd. Professional Agricultural SaaS.</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Password Recovery
              </h3>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {forgotSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900">Recovery Email Dispatched</h4>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  A cryptographic reset link has been dispatched to <strong>{forgotEmail}</strong>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="mt-4 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your registered work email address to receive password reset instructions.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Email Address
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="name@highlandfarms.lk"
                    required
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1B4332]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg"
                  >
                    Send Recovery Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
