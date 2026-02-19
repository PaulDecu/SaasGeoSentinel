'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Button, Input, Card, Spinner } from '@/components/ui';
import { createUserSchema } from '@/lib/validations/schemas';
import { useRequireAuth } from '@/lib/hooks/useAuth';
import { UserRole, type User } from '@/types';
import { usersApi } from '@/lib/api/resources';
import { getErrorMessage } from '@/lib/api/client';
import { AuthLayout } from '@/components/layouts/AuthLayout';

export default function AdminTeamsPage() {
  const { user: currentUser, isLoading: authLoading } = useRequireAuth([UserRole.ADMIN, UserRole.SUPERADMIN]);
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const userForm = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      role: UserRole.UTILISATEUR,
    },
  });

  // Utilisation de useCallback pour stabiliser la fonction
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Déclenchement uniquement quand l'auth est confirmée
  useEffect(() => {
    if (!authLoading && currentUser) {
      loadUsers();
    }
  }, [authLoading, currentUser, loadUsers]);

  const onCreateUser = async (data: any) => {
    try {
      // On crée une copie des données en ajoutant le tenantId du créateur
    const userDataWithTenant = {
      ...data,
      tenantId: currentUser?.tenantId // Récupère l'ID de l'entreprise de l'utilisateur connecté
    };
    
      await usersApi.create(data);
      toast.success('Utilisateur créé avec succès !');
      setShowUserForm(false);
      userForm.reset();
      loadUsers();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    try {
      await usersApi.delete(id);
      toast.success('Utilisateur supprimé');
      loadUsers();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const bulkDelete = async () => {
    if (selectedUsers.size === 0) return;
    if (!confirm(`Supprimer ${selectedUsers.size} utilisateur(s) ?`)) return;

    try {
      const result = await usersApi.bulkDelete(Array.from(selectedUsers));
      toast.success(`${result.success.length} utilisateur(s) supprimé(s)`);
      setSelectedUsers(new Set());
      loadUsers();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const toggleUser = (id: string) => {
    const newSet = new Set(selectedUsers);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedUsers(newSet);
  };

  const filteredUsers = users.filter(user => {
    const matchSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || user.role === roleFilter;
    return matchSearch && matchRole;
  });

  const toggleAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  // 1. État de chargement initial (Authentification)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // 2. Sécurité : Si pas d'utilisateur, on ne rend rien
  if (!currentUser) return null;

  return (
    <AuthLayout requiredRoles={[UserRole.ADMIN, UserRole.SUPERADMIN]}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestion de l'équipe</h1>
          <div className="flex gap-2">
            <Button onClick={() => setShowUserForm(!showUserForm)} variant={showUserForm ? 'outline' : 'primary'}>
              {showUserForm ? 'Annuler' : '+ Nouvel utilisateur'}
            </Button>
            {selectedUsers.size > 0 && (
              <Button variant="danger" onClick={bulkDelete}>
                Supprimer ({selectedUsers.size})
              </Button>
            )}
          </div>
        </div>

        {/* Formulaire de création */}
        {showUserForm && (
          <Card className="p-6 mb-8 border-primary-100 bg-primary-50/30">
            <h3 className="text-lg font-semibold mb-4">Ajouter un membre</h3>
            <form onSubmit={userForm.handleSubmit(onCreateUser)} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <Input
                label="Email"
                type="email"
                {...userForm.register('email')}
                error={userForm.formState.errors.email?.message}
                placeholder="email@exemple.com"
              />
              <Input
                label="Mot de passe"
                type="password"
                {...userForm.register('password')}
                error={userForm.formState.errors.password?.message}
                placeholder="••••••••"
              />
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                  <select
                    {...userForm.register('role')}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 bg-white"
                  >
                    {currentUser.role === UserRole.SUPERADMIN && <option value={UserRole.ADMIN}>Admin</option>}
                    <option value={UserRole.GESTIONNAIRE}>Gestionnaire</option>
                    <option value={UserRole.UTILISATEUR}>Utilisateur</option>
                  </select>
                </div>
                <Button type="submit">Créer</Button>
              </div>
            </form>
          </Card>
        )}

        {/* Filtres et Recherche */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 bg-white min-w-[200px]"
            >
              <option value="all">Tous les rôles</option>
              <option value={UserRole.ADMIN}>Admin</option>
              <option value={UserRole.GESTIONNAIRE}>Gestionnaire</option>
              <option value={UserRole.UTILISATEUR}>Utilisateur</option>
            </select>
          </div>
        </Card>

        {/* Compteur d'utilisateurs filtrés */}
        <div className="mb-6">
          <p className="text-2xl font-black text-slate-900">
            Affichage de <span className="text-primary-600">{filteredUsers.length}</span> utilisateur{filteredUsers.length > 1 ? 's' : ''} basé sur les filtres actuels.
          </p>
        </div>

        {/* Liste */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                        onChange={toggleAll}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rôle</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Entreprise</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleUser(user.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{user.email}</span>
                          {user.id === currentUser.id && <span className="text-xs text-primary-600">C'est vous</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800' :
                          user.role === UserRole.GESTIONNAIRE ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.tenant?.companyName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteUser(user.id)}
                          disabled={user.id === currentUser.id}
                        >
                          Supprimer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-gray-500">Aucun utilisateur ne correspond à votre recherche.</div>
            )}
          </Card>
        )}
      </div>
    </AuthLayout>
  );
}