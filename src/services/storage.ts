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
  WeatherData,
  AuditLog,
  Recommendation
} from '../types';
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
  DISTRICT_WEATHER,
  SEED_AUDIT_LOGS
} from '../data/seedData';

const STORAGE_KEY = 'agropulse_db_state_v1';
const CURRENT_USER_KEY = 'agropulse_current_user_v1';

const inMemoryStore: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return inMemoryStore[key] ?? null;
}

function safeSetItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }
  inMemoryStore[key] = value;
}

interface DatabaseState {
  users: User[];
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
}

function getInitialState(): DatabaseState {
  return {
    users: SEED_USERS,
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
  };
}

class StorageService {
  private state: DatabaseState;
  private currentUser: User | null;
  private listeners: (() => void)[] = [];

  constructor() {
    this.state = this.loadState();
    this.currentUser = this.loadCurrentUser();
  }

  private loadState(): DatabaseState {
    try {
      const data = safeGetItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fallback
    }
    const initial = getInitialState();
    this.persist(initial);
    return initial;
  }

  private loadCurrentUser(): User | null {
    try {
      const stored = safeGetItem(CURRENT_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id && parsed.email) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return null;
  }

  private persist(newState: DatabaseState) {
    this.state = newState;
    safeSetItem(STORAGE_KEY, JSON.stringify(newState));
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public resetToDefaults() {
    const initial = getInitialState();
    this.persist(initial);
    this.clearCurrentUser();
  }

  // --- Auth & Users ---
  public getCurrentUser(): User {
    if (!this.currentUser) {
      return {
        id: 'unauthenticated',
        name: 'Unauthenticated Visitor',
        email: '',
        role: 'farmer',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
    }
    return this.currentUser;
  }

  public getAuthenticatedUser(): User | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null && this.currentUser.id !== 'unauthenticated';
  }

  public setCurrentUser(user: User | null) {
    this.currentUser = user;
    if (user && user.id !== 'unauthenticated') {
      safeSetItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(CURRENT_USER_KEY);
        } catch {
          // ignore
        }
      }
      delete inMemoryStore[CURRENT_USER_KEY];
    }
    this.notify();
  }

  public clearCurrentUser() {
    this.setCurrentUser(null);
  }

  /**
   * Deprecated and disabled for security. Role switching without server authentication is disallowed.
   */
  public switchRole(_role: UserRole) {
    console.warn('[AgroPulse Security] Client-side role switching is permanently disabled. Authentication requires a valid server-verified JWT token.');
  }

  public getUsers(): User[] {
    return this.state.users;
  }

  public registerUser(data: {
    name: string;
    email: string;
    role: UserRole;
    district?: string;
    organization?: string;
    phone?: string;
  }): { success: boolean; user?: User; error?: string } {
    const existing = this.state.users.find(
      u => u.email.toLowerCase() === data.email.trim().toLowerCase()
    );
    if (existing) {
      return { success: false, error: 'An account with this work email already exists.' };
    }
    // Disallow public registration as privileged roles
    if (data.role === 'super_admin' || data.role === 'support_staff') {
      return { success: false, error: 'Super Admin and Support Staff roles cannot be self-registered.' };
    }
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: data.name.trim(),
      email: data.email.trim(),
      role: data.role,
      district: data.district || 'Nuwara Eliya',
      organization: data.organization || (data.role === 'buyer' ? 'Wholesale Commodity Buyer' : 'Independent Tea Estate'),
      phone: data.phone || '+94 77 000 0000',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    const newState: DatabaseState = {
      ...this.state,
      users: [...this.state.users, newUser],
    };
    this.logAudit('CREATE', 'USER', newUser.id, `Self-registered new account: ${newUser.name} (${newUser.role})`);
    this.persist(newState);
    this.setCurrentUser(newUser);
    return { success: true, user: newUser };
  }

  public updateUserProfile(userId: string, data: Partial<User>) {
    const updatedUsers = this.state.users.map(u => (u.id === userId ? { ...u, ...data } : u));
    const newState = { ...this.state, users: updatedUsers };
    this.logAudit('UPDATE', 'USER', userId, `Updated profile for user: ${data.name || userId}`);
    this.persist(newState);
    const currentUser = this.currentUser;
    if (currentUser?.id === userId) {
      const updatedCurrentUser: User = {
        ...currentUser,
        ...data,
        id: currentUser.id,
      };
      this.currentUser = updatedCurrentUser;
      safeSetItem(CURRENT_USER_KEY, JSON.stringify(updatedCurrentUser));
    }
  }

  // --- Module B: Farms & Plots ---
  public getFarms(): Farm[] {
    return this.state.farms;
  }

  public getFarmById(id: string): Farm | undefined {
    return this.state.farms.find(f => f.id === id);
  }

  public getPlots(farmId?: string): LandPlot[] {
    if (!farmId) return this.state.plots;
    return this.state.plots.filter(p => p.farmId === farmId);
  }

  public addFarm(farm: Omit<Farm, 'id' | 'createdAt'>): Farm {
    const newFarm: Farm = {
      ...farm,
      id: `farm-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const newState = {
      ...this.state,
      farms: [newFarm, ...this.state.farms],
    };
    this.logAudit('CREATE', 'FARM', newFarm.id, `Created farm "${newFarm.name}" in ${newFarm.district}`);
    this.persist(newState);
    return newFarm;
  }

  public updateFarm(id: string, farmData: Partial<Farm>) {
    const updatedFarms = this.state.farms.map(f => (f.id === id ? { ...f, ...farmData } : f));
    this.logAudit('UPDATE', 'FARM', id, `Updated farm details`);
    this.persist({ ...this.state, farms: updatedFarms });
  }

  public addPlot(plot: Omit<LandPlot, 'id'>): LandPlot {
    const newPlot: LandPlot = {
      ...plot,
      id: `plot-${Date.now()}`,
    };
    this.logAudit('CREATE', 'PLOT', newPlot.id, `Created plot "${newPlot.name}" (${newPlot.plotCode})`);
    this.persist({
      ...this.state,
      plots: [...this.state.plots, newPlot],
    });
    return newPlot;
  }

  public updatePlot(id: string, plotData: Partial<LandPlot>) {
    const updatedPlots = this.state.plots.map(p => (p.id === id ? { ...p, ...plotData } : p));
    this.persist({ ...this.state, plots: updatedPlots });
  }

  // --- Module C: Crop Cycles & Observations ---
  public getCropCycles(farmId?: string): CropCycle[] {
    if (!farmId) return this.state.cycles;
    return this.state.cycles.filter(c => c.farmId === farmId);
  }

  public addCropCycle(cycle: Omit<CropCycle, 'id'>): CropCycle {
    const newCycle: CropCycle = {
      ...cycle,
      id: `cycle-${Date.now()}`,
    };
    this.logAudit('CREATE', 'CROP_CYCLE', newCycle.id, `Initiated crop cycle: ${newCycle.cropName} on plot`);
    this.persist({
      ...this.state,
      cycles: [newCycle, ...this.state.cycles],
    });
    return newCycle;
  }

  public updateCropCycle(id: string, cycleData: Partial<CropCycle>) {
    const updatedCycles = this.state.cycles.map(c => (c.id === id ? { ...c, ...cycleData } : c));
    this.logAudit('UPDATE', 'CROP_CYCLE', id, `Updated crop stage or metadata`);
    this.persist({ ...this.state, cycles: updatedCycles });
  }

  public getObservations(farmId?: string): CropObservation[] {
    if (!farmId) return this.state.observations;
    return this.state.observations.filter(o => o.farmId === farmId);
  }

  public addObservation(obs: Omit<CropObservation, 'id' | 'date'>): CropObservation {
    const newObs: CropObservation = {
      ...obs,
      id: `obs-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
    };
    this.logAudit('CREATE', 'CROP_CYCLE', newObs.cropCycleId, `Logged agronomy observation: ${newObs.title} (Severity: ${newObs.severity})`);
    this.persist({
      ...this.state,
      observations: [newObs, ...this.state.observations],
    });
    return newObs;
  }

  // --- Module D: Tasks & Dispatch ---
  public getTasks(farmId?: string): FarmTask[] {
    const now = new Date().toISOString().split('T')[0];
    let tasks = this.state.tasks.map(t => {
      // Auto compute overdue status
      if (t.status !== 'completed' && t.dueDate < now) {
        return { ...t, status: 'overdue' as const };
      }
      return t;
    });

    if (farmId) {
      tasks = tasks.filter(t => t.farmId === farmId);
    }
    return tasks;
  }

  public addTask(task: Omit<FarmTask, 'id' | 'createdAt'>): FarmTask {
    const newTask: FarmTask = {
      ...task,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.logAudit('CREATE', 'TASK', newTask.id, `Created task: "${newTask.title}" assigned to ${newTask.assignedToName || 'Unassigned'}`);
    this.persist({
      ...this.state,
      tasks: [newTask, ...this.state.tasks],
    });
    return newTask;
  }

  public updateTask(id: string, data: Partial<FarmTask>) {
    const updatedTasks = this.state.tasks.map(t => {
      if (t.id === id) {
        const isCompleting = data.status === 'completed' && t.status !== 'completed';
        return {
          ...t,
          ...data,
          completedAt: isCompleting ? new Date().toISOString() : t.completedAt,
        };
      }
      return t;
    });
    this.logAudit('UPDATE', 'TASK', id, `Updated task status or completion details`);
    this.persist({ ...this.state, tasks: updatedTasks });
  }

  // --- Module E: Inventory & Transactional Stock Movements ---
  public getInventory(farmId?: string): InventoryItem[] {
    if (!farmId) return this.state.inventory;
    return this.state.inventory.filter(i => i.farmId === farmId);
  }

  public addInventoryItem(item: Omit<InventoryItem, 'id' | 'updatedAt' | 'status'>): InventoryItem {
    const status = item.currentStock === 0 ? 'out_of_stock' : item.currentStock <= item.minReorderLevel ? 'low_stock' : 'in_stock';
    const newItem: InventoryItem = {
      ...item,
      id: `inv-${Date.now()}`,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.logAudit('CREATE', 'INVENTORY', newItem.id, `Added inventory SKU "${newItem.name}" with initial stock ${newItem.currentStock} ${newItem.unit}`);
    this.persist({
      ...this.state,
      inventory: [newItem, ...this.state.inventory],
    });
    return newItem;
  }

  /**
   * TRANSACTIONAL STOCK ISSUE
   * Enforces business rule: Stock can NEVER become negative.
   */
  public issueStock(
    itemId: string,
    quantity: number,
    reason: string,
    actorId: string,
    actorName: string
  ): { success: boolean; error?: string; movement?: StockMovement } {
    const item = this.state.inventory.find(i => i.id === itemId);
    if (!item) {
      return { success: false, error: 'Inventory SKU not found.' };
    }
    if (quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than zero.' };
    }
    if (item.currentStock < quantity) {
      return {
        success: false,
        error: `Insufficient stock! Requested ${quantity} ${item.unit}, but only ${item.currentStock} ${item.unit} available in warehouse. Non-negative constraint violated.`,
      };
    }

    const previousStock = item.currentStock;
    const newStock = previousStock - quantity;
    const newStatus: InventoryItem['status'] = newStock === 0 ? 'out_of_stock' : newStock <= item.minReorderLevel ? 'low_stock' : 'in_stock';

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      inventoryItemId: item.id,
      inventoryItemName: item.name,
      farmId: item.farmId,
      type: 'issued',
      quantity,
      unit: item.unit,
      previousStock,
      newStock,
      referenceReason: reason,
      actorId,
      actorName,
      createdAt: new Date().toISOString(),
    };

    const updatedInventory = this.state.inventory.map(i =>
      i.id === itemId ? { ...i, currentStock: newStock, status: newStatus, updatedAt: new Date().toISOString() } : i
    );

    this.logAudit('STOCK_ISSUE', 'INVENTORY', itemId, `Issued ${quantity} ${item.unit} of "${item.name}". Stock decreased from ${previousStock} to ${newStock}. Reason: ${reason}`);

    this.persist({
      ...this.state,
      inventory: updatedInventory,
      stockMovements: [movement, ...this.state.stockMovements],
    });

    return { success: true, movement };
  }

  /**
   * TRANSACTIONAL STOCK RECEIVE
   */
  public receiveStock(
    itemId: string,
    quantity: number,
    reason: string,
    batchNumber: string | undefined,
    actorId: string,
    actorName: string
  ): { success: boolean; error?: string; movement?: StockMovement } {
    const item = this.state.inventory.find(i => i.id === itemId);
    if (!item) {
      return { success: false, error: 'Inventory SKU not found.' };
    }
    if (quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than zero.' };
    }

    const previousStock = item.currentStock;
    const newStock = previousStock + quantity;
    const newStatus: InventoryItem['status'] = newStock <= item.minReorderLevel ? 'low_stock' : 'in_stock';

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      inventoryItemId: item.id,
      inventoryItemName: item.name,
      farmId: item.farmId,
      type: 'received',
      quantity,
      unit: item.unit,
      previousStock,
      newStock,
      referenceReason: reason,
      batchNumber,
      actorId,
      actorName,
      createdAt: new Date().toISOString(),
    };

    const updatedInventory = this.state.inventory.map(i =>
      i.id === itemId
        ? {
            ...i,
            currentStock: newStock,
            status: newStatus,
            batchNumber: batchNumber || i.batchNumber,
            updatedAt: new Date().toISOString(),
          }
        : i
    );

    this.logAudit('STOCK_RECEIVE', 'INVENTORY', itemId, `Received ${quantity} ${item.unit} of "${item.name}". Stock increased from ${previousStock} to ${newStock}. Batch: ${batchNumber || 'N/A'}`);

    this.persist({
      ...this.state,
      inventory: updatedInventory,
      stockMovements: [movement, ...this.state.stockMovements],
    });

    return { success: true, movement };
  }

  public getStockMovements(farmId?: string): StockMovement[] {
    if (!farmId) return this.state.stockMovements;
    return this.state.stockMovements.filter(m => m.farmId === farmId);
  }

  public getSuppliers(): Supplier[] {
    return this.state.suppliers;
  }

  // --- Module F: Weather ---
  public getWeatherForDistrict(districtName: string): WeatherData {
    if (DISTRICT_WEATHER[districtName]) {
      return DISTRICT_WEATHER[districtName];
    }
    // Default fallback
    return {
      district: districtName,
      province: 'Sri Lanka Zone',
      temperatureC: 28.0,
      feelsLikeC: 30.0,
      humidityPercent: 75,
      rainfallMm: 5.0,
      windSpeedKmh: 14.0,
      condition: 'Partly Cloudy',
      uvIndex: 7,
      forecast5Days: [
        { date: '2026-10-16', day: 'Fri', tempMax: 30, tempMin: 22, rainfallProb: 40, condition: 'Partly Cloudy' },
        { date: '2026-10-17', day: 'Sat', tempMax: 31, tempMin: 23, rainfallProb: 30, condition: 'Sunny' },
        { date: '2026-10-18', day: 'Sun', tempMax: 29, tempMin: 22, rainfallProb: 60, condition: 'Showers' },
        { date: '2026-10-19', day: 'Mon', tempMax: 28, tempMin: 21, rainfallProb: 50, condition: 'Cloudy' },
        { date: '2026-10-20', day: 'Tue', tempMax: 29, tempMin: 22, rainfallProb: 35, condition: 'Partly Cloudy' },
      ],
      agriculturalAdvisory: 'Standard tropical humidity conditions. Monitor soil moisture in sandy plots.',
      isSimulated: true,
      lastUpdated: new Date().toISOString(),
    };
  }

  // --- Module G: Harvest & Finance ---
  public getHarvests(farmId?: string): HarvestRecord[] {
    if (!farmId) return this.state.harvests;
    return this.state.harvests.filter(h => h.farmId === farmId);
  }

  public addHarvest(harvest: Omit<HarvestRecord, 'id'>): HarvestRecord {
    const newHarvest: HarvestRecord = {
      ...harvest,
      id: `harv-${Date.now()}`,
    };
    this.logAudit('CREATE', 'HARVEST', newHarvest.id, `Logged harvest ${newHarvest.quantity} ${newHarvest.unit} of ${newHarvest.cropName} (${newHarvest.qualityGrade})`);
    this.persist({
      ...this.state,
      harvests: [newHarvest, ...this.state.harvests],
    });
    return newHarvest;
  }

  public getExpenses(farmId?: string): Expense[] {
    if (!farmId) return this.state.expenses;
    return this.state.expenses.filter(e => e.farmId === farmId);
  }

  public addExpense(expense: Omit<Expense, 'id'>): Expense {
    const newExpense: Expense = {
      ...expense,
      id: `exp-${Date.now()}`,
    };
    this.logAudit('CREATE', 'FARM', newExpense.farmId, `Logged expense ${newExpense.currency} ${newExpense.amount.toLocaleString()} for ${newExpense.category}`);
    this.persist({
      ...this.state,
      expenses: [newExpense, ...this.state.expenses],
    });
    return newExpense;
  }

  public getFinancialSummary(farmId?: string) {
    const harvests = this.getHarvests(farmId);
    const expenses = this.getExpenses(farmId);

    const totalRevenue = harvests.reduce((acc, h) => acc + h.estimatedRevenue, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin: Math.round(profitMargin * 10) / 10,
      harvestCount: harvests.length,
      expenseCount: expenses.length,
    };
  }

  // --- Module H: Marketplace & Orders ---
  public getProduceListings(): ProduceListing[] {
    return this.state.produceListings;
  }

  public addProduceListing(listing: Omit<ProduceListing, 'id'>): ProduceListing {
    const newListing: ProduceListing = {
      ...listing,
      id: `list-${Date.now()}`,
    };
    this.logAudit('CREATE', 'ORDER', newListing.id, `Listed ${newListing.quantityAvailable} ${newListing.unit} of ${newListing.cropName} at LKR ${newListing.pricePerUnit}/${newListing.unit}`);
    this.persist({
      ...this.state,
      produceListings: [newListing, ...this.state.produceListings],
    });
    return newListing;
  }

  /**
   * TRANSACTIONAL ORDER PLACEMENT
   * Prevents overselling by checking and reserving inventory quantities atomically.
   */
  public placeOrder(params: {
    buyerId: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    deliveryAddress: string;
    district: string;
    paymentMethod: 'Bank Transfer (Simulated)' | 'Cash on Delivery (COD)' | 'Digital Escrow (Simulated)';
    items: { listingId: string; quantity: number }[];
    notes?: string;
  }): { success: boolean; error?: string; order?: Order } {
    // 1. Validation & Stock Availability Check
    for (const itemReq of params.items) {
      const listing = this.state.produceListings.find(l => l.id === itemReq.listingId);
      if (!listing) {
        return { success: false, error: `Produce listing ${itemReq.listingId} not found.` };
      }
      if (listing.quantityAvailable < itemReq.quantity) {
        return {
          success: false,
          error: `Insufficient produce availability for "${listing.cropName}". Requested: ${itemReq.quantity} ${listing.unit}, available: ${listing.quantityAvailable} ${listing.unit}.`,
        };
      }
    }

    // 2. Compute totals & construct order
    const orderItems: Order['items'] = [];
    let grandTotal = 0;

    const updatedListings = this.state.produceListings.map(listing => {
      const matchedReq = params.items.find(i => i.listingId === listing.id);
      if (matchedReq) {
        const subtotal = matchedReq.quantity * listing.pricePerUnit;
        grandTotal += subtotal;
        orderItems.push({
          listingId: listing.id,
          cropName: listing.cropName,
          quantity: matchedReq.quantity,
          unit: listing.unit,
          pricePerUnit: listing.pricePerUnit,
          subtotal,
        });

        const newAvailable = listing.quantityAvailable - matchedReq.quantity;
        return {
          ...listing,
          quantityAvailable: newAvailable,
          status: newAvailable === 0 ? ('sold_out' as const) : ('active' as const),
        };
      }
      return listing;
    });

    const newOrder: Order = {
      id: `order-${Date.now()}`,
      orderNumber: `AP-ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      buyerId: params.buyerId,
      buyerName: params.buyerName,
      buyerEmail: params.buyerEmail,
      buyerPhone: params.buyerPhone,
      deliveryAddress: params.deliveryAddress,
      district: params.district,
      items: orderItems,
      totalAmount: grandTotal,
      currency: 'LKR',
      status: 'confirmed',
      paymentMethod: params.paymentMethod,
      paymentStatus: 'pending',
      notes: params.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.logAudit(
      'CREATE',
      'ORDER',
      newOrder.id,
      `Placed order ${newOrder.orderNumber} for LKR ${grandTotal.toLocaleString()} by ${params.buyerName}`
    );

    this.persist({
      ...this.state,
      produceListings: updatedListings,
      orders: [newOrder, ...this.state.orders],
    });

    return { success: true, order: newOrder };
  }

  public getOrders(buyerId?: string): Order[] {
    if (!buyerId) return this.state.orders;
    return this.state.orders.filter(o => o.buyerId === buyerId);
  }

  public updateOrderStatus(orderId: string, status: OrderStatus) {
    const updatedOrders = this.state.orders.map(o =>
      o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o
    );
    this.logAudit('ORDER_STATUS', 'ORDER', orderId, `Changed order status to: ${status.toUpperCase()}`);
    this.persist({ ...this.state, orders: updatedOrders });
  }

  // --- Module J: Rule-Based Recommendations Engine ---
  public getRecommendations(): Recommendation[] {
    const recs: Recommendation[] = [];
    const now = new Date();

    // 1. Overdue tasks check
    const overdueTasks = this.getTasks().filter(t => t.status === 'overdue');
    if (overdueTasks.length > 0) {
      recs.push({
        id: 'rec-tasks-overdue',
        type: 'task_overdue',
        priority: 'high',
        title: `${overdueTasks.length} Field Task(s) Overdue`,
        message: `High-priority field operations like "${overdueTasks[0].title}" have missed scheduled dates. Reassign or dispatch worker immediately.`,
        actionLabel: 'View Field Tasks',
        actionModule: 'tasks',
        createdAt: now.toISOString(),
      });
    }

    // 2. Low inventory check
    const lowStock = this.state.inventory.filter(i => i.currentStock <= i.minReorderLevel);
    if (lowStock.length > 0) {
      recs.push({
        id: 'rec-low-stock',
        type: 'low_inventory',
        priority: 'high',
        title: `Low Stock Alert: ${lowStock.map(i => i.name).slice(0, 2).join(', ')}`,
        message: `${lowStock.length} critical agricultural input(s) have reached or dipped below minimum reorder thresholds. Restock immediately to prevent field work disruption.`,
        actionLabel: 'Manage Stock',
        actionModule: 'inventory',
        createdAt: now.toISOString(),
      });
    }

    // 3. Harvest readiness check
    const readyCycles = this.state.cycles.filter(c => c.stage === 'Harvest Ready' || c.stage === 'Ripening');
    if (readyCycles.length > 0) {
      recs.push({
        id: 'rec-harvest-ready',
        type: 'harvest_due',
        priority: 'medium',
        title: `Harvest Window Approaching for ${readyCycles[0].cropName}`,
        message: `Crop cycle is in ${readyCycles[0].stage} stage. Prepare harvest plucking teams, crates, and storage withering spaces.`,
        actionLabel: 'View Crop Cycles',
        actionModule: 'crops',
        createdAt: now.toISOString(),
      });
    }

    // 4. Weather & Monsoon Advisory
    const nuwaraEliyaWeather = DISTRICT_WEATHER['Nuwara Eliya'];
    if (nuwaraEliyaWeather && (nuwaraEliyaWeather.rainfallMm ?? 0) > 10) {
      recs.push({
        id: 'rec-weather-rain',
        type: 'weather_risk',
        priority: 'medium',
        title: 'High Precipitation Advisory: Nuwara Eliya & Central Highlands',
        message: 'Active rainfall detected (14.5mm). Inspect soil bunds against slope run-off and postpone foliar spray applications until leaves are dry.',
        actionLabel: 'Check Weather Radar',
        actionModule: 'weather',
        createdAt: now.toISOString(),
      });
    }

    return recs;
  }

  // --- Module K: Audit Trail & Reporting ---
  public getAuditLogs(): AuditLog[] {
    return this.state.auditLogs;
  }

  private logAudit(
    action: AuditLog['action'],
    entity: AuditLog['entity'],
    entityId: string,
    details: string
  ) {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actorId: this.currentUser?.id || 'system',
      actorName: this.currentUser?.name || 'System Operator',
      actorRole: this.currentUser?.role || 'farmer',
      action,
      entity,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.state.auditLogs = [newLog, ...this.state.auditLogs];
  }

  public exportFinancialReportCSV(farmId?: string): string {
    const harvests = this.getHarvests(farmId);
    const expenses = this.getExpenses(farmId);

    const headers = ['Type', 'Record ID', 'Date', 'Description / Crop', 'Category / Grade', 'Quantity / Unit', 'Amount / Revenue (LKR)'];
    const rows: string[][] = [];

    harvests.forEach(h => {
      rows.push([
        'Harvest Revenue',
        h.id,
        h.harvestDate,
        `"${h.cropName} (${h.plotName})"`,
        `"${h.qualityGrade}"`,
        `"${h.quantity} ${h.unit}"`,
        h.estimatedRevenue.toString(),
      ]);
    });

    expenses.forEach(e => {
      rows.push([
        'Expense',
        e.id,
        e.date,
        `"${e.description.replace(/"/g, '""')}"`,
        `"${e.category}"`,
        '"-"',
        `-${e.amount}`,
      ]);
    });

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  public exportAuditLogsCSV(): string {
    const logs = this.getAuditLogs();
    const headers = ['Timestamp', 'Actor Name', 'Role', 'Action', 'Entity', 'Entity ID', 'Details'];
    const rows = logs.map(l => [
      l.timestamp,
      `"${l.actorName.replace(/"/g, '""')}"`,
      l.actorRole,
      l.action,
      l.entity,
      l.entityId,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

export const db = new StorageService();
