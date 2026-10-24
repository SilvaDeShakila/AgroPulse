import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Filter,
  Calendar,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { db } from '../../services/storage';
import { FarmTask, TaskCategory, TaskPriority, TaskStatus } from '../../types';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

export function TaskManagement() {
  const { showToast } = useToast();
  const farms = db.getFarms();
  const users = db.getUsers().filter(u => u.role === 'farm_worker' || u.role === 'farmer');
  const allTasks = db.getTasks();

  const [selectedFarm, setSelectedFarm] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [completeTaskId, setCompleteTaskId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // Form states for New Task
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [farmId, setFarmId] = useState(farms[0]?.id || '');
  const [category, setCategory] = useState<TaskCategory>('irrigation');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assignedToId, setAssignedToId] = useState(users[0]?.id || '');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  // Filtering
  const filteredTasks = allTasks.filter(t => {
    if (selectedFarm !== 'all' && t.farmId !== selectedFarm) return false;
    if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
    if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    return true;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('error', 'Validation Error', 'Task title cannot be blank.');
      return;
    }

    const assignedUser = users.find(u => u.id === assignedToId);

    db.addTask({
      farmId,
      title,
      description,
      category,
      priority,
      status: 'pending',
      assignedToId: assignedUser?.id,
      assignedToName: assignedUser?.name,
      dueDate,
      createdBy: db.getCurrentUser().name,
    });

    showToast('success', 'Task Dispatched', `Field task "${title}" assigned to ${assignedUser?.name || 'Worker'}.`);
    setIsAddTaskOpen(false);
    setTitle('');
    setDescription('');
  };

  const handleConfirmComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeTaskId) return;

    db.updateTask(completeTaskId, {
      status: 'completed',
      completionNotes: completionNotes || 'Operation verified and finalized.',
    });

    showToast('success', 'Task Completed', 'Task logged as completed in farm records.');
    setCompleteTaskId(null);
    setCompletionNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Module D: Worker Dispatch</span>
            <span>·</span>
            <span>Farm Operations & Evidence</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Field Tasks & Operational Dispatch
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Assign duties to farm staff, establish due dates, and track completion evidence.
          </p>
        </div>

        <button
          onClick={() => setIsAddTaskOpen(true)}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Dispatch Field Task</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wider text-[11px] mr-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter Tasks:</span>
        </div>

        {/* Farm Filter */}
        <select
          value={selectedFarm}
          onChange={e => setSelectedFarm(e.target.value)}
          className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-slate-50"
        >
          <option value="all">All Farms</option>
          {farms.map(f => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-slate-50"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>

        {/* Priority Filter */}
        <select
          value={selectedPriority}
          onChange={e => setSelectedPriority(e.target.value)}
          className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-slate-50"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-slate-50"
        >
          <option value="all">All Categories</option>
          <option value="irrigation">Irrigation</option>
          <option value="fertilizing">Fertilizing</option>
          <option value="planting">Planting</option>
          <option value="inspection">Inspection</option>
          <option value="harvesting">Harvesting</option>
          <option value="weeding">Weeding</option>
          <option value="equipment">Equipment</option>
        </select>

        <span className="text-slate-400 text-xs ml-auto">
          Showing <strong>{filteredTasks.length}</strong> of {allTasks.length} tasks
        </span>
      </div>

      {/* Task Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F6] border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Task Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Assigned Worker</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No field tasks match the specified filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => {
                  const isOverdue = task.status === 'overdue';
                  return (
                    <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{task.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {task.description}
                        </p>
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-700 font-medium">
                        {task.category}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded ${
                            task.priority === 'urgent'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : task.priority === 'high'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {task.assignedToName || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                        {task.dueDate}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded ${
                            task.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isOverdue
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}
                        >
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {task.status !== 'completed' ? (
                          <button
                            onClick={() => {
                              setCompleteTaskId(task.id);
                              setCompletionNotes('');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-[#1B4332] bg-[#E8F5EE] hover:bg-[#D8F3DC] border border-[#B7E4C7] rounded transition-colors"
                          >
                            Mark Complete
                          </button>
                        ) : (
                          <span className="text-emerald-700 font-medium text-[11px]">
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Dispatch Task */}
      {isAddTaskOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddTaskOpen(false)}
          title="Dispatch Field Task"
          description="Assign an agricultural duty to field staff"
        >
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Task Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Sluice gate irrigation adjustment or foliar spray"
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Precise operational instructions, safety precautions, or dosage..."
                rows={3}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Farm</label>
                <select
                  value={farmId}
                  onChange={e => setFarmId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  {farms.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as TaskCategory)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="irrigation">Irrigation</option>
                  <option value="fertilizing">Fertilizing</option>
                  <option value="planting">Planting</option>
                  <option value="inspection">Inspection</option>
                  <option value="harvesting">Harvesting</option>
                  <option value="weeding">Weeding</option>
                  <option value="equipment">Equipment Maintenance</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Assign Worker</label>
                <select
                  value={assignedToId}
                  onChange={e => setAssignedToId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddTaskOpen(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg"
              >
                Dispatch Task
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Mark Complete */}
      {completeTaskId && (
        <Modal
          isOpen={true}
          onClose={() => setCompleteTaskId(null)}
          title="Confirm Task Completion"
          description="Log completion notes into official agricultural task audit trail"
        >
          <form onSubmit={handleConfirmComplete} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Completion Notes / Observations
              </label>
              <textarea
                value={completionNotes}
                onChange={e => setCompletionNotes(e.target.value)}
                placeholder="Details of operation executed, actual fertilizer weight applied, water levels confirmed..."
                rows={3}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompleteTaskId(null)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg"
              >
                Mark Task Completed
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
