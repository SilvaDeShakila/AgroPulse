import { executeQuery } from '../postgresPool';
import { CropCycle, CropObservation, GrowthStage, UserRole } from '../../../types';

function mapCycleRow(row: any): CropCycle {
  return {
    id: row.id,
    farmId: row.farm_id,
    plotId: row.plot_id,
    cropName: row.crop_name || row.crop_type,
    cropType: row.crop_type || row.crop_name,
    variety: row.variety,
    category: row.category as any,
    season: row.season as any,
    startDate: row.start_date instanceof Date ? row.start_date.toISOString().split('T')[0] : String(row.start_date),
    expectedHarvestDate: row.expected_harvest_date instanceof Date ? row.expected_harvest_date.toISOString().split('T')[0] : String(row.expected_harvest_date),
    actualHarvestDate: row.actual_harvest_date ? (row.actual_harvest_date instanceof Date ? row.actual_harvest_date.toISOString().split('T')[0] : String(row.actual_harvest_date)) : undefined,
    stage: (row.stage || row.current_stage) as GrowthStage,
    currentStage: (row.current_stage || row.stage) as GrowthStage,
    targetYieldKg: Number(row.target_yield_kg),
    actualYieldKg: Number(row.actual_yield_kg || 0),
    status: row.status as any,
    notes: row.notes || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function mapObservationRow(row: any): CropObservation {
  return {
    id: row.id,
    cropCycleId: row.crop_cycle_id,
    farmId: row.farm_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorRole: row.author_role as UserRole,
    date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date),
    stage: row.stage,
    healthStatus: row.health_status,
    observationType: row.observation_type as any,
    severity: row.severity as any,
    title: row.title,
    description: row.description,
    recommendation: row.recommendation || undefined,
    imageUrl: row.image_url || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export const cropRepository = {
  async getCropCycles(farmId?: string): Promise<CropCycle[]> {
    if (farmId) {
      const res = await executeQuery(
        'SELECT * FROM crop_cycles WHERE farm_id = $1 ORDER BY start_date DESC;',
        [farmId]
      );
      return res.rows.map(mapCycleRow);
    }
    const res = await executeQuery('SELECT * FROM crop_cycles ORDER BY created_at DESC;');
    return res.rows.map(mapCycleRow);
  },

  async getCropCycleById(id: string): Promise<CropCycle | null> {
    const res = await executeQuery('SELECT * FROM crop_cycles WHERE id = $1 LIMIT 1;', [id]);
    if (res.rows.length === 0) return null;
    return mapCycleRow(res.rows[0]);
  },

  async createCropCycle(cycle: CropCycle): Promise<CropCycle> {
    const res = await executeQuery(
      `INSERT INTO crop_cycles (
         id, farm_id, plot_id, crop_name, crop_type, variety, category,
         season, start_date, expected_harvest_date, stage, current_stage,
         target_yield_kg, actual_yield_kg, status, notes, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
       RETURNING *;`,
      [
        cycle.id,
        cycle.farmId,
        cycle.plotId,
        cycle.cropName || cycle.cropType,
        cycle.cropType || cycle.cropName,
        cycle.variety,
        cycle.category || 'Commercial Plantation',
        cycle.season,
        cycle.startDate,
        cycle.expectedHarvestDate,
        cycle.stage || cycle.currentStage || 'Land Preparation',
        cycle.currentStage || cycle.stage || 'Land Preparation',
        cycle.targetYieldKg,
        cycle.actualYieldKg || 0,
        cycle.status || 'in_progress',
        cycle.notes || null,
      ]
    );

    return mapCycleRow(res.rows[0]);
  },

  async advanceCropStage(id: string, newStage: GrowthStage): Promise<CropCycle> {
    const isHarvested = newStage === 'Harvested';
    const actualHarvestDate = isHarvested ? new Date().toISOString().split('T')[0] : null;
    const newStatus = isHarvested ? 'completed' : 'in_progress';

    const res = await executeQuery(
      `UPDATE crop_cycles SET
         stage = $2,
         current_stage = $2,
         status = CASE WHEN $3 = true THEN 'completed' ELSE status END,
         actual_harvest_date = CASE WHEN $3 = true THEN CURRENT_DATE ELSE actual_harvest_date END
       WHERE id = $1
       RETURNING *;`,
      [id, newStage, isHarvested]
    );

    if (res.rows.length === 0) throw new Error('Crop cycle not found');
    return mapCycleRow(res.rows[0]);
  },

  async countCycles(): Promise<number> {
    const res = await executeQuery('SELECT COUNT(*)::int as count FROM crop_cycles;');
    return res.rows[0]?.count || 0;
  },

  // --- OBSERVATIONS ---
  async getObservations(cycleId?: string): Promise<CropObservation[]> {
    if (cycleId) {
      const res = await executeQuery(
        'SELECT * FROM crop_observations WHERE crop_cycle_id = $1 ORDER BY date DESC, created_at DESC;',
        [cycleId]
      );
      return res.rows.map(mapObservationRow);
    }
    const res = await executeQuery('SELECT * FROM crop_observations ORDER BY created_at DESC;');
    return res.rows.map(mapObservationRow);
  },

  async createObservation(obs: CropObservation): Promise<CropObservation> {
    const res = await executeQuery(
      `INSERT INTO crop_observations (
         id, crop_cycle_id, farm_id, author_id, author_name, author_role,
         date, stage, health_status, observation_type, severity,
         title, description, recommendation, image_url, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
       RETURNING *;`,
      [
        obs.id,
        obs.cropCycleId,
        obs.farmId,
        obs.authorId,
        obs.authorName,
        obs.authorRole,
        obs.date,
        obs.stage || 'Vegetative',
        obs.healthStatus || 'good',
        obs.observationType,
        obs.severity,
        obs.title.trim(),
        obs.description.trim(),
        obs.recommendation || null,
        obs.imageUrl || null,
      ]
    );

    return mapObservationRow(res.rows[0]);
  },
};
