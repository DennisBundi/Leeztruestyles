'use client';

import { useState } from 'react';

export default function EmployeeForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'seller' as 'admin' | 'manager' | 'seller',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create employee');

      setIsOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-primary text-white rounded-none hover:bg-primary-dark"
      >
        + Add Employee
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Add Employee</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  User must have an account with this email
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as any })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="seller">Seller</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-none hover:bg-primary-dark disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-none hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

