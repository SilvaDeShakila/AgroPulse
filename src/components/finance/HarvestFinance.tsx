import React, { useState } from 'react';
import {
  Coins,
  Plus,
  Download,
  TrendingUp,
  Receipt,
  Scale,
  Calendar,
  Layers,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { db } from '../../services/storage';
import { HarvestRecord, Expense } from '../../types';
import { Modal, StatCard } from '../common/Modal';
import { useToast } from '../common/Toast';

export function HarvestFinance() {
  const { showToast } = useToast();
  const farms = db.getFarms();
  const [selectedFarmId, setSelectedFarmId] = useState<string>(farms[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'harvests' | 'expenses'>('harvests');

  const [isAddHarvestOpen, setIsAddHarvestOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // Harvest form states
  const [harvestCycleId, setHarvestCycleId] = useState('');
  const [harvestQuantity, setHarvestQuantity] = useState(1000);
  const [harvestUnit, setHarvestUnit] = useState<HarvestRecord['unit']>('kg');
  const [harvestGrade, setHarvestGrade] = useState<HarvestRecord['qualityGrade']>('Grade A (Export / Premium)');
  const [harvestPrice, setHarvestPrice] = useState(650);
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [harvestStorage, setHarvestStorage] = useState('Central Temperature Controlled Store');

  // Expense form states
  const [expenseCategory, setExpenseCategory] = useState<Expense['category']>('Labor & Wages');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(50000);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseReceipt, setExpenseReceipt] = useState('');

  const cycles = db.getCropCycles(selectedFarmId);
  const plots = db.getPlots(selectedFarmId);
  const harvests = db.getHarvests(selectedFarmId);
  const expenses = db.getExpenses(selectedFarmId);
  const financialSummary = db.getFinancialSummary(selectedFarmId);

  const selectedFarm = farms.find(f => f.id === selectedFarmId) || farms[0];
  const totalFarmArea = selectedFarm?.totalArea || 1;
  const totalHarvestKg = harvests.reduce((acc, h) => acc + (h.unit === 'MT' ? h.quantity * 1000 : h.quantity), 0);
  const yieldPerAcre = Math.round(totalHarvestKg / totalFarmArea);

  const handleCreateHarvest = (e: React.FormEvent) => {
    e.preventDefault();
    const cycle = cycles.find(c => c.id === harvestCycleId) || cycles[0];
    if (!cycle) {
      showToast('error', 'Error', 'No crop cycle selected.');
      return;
    }
    const plot = plots.find(p => p.id === cycle.plotId);

    const estRevenue = Number(harvestQuantity) * Number(harvestPrice);

    db.addHarvest({
      farmId: selectedFarmId,
      cropCycleId: cycle.id,
      cropName: cycle.cropName,
      plotName: plot?.name || 'Assigned Plot',
      harvestDate,
      quantity: Number(harvestQuantity),
      unit: harvestUnit,
      qualityGrade: harvestGrade,
      estimatedMarketPricePerUnit: Number(harvestPrice),
      estimatedRevenue: estRevenue,
      storageLocation: harvestStorage,
      recordedBy: db.getCurrentUser().name,
    });

    showToast('success', 'Harvest Logged', `Recorded ${harvestQuantity} ${harvestUnit} harvest for ${cycle.cropName}.`);
    setIsAddHarvestOpen(false);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim()) {
      showToast('error', 'Validation Error', 'Expense description is required.');
      return;
    }

    db.addExpense({
      farmId: selectedFarmId,
      category: expenseCategory,
      description: expenseDesc,
      amount: Number(expenseAmount),
      currency: 'LKR',
      date: expenseDate,
      recordedBy: db.getCurrentUser().name,
      receiptNumber: expenseReceipt || `REC-${Date.now().toString().slice(-4)}`,
    });

    showToast('success', 'Expense Logged', `Recorded LKR ${Number(expenseAmount).toLocaleString()} for ${expenseCategory}.`);
    setIsAddExpenseOpen(false);
    setExpenseDesc('');
  };

  const handleExportCSV = () => {
    const csvContent = db.exportFinancialReportCSV(selectedFarmId);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `agropulse-financial-report-${selectedFarm?.district || 'farm'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Export Complete', 'Financial ledger downloaded as CSV.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Module G: Harvest & Finance</span>
            <span>·</span>
            <span>Yield per Unit of Land & Margins</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Harvest Records & Production Financial Ledger
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Document output volumes with quality grades (A, B, C), categorize farm expenses, and audit estimated profitability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedFarmId}
            onChange={e => setSelectedFarmId(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg"
          >
            {farms.map(f => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            title="Export CSV report"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Strips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Estimated Harvest Revenue"
          value={`LKR ${(financialSummary.totalRevenue / 1000).toLocaleString()}k`}
          subtext={`Across ${harvests.length} logged harvest flushes`}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          label="Total Production Expenses"
          value={`LKR ${(financialSummary.totalExpenses / 1000).toLocaleString()}k`}
          subtext={`Across ${expenses.length} expense line items`}
          icon={<Receipt className="w-5 h-5 text-rose-600" />}
        />
        <StatCard
          label="Estimated Net Margin"
          value={`LKR ${(financialSummary.netProfit / 1000).toLocaleString()}k`}
          subtext={`Margin: ${financialSummary.profitMargin}%`}
          trend={financialSummary.profitMargin > 0 ? '+Profitable' : 'Deficit'}
          trendPositive={financialSummary.profitMargin > 0}
          icon={<Coins className="w-5 h-5" />}
        />
        <StatCard
          label="Land Yield Efficiency"
          value={`${yieldPerAcre.toLocaleString()} kg`}
          subtext={`Yield per ${selectedFarm?.areaUnit.replace('_', ' ') || 'acre'}`}
          icon={<Scale className="w-5 h-5 text-[#2D6A4F]" />}
        />
      </div>

      {/* Formula Transparency Notice */}
      <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Calculation Methodology & Accounting Transparency</p>
          <p className="text-amber-900 mt-0.5 leading-relaxed">
            Formula: <code>Net Margin = (Total Harvest Revenue) - (Direct Production Expenses)</code>. <code>Yield = Cumulative Harvest (kg) / Total Estate Extent ({selectedFarm?.areaUnit})</code>. Estimated revenues represent harvest valuation at prevailing wholesale market rates; verified invoices are logged when produce lots are sold via the marketplace.
          </p>
        </div>
      </div>

      {/* Tab Segment Controls & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center p-1 bg-slate-200/70 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('harvests')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'harvests'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Harvest Flushes ({harvests.length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'expenses'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Direct Production Expenses ({expenses.length})
          </button>
        </div>

        <div>
          {activeTab === 'harvests' ? (
            <button
              onClick={() => {
                setHarvestCycleId(cycles[0]?.id || '');
                setIsAddHarvestOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Harvest Flush</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Expense Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Harvests Table */}
      {activeTab === 'harvests' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Harvest Date</th>
                  <th className="py-3 px-4">Crop Name / Plot</th>
                  <th className="py-3 px-4 text-right">Harvest Quantity</th>
                  <th className="py-3 px-4">Quality Grade</th>
                  <th className="py-3 px-4 text-right">Market Unit Rate</th>
                  <th className="py-3 px-4 text-right">Estimated Revenue</th>
                  <th className="py-3 px-4">Storage Location</th>
                  <th className="py-3 px-4">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {harvests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No harvest flushes recorded yet for this farm.
                    </td>
                  </tr>
                ) : (
                  harvests.map(h => (
                    <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                        {h.harvestDate}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{h.cropName}</p>
                        <p className="text-[11px] text-slate-500">{h.plotName}</p>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                        {h.quantity.toLocaleString()} {h.unit}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {h.qualityGrade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        LKR {h.estimatedMarketPricePerUnit.toLocaleString()} / {h.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#1B4332] text-sm">
                        LKR {h.estimatedRevenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[160px]">
                        {h.storageLocation}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{h.recordedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Amount (LKR)</th>
                  <th className="py-3 px-4">Receipt / Invoice Ref</th>
                  <th className="py-3 px-4">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No expenses logged yet for this farm.
                    </td>
                  </tr>
                ) : (
                  expenses.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                        {e.date}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {e.category}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {e.description}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-rose-700 text-sm">
                        LKR {e.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {e.receiptNumber || 'None'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{e.recordedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Harvest */}
      {isAddHarvestOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddHarvestOpen(false)}
          title="Log Harvest Flush"
          description="Record harvested crop volume, grade, and market valuation"
        >
          <form onSubmit={handleCreateHarvest} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Crop Cycle</label>
              <select
                value={harvestCycleId}
                onChange={e => setHarvestCycleId(e.target.value)}
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
                <label className="block text-xs font-medium text-slate-700 mb-1">Harvest Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={harvestQuantity}
                  onChange={e => setHarvestQuantity(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Unit</label>
                <select
                  value={harvestUnit}
                  onChange={e => setHarvestUnit(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="MT">Metric Tons (MT)</option>
                  <option value="crates">Crates</option>
                  <option value="sacks">Sacks / Bags</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Quality Grade</label>
                <select
                  value={harvestGrade}
                  onChange={e => setHarvestGrade(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="Grade A (Export / Premium)">Grade A (Export / Premium)</option>
                  <option value="Grade B (Standard Market)">Grade B (Standard Market)</option>
                  <option value="Grade C (Processing / Economy)">Grade C (Processing / Economy)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Market Price / Unit (LKR)</label>
                <input
                  type="number"
                  min="1"
                  value={harvestPrice}
                  onChange={e => setHarvestPrice(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Harvest Date</label>
                <input
                  type="date"
                  value={harvestDate}
                  onChange={e => setHarvestDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Storage Location</label>
                <input
                  type="text"
                  value={harvestStorage}
                  onChange={e => setHarvestStorage(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-between text-xs">
              <span className="text-emerald-900 font-medium">Estimated Gross Harvest Revenue:</span>
              <strong className="text-emerald-950 font-mono text-sm tabular-nums">
                LKR {(Number(harvestQuantity) * Number(harvestPrice)).toLocaleString()}
              </strong>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddHarvestOpen(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg"
              >
                Save Harvest
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Add Expense */}
      {isAddExpenseOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddExpenseOpen(false)}
          title="Log Production Expense"
          description="Record direct inputs, labor, fuel, or equipment costs"
        >
          <form onSubmit={handleCreateExpense} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="Labor & Wages">Labor & Wages</option>
                  <option value="Fertilizers">Fertilizers</option>
                  <option value="Seeds & Planting">Seeds & Planting</option>
                  <option value="Fuel & Energy">Fuel & Energy</option>
                  <option value="Water & Irrigation">Water & Irrigation</option>
                  <option value="Equipment Maintenance">Equipment Maintenance</option>
                  <option value="Packaging & Transport">Packaging & Transport</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Amount (LKR)</label>
                <input
                  type="number"
                  min="1"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={expenseDesc}
                onChange={e => setExpenseDesc(e.target.value)}
                placeholder="e.g. Daily wages for 10 workers plucking tea sectors"
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Expense Date</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Receipt / Voucher Number</label>
                <input
                  type="text"
                  value={expenseReceipt}
                  onChange={e => setExpenseReceipt(e.target.value)}
                  placeholder="e.g. VOUCH-2026-99"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddExpenseOpen(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg"
              >
                Commit Expense Line
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
