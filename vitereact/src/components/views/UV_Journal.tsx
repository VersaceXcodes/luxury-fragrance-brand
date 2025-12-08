import React from 'react';
import { Link } from 'react-router-dom';
import SmartImage from '@/components/ui/SmartImage';

const UV_Journal: React.FC = () => {
  // Sample journal articles
  const articles = [
    {
      id: '1',
      title: 'The Art of Layering Fragrances',
      excerpt: 'Discover how to create your unique scent signature by combining different fragrances.',
      date: '2024-01-15',
      category: 'Tips & Tricks',
      image: 'https://picsum.photos/400/300?random=1',
    },
    {
      id: '2',
      title: 'Understanding Fragrance Notes',
      excerpt: 'Learn about top, middle, and base notes and how they evolve on your skin.',
      date: '2024-01-10',
      category: 'Education',
      image: 'https://picsum.photos/400/300?random=2',
    },
    {
      id: '3',
      title: 'Seasonal Scents: Spring Collection',
      excerpt: 'Fresh, floral fragrances perfect for the warming weather ahead.',
      date: '2024-01-05',
      category: 'Collections',
      image: 'https://picsum.photos/400/300?random=3',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Nocturne Journal</h1>
            <p className="text-xl md:text-2xl text-purple-100 max-w-3xl mx-auto">
              Insights, stories, and inspiration from the world of fragrance
            </p>
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => (
            <article key={article.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
              <SmartImage
                src={article.image}
                alt={article.title}
                productName={article.title}
                category={article.category}
                aspectRatio="3:4"
                objectFit="cover"
                className="h-48"
              />
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                    {article.category}
                  </span>
                  <time className="text-xs text-gray-500">
                    {new Date(article.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </time>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  {article.title}
                </h2>
                <p className="text-gray-600 mb-4">
                  {article.excerpt}
                </p>
                <Link
                  to={`/journal/${article.id}`}
                  className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium"
                >
                  Read More
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* Coming Soon Message */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
            <svg className="w-16 h-16 text-purple-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">More Stories Coming Soon</h2>
            <p className="text-gray-600">
              We're constantly adding new articles about fragrances, trends, and tips. 
              Subscribe to our newsletter to stay updated!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UV_Journal;
