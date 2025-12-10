import Link from 'next/link';
import POSInterface from '@/components/pos/POSInterface';

export default function POSPage() {
  // Preview mode - show POS with dummy employee
  const dummyEmployeeId = 'emp-preview-001';
  const dummyEmployeeCode = 'EMP-001';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
                <p className="text-xs text-gray-500 mt-0.5">In-store sales system</p>
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </Link>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Employee: <span className="font-semibold text-gray-900">{dummyEmployeeCode}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Preview Mode</div>
            </div>
          </div>
        </div>
      </div>
      <POSInterface employeeId={dummyEmployeeId} employeeCode={dummyEmployeeCode} />
    </div>
  );
}

