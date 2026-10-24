import React, { useState } from 'react';
import {
  Package,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Search,
  CheckCircle2,
  FileText,
  ShieldAlert,
  History
} from 'lucide-react';
import { db } from '../../services/storage';
import { InventoryItem, InventoryCategory, StockMovement } from '../../types';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

export function InventoryManagement() {
  const { showToast } = useToast();
  const farms = db.getFarms();
  const [selectedFarmId, setSelectedFarmId] = useState<string>(farms[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'items' | 'movements'>('items');

  // Modals
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [issueModalItem, setIssueModalItem] = useState<InventoryItem | null>(null);
  const [receiveModalItem, setReceiveModalItem] = useState<InventoryItem | null>(null);

  // Issue Form states
  const [issueQuantity, setIssueQuantity] = useState(1);
  const [issueReason, setIssueReason] = useState('');
  const [issueError, setIssueError] = useState<string | null>(null);

  // Receive Form states
  const [receiveQuantity, setReceiveQuantity] = useState(10);
  const [receiveReason, setReceiveReason] = useState('');
  const [receiveBatch, setReceiveBatch] = useState('');

  // Add Item states
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<InventoryCategory>('Fertilizers & Nutrients');
  const [newItemUnit, setNewItemUnit] = useState<InventoryItem['unit']>('bags');
  const [newItemStock, setNewItemStock] = useState(20);
  const [newItemMinLevel, setNewItemMinLevel] = useState(10);
  const [newItemCost, setNewItemCost] = useState(4500);
  const [newItemLocation, setNewItemLocation] = useState('Central Store Room');
  const [newItemBatch, setNewItemBatch] = useState('');

  const inventory = db.getInventory(selectedFarmId);
  const movements = db.getStockMovements(selectedFarmId);

  const filteredItems = inventory.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleIssueStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueModalItem) return;
    setIssueError(null);

    const currentUser = db.getCurrentUser();
    const result = db.issueStock(
      issueModalItem.id,
      Number(issueQuantity),
      issueReason || 'Dispatched for field application',
      currentUser.id,
      currentUser.name
    );

    if (!result.success) {
      setIssueError(result.error || 'Failed to issue stock.');
      showToast('error', 'Constraint Violation', result.error);
      return;
    }

    showToast(
      'success',
      'Stock Issued',
      `Issued ${issueQuantity} ${issueModalItem.unit} of "${issueModalItem.name}". Balance updated.`
    );
    setIssueModalItem(null);
    setIssueQuantity(1);
    setIssueReason('');
  };

  const handleReceiveStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveModalItem) return;

    const currentUser = db.getCurrentUser();
    const result = db.receiveStock(
      receiveModalItem.id,
      Number(receiveQuantity),
      receiveReason || 'Vendor restock shipment delivered',
      receiveBatch || undefined,
      currentUser.id,
      currentUser.name
    );

    if (!result.success) {
      showToast('error', 'Error', result.error);
      return;
    }

    showToast(
      'success',
      'Stock Received',
      `Received ${receiveQuantity} ${receiveModalItem.unit} of "${receiveModalItem.name}".`
    );
    setReceiveModalItem(null);
    setReceiveQuantity(10);
    setReceiveReason('');
    setReceiveBatch('');
  };

  const handleCreateItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      showToast('error', 'Validation Error', 'Item name is required.');
      return;
    }

    const created = db.addInventoryItem({
      farmId: selectedFarmId,
      name: newItemName,
      category: newItemCategory,
      unit: newItemUnit,
      currentStock: Number(newItemStock),
      minReorderLevel: Number(newItemMinLevel),
      costPerUnit: Number(newItemCost),
      locationStorage: newItemLocation,
      batchNumber: newItemBatch || `BATCH-${Date.now().toString().slice(-4)}`,
    });

    showToast('success', 'SKU Registered', `Added "${created.name}" to inventory.`);
    setIsAddItemOpen(false);
    setNewItemName('');
  };

  const lowStockCount = inventory.filter(i => i.currentStock <= i.minReorderLevel).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Module E: Input Inventory</span>
            <span>·</span>
            <span>Transactional Ledger</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Agricultural Inventory & Stock Movements
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Strict non-negative quantity guarantees, reorder thresholds, batch controls, and immutable movements.
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
            onClick={() => setIsAddItemOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Inventory SKU</span>
          </button>
        </div>
      </div>

      {/* Tabs & Low-stock Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Interactive Segmented Tabs */}
        <div className="flex items-center p-1 bg-slate-200/70 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'items'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Warehouse Stock Items ({inventory.length})
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'movements'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock Movement History ({movements.length})
          </button>
        </div>

        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{lowStockCount} SKU(s)</strong> have reached minimum reorder thresholds.
            </span>
          </div>
        )}
      </div>

      {activeTab === 'items' && (
        <>
          {/* Search & Filter Bar */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search inventory items, fertilizers, seeds, chemicals..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-slate-50"
            >
              <option value="all">All Categories</option>
              <option value="Fertilizers & Nutrients">Fertilizers & Nutrients</option>
              <option value="Seeds & Seedlings">Seeds & Seedlings</option>
              <option value="Crop Protection & Agrochemicals">Crop Protection & Agrochemicals</option>
              <option value="Tools & Machinery">Tools & Machinery</option>
              <option value="Packaging & Containers">Packaging & Containers</option>
            </select>
          </div>

          {/* Inventory Items Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9F6] border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Item SKU Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Available Stock</th>
                    <th className="py-3 px-4 text-right">Reorder Level</th>
                    <th className="py-3 px-4 text-right">Unit Cost</th>
                    <th className="py-3 px-4">Storage / Batch</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Stock Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No inventory items found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => {
                      const isLow = item.currentStock <= item.minReorderLevel;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{item.id}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {item.category}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-slate-900 text-sm">
                            {item.currentStock.toLocaleString()} {item.unit}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                            {item.minReorderLevel.toLocaleString()} {item.unit}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                            LKR {item.costPerUnit.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <p className="truncate max-w-[150px]">{item.locationStorage}</p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">
                              Batch: {item.batchNumber || 'N/A'}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded ${
                                item.currentStock === 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-800 font-bold'
                                  : 'bg-emerald-50 text-emerald-800'
                              }`}
                            >
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setIssueModalItem(item);
                                  setIssueQuantity(1);
                                  setIssueError(null);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors flex items-center gap-1"
                                title="Issue stock out (enforces non-negative constraint)"
                              >
                                <ArrowUpRight className="w-3 h-3" />
                                <span>Issue</span>
                              </button>
                              <button
                                onClick={() => {
                                  setReceiveModalItem(item);
                                  setReceiveQuantity(10);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors flex items-center gap-1"
                                title="Receive stock in"
                              >
                                <ArrowDownLeft className="w-3 h-3" />
                                <span>Receive</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Stock Movement History Tab */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Immutable Stock Movement Audit Trail
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every warehouse debit and credit is committed with before/after state, actor, and reason.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {movements.length} logged events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Item SKU</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Balance Change</th>
                  <th className="py-3 px-4">Reason / Reference</th>
                  <th className="py-3 px-4">Authorized Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map(mov => (
                    <tr key={mov.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-500">
                        {mov.createdAt.replace('T', ' ').slice(0, 16)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {mov.inventoryItemName}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded ${
                            mov.type === 'received'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          {mov.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                        {mov.type === 'received' ? '+' : '-'}
                        {mov.quantity} {mov.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                        {mov.previousStock} &rarr;{' '}
                        <strong className="text-slate-900">{mov.newStock}</strong> {mov.unit}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-[240px] truncate">
                        {mov.referenceReason}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {mov.actorName}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Issue Stock (Transaction Safe with Non-Negative Check) */}
      {issueModalItem && (
        <Modal
          isOpen={true}
          onClose={() => setIssueModalItem(null)}
          title={`Issue Stock: ${issueModalItem.name}`}
          description={`Available: ${issueModalItem.currentStock} ${issueModalItem.unit}. Negative balances strictly forbidden.`}
        >
          <form onSubmit={handleIssueStockSubmit} className="space-y-4">
            {issueError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Transaction Rejection</p>
                  <p className="mt-0.5">{issueError}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Quantity to Issue ({issueModalItem.unit})
              </label>
              <input
                type="number"
                min="1"
                value={issueQuantity}
                onChange={e => {
                  setIssueError(null);
                  setIssueQuantity(Number(e.target.value));
                }}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2D6A4F]"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                <span>Current: {issueModalItem.currentStock} {issueModalItem.unit}</span>
                <span>
                  Resulting Balance:{' '}
                  <strong
                    className={
                      issueModalItem.currentStock - issueQuantity < 0
                        ? 'text-rose-600 font-bold'
                        : 'text-slate-900'
                    }
                  >
                    {issueModalItem.currentStock - issueQuantity} {issueModalItem.unit}
                  </strong>
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Field Usage Reason / Destination Plot
              </label>
              <input
                type="text"
                value={issueReason}
                onChange={e => setIssueReason(e.target.value)}
                placeholder="e.g. Side dressing application for Tea Upper Terrace (Plot A1)"
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIssueModalItem(null)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={issueModalItem.currentStock - issueQuantity < 0}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors shadow-xs ${
                  issueModalItem.currentStock - issueQuantity < 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-[#1B4332] hover:bg-[#10281D] text-white'
                }`}
              >
                Commit Stock Deduction
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Receive Stock */}
      {receiveModalItem && (
        <Modal
          isOpen={true}
          onClose={() => setReceiveModalItem(null)}
          title={`Receive Stock: ${receiveModalItem.name}`}
          description={`Current: ${receiveModalItem.currentStock} ${receiveModalItem.unit}`}
        >
          <form onSubmit={handleReceiveStockSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Quantity Received ({receiveModalItem.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={receiveQuantity}
                  onChange={e => setReceiveQuantity(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Supplier Delivery Batch Number
                </label>
                <input
                  type="text"
                  value={receiveBatch}
                  onChange={e => setReceiveBatch(e.target.value)}
                  placeholder="e.g. LOT-2026-X99"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Purchase Order / Delivery Reference Reason
              </label>
              <input
                type="text"
                value={receiveReason}
                onChange={e => setReceiveReason(e.target.value)}
                placeholder="e.g. Delivery Invoice #LK-9011 from Lanka Nutrients"
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceiveModalItem(null)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg"
              >
                Commit Receipt into Inventory
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Add Inventory SKU */}
      {isAddItemOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddItemOpen(false)}
          title="Add New Inventory SKU"
          description="Catalog a new agricultural input item into farm inventory"
        >
          <form onSubmit={handleCreateItemSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">SKU Name</label>
              <input
                type="text"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                placeholder="e.g. Zinc Sulphate Heptahydrate Micronutrient"
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={newItemCategory}
                  onChange={e => setNewItemCategory(e.target.value as InventoryCategory)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="Fertilizers & Nutrients">Fertilizers & Nutrients</option>
                  <option value="Seeds & Seedlings">Seeds & Seedlings</option>
                  <option value="Crop Protection & Agrochemicals">Crop Protection & Agrochemicals</option>
                  <option value="Tools & Machinery">Tools & Machinery</option>
                  <option value="Packaging & Containers">Packaging & Containers</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Unit of Measure</label>
                <select
                  value={newItemUnit}
                  onChange={e => setNewItemUnit(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="bags">Bags (50kg / 25kg)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="liters">Liters (L)</option>
                  <option value="packets">Packets</option>
                  <option value="units">Units / Pieces</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Initial Stock</label>
                <input
                  type="number"
                  min="0"
                  value={newItemStock}
                  onChange={e => setNewItemStock(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Reorder Level</label>
                <input
                  type="number"
                  min="1"
                  value={newItemMinLevel}
                  onChange={e => setNewItemMinLevel(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Unit Cost (LKR)</label>
                <input
                  type="number"
                  min="0"
                  value={newItemCost}
                  onChange={e => setNewItemCost(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Storage Location</label>
                <input
                  type="text"
                  value={newItemLocation}
                  onChange={e => setNewItemLocation(e.target.value)}
                  placeholder="e.g. Warehouse Bay 2 or Cold Storage"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Batch Number</label>
                <input
                  type="text"
                  value={newItemBatch}
                  onChange={e => setNewItemBatch(e.target.value)}
                  placeholder="e.g. BATCH-2026-9"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddItemOpen(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg"
              >
                Save SKU
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
