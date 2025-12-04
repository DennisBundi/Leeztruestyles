export default function FAQPage() {
  const faqs = [
    {
      question: "How do I place an order?",
      answer: "Simply browse our products, add items to your cart, and proceed to checkout. You can pay using M-Pesa or card payment. We'll send you a confirmation email once your order is placed."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept M-Pesa (STK Push) and card payments through Paystack. Both methods are secure and widely used in Kenya."
    },
    {
      question: "How long does shipping take?",
      answer: "Standard delivery takes 3-5 business days, while express delivery takes 1-2 business days. Delivery times may vary based on your location."
    },
    {
      question: "Do you ship outside Kenya?",
      answer: "Currently, we only ship within Kenya. We're working on expanding our delivery options to other countries in the future."
    },
    {
      question: "Can I track my order?",
      answer: "Yes! Once your order ships, you'll receive a tracking number via email. You can use this to track your package's progress."
    },
    {
      question: "What is your return policy?",
      answer: "You can return items within 14 days of delivery if they're unworn, unwashed, and in original condition with tags. See our Returns page for full details."
    },
    {
      question: "How do I know what size to order?",
      answer: "Each product page includes a size guide. If you're unsure, feel free to contact us and we'll help you find the perfect fit."
    },
    {
      question: "Do you have a physical store?",
      answer: "Yes! Visit us at Westlands Shopping Centre in Nairobi. Our store hours are Monday-Friday 9 AM-6 PM and Saturday 10 AM-4 PM."
    },
    {
      question: "Can I cancel my order?",
      answer: "You can cancel your order within 24 hours of placing it, as long as it hasn't been shipped yet. Contact us immediately to cancel."
    },
    {
      question: "Do you offer gift wrapping?",
      answer: "Yes! We offer gift wrapping services for an additional fee. Select this option during checkout or contact us after placing your order."
    }
  ];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Frequently Asked Questions</h1>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2 text-primary">
                {faq.question}
              </h3>
              <p className="text-gray-700">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-2 text-primary">Still have questions?</h2>
          <p className="text-gray-700 mb-4">
            Don't hesitate to reach out to us. We're here to help!
          </p>
          <a
            href="/contact"
            className="inline-block px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
}

