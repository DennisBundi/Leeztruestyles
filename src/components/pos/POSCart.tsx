'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';
import { useRouter } from 'next/navigation';

interface POSCartProps {
  employeeId?: string;
  employeeCode?: string;
  onOrderComplete?: () => void;
}

export default function POSCart({ employeeId, employeeCode, onOrderComplete }: POSCartProps) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const total = getTotal();

  const handleCompleteSale = async () => {
    if (items.length === 0) return;

    setProcessing(true);

    try {
      const hasDatabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'placeholder';

      if (!hasDatabase) {
        // Preview mode - simulate successful sale
        const mockOrderId = `POS-${Date.now()}`;
        setOrderId(mockOrderId);
        setShowSuccess(true);
        clearCart();
        setCustomerName('');
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccess(false);
          setOrderId(null);
        }, 5000);
        
        setProcessing(false);
        return;
      }

      // Create order
      const orderResponse = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            price: item.product.price,
          })),
          customer_info: {
            name: customerName || 'POS Customer',
            email: 'pos@leeztruestyles.com',
            phone: '',
            address: 'In-store',
          },
          sale_type: 'pos',
        }),
      });

      if (!orderResponse.ok) throw new Error('Failed to create order');

      const { order_id } = await orderResponse.json();

      // Update order with seller_id and payment method
      await fetch('/api/orders/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id,
          seller_id: employeeId,
          payment_method: paymentMethod,
          status: paymentMethod === 'cash' ? 'completed' : 'processing',
        }),
      });

      // Deduct inventory for each item
      for (const item of items) {
        await fetch('/api/inventory/deduct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: item.product.id,
            quantity: item.quantity,
            order_id,
          }),
        });
      }

      setOrderId(order_id);
      setShowSuccess(true);
      clearCart();
      setCustomerName('');
      
      if (onOrderComplete) onOrderComplete();
      
      // Auto-hide success message
      setTimeout(() => {
        setShowSuccess(false);
        setOrderId(null);
      }, 5000);
    } catch (error) {
      console.error('Error completing sale:', error);
      alert('Failed to complete sale');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-4">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Cart</h2>

      {/* Success Message */}
      {showSuccess && orderId && (
        <div className="mb-4 bg-green-50 border-2 border-green-200 rounded-xl p-4 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-green-900">Sale Completed!</p>
              <p className="text-sm text-green-700">Order ID: {orderId}</p>
            </div>
          </div>
        </div>
      )}

      {/* Customer Name (Optional) */}
      {items.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Customer Name (Optional)
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Enter customer name..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      )}

      {/* Cart Items */}
      <div className="space-y-3 mb-6 max-h-96 overflow-y-auto pr-2">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500 font-medium">Cart is empty</p>
            <p className="text-sm text-gray-400 mt-1">Add products to start a sale</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.product.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="relative w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                {item.product.images && item.product.images.length > 0 ? (
                  <Image
                    src={item.product.images[0]}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 truncate mb-1">
                  {item.product.name}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1 bg-white rounded-lg p-1">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 rounded border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-xs font-semibold"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 rounded border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-xs font-semibold"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="text-xs text-gray-600">
                  KES {item.product.price.toLocaleString()} each
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-primary text-lg">
                  KES {(item.product.price * item.quantity).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <>
          {/* Total */}
          <div className="border-t-2 border-gray-200 pt-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-semibold text-gray-700">Subtotal</span>
              <span className="text-lg font-semibold text-gray-900">KES {total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-gray-900">Total</span>
              <span className="text-3xl font-bold text-primary">KES {total.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-none border-2 font-semibold transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                💵 Cash
              </button>
              <button
                onClick={() => setPaymentMethod('mpesa')}
                className={`p-3 rounded-none border-2 font-semibold transition-all ${
                  paymentMethod === 'mpesa'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                📱 M-Pesa
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-none border-2 font-semibold transition-all ${
                  paymentMethod === 'card'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                💳 Card
              </button>
            </div>
          </div>

          {/* Complete Sale Button */}
          <button
            onClick={handleCompleteSale}
            disabled={processing}
            className="w-full py-4 px-6 bg-primary text-white rounded-none font-bold text-lg hover:bg-primary-dark hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              `Complete Sale - KES ${total.toLocaleString()}`
            )}
          </button>

          {/* Employee Info */}
          {employeeCode && (
            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                Sale by: <span className="font-semibold text-gray-700">{employeeCode}</span>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

