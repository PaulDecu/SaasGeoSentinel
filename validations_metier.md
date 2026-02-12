# RÈGLES DE VALIDATION MÉTIER
## SaaS Multi-tenant Gestion Risques Géolocalisés

---

## 🔐 AUTHENTIFICATION & SÉCURITÉ

### Email
```typescript
/**
 * Format email valide
 * - Regex: ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$
 * - Unique dans la base
 * - Conversion en lowercase avant stockage
 */
validateEmail(email: string): boolean {
  const regex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!regex.test(email)) {
    throw new BadRequestException('Format email invalide');
  }
  return true;
}

// Vérification unicité
async checkEmailUnique(email: string): Promise<void> {
  const exists = await this.userRepository.findOne({ 
    where: { email: email.toLowerCase() } 
  });
  if (exists) {
    throw new ConflictException('Cet email est déjà utilisé');
  }
}
```

### Mot de passe
```typescript
/**
 * Politique de mot de passe
 * - Minimum 8 caractères
 * - Au moins 1 majuscule
 * - Au moins 1 minuscule
 * - Au moins 1 chiffre
 * - Au moins 1 caractère spécial recommandé (non obligatoire)
 * - Maximum 128 caractères
 */
validatePassword(password: string): boolean {
  if (password.length < 8 || password.length > 128) {
    throw new BadRequestException('Le mot de passe doit contenir entre 8 et 128 caractères');
  }
  
  if (!/[A-Z]/.test(password)) {
    throw new BadRequestException('Le mot de passe doit contenir au moins une majuscule');
  }
  
  if (!/[a-z]/.test(password)) {
    throw new BadRequestException('Le mot de passe doit contenir au moins une minuscule');
  }
  
  if (!/[0-9]/.test(password)) {
    throw new BadRequestException('Le mot de passe doit contenir au moins un chiffre');
  }
  
  return true;
}

/**
 * Hashage avec bcrypt
 * - Rounds: 10 (équilibre sécurité/performance)
 */
async hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Vérification ancien mot de passe lors du changement
 */
async changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await this.userRepository.findOne({ where: { id: userId } });
  
  const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedException('Ancien mot de passe incorrect');
  }
  
  this.validatePassword(newPassword);
  user.passwordHash = await this.hashPassword(newPassword);
  await this.userRepository.save(user);
}
```

### Tokens de réinitialisation
```typescript
/**
 * Génération token de réinitialisation
 * - Token aléatoire 32 bytes (64 caractères hex)
 * - Hash SHA256 stocké en base
 * - TTL: 1 heure
 * - Usage unique (is_used = true après utilisation)
 */
async generatePasswordResetToken(email: string): Promise<string> {
  const user = await this.findByEmail(email);
  if (!user) {
    // Ne pas révéler si l'email existe
    return; // Mais envoyer quand même un message de confirmation générique
  }
  
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  
  await this.tokenRepository.save({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
    isUsed: false
  });
  
  // Envoyer email avec lien contenant le token (pas le hash)
  return token;
}

/**
 * Validation token de réinitialisation
 */
async validateResetToken(token: string): Promise<User> {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  
  const resetToken = await this.tokenRepository.findOne({
    where: { 
      tokenHash,
      isUsed: false,
      expiresAt: MoreThan(new Date())
    },
    relations: ['user']
  });
  
  if (!resetToken) {
    throw new BadRequestException('Token invalide ou expiré');
  }
  
  return resetToken.user;
}

/**
 * Invalider token après utilisation
 */
async invalidateToken(token: string): Promise<void> {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await this.tokenRepository.update(
    { tokenHash },
    { isUsed: true }
  );
}
```

---

## 👤 GESTION DES UTILISATEURS

### Création utilisateur
```typescript
/**
 * Règles de création
 * - Email unique et valide
 * - Rôle valide pour le contexte
 * - Tenant obligatoire sauf pour superadmin
 * - Pas de création de superadmin via API standard
 */
async createUser(dto: CreateUserDto, creatorRole: UserRole): Promise<User> {
  // Validation email
  this.validateEmail(dto.email);
  await this.checkEmailUnique(dto.email);
  
  // Validation rôle
  if (dto.role === 'superadmin') {
    throw new ForbiddenException('Impossible de créer un superadmin via cette API');
  }
  
  // Validation tenant
  if (dto.role !== 'superadmin' && !dto.tenantId) {
    throw new BadRequestException('Un tenant est obligatoire pour ce rôle');
  }
  
  // Validation permissions créateur
  if (creatorRole === 'admin' && !['gestionnaire', 'utilisateur'].includes(dto.role)) {
    throw new ForbiddenException('Un admin peut uniquement créer des gestionnaires et utilisateurs');
  }
  
  // Vérification limite offre
  await this.checkTenantUserLimit(dto.tenantId);
  
  const user = this.userRepository.create({
    email: dto.email.toLowerCase(),
    passwordHash: await this.hashPassword(dto.password),
    role: dto.role,
    tenantId: dto.tenantId
  });
  
  return this.userRepository.save(user);
}
```

### Suppression utilisateur
```typescript
/**
 * Règles de suppression
 * - Admin ne peut supprimer que gestionnaires/utilisateurs de son tenant
 * - Impossible de se supprimer soi-même
 * - Soft delete recommandé pour audit
 * - Suppression en cascade des refresh tokens
 */
async deleteUser(userId: string, deleterId: string, deleterRole: UserRole, deleterTenantId: string) {
  const user = await this.userRepository.findOne({ where: { id: userId } });
  
  if (!user) {
    throw new NotFoundException('Utilisateur non trouvé');
  }
  
  // Impossible de se supprimer
  if (userId === deleterId) {
    throw new BadRequestException('Impossible de supprimer votre propre compte');
  }
  
  // Vérifications selon le rôle
  if (deleterRole === 'admin') {
    if (user.tenantId !== deleterTenantId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que les utilisateurs de votre tenant');
    }
    
    if (!['gestionnaire', 'utilisateur'].includes(user.role)) {
      throw new ForbiddenException('Vous ne pouvez supprimer que des gestionnaires et utilisateurs');
    }
  }
  
  // Suppression (ou soft delete)
  await this.userRepository.softRemove(user);
  
  // Nettoyer les tokens
  await this.refreshTokenRepository.delete({ userId });
}

/**
 * Suppression en lot
 */
async bulkDeleteUsers(userIds: string[], deleterId: string, deleterRole: UserRole, deleterTenantId: string) {
  const results = {
    success: [],
    errors: []
  };
  
  for (const userId of userIds) {
    try {
      await this.deleteUser(userId, deleterId, deleterRole, deleterTenantId);
      results.success.push(userId);
    } catch (error) {
      results.errors.push({ userId, error: error.message });
    }
  }
  
  return results;
}
```

---

## 🏢 GESTION DES TENANTS

### Création tenant
```typescript
/**
 * Règles de création (superadmin uniquement)
 * - Nom entreprise obligatoire et non vide
 * - Email contact valide
 * - Offre existante et active
 * - Génération automatique GL-XXXXX
 * - Date début = now(), date fin selon l'offre
 */
async createTenant(dto: CreateTenantDto): Promise<Tenant> {
  // Validation nom entreprise
  if (!dto.companyName || dto.companyName.trim().length === 0) {
    throw new BadRequestException('Le nom de l\'entreprise est obligatoire');
  }
  
  // Validation email
  this.validateEmail(dto.contactEmail);
  
  // Validation offre
  const offer = await this.offerRepository.findOne({ 
    where: { id: dto.offerId } 
  });
  
  if (!offer) {
    throw new NotFoundException('Offre non trouvée');
  }
  
  if (offer.endOfSale && offer.endOfSale < new Date()) {
    throw new BadRequestException('Cette offre n\'est plus commercialisée');
  }
  
  // Création tenant (public_id généré par trigger)
  const tenant = this.tenantRepository.create({
    companyName: dto.companyName.trim(),
    contactEmail: dto.contactEmail.toLowerCase(),
    contactPhone: dto.contactPhone,
    offerId: dto.offerId,
    subscriptionStart: new Date(),
    subscriptionEnd: dto.subscriptionEnd, // ou calculé selon l'offre
    metadata: dto.metadata || {}
  });
  
  return this.tenantRepository.save(tenant);
}
```

### Vérification limite utilisateurs
```typescript
/**
 * Vérifier que le tenant n'a pas atteint sa limite d'utilisateurs
 */
async checkTenantUserLimit(tenantId: string): Promise<void> {
  const tenant = await this.tenantRepository.findOne({
    where: { id: tenantId },
    relations: ['offer', 'users']
  });
  
  if (!tenant) {
    throw new NotFoundException('Tenant non trouvé');
  }
  
  const currentUserCount = await this.userRepository.count({
    where: { tenantId }
  });
  
  if (currentUserCount >= tenant.offer.maxUsers) {
    throw new ForbiddenException(
      `Limite d'utilisateurs atteinte (${tenant.offer.maxUsers} max)`
    );
  }
}
```

### Vérification abonnement actif
```typescript
/**
 * Vérifier que l'abonnement du tenant est actif
 */
async checkTenantSubscriptionActive(tenantId: string): Promise<void> {
  const tenant = await this.tenantRepository.findOne({
    where: { id: tenantId }
  });
  
  if (!tenant) {
    throw new NotFoundException('Tenant non trouvé');
  }
  
  if (tenant.subscriptionEnd && tenant.subscriptionEnd < new Date()) {
    throw new ForbiddenException('Abonnement expiré');
  }
}
```

---

## 🗺️ GESTION DES RISQUES

### Création risque
```typescript
/**
 * Règles de création
 * - Titre obligatoire (min 3 caractères, max 255)
 * - Catégorie valide
 * - Sévérité valide
 * - Coordonnées GPS valides
 * - Tenant automatique depuis le contexte utilisateur
 * - Created_by automatique
 */
async createRisk(dto: CreateRiskDto, userId: string, tenantId: string): Promise<Risk> {
  // Validation titre
  if (!dto.title || dto.title.trim().length < 3) {
    throw new BadRequestException('Le titre doit contenir au moins 3 caractères');
  }
  
  if (dto.title.length > 255) {
    throw new BadRequestException('Le titre ne peut dépasser 255 caractères');
  }
  
  // Validation coordonnées GPS
  this.validateCoordinates(dto.latitude, dto.longitude);
  
  // Vérification abonnement actif
  await this.checkTenantSubscriptionActive(tenantId);
  
  // Création
  const risk = this.riskRepository.create({
    tenantId,
    createdBy: userId,
    title: dto.title.trim(),
    description: dto.description?.trim(),
    category: dto.category,
    severity: dto.severity,
    location: () => `ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::GEOGRAPHY`,
    metadata: dto.metadata || {}
  });
  
  return this.riskRepository.save(risk);
}

/**
 * Validation coordonnées GPS
 */
validateCoordinates(lat: number, lng: number): void {
  if (lat < -90 || lat > 90) {
    throw new BadRequestException('Latitude invalide (doit être entre -90 et 90)');
  }
  
  if (lng < -180 || lng > 180) {
    throw new BadRequestException('Longitude invalide (doit être entre -180 et 180)');
  }
}
```

### Modification risque
```typescript
/**
 * Règles de modification
 * - Admin/Gestionnaire peuvent modifier tous les risques du tenant
 * - Utilisateur peut uniquement modifier ses propres risques
 * - Impossible de changer le tenant
 * - Impossible de changer le créateur
 */
async updateRisk(
  riskId: string, 
  dto: UpdateRiskDto, 
  userId: string, 
  userRole: UserRole,
  tenantId: string
): Promise<Risk> {
  const risk = await this.riskRepository.findOne({ 
    where: { id: riskId } 
  });
  
  if (!risk) {
    throw new NotFoundException('Risque non trouvé');
  }
  
  // Vérifications de permissions (RLS fait déjà le job mais on sécurise)
  if (risk.tenantId !== tenantId) {
    throw new ForbiddenException('Accès interdit à ce risque');
  }
  
  if (userRole === 'utilisateur' && risk.createdBy !== userId) {
    throw new ForbiddenException('Vous ne pouvez modifier que vos propres risques');
  }
  
  // Validation des modifications
  if (dto.title !== undefined) {
    if (dto.title.trim().length < 3) {
      throw new BadRequestException('Le titre doit contenir au moins 3 caractères');
    }
    risk.title = dto.title.trim();
  }
  
  if (dto.description !== undefined) {
    risk.description = dto.description?.trim();
  }
  
  if (dto.category !== undefined) {
    risk.category = dto.category;
  }
  
  if (dto.severity !== undefined) {
    risk.severity = dto.severity;
  }
  
  if (dto.latitude !== undefined && dto.longitude !== undefined) {
    this.validateCoordinates(dto.latitude, dto.longitude);
    risk.location = () => `ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::GEOGRAPHY`;
  }
  
  if (dto.metadata !== undefined) {
    risk.metadata = { ...risk.metadata, ...dto.metadata };
  }
  
  return this.riskRepository.save(risk);
}
```

### Recherche à proximité
```typescript
/**
 * Recherche de risques dans un rayon
 * - Rayon par défaut: 10 km
 * - Rayon max: 100 km
 * - Limite résultats: 200 max
 * - Optimisé avec ST_DWithin et index GIST
 */
async findNearby(
  latitude: number,
  longitude: number,
  radiusKm: number = 10,
  limit: number = 200,
  tenantId: string
): Promise<Risk[]> {
  // Validation coordonnées
  this.validateCoordinates(latitude, longitude);
  
  // Validation rayon
  if (radiusKm <= 0 || radiusKm > 100) {
    throw new BadRequestException('Le rayon doit être entre 0 et 100 km');
  }
  
  // Validation limite
  if (limit <= 0 || limit > 200) {
    throw new BadRequestException('La limite doit être entre 1 et 200');
  }
  
  const radiusMeters = radiusKm * 1000;
  
  // Query optimisée avec ST_DWithin
  const risks = await this.riskRepository
    .createQueryBuilder('risk')
    .where('risk.tenant_id = :tenantId', { tenantId })
    .andWhere(
      `ST_DWithin(
        risk.location,
        ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::GEOGRAPHY,
        :radius
      )`,
      { latitude, longitude, radius: radiusMeters }
    )
    .addSelect(
      `ST_Distance(
        risk.location,
        ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::GEOGRAPHY
      )`,
      'distance'
    )
    .orderBy('distance', 'ASC')
    .limit(limit)
    .getMany();
  
  return risks;
}
```

---

## 📋 DEMANDES D'ESSAI

### Validation formulaire
```typescript
/**
 * Règles de validation
 * - Nom entreprise obligatoire (min 2 caractères)
 * - Email professionnel valide
 * - Téléphone optionnel mais formaté si présent
 * - Message optionnel
 * - Rate limiting: 1 demande par email par 24h
 */
async createTrialRequest(dto: CreateTrialRequestDto): Promise<TrialRequest> {
  // Validation nom entreprise
  if (!dto.companyName || dto.companyName.trim().length < 2) {
    throw new BadRequestException('Le nom de l\'entreprise doit contenir au moins 2 caractères');
  }
  
  // Validation email
  this.validateEmail(dto.email);
  
  // Rate limiting
  const recent = await this.trialRequestRepository.findOne({
    where: {
      email: dto.email.toLowerCase(),
      createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000))
    }
  });
  
  if (recent) {
    throw new BadRequestException('Une demande a déjà été envoyée avec cet email dans les dernières 24h');
  }
  
  // Validation téléphone (si présent)
  if (dto.phone) {
    if (!/^[+]?[0-9\s\-().]{8,20}$/.test(dto.phone)) {
      throw new BadRequestException('Format de téléphone invalide');
    }
  }
  
  const request = this.trialRequestRepository.create({
    companyName: dto.companyName.trim(),
    email: dto.email.toLowerCase(),
    phone: dto.phone,
    message: dto.message?.trim(),
    status: 'pending'
  });
  
  // Envoyer notification email au support
  await this.emailService.sendTrialRequestNotification(request);
  
  return this.trialRequestRepository.save(request);
}
```

---

## 🔄 VALIDATIONS TRANSVERSALES

### Rate Limiting
```typescript
/**
 * Limites API recommandées
 */
const RATE_LIMITS = {
  AUTH: {
    LOGIN: { max: 5, window: '15m' },      // 5 tentatives / 15min
    FORGOT_PASSWORD: { max: 3, window: '1h' }, // 3 demandes / 1h
  },
  API: {
    GLOBAL: { max: 100, window: '1m' },    // 100 req/min par user
    NEARBY: { max: 20, window: '1m' },     // 20 recherches/min
  }
};
```

### Validation des entrées utilisateur
```typescript
/**
 * Sanitisation générale
 * - Trim des strings
 * - Suppression des caractères de contrôle
 * - Protection XSS sur les champs affichés
 */
function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Supprimer caractères de contrôle
    .substring(0, 10000); // Limite globale
}

/**
 * Validation JSONB metadata
 * - Taille max: 10KB
 * - Pas de fonctions ou code
 */
function validateMetadata(metadata: any): void {
  const json = JSON.stringify(metadata);
  
  if (json.length > 10240) {
    throw new BadRequestException('Metadata trop volumineuses (10KB max)');
  }
  
  // Vérifier qu'il n'y a pas de code exécutable
  if (json.includes('function') || json.includes('=>')) {
    throw new BadRequestException('Metadata invalides');
  }
}
```

### Audit trail
```typescript
/**
 * Logging des actions sensibles
 */
const AUDIT_ACTIONS = [
  'USER_CREATED',
  'USER_DELETED',
  'USER_ROLE_CHANGED',
  'TENANT_CREATED',
  'TENANT_DELETED',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_CHANGED',
  'BULK_DELETE'
];

async logAuditEvent(
  action: string,
  userId: string,
  tenantId: string,
  details: any
) {
  await this.auditRepository.save({
    action,
    userId,
    tenantId,
    details,
    ipAddress: this.request.ip,
    userAgent: this.request.headers['user-agent'],
    createdAt: new Date()
  });
}
```
