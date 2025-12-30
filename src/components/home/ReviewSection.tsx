'use client';

import { useState, useEffect } from 'react';

interface Review {
  id: number;
  name: string;
  rating: number;
  comment: string;
  location?: string;
  date?: string;
}

const reviews: Review[] = [
  {
    id: 1,
    name: 'Sarah M.',
    rating: 5,
    comment: 'Absolutely love my purchase! The quality is amazing and delivery was super fast. Will definitely shop again!',
    location: 'Nairobi',
    date: '2 weeks ago',
  },
  {
    id: 2,
    name: 'James K.',
    rating: 5,
    comment: 'Best fashion store in Kenya! Great prices and excellent customer service. Highly recommended!',
    location: 'Mombasa',
    date: '1 month ago',
  },
  {
    id: 3,
    name: 'Grace W.',
    rating: 5,
    comment: 'The clothes fit perfectly and the material is top quality. My go-to shop for all fashion needs!',
    location: 'Kisumu',
    date: '3 weeks ago',
  },
  {
    id: 4,
    name: 'Peter N.',
    rating: 5,
    comment: 'Fast shipping and exactly as described. Very satisfied with my order. Great experience overall!',
    location: 'Nakuru',
    date: '1 week ago',
  },
  {
    id: 5,
    name: 'Mary A.',
    rating: 5,
    comment: 'Amazing collection! Found everything I was looking for. The website is easy to navigate too.',
    location: 'Eldoret',
    date: '2 weeks ago',
  },
  {
    id: 6,
    name: 'David T.',
    rating: 5,
    comment: 'Outstanding quality and style. The customer service team was very helpful. 10/10!',
    location: 'Thika',
    date: '1 month ago',
  },
];

export default function ReviewSection() {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true); // Start visible so reviews show immediately
  const [isMobile, setIsMobile] = useState(false); // Safe default: assume desktop initially

  // Detect mobile/desktop and calculate max index
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Desktop shows 3 at a time (maxIndex = 3: positions 0-3 show reviews 0-2, 1-3, 2-4, 3-5)
  // Mobile shows 1 at a time (maxIndex = 5: positions 0-5 show each review individually)
  // Use safe default (desktop) until mounted to prevent hydration mismatch
  const maxIndex = mounted 
    ? (isMobile ? reviews.length - 1 : Math.max(0, reviews.length - 3))
    : Math.max(0, reviews.length - 3); // Default to desktop view until mounted

  // Auto-rotate reviews every 3 seconds with smooth horizontal slide animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= maxIndex) {
          return 0; // Loop back to start
        }
        return prev + 1;
      });
    }, 3000); // Auto-slide every 3 seconds

    return () => clearInterval(interval);
  }, [maxIndex]);

  // Intersection Observer for scroll animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById('review-section');
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  const goToSlide = (index: number) => {
    if (index >= 0 && index <= maxIndex) {
      setCurrentIndex(index);
    }
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => {
      if (prev >= maxIndex) {
        return 0; // Loop back to start
      }
      return prev + 1;
    });
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => {
      if (prev <= 0) {
        return maxIndex; // Loop to end
      }
      return prev - 1;
    });
  };

  // Display 3 reviews at a time on desktop, 1 on mobile
  const getVisibleReviews = () => {
    const visible = [];
    for (let i = 0; i < 3; i++) {
      const index = (currentIndex + i) % reviews.length;
      visible.push(reviews[index]);
    }
    return visible;
  };

  return (
    <section
      id="review-section"
      className="bg-gradient-to-br from-gray-50 via-white to-primary-light/5 py-16 md:py-24 relative overflow-hidden"
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-64 h-64 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-primary-dark rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div
          className={`text-center mb-12 transition-all duration-1000 ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-2 rounded-full mb-4 font-bold text-sm shadow-lg">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            CUSTOMER REVIEWS
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            What Our Customers Say
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Don't just take our word for it. Here's what our happy customers have to say about their shopping experience.
          </p>
        </div>

        {/* Reviews Carousel */}
        <div className="relative overflow-hidden">
          {/* Desktop: Show 3 reviews at a time with horizontal slide animation */}
          <div className="hidden md:block mb-8 relative overflow-hidden">
            <div 
              className="flex transition-transform duration-700 ease-in-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / 3)}%)`,
              }}
            >
              {/* Show all reviews in a row for smooth sliding */}
              {reviews.map((review, index) => (
                <div
                  key={review.id}
                  className="flex-shrink-0 w-1/3 px-3"
                >
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 h-full">
                    {/* Stars */}
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-5 h-5 ${
                            i < review.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>

                    {/* Comment */}
                    <p className="text-gray-700 mb-6 leading-relaxed">
                      "{review.comment}"
                    </p>

                    {/* Customer Info */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <p className="font-semibold text-gray-900">{review.name}</p>
                        {review.location && (
                          <p className="text-sm text-gray-500">{review.location}</p>
                        )}
                      </div>
                      {review.date && (
                        <p className="text-sm text-gray-400">{review.date}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: Show 1 review with horizontal slide animation */}
          <div className="md:hidden mb-8 overflow-hidden relative">
            <div 
              className="flex transition-transform duration-700 ease-in-out"
              style={{
                transform: `translateX(-${currentIndex * 100}%)`,
              }}
            >
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="flex-shrink-0 w-full"
                >
                  <div
                    className={`bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transition-opacity duration-500 ${
                      isVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-5 h-5 ${
                            i < review.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                      "{review.comment}"
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {review.name}
                        </p>
                        {review.location && (
                          <p className="text-sm text-gray-500">
                            {review.location}
                          </p>
                        )}
                      </div>
                      {review.date && (
                        <p className="text-sm text-gray-400">
                          {review.date}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={prevSlide}
              className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-all hover:scale-110 active:scale-95 border border-gray-200"
              aria-label="Previous review"
            >
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Dots Indicator */}
            <div className="flex items-center gap-2">
              {Array.from({ length: maxIndex + 1 }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentIndex
                      ? 'w-3 h-3 bg-primary'
                      : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to review set ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-all hover:scale-110 active:scale-95 border border-gray-200"
              aria-label="Next review"
            >
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}

