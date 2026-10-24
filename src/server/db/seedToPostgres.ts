import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { checkPostgresConnection, withTransaction, closePostgresPool } from './postgresPool';
import {
  SEED_USERS,
  SEED_FARMS,
  SEED_PLOTS,
  SEED_CYCLES,
  SEED_OBSERVATIONS,
  SEED_TASKS,
  SEED_INVENTORY,
  SEED_STOCK_MOVEMENTS,
  SEED_SUPPLIERS,
  SEED_EXPENSES,
  SEED_HARVESTS,
  SEED_PRODUCE_LISTINGS,
  SEED_ORDERS,
  SEED_AUDIT_LOGS,
} from '../../data/seedData';
import { userRepository } from './repositories/userRepository';
import { farmRepository } from './repositories/farmRepository';
import { cropRepository } from './repositories/cropRepository';
import { taskRepository } from './repositories/taskRepository';
import { inventoryRepository } from './repositories/inventoryRepository';
import { financeRepository } from './repositories/financeRepository';
import { marketplaceRepository } from './repositories/marketplaceRepository';
import { auditRepository } from './repositories/auditRepository';

export async function seedPostgresDatabase(): Promise<{ success: boolean; message: string }> {
  const status = await checkPostgresConnection();
  if (!status.connected) {
    return {
      success: false,
      message: `Cannot seed PostgreSQL: Database is not connected (${status.error || 'DATABASE_URL not set'}).`,
    };
  }

  // Security Policy: Never automatically seed predictable demonstration passwords or default accounts
  // into a live database without explicit administrator flag.
  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    return {
      success: false,
      message:
        'SECURITY POLICY ENFORCED: Seeding default demonstration accounts and predictable passwords into a live PostgreSQL database is blocked by default to protect production security. To populate demo data for testing or development, execute with ALLOW_DEMO_SEED=true. To securely provision a Super Admin account without demo credentials, use `npm run db:provision-admin`.',
    };
  }

  // Check if users already seeded
  const userCount = await userRepository.count();
  if (userCount > 0) {
    return {
      success: true,
      message: `PostgreSQL database already contains ${userCount} users. Skipping seed to prevent duplicate records.`,
    };
  }

  console.log('[AgroPulse Seed] Explicit demo seed authorized (ALLOW_DEMO_SEED=true). Seeding baseline data...');

  // Use randomized salt
  const defaultPasswordHash = bcrypt.hashSync(process.env.DEMO_USER_PASSWORD || 'AgroPulse2026!', 10);

  // 1. Seed Users
  for (const user of SEED_USERS) {
    await userRepository.createUser({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: defaultPasswordHash,
      role: user.role,
      district: user.district,
      organization: user.organization,
      phone: user.phone,
    });
  }
  console.log(`[AgroPulse Seed] ✓ Inserted ${SEED_USERS.length} demonstration users.`);

  // 2. Seed Farms
  for (const farm of SEED_FARMS) {
    await farmRepository.createFarm({
      ...farm,
      assignedWorkers: farm.assignedWorkers || [],
    });
  }
  console.log(`[AgroPulse Seed] ✓ Inserted ${SEED_FARMS.length} farms.`);

  // 3. Seed Land Plots
  for (const plot of SEED_PLOTS) {
    await farmRepository.createPlot({
      ...plot,
    });
  }
  console.log(`[AgroPulse Seed] ✓ Inserted ${SEED_PLOTS.length} land plots.`);

  // 4. Seed Crop Cycles
  for (const cycle of SEED_CYCLES) {
    await cropRepository.createCropCycle({
      ...cycle,
    });
  }
  console.log(`[AgroPulse Seed] ✓ Inserted ${SEED_CYCLES.length} crop cycles.`);

  // 5. Seed Observations
  for (const obs of SEED_OBSERVATIONS) {
    await cropRepository.createObservation({
      ...obs,
    });
  }
  console.log(`[AgroPulse Seed] ✓ Inserted ${SEED_OBSERVATIONS.length} observations.`);

  // 6. Seed Tasks
  for (const task of SEED_TASKS) {
    await taskRepository.createTask({
      ...task,
    });
  }
  console.log(`[AgroPulse Seed] ✓ Inserted ${SEED_TASKS.length} tasks.`);

  // 7. Seed Suppliers
  for (const sup of SEED_SUPPLIERS) {
    await inventoryRepository.createSupplier({
      ...sup,
    });
  }
  console.log(`[AgroPulse Seed] ✓ Inserted ${SEED_SUPPLIERS.length} suppliers.`);

  // 8. Seed Inventory Items
  for (const item of SEED_INVENTORY) {
    await inventoryRepository.createInventoryItem({
      ...item,
    });
  }
  console.log(`[AgroPulse Seed] ✓ Inserted ${SEED_INVENTORY.length} inventory items.`);

  // 9. Seed Stock Movements
  for (const mov of SEED_STOCK_MOVEMENTS) {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO stock_movements (
           id, farm_id, inventory_item_id, inventory_item_name, type,
           quantity, previous_stock, new_stock, reason,
           performed_by_id, performed_by_name, created_at, timestamp
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO NOTHING;`,
        [
          mov.id,
          mov.farmId,
          mov.inventoryItemId,
          mov.inventoryItemName || 'Inventory Item',
          mov.type,
          mov.quantity,
          mov.previousStock,
          mov.newStock,
          mov.reason || 'Baseline initialization',
          mov.performedById || 'system',
          mov.performedByName || 'System Initializer',
        ]
      );
    });
  }
  console.log(`[AgroPulse Seed] ✓ Inserted ${SEED_STOCK_MOVEMENTS.length} stock movements.`);

  // 10. Seed Expenses
  for (const exp of SEED_EXPENSES) {
    await financeRepository.createExpense({
      ...exp,
    });
  }
  console.log(`[AgroPulse Seed] ✓ Inserted ${SEED_EXPENSES.length} expenses.`);

  // 11. Seed Harvests
  for (const hrv of SEED_HARVESTS) {
    await financeRepository.createHarvest({
      ...hrv,
    });
  }
  console.log(`[AgroPulse Seed] ✓ Inserted ${SEED_HARVESTS.length} harvests.`);

  // 12. Seed Produce Listings
  for (const listing of SEED_PRODUCE_LISTINGS) {
    await marketplaceRepository.createProduceListing({
      ...listing,
    });
  }
  console.log(`[AgroPulse Seed] ✓ Inserted ${SEED_PRODUCE_LISTINGS.length} produce listings.`);

  // 13. Seed Orders & Order Items
  for (const order of SEED_ORDERS) {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO marketplace_orders (
           id, order_number, buyer_id, buyer_name, buyer_email, buyer_phone,
           delivery_address, district, status, payment_method, payment_status,
           total_amount, currency, notes, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'LKR', $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO NOTHING;`,
        [
          order.id,
          order.orderNumber,
          order.buyerId,
          order.buyerName,
          order.buyerEmail,
          order.buyerPhone,
          order.deliveryAddress,
          order.district,
          order.status,
          order.paymentMethod,
          order.paymentStatus,
          order.totalAmount,
          order.notes || null,
        ]
      );

      for (const item of order.items) {
        const itemId = `oi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await client.query(
          `INSERT INTO order_items (
             id, order_id, listing_id, crop_name, quantity, unit, price_per_unit, subtotal
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING;`,
          [
            itemId,
            order.id,
            item.listingId,
            item.cropName,
            item.quantity,
            item.unit,
            item.pricePerUnit || item.unitPrice || 0,
            item.subtotal,
          ]
        );
      }
    });
  }
  console.log(`[AgroPulse Seed] ✓ Inserted ${SEED_ORDERS.length} orders with items.`);

  // 14. Seed Audit Logs
  for (const log of SEED_AUDIT_LOGS) {
    await auditRepository.logAudit({
      ...log,
    });
  }
  console.log(`[AgroPulse Seed] ✓ Inserted ${SEED_AUDIT_LOGS.length} audit logs.`);

  return {
    success: true,
    message: 'PostgreSQL database seeded successfully with demonstration baseline data.',
  };
}

// CLI entry point
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('seedToPostgres.ts') || process.argv[1].endsWith('seedToPostgres.js'));

if (isMain) {
  seedPostgresDatabase()
    .then((res) => {
      console.log(`\n${res.success ? '✓' : '✗'} ${res.message}`);
      process.exit(res.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('\n✗ Fatal seeding error:', err);
      process.exit(1);
    })
    .finally(() => {
      closePostgresPool();
    });
}
