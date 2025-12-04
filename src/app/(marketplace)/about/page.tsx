export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">About Leeztruestyles</h1>

        <div className="prose prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4 text-primary">Our Story</h2>
            <p className="text-gray-700 mb-4 text-lg leading-relaxed">
              Leeztruestyles was founded with a passion for bringing the latest fashion trends
              to Kenya. We believe that everyone deserves access to quality, stylish clothing
              that makes them feel confident and beautiful.
            </p>
            <p className="text-gray-700 mb-4 text-lg leading-relaxed">
              Since our inception, we've been committed to curating a collection of fashion-forward
              pieces that blend international trends with local style sensibilities. Our team
              carefully selects each item to ensure quality, style, and value for our customers.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4 text-primary">Our Mission</h2>
            <p className="text-gray-700 mb-4 text-lg leading-relaxed">
              To empower individuals to express their unique style through accessible,
              high-quality fashion that celebrates diversity and self-expression.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4 text-primary">Our Values</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-2 text-primary">Quality First</h3>
                <p className="text-gray-700">
                  We source only the finest materials and work with trusted suppliers
                  to ensure every product meets our high standards.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-2 text-primary">Customer Focus</h3>
                <p className="text-gray-700">
                  Your satisfaction is our priority. We're here to help you find the
                  perfect pieces for your wardrobe.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-2 text-primary">Sustainability</h3>
                <p className="text-gray-700">
                  We're committed to sustainable fashion practices and supporting
                  ethical manufacturing processes.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-2 text-primary">Innovation</h3>
                <p className="text-gray-700">
                  We stay ahead of fashion trends and continuously update our collection
                  with the latest styles.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-4 text-primary">Why Choose Us?</h2>
            <ul className="space-y-3 text-gray-700 text-lg">
              <li className="flex items-start">
                <span className="text-primary mr-2">✓</span>
                <span>Wide selection of trendy fashion items</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">✓</span>
                <span>Fast and reliable delivery across Kenya</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">✓</span>
                <span>Secure payment options including M-Pesa</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">✓</span>
                <span>Excellent customer service</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">✓</span>
                <span>Easy returns and exchanges</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

