import React, { useState } from 'react';
import {
  Store,
  ShoppingCart,
  Search,
  Filter,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Package,
  Truck,
  Trash2,
  X,
  CreditCard,
  Building
} from 'lucide-react';
import { db } from '../../services/storage';
import { ProduceListing, Order, OrderStatus } from '../../types';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

export function MarketplaceView() {
  const { showToast } = useToast();
  const currentUser = db.getCurrentUser();
  const isBuyer = currentUser.role === 'buyer';
  const isFarmer = currentUser.role === 'farmer' || currentUser.role === 'super_admin';

  const [activeTab, setActiveTab] = useState<'browse' | 'orders' | 'my_listings'>('browse');
  const [searchCrop, setSearchCrop] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');

  // Cart State
  const [cart, setCart] = useState<{ listing: ProduceListing; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Checkout form
  const [buyerName, setBuyerName] = useState(currentUser.name);
  const [buyerEmail, setBuyerEmail] = useState(currentUser.email);
  const [buyerPhone, setBuyerPhone] = useState(currentUser.phone || '+94 77 000 0000');
  const [deliveryAddress, setDeliveryAddress] = useState('Central Produce Terminal, Colombo 10');
  const [deliveryDistrict, setDeliveryDistrict] = useState('Colombo');
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer (Simulated)' | 'Cash on Delivery (COD)' | 'Digital Escrow (Simulated)'>('Bank Transfer (Simulated)');
  const [orderNotes, setOrderNotes] = useState('');

  // Seller: Add Listing Modal
  const [isAddListingOpen, setIsAddListingOpen] = useState(false);
  const [listCropName, setListCropName] = useState('');
  const [listVariety, setListVariety] = useState('');
  const [listDistrict, setListDistrict] = useState('Nuwara Eliya');
  const [listQty, setListQty] = useState(1000);
  const [listUnit, setListUnit] = useState<ProduceListing['unit']>('kg');
  const [listPrice, setListPrice] = useState(650);
  const [listGrade, setListGrade] = useState('Grade A (Export / Premium)');
  const [listDesc, setListDesc] = useState('');
  const [listImage, setListImage] = useState('/src/assets/images/crop_ceylon_tea_1792164656862.jpg');

  const listings = db.getProduceListings();
  const orders = db.getOrders();
  const farms = db.getFarms();

  const filteredListings = listings.filter(item => {
    if (districtFilter !== 'all' && item.district !== districtFilter) return false;
    if (searchCrop.trim() && !item.cropName.toLowerCase().includes(searchCrop.toLowerCase())) return false;
    return true;
  });

  const addToCart = (listing: ProduceListing, quantity: number) => {
    if (listing.quantityAvailable <= 0) {
      showToast('error', 'Sold Out', 'This produce lot is currently out of stock.');
      return;
    }

    const existing = cart.find(i => i.listing.id === listing.id);
    const existingQty = existing ? existing.quantity : 0;
    const newQty = existingQty + quantity;

    if (newQty > listing.quantityAvailable) {
      showToast('warning', 'Stock Limit', `Only ${listing.quantityAvailable} ${listing.unit} available in stock.`);
      return;
    }

    setCart(prev => {
      const idx = prev.findIndex(i => i.listing.id === listing.id);
      if (idx !== -1) {
        return prev.map((item, index) => (index === idx ? { ...item, quantity: newQty } : item));
      }
      return [...prev, { listing, quantity }];
    });

    showToast('success', 'Added to Cart', `${listing.cropName} (${quantity} ${listing.unit}) added.`);
  };

  const removeFromCart = (listingId: string) => {
    setCart(prev => prev.filter(i => i.listing.id !== listingId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.listing.pricePerUnit, 0);

  const handlePlaceOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const result = db.placeOrder({
      buyerId: currentUser.id,
      buyerName,
      buyerEmail,
      buyerPhone,
      deliveryAddress,
      district: deliveryDistrict,
      paymentMethod,
      items: cart.map(c => ({
        listingId: c.listing.id,
        quantity: c.quantity,
      })),
      notes: orderNotes,
    });

    if (!result.success) {
      showToast('error', 'Order Reservation Failed', result.error);
      return;
    }

    showToast(
      'success',
      'Order Placed Successfully',
      `Order ${result.order?.orderNumber} confirmed. Inventory reserved atomically.`
    );
    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setActiveTab('orders');
  };

  const handleCreateListingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listCropName.trim()) {
      showToast('error', 'Validation Error', 'Produce name is required.');
      return;
    }

    const newListing = db.addProduceListing({
      farmerId: currentUser.id,
      farmerName: currentUser.name,
      farmId: farms[0]?.id || 'farm-01',
      cropName: listCropName,
      variety: listVariety,
      district: listDistrict,
      quantityAvailable: Number(listQty),
      unit: listUnit,
      pricePerUnit: Number(listPrice),
      currency: 'LKR',
      grade: listGrade,
      availableFrom: new Date().toISOString().split('T')[0],
      imageUrl: listImage,
      status: 'active',
      description: listDesc,
    });

    showToast('success', 'Produce Listed', `Lot for ${newListing.cropName} is now live on marketplace.`);
    setIsAddListingOpen(false);
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    db.updateOrderStatus(orderId, status);
    showToast('info', 'Order Status Updated', `Order transitioned to ${status.toUpperCase()}.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Module H: Produce Marketplace</span>
            <span>·</span>
            <span>Direct Commercial Trade</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Wholesale Agricultural Produce Marketplace
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Real-time stock reservation, direct farm sourcing, and order fulfillment tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isFarmer && (
            <button
              onClick={() => setIsAddListingOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>List New Produce Lot</span>
            </button>
          )}

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <ShoppingCart className="w-4 h-4 text-slate-600" />
            <span>Order Cart</span>
            {cart.length > 0 && (
              <span className="px-1.5 py-0.2 bg-[#2D6A4F] text-white text-[10px] rounded-full font-bold">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center p-1 bg-slate-200/70 rounded-lg self-start">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
            activeTab === 'browse' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Produce Lots ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
            activeTab === 'orders' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Orders & Fulfillment ({orders.length})
        </button>
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <>
          {/* Filters Bar */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchCrop}
                onChange={e => setSearchCrop(e.target.value)}
                placeholder="Search crops: Ceylon Tea, Keeri Samba Rice, Red Chillies, Cinnamon..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
              />
            </div>

            <select
              value={districtFilter}
              onChange={e => setDistrictFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-slate-50"
            >
              <option value="all">All Districts</option>
              <option value="Nuwara Eliya">Nuwara Eliya</option>
              <option value="Anuradhapura">Anuradhapura</option>
              <option value="Kurunegala">Kurunegala</option>
              <option value="Badulla">Badulla</option>
            </select>
          </div>

          {/* Produce Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map(item => {
              const isSoldOut = item.quantityAvailable <= 0;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-16/10 bg-slate-100 relative overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.cropName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                          No Photo
                        </div>
                      )}
                      <div className="absolute top-3 left-3 bg-white/95 px-2 py-0.5 rounded text-[10px] font-bold text-slate-800 border border-slate-200">
                        {item.grade}
                      </div>

                      {isSoldOut && (
                        <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center text-white font-bold text-sm tracking-wide">
                          SOLD OUT
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.district} District</span>
                        <span>·</span>
                        <span>{item.variety}</span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {item.cropName}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="pt-2 text-xs flex items-center justify-between text-slate-600 font-mono tabular-nums">
                        <span>Stock Available:</span>
                        <strong className={isSoldOut ? 'text-rose-600' : 'text-slate-900'}>
                          {item.quantityAvailable.toLocaleString()} {item.unit}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Wholesale Rate
                      </span>
                      <p className="text-base font-bold text-[#1B4332] font-mono tabular-nums">
                        LKR {item.pricePerUnit.toLocaleString()} / {item.unit}
                      </p>
                    </div>

                    <button
                      onClick={() => addToCart(item, 100)}
                      disabled={isSoldOut}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                        isSoldOut
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-[#1B4332] hover:bg-[#10281D] text-white shadow-xs'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Order 100 {item.unit}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Marketplace Wholesale Orders & Fulfillment Status
            </h3>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {orders.length} orders on file
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No orders logged.</p>
            ) : (
              orders.map(order => (
                <div key={order.id} className="p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {order.orderNumber}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">Buyer: <strong>{order.buyerName}</strong></span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">{order.paymentMethod}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold uppercase tracking-wider text-[10px] px-2.5 py-0.5 rounded ${
                          order.status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : order.status === 'shipped'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        Status: {order.status}
                      </span>

                      {/* Status progression control for farmers/admins */}
                      {isFarmer && (
                        <select
                          value={order.status}
                          onChange={e => handleUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded bg-slate-50 text-slate-700"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-700">
                        <span>
                          {it.quantity} {it.unit} · {it.cropName} (@ LKR {it.pricePerUnit}/{it.unit})
                        </span>
                        <span className="font-mono tabular-nums font-semibold">
                          LKR {it.subtotal.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-slate-900 font-bold">
                      <span>Total Value:</span>
                      <span className="font-mono tabular-nums text-sm">
                        LKR {order.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Delivery Address: {order.deliveryAddress} ({order.district}) · Contact: {order.buyerPhone}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCartOpen(false)}
          title="Produce Wholesale Cart"
          description="Review quantities before proceeding to atomic stock reservation"
        >
          {cart.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              Your cart is empty. Add produce lots from the marketplace.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.listing.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{item.listing.cropName}</p>
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {item.quantity} {item.listing.unit} × LKR {item.listing.pricePerUnit}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        LKR {(item.quantity * item.listing.pricePerUnit).toLocaleString()}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.listing.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between font-bold text-sm text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono tabular-nums text-base text-[#1B4332]">
                  LKR {cartTotal.toLocaleString()}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Continue Shopping
                </button>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCheckoutOpen(false)}
          title="Wholesale Order Checkout"
          description="Atomic inventory reservation guarantees zero overselling"
        >
          <form onSubmit={handlePlaceOrderSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Buyer / Org Name</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={buyerPhone}
                  onChange={e => setBuyerPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={e => setBuyerEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Delivery District</label>
                <select
                  value={deliveryDistrict}
                  onChange={e => setDeliveryDistrict(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="Colombo">Colombo Wholesale Terminal</option>
                  <option value="Gampaha">Gampaha Hub</option>
                  <option value="Kandy">Kandy Distribution Point</option>
                  <option value="Kurunegala">Kurunegala Facility</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Delivery Address</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              >
                <option value="Bank Transfer (Simulated)">Bank Transfer (Simulated Corporate Swift/SLIPS)</option>
                <option value="Cash on Delivery (COD)">Cash on Delivery (COD at Warehouse)</option>
                <option value="Digital Escrow (Simulated)">Digital Agricultural Escrow</option>
              </select>
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex justify-between items-center text-xs">
              <span className="text-emerald-900 font-semibold">Total Order Payable:</span>
              <strong className="text-emerald-950 font-mono text-sm tabular-nums">
                LKR {cartTotal.toLocaleString()}
              </strong>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg shadow-xs"
              >
                Confirm & Reserve Produce Stock
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Seller: Add Listing Modal */}
      {isAddListingOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddListingOpen(false)}
          title="List Harvest Produce Lot"
          description="Publish a certified farm harvest lot to the wholesale produce marketplace"
        >
          <form onSubmit={handleCreateListingSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Crop / Produce Name</label>
              <input
                type="text"
                value={listCropName}
                onChange={e => setListCropName(e.target.value)}
                placeholder="e.g. Single-Estate Ceylon Pure BOPF Tea"
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Variety</label>
                <input
                  type="text"
                  value={listVariety}
                  onChange={e => setListVariety(e.target.value)}
                  placeholder="e.g. TRI 2025 Clonal"
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">District</label>
                <select
                  value={listDistrict}
                  onChange={e => setListDistrict(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="Nuwara Eliya">Nuwara Eliya</option>
                  <option value="Anuradhapura">Anuradhapura</option>
                  <option value="Kurunegala">Kurunegala</option>
                  <option value="Badulla">Badulla</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Available Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={listQty}
                  onChange={e => setListQty(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Unit</label>
                <select
                  value={listUnit}
                  onChange={e => setListUnit(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="kg">kg</option>
                  <option value="MT">MT</option>
                  <option value="crates">crates</option>
                  <option value="sacks">sacks</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Price / Unit (LKR)</label>
                <input
                  type="number"
                  min="1"
                  value={listPrice}
                  onChange={e => setListPrice(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Photo Selection</label>
              <select
                value={listImage}
                onChange={e => setListImage(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              >
                <option value="/src/assets/images/crop_ceylon_tea_1792164656862.jpg">Ceylon Tea Leaves</option>
                <option value="/src/assets/images/crop_paddy_rice_1792164657419.jpg">Golden Samba Rice</option>
                <option value="/src/assets/images/crop_red_chili_1792164657598.jpg">Fresh Red Chillies</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Lot Description</label>
              <textarea
                value={listDesc}
                onChange={e => setListDesc(e.target.value)}
                placeholder="Export grade certifications, aroma, moisture grade, harvesting date..."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddListingOpen(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#10281D] rounded-lg"
              >
                Publish Listing
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
