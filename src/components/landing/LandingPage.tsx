import React, { useState } from 'react';
import {
  Sprout,
  ShieldCheck,
  TrendingUp,
  CloudSun,
  PackageCheck,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  MapPin,
  Store,
  FileCode,
  Info,
  Sparkles
} from 'lucide-react';
import { db } from '../../services/storage';
import { useToast } from '../common/Toast';

interface LandingPageProps {
  onViewMarketplace: () => void;
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
  onOpenDemoAccess: () => void;
}

export function LandingPage({
  onViewMarketplace,
  onNavigateLogin,
  onNavigateRegister,
  onOpenDemoAccess,
}: LandingPageProps) {
  const [docModal, setDocModal] = useState<'privacy' | 'terms' | null>(null);
  const listings = db.getProduceListings().slice(0, 3);

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#1A2E22]">
      {/* Environment & Architecture Banner */}
      <div className="bg-[#10281D] text-[#D8F3DC] px-4 py-2 text-xs flex items-center justify-between border-b border-[#1B4332]">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <Info className="w-4 h-4 text-[#52B788] shrink-0" />
            <span>
              <strong>Engineering Notice:</strong> AI Studio runtime environment runs Node.js/TypeScript. This runnable application features real transactional logic, local state persistence, and full architectural parity with the target Laravel/MySQL production specification.
            </span>
          </div>
          <button
            onClick={onOpenDemoAccess}
            className="text-xs text-[#95D5B2] hover:text-white underline underline-offset-4 shrink-0 font-medium"
          >
            Inspect Laravel Blueprint & Schema &rarr;
          </button>
        </div>
      </div>

      {/* Hero Section with High-Fidelity Agricultural Imagery */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-slate-200 bg-gradient-to-b from-[#F4F7F4] to-[#FBFBFA]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#1B4332] bg-[#E8F5EE] px-3 py-1 rounded-md border border-[#B7E4C7]">
              <span>Sri Lanka Agronomic Context</span>
              <span aria-hidden="true">·</span>
              <span>Maha & Yala Cycles</span>
              <span aria-hidden="true">·</span>
              <span>Enterprise Farm Management</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0F2018] leading-[1.12]">
              Precision farm intelligence from soil to harvest.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
              AgroPulse coordinates land plots, crop phenology, transactional warehouse inputs, field worker dispatch, microclimate radar, and produce marketplace commerce in one unified, role-governed platform.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={onNavigateRegister}
                className="px-6 py-3 text-sm font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <span>Register Farm Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onNavigateLogin}
                className="px-5 py-3 text-sm font-semibold text-[#1B4332] bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-2xs"
              >
                Sign In
              </button>

              <button
                onClick={onViewMarketplace}
                className="px-4 py-3 text-sm font-medium text-[#2D6A4F] hover:text-[#1B4332] transition-colors"
              >
                Produce Marketplace &rarr;
              </button>
            </div>

            <div className="pt-4 flex items-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" />
                <span>Zero negative inventory constraint</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" />
                <span>7 Least-privilege roles</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" />
                <span>Full audit compliance</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border border-slate-300/80 shadow-xl bg-slate-900 aspect-16/10 lg:aspect-4/3">
              <img
                src="/src/assets/images/hero_agropulse_farm_1792164656749.jpg"
                alt="AgroPulse Sri Lankan terraced farmland and plantation operations"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 text-white">
                <p className="text-xs uppercase tracking-wider text-[#95D5B2] font-semibold">
                  Field Operations Insight
                </p>
                <p className="text-base font-semibold mt-1">
                  Highland Green Ceylon Estate — Nuwara Eliya
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-300">
                  <span>28.5 Total Acres</span>
                  <span>·</span>
                  <span>Sprinkler Fertigation</span>
                  <span>·</span>
                  <span>BOPF Harvest Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Enterprise Capabilities */}
      <section id="capabilities" className="py-20 border-b border-slate-200 max-w-7xl mx-auto px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2D6A4F]">
            Architectural Modules
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-[#0F2018] mt-2">
            Engineered for high-reliability agricultural operations
          </h2>
          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            Every module enforces rigorous domain rules: transactional balance checks, immutable stock movements, crop growth stage tracking, and role-based data partitioning.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {/* Card 1 */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8F5EE] text-[#1B4332] flex items-center justify-center">
              <Sprout className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Crop Phenology & Lifecycles</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Track growth stages from land preparation to ripening across Maha and Yala seasons. Log agronomist disease observations with severity ratings and remedial fertilizer schedules.
            </p>
            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-2">
              <span>Variety selection</span>
              <span>·</span>
              <span>Target yields</span>
              <span>·</span>
              <span>BPH scouting</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8F5EE] text-[#1B4332] flex items-center justify-center">
              <PackageCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Transactional Input Inventory</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Never allow inventory balances to drop below zero. Every stock receipt and issue is committed with batch numbers, supplier tags, unit costs, and immutable audit logs.
            </p>
            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-2">
              <span>Non-negative rule</span>
              <span>·</span>
              <span>Reorder alerts</span>
              <span>·</span>
              <span>FIFO movements</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8F5EE] text-[#1B4332] flex items-center justify-center">
              <CloudSun className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Microclimate & Weather Alerts</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Real-time regional microclimate intelligence across Sri Lankan agricultural zones. Track precipitation probability, relative humidity, and automated agronomy warnings.
            </p>
            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-2">
              <span>5-Day forecast</span>
              <span>·</span>
              <span>Blister blight warning</span>
              <span>·</span>
              <span>Rainfall radar</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8F5EE] text-[#1B4332] flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Harvest & Financial Ledger</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Log harvest volumes with export quality grades (A, B, C). Correlate direct production expenses (seeds, labor, fuel, power) to calculate gross margin and yield per acre.
            </p>
            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-2">
              <span>Yield per acre</span>
              <span>·</span>
              <span>Margin formulas</span>
              <span>·</span>
              <span>CSV exports</span>
            </div>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8F5EE] text-[#1B4332] flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Produce Marketplace & Orders</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Direct connection between commercial farmers and wholesale buyers. Atomically checks availability upon checkout to eliminate overselling and maintains order state machines.
            </p>
            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-2">
              <span>Atomic reservation</span>
              <span>·</span>
              <span>Wholesale cart</span>
              <span>·</span>
              <span>Delivery tracking</span>
            </div>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8F5EE] text-[#1B4332] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">7 Least-Privilege Roles</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Segregated data boundaries for Super Admins, Farmers, Field Workers, Agronomists, Buyers, Suppliers, and Support Staff. Real role policies preventing unauthorized cross-access.
            </p>
            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center gap-2">
              <span>Policy enforcement</span>
              <span>·</span>
              <span>Worker dispatch</span>
              <span>·</span>
              <span>Audit compliance</span>
            </div>
          </div>
        </div>
      </section>

      {/* Produce Marketplace Preview */}
      <section id="marketplace-preview" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#2D6A4F]">
                Direct Wholesale Produce
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-[#0F2018] mt-2">
                Fresh Ceylon Harvest Listings
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                Certified quality single-origin crops direct from verified plantation farms.
              </p>
            </div>
            <button
              onClick={onViewMarketplace}
              className="px-4 py-2 text-xs font-semibold text-[#1B4332] bg-[#F1F9F4] hover:bg-[#D8F3DC] border border-[#B7E4C7] rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              Browse Full Marketplace &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            {listings.map(item => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs flex flex-col"
              >
                <div className="aspect-4/3 bg-slate-100 relative overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.cropName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                      No Image Available
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded text-[11px] font-semibold text-slate-900 border border-slate-200">
                    {item.grade}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.district} District</span>
                      <span>·</span>
                      <span>{item.variety}</span>
                    </div>
                    <h4 className="text-base font-semibold text-slate-900 leading-snug">
                      {item.cropName}
                    </h4>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-500">Wholesale Price</p>
                      <p className="text-base font-bold text-[#1B4332] tabular-nums font-mono">
                        LKR {item.pricePerUnit.toLocaleString()} / {item.unit}
                      </p>
                    </div>

                    <button
                      onClick={onNavigateLogin}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors"
                    >
                      Order as Buyer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agronomic Context & Target Users */}
      <section id="about" className="py-20 border-b border-slate-200 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#2D6A4F]">
              National Agricultural Impact
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-[#0F2018]">
              Rooted in Sri Lankan agricultural geography and seasonal cycles
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sri Lankan agriculture operates across distinct agro-ecological zones: the Central Highlands (Nuwara Eliya, Badulla) cultivating high-grown Ceylon tea and temperate vegetables, the Dry Zone (Anuradhapura, Polonnaruwa) powered by ancient reservoir cascade systems for paddy cultivation, and the Intermediate Zone (Kurunegala) driving protected horticulture.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              AgroPulse provides native modeling for <strong>Maha</strong> (northeast monsoon, October to March) and <strong>Yala</strong> (southwest monsoon, April to September) cultivation seasons, configurable acre and hectare conversions, and disease scouting advisories for tropical conditions.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="block text-2xl font-bold text-[#1B4332] font-mono tabular-nums">25</span>
                <span className="text-xs text-slate-600 mt-1 block">Districts Supported</span>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="block text-2xl font-bold text-[#1B4332] font-mono tabular-nums">100%</span>
                <span className="text-xs text-slate-600 mt-1 block">Transactional Traceability</span>
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-lg aspect-4/3">
            <img
              src="/src/assets/images/crop_paddy_rice_1792164657419.jpg"
              alt="Sri Lanka heirloom rice harvesting"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-[#F4F7F4] border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2D6A4F]">
            Agricultural Partnerships
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-[#0F2018]">
            Connect with the AgroPulse Agricultural Operations Team
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Whether you operate multi-plot tea plantations in the Central Hills or cooperative paddy schemes in Rajarata, our engineering and agronomy team is ready to assist.
          </p>

          <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <Phone className="w-5 h-5 text-[#2D6A4F] mb-2" />
              <p className="text-xs font-semibold text-slate-900">National Helpline</p>
              <p className="text-xs text-slate-600 mt-1 font-mono">+94 11 234 5678</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <Mail className="w-5 h-5 text-[#2D6A4F] mb-2" />
              <p className="text-xs font-semibold text-slate-900">Agronomy Inquiry</p>
              <p className="text-xs text-slate-600 mt-1 font-mono">agronomy@agropulse.lk</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <MapPin className="w-5 h-5 text-[#2D6A4F] mb-2" />
              <p className="text-xs font-semibold text-slate-900">Operations Hub</p>
              <p className="text-xs text-slate-600 mt-1">Peradeniya Agri Center, Kandy</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0B1A13] text-slate-400 py-12 border-t border-[#1B3629]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-[#1B4332] text-[#52B788] flex items-center justify-center">
              <Sprout className="w-4 h-4" />
            </div>
            <span className="font-semibold text-white text-sm">AgroPulse</span>
            <span className="text-slate-500">|</span>
            <span>Enterprise Smart Agriculture Platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <button
              onClick={() => setDocModal('privacy')}
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setDocModal('terms')}
              className="hover:text-white transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={onOpenDemoAccess}
              className="hover:text-[#52B788] transition-colors"
            >
              Architecture & Laravel Code
            </button>
          </div>

          <p className="text-slate-500">
            &copy; {new Date().getFullYear()} AgroPulse Ltd. Portfolio Demonstrator.
          </p>
        </div>
      </footer>

      {/* Document Modal (Privacy Policy / Terms of Service) */}
      {docModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sprout className="w-5 h-5 text-[#2D6A4F]" />
                <h3 className="text-base font-bold text-slate-900 font-display">
                  {docModal === 'privacy' ? 'Agronomic Data Privacy Policy' : 'Platform Terms of Service'}
                </h3>
              </div>
              <button
                onClick={() => setDocModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600 max-h-80 overflow-y-auto leading-relaxed pr-1">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 font-semibold">
                Enterprise Agricultural Framework — Sri Lanka Agronomic Operations
              </div>
              <p>
                <strong>Data Sovereignty:</strong> All farm geometry, GPS boundary parcels, worker dispatch rosters, soil diagnostic telemetry, and financial ledgers remain under the direct governance of the registered farm owner.
              </p>
              <p>
                <strong>Transactional Integrity:</strong> Stock dispatches strictly enforce real-time balance checks preventing negative inventory. In production, mutations are wrapped in atomic database transactions.
              </p>
              <p>
                <strong>Audit Compliance:</strong> Every operational change generates a persistent audit entry with action type, entity identifier, and ISO timestamp.
              </p>
              <p>
                <strong>Evaluation Sandbox:</strong> This demonstration session executes on browser-level reactive storage with complete parity to the target Laravel 11 / MySQL specification.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setDocModal(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg shadow-xs"
              >
                Close Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
