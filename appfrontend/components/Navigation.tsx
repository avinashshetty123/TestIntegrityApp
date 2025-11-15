'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
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
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href={user.role === 'tutor' ? '/tutor/dashboard' : '/student/dashboard'}>
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">TestIntegrity</span>
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
          <Badge variant={user.role === 'tutor' ? 'default' : 'secondary'}>
            {user.role === 'tutor' ? 'Tutor' : 'Student'}
          </Badge>

          {/* Notifications */}
          {notifications > 0 && (
            <Button variant="outline" size="sm" className="relative">
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notifications}
              </span>
              Alerts
            </Button>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <span className="hidden md:block">{user.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden mt-4 border-t pt-4">
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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