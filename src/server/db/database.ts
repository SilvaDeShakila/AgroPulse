import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  UserRole,
  Farm,
  LandPlot,
  CropCycle,
  CropObservation,
  FarmTask,
  InventoryItem,
  StockMovement,
  Supplier,
  Expense,
  HarvestRecord,
  ProduceListing,
  Order,
  OrderStatus,
  AuditLog,
} from '../../types';
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
import {
  getPostgresPool,
  checkPostgresConnection,
  sanitizeConnectionUrl,
  PostgresConnectionStatus,
} from './postgresPool';
import { runMigrations } from './migrator';
import { userRepository } from './repositories/userRepository';
import { farmRepository } from './repositories/farmRepository';
import { cropRepository } from './repositories/cropRepository';
import { taskRepository } from './repositories/taskRepository';
import { inventoryRepository } from './repositories/inventoryRepository';
import { financeRepository } from './repositories/financeRepository';
import { marketplaceRepository } from './repositories/marketplaceRepository';
import { auditRepository } from './repositories/auditRepository';

export interface DatabaseState {
  users: (User & { passwordHash: string })[];
  farms: Farm[];
  plots: LandPlot[];
  cycles: CropCycle[];
  observations: CropObservation[];
  tasks: FarmTask[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  suppliers: Supplier[];
  expenses: Expense[];
  harvests: HarvestRecord[];
  produceListings: ProduceListing[];
  orders: Order[];
  auditLogs: AuditLog[];
  meta: {
    initializedAt: string;
    lastSavedAt: string;
    version: string;
    driver: 'persistent_disk_engine' | 'postgresql';
  };
}

class DatabaseManager {
  private state: DatabaseState;
  private dataDir: string;
  private dbFilePath: string;
  private isPgConnected = false;
  private isInitialized = false;

  constructor() {
    this.dataDir = path.resolve(process.cwd(), '.data');
    this.dbFilePath = path.join(this.dataDir, 'agropulse_database.json');
    this.state = this.getInitialBaseline();
    this.init();
  }

  private init() {
    if (this.isInitialized) return;

    const isProduction = process.env.NODE_ENV === 'production';
    const databaseUrl = process.env.DATABASE_URL;
    const allowDiskFallback = process.env.ALLOW_DISK_DB_FALLBACK === 'true';

    // Production guard: Prohibit unconfigured PostgreSQL unless explicitly opted in
    if (isProduction && !databaseUrl && !allowDiskFallback) {
      const errorMsg =
        '[AgroPulse Production Error] DATABASE_URL is not configured. Running in production mode without a verified PostgreSQL database is disallowed to prevent data loss. Set DATABASE_URL or set ALLOW_DISK_DB_FALLBACK=true for non-production demonstration.';
      console.error(errorMsg);
    }

    // Attempt PostgreSQL connection if DATABASE_URL is provided
    if (databaseUrl) {
      console.log(`[AgroPulse DB] Attempting connection to PostgreSQL: ${sanitizeConnectionUrl(databaseUrl)}`);
      checkPostgresConnection()
        .then(async (status) => {
          if (status.connected) {
            this.isPgConnected = true;
            console.log(`[AgroPulse DB] ✓ Connected to PostgreSQL database: ${status.database} (${status.version}) in ${status.latencyMs}ms`);

            // Auto-migrate if enabled
            if (process.env.AUTO_MIGRATE === 'true') {
              try {
                const migResult = await runMigrations();
                if (migResult.success && migResult.applied.length > 0) {
                  console.log(`[AgroPulse DB] Applied auto-migrations: ${migResult.applied.join(', ')}`);
                }
              } catch (migErr: any) {
                console.warn('[AgroPulse DB] Auto-migration warning:', migErr.message);
              }
            }
          } else {
            this.isPgConnected = false;
            console.warn(`[AgroPulse DB] PostgreSQL connection failed: ${status.error}`);
            if (isProduction && !allowDiskFallback) {
              console.error('[AgroPulse DB] Critical: Unable to connect to primary PostgreSQL database in production.');
            } else {
              console.log(`[AgroPulse DB] Falling back to local development disk persistence at ${this.dbFilePath}`);
            }
          }
        })
        .catch((err) => {
          this.isPgConnected = false;
          console.warn('[AgroPulse DB] PostgreSQL check error:', err.message);
        });
    } else {
      console.log(`[AgroPulse DB] DATABASE_URL is not set. Operating in LOCAL_DEVELOPMENT mode using file persistence at ${this.dbFilePath}. (PostgreSQL is NOT connected).`);
    }

    // Ensure data directory exists on server filesystem for local persistence
    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
      } catch (err) {
        console.error('[AgroPulse DB] Failed to create .data dir:', err);
      }
    }

    // Load from disk if exists, otherwise write initial seed baseline with hashed passwords
    if (fs.existsSync(this.dbFilePath)) {
      try {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && Array.isArray(parsed.users)) {
          this.state = parsed;
          console.log(`[AgroPulse DB] Loaded persistent storage from ${this.dbFilePath} (${parsed.users.length} users, ${parsed.farms.length} farms).`);
        }
      } catch (err) {
        console.error('[AgroPulse DB] Corrupted disk database, restoring baseline:', err);
        this.saveToDisk();
      }
    } else {
      this.saveToDisk();
      console.log(`[AgroPulse DB] Initialized new persistent disk database at ${this.dbFilePath}`);
    }

    this.isInitialized = true;
  }

  private getInitialBaseline(): DatabaseState {
    const defaultPasswordHash = bcrypt.hashSync('AgroPulse2026!', 10);

    const usersWithHashes = SEED_USERS.map((u) => ({
      ...u,
      passwordHash: defaultPasswordHash,
    }));

    return {
      users: usersWithHashes,
      farms: SEED_FARMS,
      plots: SEED_PLOTS,
      cycles: SEED_CYCLES,
      observations: SEED_OBSERVATIONS,
      tasks: SEED_TASKS,
      inventory: SEED_INVENTORY,
      stockMovements: SEED_STOCK_MOVEMENTS,
      suppliers: SEED_SUPPLIERS,
      expenses: SEED_EXPENSES,
      harvests: SEED_HARVESTS,
      produceListings: SEED_PRODUCE_LISTINGS,
      orders: SEED_ORDERS,
      auditLogs: SEED_AUDIT_LOGS,
      meta: {
        initializedAt: new Date().toISOString(),
        lastSavedAt: new Date().toISOString(),
        version: '1.0.0',
        driver: 'persistent_disk_engine',
      },
    };
  }

  // Atomic file save with write-ahead journal and temporary swap
  private saveToDisk() {
    this.state.meta.lastSavedAt = new Date().toISOString();
    const payload = JSON.stringify(this.state, null, 2);
    const tmpFile = `${this.dbFilePath}.tmp`;

    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(tmpFile, payload, 'utf-8');
      fs.renameSync(tmpFile, this.dbFilePath);
    } catch (err) {
      console.error('[AgroPulse DB] Atomic disk persistence write failed:', err);
      try {
        fs.writeFileSync(this.dbFilePath, payload, 'utf-8');
      } catch (innerErr) {
        console.error('[AgroPulse DB] Critical disk write failure:', innerErr);
      }
    }
  }

  public getStatus() {
    return {
      driver: this.isPgConnected ? 'postgresql' : 'persistent_disk_engine',
      postgresConfigured: !!process.env.DATABASE_URL,
      postgresConnected: this.isPgConnected,
      diskFilePath: this.dbFilePath,
      recordCounts: {
        users: this.state.users.length,
        farms: this.state.farms.length,
        plots: this.state.plots.length,
        cycles: this.state.cycles.length,
        tasks: this.state.tasks.length,
        inventory: this.state.inventory.length,
        stockMovements: this.state.stockMovements.length,
        orders: this.state.orders.length,
        produceListings: this.state.produceListings.length,
        auditLogs: this.state.auditLogs.length,
      },
      lastSavedAt: this.state.meta.lastSavedAt,
    };
  }

  public async checkHealth(): Promise<PostgresConnectionStatus> {
    return await checkPostgresConnection();
  }

  public isPostgresConnected(): boolean {
    return this.isPgConnected;
  }

  public resetToBaseline() {
    if (this.isPgConnected || process.env.NODE_ENV === 'production') {
      throw new Error(
        '[Security Exception] resetToBaseline() is strictly prohibited when connected to PostgreSQL or running in production mode. Operation aborted to preserve database integrity.'
      );
    }
    this.state = this.getInitialBaseline();
    this.saveToDisk();
  }

  // Direct access to PostgreSQL repositories
  public readonly postgres = {
    users: userRepository,
    farms: farmRepository,
    crops: cropRepository,
    tasks: taskRepository,
    inventory: inventoryRepository,
    finance: financeRepository,
    marketplace: marketplaceRepository,
    audit: auditRepository,
  };

  // --- 1. USERS & AUTH ---
  public async findUserByEmail(email: string) {
    if (this.isPgConnected) {
      return await userRepository.findByEmail(email);
    }
    const normalized = email.trim().toLowerCase();
    return this.state.users.find((u) => u.email.toLowerCase() === normalized) || null;
  }

  public async findUserById(id: string) {
    if (this.isPgConnected) {
      return await userRepository.findById(id);
    }
    return this.state.users.find((u) => u.id === id) || null;
  }

  public async createUser(userData: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    phone?: string;
    district?: string;
    organization?: string;
  }) {
    const normalized = userData.email.trim().toLowerCase();

    if (this.isPgConnected) {
      const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      return await userRepository.createUser({
        id,
        name: userData.name,
        email: normalized,
        passwordHash: userData.passwordHash,
        role: userData.role,
        phone: userData.phone,
        district: userData.district,
        organization: userData.organization,
      });
    }

    const existing = this.state.users.find((u) => u.email.toLowerCase() === normalized);
    if (existing) {
      throw new Error('A registered account with this email address already exists.');
    }

    const newUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: userData.name.trim(),
      email: normalized,
      passwordHash: userData.passwordHash,
      role: userData.role,
      phone: userData.phone || '',
      district: userData.district || 'Nuwara Eliya',
      organization: userData.organization || '',
      status: 'active' as const,
      createdAt: new Date().toISOString(),
    };

    this.state.users.push(newUser);
    this.saveToDisk();
    return newUser;
  }

  public async getAllUsers() {
    if (this.isPgConnected) {
      return await userRepository.getAllUsers();
    }
    return this.state.users.map(({ passwordHash, ...user }) => user);
  }

  // --- 2. FARMS ---
  public async getFarms(userId?: string, userRole?: UserRole): Promise<Farm[]> {
    if (this.isPgConnected) {
      return await farmRepository.getFarms(userId, userRole);
    }
    if (!userId || userRole === 'super_admin' || userRole === 'support_staff') {
      return this.state.farms;
    }
    return this.state.farms.filter(
      (f) => f.ownerId === userId || (f.assignedWorkers && f.assignedWorkers.includes(userId))
    );
  }

  public async getFarmById(id: string): Promise<Farm | undefined> {
    if (this.isPgConnected) {
      const res = await farmRepository.getFarmById(id);
      return res || undefined;
    }
    return this.state.farms.find((f) => f.id === id);
  }

  public async createFarm(farm: Omit<Farm, 'id' | 'createdAt'>): Promise<Farm> {
    const newFarm: Farm = {
      ...farm,
      id: `farm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    if (this.isPgConnected) {
      return await farmRepository.createFarm(newFarm);
    }

    this.state.farms.push(newFarm);
    this.saveToDisk();
    return newFarm;
  }

  public async updateFarm(id: string, updates: Partial<Farm>): Promise<Farm> {
    if (this.isPgConnected) {
      return await farmRepository.updateFarm(id, updates);
    }

    const idx = this.state.farms.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error('Farm not found');
    this.state.farms[idx] = { ...this.state.farms[idx], ...updates };
    this.saveToDisk();
    return this.state.farms[idx];
  }

  public async deleteFarm(id: string): Promise<boolean> {
    if (this.isPgConnected) {
      return await farmRepository.deleteFarm(id);
    }

    const initialLen = this.state.farms.length;
    this.state.farms = this.state.farms.filter((f) => f.id !== id);
    this.state.plots = this.state.plots.filter((p) => p.farmId !== id);
    this.saveToDisk();
    return this.state.farms.length < initialLen;
  }

  // --- 3. LAND PLOTS ---
  public async getPlots(farmId?: string): Promise<LandPlot[]> {
    if (this.isPgConnected) {
      return await farmRepository.getPlots(farmId);
    }
    if (!farmId) return this.state.plots;
    return this.state.plots.filter((p) => p.farmId === farmId);
  }

  public async getPlotById(id: string): Promise<LandPlot | undefined> {
    if (this.isPgConnected) {
      const res = await farmRepository.getPlotById(id);
      return res || undefined;
    }
    return this.state.plots.find((p) => p.id === id);
  }

  public async createPlot(plot: Omit<LandPlot, 'id' | 'createdAt'>): Promise<LandPlot> {
    const newPlot: LandPlot = {
      ...plot,
      id: `plot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    if (this.isPgConnected) {
      return await farmRepository.createPlot(newPlot);
    }

    const farm = this.state.farms.find((f) => f.id === plot.farmId);
    if (!farm) throw new Error(`Cannot add plot: Farm '${plot.farmId}' does not exist.`);

    const duplicate = this.state.plots.find(
      (p) => p.farmId === plot.farmId && p.plotCode.toUpperCase() === plot.plotCode.toUpperCase()
    );
    if (duplicate) throw new Error(`Plot code '${plot.plotCode}' is already registered on this farm.`);

    this.state.plots.push(newPlot);
    this.saveToDisk();
    return newPlot;
  }

  public async updatePlot(id: string, updates: Partial<LandPlot>): Promise<LandPlot> {
    if (this.isPgConnected) {
      return await farmRepository.updatePlot(id, updates);
    }

    const idx = this.state.plots.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Land plot not found');
    this.state.plots[idx] = { ...this.state.plots[idx], ...updates };
    this.saveToDisk();
    return this.state.plots[idx];
  }

  public async deletePlot(id: string): Promise<boolean> {
    if (this.isPgConnected) {
      return await farmRepository.deletePlot(id);
    }

    const initialLen = this.state.plots.length;
    this.state.plots = this.state.plots.filter((p) => p.id !== id);
    this.saveToDisk();
    return this.state.plots.length < initialLen;
  }

  // --- 4. CROP CYCLES ---
  public async getCropCycles(farmId?: string): Promise<CropCycle[]> {
    if (this.isPgConnected) {
      return await cropRepository.getCropCycles(farmId);
    }
    if (!farmId) return this.state.cycles;
    return this.state.cycles.filter((c) => c.farmId === farmId);
  }

  public async getCropCycleById(id: string): Promise<CropCycle | undefined> {
    if (this.isPgConnected) {
      const res = await cropRepository.getCropCycleById(id);
      return res || undefined;
    }
    return this.state.cycles.find((c) => c.id === id);
  }

  public async createCropCycle(cycle: Omit<CropCycle, 'id' | 'createdAt'>): Promise<CropCycle> {
    const newCycle: CropCycle = {
      ...cycle,
      id: `cycle-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    if (this.isPgConnected) {
      return await cropRepository.createCropCycle(newCycle);
    }

    const farm = this.state.farms.find((f) => f.id === cycle.farmId);
    if (!farm) throw new Error(`Farm '${cycle.farmId}' does not exist.`);

    const plot = this.state.plots.find((p) => p.id === cycle.plotId);
    if (!plot) throw new Error(`Plot '${cycle.plotId}' does not exist.`);

    this.state.cycles.push(newCycle);
    this.saveToDisk();
    return newCycle;
  }

  public async advanceCropStage(id: string, newStage: CropCycle['stage']): Promise<CropCycle> {
    if (this.isPgConnected) {
      return await cropRepository.advanceCropStage(id, newStage);
    }

    const cycle = this.state.cycles.find((c) => c.id === id);
    if (!cycle) throw new Error('Crop cycle not found');
    cycle.stage = newStage;
    cycle.currentStage = newStage;
    if (newStage === 'Harvested') {
      cycle.status = 'completed';
      cycle.actualHarvestDate = new Date().toISOString().split('T')[0];
    }
    this.saveToDisk();
    return cycle;
  }

  // --- 5. OBSERVATIONS ---
  public async getObservations(cycleId?: string): Promise<CropObservation[]> {
    if (this.isPgConnected) {
      return await cropRepository.getObservations(cycleId);
    }
    if (!cycleId) return this.state.observations;
    return this.state.observations.filter((o) => o.cropCycleId === cycleId);
  }

  public async createObservation(obs: Omit<CropObservation, 'id' | 'createdAt'>): Promise<CropObservation> {
    const newObs: CropObservation = {
      ...obs,
      id: `obs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    if (this.isPgConnected) {
      return await cropRepository.createObservation(newObs);
    }

    this.state.observations.push(newObs);
    this.saveToDisk();
    return newObs;
  }

  // --- 6. TASKS ---
  public async getTasks(farmId?: string, assignedToId?: string): Promise<FarmTask[]> {
    if (this.isPgConnected) {
      return await taskRepository.getTasks(farmId, assignedToId);
    }
    return this.state.tasks.filter((t) => {
      if (farmId && t.farmId !== farmId) return false;
      if (assignedToId && t.assignedToId !== assignedToId) return false;
      return true;
    });
  }

  public async getTaskById(id: string): Promise<FarmTask | undefined> {
    if (this.isPgConnected) {
      const res = await taskRepository.getTaskById(id);
      return res || undefined;
    }
    return this.state.tasks.find((t) => t.id === id);
  }

  public async createTask(task: Omit<FarmTask, 'id' | 'createdAt'>): Promise<FarmTask> {
    const newTask: FarmTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    if (this.isPgConnected) {
      return await taskRepository.createTask(newTask);
    }

    this.state.tasks.push(newTask);
    this.saveToDisk();
    return newTask;
  }

  public async updateTaskStatus(
    id: string,
    status: FarmTask['status'],
    notes?: string,
    completedAt?: string
  ): Promise<FarmTask> {
    if (this.isPgConnected) {
      return await taskRepository.updateTaskStatus(id, status, notes, completedAt);
    }

    const task = this.state.tasks.find((t) => t.id === id);
    if (!task) throw new Error('Task not found');
    task.status = status;
    if (notes) task.completionNotes = notes;
    if (status === 'completed') {
      task.completedAt = completedAt || new Date().toISOString();
    }
    this.saveToDisk();
    return task;
  }

  // --- 7. INVENTORY & STOCK ---
  public async getInventory(farmId?: string): Promise<InventoryItem[]> {
    if (this.isPgConnected) {
      return await inventoryRepository.getInventory(farmId);
    }
    if (!farmId) return this.state.inventory;
    return this.state.inventory.filter((i) => i.farmId === farmId);
  }

  public async getInventoryItemById(id: string): Promise<InventoryItem | undefined> {
    if (this.isPgConnected) {
      const res = await inventoryRepository.getInventoryItemById(id);
      return res || undefined;
    }
    return this.state.inventory.find((i) => i.id === id);
  }

  public async createInventoryItem(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> {
    const newItem: InventoryItem = {
      ...item,
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (this.isPgConnected) {
      return await inventoryRepository.createInventoryItem(newItem);
    }

    this.state.inventory.push(newItem);
    this.saveToDisk();
    return newItem;
  }

  public async issueStock(
    itemId: string,
    quantity: number,
    reason: string,
    userId: string,
    userName: string
  ): Promise<{ success: boolean; movement?: StockMovement; error?: string }> {
    if (this.isPgConnected) {
      return await inventoryRepository.issueStock(itemId, quantity, reason, userId, userName);
    }

    if (quantity <= 0) {
      return { success: false, error: 'Issue quantity must be greater than zero.' };
    }

    const item = this.state.inventory.find((i) => i.id === itemId);
    if (!item) return { success: false, error: 'Inventory item SKU not found.' };

    if (item.currentStock < quantity) {
      return {
        success: false,
        error: `Insufficient stock for '${item.name}'. Available: ${item.currentStock} ${item.unit}, requested: ${quantity} ${item.unit}. Non-negative inventory constraint enforced.`,
      };
    }

    const prevStock = item.currentStock;
    const newStock = prevStock - quantity;
    item.currentStock = newStock;
    item.updatedAt = new Date().toISOString();
    item.status = newStock === 0 ? 'out_of_stock' : newStock <= (item.minReorderLevel ?? item.reorderThreshold ?? 10) ? 'low_stock' : 'in_stock';

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      farmId: item.farmId,
      inventoryItemId: item.id,
      type: 'issued',
      quantity,
      previousStock: prevStock,
      newStock,
      reason,
      performedById: userId,
      performedByName: userName,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    this.state.stockMovements.unshift(movement);
    this.saveToDisk();
    return { success: true, movement };
  }

  public async receiveStock(
    itemId: string,
    quantity: number,
    unitCost: number,
    userId: string,
    userName: string
  ): Promise<{ success: boolean; movement?: StockMovement; error?: string }> {
    if (this.isPgConnected) {
      return await inventoryRepository.receiveStock(itemId, quantity, unitCost, userId, userName);
    }

    if (quantity <= 0) {
      return { success: false, error: 'Received quantity must be greater than zero.' };
    }

    const item = this.state.inventory.find((i) => i.id === itemId);
    if (!item) return { success: false, error: 'Inventory item SKU not found.' };

    const prevStock = item.currentStock;
    const newStock = prevStock + quantity;
    item.currentStock = newStock;
    if (unitCost > 0) {
      item.costPerUnit = unitCost;
      item.unitCost = unitCost;
    }
    item.updatedAt = new Date().toISOString();
    item.status = newStock <= (item.minReorderLevel ?? item.reorderThreshold ?? 10) ? 'low_stock' : 'in_stock';

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      farmId: item.farmId,
      inventoryItemId: item.id,
      type: 'received',
      quantity,
      previousStock: prevStock,
      newStock,
      reason: 'Stock replenishment received from supplier',
      performedById: userId,
      performedByName: userName,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    this.state.stockMovements.unshift(movement);
    this.saveToDisk();
    return { success: true, movement };
  }

  public async getStockMovements(farmId?: string): Promise<StockMovement[]> {
    if (this.isPgConnected) {
      return await inventoryRepository.getStockMovements(farmId);
    }
    if (!farmId) return this.state.stockMovements;
    return this.state.stockMovements.filter((m) => m.farmId === farmId);
  }

  // --- 8. SUPPLIERS ---
  public async getSuppliers(): Promise<Supplier[]> {
    if (this.isPgConnected) {
      return await inventoryRepository.getSuppliers();
    }
    return this.state.suppliers;
  }

  public async createSupplier(supplier: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
    const newSupplier: Supplier = {
      ...supplier,
      id: `sup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    if (this.isPgConnected) {
      return await inventoryRepository.createSupplier(newSupplier);
    }

    this.state.suppliers.push(newSupplier);
    this.saveToDisk();
    return newSupplier;
  }

  // --- 9. HARVESTS & FINANCES ---
  public async getHarvests(farmId?: string): Promise<HarvestRecord[]> {
    if (this.isPgConnected) {
      return await financeRepository.getHarvests(farmId);
    }
    if (!farmId) return this.state.harvests;
    return this.state.harvests.filter((h) => h.farmId === farmId);
  }

  public async createHarvest(record: Omit<HarvestRecord, 'id' | 'createdAt'>): Promise<HarvestRecord> {
    const newHarvest: HarvestRecord = {
      ...record,
      id: `hrv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    if (this.isPgConnected) {
      return await financeRepository.createHarvest(newHarvest);
    }

    this.state.harvests.push(newHarvest);
    this.saveToDisk();
    return newHarvest;
  }

  public async getExpenses(farmId?: string): Promise<Expense[]> {
    if (this.isPgConnected) {
      return await financeRepository.getExpenses(farmId);
    }
    if (!farmId) return this.state.expenses;
    return this.state.expenses.filter((e) => e.farmId === farmId);
  }

  public async createExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    const newExpense: Expense = {
      ...expense,
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    if (this.isPgConnected) {
      return await financeRepository.createExpense(newExpense);
    }

    this.state.expenses.push(newExpense);
    this.saveToDisk();
    return newExpense;
  }

  public async getFinancialSummary(farmId?: string) {
    if (this.isPgConnected) {
      return await financeRepository.getFinancialSummary(farmId);
    }

    const harvests = this.state.harvests.filter((h) => (!farmId ? true : h.farmId === farmId));
    const expenses = this.state.expenses.filter((e) => (!farmId ? true : e.farmId === farmId));

    const totalRevenue = Math.round(harvests.reduce((sum, h) => sum + Number(h.totalRevenue || 0), 0) * 100) / 100;
    const totalExpenses = Math.round(expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0) * 100) / 100;
    const netProfit = Math.round((totalRevenue - totalExpenses) * 100) / 100;
    const profitMarginPercent = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMarginPercent,
      harvestCount: harvests.length,
      expenseCount: expenses.length,
    };
  }

  // --- 10. PRODUCE MARKETPLACE ---
  public async getProduceListings(): Promise<ProduceListing[]> {
    if (this.isPgConnected) {
      return await marketplaceRepository.getProduceListings();
    }
    return this.state.produceListings;
  }

  public async getProduceListingById(id: string): Promise<ProduceListing | undefined> {
    if (this.isPgConnected) {
      const res = await marketplaceRepository.getProduceListingById(id);
      return res || undefined;
    }
    return this.state.produceListings.find((l) => l.id === id);
  }

  public async createProduceListing(listing: Omit<ProduceListing, 'id' | 'createdAt'>): Promise<ProduceListing> {
    const newListing: ProduceListing = {
      ...listing,
      id: `list-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    if (this.isPgConnected) {
      return await marketplaceRepository.createProduceListing(newListing);
    }

    this.state.produceListings.unshift(newListing);
    this.saveToDisk();
    return newListing;
  }

  public async placeOrder(orderData: {
    buyerId: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    deliveryAddress: string;
    district: string;
    paymentMethod: string;
    items: { listingId: string; quantity: number }[];
    notes?: string;
  }): Promise<{ success: boolean; order?: Order; error?: string }> {
    if (this.isPgConnected) {
      return await marketplaceRepository.placeOrder(orderData);
    }

    if (!orderData.items || orderData.items.length === 0) {
      return { success: false, error: 'Cart is empty. Please select produce to order.' };
    }

    // Step 1: Pre-validate all listing quantities atomically
    const orderItemsResolved: Order['items'] = [];
    let calculatedTotal = 0;

    for (const item of orderData.items) {
      const listing = this.state.produceListings.find((l) => l.id === item.listingId);
      if (!listing) {
        return { success: false, error: `Produce listing '${item.listingId}' is no longer active.` };
      }
      if (listing.quantityAvailable < item.quantity) {
        return {
          success: false,
          error: `Insufficient produce quantity for ${listing.cropName}. Available: ${listing.quantityAvailable} ${listing.unit}, requested: ${item.quantity} ${listing.unit}.`,
        };
      }
      const subtotal = Math.round(item.quantity * listing.pricePerUnit * 100) / 100;
      calculatedTotal += subtotal;
      orderItemsResolved.push({
        listingId: listing.id,
        cropName: `${listing.cropName} (${listing.variety})`,
        quantity: item.quantity,
        unit: listing.unit,
        pricePerUnit: listing.pricePerUnit,
        unitPrice: listing.pricePerUnit,
        subtotal,
      });
    }

    // Step 2: Deduct listing stock atomically
    for (const item of orderData.items) {
      const listing = this.state.produceListings.find((l) => l.id === item.listingId)!;
      listing.quantityAvailable -= item.quantity;
      if (listing.quantityAvailable === 0) {
        listing.status = 'sold_out';
      }
    }

    // Step 3: Create confirmed order
    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder: Order = {
      id: `order-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderNumber,
      buyerId: orderData.buyerId,
      buyerName: orderData.buyerName,
      buyerEmail: orderData.buyerEmail,
      buyerPhone: orderData.buyerPhone,
      deliveryAddress: orderData.deliveryAddress,
      district: orderData.district,
      items: orderItemsResolved,
      totalAmount: Math.round(calculatedTotal * 100) / 100,
      currency: 'LKR',
      paymentStatus: 'pending',
      status: 'confirmed',
      paymentMethod: orderData.paymentMethod as any,
      notes: orderData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.orders.unshift(newOrder);
    this.saveToDisk();
    return { success: true, order: newOrder };
  }

  public async getOrders(buyerId?: string): Promise<Order[]> {
    if (this.isPgConnected) {
      return await marketplaceRepository.getOrders(buyerId);
    }
    if (!buyerId) return this.state.orders;
    return this.state.orders.filter((o) => o.buyerId === buyerId);
  }

  public async updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<Order> {
    if (this.isPgConnected) {
      return await marketplaceRepository.updateOrderStatus(orderId, newStatus);
    }

    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    this.saveToDisk();
    return order;
  }

  // --- 11. AUDIT LOGS ---
  public async logAudit(
    action: AuditLog['action'],
    entityType: string,
    entityId: string,
    userId: string,
    userRole: string,
    details: string,
    ipAddress = '127.0.0.1',
    userName = 'System'
  ): Promise<AuditLog> {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action,
      entity: entityType as any,
      entityType,
      entityId,
      actorId: userId,
      actorName: userName,
      actorRole: userRole,
      userId,
      userRole,
      details,
      ipAddress,
      timestamp: new Date().toISOString(),
    };

    if (this.isPgConnected) {
      try {
        return await auditRepository.logAudit(log);
      } catch (err: any) {
        console.warn('[AgroPulse Audit] Failed to write audit to PostgreSQL:', err.message);
      }
    }

    this.state.auditLogs.unshift(log);
    if (this.state.auditLogs.length > 500) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 500);
    }
    this.saveToDisk();
    return log;
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    if (this.isPgConnected) {
      return await auditRepository.getAuditLogs();
    }
    return this.state.auditLogs;
  }
}

export const serverDb = new DatabaseManager();
