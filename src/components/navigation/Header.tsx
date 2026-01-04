"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  // Safely access cart store with fallback
  const itemCount = useCartStore((state) => {
    if (!state || !state.items) return 0;
    return state.items.reduce((count, item) => count + (item.quantity || 0), 0);
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<
    "admin" | "manager" | "seller" | null
  >(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showAuthDropdown, setShowAuthDropdown] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const buttonElementRef = useRef<HTMLButtonElement>(null);
  const dropdownJustOpenedRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    const hasSupabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "placeholder" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.trim() !== "";

    // Set a maximum loading time - always show auth buttons after 500ms
    // Reduced timeout to show buttons faster and prevent blocking
    const maxLoadingTimer = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 500);

    // Safety fallback: Ensure loading is always false after maximum 2 seconds
    // This prevents the button from being stuck in loading state
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 2000);

    if (hasSupabase) {
      const checkUserRole = async (userId: string) => {
        try {
          const { data: employeeData } = await supabase
            .from("employees")
            .select("role")
            .eq("user_id", userId)
            .single();

          if (employeeData) {
            const role = employeeData.role as "admin" | "manager" | "seller";
            if (mounted) {
              setUserRole(role);
              setIsAdmin(role === "admin" || role === "manager");
            }
          } else {
            if (mounted) {
              setUserRole(null);
              setIsAdmin(false);
            }
          }
        } catch (e) {
          console.error("Error checking role:", e);
          if (mounted) {
            setUserRole(null);
            setIsAdmin(false);
          }
        }
      };

      const initAuth = async () => {
        try {
          // Race condition to prevent infinite loading if Supabase hangs
          const getUserPromise = supabase.auth.getUser();
          const timeoutPromise = new Promise(
            (_, reject) =>
              setTimeout(() => reject(new Error("Auth timeout")), 5000) // Reduced to 5 seconds
          );

          const { data } = (await Promise.race([
            getUserPromise,
            timeoutPromise,
          ])) as any;

          if (!mounted) return;

          const currentUser = data?.user ?? null;
          console.log("Header Auth Check (getUser):", !!currentUser);

          if (currentUser) {
            setUser(currentUser);
            checkUserRole(currentUser.id);
          } else {
            // Fallback to session check
            const {
              data: { session },
            } = await supabase.auth.getSession();
            console.log(
              "Header Auth Check (getSession fallback):",
              !!session?.user
            );
            if (session?.user) {
              setUser(session.user);
              checkUserRole(session.user.id);
            } else {
              setUser(null);
            }
          }
        } catch (error) {
          console.error("Header auth check failed/timeout:", error);
          if (mounted) {
            // Always set loading to false on error to show buttons
            setLoading(false);
            // Fallback to session check on error
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();
              console.log(
                "Header Auth Check (Error Fallback):",
                !!session?.user
              );
              if (session?.user) {
                setUser(session.user);
                checkUserRole(session.user.id);
              } else {
                setUser(null);
              }
            } catch (innerError) {
              console.error("Header session fallback failed:", innerError);
              setUser(null);
            }
            // Always set loading to false in error cases to show buttons
            if (mounted) {
              setLoading(false);
            }
          }
        } finally {
          if (mounted) {
            clearTimeout(maxLoadingTimer);
            setLoading(false);
          }
        }
      };

      initAuth();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        console.log("Header Auth State Change:", event, !!session?.user);

        const currentUser = session?.user ?? null;
        setUser(currentUser); // Always update state on change

        if (currentUser) {
          checkUserRole(currentUser.id);
        } else {
          setUserRole(null);
          setIsAdmin(false);
        }
      });

      return () => {
        mounted = false;
        clearTimeout(maxLoadingTimer);
        clearTimeout(safetyTimer);
        subscription.unsubscribe();
      };
    } else {
      // No Supabase config - show auth buttons immediately
      clearTimeout(maxLoadingTimer);
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showAuthDropdown) {
      dropdownJustOpenedRef.current = false;
      return;
    }

    console.log(
      "[Header] Auth dropdown opened, setting up click-outside handler"
    );

    // Keep protection flag true longer to prevent immediate closing
    const protectionTimeoutId = setTimeout(() => {
      dropdownJustOpenedRef.current = false;
      console.log("[Header] Click-outside protection disabled");
    }, 600); // 600ms protection window

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Ignore clicks that happened right after opening the dropdown
      if (dropdownJustOpenedRef.current) {
        return;
      }

      // Don't close if clicking inside the button
      if (
        buttonElementRef.current &&
        buttonElementRef.current.contains(target)
      ) {
        return;
      }

      // Don't close if clicking inside the container
      if (buttonRef.current && buttonRef.current.contains(target)) {
        return;
      }

      // Check if clicking on the portal dropdown
      const dropdownMenu = document.querySelector(
        '[data-dropdown-menu="auth"]'
      );
      if (dropdownMenu && dropdownMenu.contains(target)) {
        return;
      }

      // Close the dropdown
      console.log("[Header] Click-outside: closing dropdown");
      setShowAuthDropdown(false);
    };

    // Add listener after a delay to ensure dropdown renders first
    const listenerTimeoutId = setTimeout(() => {
      console.log("[Header] Adding click-outside listener");
      document.addEventListener("click", handleClickOutside, false);
    }, 600); // Wait 600ms before listening for outside clicks to ensure dropdown fully renders

    return () => {
      clearTimeout(protectionTimeoutId);
      clearTimeout(listenerTimeoutId);
      document.removeEventListener("click", handleClickOutside, false);
      console.log("[Header] Removed click-outside listener");
    };
  }, [showAuthDropdown]);

  // Debug: Log dropdown state changes
  useEffect(() => {
    console.log("[Header] Dropdown state changed:", {
      showAuthDropdown,
      isMounted,
      hasButtonRef: !!buttonElementRef.current,
      hasDocument: typeof document !== "undefined",
      hasBody: typeof document !== "undefined" && !!document.body,
    });
  }, [showAuthDropdown, isMounted]);

  const handleSignOut = async () => {
    const supabase = createClient();
    // Clear cart specific to this user session
    useCartStore.getState().clearCart();

    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    setIsAdmin(false);
    router.push("/");
    router.refresh();
  };

  // Don't render header on admin routes
  if (pathname?.startsWith("/dashboard") || pathname?.startsWith("/pos")) {
    return null;
  }

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Products" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <Image
              src="/images/leeztruelogo.jpeg"
              alt="Leez True Styles Logo"
              width={60}
              height={60}
              className="h-12 w-12 object-cover rounded-full"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative font-medium transition-colors ${
                  pathname === link.href
                    ? "text-primary"
                    : "text-gray-700 hover:text-primary"
                }`}
              >
                {link.label}
                {pathname === link.href && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Cart Icon & Auth Links & Mobile Menu */}
          <div
            className="flex items-center gap-4 relative z-[60]"
            style={{ overflow: "visible", pointerEvents: "auto" }}
          >
            {/* Auth Button (Desktop) */}
            <div
              className="hidden md:flex items-center relative"
              ref={buttonRef}
              style={{
                zIndex: 60,
                position: "relative",
                pointerEvents: "auto",
              }}
            >
              {!user ? (
                // Not logged in - show Sign In button with dropdown
                <div
                  className="relative"
                  style={{
                    overflow: "visible",
                    zIndex: 60,
                    pointerEvents: "auto",
                  }}
                >
                  <button
                    ref={buttonElementRef}
                    data-testid="sign-in-button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      console.log("[Header] Sign In button clicked", {
                        currentState: showAuthDropdown,
                        isMounted,
                        hasButtonRef: !!buttonElementRef.current,
                      });

                      // Simply toggle the dropdown - position will be calculated during render
                      if (!showAuthDropdown) {
                        dropdownJustOpenedRef.current = true;
                        console.log("[Header] Opening auth dropdown");
                        setShowAuthDropdown(true);
                      } else {
                        console.log("[Header] Closing auth dropdown");
                        setShowAuthDropdown(false);
                      }
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium text-sm flex items-center gap-2 cursor-pointer"
                    type="button"
                    style={{
                      position: "relative",
                      zIndex: 1000,
                      pointerEvents: "auto",
                      cursor: "pointer",
                    }}
                  >
                    Sign In
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        showAuthDropdown ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isMounted &&
                    showAuthDropdown &&
                    buttonElementRef.current &&
                    typeof document !== "undefined" &&
                    document.body &&
                    (() => {
                      // Calculate position synchronously right before rendering
                      const buttonRect =
                        buttonElementRef.current!.getBoundingClientRect();
                      const top = buttonRect.bottom + 4;
                      const left = buttonRect.left;

                      console.log("[Header] Rendering dropdown portal at:", {
                        top,
                        left,
                        buttonRect,
                      });

                      return createPortal(
                        <div
                          data-dropdown-menu="auth"
                          className="fixed w-48 bg-white rounded-lg shadow-xl border-2 border-gray-300 py-1"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          style={{
                            zIndex: 99999,
                            position: "fixed",
                            top: `${top}px`,
                            left: `${left}px`,
                            minWidth: "192px",
                            width: "192px",
                            backgroundColor: "white",
                            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                            display: "block",
                            visibility: "visible",
                            opacity: 1,
                            pointerEvents: "auto",
                          }}
                        >
                          <Link
                            href="/signin"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                            onClick={() => setShowAuthDropdown(false)}
                          >
                            Sign In
                          </Link>
                          <Link
                            href="/signup"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                            onClick={() => setShowAuthDropdown(false)}
                          >
                            Create Account
                          </Link>
                        </div>,
                        document.body
                      );
                    })()}
                </div>
              ) : (
                // User logged in
                <div
                  className="relative"
                  style={{
                    overflow: "visible",
                    zIndex: 60,
                    pointerEvents: "auto",
                  }}
                >
                  <button
                    ref={buttonElementRef}
                    onMouseEnter={() =>
                      console.log("[Header] Account button mouse enter")
                    }
                    onMouseLeave={() =>
                      console.log("[Header] Account button mouse leave")
                    }
                    onMouseDown={() =>
                      console.log("[Header] Account button mouse down")
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      // Simply toggle the dropdown - position will be calculated during render
                      if (!showAuthDropdown) {
                        dropdownJustOpenedRef.current = true;
                        console.log("[Header] Opening account dropdown");
                        setShowAuthDropdown(true);
                      } else {
                        console.log("[Header] Closing account dropdown");
                        setShowAuthDropdown(false);
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm flex items-center gap-2 cursor-pointer"
                    type="button"
                    style={{
                      position: "relative",
                      zIndex: 1000, // Significantly increase z-index
                      pointerEvents: "auto", // Explicitly enable pointer events
                      isolation: "isolate", // Create own stacking context
                    }}
                  >
                    {userRole === "admin" || userRole === "manager"
                      ? "Admin"
                      : "Account"}
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        showAuthDropdown ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isMounted &&
                    showAuthDropdown &&
                    buttonElementRef.current &&
                    typeof document !== "undefined" &&
                    document.body &&
                    (() => {
                      // Calculate position synchronously right before rendering
                      const buttonRect =
                        buttonElementRef.current!.getBoundingClientRect();
                      const top = buttonRect.bottom + 4;
                      const left = buttonRect.left;

                      return createPortal(
                        <div
                          data-dropdown-menu="auth"
                          className="fixed w-48 bg-white rounded-lg shadow-xl border-2 border-gray-300 py-1"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          style={{
                            zIndex: 99999,
                            position: "fixed",
                            top: `${top}px`,
                            left: `${left}px`,
                            minWidth: "192px",
                            width: "192px",
                            backgroundColor: "white",
                            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                            display: "block",
                            visibility: "visible",
                            opacity: 1,
                            pointerEvents: "auto",
                          }}
                        >
                          {userRole ? (
                            // Admin, Manager, or Seller - show Dashboard
                            <Link
                              href={
                                userRole === "seller"
                                  ? "/dashboard/products"
                                  : "/dashboard"
                              }
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                              onClick={() => setShowAuthDropdown(false)}
                            >
                              Dashboard
                            </Link>
                          ) : (
                            // Regular user - show Profile
                            <Link
                              href="/profile"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                              onClick={() => setShowAuthDropdown(false)}
                            >
                              Profile
                            </Link>
                          )}
                          <button
                            onClick={() => {
                              setShowAuthDropdown(false);
                              handleSignOut();
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            type="button"
                          >
                            Sign Out
                          </button>
                        </div>,
                        document.body
                      );
                    })()}
                </div>
              )}
            </div>

            {/* Cart Icon */}
            <Link
              href="/checkout"
              className="relative p-2 text-gray-700 hover:text-primary transition-colors"
              aria-label="Shopping cart"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {isMounted && itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-scale-in">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-100 animate-slide-up">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {/* Mobile Auth Links */}
              <div className="px-4 pt-2 border-t border-gray-100 flex flex-col gap-2">
                {!user ? (
                  // Not logged in - show Sign In options
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/signin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors text-center cursor-pointer"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium text-center cursor-pointer"
                    >
                      Create Account
                    </Link>
                  </div>
                ) : (
                  // User logged in
                  <>
                    {userRole ? (
                      // Admin, Manager, or Seller - show Dashboard
                      <Link
                        href={
                          userRole === "seller"
                            ? "/dashboard/products"
                            : "/dashboard"
                        }
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors text-center cursor-pointer"
                      >
                        Dashboard
                      </Link>
                    ) : (
                      // Regular user - show Profile
                      <Link
                        href="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors text-center cursor-pointer"
                      >
                        Profile
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium cursor-pointer"
                      type="button"
                    >
                      Sign Out
                    </button>
                  </>
                )}
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
