import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { UserRole } from '@/types';

export const useAuth = (requiredRoles?: UserRole[]) => {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, loadUser } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      loadUser();
    }
  }, [isAuthenticated, isLoading, loadUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && requiredRoles && user) {
      if (!requiredRoles.includes(user.role)) {
        router.push('/unauthorized');
      }
    }
  }, [isLoading, isAuthenticated, requiredRoles, user, router]);

  return {
    user,
    isLoading,
    isAuthenticated,
  };
};

export const useRequireAuth = (requiredRoles?: UserRole[]) => {
  return useAuth(requiredRoles);
};
