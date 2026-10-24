export type UserRole =
  | 'super_admin'
  | 'farmer'
  | 'farm_worker'
  | 'agronomist'
  | 'buyer'
  | 'supplier'
  | 'support_staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  district?: string;
  organization?: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
}

export type AreaUnit = 'acres' | 'hectares' | 'sq_meters';

export interface Farm {
  id: string;
  ownerId: string;
  name: string;
  district: string;
  province: string;
  address: string;
  latitude: number;
  longitude: number;
  totalArea: number;
  areaUnit: AreaUnit;
  soilPrimary: 'Reddish Brown Earth' | 'Red-Yellow Podzolic' | 'Alluvial' | 'Latosolic' | 'Regosol';
  irrigationPrimary: 'Drip' | 'Sprinkler' | 'Furrow / Canal' | 'Rainfed' | 'Tube Well';
  assignedWorkers: string[]; // user IDs
  status: 'active' | 'archived';
  createdAt: string;
}

export interface LandPlot {
  id: string;
  farmId: string;
  name: string;
  plotCode: string;
  area: number;
  areaUnit: AreaUnit;
  soilType: string;
  irrigationType: string;
  currentCropCycleId?: string;
  status: 'cultivated' | 'fallow' | 'preparing' | 'resting';
  createdAt?: string;
}

export type CropSeason = 'Maha (Major Monsoon)' | 'Yala (Minor Monsoon)' | 'Intermediate / Year-Round';

export type GrowthStage =
  | 'Land Preparation'
  | 'Sowing / Nursery'
  | 'Vegetative Growth'
  | 'Flowering / Tillering'
  | 'Fruiting / Grain Fill'
  | 'Ripening'
  | 'Harvest Ready'
  | 'Harvested';

export interface CropCycle {
  id: string;
  farmId: string;
  plotId: string;
  cropName: string;
  cropType?: string;
  variety: string;
  category: 'Paddy & Grains' | 'Commercial Plantation' | 'Vegetables' | 'Spices' | 'Fruits';
  season: CropSeason;
  startDate: string;
  expectedHarvestDate: string;
  actualHarvestDate?: string;
  stage: GrowthStage;
  currentStage?: GrowthStage;
  targetYieldKg: number;
  actualYieldKg?: number;
  status: 'planned' | 'in_progress' | 'completed' | 'abandoned';
  notes?: string;
  createdAt?: string;
}

export interface CropObservation {
  id: string;
  cropCycleId: string;
  farmId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  date: string;
  observationType: 'Pest & Disease' | 'Nutrient Deficiency' | 'Growth Progress' | 'Irrigation Check' | 'Agronomist Advice';
  title: string;
  description: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  stage?: string;
  healthStatus?: string;
  recommendation?: string;
  imageUrl?: string;
  createdAt?: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskCategory = 'irrigation' | 'fertilizing' | 'planting' | 'inspection' | 'harvesting' | 'weeding' | 'equipment';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface FarmTask {
  id: string;
  farmId: string;
  plotId?: string;
  cropCycleId?: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  assignedToId?: string;
  assignedToName?: string;
  dueDate: string;
  completedAt?: string;
  completionNotes?: string;
  completionEvidenceUrl?: string;
  createdBy: string;
  createdAt: string;
}

export type InventoryCategory = 'Seeds & Seedlings' | 'Fertilizers & Nutrients' | 'Crop Protection & Agrochemicals' | 'Tools & Machinery' | 'Packaging & Containers';

export interface InventoryItem {
  id: string;
  farmId: string;
  name: string;
  sku?: string;
  category: InventoryCategory;
  unit: 'kg' | 'liters' | 'units' | 'bags' | 'packets';
  currentStock: number;
  minReorderLevel: number;
  reorderThreshold?: number;
  costPerUnit: number;
  unitCost?: number;
  supplierId?: string;
  batchNumber?: string;
  expiryDate?: string;
  locationStorage: string;
  location?: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  updatedAt: string;
  createdAt?: string;
}

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  inventoryItemName?: string;
  farmId: string;
  type: 'received' | 'issued' | 'adjustment' | 'return';
  quantity: number;
  unit?: string;
  previousStock: number;
  newStock: number;
  referenceReason?: string;
  reason?: string;
  batchNumber?: string;
  actorId?: string;
  actorName?: string;
  performedById?: string;
  performedByName?: string;
  createdAt: string;
  timestamp?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  district: string;
  categoriesSupplied: string[];
  rating: number;
  createdAt?: string;
}

export interface Expense {
  id: string;
  farmId: string;
  cropCycleId?: string;
  category: 'Seeds & Planting' | 'Fertilizers' | 'Labor & Wages' | 'Fuel & Energy' | 'Equipment Maintenance' | 'Water & Irrigation' | 'Packaging & Transport';
  description: string;
  amount: number;
  currency: string;
  date: string;
  recordedBy: string;
  receiptNumber?: string;
  vendor?: string;
  paymentStatus?: string;
  receiptReference?: string;
  createdAt?: string;
}

export interface HarvestRecord {
  id: string;
  farmId: string;
  cropCycleId: string;
  cropName: string;
  plotName: string;
  harvestDate: string;
  quantity: number;
  unit: 'kg' | 'MT' | 'crates' | 'sacks';
  qualityGrade: 'Grade A (Export / Premium)' | 'Grade B (Standard Market)' | 'Grade C (Processing / Economy)';
  estimatedMarketPricePerUnit: number;
  marketPricePerUnit?: number;
  marketUnitPrice?: number;
  estimatedRevenue: number;
  totalRevenue?: number;
  revenue?: number;
  storageLocation: string;
  recordedBy: string;
  notes?: string;
  createdAt?: string;
}

export interface ProduceListing {
  id: string;
  farmerId: string;
  farmerName: string;
  farmId: string;
  cropName: string;
  variety: string;
  district: string;
  quantityAvailable: number;
  unit: 'kg' | 'MT' | 'sacks' | 'crates';
  pricePerUnit: number;
  currency: string;
  grade: string;
  availableFrom: string;
  imageUrl?: string;
  status: 'active' | 'reserved' | 'sold_out';
  description: string;
  harvestDate?: string;
  createdAt?: string;
}

export interface CartItem {
  listingId: string;
  listing: ProduceListing;
  quantity: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  deliveryAddress: string;
  district: string;
  items: {
    listingId: string;
    cropName: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    unitPrice?: number;
    subtotal: number;
  }[];
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paymentMethod: 'Bank Transfer (Simulated)' | 'Cash on Delivery (COD)' | 'Digital Escrow (Simulated)';
  paymentStatus: 'pending' | 'verified' | 'refunded' | 'completed' | 'failed' | 'escrow_held';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeatherData {
  district: string;
  province?: string;
  temperatureC?: number;
  temperature?: number;
  feelsLikeC?: number;
  humidityPercent?: number;
  humidity?: number;
  rainfallMm?: number;
  rainfallForecast?: string;
  windSpeedKmh?: number;
  windSpeed?: string;
  condition: 'Sunny' | 'Partly Cloudy' | 'Rain Showers' | 'Heavy Monsoon Rain' | 'Thunderstorm' | string;
  uvIndex?: number;
  forecast5Days?: {
    date: string;
    day: string;
    tempMax: number;
    tempMin: number;
    rainfallProb: number;
    condition: string;
  }[];
  forecast?: any[];
  agriculturalAdvisory?: string;
  alerts?: string[];
  isSimulated?: boolean;
  lastUpdated: string;
  provider?: string;
  isLive?: boolean;
  providerStatus?: string;
  cachedAt?: number;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorName: string;
  actorRole: UserRole | string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STOCK_ISSUE' | 'STOCK_RECEIVE' | 'ORDER_STATUS' | 'PERM_CHANGE' | 'LOGIN' | 'LOGOUT' | 'PERMISSION_VIOLATION' | 'SECURITY_ALERT' | 'ORDER_PLACE';
  entity?: 'FARM' | 'PLOT' | 'CROP_CYCLE' | 'TASK' | 'INVENTORY' | 'HARVEST' | 'ORDER' | 'USER' | 'AUTH' | 'SYSTEM' | string;
  entityType?: string;
  entityId: string;
  details: string;
  timestamp: string;
  userId?: string;
  userRole?: string;
  ipAddress?: string;
}

export interface Recommendation {
  id: string;
  type: 'task_overdue' | 'low_inventory' | 'harvest_due' | 'weather_risk' | 'pest_alert' | 'budget_warning';
  priority: 'high' | 'medium' | 'info';
  title: string;
  message: string;
  description?: string;
  actionLabel?: string;
  actionModule?: string;
  createdAt: string;
}
