describe('Admin Risks', () => {
  beforeEach(() => {
    cy.loginAsSuperadmin();
  });

  describe('Risks CRUD', () => {
    let createdRiskId: string;

    it('should create new risk with geolocation', () => {
      cy.visit('/admin/risks');
      
      cy.contains('+ Nouveau risque').click();
      
      cy.get('input[name="title"]').type(`Risk E2E ${Date.now()}`);
      cy.get('textarea[name="description"]').type('Test description for E2E risk');
      cy.get('select[name="category"]').select('naturel');
      cy.get('select[name="severity"]').select('modéré');
      cy.get('input[name="latitude"]').type('48.8566');
      cy.get('input[name="longitude"]').type('2.3522');
      
      cy.contains('button', 'Créer').click();
      
      cy.contains(/risque créé/i).should('be.visible');
    });

    it('should validate GPS coordinates', () => {
      cy.visit('/admin/risks');
      
      cy.contains('+ Nouveau risque').click();
      
      cy.get('input[name="title"]').type('Invalid Risk');
      cy.get('select[name="category"]').select('industriel');
      cy.get('select[name="severity"]').select('faible');
      cy.get('input[name="latitude"]').type('200'); // Invalid
      cy.get('input[name="longitude"]').type('300'); // Invalid
      
      cy.contains('button', 'Créer').click();
      
      // Should show validation error
      cy.contains(/coordonnées/i).should('be.visible');
    });

    it('should filter risks by category', () => {
      cy.visit('/admin/risks');
      
      cy.get('select').contains('Toutes les catégories').parent().select('naturel');
      
      // Should show only naturel category
      cy.get('[data-testid="risk-category"]').each(($el) => {
        expect($el.text()).to.include('naturel');
      });
    });

    it('should filter risks by severity', () => {
      cy.visit('/admin/risks');
      
      cy.get('select').contains('Toutes les sévérités').parent().select('critique');
      
      // Should show only critical risks
      cy.get('[data-testid="risk-severity"]').each(($el) => {
        expect($el.text()).to.include('critique');
      });
    });

    it('should edit risk', () => {
      cy.visit('/admin/risks');
      
      // Click edit on first risk
      cy.get('[data-testid="risk-item"]').first().within(() => {
        cy.contains('Modifier').click();
      });
      
      // Update title
      cy.get('input[name="title"]').clear().type('Updated Risk Title');
      cy.get('select[name="severity"]').select('élevé');
      
      cy.contains('button', 'Mettre à jour').click();
      
      cy.contains(/risque mis à jour/i).should('be.visible');
    });

    it('should delete risk', () => {
      cy.visit('/admin/risks');
      
      // Click delete on first risk
      cy.get('[data-testid="risk-item"]').first().within(() => {
        cy.contains('Supprimer').click();
      });
      
      cy.on('window:confirm', () => true);
      
      cy.contains(/risque supprimé/i).should('be.visible');
    });
  });

  describe('Nearby Risks via API', () => {
    it('should find nearby risks', () => {
      const apiUrl = Cypress.env('apiUrl');
      
      cy.request({
        method: 'GET',
        url: `${apiUrl}/risks/nearby`,
        qs: {
          lat: 48.8566,
          lng: 2.3522,
          radius_km: 10,
          limit: 50,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
        
        // Each risk should have distance
        response.body.forEach((risk: any) => {
          expect(risk).to.have.property('distance');
          expect(risk).to.have.property('latitude');
          expect(risk).to.have.property('longitude');
        });
      });
    });

    it('should respect radius limit', () => {
      const apiUrl = Cypress.env('apiUrl');
      
      cy.request({
        method: 'GET',
        url: `${apiUrl}/risks/nearby`,
        qs: {
          lat: 48.8566,
          lng: 2.3522,
          radius_km: 150, // Over limit
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(400);
      });
    });

    it('should order by distance ascending', () => {
      const apiUrl = Cypress.env('apiUrl');
      
      cy.request({
        method: 'GET',
        url: `${apiUrl}/risks/nearby`,
        qs: {
          lat: 48.8566,
          lng: 2.3522,
          radius_km: 20,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      }).then((response) => {
        const distances = response.body.map((r: any) => r.distance);
        
        // Check if sorted ascending
        for (let i = 1; i < distances.length; i++) {
          expect(distances[i]).to.be.at.least(distances[i - 1]);
        }
      });
    });
  });
});