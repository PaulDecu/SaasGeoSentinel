'use client';

import { useRequireAuth } from '@/lib/hooks/useAuth';
import { Navbar } from './Navbar';
import { Spinner } from '@/components/ui';
import { UserRole } from '@/types';

interface AuthLayoutProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, requiredRoles }) => {
  const { user, isLoading } = useRequireAuth(requiredRoles);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
};
