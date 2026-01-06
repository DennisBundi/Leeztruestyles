import { createClient } from "@/lib/supabase/server";
import Image from "next/image";

export default async function AboutPage() {
  const supabase = await createClient();
  
  // Fetch some featured products to display images
  const { data: products } = await supabase
    .from("products")
    .select("id, name, images, price")
    .eq("status", "active")
    .limit(6)
    .order("created_at", { ascending: false });

  // Filter products that have images
  const productsWithImages = (products || []).filter(
    (product: any) =>
      product.images &&
      Array.isArray(product.images) &&
      product.images.length > 0 &&
      product.images[0]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Header Section with Visual */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              About Leeztruestyles
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your trusted fashion destination in Kenya
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            {/* Our Story Section */}
            <section className="mb-16 bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-gray-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-3xl md:text-4xl font-semibold text-primary m-0">Our Story</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <p className="text-gray-700 text-lg leading-relaxed">
                    Leeztruestyles was founded with a passion for bringing the latest fashion trends
                    to Kenya. We believe that everyone deserves access to quality, stylish clothing
                    that makes them feel confident and beautiful.
                  </p>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    Since our inception, we've been committed to curating a collection of fashion-forward
                    pieces that blend international trends with local style sensibilities. Our team
                    carefully selects each item to ensure quality, style, and value for our customers.
                  </p>
                </div>
                {productsWithImages.length > 0 && (
                  <div className="relative h-64 md:h-80 rounded-xl overflow-hidden shadow-lg">
                    <Image
                      src={productsWithImages[0]?.images[0]}
                      alt={productsWithImages[0]?.name || "Fashion item"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      unoptimized={productsWithImages[0]?.images[0]?.includes("unsplash.com")}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Our Mission Section */}
            <section className="mb-16 bg-gradient-to-br from-primary/10 to-primary-light/20 rounded-2xl shadow-lg p-8 md:p-12 border border-primary/20">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-shrink-0 w-16 h-16 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-3xl md:text-4xl font-semibold text-primary m-0">Our Mission</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {productsWithImages.length > 1 && (
                  <div className="relative h-64 md:h-80 rounded-xl overflow-hidden shadow-lg order-2 md:order-1">
                    <Image
                      src={productsWithImages[1]?.images[0]}
                      alt={productsWithImages[1]?.name || "Fashion item"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      unoptimized={productsWithImages[1]?.images[0]?.includes("unsplash.com")}
                    />
                  </div>
                )}
                <div className="order-1 md:order-2">
                  <p className="text-gray-700 text-lg leading-relaxed">
                    To empower individuals to express their unique style through accessible,
                    high-quality fashion that celebrates diversity and self-expression.
                  </p>
                </div>
              </div>
            </section>

            {/* Our Values Section */}
            <section className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-primary">Our Values</h2>
                <p className="text-gray-600 text-lg">The principles that guide everything we do</p>
              </div>
              
              {/* Product Images Gallery */}
              {productsWithImages.length > 2 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                  {productsWithImages.slice(2, 6).map((product: any, index: number) => (
                    <div key={product.id} className="relative aspect-square rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow group">
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        sizes="(max-width: 768px) 50vw, 25vw"
                        unoptimized={product.images[0]?.includes("unsplash.com")}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow hover:border-primary/30 group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-primary">Quality First</h3>
                  </div>
                  <p className="text-gray-700">
                    We source only the finest materials and work with trusted suppliers
                    to ensure every product meets our high standards.
                  </p>
                </div>
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow hover:border-primary/30 group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-primary">Customer Focus</h3>
                  </div>
                  <p className="text-gray-700">
                    Your satisfaction is our priority. We're here to help you find the
                    perfect pieces for your wardrobe.
                  </p>
                </div>
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow hover:border-primary/30 group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-primary">Sustainability</h3>
                  </div>
                  <p className="text-gray-700">
                    We're committed to sustainable fashion practices and supporting
                    ethical manufacturing processes.
                  </p>
                </div>
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow hover:border-primary/30 group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-primary">Innovation</h3>
                  </div>
                  <p className="text-gray-700">
                    We stay ahead of fashion trends and continuously update our collection
                    with the latest styles.
                  </p>
                </div>
              </div>
            </section>

            {/* Why Choose Us Section */}
            <section className="bg-gradient-to-br from-primary/5 to-primary-light/10 rounded-2xl shadow-lg p-8 md:p-12 border border-primary/20">
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-shrink-0 w-16 h-16 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl md:text-4xl font-semibold text-primary m-0">Why Choose Us?</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 bg-white/80 p-4 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-lg">Wide selection of trendy fashion items</span>
                </div>
                <div className="flex items-start gap-3 bg-white/80 p-4 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-lg">Fast and reliable delivery across Kenya</span>
                </div>
                <div className="flex items-start gap-3 bg-white/80 p-4 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-lg">Secure payment options including M-Pesa</span>
                </div>
                <div className="flex items-start gap-3 bg-white/80 p-4 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700 text-lg">Excellent customer service</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

