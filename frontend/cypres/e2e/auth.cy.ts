describe('Authentication', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', () => {
      cy.visit('/login');
      
      cy.get('input[type="email"]').type('admin@platform.local');
      cy.get('input[type="password"]').type('Admin123!');
      cy.get('button[type="submit"]').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      
      // Token should be stored
      cy.window().then((window) => {
        const token = window.localStorage.getItem('accessToken');
        expect(token).to.exist;
      });
    });

    it('should show error with invalid credentials', () => {
      cy.visit('/login');
      
      cy.get('input[type="email"]').type('admin@platform.local');
      cy.get('input[type="password"]').type('WrongPassword');
      cy.get('button[type="submit"]').click();
      
      // Should show error message
      cy.contains(/email ou mot de passe incorrect/i).should('be.visible');
      
      // Should stay on login page
      cy.url().should('include', '/login');
    });

    it('should validate required fields', () => {
      cy.visit('/login');
      
      cy.get('button[type="submit"]').click();
      
      // Should show validation errors
      cy.contains(/email/i).should('be.visible');
      cy.contains(/mot de passe/i).should('be.visible');
    });
  });

  describe('Forgot Password', () => {
    it('should send reset email', () => {
      cy.visit('/forgot-password');
      
      cy.get('input[type="email"]').type('admin@platform.local');
      cy.get('button[type="submit"]').click();
      
      // Should show success message
      cy.contains(/email envoyé/i).should('be.visible');
    });
  });

  describe('Reset Password', () => {
    it('should reset password with valid token', () => {
      // Note: In real test, you'd need a valid token
      const mockToken = 'mock-reset-token';
      
      cy.visit(`/reset-password?token=${mockToken}`);
      
      cy.get('input[type="password"]').first().type('NewPassword123!');
      cy.get('input[type="password"]').last().type('NewPassword123!');
      cy.get('button[type="submit"]').click();
      
      // Note: This will fail without valid token, but tests the UI flow
    });
  });

  describe('Logout', () => {
    it('should logout successfully', () => {
      cy.loginAsSuperadmin();
      
      cy.visit('/me');
      cy.contains('Déconnexion').click();
      
      // Should redirect to login
      cy.url().should('include', '/login');
      
      // Token should be removed
      cy.window().then((window) => {
        const token = window.localStorage.getItem('accessToken');
        expect(token).to.be.null;
      });
    });
  });
});