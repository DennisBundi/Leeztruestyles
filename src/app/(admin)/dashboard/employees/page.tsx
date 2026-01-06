'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Employee {
  id: string;
  user_id?: string;
  employee_code: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'seller';
  created_at: string;
  last_commission_payment_date?: string | null;
  sales_count: number;
  total_sales: number;
  total_commission: number;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ email: '', role: 'seller' });
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; employee: Employee | null }>({ show: false, employee: null });
  const [deleting, setDeleting] = useState(false);
  const [markPaidModal, setMarkPaidModal] = useState<{ show: boolean; employee: Employee | null }>({ show: false, employee: null });
  const [markingPaid, setMarkingPaid] = useState(false);

  // Check role and redirect non-admins (only once)
  useEffect(() => {
    let mounted = true;
    const checkRole = async () => {
      try {
        const response = await fetch('/api/auth/role');
        const { role } = await response.json();
        if (mounted && role === 'seller') {
          router.replace('/dashboard/products');
        }
      } catch (error) {
        console.error('Error checking role:', error);
      }
    };
    checkRole();
    return () => { mounted = false; };
  }, [router]);

  // Fetch employees from API
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      } else {
        console.error('Failed to fetch employees');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add employee');
      }

      // Close form modal
      setShowAddModal(false);
      setFormData({ email: '', role: 'seller' });

      // Refresh employees
      await fetchEmployees();

      // Show success modal
      setSuccessModal(true);
      setTimeout(() => setSuccessModal(false), 2500);
    } catch (error) {
      console.error('Error adding employee:', error);
      alert(error instanceof Error ? error.message : 'Failed to add employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deleteModal.employee) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/employees?id=${deleteModal.employee.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete employee');
      }

      // Close delete modal
      setDeleteModal({ show: false, employee: null });

      // Refresh employees
      await fetchEmployees();

      // Show success message
      alert('Employee deleted successfully');
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete employee');
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!markPaidModal.employee) return;

    setMarkingPaid(true);
    try {
      const response = await fetch('/api/commissions/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: markPaidModal.employee.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark commissions as paid');
      }

      // Close modal
      setMarkPaidModal({ show: false, employee: null });

      // Refresh employees
      await fetchEmployees();

      // Show success message
      alert('Commissions marked as paid successfully');
    } catch (error) {
      console.error('Error marking commissions as paid:', error);
      alert(error instanceof Error ? error.message : 'Failed to mark commissions as paid');
    } finally {
      setMarkingPaid(false);
    }
  };

  // Filter employees based on search and role
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch =
        (employee.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (employee.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (employee.employee_code?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const matchesRole = selectedRole === 'all' || employee.role === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [searchQuery, selectedRole, employees]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Employees</h1>
          <p className="text-gray-600">Manage staff and track sales performance</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark hover:shadow-lg transition-all hover:scale-105"
        >
          + Add Employee
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600">Loading employees...</p>
          </div>
        </div>
      ) : (
        <>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="text-sm text-gray-600 mb-2">Total Employees</div>
              <div className="text-3xl font-bold text-gray-900">{employees.length}</div>
              {filteredEmployees.length !== employees.length && (
                <div className="text-xs text-gray-500 mt-1">Showing {filteredEmployees.length} filtered</div>
              )}
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="text-sm text-gray-600 mb-2">Total Sales</div>
              <div className="text-3xl font-bold text-primary">
                KES {(filteredEmployees.reduce((sum, e) => sum + (e.total_sales || 0), 0) || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="text-sm text-gray-600 mb-2">Total Commission</div>
              <div className="text-3xl font-bold text-green-600">
                KES {(filteredEmployees.reduce((sum, e) => sum + (e.total_commission || 0), 0) || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Search by name, email, or employee code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="seller">Seller</option>
              </select>
            </div>
            {filteredEmployees.length !== employees.length && (
              <div className="mt-4 text-sm text-gray-600">
                Showing {filteredEmployees.length} of {employees.length} employees
              </div>
            )}
          </div>

          {/* Employees Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Employee Code</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Role</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Sales</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Revenue</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Commission Earned
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Joined</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Last Payment</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <p className="font-medium">No employees found</p>
                          <p className="text-sm mt-1">Try adjusting your filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-mono text-sm font-semibold text-gray-900">
                            {employee.employee_code}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{employee.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{employee.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${employee.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : employee.role === 'manager'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                              }`}
                          >
                            {employee.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-semibold text-gray-900">{employee.sales_count}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-semibold text-primary">
                            KES {(employee.total_sales || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {employee.role === 'admin' ? (
                            <span className="font-semibold text-base text-gray-400">N/A</span>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-base text-green-600">
                                KES {(employee.total_commission || 0).toLocaleString()}
                              </span>
                              {employee.total_commission > 0 && employee.total_sales > 0 && (
                                <span className="text-xs text-gray-500 mt-0.5">
                                  {((employee.total_commission / employee.total_sales) * 100).toFixed(1)}% of sales
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">
                            {new Date(employee.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {employee.role === 'seller' ? (
                            employee.last_commission_payment_date ? (
                              <div className="text-sm text-gray-600">
                                {new Date(employee.last_commission_payment_date).toLocaleDateString()}
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {new Date(employee.last_commission_payment_date).toLocaleTimeString()}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400 italic">Never</div>
                            )
                          ) : (
                            <div className="text-sm text-gray-400">N/A</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            {employee.role === 'seller' && (
                              <button 
                                onClick={() => setMarkPaidModal({ show: true, employee })}
                                className="text-green-600 hover:text-green-700 font-medium text-sm transition-colors"
                              >
                                Mark Paid
                              </button>
                            )}
                            <button 
                              onClick={() => setDeleteModal({ show: true, employee })}
                              className="text-red-600 hover:text-red-700 font-medium text-sm transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Employee Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Add New Employee</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleAddEmployee} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      User Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@example.com"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The user must already have an account
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Role *
                    </label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="salesperson">Salesperson</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      disabled={submitting}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Adding...
                        </>
                      ) : (
                        'Add Employee'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Success Modal */}
          {successModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-scale-in">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Employee Added!
                </h3>
                <p className="text-gray-600">
                  The employee has been successfully added to your team.
                </p>
              </div>
            </div>
          )}

          {/* Mark Paid Confirmation Modal */}
          {markPaidModal.show && markPaidModal.employee && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Mark Commissions Paid</h3>
                  <button
                    onClick={() => setMarkPaidModal({ show: false, employee: null })}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={markingPaid}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-700 mb-2 text-center">
                    Mark commissions as paid for <strong>{markPaidModal.employee.name}</strong>?
                  </p>
                  <p className="text-sm text-gray-600 text-center">
                    This will update the last payment date and reset their dashboard to show only current week orders.
                  </p>
                  {markPaidModal.employee.last_commission_payment_date && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Last payment: {new Date(markPaidModal.employee.last_commission_payment_date).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMarkPaidModal({ show: false, employee: null })}
                    disabled={markingPaid}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkPaid}
                    disabled={markingPaid}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {markingPaid ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Marking...
                      </>
                    ) : (
                      'Mark Paid'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteModal.show && deleteModal.employee && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Delete Employee</h3>
                  <button
                    onClick={() => setDeleteModal({ show: false, employee: null })}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={deleting}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <p className="text-gray-700 mb-2">
                    Are you sure you want to delete <strong>{deleteModal.employee.name}</strong>?
                  </p>
                  <p className="text-sm text-gray-600">
                    This will permanently delete the employee record and their user account. This action cannot be undone.
                  </p>
                  {deleteModal.employee.sales_count > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        ⚠️ This employee has {deleteModal.employee.sales_count} sale(s). The employee will be deleted but sales records will remain.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteModal({ show: false, employee: null })}
                    disabled={deleting}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteEmployee}
                    disabled={deleting}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      'Delete Employee'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
