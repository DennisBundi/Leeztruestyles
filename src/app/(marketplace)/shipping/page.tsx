export default function ShippingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Shipping Information</h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-primary">Delivery Options</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold mb-2">Standard Delivery</h3>
                <p className="text-gray-700 mb-2">
                  <strong>Duration:</strong> 3-5 business days
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Cost:</strong> KES 300
                </p>
                <p className="text-gray-600 text-sm">
                  Available for all locations within Kenya. Orders are processed within 24 hours.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold mb-2">Express Delivery</h3>
                <p className="text-gray-700 mb-2">
                  <strong>Duration:</strong> 1-2 business days
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Cost:</strong> KES 500
                </p>
                <p className="text-gray-600 text-sm">
                  Fast delivery option for urgent orders. Available in major cities.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold mb-2">Free Delivery</h3>
                <p className="text-gray-700 mb-2">
                  <strong>Minimum Order:</strong> KES 5,000
                </p>
                <p className="text-gray-600 text-sm">
                  Enjoy free standard delivery on orders above KES 5,000.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-primary">How It Works</h2>
            <ol className="space-y-4">
              <li className="flex items-start">
                <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                  1
                </span>
                <div>
                  <h3 className="font-semibold mb-1">Place Your Order</h3>
                  <p className="text-gray-700">
                    Browse our collection and add items to your cart. Complete checkout with your
                    preferred payment method.
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                  2
                </span>
                <div>
                  <h3 className="font-semibold mb-1">Order Processing</h3>
                  <p className="text-gray-700">
                    We'll process your order within 24 hours and send you a confirmation email
                    with tracking information.
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                  3
                </span>
                <div>
                  <h3 className="font-semibold mb-1">Shipping</h3>
                  <p className="text-gray-700">
                    Your order will be carefully packaged and shipped via our trusted delivery
                    partners.
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                  4
                </span>
                <div>
                  <h3 className="font-semibold mb-1">Delivery</h3>
                  <p className="text-gray-700">
                    You'll receive your order at your specified address. Track your package
                    using the tracking number provided.
                  </p>
                </div>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-primary">Important Notes</h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Delivery times are estimates and may vary based on location and weather conditions.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>Please ensure someone is available to receive the package at the delivery address.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>We'll contact you via phone or email if there are any delivery issues.</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>For remote areas, delivery may take additional time.</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

