# ADR-001: NestJS con TypeScript (backend) y React (frontend)

- **Estado:** aceptada
- **Fecha:** 2026-11-14

## Contexto

DonaDoc maneja datos clínicos y debe: validar con rigor lo que entra, separar bien las responsabilidades (casos, documentos,
IA, firma, auditoría), poder cambiar de proveedor de IA sin tocar el negocio, y documentar la API para que otros la integren.
Soy una sola persona desarrollando, así que importa usar **un solo lenguaje** en todo el producto y tener convenciones claras.

## Decisión

- **Backend:** NestJS 11 con TypeScript. Un módulo por dominio con la forma controlador → servicio → entidades → dto → vista.
- **Frontend:** React 18 con Vite y TypeScript, organizado por *features*.
- Los tipos y la validación (`class-validator` en el backend, `zod` en el frontend) se mantienen en el mismo lenguaje.

## Alternativas

1. **FastAPI (Python) + React:** genera `/docs` solo y es muy rápido para prototipar. Se descartó por tener dos lenguajes y
   porque la inyección de dependencias de NestJS facilita el patrón puerto/adaptador de la IA (`ExtractorIa`).
2. **Express sin framework:** más liviano, pero habría que inventar la estructura de módulos, validación global y guardias.

## Consecuencias

- **A favor:** un solo lenguaje; inyección de dependencias, guardias y validación global integradas; Swagger generado desde
  decoradores (31 operaciones); fronteras entre módulos que ESLint puede hacer cumplir en el frontend.
- **En contra:** más código repetitivo (decoradores, módulos) que en un framework mínimo; curva de aprendizaje de NestJS;
  para tareas de IA/datos habría menos librerías que en Python (se mitiga llamando a la IA por HTTP detrás del puerto).
- **Costo de cambiar:** alto para el backend; bajo para la IA, porque está aislada en `Backend/src/ia/adapters`.
