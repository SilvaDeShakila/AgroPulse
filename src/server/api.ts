import { Router, Request, Response } from 'express';
import { serverDb } from './db/database';
import { authMiddleware, AuthenticatedRequest } from './middleware/auth';
import { requireRole, requireFarmOwnership } from './middleware/rbac';
import { rateLimit } from './middleware/rateLimit';
import { AuthService } from './services/authService';
import { WeatherService } from './services/weatherService';

export const apiRouter = Router();

// ====================================================================
// 1. SYSTEM HEALTH & DIAGNOSTICS
// ====================================================================
apiRouter.get('/health', async (req: Request, res: Response) => {
  const pgHealth = await serverDb.checkHealth();
  res.json({
    status: 'ok',
    service: 'AgroPulse Core REST API v1',
    runtime: 'Node.js Express + TypeScript',
    databaseDriver: pgHealth.connected ? 'postgresql' : 'persistent_disk_engine',
    databaseConnected: pgHealth.connected,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

apiRouter.get('/system/db-status', async (req: Request, res: Response) => {
  const status = serverDb.getStatus();
  const liveHealth = await serverDb.checkHealth();
  res.json({
    data: {
      ...status,
      liveHealth,
    },
    timestamp: new Date().toISOString(),
  });
});

// Admin-only reset endpoint (restricted strictly to offline local disk development)
apiRouter.post(
  '/system/reset-demo',
  authMiddleware,
  requireRole(['super_admin']),
  async (req: any, res: Response) => {
    if (process.env.NODE_ENV === 'production' || serverDb.isPostgresConnected()) {
      return res.status(403).json({
        error: 'OperationForbidden',
        message: 'System database reset is strictly prohibited when connected to PostgreSQL or running in production mode.',
      });
    }

    try {
      serverDb.resetToBaseline();
      await serverDb.logAudit(
        'UPDATE',
        'SYSTEM',
        'database',
        req.user!.id,
        req.user!.role,
        'Restored local development database to baseline state'
      );
      res.json({ message: 'Local development database reset to baseline state successfully.' });
    } catch (err: any) {
      res.status(403).json({
        error: 'ResetForbidden',
        message: err.message || 'Reset failed.',
      });
    }
  }
);

// ====================================================================
// 2. AUTHENTICATION & IDENTITY (REAL SERVER-SIDE VALIDATION)
// ====================================================================
apiRouter.post('/auth/register', rateLimit(15, 60000), async (req: Request, res: Response) => {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json({
      data: result,
      message: 'Estate account registered successfully.',
    });
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({
      error: status === 409 ? 'DuplicateAccount' : status === 422 ? 'ValidationError' : 'RegistrationError',
      message: err.message || 'Registration failed.',
    });
  }
});

apiRouter.post('/auth/login', rateLimit(20, 60000), async (req: Request, res: Response) => {
  try {
    const result = await AuthService.login(req.body);
    res.json({
      data: result,
      message: 'Authenticated successfully.',
    });
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({
      error: status === 401 ? 'InvalidCredentials' : 'AuthenticationError',
      message: err.message || 'Authentication failed.',
    });
  }
});

apiRouter.get('/auth/me', authMiddleware, (req: any, res: Response) => {
  const user = req.user!;
  res.json({
    data: {
      ...user,
      permissions: {
        canManageFarms: ['super_admin', 'farmer'].includes(user.role),
        canManagePlots: ['super_admin', 'farmer'].includes(user.role),
        canTrackCrops: ['super_admin', 'farmer', 'agronomist'].includes(user.role),
        canIssueStock: ['super_admin', 'farmer', 'farm_worker'].includes(user.role),
        canReceiveStock: ['super_admin', 'farmer', 'supplier'].includes(user.role),
        canAccessFinance: ['super_admin', 'farmer'].includes(user.role),
        canAccessMarketplace: true,
        canManageListings: ['super_admin', 'farmer'].includes(user.role),
        canPlaceOrders: ['super_admin', 'buyer', 'farmer'].includes(user.role),
        canViewAuditLogs: user.role === 'super_admin',
      },
    },
  });
});

apiRouter.post('/auth/forgot-password', rateLimit(10, 60000), async (req: Request, res: Response) => {
  try {
    const result = await AuthService.requestPasswordReset(req.body.email);
    res.json({ data: result });
  } catch (err: any) {
    const status = err.status || 400;
    res.status(status).json({ error: 'PasswordResetError', message: err.message });
  }
});

// ====================================================================
// 3. FARMS & LAND PLOTS
// ====================================================================
apiRouter.get('/farms', authMiddleware, async (req: any, res: Response) => {
  const farms = await serverDb.getFarms(req.user!.id, req.user!.role);
  res.json({ data: farms, count: farms.length });
});

apiRouter.get(
  '/farms/:id',
  authMiddleware,
  requireFarmOwnership('id'),
  async (req: any, res: Response) => {
    const farm = await serverDb.getFarmById(req.params.id);
    if (!farm) return res.status(404).json({ error: 'NotFound', message: 'Farm not found.' });
    res.json({ data: farm });
  }
);

apiRouter.post(
  '/farms',
  authMiddleware,
  requireRole(['farmer', 'super_admin']),
  async (req: any, res: Response) => {
    const { name, district, province, totalArea, areaUnit, soilPrimary, irrigationPrimary, address } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(422).json({ error: 'ValidationError', message: 'Farm name must be at least 2 characters.' });
    }
    if (!district) {
      return res.status(422).json({ error: 'ValidationError', message: 'Agricultural district is required.' });
    }
    const area = Number(totalArea);
    if (isNaN(area) || area <= 0) {
      return res.status(422).json({ error: 'ValidationError', message: 'Total area must be a positive number.' });
    }

    const farm = await serverDb.createFarm({
      ownerId: req.user!.id,
      name: name.trim(),
      district,
      province: province || 'Central Province',
      address: address || `${district}, Sri Lanka`,
      latitude: district === 'Nuwara Eliya' ? 6.9744 : 7.2906,
      longitude: district === 'Nuwara Eliya' ? 80.7828 : 80.6337,
      totalArea: area,
      areaUnit: areaUnit || 'acres',
      soilPrimary: soilPrimary || 'Red-Yellow Podzolic',
      irrigationPrimary: irrigationPrimary || 'Drip',
      assignedWorkers: [],
      status: 'active',
    });

    await serverDb.logAudit('CREATE', 'FARM', farm.id, req.user!.id, req.user!.role, `Registered farm '${farm.name}' in ${farm.district}`);
    res.status(201).json({ data: farm, message: 'Farm registered successfully.' });
  }
);

apiRouter.put(
  '/farms/:id',
  authMiddleware,
  requireFarmOwnership('id'),
  async (req: any, res: Response) => {
    try {
      const updated = await serverDb.updateFarm(req.params.id, req.body);
      await serverDb.logAudit('UPDATE', 'FARM', req.params.id, req.user!.id, req.user!.role, `Updated farm '${updated.name}'`);
      res.json({ data: updated, message: 'Farm details updated successfully.' });
    } catch (err: any) {
      res.status(404).json({ error: 'NotFound', message: err.message });
    }
  }
);

apiRouter.delete(
  '/farms/:id',
  authMiddleware,
  requireRole(['farmer', 'super_admin']),
  requireFarmOwnership('id'),
  async (req: any, res: Response) => {
    const success = await serverDb.deleteFarm(req.params.id);
    if (!success) return res.status(404).json({ error: 'NotFound', message: 'Farm not found.' });

    await serverDb.logAudit('DELETE', 'FARM', req.params.id, req.user!.id, req.user!.role, `Deleted farm ${req.params.id}`);
    res.json({ message: 'Farm and associated plots removed successfully.' });
  }
);

// Plots
apiRouter.get(
  '/farms/:id/plots',
  authMiddleware,
  requireFarmOwnership('id'),
  async (req: any, res: Response) => {
    const plots = await serverDb.getPlots(req.params.id);
    res.json({ data: plots, count: plots.length });
  }
);

apiRouter.post(
  '/farms/:id/plots',
  authMiddleware,
  requireRole(['farmer', 'super_admin']),
  requireFarmOwnership('id'),
  async (req: any, res: Response) => {
    const { name, plotCode, area, areaUnit, soilType, irrigationType } = req.body;
    if (!name || !plotCode) {
      return res.status(422).json({ error: 'ValidationError', message: 'Plot name and unique plot code are required.' });
    }
    const numArea = Number(area);
    if (isNaN(numArea) || numArea <= 0) {
      return res.status(422).json({ error: 'ValidationError', message: 'Plot area must be a positive number.' });
    }

    try {
      const plot = await serverDb.createPlot({
        farmId: req.params.id,
        name: name.trim(),
        plotCode: plotCode.trim().toUpperCase(),
        area: numArea,
        areaUnit: areaUnit || 'acres',
        soilType: soilType || 'Alluvial',
        irrigationType: irrigationType || 'Drip',
        status: 'cultivated',
      });

      await serverDb.logAudit('CREATE', 'PLOT', plot.id, req.user!.id, req.user!.role, `Added plot '${plot.plotCode}' to farm`);
      res.status(201).json({ data: plot, message: 'Land plot registered successfully.' });
    } catch (err: any) {
      res.status(409).json({ error: 'DuplicatePlotCode', message: err.message });
    }
  }
);

apiRouter.delete(
  '/plots/:id',
  authMiddleware,
  requireRole(['farmer', 'super_admin']),
  async (req: any, res: Response) => {
    const plot = await serverDb.getPlotById(req.params.id);
    if (!plot) return res.status(404).json({ error: 'NotFound', message: 'Plot not found.' });

    await serverDb.deletePlot(req.params.id);
    await serverDb.logAudit('DELETE', 'PLOT', req.params.id, req.user!.id, req.user!.role, `Removed plot ${plot.name}`);
    res.json({ message: 'Plot removed successfully.' });
  }
);

// ====================================================================
// 4. CROP LIFECYCLE MANAGEMENT
// ====================================================================
apiRouter.get('/crop-cycles', authMiddleware, async (req: any, res: Response) => {
  const farmId = req.query.farmId as string;
  const cycles = await serverDb.getCropCycles(farmId);
  res.json({ data: cycles, count: cycles.length });
});

apiRouter.get('/crop-cycles/:id', authMiddleware, async (req: any, res: Response) => {
  const cycle = await serverDb.getCropCycleById(req.params.id);
  if (!cycle) return res.status(404).json({ error: 'NotFound', message: 'Crop cycle not found.' });
  res.json({ data: cycle });
});

apiRouter.post(
  '/crop-cycles',
  authMiddleware,
  requireRole(['farmer', 'super_admin']),
  async (req: any, res: Response) => {
    const { farmId, plotId, cropType, variety, season, startDate, expectedHarvestDate, currentStage, targetYieldKg, notes } = req.body;

    if (!farmId || !plotId || !cropType || !variety) {
      return res.status(422).json({ error: 'ValidationError', message: 'Farm, plot, crop type, and variety are required.' });
    }
    if (!startDate || !expectedHarvestDate) {
      return res.status(422).json({ error: 'ValidationError', message: 'Start date and expected harvest date are required.' });
    }

    try {
      const cycle = await serverDb.createCropCycle({
        farmId,
        plotId,
        cropName: cropType,
        cropType,
        variety: variety || 'Standard',
        category: 'Commercial Plantation',
        season: season || 'Intermediate / Year-Round',
        startDate,
        expectedHarvestDate,
        stage: currentStage || 'Land Preparation',
        currentStage: currentStage || 'Land Preparation',
        targetYieldKg: Number(targetYieldKg) || 1000,
        actualYieldKg: 0,
        status: 'in_progress',
        notes: notes || '',
      });

      await serverDb.logAudit('CREATE', 'CROP_CYCLE', cycle.id, req.user!.id, req.user!.role, `Initiated crop cycle for ${cropType}`);
      res.status(201).json({ data: cycle, message: 'Crop cycle initiated successfully.' });
    } catch (err: any) {
      res.status(422).json({ error: 'ValidationError', message: err.message });
    }
  }
);

apiRouter.post(
  '/crop-cycles/:id/advance-stage',
  authMiddleware,
  requireRole(['farmer', 'agronomist', 'super_admin']),
  async (req: any, res: Response) => {
    const { stage } = req.body;
    const allowedStages = ['Land Preparation', 'Sowing / Nursery', 'Vegetative', 'Flowering', 'Ripening', 'Harvested', 'Closed'];
    if (!stage || !allowedStages.includes(stage)) {
      return res.status(422).json({ error: 'ValidationError', message: `Invalid growth stage. Allowed: [${allowedStages.join(', ')}]` });
    }

    try {
      const updated = await serverDb.advanceCropStage(req.params.id, stage);
      await serverDb.logAudit('UPDATE', 'CROP_CYCLE', req.params.id, req.user!.id, req.user!.role, `Advanced growth stage to '${stage}'`);
      res.json({ data: updated, message: `Crop cycle advanced to ${stage}.` });
    } catch (err: any) {
      res.status(404).json({ error: 'NotFound', message: err.message });
    }
  }
);

// Observations
apiRouter.get('/crop-cycles/:id/observations', authMiddleware, async (req: any, res: Response) => {
  const observations = await serverDb.getObservations(req.params.id);
  res.json({ data: observations, count: observations.length });
});

apiRouter.post(
  '/crop-cycles/:id/observations',
  authMiddleware,
  requireRole(['farmer', 'agronomist', 'super_admin']),
  async (req: any, res: Response) => {
    const { stage, healthStatus, observationType, severity, title, description, recommendation } = req.body;
    if (!title || !description) {
      return res.status(422).json({ error: 'ValidationError', message: 'Title and description are required.' });
    }

    const cycle = await serverDb.getCropCycleById(req.params.id);
    const obs = await serverDb.createObservation({
      cropCycleId: req.params.id,
      farmId: cycle?.farmId || 'farm-01',
      authorId: req.user!.id,
      authorName: req.user!.name,
      authorRole: req.user!.role,
      date: new Date().toISOString().split('T')[0],
      stage: stage || 'Vegetative',
      healthStatus: healthStatus || 'good',
      observationType: observationType || 'general',
      severity: severity || 'low',
      title,
      description,
      recommendation: recommendation || '',
    });

    await serverDb.logAudit('CREATE', 'OBSERVATION', obs.id, req.user!.id, req.user!.role, `Logged observation: ${title}`);
    res.status(201).json({ data: obs, message: 'Observation recorded successfully.' });
  }
);

// ====================================================================
// 5. FIELD TASKS & WORKER DISPATCH
// ====================================================================
apiRouter.get('/tasks', authMiddleware, async (req: any, res: Response) => {
  const farmId = req.query.farmId as string;
  const assignedTo = req.user!.role === 'farm_worker' ? req.user!.id : (req.query.assignedTo as string);
  const tasks = await serverDb.getTasks(farmId, assignedTo);
  res.json({ data: tasks, count: tasks.length });
});

apiRouter.post(
  '/tasks',
  authMiddleware,
  requireRole(['farmer', 'super_admin']),
  async (req: any, res: Response) => {
    const { farmId, plotId, cropCycleId, title, description, category, priority, assignedToId, assignedToName, dueDate } = req.body;

    if (!farmId || !title || !dueDate || !assignedToId) {
      return res.status(422).json({ error: 'ValidationError', message: 'Farm, title, due date, and assigned worker are required.' });
    }

    const task = await serverDb.createTask({
      farmId,
      plotId,
      cropCycleId,
      title: title.trim(),
      description: description || '',
      category: category || 'irrigation',
      priority: priority || 'medium',
      status: 'pending',
      assignedToId,
      assignedToName: assignedToName || 'Assigned Worker',
      dueDate,
      createdBy: req.user!.name || req.user!.id,
    });

    await serverDb.logAudit('CREATE', 'TASK', task.id, req.user!.id, req.user!.role, `Dispatched task: ${task.title}`);
    res.status(201).json({ data: task, message: 'Field task assigned successfully.' });
  }
);

apiRouter.patch(
  '/tasks/:id/status',
  authMiddleware,
  async (req: any, res: Response) => {
    const { status, completionNotes } = req.body;
    const task = await serverDb.getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: 'NotFound', message: 'Task not found.' });

    const isAssignedWorker = task.assignedToId === req.user!.id;
    const isManager = req.user!.role === 'farmer' || req.user!.role === 'super_admin';
    if (!isAssignedWorker && !isManager) {
      return res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to update this task.' });
    }

    const updated = await serverDb.updateTaskStatus(req.params.id, status, completionNotes);
    await serverDb.logAudit('UPDATE', 'TASK', task.id, req.user!.id, req.user!.role, `Task '${task.title}' updated to '${status}'`);
    res.json({ data: updated, message: `Task status updated to ${status}.` });
  }
);

// ====================================================================
// 6. TRANSACTIONAL INVENTORY & STOCK
// ====================================================================
apiRouter.get('/inventory', authMiddleware, async (req: any, res: Response) => {
  const farmId = req.query.farmId as string;
  const items = await serverDb.getInventory(farmId);
  res.json({ data: items, count: items.length });
});

apiRouter.post(
  '/inventory',
  authMiddleware,
  requireRole(['farmer', 'super_admin']),
  async (req: any, res: Response) => {
    const { farmId, name, category, sku, currentStock, unit, reorderThreshold, unitCost, location, supplierId } = req.body;

    if (!farmId || !name || !sku || !unit) {
      return res.status(422).json({ error: 'ValidationError', message: 'Farm, name, SKU, and unit are required.' });
    }

    const stock = Number(currentStock);
    if (isNaN(stock) || stock < 0) {
      return res.status(422).json({ error: 'ValidationError', message: 'Current stock cannot be negative.' });
    }

    const item = await serverDb.createInventoryItem({
      farmId,
      name: name.trim(),
      category: category || 'Fertilizers & Nutrients',
      sku: sku.trim().toUpperCase(),
      currentStock: stock,
      unit,
      minReorderLevel: Number(reorderThreshold) || 10,
      reorderThreshold: Number(reorderThreshold) || 10,
      costPerUnit: Number(unitCost) || 0,
      unitCost: Number(unitCost) || 0,
      locationStorage: location || 'Main Warehouse',
      location: location || 'Main Warehouse',
      supplierId,
      status: stock === 0 ? 'out_of_stock' : stock <= (reorderThreshold || 10) ? 'low_stock' : 'in_stock',
    });

    await serverDb.logAudit('CREATE', 'INVENTORY', item.id, req.user!.id, req.user!.role, `Created SKU ${sku} (${item.name})`);
    res.status(201).json({ data: item, message: 'Inventory SKU created successfully.' });
  }
);

// Transactional Stock Issue (Strict Non-Negative Check)
apiRouter.post(
  '/inventory/:id/issue',
  authMiddleware,
  requireRole(['farmer', 'farm_worker', 'super_admin']),
  async (req: any, res: Response) => {
    const { quantity, reason } = req.body;
    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(422).json({ error: 'ValidationError', message: 'Deduction quantity must be a positive number.' });
    }

    const result = await serverDb.issueStock(
      req.params.id,
      numQty,
      reason || 'Field operation issue',
      req.user!.id,
      req.user!.name
    );

    if (!result.success) {
      return res.status(422).json({ error: 'InsufficientStock', message: result.error });
    }

    await serverDb.logAudit(
      'STOCK_ISSUE',
      'INVENTORY',
      req.params.id,
      req.user!.id,
      req.user!.role,
      `Issued ${numQty} units. New balance: ${result.movement?.newStock}`
    );

    res.json({ data: result.movement, message: 'Stock issued and deducted from inventory balance.' });
  }
);

// Stock Replenishment Receive
apiRouter.post(
  '/inventory/:id/receive',
  authMiddleware,
  requireRole(['farmer', 'supplier', 'super_admin']),
  async (req: any, res: Response) => {
    const { quantity, unitCost } = req.body;
    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(422).json({ error: 'ValidationError', message: 'Received quantity must be a positive number.' });
    }

    const result = await serverDb.receiveStock(
      req.params.id,
      numQty,
      Number(unitCost) || 0,
      req.user!.id,
      req.user!.name
    );

    if (!result.success) {
      return res.status(422).json({ error: 'ReceiveError', message: result.error });
    }

    await serverDb.logAudit(
      'STOCK_RECEIVE',
      'INVENTORY',
      req.params.id,
      req.user!.id,
      req.user!.role,
      `Received ${numQty} units from supplier replenishment`
    );

    res.json({ data: result.movement, message: 'Stock replenishment recorded successfully.' });
  }
);

apiRouter.get('/inventory/movements', authMiddleware, async (req: any, res: Response) => {
  const farmId = req.query.farmId as string;
  const movements = await serverDb.getStockMovements(farmId);
  res.json({ data: movements, count: movements.length });
});

apiRouter.get('/suppliers', authMiddleware, async (req: Request, res: Response) => {
  const suppliers = await serverDb.getSuppliers();
  res.json({ data: suppliers, count: suppliers.length });
});

// ====================================================================
// 7. HARVEST RECORDS & FARM FINANCE
// ====================================================================
apiRouter.get('/harvests', authMiddleware, requireRole(['farmer', 'super_admin']), async (req: any, res: Response) => {
  const farmId = req.query.farmId as string;
  const harvests = await serverDb.getHarvests(farmId);
  res.json({ data: harvests, count: harvests.length });
});

apiRouter.post('/harvests', authMiddleware, requireRole(['farmer', 'super_admin']), async (req: any, res: Response) => {
  const { farmId, cropCycleId, harvestDate, quantity, unit, qualityGrade, marketUnitPrice, notes, storageLocation } = req.body;

  if (!farmId || !cropCycleId || !quantity || !unit || !marketUnitPrice) {
    return res.status(422).json({ error: 'ValidationError', message: 'Farm, crop cycle, quantity, and unit price are required.' });
  }

  const numQty = Number(quantity);
  const numPrice = Number(marketUnitPrice);
  const totalRevenue = Math.round(numQty * numPrice * 100) / 100;

  const cycle = await serverDb.getCropCycleById(cropCycleId);
  const plot = cycle ? await serverDb.getPlotById(cycle.plotId) : undefined;

  const harvest = await serverDb.createHarvest({
    farmId,
    cropCycleId,
    cropName: cycle?.cropName || 'Produce Batch',
    plotName: plot?.name || 'Plot A-1',
    harvestDate: harvestDate || new Date().toISOString().split('T')[0],
    quantity: numQty,
    unit: unit || 'kg',
    qualityGrade: qualityGrade || 'Grade A (Export / Premium)',
    estimatedMarketPricePerUnit: numPrice,
    marketUnitPrice: numPrice,
    estimatedRevenue: totalRevenue,
    totalRevenue,
    recordedBy: req.user!.name || req.user!.id,
    notes: notes || '',
    storageLocation: storageLocation || 'Estate Cold Store',
  });

  await serverDb.logAudit('CREATE', 'HARVEST', harvest.id, req.user!.id, req.user!.role, `Recorded harvest of ${numQty} ${unit}`);
  res.status(201).json({ data: harvest, message: 'Harvest record and revenue logged successfully.' });
});

apiRouter.get('/expenses', authMiddleware, requireRole(['farmer', 'super_admin']), async (req: any, res: Response) => {
  const farmId = req.query.farmId as string;
  const expenses = await serverDb.getExpenses(farmId);
  res.json({ data: expenses, count: expenses.length });
});

apiRouter.post('/expenses', authMiddleware, requireRole(['farmer', 'super_admin']), async (req: any, res: Response) => {
  const { farmId, cropCycleId, category, description, amount, date, vendor, paymentStatus, receiptReference } = req.body;

  if (!farmId || !category || !description || !amount) {
    return res.status(422).json({ error: 'ValidationError', message: 'Farm, category, description, and amount are required.' });
  }

  const expense = await serverDb.createExpense({
    farmId,
    cropCycleId,
    category,
    description: description.trim(),
    amount: Number(amount),
    currency: 'LKR',
    recordedBy: req.user!.name || req.user!.id,
    date: date || new Date().toISOString().split('T')[0],
    vendor: vendor || 'Agro Supplier',
    paymentStatus: paymentStatus || 'paid',
    receiptReference: receiptReference || `REC-${Date.now().toString().slice(-6)}`,
  });

  await serverDb.logAudit('CREATE', 'EXPENSE', expense.id, req.user!.id, req.user!.role, `Logged expense of LKR ${expense.amount}`);
  res.status(201).json({ data: expense, message: 'Expense recorded successfully.' });
});

apiRouter.get('/finance/summary', authMiddleware, requireRole(['farmer', 'super_admin']), async (req: any, res: Response) => {
  const farmId = req.query.farmId as string;
  const summary = await serverDb.getFinancialSummary(farmId);
  res.json({ data: summary });
});

// ====================================================================
// 8. PRODUCE MARKETPLACE & ATOMIC CHECKOUT
// ====================================================================
apiRouter.get('/marketplace/listings', async (req: Request, res: Response) => {
  const listings = await serverDb.getProduceListings();
  res.json({ data: listings, count: listings.length });
});

apiRouter.post(
  '/marketplace/listings',
  authMiddleware,
  requireRole(['farmer', 'super_admin']),
  async (req: any, res: Response) => {
    const { farmId, cropName, variety, quantityAvailable, unit, pricePerUnit, grade, district, description, imageUrl } = req.body;

    if (!cropName || !quantityAvailable || !pricePerUnit) {
      return res.status(422).json({ error: 'ValidationError', message: 'Crop name, quantity, and price per unit are required.' });
    }

    const listing = await serverDb.createProduceListing({
      farmerId: req.user!.id,
      farmerName: req.user!.name,
      farmId: farmId || 'farm-01',
      cropName: cropName.trim(),
      variety: variety || 'Standard',
      quantityAvailable: Number(quantityAvailable),
      unit: unit || 'kg',
      pricePerUnit: Number(pricePerUnit),
      currency: 'LKR',
      availableFrom: new Date().toISOString().split('T')[0],
      harvestDate: new Date().toISOString().split('T')[0],
      grade: grade || 'Grade A',
      district: district || req.user!.district || 'Nuwara Eliya',
      description: description || '',
      imageUrl: imageUrl || '/src/assets/images/crop_ceylon_tea_1792164656862.jpg',
      status: 'active',
    });

    await serverDb.logAudit('CREATE', 'INVENTORY', listing.id, req.user!.id, req.user!.role, `Listed ${listing.cropName}`);
    res.status(201).json({ data: listing, message: 'Produce lot listed on wholesale marketplace.' });
  }
);

apiRouter.post(
  '/marketplace/orders',
  authMiddleware,
  requireRole(['buyer', 'farmer', 'super_admin']),
  async (req: any, res: Response) => {
    const { deliveryAddress, district, paymentMethod, items, notes } = req.body;

    if (!deliveryAddress || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(422).json({ error: 'ValidationError', message: 'Delivery address and items list are required.' });
    }

    const result = await serverDb.placeOrder({
      buyerId: req.user!.id,
      buyerName: req.user!.name,
      buyerEmail: req.user!.email,
      buyerPhone: req.body.buyerPhone || '+94 77 000 0000',
      deliveryAddress,
      district: district || 'Colombo',
      paymentMethod: paymentMethod || 'Bank Transfer (Simulated)',
      items,
      notes: notes || '',
    });

    if (!result.success) {
      return res.status(422).json({ error: 'OrderFailed', message: result.error });
    }

    await serverDb.logAudit(
      'ORDER_PLACE',
      'ORDER',
      result.order!.id,
      req.user!.id,
      req.user!.role,
      `Placed order ${result.order!.orderNumber} totaling LKR ${result.order!.totalAmount}`
    );

    res.status(201).json({ data: result.order, message: 'Order confirmed and inventory reserved atomically.' });
  }
);

apiRouter.get('/marketplace/orders', authMiddleware, async (req: any, res: Response) => {
  const buyerId = req.user!.role === 'buyer' ? req.user!.id : (req.query.buyerId as string);
  const orders = await serverDb.getOrders(buyerId);
  res.json({ data: orders, count: orders.length });
});

apiRouter.patch(
  '/marketplace/orders/:id/status',
  authMiddleware,
  requireRole(['farmer', 'buyer', 'super_admin']),
  async (req: any, res: Response) => {
    const { status } = req.body;
    try {
      const updated = await serverDb.updateOrderStatus(req.params.id, status);
      await serverDb.logAudit(
        'ORDER_STATUS',
        'MARKETPLACE_ORDER',
        req.params.id,
        req.user!.id,
        req.user!.role,
        `Order status transitioned to '${status}'`
      );
      res.json({ data: updated, message: `Order status updated to ${status}.` });
    } catch (err: any) {
      res.status(404).json({ error: 'NotFound', message: err.message });
    }
  }
);

// ====================================================================
// 9. METEOROLOGICAL WEATHER INTELLIGENCE
// ====================================================================
apiRouter.get('/weather/:district', async (req: Request, res: Response) => {
  const district = decodeURIComponent(req.params.district);
  const weather = await WeatherService.getDistrictWeather(district);
  res.json({ data: weather });
});

// ====================================================================
// 10. COMPLIANCE AUDIT LOGS (ADMIN ONLY)
// ====================================================================
apiRouter.get(
  '/audit-logs',
  authMiddleware,
  requireRole(['super_admin']),
  async (req: any, res: Response) => {
    const logs = await serverDb.getAuditLogs();
    res.json({ data: logs, count: logs.length });
  }
);
