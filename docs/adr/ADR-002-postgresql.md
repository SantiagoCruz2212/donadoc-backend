# ADR-002: PostgreSQL como base de datos

- **Estado:** aceptada
- **Fecha:** 2026-11-14

## Contexto

El modelo tiene 19 tablas relacionales (casos, donantes, documentos, formatos, firmas, usuarios, organizaciones, informes…) con
integridad referencial importante. Además se exige una **auditoría que nadie pueda modificar** y separar los datos por
organización (*tenant*). Los formatos del INS cambian, por lo que algunos esquemas se guardan como JSON.

## Decisión

Usar **PostgreSQL 16** (imagen `postgres:16-alpine`) con TypeORM y migraciones versionadas (`ddl/` y `dml/`) que se ejecutan
una sola vez en cada despliegue. La tabla de auditoría es de solo inserción, protegida con un trigger en la base de datos.

## Alternativas

1. **MySQL:** conocido y soportado en casi cualquier hosting. Se mantiene una alternativa de esquema en `db/`, pero se descartó
   como principal por el soporte más débil de JSON y de *triggers* para la auditoría inmutable.
2. **MongoDB:** flexible para los formatos cambiantes, pero el dominio es muy relacional y perderíamos integridad referencial.

## Consecuencias

- **A favor:** integridad referencial, columnas `jsonb` para los esquemas de formatos, triggers para la auditoría inmutable,
  imagen oficial pequeña y capa gratuita en la mayoría de proveedores en la nube.
- **En contra:** hay que administrar la base (copias de seguridad, versiones); las pruebas de integración necesitan una
  PostgreSQL real (el CI levanta un servicio); un cambio de motor exigiría revisar migraciones y la auditoría.
- **Pendiente:** definir la política de copias de seguridad del volumen `pgdata` antes de usar datos reales.
