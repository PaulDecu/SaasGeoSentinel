// ===== CURRENT USER DECORATOR =====
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// ===== ROLES DECORATOR =====
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user-role.enum';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
