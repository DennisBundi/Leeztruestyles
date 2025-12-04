import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - Leeztruestyles',
  description: 'Terms and conditions for using Leeztruestyles marketplace',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing and using the Leeztruestyles website and services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Use License</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Permission is granted to temporarily access the materials on Leeztruestyles website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to reverse engineer any software contained on the website</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Account Registration</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To make purchases on our platform, you may be required to create an account. You agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and update your information to keep it accurate</li>
                <li>Maintain the security of your password and identification</li>
                <li>Accept all responsibility for all activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Products and Pricing</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We strive to provide accurate product descriptions and pricing. However, we reserve the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Correct any errors in pricing or product information</li>
                <li>Refuse or cancel orders placed for products listed at incorrect prices</li>
                <li>Limit the quantity of items purchased per person, per household, or per order</li>
                <li>Discontinue any product at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Payment Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                All payments are processed securely through our payment partners. By making a purchase, you agree to pay the full amount for the products ordered, including applicable taxes and shipping fees. We accept various payment methods including M-Pesa and card payments. All prices are displayed in Kenyan Shillings (KES).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Shipping and Delivery</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We ship products within Kenya. Delivery times may vary based on your location. You are responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Providing accurate delivery address information</li>
                <li>Being available to receive the delivery or arranging for alternative delivery arrangements</li>
                <li>Any additional customs duties or taxes that may apply</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Returns and Refunds</h2>
              <p className="text-gray-700 leading-relaxed">
                Please refer to our Returns Policy for detailed information about returns, exchanges, and refunds. We reserve the right to refuse returns that do not meet our return policy requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed">
                All content on this website, including but not limited to text, graphics, logos, images, and software, is the property of Leeztruestyles or its content suppliers and is protected by Kenyan and international copyright laws. You may not reproduce, distribute, or create derivative works from any content without our express written permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. Prohibited Uses</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may not use our website:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>In any way that violates any applicable national or international law or regulation</li>
                <li>To transmit, or procure the sending of, any advertising or promotional material without our prior written consent</li>
                <li>To impersonate or attempt to impersonate the company, a company employee, another user, or any other person or entity</li>
                <li>In any way that infringes upon the rights of others, or in any way is illegal, threatening, fraudulent, or harmful</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed">
                In no event shall Leeztruestyles, its directors, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the website or services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. Indemnification</h2>
              <p className="text-gray-700 leading-relaxed">
                You agree to defend, indemnify, and hold harmless Leeztruestyles and its licensee and licensors, and their employees, contractors, agents, officers and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms shall be interpreted and governed by the laws of Kenya. Any disputes relating to these terms or the services will be subject to the exclusive jurisdiction of the courts of Kenya.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">13. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">14. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 rounded-xl p-6 mt-4">
                <p className="text-gray-700"><strong>Email:</strong> legal@leeztruestyles.com</p>
                <p className="text-gray-700"><strong>Phone:</strong> +254 700 000 000</p>
                <p className="text-gray-700"><strong>Address:</strong> Nairobi, Kenya</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

