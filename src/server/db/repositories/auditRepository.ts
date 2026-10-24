import { executeQuery } from '../postgresPool';
import { AuditLog } from '../../../types';

function mapAuditRow(row: any): AuditLog {
  return {
    id: row.id,
    action: row.action as any,
    entity: row.entity_type as any,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorId: row.user_id,
    actorName: row.actor_name || 'System',
    actorRole: row.user_role as any,
    userId: row.user_id,
    userRole: row.user_role,
    details: row.details,
    ipAddress: row.ip_address || '127.0.0.1',
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
  };
}

export const auditRepository = {
  async logAudit(log: AuditLog): Promise<AuditLog> {
    const res = await executeQuery(
      `INSERT INTO audit_logs (
         id, action, entity_type, entity_id, user_id, user_role,
         actor_name, details, ip_address, timestamp
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       RETURNING *;`,
      [
        log.id,
        log.action,
        log.entityType || log.entity || 'SYSTEM',
        log.entityId,
        log.userId || log.actorId || 'system',
        log.userRole || log.actorRole || 'system',
        log.actorName || 'System',
        log.details,
        log.ipAddress || '127.0.0.1',
      ]
    );

    return mapAuditRow(res.rows[0]);
  },

  async getAuditLogs(limit = 200): Promise<AuditLog[]> {
    const res = await executeQuery(
      `SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT $1;`,
      [limit]
    );
    return res.rows.map(mapAuditRow);
  },

  async countAuditLogs(): Promise<number> {
    const res = await executeQuery('SELECT COUNT(*)::int as count FROM audit_logs;');
    return res.rows[0]?.count || 0;
  },
};
