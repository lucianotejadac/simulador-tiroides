# Simulador de tiroides

Simulador educativo para componer la página de un cintigrama tiroideo con Tc-99m pertecnetato, con interfaz inspirada en Windows 95. El estudiante carga las cuatro estáticas de su caso, arma la página panorámica 2 × 2 como la del equipo, ajusta techo, piso, zoom y encuadre de cada imagen, señala con flechas las marcas del mentón y la horquilla esternal, y exporta. Al terminar compara con la impresión del informe. No hay cálculos: el trabajo es la presentación.

Sitio: <https://lucianotejadac.github.io/simulador-tiroides/>

## Tutorial

El panel **Tutorial** pregunta al inicio qué caso te asignaron (1 a 10) y guía seis pasos: cargar, reconocer la adquisición, componer la página, ajustar cada imagen, señalar las marcas y exportar. Comprueba contra los archivos cargados que sean los del caso, detecta las dos marcas en la imagen para verificar que las flechas apunten donde corresponde, y señala los tropiezos donde ocurren. `?caso=N` abre el simulador en ese caso.

Enlaces por caso: [1](https://lucianotejadac.github.io/simulador-tiroides/?caso=1) · [2](https://lucianotejadac.github.io/simulador-tiroides/?caso=2) · [3](https://lucianotejadac.github.io/simulador-tiroides/?caso=3) · [4](https://lucianotejadac.github.io/simulador-tiroides/?caso=4) · [5](https://lucianotejadac.github.io/simulador-tiroides/?caso=5) · [6](https://lucianotejadac.github.io/simulador-tiroides/?caso=6) · [7](https://lucianotejadac.github.io/simulador-tiroides/?caso=7) · [8](https://lucianotejadac.github.io/simulador-tiroides/?caso=8) · [9](https://lucianotejadac.github.io/simulador-tiroides/?caso=9) · [10](https://lucianotejadac.github.io/simulador-tiroides/?caso=10).

## Productos

Un PNG por caso, la página panorámica, más un archivo `.renalproject` para retomar el trabajo con **Abrir proyecto…**.

## Archivos

- `index.html`, `tiroides-app.js`, `renal.css`, `tiroides.css`: la aplicación y el editor de página.
- `renal-core.js`, `renal-tutorial.js`: núcleo compartido con los simuladores renales, idéntico en los tres repositorios.
- `tiroides-casos.js`: los casos, con clínica desidentificada, hashes de los archivos, particularidades, preguntas e impresión del informe.
- `vendor/dicomParser.min.js`: dicom-parser (MIT).
- `BITACORA.md`: registro de decisiones.

## Privacidad y alcance

La aplicación funciona íntegramente en el navegador. Los DICOM no se incluyen en este repositorio ni se envían a ningún servidor. Uso docente: no es un programa validado para diagnóstico ni para decisiones clínicas.

## Licencia

© 2026 Luciano Tejada Castro. Distribuido bajo licencia [MIT](LICENSE).
Los componentes y datos de terceros conservan sus propias licencias, indicadas en este documento o junto a ellos.
