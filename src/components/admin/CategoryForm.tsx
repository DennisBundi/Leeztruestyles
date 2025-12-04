'use client';

import { useState, useEffect } from 'react';
import type { Category } from '@/types';

interface CategoryFormProps {
  category?: Category | null;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function CategoryForm({ category, onSuccess, onClose }: CategoryFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || '',
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
      });
    }
  }, [category]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!category && formData.name) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.name, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const hasDatabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'placeholder';

      if (!hasDatabase) {
        // Preview mode - simulate success
        alert(category ? 'Category updated successfully! (Preview Mode)' : 'Category created successfully! (Preview Mode)');
        if (onSuccess) onSuccess();
        setIsOpen(false);
        if (onClose) onClose();
        return;
      }

      const response = await fetch('/api/categories', {
        method: category ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: category?.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to save category');

      if (onSuccess) onSuccess();
      setIsOpen(false);
      if (onClose) onClose();
      window.location.reload();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setIsOpen(true);
    if (!category) {
      setFormData({
        name: '',
        slug: '',
        description: '',
      });
    }
  };

  return (
    <>
      <button
        onClick={openModal}
        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-none font-medium transition-colors"
      >
        {category ? '✏️ Edit' : '+ Add Category'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {category ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onClose) onClose();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Dresses, Accessories"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Slug *
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., dresses, accessories"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL-friendly identifier (auto-generated from name)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Brief description of this category"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-none font-semibold hover:bg-primary-dark hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (onClose) onClose();
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-none font-semibold hover:bg-gray-300 transition-all"
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



