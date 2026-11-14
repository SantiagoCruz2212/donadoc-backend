# Requisitos – DonaDoc

## Descripción

DonaDoc es una plataforma web para **diligenciar una sola vez** los formatos del INS de donación y trasplante de órganos y
tejidos, en lugar de transcribir a mano unos 23 formatos con datos repetidos. Nació del caso de la coordinadora de
trasplantes de una clínica.

- **Usuarios:** el coordinador/a de trasplantes (usa la aplicación) y el paciente o familiar (confirma su firma con un código
  que recibe por correo). Existe además un rol de administrador de la organización.
- **Flujo:** iniciar sesión → crear un caso → cargar una historia clínica externa (`.pdf`, `.txt` o texto pegado) → **extraer
  datos con IA** (la persona acepta, modifica o rechaza cada sugerencia) → diligenciar un formato → generar el PDF → firma con
  código de un solo uso → documento firmado e inmodificable.
- **Stack:** React 18 + Vite (repositorio `donadoc-frontend`), NestJS 11 + TypeScript + PostgreSQL 16 (este repositorio),
  IA con Gemini (capa gratuita) u Ollama (local) detrás del puerto `ExtractorIa`. Ver [arquitectura](arquitectura.md).
- **Alcance de este documento:** lo que se cumplirá **entre el viernes 13 y el jueves 19 de noviembre de 2026** (módulo 6).
  Las historias ya construidas se dejan con su estado real; lo pendiente es lo que se trabaja esta semana.
- **Fuera de alcance esta semana (Won't):** validación con usuarios finales de la clínica, validación jurídica de la firma,
  integración con los sistemas de la clínica y formatos del INS restantes. Dependen de terceros y no se pueden cerrar en una semana.

## Historias de usuario

### HU-01: Iniciar sesión
Como **coordinador de trasplantes**, quiero iniciar sesión con mi correo y mi clave, para ver solo los casos de mi clínica.
- Dado un usuario registrado, cuando ingresa correo y clave correctos, entonces recibe una sesión y ve sus casos.
- Dado un usuario registrado, cuando ingresa una clave incorrecta, entonces ve "Credenciales inválidas" y no entra.
- Dado un usuario de otra clínica, cuando consulta un caso ajeno, entonces recibe 404 (no se confirma que exista).

Estado: **Hecha**

### HU-02: Crear un caso y cargar la historia clínica
Como **coordinador de trasplantes**, quiero crear un caso y cargar una historia clínica externa, para empezar a diligenciar sus formatos.
- Dado un caso propio, cuando subo un `.pdf` o `.txt` válido, entonces queda guardado con su huella SHA-256.
- Dado un archivo con otra extensión o un `.pdf` que no empieza con la firma `%PDF-`, cuando lo subo, entonces recibo 422 y no se guarda.
- Dado un archivo mayor al límite (5 MB por defecto), cuando lo subo, entonces recibo un error claro (413) y no un 500.

Estado: **Hecha** (validación de firma del PDF y límite configurable añadidos en la revisión de código de la sesión 2)

### HU-03: Extraer datos con IA y decidir cada sugerencia
Como **coordinador de trasplantes**, quiero que la IA sugiera los datos de la historia clínica y yo acepte, modifique o rechace cada uno, para no transcribir a mano sin perder el control.
- Dado un documento cargado, cuando pido la extracción, entonces veo sugerencias con su nivel de confianza (diagnóstico, causa de muerte, antecedentes, fecha de ingreso, grupo sanguíneo).
- Dado que el proveedor de IA falla o se agota el tiempo, cuando pido la extracción, entonces el documento no se pierde y la extracción queda pendiente.
- Dado un PDF corrupto, cuando pido la extracción, entonces termina en ERROR con un mensaje claro y no con un 500.

Estado: **Hecha en local** (Ollama validado con F1 0,968; con Gemini falta probar con una clave real). **Pendiente** verla funcionando en la URL pública.

### HU-04: Diligenciar un formato y generar el PDF
Como **coordinador de trasplantes**, quiero diligenciar un formato oficial con lo conocido ya precargado y obtener su PDF, para entregar el documento completo.
- Dado un caso con datos aceptados, cuando abro un formato, entonces el formulario aparece con los datos precargados.
- Dado un campo obligatorio vacío, cuando guardo, entonces veo el error en ese campo y no se guarda.
- Dado un formato completo, cuando genero el PDF, entonces obtengo un archivo con una versión numerada.

Estado: **Hecha** (motor de formatos y 8 formatos oficiales del INS; el resto de formatos está fuera de alcance)

### HU-05: Firmar con un código de un solo uso
Como **paciente o familiar**, quiero confirmar mi firma con un código que llega a mi correo, para firmar sin imprimir.
- Dado un PDF listo, cuando el firmante ingresa el código correcto, entonces el documento queda FIRMADO y no se puede modificar.
- Dado un código incorrecto o vencido (10 minutos), cuando se ingresa, entonces se rechaza; tras 5 intentos fallidos se bloquea.
- Dado un documento alterado después de firmar, cuando se verifica la firma, entonces se detecta la alteración (la firma va ligada al SHA-256).

Estado: **Hecha** (el envío real por SMTP no se ha probado con un proveedor)

### HU-06: Restablecer la contraseña
Como **usuario**, quiero restablecer mi contraseña con un código enviado a mi correo, para recuperar el acceso si la olvido.
- Dado un correo registrado, cuando solicito el restablecimiento, entonces recibo un código y la respuesta es la misma exista o no la cuenta.
- Dado un código válido, cuando defino la nueva clave, entonces puedo iniciar sesión y recibo un aviso de cambio.
- Dado un código usado o vencido, cuando lo reutilizo, entonces recibo "Código inválido o vencido".

Estado: **Hecha**

### HU-07: Cifrar los datos sensibles en la base de datos
Como **responsable de la clínica**, quiero que los datos médicos sensibles no se guarden en claro en la base de datos, para que quien acceda a la base no los lea directamente.
- Dado un dato clínico sensible (historia clínica, valores de los formatos), cuando se guarda, entonces en la base queda cifrado.
- Dado un usuario autorizado, cuando consulta el caso por la API, entonces ve el dato descifrado.
- Dado que falta la llave de cifrado, cuando arranca el backend en producción, entonces se niega a iniciar (no guarda en claro).

Estado: **Pendiente** (**PROPUESTA** surgida en la sesión 1: hoy los datos quedan en claro; falta decidir qué campos son sensibles)

### HU-08: Usar la aplicación desde una URL pública
Como **docente evaluador**, quiero abrir la aplicación en una URL pública, para ver el funcionamiento sin instalar nada.
- Dado la URL pública, cuando la abro, entonces carga la interfaz por HTTPS.
- Dado un usuario de demostración, cuando inicio sesión, entonces recorro el flujo completo hasta el PDF.
- Dado el repositorio público, cuando reviso sus archivos, entonces no hay ninguna llave, clave ni token (solo `.env.example` en blanco).

Estado: **Pendiente** (el despliegue automatizado existe y se probó con Docker en local; no se ha desplegado en un servidor real)

### HU-09: Conocer cómo se usa y cómo se despliega
Como **nuevo integrante o evaluador**, quiero un README actualizado, un manual de usuario y un manual de despliegue, para entender qué hace el sistema y ponerlo en marcha.
- Dado el README de cada repositorio, cuando lo leo, entonces sé qué problema resuelve, el stack, las variables de entorno (en blanco) y cómo ejecutarlo.
- Dado el manual de usuario, cuando lo sigo, entonces puedo completar el flujo de HU-02 a HU-05.
- Dado el manual de despliegue, cuando lo sigo, entonces sé qué secretos y qué servidor necesito.

Estado: **Pendiente** (los repositorios nuevos tienen un README mínimo)

### HU-10: Verificar cada cambio con pruebas automáticas
Como **desarrollador**, quiero que cada push ejecute las pruebas, para detectar errores antes de fusionar.
- Dado un push a `main` o un pull request, cuando corre el CI, entonces ejecuta las pruebas unitarias, de integración y la compilación.
- Dado un cambio que rompe una prueba, cuando corre el CI, entonces falla y lo muestra.
- Dado un CI en verde, cuando se construye la imagen Docker, entonces se construye sin publicarse.

Estado: **Hecha** (CI en verde en los dos repositorios). **Pendiente** traer al repositorio las pruebas funcionales y de rendimiento del módulo 4.

## No funcionales

| Atributo | Requisito medible | Estado |
|---|---|---|
| Rendimiento | La API responde en menos de 500 ms en el 95 % de las peticiones (excepto el inicio de sesión) | Cumple en las pruebas del módulo 4 (8 de 9 objetivos) |
| Rendimiento (login) | El inicio de sesión responde en menos de 500 ms con bcrypt | **No cumple** hoy (el costo 12 de bcrypt lo supera); decidir entre bajar el costo o relajar el objetivo |
| Seguridad | Contraseñas con hash bcrypt; ninguna llave de API, clave ni token en el repositorio | Cumple (revisado antes de publicar; `.env.example` en blanco) |
| Seguridad | Todo endpoint privado exige JWT; lo de otra organización responde 404 | Cumple (31 operaciones verificadas) |
| Disponibilidad | La URL pública responde durante toda la sustentación (19 de noviembre) | Pendiente (depende de HU-08) |
| Usabilidad | Una persona nueva completa el flujo (crear caso, cargar historia, aceptar sugerencias) en menos de 5 minutos con el manual | Pendiente de medir |

## Cambios frente a la IA

Al preparar este documento con ayuda de IA se dejó fuera lo siguiente, por no aplicar al proyecto o depender de terceros (revisar y ajustar con criterio propio antes de sustentar):

1. **Validación con usuarios finales y con el área jurídica:** descartada. Depende de terceros (clínica, abogados) y no se puede cerrar en la semana; el docente pidió limitarse a lo que depende solo del equipo.
2. **Integración con los sistemas de información de la clínica:** descartada por la misma razón y por no ser parte del producto actual.
3. **Pantallas completas para el superusuario:** descartadas. El rol existe pero sin funciones propias; no hay tiempo para diseñarlas bien.
4. **Notificaciones por SMS o WhatsApp:** descartadas. El código llega por correo; no hay ningún adaptador de otro canal en el código.
5. **HU-07 (cifrado):** se mantiene como **PROPUESTA** porque nació de una sugerencia del docente en clase, no del código existente.
