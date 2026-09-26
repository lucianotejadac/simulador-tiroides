# Bitácora de decisiones

Registro de lo que se pidió, lo que se decidió y por qué, para el simulador de tiroides. Esquema de un registro de decisiones (ADR): contexto, decisión, alternativas descartadas, consecuencias. Las decisiones comunes con los simuladores renales están en `simulador-dmsa/BITACORA.md`.

Sin datos de pacientes.

---

## 2026-09-23 · Un simulador de presentación, no de cálculo

Participantes: Luciano Tejada (docente) y Claude (Claude Code).

### 1. Qué había y qué se decidió incluir

**Contexto.** Diez casos reales de cintigrafía tiroidea con pertecnetato, cuatro estáticas por caso (anterior, anterior con marcas, OAD y OAI), 256 × 256, píxel de 1,05 mm, paro a 500 kcuentas. El producto del equipo es una sola página panorámica 2 × 2. El caso 7 no tiene informe legible.

**Decisiones.** Se incluyen los diez casos; el 7 entra «sin informe» y el tutorial lo adapta: la descripción del alumno es el producto. Se entregan solo los cuatro crudos por caso, desidentificados con el mismo procedimiento de la entrega renal. La imagen con marcas del caso 3, interrumpida a los 39 s, se conserva como particularidad.

**Descartado.** Una regla en milímetros sobre la imagen. Se discutió y se dejó fuera: a esta resolución y con la ventana elegida el tamaño aparente cambia varios milímetros, y la medida induciría a error. La discusión de por qué no se mide queda como pregunta oral.

### 2. Editor de página como centro

**Decisión.** El simulador es un editor de página: cuadros que se arrastran y redimensionan con el mouse, ajustes de techo, piso, zoom y encuadre por imagen, rótulos editables, encabezado y pie, y flechas con texto. Las cuatro imágenes caen por omisión en la ranura que les corresponde en la página del equipo, pero el alumno puede desordenarlas y el tutorial le dice dónde las pone el equipo.

**Comprobación de las marcas.** El simulador detecta las fuentes puntuales restando la anterior sin marcas de la anterior con marcas, suavizando y buscando picos compactos: el pico debe superar con holgura la media de un anillo de 5 a 8 píxeles a su alrededor. Los residuos de la tiroides quedan entre 0,4 y 0,62 de compacidad; las fuentes, entre 0,67 y 0,94. Una segunda marca cuenta si es compacta y no baja del 15 % de la primera. El nombre sale de la posición respecto del centro de la glándula: arriba, mentón; abajo, horquilla esternal. Con eso verifica que la punta de cada flecha caiga sobre una marca, que el texto diga cuál es y que la marca quede dentro del encuadre. Ocho casos tienen dos marcas y dos casos, el 2 y el 10, solo la de la horquilla, como en las páginas del equipo.

**Descartado.** Construir sobre el `index.html` del simulador óseo; se tomó su lógica, no su código, para mantener el núcleo compartido con los renales.

### 3. Validación

Prueba sin interfaz sobre los 10 casos: carga y reconocimiento por hash, adquisición, agregado en orden de clic arbitrario, arrastre de una imagen al lugar de otra y su detección, reordenamiento automático, ajustes por la interfaz, flecha dibujada con el mouse, flecha con texto equivocado detectada, flechas correctas aceptadas, exportación, cierre con impresión o aviso de «sin informe», y archivo de otro caso. 181 comprobaciones, 0 fallas.

### Línea del panel al control (26-09-2026)

El panel compartido `renal-tutorial.js` tira ahora una línea de puntos animada desde su borde hasta el control resaltado, con `tutorial-linea.js` (idéntico en los cinco simuladores). Idea tomada de la consola TC; decisión y validación en la bitácora de `simulador-cardiaco`, sección 10. Solo cambia la guía visual; los cálculos no se tocaron.

### Pendientes

- Probar el arrastre y el redimensionado con una mano real; las pruebas usan eventos de puntero sintéticos.
- Cuando el paso actual del tutorial se completa, el simulador salta a la pantalla del paso siguiente. Es la conducta de los tres simuladores; conviene observar si desconcierta a los alumnos.
