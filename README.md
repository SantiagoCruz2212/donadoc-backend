# DonaDoc Backend

API (NestJS 11 + TypeScript + PostgreSQL) de **DonaDoc**, plataforma para diligenciar una sola vez los formatos del INS de donación y trasplante.
Proyecto del *Diplomado en Ingeniería de Software para Aplicaciones basadas en IA*. Autor: Santiago Andrés Castro Cruz.

- Frontend: repositorio `donadoc-frontend`.
- Arquitectura y decisiones: `docs/arquitectura.md` y `docs/adr/` (rama `docs/arquitectura-adr`).

## Configuración

```bash
cp .env.example .env   # todas las variables vienen en blanco; complete las suyas
npm ci
npm test
npm run build
```
Las llaves, claves y contraseñas **no** se publican: viven solo en su `.env` o en los secretos del servidor.
