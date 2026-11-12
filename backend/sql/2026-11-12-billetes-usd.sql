-- Control de billetes de USD por denominación.
-- Solo hace falta en MySQL (DB_DRIVER=mysql); la base JSON no lo necesita.
-- Ejecutar una vez sobre la base de Divix.

ALTER TABLE Operaciones
  ADD COLUMN billetes JSON NULL;

ALTER TABLE MovimientosCaja
  ADD COLUMN billetes JSON NULL;

ALTER TABLE CortesCaja
  ADD COLUMN billetes_iniciales JSON NULL,
  ADD COLUMN billetes_finales JSON NULL,
  ADD COLUMN diferencias_billetes JSON NULL;
