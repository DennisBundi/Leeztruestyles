'use client'

import { useState, useMemo } from 'react'

interface User {
  id: string
  full_name: string | null
  email: string
  created_at: string
}

interface UserTableProps {
  users: User[]
}

const AVATAR_COLORS = ['#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444']
const PAGE_SIZE = 20
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function getAvatarColor(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(fullName: string | null): string {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function UserTable({ users }: UserTableProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const now = Date.now()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return users
    return users.filter(
      u =>
        (u.full_name ?? '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    )
  }, [users, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageUsers = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        <h2 className="text-white font-semibold">All Users</h2>
        <input
          type="text"
          placeholder="Search name or email..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-[#EC4899] w-56"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 px-4 text-xs font-medium text-white/40 uppercase tracking-wider">
                User
              </th>
              <th className="text-left py-2 px-4 text-xs font-medium text-white/40 uppercase tracking-wider">
                Email
              </th>
              <th className="text-left py-2 px-4 text-xs font-medium text-white/40 uppercase tracking-wider">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {pageUsers.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-white/30 text-sm">
                  {search ? 'No users match your search' : 'No users yet'}
                </td>
              </tr>
            ) : (
              pageUsers.map(user => {
                const displayName = user.full_name || user.email
                const initials = getInitials(user.full_name)
                const color = getAvatarColor(displayName)
                const isNew = now - new Date(user.created_at).getTime() < WEEK_MS
                return (
                  <tr
                    key={user.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: color }}
                        >
                          {initials}
                        </div>
                        <span className="text-sm font-medium text-white/90">
                          {user.full_name || '—'}
                        </span>
                        {isNew && (
                          <span className="text-xs font-semibold bg-[#fce7f3] text-[#DB2777] rounded px-1.5 py-0.5">
                            New
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-white/60">{user.email}</td>
                    <td className="py-3 px-4 text-sm text-white/40">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-white/40">
            {filtered.length} user{filtered.length !== 1 ? 's' : ''}
            {search ? ' found' : ' total'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-3 py-1.5 text-xs text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/20 rounded-lg transition-colors"
            >
              Prev
            </button>
            <span className="text-xs text-white/40">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-3 py-1.5 text-xs text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/20 rounded-lg transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
