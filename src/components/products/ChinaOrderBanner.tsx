'use client'

import { useState } from 'react'
import ChinaOrderModal from './ChinaOrderModal'

export default function ChinaOrderBanner() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="bg-gradient-to-r from-[#DB2777] to-[#EC4899] rounded-xl p-4 flex items-center gap-4 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-white/10 translate-x-8 -translate-y-8 pointer-events-none" />
        <div className="absolute bottom-0 right-20 w-20 h-20 rounded-full bg-white/[0.06] translate-y-8 pointer-events-none" />
        <span className="text-4xl flex-shrink-0">🇨🇳</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm sm:text-base">
            Don&apos;t see exactly what you want?
          </p>
          <p className="text-white/85 text-xs sm:text-sm">
            Place a custom order — describe any product and we&apos;ll source it from China for you
          </p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex-shrink-0 bg-white text-[#DB2777] font-bold text-xs sm:text-sm px-4 py-2.5 rounded-lg shadow hover:shadow-md transition-shadow whitespace-nowrap"
        >
          ✍️ Place Custom Order
        </button>
      </div>
      {isOpen && <ChinaOrderModal onClose={() => setIsOpen(false)} />}
    </>
  )
}
