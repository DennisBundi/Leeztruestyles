'use client';

interface PaymentMethodSelectorProps {
  paymentMethod: 'mpesa' | 'card';
  onMethodChange: (method: 'mpesa' | 'card') => void;
}

export default function PaymentMethodSelector({
  paymentMethod,
  onMethodChange,
}: PaymentMethodSelectorProps) {
  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100 animate-slide-up">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Payment Method</h2>
      <div className="space-y-4">
        <label className={`flex items-center p-5 border-2 rounded-xl cursor-pointer transition-all ${
          paymentMethod === 'mpesa'
            ? 'border-primary bg-primary/5 shadow-md'
            : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
        }`}>
          <input
            type="radio"
            name="paymentMethod"
            value="mpesa"
            checked={paymentMethod === 'mpesa'}
            onChange={() => onMethodChange('mpesa')}
            className="mr-4 w-5 h-5 text-primary focus:ring-primary"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="font-bold text-gray-900">M-Pesa</div>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">Recommended</span>
            </div>
            <div className="text-sm text-gray-600">
              Pay via M-Pesa STK Push - Fast and secure
            </div>
          </div>
          {paymentMethod === 'mpesa' && (
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </label>

        <label className={`flex items-center p-5 border-2 rounded-xl cursor-pointer transition-all ${
          paymentMethod === 'card'
            ? 'border-primary bg-primary/5 shadow-md'
            : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
        }`}>
          <input
            type="radio"
            name="paymentMethod"
            value="card"
            checked={paymentMethod === 'card'}
            onChange={() => onMethodChange('card')}
            className="mr-4 w-5 h-5 text-primary focus:ring-primary"
          />
          <div className="flex-1">
            <div className="font-bold text-gray-900 mb-1">Card Payment</div>
            <div className="text-sm text-gray-600">
              Pay with credit or debit card via Paystack
            </div>
          </div>
          {paymentMethod === 'card' && (
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </label>
      </div>
    </div>
  );
}

