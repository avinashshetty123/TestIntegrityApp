'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Video, Users, FileText, BarChart3, Settings,
  LogOut, User, Shield, Home, Calendar, BookOpen
} from 'lucide-react';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: 'tutor' | 'student';
}

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const token = getCookie('accessToken');
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({ id: payload.sub, name: payload.name || payload.email, email: payload.email, role: payload.role });
    } catch {}
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:4000/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    deleteCookie('accessToken');
    setUser(null);
    router.push('/signIn');
  };

  const tutorNav = [
    { href: '/tutor', label: 'Dashboard', icon: Home },
    { href: '/tutor/meeting', label: 'Meetings', icon: Video },
    { href: '/tutor/tests', label: 'Tests', icon: BookOpen },
    { href: '/tutor/profile', label: 'Profile', icon: User },
  ];

  const studentNav = [
    { href: '/student', label: 'Dashboard', icon: Home },
    { href: '/student/meeting', label: 'Meetings', icon: Video },
    { href: '/student/tests', label: 'Tests', icon: FileText },
    { href: '/student/results', label: 'Results', icon: BarChart3 },
  ];

  const navItems = user?.role === 'tutor' ? tutorNav : studentNav;

  if (!user) return null;

  return (
    <nav className="glass sticky top-0 z-50 px-6 py-3" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href={user.role === 'tutor' ? '/tutor' : '/student'}>
            <div className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200/50 group-hover:scale-110 transition-transform">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold gradient-text">TestIntegrity</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500/15 to-orange-400/10 text-orange-700 border border-orange-300/40 shadow-sm'
                      : 'text-gray-600 hover:text-orange-700 hover:bg-orange-50/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
            user.role === 'tutor'
              ? 'bg-orange-100/80 text-orange-700 border-orange-200/60'
              : 'bg-blue-100/80 text-blue-700 border-blue-200/60'
          }`}>
            {user.role === 'tutor' ? 'Tutor' : 'Student'}
          </span>

          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 glass rounded-xl text-sm font-medium text-gray-700 hover:border-orange-300/60 transition-all">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="hidden md:block max-w-[120px] truncate">{user.name}</span>
            </button>

            <div className="absolute right-0 top-full mt-2 w-52 glass rounded-2xl shadow-xl shadow-orange-100/30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-orange-100/50">
                <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <div className="p-2">
                <Link href={`/${user.role}/profile`} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50/70 rounded-xl transition-all">
                  <User className="w-4 h-4 text-orange-500" /> Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50/70 rounded-xl transition-all"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden mt-3 pt-3 border-t border-orange-100/50 flex flex-wrap gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-orange-100/80 text-orange-700 border border-orange-200/60'
                  : 'glass text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
