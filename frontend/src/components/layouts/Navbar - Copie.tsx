'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { Button } from '@/components/ui';
import { UserRole } from '@/types';

export const Navbar = () => {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center">
            <span className="text-2xl font-bold text-primary-600">GeoSentinel</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1">
            {/* Dashboard */}
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                🏠 Dashboard
              </Button>
            </Link>

            {/* Superadmin Only */}
            {user.role === UserRole.SUPERADMIN && (
              <Link href="/admin/platform">
                <Button variant="ghost" size="sm">
                  ⚙️ Plateforme
                </Button>
              </Link>
            )}

            {/* Admin & Superadmin */}
            {(user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN) && (
              <Link href="/admin/teams">
                <Button variant="ghost" size="sm">
                  👥 Équipes
                </Button>
              </Link>
            )}

            {/* All authenticated users */}
            <Link href="/admin/risks">
              <Button variant="ghost" size="sm">
                ⚠️ Risques
              </Button>
            </Link>

            {/* Profile */}
            <Link href="/me">
              <Button variant="ghost" size="sm">
                👤 Profil
              </Button>
            </Link>

            {/* Logout */}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              🚪 Déconnexion
            </Button>
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
