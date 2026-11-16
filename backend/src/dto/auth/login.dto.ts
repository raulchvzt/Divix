import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  usuario: string;

  // Al iniciar sesión solo se pide que no venga vacía: la longitud mínima se
  // exige al crear o cambiar la contraseña, para no bloquear cuentas antiguas.
  @IsString()
  @IsNotEmpty()
  contrasena: string;
}
