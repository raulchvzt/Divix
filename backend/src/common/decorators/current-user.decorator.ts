import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extrae el payload del usuario que AuthGuard dejó en request.user.
 * Uso: @CurrentUser() usuario completo, o @CurrentUser('sub') solo el id.
 */
export const CurrentUser = createParamDecorator(
  (campo: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const usuario = request.user;
    return campo ? usuario?.[campo] : usuario;
  },
);
