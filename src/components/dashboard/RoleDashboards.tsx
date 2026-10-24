import React, { useState } from 'react';
import {
  CheckSquare,
  Sprout,
  Store,
  Package,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  UserCheck,
  Clock,
  CheckCircle2,
  FileText,
  Truck,
  Plus
} from 'lucide-react';
import { db } from '../../services/storage';
import { NavItemKey } from '../layout/Sidebar';
import { useToast } from '../common/Toast';
import { Modal, StatCard } from '../common/Modal';

interface RoleDashboardProps {
  onNavigate: (tab: NavItemKey) => void;
}

// 1. WORKER DASHBOARD
export function WorkerDashboard({ onNavigate }: RoleDashboardProps) {
  const { showToast } = useToast();
  const currentUser = db.getCurrentUser();
  const tasks = db.getTasks().filter(t => !t.assignedToId || t.assignedToId === currentUser.id);

  const [activeTaskModal, setActiveTaskModal] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const selectedTask = tasks.find(t => t.id === activeTaskModal);

  const handleSubmitCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTaskModal) return;
    db.updateTask(activeTaskModal, {
      status: 'completed',
      completionNotes: completionNotes || 'Field work verified and completed by worker.',
      completionEvidenceUrl: evidenceUrl || undefined,
    });
    showToast('success', 'Task Completed', 'Work record submitted and logged to farm ledger.');
    setActiveTaskModal(null);
    setCompletionNotes('');
    setEvidenceUrl('');
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl bg-white border border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span>Worker Field Dispatch</span>
          <span>·</span>
          <span>Assigned to {currentUser.name}</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Today's Field Work Checklist
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Review tasks, perform field operations (irrigation, fertigation, pruning, harvesting), and submit completion evidence.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Assigned Tasks"
          value={tasks.length}
          subtext="Total assigned to you"
          icon={<CheckSquare className="w-5 h-5" />}
        />
        <StatCard
          label="Pending & In Progress"
          value={pendingTasks.length}
          subtext="Field operations awaiting completion"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="Completed"
          value={completedTasks.length}
          subtext="Finished tasks"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
      </div>

      <div className="p-5 rounded-xl border border-slate-200 bg-white">
        <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100">
          Pending Operations
        </h3>

        {pendingTasks.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            All assigned field tasks are completed for today. Good work!
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingTasks.map(task => (
              <div key={task.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-amber-700 uppercase tracking-wider text-[10px]">
                      {task.priority}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500 capitalize">{task.category}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">Due {task.dueDate}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{task.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{task.description}</p>
                </div>

                <button
                  onClick={() => {
                    setActiveTaskModal(task.id);
                    setCompletionNotes('');
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors shrink-0 self-start sm:self-auto"
                >
                  Mark Completed
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeTaskModal && selectedTask && (
        <Modal
          isOpen={true}
          onClose={() => setActiveTaskModal(null)}
          title="Submit Field Work Completion"
          description={selectedTask.title}
        >
          <form onSubmit={handleSubmitCompletion} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Completion Notes & Observations
              </label>
              <textarea
                value={completionNotes}
                onChange={e => setCompletionNotes(e.target.value)}
                placeholder="Describe work completed, fertilizer quantities applied, or plant health observed..."
                rows={3}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Photo Evidence (Optional Image URL)
              </label>
              <input
                type="text"
                value={evidenceUrl}
                onChange={e => setEvidenceUrl(e.target.value)}
                placeholder="/src/assets/images/crop_ceylon_tea_1792164656862.jpg"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Attach field photography proving completion of operation.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTaskModal(null)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg"
              >
                Confirm Completion
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// 2. AGRONOMIST DASHBOARD
export function AgronomistDashboard({ onNavigate }: RoleDashboardProps) {
  const observations = db.getObservations();
  const cycles = db.getCropCycles();
  const [showObsModal, setShowObsModal] = useState(false);
  const [cycleId, setCycleId] = useState(cycles[0]?.id || '');
  const [obsType, setObsType] = useState<any>('Pest & Disease');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<any>('moderate');
  const [recommendation, setRecommendation] = useState('');

  const { showToast } = useToast();

  const handleCreateObservation = (e: React.FormEvent) => {
    e.preventDefault();
    const cycle = cycles.find(c => c.id === cycleId);
    if (!cycle) return;

    db.addObservation({
      cropCycleId: cycle.id,
      farmId: cycle.farmId,
      authorId: db.getCurrentUser().id,
      authorName: db.getCurrentUser().name,
      authorRole: 'agronomist',
      observationType: obsType,
      title,
      description,
      severity,
      recommendation,
    });

    showToast('success', 'Observation Logged', 'Agronomic advisory transmitted to farm manager.');
    setShowObsModal(false);
    setTitle('');
    setDescription('');
    setRecommendation('');
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Agronomic Advisory Desk</span>
            <span>·</span>
            <span>Dr. Anula Wickramasinghe</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Plant Pathology & Soil Health Console
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Review crop growth cycles, scout pest and pathogen colonies, and author verified agronomic advisories.
          </p>
        </div>

        <button
          onClick={() => setShowObsModal(true)}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Field Observation</span>
        </button>
      </div>

      <div className="p-5 rounded-xl border border-slate-200 bg-white">
        <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100">
          Recent Observations & Agronomic Advisories ({observations.length})
        </h3>

        <div className="divide-y divide-slate-100 mt-2">
          {observations.map(obs => (
            <div key={obs.id} className="py-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded ${
                      obs.severity === 'critical' || obs.severity === 'high'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : obs.severity === 'moderate'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {obs.severity} Severity
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-medium text-slate-700">{obs.observationType}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">{obs.date}</span>
                </div>
                <span className="text-xs text-slate-500">By {obs.authorName}</span>
              </div>

              <h4 className="text-sm font-semibold text-slate-900">{obs.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{obs.description}</p>

              {obs.recommendation && (
                <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 text-xs text-emerald-950">
                  <strong>Agronomist Directive:</strong> {obs.recommendation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showObsModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowObsModal(false)}
          title="Log Crop Observation & Advisory"
          description="Record field findings with verified remedial instructions"
        >
          <form onSubmit={handleCreateObservation} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Crop Cycle</label>
              <select
                value={cycleId}
                onChange={e => setCycleId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              >
                {cycles.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.cropName} ({c.stage}) - {c.variety}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={obsType}
                  onChange={e => setObsType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="Pest & Disease">Pest & Disease</option>
                  <option value="Nutrient Deficiency">Nutrient Deficiency</option>
                  <option value="Growth Progress">Growth Progress</option>
                  <option value="Irrigation Check">Irrigation Check</option>
                  <option value="Agronomist Advice">Agronomist Advice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={e => setSeverity(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Mild powdery mildew detected on lower leaf surface"
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Observation Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Remedial Recommendation / Action
              </label>
              <textarea
                value={recommendation}
                onChange={e => setRecommendation(e.target.value)}
                rows={2}
                placeholder="Recommended organic bio-spray, drainage adjustment, or nutrient dosage..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowObsModal(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg"
              >
                Save Observation
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// 3. BUYER DASHBOARD
export function BuyerDashboard({ onNavigate }: RoleDashboardProps) {
  const currentUser = db.getCurrentUser();
  const orders = db.getOrders(currentUser.id);
  const totalPurchases = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Wholesale Procurement Hub</span>
            <span>·</span>
            <span>{currentUser.organization || currentUser.name}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Wholesale Produce Purchase Orders
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Track wholesale orders, delivery fulfillment statuses, and access single-estate produce lots.
          </p>
        </div>

        <button
          onClick={() => onNavigate('marketplace')}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Store className="w-3.5 h-3.5" />
          <span>Browse Produce Marketplace</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Orders Placed"
          value={orders.length}
          subtext="Wholesale order volume"
          icon={<Store className="w-5 h-5" />}
        />
        <StatCard
          label="Cumulative Purchases"
          value={`LKR ${(totalPurchases / 1000000).toFixed(2)}M`}
          subtext="Verified transaction amount"
          icon={<FileText className="w-5 h-5" />}
        />
        <StatCard
          label="Active Deliveries"
          value={orders.filter(o => o.status === 'confirmed' || o.status === 'processing' || o.status === 'shipped').length}
          subtext="In transit or processing"
          icon={<Truck className="w-5 h-5" />}
        />
      </div>

      <div className="p-5 rounded-xl border border-slate-200 bg-white">
        <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100">
          Order History & Fulfillment Tracking
        </h3>

        {orders.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No orders placed yet. Head over to the Produce Marketplace to buy directly from verified farms.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 mt-2">
            {orders.map(order => (
              <div key={order.id} className="py-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{order.orderNumber}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">{order.createdAt.split('T')[0]}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">{order.paymentMethod}</span>
                  </div>

                  <span
                    className={`font-semibold uppercase tracking-wider text-[10px] px-2.5 py-0.5 rounded self-start sm:self-auto ${
                      order.status === 'delivered'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : order.status === 'shipped'
                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-700">
                      <span>{it.quantity} {it.unit} · {it.cropName}</span>
                      <span className="font-mono tabular-nums font-semibold">
                        LKR {it.subtotal.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-slate-900 font-bold">
                    <span>Order Total</span>
                    <span className="font-mono tabular-nums text-sm">
                      LKR {order.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  Delivery to: {order.deliveryAddress} ({order.district})
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 4. SUPPLIER DASHBOARD
export function SupplierDashboard({ onNavigate }: RoleDashboardProps) {
  const inventory = db.getInventory();
  const lowStock = inventory.filter(i => i.currentStock <= i.minReorderLevel);

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl bg-white border border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span>Supplier Portal</span>
          <span>·</span>
          <span>Lanka Agro Nutrients & Supplies</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Agricultural Inputs Supply & Restock Orders
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Monitor farm customer inventory levels, fulfill replenishment purchase orders, and audit stock delivery history.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Tracked Farm SKUs"
          value={inventory.length}
          subtext="Catalog items"
          icon={<Package className="w-5 h-5" />}
        />
        <StatCard
          label="Farms Requiring Restock"
          value={lowStock.length}
          subtext="At or below reorder threshold"
          trend="Reorder Triggered"
          trendPositive={false}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <button
          onClick={() => onNavigate('inventory')}
          className="p-5 rounded-xl border border-dashed border-[#2D6A4F] bg-[#F1F9F4] text-left hover:bg-[#E8F5EE] transition-colors flex flex-col justify-between"
        >
          <span className="text-xs font-semibold text-[#1B4332]">Quick Action</span>
          <p className="text-sm font-bold text-[#1B4332] mt-2">Open Inventory Warehouse &rarr;</p>
          <span className="text-xs text-[#2D6A4F] mt-1">Receive or issue inventory shipments</span>
        </button>
      </div>

      <div className="p-5 rounded-xl border border-slate-200 bg-white">
        <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100">
          Input Stock Reorder Radar
        </h3>
        <div className="divide-y divide-slate-100 mt-2">
          {lowStock.map(item => (
            <div key={item.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-slate-900">{item.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Category: {item.category} · Storage: {item.locationStorage}
                </p>
              </div>

              <div className="text-right">
                <span className="text-rose-600 font-bold font-mono tabular-nums">
                  {item.currentStock} {item.unit} remaining
                </span>
                <p className="text-[11px] text-slate-400">
                  Threshold: {item.minReorderLevel} {item.unit}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 5. SUPER ADMIN DASHBOARD
export function AdminDashboard({ onNavigate }: RoleDashboardProps) {
  const users = db.getUsers();
  const farms = db.getFarms();
  const listings = db.getProduceListings();
  const orders = db.getOrders();
  const auditLogs = db.getAuditLogs();

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl bg-white border border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span className="font-semibold text-[#1B4332]">Super Admin Control Plane</span>
          <span>·</span>
          <span>National System Governance</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          AgroPulse Platform Administration
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Oversee user credentials, farm registrations, marketplace compliance, and immutable operational audit logs.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          label="Registered Users"
          value={users.length}
          subtext="Across 7 role definitions"
          icon={<UserCheck className="w-5 h-5" />}
        />
        <StatCard
          label="Active Agricultural Farms"
          value={farms.length}
          subtext="Verified estate operations"
          icon={<ShieldCheck className="w-5 h-5" />}
        />
        <StatCard
          label="Marketplace Produce Lots"
          value={listings.length}
          subtext="Active wholesale offers"
          icon={<Store className="w-5 h-5" />}
        />
        <StatCard
          label="Audit Events Recorded"
          value={auditLogs.length}
          subtext="Compliance trail"
          icon={<FileText className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Directory */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white">
          <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100">
            Registered Users & Role Assignments ({users.length})
          </h3>
          <div className="divide-y divide-slate-100 mt-2 max-h-80 overflow-y-auto">
            {users.map(u => (
              <div key={u.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{u.name}</p>
                  <p className="text-[11px] text-slate-500">{u.email} · {u.district || 'National'}</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-slate-100 text-slate-700">
                  {u.role.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log Stream */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">
              Live Audit Log Stream
            </h3>
            <button
              onClick={() => onNavigate('audit')}
              className="text-xs text-[#2D6A4F] hover:underline font-medium"
            >
              Full Audit Table &rarr;
            </button>
          </div>
          <div className="divide-y divide-slate-100 mt-2 max-h-80 overflow-y-auto">
            {auditLogs.slice(0, 5).map(log => (
              <div key={log.id} className="py-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="font-semibold text-slate-700">{log.action} · {log.entity}</span>
                  <span className="font-mono tabular-nums">{log.timestamp.split('T')[1].slice(0, 5)}</span>
                </div>
                <p className="text-slate-800 mt-1 font-medium leading-normal">{log.details}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Actor: {log.actorName} ({log.actorRole})</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
