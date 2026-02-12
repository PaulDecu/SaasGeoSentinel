'use client';

import { useState, useEffect } from 'react';
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

export default function AdminTeamsPage() {
  const router = useRouter();
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
      role: UserRole.UTILISATEUR,
    },
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const onCreateUser = async (data: any) => {
    try {
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
    if (selectedUsers.size === 0) {
      toast.error('Aucun utilisateur sélectionné');
      return;
    }

    if (!confirm(`Supprimer ${selectedUsers.size} utilisateur(s) ?`)) return;

    try {
      const result = await usersApi.bulkDelete(Array.from(selectedUsers));
      toast.success(`${result.success.length} utilisateur(s) supprimé(s)`);
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} erreur(s)`);
      }
      setSelectedUsers(new Set());
      loadUsers();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const toggleUser = (id: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedUsers(newSet);
  };

  const toggleAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  // Filtres
  const filteredUsers = users.filter(user => {
    const matchSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'all' || user.role === roleFilter;
    return matchSearch && matchRole;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Gestion des équipes</h1>
          <Button variant="secondary" onClick={() => router.push('/dashboard')}>
            ← Tableau de bord
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2 items-center">
            <Button onClick={() => setShowUserForm(!showUserForm)}>
              {showUserForm ? 'Annuler' : '+ Nouvel utilisateur'}
            </Button>
            {selectedUsers.size > 0 && (
              <Button variant="danger" onClick={bulkDelete}>
                Supprimer ({selectedUsers.size})
              </Button>
            )}
          </div>
        </div>

        {/* Formulaire création */}
        {showUserForm && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Nouvel utilisateur</h3>
            <form onSubmit={userForm.handleSubmit(onCreateUser)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                {...userForm.register('email')}
                error={userForm.formState.errors.email?.message}
                placeholder="utilisateur@exemple.com"
              />
              <Input
                label="Mot de passe"
                type="password"
                {...userForm.register('password')}
                error={userForm.formState.errors.password?.message}
                placeholder="••••••••"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rôle
                </label>
                <select
                  {...userForm.register('role')}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {currentUser?.role === UserRole.SUPERADMIN && (
                    <>
                      <option value={UserRole.ADMIN}>Admin</option>
                      <option value={UserRole.GESTIONNAIRE}>Gestionnaire</option>
                      <option value={UserRole.UTILISATEUR}>Utilisateur</option>
                    </>
                  )}
                  {currentUser?.role === UserRole.ADMIN && (
                    <>
                      <option value={UserRole.GESTIONNAIRE}>Gestionnaire</option>
                      <option value={UserRole.UTILISATEUR}>Utilisateur</option>
                    </>
                  )}
                </select>
              </div>
              <Button type="submit">Créer l'utilisateur</Button>
            </form>
          </Card>
        )}

        {/* Filtres */}
        <Card className="p-4 mb-6">
          <div className="flex gap-4">
            <Input
              placeholder="Rechercher par email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="all">Tous les rôles</option>
              <option value={UserRole.ADMIN}>Admin</option>
              <option value={UserRole.GESTIONNAIRE}>Gestionnaire</option>
              <option value={UserRole.UTILISATEUR}>Utilisateur</option>
            </select>
          </div>
        </Card>

        {/* Liste des utilisateurs */}
        {isLoading ? (
          <Spinner />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Rôle
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Entreprise
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleUser(user.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {user.email}
                      {user.id === currentUser?.id && (
                        <span className="ml-2 text-xs text-primary-600">(Vous)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
                        user.role === UserRole.GESTIONNAIRE ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.tenant?.companyName || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => deleteUser(user.id)}
                        disabled={user.id === currentUser?.id}
                      >
                        Supprimer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Aucun utilisateur trouvé
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
