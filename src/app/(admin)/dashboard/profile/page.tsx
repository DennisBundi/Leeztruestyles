'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Employee } from '@/types';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

        if (userError || !authUser) {
          setMessage({ type: 'error', text: 'Failed to load user information' });
          setLoading(false);
          return;
        }

        setUser(authUser);

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }

        if (profileData) {
          setProfile(profileData);
        } else {
          // Initialize with user metadata
          setProfile({
            full_name: authUser.user_metadata?.full_name || '',
            phone: authUser.user_metadata?.phone || '',
          });
        }

        // Fetch employee info if exists
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        if (!employeeError && employeeData) {
          setEmployee(employeeData as Employee);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setMessage({ type: 'error', text: 'Failed to load profile' });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const supabase = createClient();

      // Update user profile
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: profile.full_name || null,
          phone: profile.phone || null,
        });

      if (profileError) {
        throw profileError;
      }

      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Profile</h1>
          <p className="text-white/60">Manage your account information</p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="glass-card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white/50 cursor-not-allowed placeholder:text-white/30"
            />
            <p className="mt-1 text-xs text-white/40">Email cannot be changed</p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={profile?.full_name || ''}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white rounded-xl focus:outline-none focus:border-rose-400/50 focus:ring-2 focus:ring-rose-400/20 focus:bg-white/15 placeholder:text-white/30"
              placeholder="Enter your full name"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={profile?.phone || ''}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 text-white rounded-xl focus:outline-none focus:border-rose-400/50 focus:ring-2 focus:ring-rose-400/20 focus:bg-white/15 placeholder:text-white/30"
              placeholder="Enter your phone number"
            />
          </div>

          {/* Employee Code (Read-only if exists) */}
          {employee && (
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">
                Employee Code
              </label>
              <input
                type="text"
                value={employee.employee_code}
                disabled
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white/50 cursor-not-allowed placeholder:text-white/30"
              />
              <p className="mt-1 text-xs text-white/40">Employee code cannot be changed</p>
            </div>
          )}

          {/* Role (Read-only if employee) */}
          {employee && (
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">
                Role
              </label>
              <input
                type="text"
                value={employee.role === 'admin' ? 'Administrator' :
                       employee.role === 'manager' ? 'Manager' :
                       employee.role === 'seller' ? 'Sales Person' :
                       employee.role}
                disabled
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white/50 cursor-not-allowed capitalize placeholder:text-white/30"
              />
            </div>
          )}

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-xl ${
              message.type === 'success'
                ? 'bg-green-500/20 text-green-300 border border-white/10'
                : 'bg-red-500/20 text-red-300 border border-white/10'
            }`}>
              {message.text}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
