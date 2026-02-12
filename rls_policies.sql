-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- SaaS Multi-tenant Gestion Risques Géolocalisés
-- ============================================

-- PRÉREQUIS: Ce script suppose que vous avez créé des rôles PostgreSQL:
-- - app_superadmin : pour les requêtes superadmin
-- - app_admin : pour les requêtes admin
-- - app_user : pour les requêtes utilisateurs normaux

-- Création des rôles (à exécuter une seule fois)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_superadmin') THEN
        CREATE ROLE app_superadmin;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN
        CREATE ROLE app_admin;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user;
    END IF;
END
$$;

-- ============================================
-- FONCTION HELPER POUR RLS
-- ============================================

-- Récupérer l'ID utilisateur courant depuis le contexte JWT
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Récupérer le tenant_id de l'utilisateur courant
CREATE OR REPLACE FUNCTION current_user_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_tenant_id', TRUE), '')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Récupérer le rôle de l'utilisateur courant
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_role', TRUE), '')::user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Vérifier si l'utilisateur est superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_user_role() = 'superadmin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- POLITIQUES RLS: OFFERS
-- ============================================

-- Les offers sont visibles par tous les utilisateurs authentifiés
CREATE POLICY offers_select_all ON offers
    FOR SELECT
    TO app_superadmin, app_admin, app_user
    USING (TRUE);

-- Seuls les superadmin peuvent modifier les offres
CREATE POLICY offers_all_superadmin ON offers
    FOR ALL
    TO app_superadmin
    USING (is_superadmin());

-- ============================================
-- POLITIQUES RLS: TENANTS
-- ============================================

-- Superadmin voit tous les tenants
CREATE POLICY tenants_select_superadmin ON tenants
    FOR SELECT
    TO app_superadmin
    USING (is_superadmin());

-- Admin voit uniquement son propre tenant
CREATE POLICY tenants_select_own ON tenants
    FOR SELECT
    TO app_admin, app_user
    USING (id = current_user_tenant_id());

-- Seuls les superadmin peuvent gérer les tenants
CREATE POLICY tenants_all_superadmin ON tenants
    FOR ALL
    TO app_superadmin
    USING (is_superadmin());

-- ============================================
-- POLITIQUES RLS: USERS
-- ============================================

-- Superadmin voit tous les utilisateurs
CREATE POLICY users_select_superadmin ON users
    FOR SELECT
    TO app_superadmin
    USING (is_superadmin());

-- Admin voit les utilisateurs de son tenant
CREATE POLICY users_select_same_tenant ON users
    FOR SELECT
    TO app_admin
    USING (tenant_id = current_user_tenant_id());

-- Utilisateur voit son propre profil
CREATE POLICY users_select_self ON users
    FOR SELECT
    TO app_user
    USING (id = current_user_id());

-- Superadmin peut tout faire sur users
CREATE POLICY users_all_superadmin ON users
    FOR ALL
    TO app_superadmin
    USING (is_superadmin());

-- Admin peut gérer les utilisateurs de son tenant (sauf les admin)
CREATE POLICY users_manage_tenant_users ON users
    FOR ALL
    TO app_admin
    USING (
        current_user_role() = 'admin' 
        AND tenant_id = current_user_tenant_id()
        AND role IN ('gestionnaire', 'utilisateur')
    )
    WITH CHECK (
        current_user_role() = 'admin' 
        AND tenant_id = current_user_tenant_id()
        AND role IN ('gestionnaire', 'utilisateur')
    );

-- Utilisateur peut modifier son propre profil (limité)
CREATE POLICY users_update_self ON users
    FOR UPDATE
    TO app_user
    USING (id = current_user_id())
    WITH CHECK (
        id = current_user_id()
        -- L'utilisateur ne peut pas changer son rôle ou son tenant
        AND role = (SELECT role FROM users WHERE id = current_user_id())
        AND tenant_id = (SELECT tenant_id FROM users WHERE id = current_user_id())
    );

-- ============================================
-- POLITIQUES RLS: RISKS
-- ============================================

-- Superadmin voit tous les risques
CREATE POLICY risks_select_superadmin ON risks
    FOR SELECT
    TO app_superadmin
    USING (is_superadmin());

-- Utilisateurs voient les risques de leur tenant
CREATE POLICY risks_select_same_tenant ON risks
    FOR SELECT
    TO app_admin, app_user
    USING (tenant_id = current_user_tenant_id());

-- Superadmin peut tout faire sur risks
CREATE POLICY risks_all_superadmin ON risks
    FOR ALL
    TO app_superadmin
    USING (is_superadmin());

-- Admin et gestionnaire peuvent créer/modifier/supprimer les risques de leur tenant
CREATE POLICY risks_manage_tenant ON risks
    FOR ALL
    TO app_admin
    USING (
        current_user_role() IN ('admin', 'gestionnaire')
        AND tenant_id = current_user_tenant_id()
    )
    WITH CHECK (
        current_user_role() IN ('admin', 'gestionnaire')
        AND tenant_id = current_user_tenant_id()
    );

-- Utilisateur peut créer ses propres risques
CREATE POLICY risks_insert_user ON risks
    FOR INSERT
    TO app_user
    WITH CHECK (
        current_user_role() = 'utilisateur'
        AND tenant_id = current_user_tenant_id()
        AND created_by = current_user_id()
    );

-- Utilisateur peut modifier/supprimer uniquement ses propres risques
CREATE POLICY risks_manage_own ON risks
    FOR ALL
    TO app_user
    USING (
        current_user_role() = 'utilisateur'
        AND created_by = current_user_id()
        AND tenant_id = current_user_tenant_id()
    )
    WITH CHECK (
        current_user_role() = 'utilisateur'
        AND created_by = current_user_id()
        AND tenant_id = current_user_tenant_id()
    );

-- ============================================
-- POLITIQUES RLS: PASSWORD_RESET_TOKENS
-- ============================================

-- Pas de SELECT public (géré par l'application via service account)
-- Les tokens sont vérifiés côté backend uniquement

CREATE POLICY password_reset_tokens_manage_own ON password_reset_tokens
    FOR ALL
    TO app_user, app_admin, app_superadmin
    USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

-- ============================================
-- POLITIQUES RLS: REFRESH_TOKENS
-- ============================================

-- L'utilisateur ne voit que ses propres refresh tokens
CREATE POLICY refresh_tokens_select_own ON refresh_tokens
    FOR SELECT
    TO app_user, app_admin, app_superadmin
    USING (user_id = current_user_id());

CREATE POLICY refresh_tokens_manage_own ON refresh_tokens
    FOR ALL
    TO app_user, app_admin, app_superadmin
    USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

-- ============================================
-- POLITIQUES RLS: TRIAL_REQUESTS
-- ============================================

-- Seuls les superadmin peuvent voir les demandes d'essai
CREATE POLICY trial_requests_select_superadmin ON trial_requests
    FOR SELECT
    TO app_superadmin
    USING (is_superadmin());

-- L'insertion est publique (depuis le formulaire web)
-- À gérer avec un endpoint public ou un rôle anonymous
CREATE POLICY trial_requests_insert_public ON trial_requests
    FOR INSERT
    TO app_user, app_admin, app_superadmin
    WITH CHECK (TRUE);

-- Seuls les superadmin peuvent modifier le statut
CREATE POLICY trial_requests_update_superadmin ON trial_requests
    FOR UPDATE
    TO app_superadmin
    USING (is_superadmin())
    WITH CHECK (is_superadmin());

-- ============================================
-- PERMISSIONS SUR LES TABLES
-- ============================================

-- Offers
GRANT SELECT ON offers TO app_user, app_admin;
GRANT ALL ON offers TO app_superadmin;

-- Tenants
GRANT SELECT ON tenants TO app_user, app_admin;
GRANT ALL ON tenants TO app_superadmin;

-- Users
GRANT SELECT ON users TO app_user, app_admin;
GRANT INSERT, UPDATE, DELETE ON users TO app_admin;
GRANT ALL ON users TO app_superadmin;

-- Risks
GRANT SELECT, INSERT, UPDATE, DELETE ON risks TO app_user, app_admin;
GRANT ALL ON risks TO app_superadmin;

-- Password reset tokens
GRANT SELECT, INSERT, UPDATE ON password_reset_tokens TO app_user, app_admin, app_superadmin;

-- Refresh tokens
GRANT SELECT, INSERT, UPDATE, DELETE ON refresh_tokens TO app_user, app_admin, app_superadmin;

-- Trial requests
GRANT INSERT ON trial_requests TO app_user, app_admin;
GRANT ALL ON trial_requests TO app_superadmin;

-- ============================================
-- PERMISSIONS SUR LES SÉQUENCES
-- ============================================

GRANT USAGE ON SEQUENCE tenant_public_id_seq TO app_superadmin;

-- ============================================
-- INSTRUCTIONS D'UTILISATION
-- ============================================

/*
Dans votre application NestJS, avant chaque requête SQL, définissez le contexte utilisateur:

```typescript
// Exemple avec TypeORM
async setUserContext(userId: string, tenantId: string | null, role: string) {
  await this.connection.query(
    `SET LOCAL app.current_user_id = $1`,
    [userId]
  );
  
  await this.connection.query(
    `SET LOCAL app.current_user_tenant_id = $1`,
    [tenantId || '']
  );
  
  await this.connection.query(
    `SET LOCAL app.current_user_role = $1`,
    [role]
  );
}

// Utilisation dans un middleware ou guard
@Injectable()
export class RlsInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // depuis JWT
    
    if (user) {
      await this.setUserContext(user.id, user.tenantId, user.role);
    }
    
    return next.handle();
  }
}
```

IMPORTANT: 
- SET LOCAL persiste uniquement pour la transaction courante
- Toujours utiliser SET LOCAL, jamais SET (qui persiste pour toute la session)
- Le contexte est automatiquement nettoyé à la fin de la transaction
*/

-- ============================================
-- VÉRIFICATION DES POLITIQUES
-- ============================================

-- Script de test (à exécuter en tant que app_admin)
/*
-- Simuler un admin du tenant X
SET app.current_user_id = 'uuid-admin';
SET app.current_user_tenant_id = 'uuid-tenant-x';
SET app.current_user_role = 'admin';

-- Test: l'admin ne doit voir que les risques de son tenant
SELECT COUNT(*) FROM risks; -- Doit retourner uniquement les risques du tenant X

-- Test: l'admin ne peut pas voir les risques d'un autre tenant
SELECT COUNT(*) FROM risks WHERE tenant_id = 'uuid-tenant-y'; -- Doit retourner 0

-- Réinitialiser
RESET app.current_user_id;
RESET app.current_user_tenant_id;
RESET app.current_user_role;
*/
