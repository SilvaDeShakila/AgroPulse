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
  User as UserIcon,
  MapPin,
  ArrowLeft,
  AlertCircle,
  Check,
  X,
  Building
} from 'lucide-react';
import { db } from '../../services/storage';
import { api } from '../../services/apiClient';
import { useToast } from '../common/Toast';
import { UserRole } from '../../types';

interface RegisterPageProps {
  onSuccess: (role?: UserRole) => void;
  onNavigateLogin: () => void;
  onBackToHome: () => void;
}

export function RegisterPage({
  onSuccess,
  onNavigateLogin,
  onBackToHome,
}: RegisterPageProps) {
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState<UserRole>('farmer');
  const [district, setDistrict] = useState('Nuwara Eliya');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  // Password requirements calculation
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your full legal or operating name.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }
    if (role === 'super_admin' || role === 'support_staff') {
      setErrorMessage('Privileged administrative roles cannot be provisioned through public registration.');
      return;
    }
    if (!hasMinLength || !hasNumber || !hasUpper) {
      setErrorMessage('Password must satisfy all security requirements (8+ characters, number, uppercase).');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Password confirmation does not match.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('You must accept the Agricultural Data Terms and Privacy Policy to create a workspace.');
      return;
    }

    setIsLoading(true);

    try {
      // Real backend registration
      const res = await api.auth.register({
        name: trimmedName,
        email: trimmedEmail,
        password,
        confirmPassword,
        role,
        district,
        organization: organization.trim() || undefined,
      });

      setIsLoading(false);

      if (res.status === 201 && res.data) {
        api.setToken(res.data.token);
        db.setCurrentUser(res.data.user);
        showToast(
          'success',
          'Estate Workspace Created',
          `Welcome, ${trimmedName}! Registered as ${role.replace('_', ' ').toUpperCase()} in ${district}.`
        );
        onSuccess(role);
      } else {
        setErrorMessage(res.error || 'Registration failed. Please check your details.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Registration request failed.');
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-white text-[#1A2E22]">
      {/* LEFT SECTION: Photographic Brand Showcase (Desktop 6 or 7 cols) */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 relative flex-col justify-between p-12 overflow-hidden bg-[#0A1610] text-white">
        {/* Background Image with Scrim */}
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/crop_ceylon_tea_1792164656862.jpg"
            alt="Highland Ceylon Tea Estate Foliage"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-50 scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1610] via-[#0A1610]/55 to-[#0A1610]/80" />
        </div>

        {/* Top Wordmark & Back Button */}
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

        {/* Center Value Proposition */}
        <div className="relative z-10 max-w-lg my-auto py-10 space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#D8F3DC] bg-[#1B4332]/85 backdrop-blur-xs px-3 py-1 rounded-md border border-[#2D6A4F]">
            <span>Agronomic Workspace Onboarding</span>
            <span aria-hidden="true">·</span>
            <span>Zero Lock-in</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white leading-snug font-display">
            Start managing land plots, crop cycles, and inventory with enterprise traceability.
          </h2>

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded-full bg-[#1B4332] text-[#52B788] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                <strong className="text-white">Role-Tailored Portals:</strong> Specialized dashboards customized for farmers, workers, agronomists, produce buyers, and suppliers.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded-full bg-[#1B4332] text-[#52B788] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                <strong className="text-white">Regional Weather & Phenology:</strong> Real-time agro-meteorology advisories tuned for Sri Lanka's Maha and Yala seasons.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded-full bg-[#1B4332] text-[#52B788] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                <strong className="text-white">Direct Marketplace Trading:</strong> Publish certified harvest batches with instant order deduction and buyer escrow.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between border-t border-white/10 pt-4">
          <span>Enterprise Agricultural Registry</span>
          <span className="font-mono">GAP & ISO 22000 Aligned</span>
        </div>
      </div>

      {/* RIGHT SECTION: Registration Form */}
      <div className="col-span-1 lg:col-span-7 xl:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-[#FBFBFA] overflow-y-auto">
        {/* Mobile Header */}
        <div className="flex lg:hidden items-center justify-between pb-6">
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

        <div className="max-w-xl w-full mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F2018] font-display">
              Register farm operations
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Create an enterprise account to access plots, inventory, field staff dispatch, and produce trade.
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
                <p className="font-semibold">Registration Issue</p>
                <p className="text-rose-800 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name & Organization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Full Legal Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-name"
                    type="text"
                    value={fullName}
                    onChange={e => {
                      setFullName(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="e.g. Priyantha Jayasuriya"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-all shadow-2xs"
                  />
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-org"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Farm or Company Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-org"
                    type="text"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                    placeholder="Highland Tea Estate Pvt Ltd"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-all shadow-2xs"
                  />
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Work Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="name@highlandfarms.lk"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-all shadow-2xs"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Role & District Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="reg-role"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Operational Role <span className="text-rose-500">*</span>
                </label>
                <select
                  id="reg-role"
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent shadow-2xs"
                >
                  <option value="farmer">Farmer / Estate Manager</option>
                  <option value="farm_worker">Farm Worker / Field Operator</option>
                  <option value="agronomist">Agronomist / Crop Specialist</option>
                  <option value="buyer">Produce Buyer / Wholesale Merchant</option>
                  <option value="supplier">Agricultural Inputs Supplier</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Super Admin & Support roles require internal provisioning.</span>
                </p>
              </div>

              <div>
                <label
                  htmlFor="reg-district"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Agricultural District <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="reg-district"
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent shadow-2xs"
                  >
                    <option value="Nuwara Eliya">Nuwara Eliya (Upcountry Tea & Veg)</option>
                    <option value="Badulla">Badulla (Uva Tea & Vegetables)</option>
                    <option value="Kandy">Kandy (Mid-country Spices & Tea)</option>
                    <option value="Matale">Matale (Spices, Cocoa & Paddy)</option>
                    <option value="Anuradhapura">Anuradhapura (Dry Zone Paddy & Grain)</option>
                    <option value="Polonnaruwa">Polonnaruwa (Major Irrigation Paddy)</option>
                    <option value="Kurunegala">Kurunegala (Coconut & Mixed Crops)</option>
                    <option value="Hambantota">Hambantota (Semi-arid Fruits & Paddy)</option>
                    <option value="Colombo">Colombo (Export Hub & Logistics)</option>
                    <option value="Galle">Galle (Cinnamon & Low-country Tea)</option>
                    <option value="Jaffna">Jaffna (Red Onion & Horticulture)</option>
                  </select>
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-all shadow-2xs"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 p-1 text-slate-400 hover:text-slate-700 rounded"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-confirm-password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => {
                      setConfirmPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent transition-all shadow-2xs"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-2 p-1 text-slate-400 hover:text-slate-700 rounded"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Requirements Checklist */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-700 block">
                Security Requirements:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                  {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                  {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                  <span>At least 1 number</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                  {hasUpper ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                  <span>1 uppercase letter</span>
                </div>
              </div>
              {confirmPassword && (
                <div className={`pt-1 text-[11px] flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-700 font-medium' : 'text-rose-600 font-medium'}`}>
                  {passwordsMatch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                  <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                </div>
              )}
            </div>

            {/* Terms and Privacy Consent */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#1B4332] border-slate-300 rounded focus:ring-[#1B4332]"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => setIsTermsModalOpen(true)}
                    className="text-[#1B4332] font-semibold underline underline-offset-2 hover:text-[#0F2018]"
                  >
                    Agricultural Operations Terms of Service
                  </button>{' '}
                  and privacy policy governing Sri Lankan agricultural data protection.
                </span>
              </label>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 text-xs sm:text-sm font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] active:bg-[#0B1A13] disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Provisioning workspace...</span>
              ) : (
                <>
                  <span>Create Account & Launch Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Link back to login */}
          <div className="text-center text-xs text-slate-600 pt-1">
            <span>Already have an estate account? </span>
            <button
              onClick={onNavigateLogin}
              className="text-[#1B4332] font-semibold hover:underline"
            >
              Sign in to AgroPulse
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 text-center text-xs text-slate-400">
          <span>&copy; {new Date().getFullYear()} AgroPulse Ltd. Enterprise Agricultural Operations SaaS.</span>
        </div>
      </div>

      {/* Terms & Privacy Modal */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Agricultural Operations & Data Policy
              </h3>
              <button
                onClick={() => setIsTermsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600 max-h-80 overflow-y-auto pr-1 leading-relaxed">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Enterprise Agronomic Data Protection — Sri Lanka Jurisdiction</span>
              </div>
              <p>
                <strong>1. Farm Data Ownership:</strong> All GPS plot boundaries, soil test parameters, yield telemetry, harvest grades, and cost records remain the exclusive property of the estate operator. AgroPulse guarantees zero unconsented third-party monetization.
              </p>
              <p>
                <strong>2. Transactional Stock Ledger:</strong> All agricultural chemical, fertilizer, seed, and equipment dispatches are recorded to an immutable audit trail with non-negative physical stock integrity.
              </p>
              <p>
                <strong>3. Produce Marketplace Terms:</strong> Produce listings published to the wholesale exchange represent legally binding delivery commitments at the stated quality grade (Ceylon GAP Grade A/B) and quoted unit price.
              </p>
              <p>
                <strong>4. Security & Access:</strong> Access is controlled by server-side role-based policies and verified cryptographic session tokens.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setAgreeTerms(true);
                  setIsTermsModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg shadow-xs"
              >
                I Agree to Terms
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
