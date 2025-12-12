'use client';

import { useState } from 'react';
import type { Category } from '@/types';
import CategoryForm from './CategoryForm';

interface CategoriesPanelProps {
  categories: Category[];
  loading: boolean;
  onRefresh: () => void;
  onClose?: () => void;
}

export default function CategoriesPanel({ categories, loading, onRefresh, onClose }: CategoriesPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; category: Category | null }>({ 
    isOpen: false, 
    category: null 
  });
  const [deleting, setDeleting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setShowCreateForm(false);
    setShowEditForm(true);
  };

  const handleDelete = (category: Category) => {
    setDeleteModal({ isOpen: true, category });
  };

  const confirmDelete = async () => {
    if (!deleteModal.category) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/categories?id=${deleteModal.category.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete category');
      }

      // Close delete modal
      setDeleteModal({ isOpen: false, category: null });

      // Refresh categories list
      onRefresh();
    } catch (error) {
      console.error('Error deleting category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete category';
      alert(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const handleCategorySuccess = () => {
    setSelectedCategory(null);
    setShowCreateForm(false);
    setShowEditForm(false);
    onRefresh();
  };

  const handleCreateNew = () => {
    setSelectedCategory(null);
    setShowEditForm(false);
    setShowCreateForm(true);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
            <p className="text-sm text-gray-600 mt-1">Manage product categories</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
            >
              + Add Category
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Categories List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-600">Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <p className="text-gray-500 font-medium">No categories found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first category to get started</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {categories.map((category) => (
              <div
                key={category.id}
                className="border border-gray-200 rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">{category.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">Slug: {category.slug}</p>
                    {category.description && (
                      <p className="text-sm text-gray-600 mt-2">{category.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(category)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Form Modal (for create) */}
      <CategoryForm
        category={null}
        onSuccess={handleCategorySuccess}
        onClose={() => setShowCreateForm(false)}
        isOpen={showCreateForm}
        showButton={false}
        onOpenChange={setShowCreateForm}
      />

      {/* Category Form Modal (for edit) */}
      <CategoryForm
        category={selectedCategory}
        onSuccess={handleCategorySuccess}
        onClose={() => {
          setSelectedCategory(null);
          setShowEditForm(false);
        }}
        isOpen={showEditForm && selectedCategory !== null}
        showButton={false}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCategory(null);
            setShowEditForm(false);
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.category && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Category</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the category <strong>"{deleteModal.category.name}"</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => setDeleteModal({ isOpen: false, category: null })}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

