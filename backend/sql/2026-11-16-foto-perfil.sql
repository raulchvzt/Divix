-- Foto de perfil de los usuarios (pantalla "Mi perfil").
-- Solo hace falta en MySQL (DB_DRIVER=mysql); la base JSON no lo necesita.
-- Ejecutar una vez sobre la base de Divix.

ALTER TABLE Usuarios
  ADD COLUMN foto MEDIUMTEXT NULL;
