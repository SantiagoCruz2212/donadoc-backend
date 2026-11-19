# Pruebas de rendimiento de la API

Objetivos fijados **antes** de medir (p95 máximo por escenario) en `rendimiento/rendimiento.mjs`. El proceso termina con error si alguno no se cumple.

```bash
# 1. Backend en marcha (ENVIRONMENT=local, SEED_ENABLED=true, EXTRACTOR_IA_PROVIDER=mock) con PostgreSQL
# 2. En esta carpeta:
npm install
API_URL=http://127.0.0.1:3000 ADMIN_PASSWORD=<la clave del usuario demo> npm run rendimiento
```

El resultado queda en `resultados/resultados.json` (no se versiona). El CI lo ejecuta en el job **Rendimiento de la API**.

Nota: autocannon no entrega el p95 exacto; se usa el p97,5 como cota conservadora.
Las pruebas funcionales de navegador están en el repositorio `donadoc-frontend` (carpeta `pruebas/funcionales`).

## Sobre el inicio de sesión (RN-02)

El costo de bcrypt (10, el mínimo recomendado por OWASP) es deliberado: hace lento adivinar contraseñas. Por eso el objetivo de **500 ms** se mide con
**un usuario a la vez** (RN-02). Con **5 inicios de sesión simultáneos y sostenidos** (RN-02b) el servidor del CI (2 núcleos) llegó a ~770 ms en el
p97,5, así que ese escenario tiene un objetivo propio de 1000 ms. No se bajó más el costo de bcrypt para "aprobar" la prueba.
