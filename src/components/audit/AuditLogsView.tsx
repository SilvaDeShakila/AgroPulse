import React, { useState } from 'react';
import {
  FileText,
  Download,
  Filter,
  Search,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { db } from '../../services/storage';
import { useToast } from '../common/Toast';
import { AuditLog } from '../../types';

export function AuditLogsView() {
  const { showToast } = useToast();
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const logs = db.getAuditLogs();

  const filteredLogs = logs.filter(l => {
    if (entityFilter !== 'all' && l.entity !== entityFilter) return false;
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (
      searchQuery.trim() &&
      !l.details.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !l.actorName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    const csvContent = db.exportAuditLogsCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `agropulse-audit-trail-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Export Complete', 'Audit log trail downloaded as CSV.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Module K: Compliance & Governance</span>
            <span>·</span>
            <span>Immutable Audit Trail</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            System Operational Audit Trail
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Cryptographically timestamped record of farm mutations, stock deductions, harvest logs, and order events.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search audit trail by actor or action description..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
          />
        </div>

        <select
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-slate-50"
        >
          <option value="all">All Entities</option>
          <option value="FARM">FARM</option>
          <option value="PLOT">PLOT</option>
          <option value="CROP_CYCLE">CROP_CYCLE</option>
          <option value="TASK">TASK</option>
          <option value="INVENTORY">INVENTORY</option>
          <option value="HARVEST">HARVEST</option>
          <option value="ORDER">ORDER</option>
          <option value="USER">USER</option>
        </select>

        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-slate-50"
        >
          <option value="all">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="STOCK_ISSUE">STOCK_ISSUE</option>
          <option value="STOCK_RECEIVE">STOCK_RECEIVE</option>
          <option value="ORDER_STATUS">ORDER_STATUS</option>
          <option value="PERM_CHANGE">PERM_CHANGE</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F6] border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No audit records match query filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {log.timestamp.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {log.actorName}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600">
                      {log.actorRole.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                          log.action.includes('STOCK')
                            ? 'bg-amber-100 text-amber-900'
                            : log.action === 'CREATE'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] font-semibold text-slate-700">
                      {log.entity}
                    </td>
                    <td className="py-3 px-4 text-slate-800 leading-normal">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
