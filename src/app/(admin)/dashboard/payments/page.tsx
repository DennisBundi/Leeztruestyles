'use client';

import { useState, useMemo, useEffect } from 'react';

interface Transaction {
  id: string;
  reference: string;
  order_id: string;
  order_number: string;
  amount: number;
  method: 'mpesa' | 'card' | 'cash';
  status: 'success' | 'pending' | 'failed';
  date: string;
  created_at: string;
}

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');

  // Fetch transactions from API
  useEffect(() => {
    async function fetchTransactions() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/payments/transactions');

        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }

        const data = await response.json();
        setTransactions(data.transactions || []);
      } catch (err: any) {
        console.error('Error fetching transactions:', err);
        setError(err.message || 'Failed to load transactions');
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, []);

  // Filter transactions based on search, status, and method
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch =
        transaction.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.order_number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || transaction.status === selectedStatus;
      const matchesMethod = selectedMethod === 'all' || transaction.method === selectedMethod;
      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [transactions, searchQuery, selectedStatus, selectedMethod]);

  const totalRevenue = filteredTransactions
    .filter(t => t.status === 'success')
    .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Payment Transactions</h1>
          <p className="text-white/60">Track and reconcile all payment transactions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-6">
          <div className="text-sm text-white/60 mb-2">Total Transactions</div>
          {loading ? (
            <div className="text-3xl font-bold text-white/40">...</div>
          ) : (
            <>
              <div className="text-3xl font-bold text-white">{transactions.length}</div>
              {filteredTransactions.length !== transactions.length && (
                <div className="text-xs text-white/50 mt-1">Showing {filteredTransactions.length} filtered</div>
              )}
            </>
          )}
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-white/60 mb-2">Successful</div>
          {loading ? (
            <div className="text-3xl font-bold text-white/40">...</div>
          ) : (
            <div className="text-3xl font-bold text-green-600">
              {filteredTransactions.filter(t => t.status === 'success').length}
            </div>
          )}
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-white/60 mb-2">Total Revenue</div>
          {loading ? (
            <div className="text-3xl font-bold text-white/40">...</div>
          ) : (
            <div className="text-3xl font-bold text-primary">
              KES {(totalRevenue || 0).toLocaleString()}
            </div>
          )}
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-white/60 mb-2">Failed</div>
          {loading ? (
            <div className="text-3xl font-bold text-white/40">...</div>
          ) : (
            <div className="text-3xl font-bold text-red-600">
              {filteredTransactions.filter(t => t.status === 'failed').length}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by reference or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 text-white rounded-xl focus:outline-none focus:border-rose-400/50 focus:ring-2 focus:ring-rose-400/20 focus:bg-white/15"
          />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-3 bg-white/10 border border-white/20 text-white rounded-xl focus:outline-none focus:border-rose-400/50 focus:ring-2 focus:ring-rose-400/20 focus:bg-white/15"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-4 py-3 bg-white/10 border border-white/20 text-white rounded-xl focus:outline-none focus:border-rose-400/50 focus:ring-2 focus:ring-rose-400/20 focus:bg-white/15"
          >
            <option value="all">All Methods</option>
            <option value="mpesa">M-Pesa</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
          </select>
        </div>
        {!loading && filteredTransactions.length !== transactions.length && (
          <div className="mt-4 text-sm text-white/60">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </div>
        )}
        {error && (
          <div className="mt-4 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="backdrop-blur-md bg-black/30 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/20 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/60">Reference</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/60">Order ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/60">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/60">Method</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/60">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white/60">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-white/60">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="font-medium">Loading transactions...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-red-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-medium">Error loading transactions</p>
                      <p className="text-sm mt-1">{error}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-white/50">
                      <svg className="w-12 h-12 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="font-medium">No transactions found</p>
                      <p className="text-sm mt-1">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => {
                  const transactionDate = new Date(transaction.date);
                  return (
                    <tr key={transaction.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm font-semibold text-white">
                          {transaction.reference}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{transaction.order_number}</div>
                        <div className="text-xs text-white/50">{transaction.order_id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-white">
                          KES {(transaction.amount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-white/60 capitalize">{transaction.method}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            transaction.status === 'success'
                              ? 'bg-green-500/20 text-green-300'
                              : transaction.status === 'failed'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-yellow-500/20 text-yellow-300'
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white/60">
                          {transactionDate.toLocaleDateString()}
                        </div>
                        <div className="text-xs text-white/50">
                          {transactionDate.toLocaleTimeString()}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


