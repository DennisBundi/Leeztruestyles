'use client';

import { useState, useEffect } from 'react';

interface FlashSaleCountdownProps {
  endDate: Date;
}

export default function FlashSaleCountdown({ endDate }: FlashSaleCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const difference = end - now;

      if (difference > 0) {
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ hours, minutes, seconds });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      <span className="text-sm font-semibold text-gray-700">Sale ends in:</span>
      <div className="flex items-center gap-2">
        <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md">
          <div className="text-2xl font-bold text-red-600">{formatTime(timeLeft.hours)}</div>
          <div className="text-xs text-gray-600 text-center">Hrs</div>
        </div>
        <span className="text-xl font-bold text-gray-700">:</span>
        <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md">
          <div className="text-2xl font-bold text-red-600">{formatTime(timeLeft.minutes)}</div>
          <div className="text-xs text-gray-600 text-center">Min</div>
        </div>
        <span className="text-xl font-bold text-gray-700">:</span>
        <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md">
          <div className="text-2xl font-bold text-red-600">{formatTime(timeLeft.seconds)}</div>
          <div className="text-xs text-gray-600 text-center">Sec</div>
        </div>
      </div>
    </div>
  );
}



