import { executeQuery, withTransaction } from '../postgresPool';
import { InventoryItem, StockMovement, Supplier, InventoryCategory } from '../../../types';

function mapItemRow(row: any): InventoryItem {
  return {
    id: row.id,
    farmId: row.farm_id,
    name: row.name,
    sku: row.sku,
    category: row.category as InventoryCategory,
    unit: row.unit as any,
    currentStock: Number(row.current_stock),
    minReorderLevel: Number(row.min_reorder_level ?? row.reorder_threshold ?? 10),
    reorderThreshold: Number(row.reorder_threshold ?? row.min_reorder_level ?? 10),
    costPerUnit: Number(row.unit_cost ?? row.cost_per_unit ?? 0),
    unitCost: Number(row.unit_cost ?? row.cost_per_unit ?? 0),
    supplierId: row.supplier_id || undefined,
    locationStorage: row.location || row.location_storage || 'Main Storage',
    location: row.location || row.location_storage || 'Main Storage',
    status: row.status as any,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function mapMovementRow(row: any): StockMovement {
  return {
    id: row.id,
    farmId: row.farm_id,
    inventoryItemId: row.inventory_item_id,
    inventoryItemName: row.inventory_item_name || undefined,
    type: row.type as any,
    quantity: Number(row.quantity),
    previousStock: Number(row.previous_stock),
    newStock: Number(row.new_stock),
    reason: row.reason,
    referenceReason: row.reason,
    performedById: row.performed_by_id || undefined,
    performedByName: row.performed_by_name || 'System',
    actorId: row.performed_by_id || undefined,
    actorName: row.performed_by_name || 'System',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
  };
}

function mapSupplierRow(row: any): Supplier {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    email: row.email,
    phone: row.phone,
    district: row.district,
    categoriesSupplied: Array.isArray(row.categories_supplied) ? row.categories_supplied : (row.category ? [row.category] : []),
    rating: Number(row.rating || 4.5),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export const inventoryRepository = {
  async getInventory(farmId?: string): Promise<InventoryItem[]> {
    if (farmId) {
      const res = await executeQuery(
        'SELECT * FROM inventory_items WHERE farm_id = $1 ORDER BY name ASC;',
        [farmId]
      );
      return res.rows.map(mapItemRow);
    }
    const res = await executeQuery('SELECT * FROM inventory_items ORDER BY created_at DESC;');
    return res.rows.map(mapItemRow);
  },

  async getInventoryItemById(id: string): Promise<InventoryItem | null> {
    const res = await executeQuery('SELECT * FROM inventory_items WHERE id = $1 LIMIT 1;', [id]);
    if (res.rows.length === 0) return null;
    return mapItemRow(res.rows[0]);
  },

  async createInventoryItem(item: InventoryItem): Promise<InventoryItem> {
    const res = await executeQuery(
      `INSERT INTO inventory_items (
         id, farm_id, name, category, sku, current_stock, unit,
         reorder_threshold, min_reorder_level, unit_cost, cost_per_unit,
         location, location_storage, supplier_id, status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *;`,
      [
        item.id,
        item.farmId,
        item.name.trim(),
        item.category,
        item.sku?.trim().toUpperCase(),
        item.currentStock,
        item.unit,
        item.reorderThreshold ?? item.minReorderLevel ?? 10,
        item.minReorderLevel ?? item.reorderThreshold ?? 10,
        item.unitCost ?? item.costPerUnit ?? 0,
        item.costPerUnit ?? item.unitCost ?? 0,
        item.location || item.locationStorage || 'Main Warehouse',
        item.locationStorage || item.location || 'Main Warehouse',
        item.supplierId || null,
        item.status || 'in_stock',
      ]
    );

    return mapItemRow(res.rows[0]);
  },

  // Strictly enforced transactional non-negative stock deduction using row-level locking
  async issueStock(
    itemId: string,
    quantity: number,
    reason: string,
    userId: string,
    userName: string
  ): Promise<{ success: boolean; movement?: StockMovement; error?: string }> {
    if (quantity <= 0) {
      return { success: false, error: 'Issue quantity must be greater than zero.' };
    }

    try {
      const movement = await withTransaction(async (client) => {
        // Step 1: Lock target item row with SELECT ... FOR UPDATE
        const itemRes = await client.query(
          `SELECT id, farm_id, name, unit, current_stock, reorder_threshold, min_reorder_level
           FROM inventory_items
           WHERE id = $1
           FOR UPDATE;`,
          [itemId]
        );

        if (itemRes.rows.length === 0) {
          throw new Error('Inventory item SKU not found.');
        }

        const item = itemRes.rows[0];
        const prevStock = Number(item.current_stock);

        if (prevStock < quantity) {
          throw new Error(
            `Insufficient stock for '${item.name}'. Available: ${prevStock} ${item.unit}, requested: ${quantity} ${item.unit}. Non-negative inventory constraint enforced.`
          );
        }

        const newStock = prevStock - quantity;
        const reorderLimit = Number(item.reorder_threshold ?? item.min_reorder_level ?? 10);
        const newStatus = newStock === 0 ? 'out_of_stock' : newStock <= reorderLimit ? 'low_stock' : 'in_stock';

        // Step 2: Update stock balance
        await client.query(
          `UPDATE inventory_items
           SET current_stock = $2, status = $3, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1;`,
          [itemId, newStock, newStatus]
        );

        // Step 3: Record immutable stock movement ledger entry
        const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const movRes = await client.query(
          `INSERT INTO stock_movements (
             id, farm_id, inventory_item_id, inventory_item_name, type,
             quantity, previous_stock, new_stock, reason,
             performed_by_id, performed_by_name, created_at, timestamp
           ) VALUES ($1, $2, $3, $4, 'issued', $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING *;`,
          [
            movementId,
            item.farm_id,
            item.id,
            item.name,
            quantity,
            prevStock,
            newStock,
            reason,
            userId,
            userName,
          ]
        );

        return mapMovementRow(movRes.rows[0]);
      });

      return { success: true, movement };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Stock Replenishment Receive
  async receiveStock(
    itemId: string,
    quantity: number,
    unitCost: number,
    userId: string,
    userName: string
  ): Promise<{ success: boolean; movement?: StockMovement; error?: string }> {
    if (quantity <= 0) {
      return { success: false, error: 'Received quantity must be greater than zero.' };
    }

    try {
      const movement = await withTransaction(async (client) => {
        const itemRes = await client.query(
          `SELECT id, farm_id, name, unit, current_stock, reorder_threshold, min_reorder_level
           FROM inventory_items
           WHERE id = $1
           FOR UPDATE;`,
          [itemId]
        );

        if (itemRes.rows.length === 0) {
          throw new Error('Inventory item SKU not found.');
        }

        const item = itemRes.rows[0];
        const prevStock = Number(item.current_stock);
        const newStock = prevStock + quantity;
        const reorderLimit = Number(item.reorder_threshold ?? item.min_reorder_level ?? 10);
        const newStatus = newStock <= reorderLimit ? 'low_stock' : 'in_stock';

        let updateSql = `UPDATE inventory_items SET current_stock = $2, status = $3, updated_at = CURRENT_TIMESTAMP`;
        const params: any[] = [itemId, newStock, newStatus];

        if (unitCost > 0) {
          params.push(unitCost);
          updateSql += `, unit_cost = $${params.length}, cost_per_unit = $${params.length}`;
        }
        updateSql += ` WHERE id = $1;`;

        await client.query(updateSql, params);

        const movementId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const movRes = await client.query(
          `INSERT INTO stock_movements (
             id, farm_id, inventory_item_id, inventory_item_name, type,
             quantity, previous_stock, new_stock, reason,
             performed_by_id, performed_by_name, created_at, timestamp
           ) VALUES ($1, $2, $3, $4, 'received', $5, $6, $7, 'Stock replenishment received from supplier', $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING *;`,
          [
            movementId,
            item.farm_id,
            item.id,
            item.name,
            quantity,
            prevStock,
            newStock,
            userId,
            userName,
          ]
        );

        return mapMovementRow(movRes.rows[0]);
      });

      return { success: true, movement };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async getStockMovements(farmId?: string): Promise<StockMovement[]> {
    if (farmId) {
      const res = await executeQuery(
        'SELECT * FROM stock_movements WHERE farm_id = $1 ORDER BY timestamp DESC;',
        [farmId]
      );
      return res.rows.map(mapMovementRow);
    }
    const res = await executeQuery('SELECT * FROM stock_movements ORDER BY timestamp DESC LIMIT 200;');
    return res.rows.map(mapMovementRow);
  },

  async countInventory(): Promise<number> {
    const res = await executeQuery('SELECT COUNT(*)::int as count FROM inventory_items;');
    return res.rows[0]?.count || 0;
  },

  // --- SUPPLIERS ---
  async getSuppliers(): Promise<Supplier[]> {
    const res = await executeQuery('SELECT * FROM suppliers ORDER BY name ASC;');
    return res.rows.map(mapSupplierRow);
  },

  async createSupplier(sup: Supplier): Promise<Supplier> {
    const primaryCategory = sup.categoriesSupplied?.[0] || 'General Agriculture';
    const res = await executeQuery(
      `INSERT INTO suppliers (
         id, name, category, contact_person, email, phone, district, categories_supplied, rating, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       RETURNING *;`,
      [
        sup.id,
        sup.name.trim(),
        primaryCategory,
        sup.contactPerson,
        sup.email,
        sup.phone,
        sup.district,
        sup.categoriesSupplied || [primaryCategory],
        sup.rating || 4.5,
      ]
    );

    return mapSupplierRow(res.rows[0]);
  },
};
