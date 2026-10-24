import { executeQuery, withTransaction } from '../postgresPool';
import { Farm, LandPlot, UserRole, AreaUnit } from '../../../types';

function mapFarmRow(row: any): Farm {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    district: row.district,
    province: row.province,
    address: row.address,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    totalArea: Number(row.total_area),
    areaUnit: row.area_unit as AreaUnit,
    soilPrimary: row.soil_primary,
    irrigationPrimary: row.irrigation_primary,
    assignedWorkers: Array.isArray(row.assigned_workers) ? row.assigned_workers : [],
    status: row.status as 'active' | 'archived',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function mapPlotRow(row: any): LandPlot {
  return {
    id: row.id,
    farmId: row.farm_id,
    name: row.name,
    plotCode: row.plot_code,
    area: Number(row.area),
    areaUnit: row.area_unit as AreaUnit,
    soilType: row.soil_type,
    irrigationType: row.irrigation_type,
    status: row.status as any,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export const farmRepository = {
  async getFarms(userId?: string, userRole?: UserRole): Promise<Farm[]> {
    if (!userId || userRole === 'super_admin' || userRole === 'support_staff') {
      const res = await executeQuery('SELECT * FROM farms ORDER BY created_at DESC;');
      return res.rows.map(mapFarmRow);
    }

    const res = await executeQuery(
      `SELECT * FROM farms
       WHERE owner_id = $1 OR $1 = ANY(assigned_workers)
       ORDER BY created_at DESC;`,
      [userId]
    );
    return res.rows.map(mapFarmRow);
  },

  async getFarmById(id: string): Promise<Farm | null> {
    const res = await executeQuery('SELECT * FROM farms WHERE id = $1 LIMIT 1;', [id]);
    if (res.rows.length === 0) return null;
    return mapFarmRow(res.rows[0]);
  },

  async createFarm(farm: Farm): Promise<Farm> {
    const res = await executeQuery(
      `INSERT INTO farms (
         id, owner_id, name, district, province, address,
         latitude, longitude, total_area, area_unit, soil_primary, irrigation_primary,
         assigned_workers, status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *;`,
      [
        farm.id,
        farm.ownerId,
        farm.name.trim(),
        farm.district,
        farm.province,
        farm.address,
        farm.latitude,
        farm.longitude,
        farm.totalArea,
        farm.areaUnit || 'acres',
        farm.soilPrimary,
        farm.irrigationPrimary,
        farm.assignedWorkers || [],
        farm.status || 'active',
      ]
    );

    return mapFarmRow(res.rows[0]);
  },

  async updateFarm(id: string, updates: Partial<Farm>): Promise<Farm> {
    const existing = await this.getFarmById(id);
    if (!existing) throw new Error('Farm not found');

    const merged = { ...existing, ...updates };
    const res = await executeQuery(
      `UPDATE farms SET
         name = $2,
         district = $3,
         province = $4,
         address = $5,
         latitude = $6,
         longitude = $7,
         total_area = $8,
         area_unit = $9,
         soil_primary = $10,
         irrigation_primary = $11,
         assigned_workers = $12,
         status = $13,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *;`,
      [
        id,
        merged.name.trim(),
        merged.district,
        merged.province,
        merged.address,
        merged.latitude,
        merged.longitude,
        merged.totalArea,
        merged.areaUnit,
        merged.soilPrimary,
        merged.irrigationPrimary,
        merged.assignedWorkers || [],
        merged.status,
      ]
    );

    return mapFarmRow(res.rows[0]);
  },

  async deleteFarm(id: string): Promise<boolean> {
    return await withTransaction(async (client) => {
      await client.query('DELETE FROM land_plots WHERE farm_id = $1;', [id]);
      const res = await client.query('DELETE FROM farms WHERE id = $1;', [id]);
      return (res.rowCount || 0) > 0;
    });
  },

  async countFarms(): Promise<number> {
    const res = await executeQuery('SELECT COUNT(*)::int as count FROM farms;');
    return res.rows[0]?.count || 0;
  },

  // --- PLOTS ---
  async getPlots(farmId?: string): Promise<LandPlot[]> {
    if (farmId) {
      const res = await executeQuery(
        'SELECT * FROM land_plots WHERE farm_id = $1 ORDER BY plot_code ASC;',
        [farmId]
      );
      return res.rows.map(mapPlotRow);
    }
    const res = await executeQuery('SELECT * FROM land_plots ORDER BY created_at DESC;');
    return res.rows.map(mapPlotRow);
  },

  async getPlotById(id: string): Promise<LandPlot | null> {
    const res = await executeQuery('SELECT * FROM land_plots WHERE id = $1 LIMIT 1;', [id]);
    if (res.rows.length === 0) return null;
    return mapPlotRow(res.rows[0]);
  },

  async createPlot(plot: LandPlot): Promise<LandPlot> {
    // Check farm exists
    const farm = await this.getFarmById(plot.farmId);
    if (!farm) {
      throw new Error(`Cannot add plot: Farm '${plot.farmId}' does not exist.`);
    }

    const res = await executeQuery(
      `INSERT INTO land_plots (
         id, farm_id, name, plot_code, area, area_unit, soil_type, irrigation_type, status, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       RETURNING *;`,
      [
        plot.id,
        plot.farmId,
        plot.name.trim(),
        plot.plotCode.trim().toUpperCase(),
        plot.area,
        plot.areaUnit || 'acres',
        plot.soilType,
        plot.irrigationType,
        plot.status || 'cultivated',
      ]
    );

    return mapPlotRow(res.rows[0]);
  },

  async updatePlot(id: string, updates: Partial<LandPlot>): Promise<LandPlot> {
    const existing = await this.getPlotById(id);
    if (!existing) throw new Error('Land plot not found');

    const merged = { ...existing, ...updates };
    const res = await executeQuery(
      `UPDATE land_plots SET
         name = $2,
         plot_code = $3,
         area = $4,
         area_unit = $5,
         soil_type = $6,
         irrigation_type = $7,
         status = $8
       WHERE id = $1
       RETURNING *;`,
      [
        id,
        merged.name.trim(),
        merged.plotCode.trim().toUpperCase(),
        merged.area,
        merged.areaUnit,
        merged.soilType,
        merged.irrigationType,
        merged.status,
      ]
    );

    return mapPlotRow(res.rows[0]);
  },

  async deletePlot(id: string): Promise<boolean> {
    const res = await executeQuery('DELETE FROM land_plots WHERE id = $1;', [id]);
    return (res.rowCount || 0) > 0;
  },

  async countPlots(): Promise<number> {
    const res = await executeQuery('SELECT COUNT(*)::int as count FROM land_plots;');
    return res.rows[0]?.count || 0;
  },
};
