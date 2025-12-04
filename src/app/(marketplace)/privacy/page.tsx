import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Leeztruestyles',
  description: 'Privacy policy for Leeztruestyles marketplace',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                Leeztruestyles ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Information We Collect</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We collect information that you provide directly to us and information that is automatically collected when you use our services:
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Account Information:</strong> Name, email address, phone number, and password when you create an account</li>
                <li><strong>Purchase Information:</strong> Billing address, shipping address, payment information, and order history</li>
                <li><strong>Communication Data:</strong> Information you provide when you contact us, including customer service inquiries and feedback</li>
                <li><strong>Profile Information:</strong> Preferences, wishlists, and other information you choose to provide</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2.2 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers</li>
                <li><strong>Usage Data:</strong> Pages visited, time spent on pages, links clicked, and navigation patterns</li>
                <li><strong>Location Data:</strong> General location information based on your IP address</li>
                <li><strong>Cookies and Tracking Technologies:</strong> Information collected through cookies, web beacons, and similar technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use the information we collect for various purposes, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>To process and fulfill your orders and transactions</li>
                <li>To manage your account and provide customer support</li>
                <li>To send you order confirmations, shipping updates, and account-related communications</li>
                <li>To personalize your shopping experience and recommend products</li>
                <li>To improve our website, products, and services</li>
                <li>To detect, prevent, and address technical issues and fraudulent activities</li>
                <li>To send you marketing communications (with your consent)</li>
                <li>To comply with legal obligations and enforce our terms of service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do not sell your personal information. We may share your information in the following circumstances:
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.1 Service Providers</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may share your information with third-party service providers who perform services on our behalf, such as:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Payment processors (Paystack, M-Pesa)</li>
                <li>Shipping and delivery companies</li>
                <li>Email service providers</li>
                <li>Analytics and marketing service providers</li>
                <li>Cloud hosting and data storage providers</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.2 Legal Requirements</h3>
              <p className="text-gray-700 leading-relaxed">
                We may disclose your information if required by law or in response to valid requests by public authorities (e.g., a court or government agency).
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4.3 Business Transfers</h3>
              <p className="text-gray-700 leading-relaxed">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Data Security</h2>
              <p className="text-gray-700 leading-relaxed">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Cookies and Tracking Technologies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use cookies and similar tracking technologies to track activity on our website and store certain information. Types of cookies we use:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Essential Cookies:</strong> Required for the website to function properly</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website</li>
                <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
                <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                You can control cookies through your browser settings. However, disabling cookies may affect the functionality of our website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Your Rights and Choices</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Under the Data Protection Act of Kenya, you have certain rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Access:</strong> Request access to your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Objection:</strong> Object to processing of your personal information</li>
                <li><strong>Data Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent for processing where consent is the legal basis</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                To exercise these rights, please contact us using the information provided in the Contact section below.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When we no longer need your information, we will securely delete or anonymize it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">9. Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">10. International Data Transfers</h2>
              <p className="text-gray-700 leading-relaxed">
                Your information may be transferred to and processed in countries other than Kenya. We ensure that appropriate safeguards are in place to protect your information in accordance with this Privacy Policy and applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">11. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">12. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 rounded-xl p-6 mt-4">
                <p className="text-gray-700"><strong>Email:</strong> privacy@leeztruestyles.com</p>
                <p className="text-gray-700"><strong>Phone:</strong> +254 700 000 000</p>
                <p className="text-gray-700"><strong>Address:</strong> Nairobi, Kenya</p>
                <p className="text-gray-700 mt-4"><strong>Data Protection Officer:</strong> dpo@leeztruestyles.com</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

