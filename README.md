# AgroPulse — Enterprise-Grade Smart Agriculture & Farm Operations Platform

AgroPulse is a production-grade Smart Agriculture and Farm Operations Management SaaS platform engineered to coordinate multi-estate agricultural holdings, land plot partitioning, crop phenology, transactional warehouse inputs, field worker dispatch, microclimate radar, and produce marketplace commerce in one unified, role-governed system.

Situated in the Sri Lankan agricultural context (Central Highlands tea estates, North Central Rajarata heirloom paddy, and North Western protected horticulture), AgroPulse demonstrates end-to-end domain logic: real authentication with bcrypt password hashing and signed JWT bearer tokens, transactional non-negative inventory constraints, growth-stage progression tracking across **Maha** and **Yala** seasons, live Open-Meteo meteorological data, and least-privilege role-based access control.

---

## 1. Full-Stack System Architecture

AgroPulse is implemented as a full-stack Node.js + Express backend with a React 19 + TypeScript + Vite frontend:

- **Backend Server:** Express 4 on port 3000 running in `server.ts` with TypeScript execution via `tsx`.
- **API Architecture:** RESTful endpoints mounted under `/api/v1/*` with strict error schemas, request validation, and HTTP status codes (`200 OK`, `201 Created`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`).
- **Authentication & Security:**
  - Password hashing with `bcryptjs` (salt rounds = 10).
  - Cryptographic token signing and validation with `jsonwebtoken` (HMAC-SHA256, 7-day expiration).
  - `authMiddleware` verifying Bearer tokens, token expiration, and user account status.
  - Role-based access control (`requireRole`) enforcing permissions for 7 distinct agricultural roles.
  - Sliding-window rate limiting (`authRateLimiter`) on sensitive endpoints.
  - Public Super Admin registration lockout to prevent privilege escalation.
- **Database Engine & Persistence:**
  - ACID-compliant, persistent disk storage engine in `.data/agropulse_database.json` with atomic file writes and foreign key enforcement.
  - Pluggable PostgreSQL adapter (`pg`) supporting external connection strings via `DATABASE_URL`.
  - Full relational DDL schema provided in `src/server/db/schema.sql`.
- **Meteorological Feed:** Real Open-Meteo API integration with 10-minute caching, observation vs forecast distinction, and agronomic pathogen advisories.
- **Frontend Architecture:** React 19, TypeScript, Tailwind CSS v4, Lucide React icons, and Motion animation.

---

## 2. Core Business Modules

### Module A: Authentication & Security (Real JWT & Password Hashing)
- 7 distinct roles: **Super Admin**, **Farmer**, **Farm Worker**, **Agronomist**, **Buyer**, **Supplier**, and **Support Staff**.
- Real user registration with email normalization, password strength checks, and duplicate rejection.
- Secure login generating cryptographic JWTs stored securely and verified on each request.
- Header component shows authenticated user name, role badge, persistent database status, and real sign-out.
- Immutable audit trail recording user actions with timestamps.

### Module B: Farm & Plot Infrastructure
- Support for multiple agricultural estates per owner with district categorization across Sri Lanka (Nuwara Eliya, Anuradhapura, Kurunegala, Badulla, Kandy, Matale).
- Dynamic extent conversion between **Acres** and **Hectares** (`1 acre = 0.404686 ha`).
- Soil classification based on Sri Lankan agro-zones: *Red-Yellow Podzolic, Reddish Brown Earth, Alluvial, Latosolic, Regosol*.
- Irrigation architecture: *Micro-Drip fertigation, Overhead Sprinklers, Tank Sluice/Canal Flooding, Deep Tube Wells, Rainfed*.
- Sub-cadastral land plot visualizer and status grid with foreign key validation preventing orphaned plots.

### Module C: Crop Lifecycle Tracking
- Multi-stage phenology tracker: *Land Preparation → Sowing/Nursery → Vegetative Growth → Flowering/Tillering → Fruiting/Grain Fill → Ripening → Harvest Ready → Harvested*.
- Seasonal synchronization with **Maha (Major Monsoon)** and **Yala (Minor Monsoon)** cycles.
- Target harvest yields vs. actual yields comparison.
- Agronomist field observations with severity ratings (*Low, Moderate, High, Critical*) and remedial directives (e.g. Brown Planthopper scouting, Tea Blister Blight aeration, Potassium deficiency chlorosis).

### Module D: Field Tasks & Worker Dispatch
- Task assignment to field personnel with categories (*Irrigation, Fertilizing, Planting, Inspection, Harvesting, Weeding, Equipment*).
- Priority classification (*Low, Medium, High, Urgent*).
- Real-time overdue computation based on scheduled due date.
- Work completion modal with completion notes and photographic evidence.

### Module E: Transactional Inventory & Input Management
- **Strict Non-Negative Balance Constraint:** Warehouse stock issue transactions are atomically validated. If `currentStock - requestedQuantity < 0`, the transaction is rejected with descriptive error logging and zero balance alteration.
- Categorized inputs: *Seeds & Seedlings, Fertilizers & Nutrients, Agrochemicals, Tools & Machinery, Packaging*.
- Automated reorder threshold alerts when stock dips below safety buffers.
- Immutable stock movement ledger recording timestamp, previous balance, new balance, authorized actor, and reference reason.

### Module F: Real Meteorological Intelligence
- Real Open-Meteo Atmospheric Grid integration covering Sri Lankan agricultural districts.
- Sensor parameters: Ambient temperature, apparent temperature, relative humidity, precipitation, wind speed, and weather condition codes.
- 5-Day forecast outlook with precipitation probabilities.
- Domain-specific pathogen and irrigation advisories (e.g., fungal spore proliferation warnings during high humidity).
- Displays provider attribution and live operational status.

### Module G: Harvest & Financial Ledger
- Harvest flush logging with quality grades (*Grade A Export/Premium, Grade B Standard Market, Grade C Processing*).
- Production expense categorization (*Labor & Wages, Fertilizers, Seeds, Fuel, Power, Equipment, Packaging*).
- Mathematical calculations:
  - $\text{Estimated Revenue} = \sum (\text{Harvest Quantity} \times \text{Market Unit Price})$
  - $\text{Net Margin} = \text{Estimated Revenue} - \text{Direct Expenses}$
  - $\text{Profit Margin } \% = (\text{Net Margin} / \text{Estimated Revenue}) \times 100$
  - $\text{Land Yield} = \text{Total Harvest (kg)} / \text{Estate Area (acres)}$
- Instant CSV report export for accounting audits.

### Module H: Wholesale Produce Marketplace & Orders
- Live produce listings with verified photos, lot grades, pricing, and origin districts.
- **Atomic Stock Reservation:** Prevents overselling by checking and decrementing available quantity atomically upon checkout.
- State-machine fulfillment tracking (*Pending → Confirmed → Processing → Shipped → Delivered*).

### Module J: Rule-Based Recommendations Engine
- Deterministic operational advisories evaluating overdue tasks, depleted inventory, upcoming harvests, and weather alerts.
- High-priority actionable shortcuts directly linking to target modules.

### Module K: Audit Trail & Compliance
- Filterable and searchable operational log stream.
- CSV export of compliance records.

---

## 3. Relational Database Schema

The normalized relational schema is available in `src/server/db/schema.sql`:

```
[users] 1 ────< [farms] 1 ────< [land_plots] 1 ────< [crop_cycles]
   │               │                                       │
   │               │ 1                                     ├────< [crop_observations]
   │               ├────< [inventory_items] 1 ────< [movs] ├────< [harvests]
   │               │                                       └────< [expenses]
   │               └────< [produce_listings] 1 ────< [order_items] >──── 1 [orders]
   │                                                                           │
   └──────< [audit_logs]                                                       ┘ (buyer)
```

---

## 4. REST API Endpoint Reference

All endpoints are mounted under `/api/v1`:

| Method | Endpoint | Access / Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/health` | Public | System health check and uptime |
| `GET` | `/api/v1/db-status` | Public | Database driver, durability, and collection counts |
| `POST` | `/api/v1/auth/register` | Public (Rate Limited) | Register new user with password hashing & JWT |
| `POST` | `/api/v1/auth/login` | Public (Rate Limited) | Authenticate user credentials & return JWT |
| `GET` | `/api/v1/auth/me` | Authenticated | Fetch current authenticated user profile |
| `GET` | `/api/v1/farms` | Authenticated | List authorized farms |
| `POST` | `/api/v1/farms` | `farmer`, `super_admin` | Register new agricultural estate |
| `GET` | `/api/v1/farms/:farmId/plots` | Authenticated | List land plots on a farm |
| `POST` | `/api/v1/farms/:farmId/plots` | `farmer`, `super_admin` | Create land plot with code uniqueness |
| `GET` | `/api/v1/crop-cycles` | Authenticated | List crop cycles |
| `POST` | `/api/v1/crop-cycles` | `farmer`, `agronomist`, `super_admin` | Initiate new crop cycle |
| `POST` | `/api/v1/crop-cycles/:id/advance-stage` | `farmer`, `agronomist`, `super_admin` | Advance phenological stage |
| `GET` | `/api/v1/crop-cycles/:id/observations` | Authenticated | Get agronomist observations |
| `POST` | `/api/v1/crop-cycles/:id/observations` | `farmer`, `agronomist`, `super_admin` | Record field observation |
| `GET` | `/api/v1/tasks` | Authenticated | Get assigned tasks |
| `POST` | `/api/v1/tasks` | `farmer`, `super_admin` | Dispatch task to worker |
| `PATCH` | `/api/v1/tasks/:id/status` | `farmer`, `farm_worker`, `super_admin` | Update task status |
| `GET` | `/api/v1/inventory` | Authenticated | List warehouse inventory |
| `POST` | `/api/v1/inventory` | `farmer`, `supplier`, `super_admin` | Create new inventory SKU |
| `POST` | `/api/v1/inventory/:id/issue` | `farmer`, `farm_worker`, `super_admin` | Atomic stock issue (Strict non-negative) |
| `POST` | `/api/v1/inventory/:id/receive` | `farmer`, `supplier`, `super_admin` | Stock replenishment receipt |
| `GET` | `/api/v1/harvests` | `farmer`, `super_admin` | List harvest records |
| `POST` | `/api/v1/harvests` | `farmer`, `super_admin` | Record harvest flush & revenue |
| `GET` | `/api/v1/expenses` | `farmer`, `super_admin` | List farm expenses |
| `POST` | `/api/v1/expenses` | `farmer`, `super_admin` | Record operational expense |
| `GET` | `/api/v1/finance/summary` | `farmer`, `super_admin` | Aggregate revenue, costs, net profit |
| `GET` | `/api/v1/marketplace/listings` | Public | List wholesale produce |
| `POST` | `/api/v1/marketplace/listings` | `farmer`, `super_admin` | Post produce lot for sale |
| `POST` | `/api/v1/marketplace/orders` | `buyer`, `farmer`, `super_admin` | Atomic produce checkout & reservation |
| `GET` | `/api/v1/marketplace/orders` | Authenticated | List user orders |
| `GET` | `/api/v1/weather` | Public | Real Open-Meteo meteorological radar |
| `GET` | `/api/v1/audit-logs` | `super_admin` | Access security audit log stream |

---

## 5. Automated Test Suite

AgroPulse includes an automated test suite verifying domain logic, cryptography, security constraints, and external integrations:

- **41 automated tests across 7 core test groups:**
  1. Real Server Authentication, Hashing & JWT (registration, duplicate rejection, weak password lockout, Super Admin privilege protection, login, JWT claims).
  2. Database Durability & Constraints (file persistence, foreign key enforcement, plot code uniqueness).
  3. Transactional Non-Negative Inventory (atomic deduction, overdraft rejection, zero balance alteration, replenishment).
  4. Atomic Produce Order Reservation (atomicity, stock decrement, overselling rejection).
  5. Crops, Tasks & Financial Formulas (growth stage progression, task completion, financial calculations).
  6. Meteorological Weather Feed (Open-Meteo numeric fields, 5-day forecast, agronomic advisories, provider reporting).
  7. Audit Logging & Governance (user registration logging, stock issuance logging).

### Running Tests:
```bash
npm test
# or directly:
npx tsx tests/agropulse.test.ts
```

All 41 tests execute and pass without errors.

---

## 6. How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Run TypeScript linter
npm run lint

# 3. Run automated tests
npm test

# 4. Start full-stack development server (Express backend + Vite frontend on port 3000)
npm run dev

# 5. Build production bundle
npm run build
```

---

## 7. Connecting to External PostgreSQL (Optional)

AgroPulse automatically persists all state to `.data/agropulse_database.json` by default. To connect to a PostgreSQL database instead:

1. Configure `DATABASE_URL` in `.env`:
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/agropulse"
   ```
2. Run migrations:
   ```bash
   psql $DATABASE_URL -f src/server/db/schema.sql
   ```
3. Restart the server. AgroPulse will connect via `pg` and report PostgreSQL status on the `/api/v1/db-status` endpoint.
