-- Costo promedio por divisa al cerrar cada corte (ganancia con costo promedio ponderado).
-- Solo hace falta en MySQL (DB_DRIVER=mysql); la base JSON no lo necesita.
-- Ejecutar una vez sobre la base de Divix.

ALTER TABLE CortesCaja
  ADD COLUMN costos_finales JSON NULL;
