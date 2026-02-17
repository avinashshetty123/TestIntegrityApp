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

  if (!user || pathname === '/signIn' || pathname === '/') {
    return null;
  }

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-orange-200/50 shadow-sm px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href={user.role === 'tutor' ? '/tutor' : '/student'}>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-orange-600" />
              <span className="text-lg font-bold text-gray-800">TestIntegrity</span>
            </div>
          </Link>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center gap-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-orange-100 text-orange-700 border border-orange-200'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
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
        <div className="flex items-center gap-3">
          {/* Role Badge */}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            user.role === 'tutor' 
              ? 'bg-orange-100 text-orange-700' 
              : 'bg-blue-100 text-blue-700'
          }`}>
            {user.role === 'tutor' ? 'Tutor' : 'Student'}
          </span>

          {/* Notifications */}
          {notifications > 0 && (
            <button className="relative px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-all">
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {notifications}
              </span>
              Alerts
            </button>
          )}

          {/* User Menu */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-all">
              <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-white" />
              </div>
              <span className="hidden md:block">{user.name}</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-600">{user.email}</p>
              </div>
              <div className="p-2">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all">
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden mt-4 border-t border-gray-200 pt-4">
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-orange-100 text-orange-700 border border-orange-200'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
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