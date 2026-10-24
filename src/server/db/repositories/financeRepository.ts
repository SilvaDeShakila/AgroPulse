import { executeQuery } from '../postgresPool';
import { Expense, HarvestRecord } from '../../../types';

function mapHarvestRow(row: any): HarvestRecord {
  const qty = Number(row.quantity);
  const price = Number(row.market_unit_price);
  const revenue = Number(row.total_revenue || qty * price);

  return {
    id: row.id,
    farmId: row.farm_id,
    cropCycleId: row.crop_cycle_id,
    cropName: row.crop_name,
    plotName: row.plot_name || 'Plot 1',
    harvestDate: row.harvest_date instanceof Date ? row.harvest_date.toISOString().split('T')[0] : String(row.harvest_date),
    quantity: qty,
    unit: row.unit as any,
    qualityGrade: row.quality_grade as any,
    estimatedMarketPricePerUnit: price,
    marketUnitPrice: price,
    marketPricePerUnit: price,
    estimatedRevenue: revenue,
    totalRevenue: revenue,
    revenue,
    storageLocation: row.storage_location || 'Estate Storage',
    recordedBy: row.recorded_by || 'Estate Officer',
    notes: row.notes || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function mapExpenseRow(row: any): Expense {
  return {
    id: row.id,
    farmId: row.farm_id,
    cropCycleId: row.crop_cycle_id || undefined,
    category: row.category as any,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency || 'LKR',
    date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date),
    recordedBy: row.recorded_by || 'Finance Officer',
    vendor: row.vendor || undefined,
    paymentStatus: row.payment_status || 'paid',
    receiptReference: row.receipt_reference || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export const financeRepository = {
  async getHarvests(farmId?: string): Promise<HarvestRecord[]> {
    if (farmId) {
      const res = await executeQuery(
        'SELECT * FROM harvest_records WHERE farm_id = $1 ORDER BY harvest_date DESC;',
        [farmId]
      );
      return res.rows.map(mapHarvestRow);
    }
    const res = await executeQuery('SELECT * FROM harvest_records ORDER BY harvest_date DESC;');
    return res.rows.map(mapHarvestRow);
  },

  async createHarvest(record: HarvestRecord): Promise<HarvestRecord> {
    const res = await executeQuery(
      `INSERT INTO harvest_records (
         id, farm_id, crop_cycle_id, crop_name, plot_name,
         harvest_date, quantity, unit, quality_grade, market_unit_price,
         total_revenue, storage_location, recorded_by, notes, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
       RETURNING *;`,
      [
        record.id,
        record.farmId,
        record.cropCycleId,
        record.cropName,
        record.plotName || 'Main Plot',
        record.harvestDate,
        record.quantity,
        record.unit,
        record.qualityGrade,
        record.marketUnitPrice ?? record.estimatedMarketPricePerUnit ?? 0,
        record.totalRevenue ?? record.estimatedRevenue ?? 0,
        record.storageLocation || 'Main Cold Storage',
        record.recordedBy || 'System',
        record.notes || null,
      ]
    );

    return mapHarvestRow(res.rows[0]);
  },

  async getExpenses(farmId?: string): Promise<Expense[]> {
    if (farmId) {
      const res = await executeQuery(
        'SELECT * FROM expenses WHERE farm_id = $1 ORDER BY date DESC;',
        [farmId]
      );
      return res.rows.map(mapExpenseRow);
    }
    const res = await executeQuery('SELECT * FROM expenses ORDER BY date DESC;');
    return res.rows.map(mapExpenseRow);
  },

  async createExpense(expense: Expense): Promise<Expense> {
    const res = await executeQuery(
      `INSERT INTO expenses (
         id, farm_id, crop_cycle_id, category, description,
         amount, currency, date, vendor, recorded_by,
         payment_status, receipt_reference, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
       RETURNING *;`,
      [
        expense.id,
        expense.farmId,
        expense.cropCycleId || null,
        expense.category,
        expense.description.trim(),
        expense.amount,
        expense.currency || 'LKR',
        expense.date,
        expense.vendor || null,
        expense.recordedBy || 'System',
        expense.paymentStatus || 'paid',
        expense.receiptReference || null,
      ]
    );

    return mapExpenseRow(res.rows[0]);
  },

  async getFinancialSummary(farmId?: string): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMarginPercent: number;
    harvestCount: number;
    expenseCount: number;
  }> {
    let harvestSql = 'SELECT COALESCE(SUM(total_revenue), 0)::numeric as total_rev, COUNT(*)::int as harvest_count FROM harvest_records';
    let expenseSql = 'SELECT COALESCE(SUM(amount), 0)::numeric as total_exp, COUNT(*)::int as expense_count FROM expenses';
    const params: any[] = [];

    if (farmId) {
      params.push(farmId);
      harvestSql += ' WHERE farm_id = $1';
      expenseSql += ' WHERE farm_id = $1';
    }

    const [hRes, eRes] = await Promise.all([
      executeQuery(harvestSql, params),
      executeQuery(expenseSql, params),
    ]);

    const totalRevenue = Math.round(Number(hRes.rows[0]?.total_rev || 0) * 100) / 100;
    const totalExpenses = Math.round(Number(eRes.rows[0]?.total_exp || 0) * 100) / 100;
    const netProfit = Math.round((totalRevenue - totalExpenses) * 100) / 100;
    const profitMarginPercent = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMarginPercent,
      harvestCount: Number(hRes.rows[0]?.harvest_count || 0),
      expenseCount: Number(eRes.rows[0]?.expense_count || 0),
    };
  },
};
