export default function ReturnsPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Returns & Exchanges</h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-primary">Return Policy</h2>
            <p className="text-gray-700 mb-4">
              We want you to be completely satisfied with your purchase. If you're not happy with
              your order, you can return it within <strong>14 days</strong> of delivery for a full
              refund or exchange.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-primary">Eligible Items</h2>
            <p className="text-gray-700 mb-4">Items must be:</p>
            <ul className="space-y-2 text-gray-700 mb-4">
              <li className="flex items-start">
                <span className="text-primary mr-2">✓</span>
                <span>Unworn, unwashed, and in original condition</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">✓</span>
                <span>With original tags and packaging</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">✓</span>
                <span>Included with original receipt or proof of purchase</span>
              </li>
            </ul>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                <strong>Note:</strong> Underwear, swimwear, and sale items marked as "Final Sale"
                are not eligible for return unless defective.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-primary">How to Return</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold mb-2">Step 1: Contact Us</h3>
                <p className="text-gray-700">
                  Email us at returns@leeztruestyles.com or call +254 700 000 000 to initiate
                  your return. Please provide your order number.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold mb-2">Step 2: Package Your Items</h3>
                <p className="text-gray-700">
                  Place the items in their original packaging (if available) and include the
                  original receipt or order confirmation.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold mb-2">Step 3: Send It Back</h3>
                <p className="text-gray-700 mb-2">
                  We'll provide you with a return shipping label. You can drop off the package
                  at any of our partner locations or schedule a pickup.
                </p>
                <p className="text-gray-600 text-sm">
                  Return shipping costs are the responsibility of the customer unless the item
                  is defective or incorrect.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold mb-2">Step 4: Receive Your Refund</h3>
                <p className="text-gray-700">
                  Once we receive and inspect your return, we'll process your refund within
                  5-7 business days. Refunds will be issued to your original payment method.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-primary">Exchanges</h2>
            <p className="text-gray-700 mb-4">
              Need a different size or color? We offer exchanges for eligible items. Simply
              follow the return process above and specify that you'd like an exchange. We'll
              send you the new item once we receive your return.
            </p>
            <p className="text-gray-700">
              If the exchange item is more expensive, you'll pay the difference. If it's less
              expensive, we'll refund the difference.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-primary">Defective Items</h2>
            <p className="text-gray-700 mb-4">
              If you receive a defective or damaged item, please contact us immediately. We'll
              arrange for a free return and replacement or full refund, including return
              shipping costs.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

