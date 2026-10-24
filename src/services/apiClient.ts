/**
 * AgroPulse Real Backend API Client
 * Manages Bearer JWT session token, typed HTTP communication with /api/v1 REST endpoints,
 * and automatic session expiration handling.
 */

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
  AuditLog
} from '../types';

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  count?: number;
  status: number;
}

const TOKEN_STORAGE_KEY = 'agropulse_auth_jwt_v1';

class ApiClient {
  private baseUrl = '/api/v1';
  private token: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;

  constructor() {
    // Load existing token from sessionStorage if present
    if (typeof window !== 'undefined') {
      try {
        this.token = sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);
      } catch {
        this.token = null;
      }
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      try {
        if (token) {
          sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
          localStorage.setItem(TOKEN_STORAGE_KEY, token);
        } else {
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } catch {
        // ignore
      }
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public onUnauthorized(callback: () => void) {
    this.onUnauthorizedCallback = callback;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = { ...this.getHeaders(), ...(options.headers as Record<string, string>) };

    try {
      const res = await fetch(url, { ...options, headers });
      const status = res.status;

      let json: any = {};
      try {
        json = await res.json();
      } catch {
        json = {};
      }

      if (status === 401) {
        // Token expired or invalid
        this.setToken(null);
        if (this.onUnauthorizedCallback) {
          this.onUnauthorizedCallback();
        }
      }

      return {
        data: json.data,
        message: json.message,
        error: json.message || json.error,
        count: json.count,
        status,
      };
    } catch (err: any) {
      return {
        error: err.message || 'Network error communicating with AgroPulse server.',
        status: 0,
      };
    }
  }

  // HTTP Primitives
  public get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  public post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ====================================================================
  // TYPED DOMAIN METHODS
  // ====================================================================

  // Auth
  public auth = {
    login: (credentials: { email: string; password: string }) =>
      this.post<{ token: string; user: User }>('/auth/login', credentials),

    register: (userData: {
      name: string;
      email: string;
      password: string;
      confirmPassword: string;
      role: UserRole;
      district?: string;
      organization?: string;
      phone?: string;
    }) => this.post<{ token: string; user: User }>('/auth/register', userData),

    getMe: () => this.get<User & { permissions: Record<string, boolean> }>('/auth/me'),

    forgotPassword: (email: string) =>
      this.post<{ message: string }>('/auth/forgot-password', { email }),
  };

  // Farms
  public farms = {
    getAll: () => this.get<Farm[]>('/farms'),
    getById: (id: string) => this.get<Farm>(`/farms/${id}`),
    create: (farm: Omit<Farm, 'id' | 'createdAt'>) => this.post<Farm>('/farms', farm),
    update: (id: string, updates: Partial<Farm>) => this.put<Farm>(`/farms/${id}`, updates),
    delete: (id: string) => this.delete<{ message: string }>(`/farms/${id}`),

    getPlots: (farmId: string) => this.get<LandPlot[]>(`/farms/${farmId}/plots`),
    createPlot: (farmId: string, plot: Omit<LandPlot, 'id' | 'createdAt' | 'farmId'>) =>
      this.post<LandPlot>(`/farms/${farmId}/plots`, plot),
    deletePlot: (id: string) => this.delete<{ message: string }>(`/plots/${id}`),
  };

  // Crops
  public crops = {
    getAll: (farmId?: string) =>
      this.get<CropCycle[]>(farmId ? `/crop-cycles?farmId=${encodeURIComponent(farmId)}` : '/crop-cycles'),
    getById: (id: string) => this.get<CropCycle>(`/crop-cycles/${id}`),
    create: (cycle: Omit<CropCycle, 'id' | 'createdAt'>) => this.post<CropCycle>('/crop-cycles', cycle),
    advanceStage: (id: string, stage: CropCycle['stage']) =>
      this.post<CropCycle>(`/crop-cycles/${id}/advance-stage`, { stage }),

    getObservations: (cycleId: string) =>
      this.get<CropObservation[]>(`/crop-cycles/${cycleId}/observations`),
    createObservation: (cycleId: string, obs: Omit<CropObservation, 'id' | 'createdAt' | 'cropCycleId' | 'authorId' | 'authorName' | 'authorRole' | 'date'>) =>
      this.post<CropObservation>(`/crop-cycles/${cycleId}/observations`, obs),
  };

  // Tasks
  public tasks = {
    getAll: (farmId?: string) =>
      this.get<FarmTask[]>(farmId ? `/tasks?farmId=${encodeURIComponent(farmId)}` : '/tasks'),
    create: (task: Omit<FarmTask, 'id' | 'createdAt'>) => this.post<FarmTask>('/tasks', task),
    updateStatus: (id: string, status: FarmTask['status'], completionNotes?: string) =>
      this.patch<FarmTask>(`/tasks/${id}/status`, { status, completionNotes }),
  };

  // Inventory
  public inventory = {
    getAll: (farmId?: string) =>
      this.get<InventoryItem[]>(farmId ? `/inventory?farmId=${encodeURIComponent(farmId)}` : '/inventory'),
    create: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) =>
      this.post<InventoryItem>('/inventory', item),
    issueStock: (id: string, quantity: number, reason: string) =>
      this.post<StockMovement>(`/inventory/${id}/issue`, { quantity, reason }),
    receiveStock: (id: string, quantity: number, unitCost: number) =>
      this.post<StockMovement>(`/inventory/${id}/receive`, { quantity, unitCost }),
    getMovements: (farmId?: string) =>
      this.get<StockMovement[]>(farmId ? `/inventory/movements?farmId=${encodeURIComponent(farmId)}` : '/inventory/movements'),
    getSuppliers: () => this.get<Supplier[]>('/suppliers'),
  };

  // Finance & Harvests
  public finance = {
    getHarvests: (farmId?: string) =>
      this.get<HarvestRecord[]>(farmId ? `/harvests?farmId=${encodeURIComponent(farmId)}` : '/harvests'),
    createHarvest: (harvest: Omit<HarvestRecord, 'id' | 'createdAt'>) =>
      this.post<HarvestRecord>('/harvests', harvest),
    getExpenses: (farmId?: string) =>
      this.get<Expense[]>(farmId ? `/expenses?farmId=${encodeURIComponent(farmId)}` : '/expenses'),
    createExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) =>
      this.post<Expense>('/expenses', expense),
    getSummary: (farmId?: string) =>
      this.get<{
        totalRevenue: number;
        totalExpenses: number;
        netProfit: number;
        profitMarginPercent: number;
        harvestCount: number;
        expenseCount: number;
      }>(farmId ? `/finance/summary?farmId=${encodeURIComponent(farmId)}` : '/finance/summary'),
  };

  // Marketplace
  public marketplace = {
    getListings: () => this.get<ProduceListing[]>('/marketplace/listings'),
    createListing: (listing: Omit<ProduceListing, 'id' | 'createdAt' | 'farmerId' | 'farmerName' | 'status'>) =>
      this.post<ProduceListing>('/marketplace/listings', listing),
    placeOrder: (orderData: {
      deliveryAddress: string;
      district: string;
      paymentMethod: string;
      items: { listingId: string; quantity: number }[];
      notes?: string;
      buyerPhone?: string;
    }) => this.post<Order>('/marketplace/orders', orderData),
    getOrders: () => this.get<Order[]>('/marketplace/orders'),
    updateOrderStatus: (id: string, status: OrderStatus) =>
      this.patch<Order>(`/marketplace/orders/${id}/status`, { status }),
  };

  // Weather
  public weather = {
    getDistrictWeather: (district: string) =>
      this.get<WeatherData & { provider: string; isLive: boolean; providerStatus: string; lastUpdated: string }>(
        `/weather/${encodeURIComponent(district)}`
      ),
  };

  // System & Audit
  public system = {
    getDbStatus: () => this.get<any>('/system/db-status'),
    resetDemo: () => this.post<{ message: string }>('/system/reset-demo'),
    getAuditLogs: () => this.get<AuditLog[]>('/audit-logs'),
  };
}

export const api = new ApiClient();
