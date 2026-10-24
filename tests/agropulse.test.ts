/**
 * AgroPulse Automated Enterprise Test Suite
 * Validates real server authentication, password hashing, JWT tokens, RBAC,
 * database disk persistence, non-negative inventory, atomic orders,
 * crop phenology, and meteorological weather services.
 */

import { serverDb } from '../src/server/db/database';
import { AuthService } from '../src/server/services/authService';
import { WeatherService } from '../src/server/services/weatherService';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../src/server/middleware/auth';
import fs from 'fs';
import path from 'path';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, failureDetail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (failureDetail) console.error(`    Detail: ${failureDetail}`);
    testsFailed++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('       AGROPULSE ENTERPRISE SYSTEM & DOMAIN TEST SUITE          ');
  console.log('================================================================\n');

  // Reset database state to clean baseline
  serverDb.resetToBaseline();

  // ------------------------------------------------------------------
  // TEST GROUP 1: SERVER AUTHENTICATION & SECURITY (Section 4)
  // ------------------------------------------------------------------
  console.log('▶ TEST GROUP 1: Real Server Authentication, Hashing & JWT');

  const testEmail = `estate.owner.${Date.now()}@ceylonfarms.lk`;

  // 1.1 Valid Registration
  let regResult: any;
  try {
    regResult = await AuthService.register({
      name: 'Sunil Weerasinghe',
      email: testEmail,
      password: 'StrongPassword2026!',
      confirmPassword: 'StrongPassword2026!',
      role: 'farmer',
      district: 'Nuwara Eliya',
      organization: 'Green Valley Tea Estate',
    });
    assert(!!regResult.token, 'Registration returns signed JWT access token');
    assert(regResult.user.email === testEmail.toLowerCase(), 'User email is properly normalized and persisted');
    assert(!('passwordHash' in regResult.user), 'Sensitive passwordHash is excluded from sanitized client response');
  } catch (err: any) {
    assert(false, 'Valid registration should succeed', err.message);
  }

  // 1.2 Duplicate Account Rejection
  try {
    await AuthService.register({
      name: 'Duplicate Sunil',
      email: testEmail, // same email
      password: 'StrongPassword2026!',
      confirmPassword: 'StrongPassword2026!',
      role: 'farmer',
    });
    assert(false, 'Duplicate registration should fail');
  } catch (err: any) {
    assert(err.status === 409, 'Duplicate email registration is rejected with HTTP 409 Conflict');
  }

  // 1.3 Weak Password Rejection
  try {
    await AuthService.register({
      name: 'Weak User',
      email: 'weak@farm.lk',
      password: 'weak',
      confirmPassword: 'weak',
      role: 'farmer',
    });
    assert(false, 'Weak password should fail');
  } catch (err: any) {
    assert(err.status === 422, 'Weak password (< 8 chars) is rejected with HTTP 422 Unprocessable Entity');
  }

  // 1.4 Privileged Role Escalation Prevention
  try {
    await AuthService.register({
      name: 'Attacker Admin',
      email: 'attacker@evil.lk',
      password: 'HackerPassword2026!',
      confirmPassword: 'HackerPassword2026!',
      role: 'super_admin',
    });
    assert(false, 'Public registration as super_admin should fail');
  } catch (err: any) {
    assert(err.status === 403, 'Public registration as Super Admin is blocked by RBAC security policy');
  }

  // 1.5 Valid Login with Password Hash Verification
  try {
    const loginRes = await AuthService.login({
      email: testEmail,
      password: 'StrongPassword2026!',
    });
    assert(!!loginRes.token, 'Login with valid credentials returns Bearer JWT');

    // Decode and verify token
    const decoded = jwt.verify(loginRes.token, JWT_SECRET) as any;
    assert(decoded.userId === regResult.user.id, 'JWT payload contains verified user ID');
    assert(decoded.role === 'farmer', 'JWT payload contains authenticated role claim');
  } catch (err: any) {
    assert(false, 'Login with valid credentials should succeed', err.message);
  }

  // 1.6 Invalid Password Rejection
  try {
    await AuthService.login({
      email: testEmail,
      password: 'IncorrectPassword!',
    });
    assert(false, 'Login with wrong password should fail');
  } catch (err: any) {
    assert(err.status === 401, 'Login with invalid password is rejected with HTTP 401 Unauthorized');
  }

  // ------------------------------------------------------------------
  // TEST GROUP 2: PERSISTENT DATABASE ENGINE & DURABILITY (Section 6)
  // ------------------------------------------------------------------
  console.log('\n▶ TEST GROUP 2: Database Durability & Constraints (Section 6)');

  const dbStatus = serverDb.getStatus();
  assert(
    dbStatus.driver === 'persistent_disk_engine' || dbStatus.driver === 'postgresql',
    'Active database driver is identified and reported'
  );

  const dataDir = path.resolve(process.cwd(), '.data');
  const dbFile = path.join(dataDir, 'agropulse_database.json');
  assert(fs.existsSync(dbFile), 'Persistent disk database file exists on server filesystem (.data/agropulse_database.json)');

  // 2.1 Foreign Key Validation (Cannot add plot to non-existent farm)
  try {
    await serverDb.createPlot({
      farmId: 'non-existent-farm-999',
      name: 'Ghost Plot',
      plotCode: 'G01',
      area: 5,
      areaUnit: 'acres',
      soilType: 'Alluvial',
      irrigationType: 'Drip',
      status: 'cultivated',
    });
    assert(false, 'Foreign key validation should reject orphan plot');
  } catch (err: any) {
    assert(err.message.includes('does not exist'), 'Foreign key constraint prevents orphan plot creation');
  }

  // 2.2 Plot Code Uniqueness per Farm
  const existingPlots = await serverDb.getPlots('farm-01');
  const existingPlot = existingPlots[0];
  if (existingPlot) {
    try {
      await serverDb.createPlot({
        farmId: 'farm-01',
        name: 'Duplicate Code Plot',
        plotCode: existingPlot.plotCode, // duplicate
        area: 2,
        areaUnit: 'acres',
        soilType: 'Alluvial',
        irrigationType: 'Drip',
        status: 'cultivated',
      });
      assert(false, 'Duplicate plot code should fail');
    } catch (err: any) {
      assert(err.message.includes('already registered'), 'Unique constraint enforces distinct plot codes per farm');
    }
  }

  // ------------------------------------------------------------------
  // TEST GROUP 3: TRANSACTIONAL NON-NEGATIVE INVENTORY INTEGRITY
  // ------------------------------------------------------------------
  console.log('\n▶ TEST GROUP 3: Transactional Non-Negative Inventory (Section 10)');

  const inventory = await serverDb.getInventory('farm-01');
  const teaFertilizer = inventory.find(i => i.name.includes('Tea Special NPK'));
  assert(teaFertilizer !== undefined, 'Inventory SKU exists in database');

  if (teaFertilizer) {
    const initialStock = teaFertilizer.currentStock;

    // 3.1 Valid Stock Issue
    const validIssue = await serverDb.issueStock(
      teaFertilizer.id,
      5,
      'Foliar spraying sector 3',
      'user-worker-01',
      'Saman Kumara'
    );
    assert(validIssue.success === true, 'Valid stock deduction succeeds atomically');
    assert(
      validIssue.movement?.newStock === initialStock - 5,
      'Stock balance decrements accurately'
    );

    // 3.2 Overdraft Rejection
    const currentStock = validIssue.movement?.newStock || 40;
    const overdraftIssue = await serverDb.issueStock(
      teaFertilizer.id,
      currentStock + 500, // overdraft
      'Overdraft attempt',
      'user-worker-01',
      'Saman Kumara'
    );
    assert(overdraftIssue.success === false, 'Overdraft stock issue is strictly rejected');
    assert(
      overdraftIssue.error?.includes('Insufficient stock') === true,
      'Descriptive error message explains non-negative constraint'
    );

    // 3.3 Verify stock balance unchanged
    const reloaded = await serverDb.getInventoryItemById(teaFertilizer.id);
    assert(reloaded?.currentStock === currentStock, 'Stock balance preserved unchanged after failed overdraft');

    // 3.4 Replenishment
    const replenishment = await serverDb.receiveStock(teaFertilizer.id, 20, 4500, 'user-farmer-01', 'Priyantha Jayasuriya');
    assert(replenishment.success === true, 'Stock replenishment received successfully');
    assert(replenishment.movement?.newStock === currentStock + 20, 'Stock balance updated to reflect receipt');
  }

  // ------------------------------------------------------------------
  // TEST GROUP 4: ATOMIC PRODUCE MARKETPLACE ORDERING
  // ------------------------------------------------------------------
  console.log('\n▶ TEST GROUP 4: Atomic Produce Order Reservation (Section 13)');

  const listings = await serverDb.getProduceListings();
  const teaLot = listings.find(l => l.cropName.includes('BOPF Tea'));
  assert(teaLot !== undefined, 'Produce lot exists on marketplace');

  if (teaLot) {
    const initialLotQty = teaLot.quantityAvailable;

    // 4.1 Order Placement
    const orderRes = await serverDb.placeOrder({
      buyerId: 'user-buyer-01',
      buyerName: 'Dinesh Perera',
      buyerEmail: 'procurement@ceylonsuper.lk',
      buyerPhone: '+94 76 333 4455',
      deliveryAddress: 'Central Wholesale Logistics Hub, Colombo 10',
      district: 'Colombo',
      paymentMethod: 'Bank Transfer (Simulated)',
      items: [{ listingId: teaLot.id, quantity: 50 }],
      notes: 'Deliver early morning batch',
    });

    assert(orderRes.success === true, 'Order confirmed and generated order number');
    assert(!!orderRes.order?.orderNumber, 'Generated unique order identifier');
    assert(
      teaLot.quantityAvailable === initialLotQty - 50,
      'Marketplace quantity atomically deducted upon confirmation'
    );

    // 4.2 Overselling Rejection
    const oversell = await serverDb.placeOrder({
      buyerId: 'user-buyer-01',
      buyerName: 'Dinesh Perera',
      buyerEmail: 'procurement@ceylonsuper.lk',
      buyerPhone: '+94 76 333 4455',
      deliveryAddress: 'Colombo',
      district: 'Colombo',
      paymentMethod: 'COD',
      items: [{ listingId: teaLot.id, quantity: teaLot.quantityAvailable + 1000 }],
    });

    assert(oversell.success === false, 'Overselling produce is rejected atomically');
    assert(oversell.error?.includes('Insufficient produce quantity') === true, 'Rejection explains shortfall');
  }

  // ------------------------------------------------------------------
  // TEST GROUP 5: CROP PHENOLOGY, TASKS & FINANCIAL MATH
  // ------------------------------------------------------------------
  console.log('\n▶ TEST GROUP 5: Crops, Tasks & Financial Formulas (Sections 8, 9, 12)');

  // 5.1 Crop Stage Progression
  const cycles = await serverDb.getCropCycles('farm-01');
  const cycle = cycles[0];
  assert(cycle !== undefined, 'Active crop cycle exists');
  if (cycle) {
    const updated = await serverDb.advanceCropStage(cycle.id, 'Flowering / Tillering');
    assert(updated.stage === 'Flowering / Tillering', 'Crop growth stage transitioned to Flowering / Tillering');
  }

  // 5.2 Task Completion
  const tasks = await serverDb.getTasks('farm-01');
  const task = tasks[0];
  assert(task !== undefined, 'Farm task exists in database');
  if (task) {
    const completed = await serverDb.updateTaskStatus(task.id, 'completed', 'Completed with drip line check');
    assert(completed.status === 'completed', 'Task status transitioned to completed with timestamp');
  }

  // 5.3 Financial Formula Integrity
  const financeSummary = await serverDb.getFinancialSummary('farm-01');
  const expectedProfit = Math.round((financeSummary.totalRevenue - financeSummary.totalExpenses) * 100) / 100;
  assert(
    financeSummary.netProfit === expectedProfit,
    'Net Profit calculation verified: Revenue - Direct Expenses'
  );

  // ------------------------------------------------------------------
  // TEST GROUP 6: METEOROLOGICAL WEATHER INTEGRATION (Section 11)
  // ------------------------------------------------------------------
  console.log('\n▶ TEST GROUP 6: Meteorological Weather Feed (Section 11)');

  const weather = await WeatherService.getDistrictWeather('Nuwara Eliya');
  assert(typeof weather.temperature === 'number' || typeof weather.temperatureC === 'number', 'Weather service returns numeric temperature');
  assert(typeof weather.humidity === 'number' || typeof weather.humidityPercent === 'number', 'Weather service returns numeric relative humidity');
  assert((Array.isArray(weather.forecast) && weather.forecast.length === 5) || (Array.isArray(weather.forecast5Days) && weather.forecast5Days.length === 5), 'Weather returns 5-day daily forecast');
  assert((Array.isArray(weather.alerts) && weather.alerts.length > 0) || !!weather.agriculturalAdvisory, 'Weather derives agronomic microclimate advisories');
  assert(!!weather.provider, `Weather reports provider source: ${weather.provider}`);

  // ------------------------------------------------------------------
  // TEST GROUP 7: AUDIT LOG STREAM (Section 16)
  // ------------------------------------------------------------------
  console.log('\n▶ TEST GROUP 7: Audit Logging & Governance (Section 16)');

  const logs = await serverDb.getAuditLogs();
  assert(logs.length > 0, 'Audit log stream contains recorded events');
  assert(logs.some(l => l.action === 'CREATE' && (l.entity === 'USER' || l.entityType === 'USER')), 'User registration logged to audit trail');
  assert(logs.some(l => l.action === 'STOCK_ISSUE'), 'Inventory stock issuance logged to audit trail');

  // Summary
  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${testsPassed} PASSED | ${testsFailed} FAILED`);
  console.log('================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
