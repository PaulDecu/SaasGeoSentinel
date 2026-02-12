/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      loginAsSuperadmin(): Chainable<void>;
      createTenant(data: any): Chainable<any>;
      createUser(data: any): Chainable<any>;
      createRisk(data: any): Chainable<any>;
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('not.include', '/login');
});

Cypress.Commands.add('loginAsSuperadmin', () => {
  cy.login('admin@platform.local', 'Admin123!');
});

Cypress.Commands.add('createTenant', (data) => {
  const apiUrl = Cypress.env('apiUrl');
  
  return cy.request({
    method: 'POST',
    url: `${apiUrl}/tenants`,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
    body: data,
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body;
  });
});

Cypress.Commands.add('createUser', (data) => {
  const apiUrl = Cypress.env('apiUrl');
  
  return cy.request({
    method: 'POST',
    url: `${apiUrl}/users`,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
    body: data,
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body;
  });
});

Cypress.Commands.add('createRisk', (data) => {
  const apiUrl = Cypress.env('apiUrl');
  
  return cy.request({
    method: 'POST',
    url: `${apiUrl}/risks`,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
    body: data,
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body;
  });
});

export {};