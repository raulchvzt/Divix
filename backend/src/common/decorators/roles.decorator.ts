import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Marca qué roles pueden acceder a un endpoint o controller completo.
 * Si un endpoint no lleva @Roles(), RolesGuard solo exige que haya
 * sesión válida (cualquier rol autenticado puede entrar).
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
