import React from 'react';
import { Link } from 'react-router-dom';

/**
 * UV_NotFound - 404 Not Found Error Page
 * 
 * Displays when users navigate to a non-existent route.
 * Provides navigation options to help users get back on track.
 */
const UV_NotFound: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-var(--nav-height)-var(--footer-height))] flex items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4">
      <div className="max-w-2xl w-full text-center space-y-8 py-16">
        {/* 404 Number */}
        <div className="space-y-4">
          <h1 className="text-9xl font-bold text-gray-200 select-none">404</h1>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        </div>

        {/* Error Message */}
        <div className="space-y-4">
          <h2 className="text-3xl font-serif font-semibold text-gray-900">
            Not Found
          </h2>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved. 
            Let's get you back on track.
          </p>
        </div>

        {/* Navigation Options */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-8 py-3 bg-black text-white hover:bg-gray-800 transition-colors rounded-sm font-medium min-w-[200px]"
          >
            Return Home
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center justify-center px-8 py-3 bg-white text-black border border-gray-300 hover:bg-gray-50 transition-colors rounded-sm font-medium min-w-[200px]"
          >
            Shop Collection
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="pt-12 border-t border-gray-200 mt-12">
          <p className="text-sm text-gray-500 mb-4">Popular Pages</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/fragrance-finder" className="text-gray-700 hover:text-black transition-colors">
              Fragrance Finder
            </Link>
            <span className="text-gray-300">|</span>
            <Link to="/about" className="text-gray-700 hover:text-black transition-colors">
              About Us
            </Link>
            <span className="text-gray-300">|</span>
            <Link to="/contact" className="text-gray-700 hover:text-black transition-colors">
              Contact
            </Link>
            <span className="text-gray-300">|</span>
            <Link to="/support" className="text-gray-700 hover:text-black transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UV_NotFound;
