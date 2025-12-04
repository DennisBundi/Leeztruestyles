'use client';

import { useCartStore } from '@/store/cartStore';
import { useState } from 'react';
import CartItem from './CartItem';
import Link from 'next/link';

export default function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const getItemCount = useCartStore((state) => state.getItemCount);

  const itemCount = getItemCount();
  const total = getTotal();

  return (
    <>
      {/* Cart Button - Floating */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 bg-primary text-white rounded-none p-4 shadow-2xl hover:bg-primary-dark hover:shadow-primary/50 transition-all hover:scale-110 active:scale-95 group"
        aria-label="Open cart"
      >
        <svg className="w-6 h-6 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-scale-in shadow-lg">
            {itemCount}
          </span>
        )}
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-primary/5 to-primary-light/5">
            <h2 className="text-2xl font-bold text-gray-900">Shopping Cart</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-none transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-500">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <CartItem key={item.product.id} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t bg-gray-50 p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Subtotal:</span>
                <span className="text-2xl font-bold text-primary">KES {total.toLocaleString()}</span>
              </div>
              <div className="text-sm text-gray-500 text-center">
                Shipping calculated at checkout
              </div>
              <Link
                href="/checkout"
                onClick={() => setIsOpen(false)}
                className="block w-full py-4 px-6 bg-primary text-white text-center rounded-xl font-semibold hover:bg-primary-dark hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Proceed to Checkout
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="block w-full py-3 px-6 text-gray-600 text-center rounded-none font-medium hover:bg-gray-100 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

