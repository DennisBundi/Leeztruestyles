'use client';

import { useState, useMemo } from 'react';

// Dummy employees for preview
const dummyEmployees = [
  {
    id: '1',
    employee_code: 'EMP-001',
    name: 'Sarah Johnson',
    email: 'sarah@leeztruestyles.com',
    role: 'admin',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    sales_count: 45,
    total_sales: 125000,
  },
  {
    id: '2',
    employee_code: 'EMP-002',
    name: 'Michael Chen',
    email: 'michael@leeztruestyles.com',
    role: 'manager',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    sales_count: 32,
    total_sales: 89000,
  },
  {
    id: '3',
    employee_code: 'EMP-003',
    name: 'Emily Davis',
    email: 'emily@leeztruestyles.com',
    role: 'salesperson',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    sales_count: 28,
    total_sales: 67000,
  },
  {
    id: '4',
    employee_code: 'EMP-004',
    name: 'James Wilson',
    email: 'james@leeztruestyles.com',
    role: 'salesperson',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    sales_count: 15,
    total_sales: 42000,
  },
];

export default function EmployeesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  // Filter employees based on search and role
  const filteredEmployees = useMemo(() => {
    return dummyEmployees.filter((employee) => {
      const matchesSearch = 
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.employee_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = selectedRole === 'all' || employee.role === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [searchQuery, selectedRole]);

  const employees = filteredEmployees;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Employees</h1>
          <p className="text-gray-600">Manage staff and track sales performance</p>
        </div>
        <button className="px-6 py-3 bg-primary text-white rounded-none font-semibold hover:bg-primary-dark hover:shadow-lg transition-all hover:scale-105">
          + Add Employee
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-2">Total Employees</div>
          <div className="text-3xl font-bold text-gray-900">{dummyEmployees.length}</div>
          {filteredEmployees.length !== dummyEmployees.length && (
            <div className="text-xs text-gray-500 mt-1">Showing {filteredEmployees.length} filtered</div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-2">Total Sales</div>
          <div className="text-3xl font-bold text-primary">
            KES {filteredEmployees.reduce((sum, e) => sum + e.total_sales, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-2">Active Salespeople</div>
          <div className="text-3xl font-bold text-green-600">
            {filteredEmployees.filter(e => e.role === 'salesperson').length}
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
            <option value="salesperson">Salesperson</option>
          </select>
        </div>
        {filteredEmployees.length !== dummyEmployees.length && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredEmployees.length} of {dummyEmployees.length} employees
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Joined</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
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
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        employee.role === 'admin'
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
                      KES {employee.total_sales.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {employee.created_at.toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button className="text-primary hover:text-primary-dark font-medium text-sm">
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-700 font-medium text-sm">
                        View Sales
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
    </div>
  );
}

