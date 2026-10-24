import { executeQuery } from '../postgresPool';
import { FarmTask, TaskCategory, TaskPriority, TaskStatus } from '../../../types';

function mapTaskRow(row: any): FarmTask {
  return {
    id: row.id,
    farmId: row.farm_id,
    plotId: row.plot_id || undefined,
    cropCycleId: row.crop_cycle_id || undefined,
    title: row.title,
    description: row.description || '',
    category: row.category as TaskCategory,
    priority: row.priority as TaskPriority,
    status: row.status as TaskStatus,
    assignedToId: row.assigned_to_id || undefined,
    assignedToName: row.assigned_to_name || undefined,
    dueDate: row.due_date instanceof Date ? row.due_date.toISOString().split('T')[0] : String(row.due_date),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
    completionNotes: row.completion_notes || undefined,
    createdBy: row.created_by || 'System',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export const taskRepository = {
  async getTasks(farmId?: string, assignedToId?: string): Promise<FarmTask[]> {
    let sql = 'SELECT * FROM farm_tasks WHERE 1=1';
    const params: any[] = [];

    if (farmId) {
      params.push(farmId);
      sql += ` AND farm_id = $${params.length}`;
    }

    if (assignedToId) {
      params.push(assignedToId);
      sql += ` AND assigned_to_id = $${params.length}`;
    }

    sql += ' ORDER BY due_date ASC, created_at DESC;';
    const res = await executeQuery(sql, params);
    return res.rows.map(mapTaskRow);
  },

  async getTaskById(id: string): Promise<FarmTask | null> {
    const res = await executeQuery('SELECT * FROM farm_tasks WHERE id = $1 LIMIT 1;', [id]);
    if (res.rows.length === 0) return null;
    return mapTaskRow(res.rows[0]);
  },

  async createTask(task: FarmTask): Promise<FarmTask> {
    const res = await executeQuery(
      `INSERT INTO farm_tasks (
         id, farm_id, plot_id, crop_cycle_id, title, description,
         category, priority, status, assigned_to_id, assigned_to_name,
         due_date, created_by, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
       RETURNING *;`,
      [
        task.id,
        task.farmId,
        task.plotId || null,
        task.cropCycleId || null,
        task.title.trim(),
        task.description || '',
        task.category || 'irrigation',
        task.priority || 'medium',
        task.status || 'pending',
        task.assignedToId || null,
        task.assignedToName || null,
        task.dueDate,
        task.createdBy || 'System',
      ]
    );

    return mapTaskRow(res.rows[0]);
  },

  async updateTaskStatus(
    id: string,
    status: TaskStatus,
    notes?: string,
    completedAt?: string
  ): Promise<FarmTask> {
    const isCompleted = status === 'completed';
    const completedTimestamp = isCompleted ? (completedAt || new Date().toISOString()) : null;

    const res = await executeQuery(
      `UPDATE farm_tasks SET
         status = $2,
         completion_notes = COALESCE($3, completion_notes),
         completed_at = CASE WHEN $2 = 'completed' THEN COALESCE($4, CURRENT_TIMESTAMP) ELSE NULL END
       WHERE id = $1
       RETURNING *;`,
      [id, status, notes || null, completedTimestamp]
    );

    if (res.rows.length === 0) throw new Error('Task not found');
    return mapTaskRow(res.rows[0]);
  },

  async countTasks(): Promise<number> {
    const res = await executeQuery('SELECT COUNT(*)::int as count FROM farm_tasks;');
    return res.rows[0]?.count || 0;
  },
};
