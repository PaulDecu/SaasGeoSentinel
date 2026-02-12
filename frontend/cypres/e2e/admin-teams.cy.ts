describe('Admin Teams', () => {
  beforeEach(() => {
    cy.loginAsSuperadmin();
  });

  describe('Users CRUD', () => {
    it('should create new user', () => {
      cy.visit('/admin/teams');
      
      cy.contains('+ Nouvel utilisateur').click();
      
      cy.get('input[name="email"]').type(`user-${Date.now()}@teste2e.com`);
      cy.get('input[name="password"]').type('UserTest123!');
      cy.get('select[name="role"]').select('gestionnaire');
      
      cy.contains('button', 'Créer').click();
      
      cy.contains(/utilisateur créé/i).should('be.visible');
    });

    it('should filter users by role', () => {
      cy.visit('/admin/teams');
      
      // Select role filter
      cy.get('select').contains('Tous les rôles').parent().select('admin');
      
      // Should show only admins
      cy.get('[data-testid="user-role"]').each(($el) => {
        expect($el.text()).to.include('admin');
      });
    });

    it('should search users by email', () => {
      cy.visit('/admin/teams');
      
      cy.get('input[placeholder*="Rechercher"]').type('admin@platform');
      
      // Should filter results
      cy.get('[data-testid="user-item"]').should('have.length.at.least', 1);
      cy.contains('admin@platform.local').should('be.visible');
    });

    it('should bulk delete users', () => {
      cy.visit('/admin/teams');
      
      // Select multiple users
      cy.get('input[type="checkbox"]').eq(1).check();
      cy.get('input[type="checkbox"]').eq(2).check();
      
      // Click bulk delete
      cy.contains('Supprimer').click();
      
      // Confirm
      cy.on('window:confirm', () => true);
      
      cy.contains(/utilisateur.*supprimé/i).should('be.visible');
    });

    it('should not allow deleting self', () => {
      cy.visit('/admin/teams');
      
      // Find current user row (contains "Vous")
      cy.contains('(Vous)').parent().parent().within(() => {
        cy.get('button').contains('Supprimer').should('be.disabled');
      });
    });
  });
});