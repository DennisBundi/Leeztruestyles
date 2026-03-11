
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ProfilePage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<any>(null)
    const [message, setMessage] = useState<string | null>(null)

    useEffect(() => {
        const supabase = createClient()

        const getUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (error || !user) {
                router.push('/signin')
                return
            }
            setUser(user)

            // Fetch profile data
            const { data: profileData } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single()

            if (profileData) {
                setProfile(profileData)
            } else {
                // Fallback to metadata if profile doesn't exist
                setProfile({ full_name: user.user_metadata?.full_name || '' })
            }
            setLoading(false)
        }

        getUser()
    }, [router])

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setMessage(null)
        const supabase = createClient()

        // Update profile in users table
        const { error } = await supabase
            .from('users')
            .upsert({
                id: user.id,
                email: user.email,
                full_name: profile.full_name
            })

        if (error) {
            setMessage("Error updating profile")
        } else {
            setMessage("Profile updated successfully")
            router.refresh()
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white shadow rounded-2xl p-6 sm:p-8">
                    <div className="mb-8 border-b border-gray-100 pb-4">
                        <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
                        <p className="text-gray-500 mt-1">Manage your account settings</p>
                    </div>

                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                disabled
                                value={user?.email || ''}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                            />
                            <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                required
                                value={profile?.full_name || ''}
                                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {message}
                            </div>
                        )}

                        <div className="pt-4">
                            <button
                                type="submit"
                                className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>

                {/* My Orders Section */}
                <div className="mt-8 bg-white rounded-2xl p-6 shadow border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">My Orders</h2>
                            <p className="text-gray-600 text-sm mt-1">
                                Track your order history and status
                            </p>
                        </div>
                        <Link
                            href="/profile/orders"
                            className="px-5 py-2.5 bg-primary text-white font-semibold rounded-none hover:bg-primary-dark transition-all hover:scale-105"
                        >
                            View Orders
                        </Link>
                    </div>
                </div>

                {/* Leez Rewards Section */}
                <div className="mt-8 bg-gradient-to-r from-primary-light to-pink-50 rounded-2xl p-6 border border-primary/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Leez Rewards</h2>
                            <p className="text-gray-600 text-sm mt-1">
                                Earn points, unlock tiers, and get exclusive perks
                            </p>
                        </div>
                        <Link
                            href="/profile/rewards"
                            className="px-5 py-2.5 bg-primary text-white font-semibold rounded-none hover:bg-primary-dark transition-all hover:scale-105"
                        >
                            View Rewards
                        </Link>
                    </div>
                </div>

                {/* My Reviews Section */}
                <div className="mt-8 bg-gradient-to-r from-primary-light to-pink-50 rounded-2xl p-6 border border-primary/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">My Reviews</h2>
                            <p className="text-gray-600 text-sm mt-1">
                                See your submitted reviews and their status
                            </p>
                        </div>
                        <Link
                            href="/profile/reviews"
                            className="px-5 py-2.5 bg-primary text-white font-semibold rounded-none hover:bg-primary-dark transition-all hover:scale-105"
                        >
                            View Reviews
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
