import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const UV_FAQ: React.FC = () => {
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const faqs = [
    {
      id: '1',
      category: 'Orders & Shipping',
      questions: [
        {
          id: '1-1',
          question: 'How long does shipping take?',
          answer: 'Standard shipping typically takes 5-7 business days. Express shipping is available for 2-3 business day delivery. EU orders over €120 qualify for free standard shipping.',
        },
        {
          id: '1-2',
          question: 'Do you ship internationally?',
          answer: 'Yes! We ship to most countries worldwide. Shipping costs and delivery times vary by destination. International orders may be subject to customs duties and taxes.',
        },
        {
          id: '1-3',
          question: 'How can I track my order?',
          answer: 'Once your order ships, you\'ll receive a tracking number via email. You can also track your order by visiting our Track Order page or checking your account dashboard.',
        },
      ],
    },
    {
      id: '2',
      category: 'Returns & Refunds',
      questions: [
        {
          id: '2-1',
          question: 'What is your return policy?',
          answer: 'We offer 30-day returns on unopened items in original packaging. The product must be unused, and you\'ll need your original receipt or proof of purchase.',
        },
        {
          id: '2-2',
          question: 'How do I return an item?',
          answer: 'To initiate a return, please contact our customer service team or log into your account and submit a return request. We\'ll provide you with return shipping instructions.',
        },
        {
          id: '2-3',
          question: 'When will I receive my refund?',
          answer: 'Refunds are processed within 5-7 business days after we receive your return. The credit will appear on your original payment method within 3-5 business days.',
        },
      ],
    },
    {
      id: '3',
      category: 'Products',
      questions: [
        {
          id: '3-1',
          question: 'Are your fragrances authentic?',
          answer: 'Yes, absolutely! All our fragrances are 100% authentic and sourced directly from authorized distributors and brand partners. We guarantee authenticity on every purchase.',
        },
        {
          id: '3-2',
          question: 'How should I store my fragrances?',
          answer: 'Store fragrances in a cool, dry place away from direct sunlight and heat. Keep bottles tightly closed when not in use. Avoid storing in bathrooms where humidity can affect the scent.',
        },
        {
          id: '3-3',
          question: 'Can I try samples before buying?',
          answer: 'Yes! We offer a Sample Program where you can order 2ml samples of most fragrances. This is a great way to test a scent before committing to a full-size bottle.',
        },
      ],
    },
    {
      id: '4',
      category: 'Account',
      questions: [
        {
          id: '4-1',
          question: 'How do I create an account?',
          answer: 'Click "Sign In" in the navigation menu, then select "Create Account." Fill in your details and you\'ll have instant access to order tracking, wishlists, and exclusive offers.',
        },
        {
          id: '4-2',
          question: 'How do I reset my password?',
          answer: 'Click "Forgot Password" on the login page. Enter your email address, and we\'ll send you instructions to reset your password.',
        },
        {
          id: '4-3',
          question: 'Can I modify my order after placing it?',
          answer: 'Orders can be modified within 1 hour of placement. After that, our warehouse team begins processing. Contact customer service immediately if you need to make changes.',
        },
      ],
    },
  ];

  const toggleQuestion = (questionId: string) => {
    setOpenQuestion(openQuestion === questionId ? null : questionId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Frequently Asked Questions</h1>
            <p className="text-xl md:text-2xl text-purple-100 max-w-3xl mx-auto">
              Find answers to common questions about our products and services
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {faqs.map((category) => (
          <div key={category.id} className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{category.category}</h2>
            <div className="space-y-4">
              {category.questions.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <button
                    onClick={() => toggleQuestion(item.id)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900 pr-8">{item.question}</span>
                    <svg
                      className={`w-5 h-5 text-purple-600 flex-shrink-0 transition-transform ${
                        openQuestion === item.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openQuestion === item.id && (
                    <div className="px-6 pb-4 text-gray-600">
                      <p>{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Contact CTA */}
        <div className="mt-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="text-purple-100 mb-6">
            Our customer service team is here to help you with any inquiries.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/support"
              className="px-8 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Contact Support
            </Link>
            <a
              href="tel:+1-800-LUXE-SCENT"
              className="px-8 py-3 bg-purple-700 text-white rounded-lg font-semibold hover:bg-purple-800 transition-colors border-2 border-white"
            >
              Call Us: 1-800-LUXE-SCENT
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UV_FAQ;
