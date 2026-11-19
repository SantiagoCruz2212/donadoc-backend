# Uso de IA en el desarrollo

DonaDoc usa IA de dos maneras distintas: **dentro del producto** (extrae datos de historias clínicas; ver `src/ia`) y **para construirlo**
(este documento).

## Herramienta y enfoque

- **Asistente:** Claude Code (Anthropic), usado como agente de desarrollo sobre el repositorio.
- **Enfoque:** desarrollo guiado por especificaciones. La fuente de verdad no fue un prompt suelto sino los entregables previos del diplomado:
  requisitos (módulo 1), diagramas, modelo de datos y contrato de la API (módulo 2), el MVP (módulo 3) y el plan de pruebas (módulo 4).

## Decisiones del autor (no de la IA)

| Decisión | Resultado |
|---|---|
| Tecnología | NestJS + TypeScript, PostgreSQL y React (ADR-001 y ADR-002) |
| Proveedor de IA del producto | Gratuito y detrás de un puerto: Gemini, Groq u Ollama; el simulador `mock` solo para pruebas |
| Alcance | Un flujo de punta a punta: historia clínica → extracción con IA → formato → PDF → firma con código |
| Qué se descarta | Validación con usuarios finales y jurídica, integraciones con la clínica, SMS (ver `requisitos.md`) |
| Privacidad | Datos sintéticos en pruebas; identificadores enmascarados antes de llamar a un proveedor externo; llaves solo en variables de entorno |

## Dónde se usó IA durante el módulo 6

| Sesión | Uso | Qué se aceptó | Qué se corrigió o descartó |
|---|---|---|---|
| S1 requisitos | Redactar historias, criterios Dado/Cuando/Entonces y requisitos no funcionales | Las 10 historias, con el estado real de cada una | Se descartaron validación con usuarios, integración con la clínica, pantallas de superusuario y SMS; el cifrado quedó marcado como PROPUESTA |
| S2 arquitectura | Diagramas C4 en Mermaid y 2 ADR a partir del código | Contexto y contenedores | Se verificó contra el código que no existieran cola de mensajes, servicio de autenticación aparte ni S3 |
| S2 revisión de código | Revisión como "revisor senior" de `auth.service.ts`, `documentos.service.ts` y su controlador; 4 mejoras, un commit cada una | Constante de bcrypt, error 422 en PDF dañado, validación de la firma `%PDF-`, límite de subida seguro | Se descartó filtrar `eliminadoEn` en la consulta (rompía una prueba y quitaba una segunda defensa) |
| S3 pruebas y CI | Configuración de GitHub Actions y traslado de pruebas | CI con pruebas, integración con PostgreSQL, imagen y rendimiento | Ver el caso del CI más abajo |
| S4 IA y seguridad | Cifrado AES-256-GCM de datos clínicos sensibles y un proveedor de IA adicional (Groq) | Cifrado de los campos de mayor riesgo | El resto del cifrado quedó como trabajo futuro, con su límite documentado |

## Cómo se verificó lo generado

No se aceptó nada solo porque compilara. Cada cambio pasó por pruebas unitarias, pruebas de integración con PostgreSQL real y el CI.

**Caso real:** una de las mejoras sugeridas (validar la firma `%PDF-` al subir un archivo) rompió una prueba de integración que subía a propósito
un "PDF" falso para probar el error de extracción. El CI lo detectó; se corrigió la prueba para usar un PDF con firma válida y cuerpo corrupto.
Lección: una sugerencia de la IA que pasa las pruebas unitarias no está verificada hasta que corre la integración.

## Límites que se declaran

- La IA propone y la persona decide: ninguna sugerencia de extracción se guarda sin revisión humana. La confianza la declara el modelo.
- La métrica F1 de 0,968 salió de un conjunto pequeño de historias sintéticas con `llama3.1:8b`: es una tendencia, no precisión clínica.
- El contenido generado por IA fue revisado por el autor, que debe poder explicar cualquier parte del proyecto.
