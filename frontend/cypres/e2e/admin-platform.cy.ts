describe('Admin Platform (Superadmin)', () => {
  beforeEach(() => {
    cy.loginAsSuperadmin();
  });

  describe('Offers CRUD', () => {
    it('should create new offer', () => {
      cy.visit('/admin/platform');
      
      // Click on Offers tab
      cy.contains('Offres').click();
      
      // Click create button
      cy.contains('+ Nouvelle offre').click();
      
      // Fill form
      cy.get('input[name="name"]').type(`Offer E2E ${Date.now()}`);
      cy.get('input[name="maxUsers"]').type('15');
      cy.get('input[name="price"]').type('79.99');
      
      // Submit
      cy.contains('button', 'Créer').click();
      
      // Should see success message
      cy.contains(/offre créée/i).should('be.visible');
    });

    it('should list all offers', () => {
      cy.visit('/admin/platform');
      cy.contains('Offres').click();
      
      // Should see offers list
      cy.get('[data-testid="offer-item"]').should('have.length.at.least', 1);
    });

    it('should delete offer', () => {
      cy.visit('/admin/platform');
      cy.contains('Offres').click();
      
      // Click delete on first offer
      cy.get('[data-testid="offer-item"]').first().within(() => {
        cy.contains('Supprimer').click();
      });
      
      // Confirm deletion
      cy.on('window:confirm', () => true);
      
      // Should see success message
      cy.contains(/offre supprimée/i).should('be.visible');
    });
  });

  describe('Tenants CRUD', () => {
    let offerId: string;

    before(() => {
      // Create an offer first via API
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/offers`,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: {
          name: `Test Offer ${Date.now()}`,
          maxUsers: 10,
          price: 49.99,
        },
      }).then((response) => {
        offerId = response.body.id;
      });
    });

    it('should create new tenant', () => {
      cy.visit('/admin/platform');
      cy.contains('Tenants').click();
      
      cy.contains('+ Nouveau tenant').click();
      
      cy.get('input[name="companyName"]').type(`Company E2E ${Date.now()}`);
      cy.get('input[name="contactEmail"]').type(`contact-${Date.now()}@teste2e.com`);
      cy.get('select[name="offerId"]').select(offerId);
      
      cy.contains('button', 'Créer').click();
      
      cy.contains(/tenant créé/i).should('be.visible');
    });

    it('should show GL-XXXXX public ID', () => {
      cy.visit('/admin/platform');
      cy.contains('Tenants').click();
      
      // Should see public IDs
      cy.contains(/GL-\d{5}/).should('be.visible');
    });

    it('should create admin for tenant', () => {
      cy.visit('/admin/platform');
      cy.contains('Tenants').click();
      
      // Click "+ Admin" on first tenant
      cy.get('[data-testid="tenant-item"]').first().within(() => {
        cy.contains('+ Admin').click();
      });
      
      // Fill admin form
      cy.get('input[name="email"]').type(`admin-${Date.now()}@teste2e.com`);
      cy.get('input[name="password"]').type('AdminTest123!');
      
      cy.contains('button', 'Créer').click();
      
      cy.contains(/admin créé/i).should('be.visible');
    });
  });
});