import React, { useState } from 'react';
import {
  Code2,
  Database,
  Layers,
  Server,
  FileCode,
  Copy,
  Check,
  ShieldCheck,
  Cpu,
  GitBranch
} from 'lucide-react';
import { useToast } from '../common/Toast';

export function LaravelMigrationDoc() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'er_diagram' | 'migrations' | 'models' | 'api' | 'devops' | 'live_api'>('er_diagram');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(id);
    showToast('success', 'Copied to Clipboard', 'Code snippet copied.');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const erDiagramText = `
========================================================================================
                          AGROPULSE RELATIONAL DATABASE ER SCHEMA
========================================================================================

 [users] 1 ────< [role_user] >──── 1 [roles]
    │                                    │
    │ 1                                  │ 1
    ├──────< [farms]                     └──────< [permission_role] >──── 1 [permissions]
    │           │
    │           │ 1
    │           ├──────< [land_plots]
    │           │           │
    │           │           │ 1
    │           │           └──────< [crop_cycles]
    │           │                       │
    │           │                       ├──────< [crop_observations]
    │           │                       ├──────< [harvests]
    │           │                       └──────< [expenses]
    │           │
    │           ├──────< [farm_tasks] (assigned_to -> users.id)
    │           ├──────< [farm_members] (user_id -> users.id)
    │           │
    │           ├──────< [inventory_items]
    │           │           │
    │           │           │ 1
    │           │           └──────< [stock_movements] (actor_id -> users.id)
    │           │
    │           └──────< [produce_listings]
    │                       │
    │                       │ 1
    │                       └──────< [order_items] >────── 1 [orders]
    │                                                            │ (buyer_id -> users.id)
    │
    └──────< [audit_logs] (actor_id, entity, action, timestamp)
`;

  const migrationCodeSample = `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Farms Table
        Schema::create('farms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('owner_id')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->string('district'); // e.g. Nuwara Eliya, Anuradhapura
            $table->string('province');
            $table->text('address');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('total_area', 10, 2);
            $table->enum('area_unit', ['acres', 'hectares', 'sq_meters'])->default('acres');
            $table->string('soil_primary');
            $table->string('irrigation_primary');
            $table->enum('status', ['active', 'archived'])->default('active');
            $table->timestamps();

            $table->index(['district', 'status']);
        });

        // 2. Land Plots
        Schema::create('land_plots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->onDelete('cascade');
            $table->string('name');
            $table->string('plot_code')->unique();
            $table->decimal('area', 8, 2);
            $table->string('soil_type');
            $table->string('irrigation_type');
            $table->uuid('current_crop_cycle_id')->nullable();
            $table->enum('status', ['cultivated', 'fallow', 'preparing', 'resting'])->default('resting');
            $table->timestamps();
        });

        // 3. Inventory & Strict Non-Negative Constraints
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('farm_id')->constrained('farms')->onDelete('cascade');
            $table->string('name');
            $table->string('category');
            $table->string('unit', 20);
            $table->decimal('current_stock', 12, 2)->unsigned()->default(0); // Cannot be negative!
            $table->decimal('min_reorder_level', 12, 2)->default(10);
            $table->decimal('cost_per_unit', 12, 2)->default(0);
            $table->string('batch_number')->nullable();
            $table->date('expiry_date')->nullable();
            $table->string('location_storage');
            $table->enum('status', ['in_stock', 'low_stock', 'out_of_stock'])->default('in_stock');
            $table->timestamps();

            $table->index(['farm_id', 'status']);
        });

        // 4. Immutable Stock Movements
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('inventory_item_id')->constrained('inventory_items')->onDelete('restrict');
            $table->foreignUuid('farm_id')->constrained('farms')->onDelete('cascade');
            $table->enum('type', ['received', 'issued', 'adjustment', 'return']);
            $table->decimal('quantity', 12, 2);
            $table->decimal('previous_stock', 12, 2);
            $table->decimal('new_stock', 12, 2);
            $table->string('reference_reason');
            $table->foreignUuid('actor_id')->constrained('users');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('land_plots');
        Schema::dropIfExists('farms');
    }
};`;

  const modelCodeSample = `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Relations\\BelongsTo;
use Illuminate\\Database\\Eloquent\\Relations\\HasMany;
use Illuminate\\Support\\Facades\\DB;
use Exception;

class InventoryItem extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'current_stock' => 'decimal:2',
        'min_reorder_level' => 'decimal:2',
        'cost_per_unit' => 'decimal:2',
        'expiry_date' => 'date',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    /**
     * Transactional Non-Negative Stock Issue Action
     */
    public function issueStock(float $quantity, string $reason, string $actorId): StockMovement
    {
        return DB::transaction(function () use ($quantity, $reason, $actorId) {
            // Pessimistic write lock on record
            $lockedItem = self::where('id', $this->id)->lockForUpdate()->firstOrFail();

            if ($lockedItem->current_stock < $quantity) {
                throw new Exception("Non-negative inventory violation! Requested: {$quantity}, Available: {$lockedItem->current_stock}");
            }

            $previous = $lockedItem->current_stock;
            $newStock = $previous - $quantity;
            $lockedItem->current_stock = $newStock;
            $lockedItem->status = $newStock == 0 ? 'out_of_stock' : ($newStock <= $lockedItem->min_reorder_level ? 'low_stock' : 'in_stock');
            $lockedItem->save();

            return $lockedItem->movements()->create([
                'farm_id' => $lockedItem->farm_id,
                'type' => 'issued',
                'quantity' => $quantity,
                'previous_stock' => $previous,
                'new_stock' => $newStock,
                'reference_reason' => $reason,
                'actor_id' => $actorId,
            ]);
        });
    }
}`;

  const apiRoutesSample = `<?php

use Illuminate\\Support\\Facades\\Route;
use App\\Http\\Controllers\\Api\\V1\\AuthController;
use App\\Http\\Controllers\\Api\\V1\\FarmController;
use App\\Http\\Controllers\\Api\\V1\\PlotController;
use App\\Http\\Controllers\\Api\\V1\\CropCycleController;
use App\\Http\\Controllers\\Api\\V1\\TaskController;
use App\\Http\\Controllers\\Api\\V1\\InventoryController;
use App\\Http\\Controllers\\Api\\V1\\HarvestController;
use App\\Http\\Controllers\\Api\\V1\\MarketplaceController;
use App\\Http\\Controllers\\Api\\V1\\OrderController;
use App\\Http\\Controllers\\Api\\V1\\WeatherController;

// Public Endpoints
Route::prefix('v1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::get('/marketplace/listings', [MarketplaceController::class, 'index']);
    Route::get('/weather/{district}', [WeatherController::class, 'show']);

    // Authenticated API Endpoints (Laravel Sanctum)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/user/profile', [AuthController::class, 'profile']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Farms & Land Plots (Governed by FarmPolicy)
        Route::apiResource('farms', FarmController::class);
        Route::get('/farms/{farm}/plots', [PlotController::class, 'index']);
        Route::post('/farms/{farm}/plots', [PlotController::class, 'store']);

        // Crop Lifecycles & Field Tasks
        Route::apiResource('crop-cycles', CropCycleController::class);
        Route::post('/crop-cycles/{cycle}/advance-stage', [CropCycleController::class, 'advanceStage']);
        Route::apiResource('tasks', TaskController::class);
        Route::post('/tasks/{task}/complete', [TaskController::class, 'complete']);

        // Transactional Inventory Movements
        Route::get('/farms/{farm}/inventory', [InventoryController::class, 'index']);
        Route::post('/inventory/{item}/issue', [InventoryController::class, 'issue']);
        Route::post('/inventory/{item}/receive', [InventoryController::class, 'receive']);
        Route::get('/farms/{farm}/stock-movements', [InventoryController::class, 'movements']);

        // Financial & Harvest Ledger
        Route::apiResource('harvests', HarvestController::class);
        Route::get('/reports/financial-summary', [HarvestController::class, 'summary']);
        Route::get('/reports/export-csv', [HarvestController::class, 'exportCSV']);

        // Atomic Ordering
        Route::post('/orders/checkout', [OrderController::class, 'checkout']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    });
});`;

  const devopsText = `# AgroPulse Production Deployment Guide

## 1. Environment Requirements
- PHP 8.3+ with extensions: bcmath, ctype, fileinfo, json, mbstring, openssl, pdo_mysql, tokenizer, xml, redis
- MySQL 8.0+ or AWS Aurora MySQL
- Redis 7.0+ for cache, rate limiting, and Laravel Queues
- Nginx / Caddy Web Server
- Node.js 20+ (for building Vite frontend assets)

## 2. Production Installation Steps
\`\`\`bash
# 1. Clone repository
git clone https://github.com/agropulse/agropulse-platform.git /var/www/agropulse
cd /var/www/agropulse

# 2. Install production dependencies
composer install --no-dev --optimize-autoloader
npm ci && npm run build

# 3. Environment configuration
cp .env.example .env
php artisan key:generate

# 4. Run database migrations and seed baseline data
php artisan migrate --force
php artisan db:seed --class=AgroPulseProductionSeeder --force

# 5. Optimize configuration and routes
php artisan config:cache
php artisan route:cache
php artisan view:cache
\`\`\`

## 3. Background Queue & Scheduler Daemon
Configure Supervisor (/etc/supervisor/conf.d/agropulse-worker.conf):
\`\`\`ini
[program:agropulse-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/agropulse/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
user=www-data
numprocs=4
redirect_stderr=true
stdout_logfile=/var/www/agropulse/storage/logs/worker.log
\`\`\`

System crontab for hourly weather sync and daily harvest notifications:
\`\`\`bash
* * * * * cd /var/www/agropulse && php artisan schedule:run >> /dev/null 2>&1
\`\`\`
`;

  const [liveEndpoint, setLiveEndpoint] = useState('/api/v1/health');
  const [liveResponse, setLiveResponse] = useState<any>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiLatency, setApiLatency] = useState<number | null>(null);

  const testLiveEndpoint = async (endpoint: string) => {
    setIsLoadingApi(true);
    setLiveEndpoint(endpoint);
    const start = performance.now();
    try {
      const res = await fetch(endpoint, {
        headers: {
          'x-user-role': 'farmer',
          'x-user-id': 'user-farmer-01',
          'x-user-name': 'Priyantha Jayasuriya',
        },
      });
      const data = await res.json();
      const end = performance.now();
      setApiLatency(Math.round(end - start));
      setLiveResponse({
        status: res.status,
        statusText: res.statusText || 'OK',
        headers: { 'content-type': res.headers.get('content-type') },
        data,
      });
    } catch (err: any) {
      setLiveResponse({
        error: 'Failed to fetch endpoint',
        details: err?.message || String(err),
      });
    } finally {
      setIsLoadingApi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-white border border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span>Enterprise Portfolio Documentation</span>
          <span>·</span>
          <span>Target Laravel 11 Stack & Live Express API</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Laravel Architecture & Live REST API v1 Console
        </h2>
        <p className="text-xs text-slate-600 mt-0.5">
          Complete structural mapping: Relational ER schema, Eloquent transaction actions, Laravel Sanctum API contracts, and live endpoint testing.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center p-1 bg-slate-200/70 rounded-lg gap-1 self-start">
        {[
          { key: 'er_diagram', label: 'ER Schema & Foreign Keys', icon: Database },
          { key: 'migrations', label: 'Laravel Migrations', icon: Layers },
          { key: 'models', label: 'Eloquent Transaction Actions', icon: FileCode },
          { key: 'api', label: 'API v1 Endpoints & Policies', icon: GitBranch },
          { key: 'live_api', label: 'Live REST API Console', icon: Server },
          { key: 'devops', label: 'DevOps & Deployment', icon: Server },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === (tab.key as any);
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                if (tab.key === 'live_api' && !liveResponse) {
                  testLiveEndpoint('/api/v1/health');
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                isActive ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-[#2D6A4F]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Code / Content Display Panel */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
            <Code2 className="w-4 h-4 text-[#2D6A4F]" />
            <span className="uppercase tracking-wider">
              {activeTab === 'er_diagram' && 'Normalized Relational Data Model'}
              {activeTab === 'migrations' && 'database/migrations/2026_01_01_create_agropulse_tables.php'}
              {activeTab === 'models' && 'app/Models/InventoryItem.php (Pessimistic Locking)'}
              {activeTab === 'api' && 'routes/api.php (Sanctum v1 Scopes)'}
              {activeTab === 'devops' && 'DEPLOYMENT.md (Supervisor & Nginx)'}
            </span>
          </div>

          <button
            onClick={() => {
              const code =
                activeTab === 'er_diagram'
                  ? erDiagramText
                  : activeTab === 'migrations'
                  ? migrationCodeSample
                  : activeTab === 'models'
                  ? modelCodeSample
                  : activeTab === 'api'
                  ? apiRoutesSample
                  : devopsText;
              handleCopy(code, activeTab);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors"
          >
            {copiedSection === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Specification</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-4">
          {activeTab === 'live_api' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Quick Test Endpoints:</span>
                {[
                  '/api/v1/health',
                  '/api/v1/user/profile',
                  '/api/v1/farms',
                  '/api/v1/inventory',
                  '/api/v1/marketplace/listings',
                  '/api/v1/finance/summary',
                  '/api/v1/audit-logs',
                ].map(ep => (
                  <button
                    key={ep}
                    onClick={() => testLiveEndpoint(ep)}
                    className={`px-3 py-1 text-xs font-mono rounded-md border transition-colors ${
                      liveEndpoint === ep
                        ? 'bg-[#1B4332] text-white border-[#1B4332]'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    GET {ep}
                  </button>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-[#0F2018] text-[#D8F3DC] font-mono text-xs overflow-x-auto space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#1B4332] text-slate-400">
                  <span className="text-[#52B788] font-bold">Request: GET {liveEndpoint}</span>
                  {apiLatency !== null && (
                    <span className="tabular-nums font-mono text-xs">
                      Latency: {apiLatency}ms · Status: {liveResponse?.status || 200}
                    </span>
                  )}
                </div>

                {isLoadingApi ? (
                  <p className="py-6 text-center text-slate-400 animate-pulse">
                    Executing HTTP request to Express REST API v1...
                  </p>
                ) : (
                  <pre className="max-h-96 overflow-y-auto leading-relaxed">
                    <code>{JSON.stringify(liveResponse?.data || liveResponse, null, 2)}</code>
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <pre className="p-4 rounded-lg bg-[#0F2018] text-[#D8F3DC] font-mono text-xs overflow-x-auto leading-relaxed max-h-[500px]">
              <code>
                {activeTab === 'er_diagram' && erDiagramText}
                {activeTab === 'migrations' && migrationCodeSample}
                {activeTab === 'models' && modelCodeSample}
                {activeTab === 'api' && apiRoutesSample}
                {activeTab === 'devops' && devopsText}
              </code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
