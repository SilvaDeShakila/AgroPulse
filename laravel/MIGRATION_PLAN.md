# AgroPulse — Laravel 11 Production Migration Plan

This document details how the AgroPulse platform prototype maps directly into an enterprise Laravel 11 / PHP 8.3 / MySQL / Redis architecture.

## 1. Stack Specifications
- **PHP Version:** 8.3 (with `bcmath`, `pdo_mysql`, `redis`, `opcache`)
- **Framework:** Laravel 11.x
- **Database:** MySQL 8.0 with InnoDB engine and UTF8MB4 collation
- **Cache & Queue:** Redis 7.2 (predis or phpredis)
- **API Authentication:** Laravel Sanctum (Bearer Token / Cookie session for SPA)
- **Authorization:** Laravel Gate & Policy classes with least-privilege checks
- **Testing:** Pest PHP or PHPUnit 11 with database transaction rollback

## 2. Directory Structure Mapping
```
prototype (TypeScript)                Laravel 11 Target
───────────────────────────────────   ──────────────────────────────────────────────────
src/types/index.ts                    app/Models/*.php
src/services/storage.ts (issuance)   app/Actions/Inventory/IssueStockAction.php
src/services/storage.ts (ordering)   app/Actions/Orders/PlaceOrderAction.php
src/data/seedData.ts                  database/seeders/AgroPulseDatabaseSeeder.php
components/farms/*                    app/Http/Controllers/Api/V1/FarmController.php
components/crops/*                    app/Http/Controllers/Api/V1/CropCycleController.php
components/inventory/*                app/Http/Controllers/Api/V1/InventoryController.php
components/marketplace/*              app/Http/Controllers/Api/V1/OrderController.php
components/weather/*                  app/Services/Weather/OpenWeatherProvider.php
```

## 3. Database Constraints & Transactions
### Non-Negative Inventory
In Laravel, the `IssueStockAction` executes inside a `DB::transaction()` with pessimistic locking:
```php
DB::transaction(function () use ($itemId, $qty, $reason, $actorId) {
    $item = InventoryItem::where('id', $itemId)->lockForUpdate()->firstOrFail();
    if ($item->current_stock < $qty) {
        throw new InsufficientStockException("Cannot issue {$qty} {$item->unit}; available: {$item->current_stock}");
    }
    $prev = $item->current_stock;
    $item->decrement('current_stock', $qty);
    StockMovement::create([
        'inventory_item_id' => $item->id,
        'farm_id' => $item->farm_id,
        'type' => 'issued',
        'quantity' => $qty,
        'previous_stock' => $prev,
        'new_stock' => $item->fresh()->current_stock,
        'reference_reason' => $reason,
        'actor_id' => $actorId,
    ]);
});
```

### Atomic Order Reservation
In `PlaceOrderAction`:
```php
DB::transaction(function () use ($buyer, $items, $address) {
    foreach ($items as $item) {
        $listing = ProduceListing::where('id', $item['listing_id'])->lockForUpdate()->firstOrFail();
        if ($listing->quantity_available < $item['quantity']) {
            throw new OutOfStockException("Item {$listing->crop_name} is no longer available in requested quantity.");
        }
        $listing->decrement('quantity_available', $item['quantity']);
        if ($listing->fresh()->quantity_available == 0) {
            $listing->update(['status' => 'sold_out']);
        }
    }
    // Create order and order_items
});
```

## 4. Policy Implementation
- `FarmPolicy`: Only owners or assigned members can view/mutate farm plots.
- `TaskPolicy`: Workers can only transition tasks assigned to their user ID.
- `OrderPolicy`: Buyers can only access their own order receipts.
- `AdminPolicy`: Sensitive platform moderation auditable via `AuditLogObserver`.
