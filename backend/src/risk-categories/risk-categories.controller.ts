// Ce controller est intentionnellement vide.
// Les routes /tenants/risk-categories sont gérées dans TenantsController
// pour bénéficier du même RolesGuard que les autres routes tenants.
import { Controller } from '@nestjs/common';

@Controller()
export class RiskCategoriesController {}