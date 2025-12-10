'use client';

import { useState, useMemo } from 'react';

// Dummy payment transactions for preview
const dummyTransactions = [
  {
    id: '1',
    reference: 'MPESA-ABC123',
    order_id: 'ORD-001',
    amount: 5500,
    method: 'mpesa',
    status: 'success',
    date: new Date(),
  },
  {
    id: '2',
    reference: 'PAYSTACK-XYZ789',
    order_id: 'ORD-002',
    amount: 3200,
    method: 'card',
    status: 'pending',
    date: new Date(Date.now() - 86400000),
  },
  {
    id: '3',
    reference: 'CASH-001',
    order_id: 'ORD-003',
    amount: 6800,
    method: 'cash',
    status: 'success',
    date: new Date(Date.now() - 172800000),
  },
  {
    id: '4',
    reference: 'MPESA-DEF456',
    order_id: 'ORD-004',
    amount: 1750,
    method: 'mpesa',
    status: 'failed',
    date: new Date(Date.now() - 259200000),
  },
];

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');

  // Filter transactions based on search, status, and method
  const filteredTransactions = useMemo(() => {
    return dummyTransactions.filter((transaction) => {
      const matchesSearch = 
        transaction.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.order_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || transaction.status === selectedStatus;
      const matchesMethod = selectedMethod === 'all' || transaction.method === selectedMethod;
      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [searchQuery, selectedStatus, selectedMethod]);

  const transactions = filteredTransactions;
  const totalRevenue = transactions
    .filter(t => t.status === 'success')
    .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Payment Transactions</h1>
          <p className="text-gray-600">Track and reconcile all payment transactions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-2">Total Transactions</div>
          <div className="text-3xl font-bold text-gray-900">{dummyTransactions.length}</div>
          {filteredTransactions.length !== dummyTransactions.length && (
            <div className="text-xs text-gray-500 mt-1">Showing {filteredTransactions.length} filtered</div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-2">Successful</div>
          <div className="text-3xl font-bold text-green-600">
            {filteredTransactions.filter(t => t.status === 'success').length}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-2">Total Revenue</div>
          <div className="text-3xl font-bold text-primary">
            KES {(totalRevenue || 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-2">Failed</div>
          <div className="text-3xl font-bold text-red-600">
            {filteredTransactions.filter(t => t.status === 'failed').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by reference or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Methods</option>
            <option value="mpesa">M-Pesa</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
          </select>
        </div>
        {filteredTransactions.length !== dummyTransactions.length && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredTransactions.length} of {dummyTransactions.length} transactions
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Reference</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Order ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Method</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="font-medium">No transactions found</p>
                      <p className="text-sm mt-1">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono text-sm font-semibold text-gray-900">
                      {transaction.reference}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{transaction.order_id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">
                      KES {(transaction.amount || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 capitalize">{transaction.method}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        transaction.status === 'success'
                          ? 'bg-green-100 text-green-700'
                          : transaction.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {transaction.date.toLocaleDateString()}
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


