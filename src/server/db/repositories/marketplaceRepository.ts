import { executeQuery, withTransaction } from '../postgresPool';
import { ProduceListing, Order, OrderStatus } from '../../../types';

function mapListingRow(row: any): ProduceListing {
  return {
    id: row.id,
    farmerId: row.farmer_id,
    farmerName: row.farmer_name,
    farmId: row.farm_id,
    cropName: row.crop_name,
    variety: row.variety,
    quantityAvailable: Number(row.quantity_available),
    unit: row.unit as any,
    pricePerUnit: Number(row.price_per_unit),
    currency: row.currency || 'LKR',
    availableFrom: row.available_from instanceof Date ? row.available_from.toISOString().split('T')[0] : String(row.available_from || ''),
    harvestDate: row.harvest_date instanceof Date ? row.harvest_date.toISOString().split('T')[0] : String(row.harvest_date || ''),
    grade: row.grade,
    district: row.district,
    description: row.description || '',
    imageUrl: row.image_url || undefined,
    status: row.status as any,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function mapOrderRow(row: any, items: Order['items'] = []): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    buyerPhone: row.buyer_phone,
    deliveryAddress: row.delivery_address,
    district: row.district,
    items,
    totalAmount: Number(row.total_amount),
    currency: row.currency || 'LKR',
    status: row.status as OrderStatus,
    paymentMethod: row.payment_method as any,
    paymentStatus: row.payment_status as any,
    notes: row.notes || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export const marketplaceRepository = {
  async getProduceListings(): Promise<ProduceListing[]> {
    const res = await executeQuery('SELECT * FROM produce_listings ORDER BY created_at DESC;');
    return res.rows.map(mapListingRow);
  },

  async getProduceListingById(id: string): Promise<ProduceListing | null> {
    const res = await executeQuery('SELECT * FROM produce_listings WHERE id = $1 LIMIT 1;', [id]);
    if (res.rows.length === 0) return null;
    return mapListingRow(res.rows[0]);
  },

  async createProduceListing(listing: ProduceListing): Promise<ProduceListing> {
    const res = await executeQuery(
      `INSERT INTO produce_listings (
         id, farmer_id, farmer_name, farm_id, crop_name, variety,
         quantity_available, unit, price_per_unit, currency,
         available_from, harvest_date, grade, district,
         description, image_url, status, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
       RETURNING *;`,
      [
        listing.id,
        listing.farmerId,
        listing.farmerName,
        listing.farmId,
        listing.cropName.trim(),
        listing.variety || 'Standard',
        listing.quantityAvailable,
        listing.unit,
        listing.pricePerUnit,
        listing.currency || 'LKR',
        listing.availableFrom || new Date().toISOString().split('T')[0],
        listing.harvestDate || new Date().toISOString().split('T')[0],
        listing.grade || 'Grade A',
        listing.district || 'Nuwara Eliya',
        listing.description || '',
        listing.imageUrl || null,
        listing.status || 'active',
      ]
    );

    return mapListingRow(res.rows[0]);
  },

  // Atomic order placement with row-level stock reservation inside a single transaction
  async placeOrder(orderData: {
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
    if (!orderData.items || orderData.items.length === 0) {
      return { success: false, error: 'Cart is empty. Please select produce to order.' };
    }

    try {
      const order = await withTransaction(async (client) => {
        const orderItemsResolved: Order['items'] = [];
        let calculatedTotal = 0;

        // Step 1: Pre-lock and validate listings atomically
        for (const item of orderData.items) {
          const listRes = await client.query(
            `SELECT id, crop_name, variety, quantity_available, price_per_unit, unit
             FROM produce_listings
             WHERE id = $1
             FOR UPDATE;`,
            [item.listingId]
          );

          if (listRes.rows.length === 0) {
            throw new Error(`Produce listing '${item.listingId}' is no longer active.`);
          }

          const listing = listRes.rows[0];
          const available = Number(listing.quantity_available);

          if (available < item.quantity) {
            throw new Error(
              `Insufficient produce quantity for ${listing.crop_name}. Available: ${available} ${listing.unit}, requested: ${item.quantity} ${listing.unit}.`
            );
          }

          const unitPrice = Number(listing.price_per_unit);
          const subtotal = Math.round(item.quantity * unitPrice * 100) / 100;
          calculatedTotal += subtotal;

          orderItemsResolved.push({
            listingId: listing.id,
            cropName: `${listing.crop_name} (${listing.variety})`,
            quantity: item.quantity,
            unit: listing.unit,
            pricePerUnit: unitPrice,
            unitPrice,
            subtotal,
          });

          // Step 2: Deduct listing stock
          const newStock = available - item.quantity;
          const newStatus = newStock === 0 ? 'sold_out' : 'active';
          await client.query(
            `UPDATE produce_listings
             SET quantity_available = $2, status = $3
             WHERE id = $1;`,
            [listing.id, newStock, newStatus]
          );
        }

        // Step 3: Insert order record
        const orderId = `order-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const totalAmount = Math.round(calculatedTotal * 100) / 100;

        const orderRes = await client.query(
          `INSERT INTO marketplace_orders (
             id, order_number, buyer_id, buyer_name, buyer_email, buyer_phone,
             delivery_address, district, status, payment_method, payment_status,
             total_amount, currency, notes, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed', $9, 'pending', $10, 'LKR', $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING *;`,
          [
            orderId,
            orderNumber,
            orderData.buyerId,
            orderData.buyerName,
            orderData.buyerEmail,
            orderData.buyerPhone,
            orderData.deliveryAddress,
            orderData.district,
            orderData.paymentMethod || 'Bank Transfer (Simulated)',
            totalAmount,
            orderData.notes || null,
          ]
        );

        // Step 4: Insert items into order_items table
        for (const oi of orderItemsResolved) {
          const oiId = `oi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await client.query(
            `INSERT INTO order_items (
               id, order_id, listing_id, crop_name, quantity, unit, price_per_unit, subtotal
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
            [oiId, orderId, oi.listingId, oi.cropName, oi.quantity, oi.unit, oi.pricePerUnit, oi.subtotal]
          );
        }

        return mapOrderRow(orderRes.rows[0], orderItemsResolved);
      });

      return { success: true, order };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async getOrders(buyerId?: string): Promise<Order[]> {
    let sql = 'SELECT * FROM marketplace_orders';
    const params: any[] = [];

    if (buyerId) {
      params.push(buyerId);
      sql += ' WHERE buyer_id = $1';
    }

    sql += ' ORDER BY created_at DESC;';
    const ordersRes = await executeQuery(sql, params);
    if (ordersRes.rows.length === 0) return [];

    const orderIds = ordersRes.rows.map(o => o.id);
    const itemsRes = await executeQuery(
      `SELECT * FROM order_items WHERE order_id = ANY($1);`,
      [orderIds]
    );

    const itemsByOrder: Record<string, Order['items']> = {};
    for (const item of itemsRes.rows) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push({
        listingId: item.listing_id,
        cropName: item.crop_name,
        quantity: Number(item.quantity),
        unit: item.unit,
        pricePerUnit: Number(item.price_per_unit),
        unitPrice: Number(item.price_per_unit),
        subtotal: Number(item.subtotal),
      });
    }

    return ordersRes.rows.map(row => mapOrderRow(row, itemsByOrder[row.id] || []));
  },

  async updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<Order> {
    const res = await executeQuery(
      `UPDATE marketplace_orders
       SET status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *;`,
      [orderId, newStatus]
    );

    if (res.rows.length === 0) throw new Error('Order not found');

    const itemsRes = await executeQuery(
      'SELECT * FROM order_items WHERE order_id = $1;',
      [orderId]
    );
    const items = itemsRes.rows.map(r => ({
      listingId: r.listing_id,
      cropName: r.crop_name,
      quantity: Number(r.quantity),
      unit: r.unit,
      pricePerUnit: Number(r.price_per_unit),
      unitPrice: Number(r.price_per_unit),
      subtotal: Number(r.subtotal),
    }));

    return mapOrderRow(res.rows[0], items);
  },

  async countListings(): Promise<number> {
    const res = await executeQuery('SELECT COUNT(*)::int as count FROM produce_listings;');
    return res.rows[0]?.count || 0;
  },

  async countOrders(): Promise<number> {
    const res = await executeQuery('SELECT COUNT(*)::int as count FROM marketplace_orders;');
    return res.rows[0]?.count || 0;
  },
};
