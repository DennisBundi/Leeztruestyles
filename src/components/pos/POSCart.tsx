"use client";

import { useState } from "react";
import Image from "next/image";
import { useCartStore } from "@/store/cartStore";
import { useRouter } from "next/navigation";
import { formatOrderId } from "@/lib/utils/orderId";

interface POSCartProps {
  employeeId?: string;
  employeeCode?: string;
  onOrderComplete?: () => void;
}

export default function POSCart({
  employeeId,
  employeeCode,
  onOrderComplete,
}: POSCartProps) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mpesa" | "card">(
    "cash"
  );
  const [customerName, setCustomerName] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [saleDetails, setSaleDetails] = useState<{
    total: number;
    paymentMethod: string;
    itemsCount: number;
  } | null>(null);

  const total = getTotal();

  const handleCompleteSale = async () => {
    if (items.length === 0) {
      alert("Cart is empty. Please add products to complete a sale.");
      return;
    }

    // Validate payment method is selected
    if (!paymentMethod) {
      alert("Please select a payment method before completing the sale.");
      return;
    }

    setProcessing(true);

    try {
      const hasDatabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== "placeholder";

      if (!hasDatabase) {
        // Preview mode - simulate successful sale
        const mockOrderId = `POS-${Date.now()}`;
        setOrderId(mockOrderId);
        setSaleDetails({
          total,
          paymentMethod: paymentMethod.toUpperCase(),
          itemsCount: items.length,
        });
        setShowSuccessModal(true);
        clearCart();
        setCustomerName("");
        setPaymentMethod("cash");

        setProcessing(false);
        return;
      }

      // Step 1: Create order
      // Validate and format items before sending
      const orderItems = items.map((item) => {
        // Ensure product_id is a valid UUID string
        if (!item.product.id || typeof item.product.id !== "string") {
          throw new Error(`Invalid product ID for ${item.product.name}`);
        }

        // Validate UUID format (basic check)
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(item.product.id)) {
          console.error("Invalid UUID format for product:", item.product);
          throw new Error(
            `Product "${item.product.name}" has an invalid ID format. Please refresh the page and try again.`
          );
        }

        // Ensure price is a number
        const price =
          typeof item.product.price === "number"
            ? item.product.price
            : parseFloat(String(item.product.price));

        if (isNaN(price) || price <= 0) {
          throw new Error(`Invalid price for ${item.product.name}`);
        }

        // Ensure quantity is a positive integer
        const quantity = Math.floor(Number(item.quantity));
        if (quantity <= 0 || !Number.isInteger(quantity)) {
          throw new Error(`Invalid quantity for ${item.product.name}`);
        }

        return {
          product_id: item.product.id,
          quantity: quantity,
          price: price,
        };
      });

      // Log the order data for debugging
      console.log("Creating order with items:", orderItems);

      const orderResponse = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: orderItems,
          customer_info: {
            name: customerName || "POS Customer",
            email: "pos@leeztruestyles.com",
            phone: "0000000000",
            address: "In-store",
          },
          sale_type: "pos",
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}));
        // Show detailed validation errors if available
        const errorMessage = errorData.details
          ? `Validation Error: ${JSON.stringify(errorData.details, null, 2)}`
          : errorData.error || "Failed to create order";
        throw new Error(errorMessage);
      }

      const { order_id } = await orderResponse.json();

      // Step 2: Update order with seller_id and payment method
      // Prepare update data - only include seller_id if it's a valid UUID
      // All payment methods are marked as completed since transactions are confirmed at physical POS
      const updateData: any = {
        order_id,
        payment_method: paymentMethod,
        status: "completed", // All POS payments are completed immediately at physical location
      };

      // Only include seller_id if employeeId is provided and is a valid UUID
      if (
        employeeId &&
        typeof employeeId === "string" &&
        employeeId.trim() !== ""
      ) {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(employeeId)) {
          updateData.seller_id = employeeId;
        } else {
          console.warn(
            "Invalid employeeId format, skipping seller_id:",
            employeeId
          );
        }
      }

      console.log("Updating order with data:", updateData);

      const updateResponse = await fetch("/api/orders/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        // Show detailed validation errors if available
        const errorMessage = errorData.details
          ? `Validation Error: ${JSON.stringify(errorData.details, null, 2)}`
          : errorData.error || "Failed to update order with payment method";
        throw new Error(errorMessage);
      }

      // Step 3: Deduct inventory for each item (with error handling)
      const inventoryDeductions = await Promise.allSettled(
        items.map(async (item) => {
          const deductResponse = await fetch("/api/inventory/deduct", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              product_id: item.product.id,
              quantity: item.quantity,
              order_id,
            }),
          });

          if (!deductResponse.ok) {
            const errorData = await deductResponse.json().catch(() => ({}));
            throw new Error(
              `Failed to deduct inventory for ${item.product.name}: ${
                errorData.error || "Insufficient stock"
              }`
            );
          }

          return await deductResponse.json();
        })
      );

      // Check if any inventory deductions failed
      const failedDeductions = inventoryDeductions.filter(
        (result) => result.status === "rejected"
      );

      if (failedDeductions.length > 0) {
        const errorMessages = failedDeductions
          .map((result) =>
            result.status === "rejected"
              ? result.reason?.message || "Unknown error"
              : ""
          )
          .filter(Boolean);

        throw new Error(
          `Inventory update failed:\n${errorMessages.join(
            "\n"
          )}\n\nOrder was created but inventory was not updated. Please update inventory manually.`
        );
      }

      // All operations successful - show success modal
      setOrderId(order_id);
      setSaleDetails({
        total,
        paymentMethod: paymentMethod.toUpperCase(),
        itemsCount: items.length,
      });
      setShowSuccessModal(true);
      clearCart();
      setCustomerName("");
      setPaymentMethod("cash"); // Reset to default

      // Refresh products to show updated inventory
      if (onOrderComplete) {
        onOrderComplete();
      }
    } catch (error) {
      console.error("Error completing sale:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to complete sale. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {/* Success Modal */}
      {showSuccessModal && orderId && saleDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-95 duration-300 border border-white/20">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            {/* Success Message */}
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Sale Completed Successfully!
            </h3>
            <p className="text-gray-600 mb-6">
              Your sale has been recorded and inventory has been updated.
            </p>

            {/* Sale Details */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Number:</span>
                <span className="font-semibold text-gray-900 font-mono">
                  {formatOrderId(orderId)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Items Sold:</span>
                <span className="font-semibold text-gray-900">
                  {saleDetails.itemsCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-semibold text-gray-900">
                  {saleDetails.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-lg font-semibold text-gray-900">
                  Total Amount:
                </span>
                <span className="text-lg font-bold text-primary">
                  KES {(saleDetails.total || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setOrderId(null);
                setSaleDetails(null);
              }}
              className="w-full py-4 px-6 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary-dark hover:shadow-lg transition-all transform hover:-translate-y-1"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-4">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Cart</h2>

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
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-gray-500 font-medium">Cart is empty</p>
              <p className="text-sm text-gray-400 mt-1">
                Add products to start a sale
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.product.id}
                className="flex gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
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
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
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
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                        className="w-6 h-6 rounded border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-xs font-semibold"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
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
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="text-xs text-gray-600">
                    KES {(item.product.price || 0).toLocaleString()} each
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary text-lg">
                    KES {((item.product.price || 0) * item.quantity).toLocaleString()}
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
                <span className="text-lg font-semibold text-gray-700">
                  Subtotal
                </span>
                <span className="text-lg font-semibold text-gray-900">
                  KES {(total || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">Total</span>
                <span className="text-3xl font-bold text-primary">
                  KES {(total || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-3 rounded-none border-2 font-semibold transition-all ${
                    paymentMethod === "cash"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  onClick={() => setPaymentMethod("mpesa")}
                  className={`p-3 rounded-none border-2 font-semibold transition-all ${
                    paymentMethod === "mpesa"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  📱 M-Pesa
                </button>
                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`p-3 rounded-none border-2 font-semibold transition-all ${
                    paymentMethod === "card"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
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
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                `Complete Sale - KES ${(total || 0).toLocaleString()}`
              )}
            </button>

            {/* Employee Info */}
            {employeeCode && (
              <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-500">
                  Sale by:{" "}
                  <span className="font-semibold text-gray-700">
                    {employeeCode}
                  </span>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
