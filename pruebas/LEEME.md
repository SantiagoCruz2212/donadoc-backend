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
