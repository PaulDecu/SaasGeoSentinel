import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { UserRole } from '@/types';

export const useAuth = (requiredRoles?: UserRole[]) => {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, hasAttemptedLoad, loadUser } = useAuthStore();

  useEffect(() => {
    // Appeler loadUser uniquement si pas encore tenté
    if (!isAuthenticated && !isLoading && !hasAttemptedLoad) {
      loadUser();
    }
  }, [isAuthenticated, isLoading, hasAttemptedLoad, loadUser]);

  useEffect(() => {
    // ✅ Rediriger seulement APRÈS que loadUser ait été tenté (hasAttemptedLoad)
    if (!isLoading && !isAuthenticated && hasAttemptedLoad) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, hasAttemptedLoad, router]);

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
