import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';

// Types for API
interface NewsletterSubscriptionRequest {
  email: string;
  subscription_source: string;
  preferences: string;
}

interface NewsletterSubscriptionResponse {
  subscription_id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

const GV_Footer: React.FC = () => {
  // Local state for newsletter form
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Global state access - individual selectors to avoid infinite loops
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const showNotification = useAppStore(state => state.show_notification);

  // Newsletter subscription mutation
  const newsletterMutation = useMutation({
    mutationFn: async (data: NewsletterSubscriptionRequest): Promise<NewsletterSubscriptionResponse> => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/newsletter/subscribe`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    },
    onMutate: () => {
      setNewsletterStatus('submitting');
    },
    onSuccess: () => {
      setNewsletterStatus('success');
      setNewsletterEmail('');
      setNewsletterConsent(false);
      showNotification({
        type: 'success',
        message: 'Successfully subscribed to newsletter! Check your email for 10% off code.',
        auto_dismiss: true,
        duration: 5000,
      });
    },
    onError: (error: any) => {
      setNewsletterStatus('error');
      const errorMessage = error.response?.data?.message || 'Failed to subscribe to newsletter';
      showNotification({
        type: 'error',
        message: errorMessage,
        auto_dismiss: true,
        duration: 5000,
      });
    },
  });

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newsletterEmail || !newsletterConsent) {
      showNotification({
        type: 'warning',
        message: 'Please enter your email and accept marketing emails to subscribe.',
        auto_dismiss: true,
        duration: 4000,
      });
      return;
    }

    const preferences = JSON.stringify({
      email_marketing: newsletterConsent,
      new_arrivals: true,
      sales: true,
    });

    newsletterMutation.mutate({
      email: newsletterEmail,
      subscription_source: 'footer_signup',
      preferences,
    });
  };

  // Pre-fill email for authenticated users
  React.useEffect(() => {
    if (isAuthenticated && currentUser?.email && !newsletterEmail) {
      setNewsletterEmail(currentUser.email);
    }
  }, [isAuthenticated, currentUser, newsletterEmail]);

  return (
    <>
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">LuxeScent</h2>
                <p className="text-sm text-gray-300 italic">Discover Your Signature Scent</p>
              </div>
              
              <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                Since 1985, LuxeScent has been curating the world's finest fragrances, bringing you authentic luxury perfumes from renowned houses and emerging niche brands. Our heritage of excellence ensures every bottle tells a story of craftsmanship and elegance.
              </p>
              
              {/* Contact Information */}
              <div className="space-y-2 text-sm text-gray-300">
                <p>
                  <span className="font-medium">Address:</span><br />
                  123 Fragrance Boulevard<br />
                  New York, NY 10001
                </p>
                <p>
                  <span className="font-medium">Phone:</span> 
                  <a href="tel:+1-800-LUXE-SCENT" className="hover:text-white transition-colors ml-1">
                    1-800-LUXE-SCENT
                  </a>
                </p>
                <p>
                  <span className="font-medium">Email:</span> 
                  <a href="mailto:hello@luxescent.com" className="hover:text-white transition-colors ml-1">
                    hello@luxescent.com
                  </a>
                </p>
              </div>

              {/* Social Media */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-white mb-3">Follow Us</h3>
                <div className="flex space-x-4">
                  <a 
                    href="https://instagram.com/luxescent" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Follow us on Instagram"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.987 11.987s11.987-5.367 11.987-11.987C24.014 5.367 18.647.001 12.017.001zM8.449 16.988c-1.297 0-2.348-1.051-2.348-2.348s1.051-2.348 2.348-2.348 2.348 1.051 2.348 2.348-1.051 2.348-2.348 2.348zm7.718 0c-1.297 0-2.348-1.051-2.348-2.348s1.051-2.348 2.348-2.348 2.348 1.051 2.348 2.348-1.051 2.348-2.348 2.348z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://facebook.com/luxescent" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Follow us on Facebook"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://twitter.com/luxescent" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Follow us on Twitter"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://youtube.com/luxescent" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Follow us on YouTube"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Customer Service */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-white mb-6">Customer Service</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link to="/support" className="text-gray-300 hover:text-white transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link to="/support?topic=contact" className="text-gray-300 hover:text-white transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors">
                    Live Chat
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Online
                    </span>
                  </a>
                </li>
                <li>
                  <Link to="/track-order" className="text-gray-300 hover:text-white transition-colors">
                    Track Your Order
                  </Link>
                </li>
                <li>
                  <Link to="/support?topic=returns" className="text-gray-300 hover:text-white transition-colors">
                    Shipping & Returns
                  </Link>
                </li>
                <li>
                  <Link to="/support?topic=size-guide" className="text-gray-300 hover:text-white transition-colors">
                    Size Guide
                  </Link>
                </li>
              </ul>
            </div>

            {/* Shopping Categories */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-white mb-6">Shop</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link to="/products?gender_category=Women" className="text-gray-300 hover:text-white transition-colors">
                    Women's Fragrances
                  </Link>
                </li>
                <li>
                  <Link to="/products?gender_category=Men" className="text-gray-300 hover:text-white transition-colors">
                    Men's Fragrances
                  </Link>
                </li>
                <li>
                  <Link to="/products?gender_category=Unisex" className="text-gray-300 hover:text-white transition-colors">
                    Unisex Fragrances
                  </Link>
                </li>
                <li>
                  <Link to="/products?is_new_arrival=true" className="text-gray-300 hover:text-white transition-colors">
                    New Arrivals
                  </Link>
                </li>
                <li>
                  <Link to="/products?sale=true" className="text-gray-300 hover:text-white transition-colors">
                    Sale
                  </Link>
                </li>
                <li>
                  <Link to="/gifts" className="text-gray-300 hover:text-white transition-colors">
                    Gift Cards
                  </Link>
                </li>
                <li>
                  <Link to="/samples" className="text-gray-300 hover:text-white transition-colors">
                    Sample Program
                  </Link>
                </li>
              </ul>
            </div>

            {/* Account & Newsletter */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-white mb-6">Account & Services</h3>
              
              {/* Authentication-dependent links */}
              <ul className="space-y-3 text-sm mb-8">
                {isAuthenticated ? (
                  <>
                    <li>
                      <Link to="/account" className="text-gray-300 hover:text-white transition-colors">
                        My Account
                      </Link>
                    </li>
                    <li>
                      <Link to="/account/orders" className="text-gray-300 hover:text-white transition-colors">
                        Order History
                      </Link>
                    </li>
                    <li>
                      <Link to="/wishlist" className="text-gray-300 hover:text-white transition-colors">
                        My Wishlist
                      </Link>
                    </li>
                    <li>
                      <Link to="/fragrance-finder" className="text-gray-300 hover:text-white transition-colors">
                        Fragrance Finder
                      </Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link to="/login" className="text-gray-300 hover:text-white transition-colors">
                        Sign In
                      </Link>
                    </li>
                    <li>
                      <Link to="/login?action=register" className="text-gray-300 hover:text-white transition-colors">
                        Create Account
                      </Link>
                    </li>
                    <li>
                      <Link to="/fragrance-finder" className="text-gray-300 hover:text-white transition-colors">
                        Fragrance Finder
                      </Link>
                    </li>
                  </>
                )}
              </ul>

              {/* Newsletter Signup */}
              <div>
                <h4 className="text-md font-semibold text-white mb-3">Newsletter</h4>
                <p className="text-sm text-gray-300 mb-4">
                  Subscribe for exclusive offers and get <strong>10% off</strong> your first order!
                </p>
                
                <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                  <div>
                    <label htmlFor="newsletter-email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="newsletter-email"
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={newsletterStatus === 'submitting'}
                    />
                  </div>
                  
                  <div className="flex items-start">
                    <input
                      id="newsletter-consent"
                      type="checkbox"
                      checked={newsletterConsent}
                      onChange={(e) => setNewsletterConsent(e.target.checked)}
                      className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-800"
                      disabled={newsletterStatus === 'submitting'}
                    />
                    <label htmlFor="newsletter-consent" className="ml-2 text-xs text-gray-300">
                      I agree to receive marketing emails with exclusive offers and updates
                    </label>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={newsletterStatus === 'submitting' || !newsletterEmail || !newsletterConsent}
                    className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {newsletterStatus === 'submitting' ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Subscribing...
                      </span>
                    ) : (
                      'Subscribe'
                    )}
                  </button>
                </form>
                
                {newsletterStatus === 'success' && (
                  <p className="mt-2 text-sm text-green-400">
                    Thank you for subscribing! Check your email for your discount code.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Legal & Trust Section */}
          <div className="mt-12 pt-8 border-t border-gray-700">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Legal Links */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="/privacy-policy" className="text-gray-300 hover:text-white transition-colors">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="/terms-of-service" className="text-gray-300 hover:text-white transition-colors">
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a href="/gdpr-compliance" className="text-gray-300 hover:text-white transition-colors">
                      GDPR Compliance
                    </a>
                  </li>
                </ul>
              </div>

              {/* Security & Trust */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-4">Security & Trust</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 1L5 6v6l5 5 5-5V6l-5-5zM8.5 6L10 4.5 11.5 6v6L10 13.5 8.5 12V6z"/>
                    </svg>
                    <span className="text-sm text-gray-300">SSL Secured</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                    </svg>
                    <span className="text-sm text-gray-300">100% Authentic Guarantee</span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-4">We Accept</h4>
                <div className="flex flex-wrap gap-2">
                  <div className="bg-white px-2 py-1 rounded text-xs font-semibold text-gray-900">VISA</div>
                  <div className="bg-white px-2 py-1 rounded text-xs font-semibold text-gray-900">MasterCard</div>
                  <div className="bg-white px-2 py-1 rounded text-xs font-semibold text-gray-900">AMEX</div>
                  <div className="bg-blue-600 px-2 py-1 rounded text-xs font-semibold text-white">PayPal</div>
                  <div className="bg-black px-2 py-1 rounded text-xs font-semibold text-white">Apple Pay</div>
                  <div className="bg-gray-700 px-2 py-1 rounded text-xs font-semibold text-white">Google Pay</div>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-8 border-t border-gray-700 text-center">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} LuxeScent. All rights reserved. | Made with ❤️ for fragrance lovers worldwide.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default GV_Footer;