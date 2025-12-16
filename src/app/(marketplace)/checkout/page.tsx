"use client";

import { useState, FormEvent, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PaymentMethodSelector from "@/components/checkout/PaymentMethodSelector";
import OrderSummary from "@/components/checkout/OrderSummary";
import { createClient } from "@/lib/supabase/client";

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const clearCart = useCartStore((state) => state.clearCart);

  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "card">("mpesa");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [productSizes, setProductSizes] = useState<{ [productId: string]: Array<{ size: string; available: number }> }>({});
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Wait for client-side hydration before accessing cart
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const total = isMounted ? getTotal() : 0;



  // Check authentication on mount
  // Fetch product sizes for validation
  useEffect(() => {
    const fetchSizes = async () => {
      if (items.length === 0) return;
      
      setLoadingSizes(true);
      const sizesMap: { [productId: string]: Array<{ size: string; available: number }> } = {};
      
      for (const item of items) {
        // Skip if already loaded
        if (productSizes[item.product.id]) {
          continue;
        }

        try {
          const response = await fetch(`/api/products/${item.product.id}/sizes`);
          if (response.ok) {
            const data = await response.json();
            if (data.sizes && data.sizes.length > 0) {
              sizesMap[item.product.id] = data.sizes.map((s: any) => ({
                size: s.size,
                available: s.available,
              }));
            }
          }
        } catch (error) {
          console.error(`Error fetching sizes for product ${item.product.id}:`, error);
        }
      }

      if (Object.keys(sizesMap).length > 0) {
        setProductSizes(prev => ({ ...prev, ...sizesMap }));
      }
      setLoadingSizes(false);
    };

    fetchSizes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map(i => i.product.id).join(',')]);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const fillUserInfo = async (user: any) => {
      if (!mounted) return;
      try {
        const { data: profile } = await supabase
          .from("users")
          .select("email, full_name, phone")
          .eq("id", user.id)
          .single();

        if (mounted && profile) {
          setCustomerInfo(prev => ({
            ...prev,
            name: profile.full_name || prev.name || "",
            email: profile.email || user.email || prev.email || "",
            phone: profile.phone || prev.phone || "",
          }));
        } else if (mounted) {
          setCustomerInfo(prev => ({
            ...prev,
            name: user.user_metadata?.full_name || prev.name || "",
            email: user.email || prev.email || "",
          }));
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      }
    };

    // Initial check
    const checkAuth = async () => {
      try {
        // Race condition to prevent infinite loading
        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth check timeout')), 10000)
        );

        const result = await Promise.race([getUserPromise, timeoutPromise]) as any;
        console.log("Checkout Auth Result:", result);

        if (!mounted) return;

        const user = result.data?.user;
        if (user) {
          setIsAuthenticated(true);
          fillUserInfo(user);
        } else {
          // Fallback: check session if getUser failed but might be local
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log("Fallback Session User:", session.user);
            setIsAuthenticated(true);
            fillUserInfo(session.user);
          } else {
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error("Auth check error/timeout:", error);
        if (mounted) {
          // Fallback to session check on error
          try {
            const { data: { session } } = await supabase.auth.getSession();
            console.log("Checkout Auth Fallback:", session?.user?.id);
            if (session?.user) {
              setIsAuthenticated(true);
              fillUserInfo(session.user);
            } else {
              setIsAuthenticated(false);
            }
          } catch (innerError) {
            console.error("Checkout session fallback failed:", innerError);
            setIsAuthenticated(false);
          }
        }
      } finally {
        if (mounted) setCheckingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth changes (e.g. token refresh, login in another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log("Auth State Change:", event, session?.user?.id);

      const user = session?.user;
      if (user) {
        setIsAuthenticated(true);
        // Only fill if not already checking (to avoid double fill race, though safe)
        if (!checkingAuth) fillUserInfo(user);
      } else {
        // Only set to false if we are sure (e.g. SIGNED_OUT)
        // But be careful not to override initial check if 'INITIAL_SESSION' is null but 'getUser' worked?
        // Usually onAuthStateChange is authoritative.
        if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setCheckingAuth(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate that all products with sizes have size selected
      const itemsWithMissingSizes: string[] = [];
      const cartItems = items;
      
      for (const item of cartItems) {
        // Check if this product has sizes available
        const hasSizes = productSizes[item.product.id] && productSizes[item.product.id].length > 0;
        
        if (hasSizes && !item.size) {
          itemsWithMissingSizes.push(item.product.name);
        }
      }

      if (itemsWithMissingSizes.length > 0) {
        setError(
          `Please select a size for: ${itemsWithMissingSizes.join(', ')}`
        );
        setLoading(false);
        // Scroll to error message
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Require authentication for checkout
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!user || authError) {
        setError(
          "Please sign in to complete your purchase. This allows us to track your orders."
        );
        setLoading(false);
        // Redirect to signin with return URL
        router.push(`/signin?redirect=/checkout`);
        return;
      }

      // Check if database is configured
      const hasDatabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== "placeholder";

      if (!hasDatabase) {
        // Preview mode - simulate successful checkout
        clearCart();
        const mockOrderId = `order_${Date.now()}`;
        router.push(`/checkout/success?order_id=${mockOrderId}`);
        return;
      }

      // Create order
      const orderResponse = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            price: item.product.price,
            size: item.size || undefined, // Include size if selected
            color: item.color || undefined, // Include color if selected
          })),
          customer_info: customerInfo,
          sale_type: "online",
        }),
      });

      if (!orderResponse.ok) {
        throw new Error("Failed to create order");
      }

      const { order_id } = await orderResponse.json();

      // Initiate payment
      const paymentResponse = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id,
          amount: total,
          method: paymentMethod,
          phone: paymentMethod === "mpesa" ? customerInfo.phone : undefined,
          email: paymentMethod === "card" ? customerInfo.email : undefined,
        }),
      });

      if (!paymentResponse.ok) {
        throw new Error("Failed to initiate payment");
      }

      const paymentData = await paymentResponse.json();

      if (paymentMethod === "card" && paymentData.authorization_url) {
        // Redirect to Paystack payment page
        window.location.href = paymentData.authorization_url;
      } else {
        // For M-Pesa, show success modal
        setCreatedOrderId(order_id);
        setShowMpesaModal(true);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  const handleMpesaComplete = () => {
    clearCart();
    router.push(`/checkout/success?order_id=${createdOrderId}`);
  };

  // Check if any products with sizes are missing size selection
  const hasMissingSizes = () => {
    if (loadingSizes || !isMounted) return true; // Wait for sizes to load or hydration
    
    const cartItems = items;
    for (const item of cartItems) {
      const hasSizes = productSizes[item.product.id] && productSizes[item.product.id].length > 0;
      if (hasSizes && !item.size) {
        return true;
      }
    }
    return false;
  };

  // Show loading state while checking auth or waiting for hydration
  if (checkingAuth || !isMounted) {
    return (
      <div className="container mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="max-w-md mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const cartItems = isMounted ? items : [];

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="max-w-md mx-auto">
          <svg
            className="w-24 h-24 mx-auto text-gray-300 mb-6"
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
          <h1 className="text-3xl font-bold mb-4 text-gray-900">
            Your cart is empty
          </h1>
          <p className="text-gray-600 mb-8">
            Add some products to your cart to continue
          </p>
          <button
            onClick={() => router.push("/products")}
            className="px-8 py-4 bg-primary text-white rounded-none font-semibold hover:bg-primary-dark hover:shadow-lg transition-all hover:scale-105"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 animate-fade-in">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 md:p-12 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Sign In Required
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto">
              Please sign in to complete your purchase. This allows us to track
              your orders and provide you with order history.
            </p>

            <div className="space-y-4">
              <Link
                href={`/signin?redirect=/checkout`}
                className="inline-block w-full md:w-auto px-8 py-4 bg-primary text-white rounded-none font-semibold hover:bg-primary-dark transition-all hover:scale-105"
              >
                Sign In to Continue
              </Link>
              <div>
                <p className="text-sm text-gray-500 mb-2">
                  Don't have an account?
                </p>
                <Link
                  href={`/signup?redirect=/checkout`}
                  className="text-primary font-semibold hover:text-primary-dark underline"
                >
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-gray-600">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-primary">
          Products
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Checkout</span>
      </nav>

      <h1 className="text-4xl font-bold mb-8 text-gray-900">Checkout</h1>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100 animate-slide-up">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              Customer Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerInfo.name}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={customerInfo.email}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, email: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={customerInfo.phone}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, phone: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="+254 700 000 000"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Delivery Address *
                </label>
                <textarea
                  required
                  value={customerInfo.address}
                  onChange={(e) =>
                    setCustomerInfo({
                      ...customerInfo,
                      address: e.target.value,
                    })
                  }
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  placeholder="Enter your full delivery address"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <PaymentMethodSelector
            paymentMethod={paymentMethod}
            onMethodChange={setPaymentMethod}
          />

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl animate-fade-in">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || hasMissingSizes()}
            className="w-full py-4 px-6 bg-primary text-white rounded-none font-semibold text-lg hover:bg-primary-dark hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
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
            ) : hasMissingSizes() ? (
              'Please Select Sizes'
            ) : (
              `Pay KES ${(total || 0).toLocaleString()}`
            )}
          </button>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <OrderSummary items={isMounted ? items : []} total={total} />
        </div>
      </form>

      {/* M-Pesa STK Push Modal */}
      {showMpesaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-2">Check Your Phone</h3>
            <p className="text-gray-600 mb-6 text-lg">
              We've sent an M-Pesa STK push to <span className="font-semibold text-gray-900">{customerInfo.phone}</span>.
              <br /><br />
              Please enter your M-Pesa PIN to complete the payment.
            </p>

            <button
              onClick={handleMpesaComplete}
              className="w-full py-4 px-6 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 hover:shadow-lg transition-all transform hover:-translate-y-1"
            >
              I have Completed Payment
            </button>

            <p className="mt-4 text-sm text-gray-500">
              Didn't get the prompt? <button onClick={handleMpesaComplete} className="text-primary hover:underline">Verify Status</button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
