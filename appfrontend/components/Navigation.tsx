'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Video, 
  Users, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut, 
  User,
  Shield,
  Home,
  Calendar,
  BookOpen
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'tutor' | 'student';
}

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState(0);

  useEffect(() => {
    // Get user from localStorage or token
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    // Mock notifications
    setNotifications(3);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/signIn');
  };

  const getTutorNavItems = () => [
    { href: '/tutor/dashboard', label: 'Dashboard', icon: Home },
    { href: '/tutor/meetings', label: 'Meetings', icon: Video },
    { href: '/tutor/quizzes', label: 'Quizzes', icon: FileText },
    { href: '/tutor/tests', label: 'Tests', icon: BookOpen },
    { href: '/tutor/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/tutor/students', label: 'Students', icon: Users },
  ];

  const getStudentNavItems = () => [
    { href: '/student/dashboard', label: 'Dashboard', icon: Home },
    { href: '/student/meetings', label: 'My Meetings', icon: Video },
    { href: '/student/quizzes', label: 'Quizzes', icon: BookOpen },
    { href: '/student/tests', label: 'Tests', icon: FileText },
    { href: '/student/schedule', label: 'Schedule', icon: Calendar },
  ];

  const navItems = user?.role === 'tutor' ? getTutorNavItems() : getStudentNavItems();

  if (!user) {
    return null;
  }

  return (
    <nav className="bg-white/60 backdrop-blur-3xl border-b border-orange-200/50 shadow-lg shadow-orange-100/50 px-6 py-4 font-['Inter']">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href={user.role === 'tutor' ? '/tutor/dashboard' : '/student/dashboard'}>
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-orange-600 drop-shadow-sm" />
              <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent drop-shadow-sm">TestIntegrity</span>
            </div>
          </Link>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-200/50 hover:scale-105'
                      : 'bg-white/40 backdrop-blur-xl border border-orange-200/30 text-gray-700 hover:bg-white/60 hover:scale-105 shadow-orange-100/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Role Badge */}
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            user.role === 'tutor' 
              ? 'bg-orange-100 text-orange-700 border border-orange-200' 
              : 'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            {user.role === 'tutor' ? 'Tutor' : 'Student'}
          </span>

          {/* Notifications */}
          {notifications > 0 && (
            <button className="relative px-4 py-2 bg-white/60 backdrop-blur-xl border border-orange-200/50 text-orange-600 rounded-xl font-medium hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-100/30">
              <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-lg shadow-red-200/50">
                {notifications}
              </span>
              Alerts
            </button>
          )}

          {/* User Menu */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-xl border border-orange-200/50 text-gray-700 rounded-xl font-medium hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-100/30">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-200/50">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="hidden md:block">{user.name}</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-56 bg-white/60 backdrop-blur-3xl border border-orange-200/50 rounded-2xl shadow-xl shadow-orange-100/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
              <div className="px-4 py-3 border-b border-orange-200/30">
                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-600">{user.email}</p>
              </div>
              <div className="p-2">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-white/60 rounded-xl transition-all duration-300">
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-white/60 rounded-xl transition-all duration-300">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300">
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden mt-4 border-t border-orange-200/30 pt-4">
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-200/50 hover:scale-105'
                    : 'bg-white/40 backdrop-blur-xl border border-orange-200/30 text-gray-700 hover:bg-white/60 hover:scale-105 shadow-orange-100/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}