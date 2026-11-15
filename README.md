# Memoria Externa

Una bandeja de entrada personal para guardar ideas, enlaces y tareas en el momento en que aparecen y revisarlos después.

**[Abrir Memoria Externa](https://guillermobuenavista17-tech.github.io/memoria-externa/)**

## Cómo se usa

- **Captura.** Escribe o pega algo y pulsa **Guardar**. También puedes usar `Ctrl + Enter` o `⌘ + Enter`. La app propone un tipo para cada entrada.
- **Bandeja.** Revisa las entradas pendientes, fíltralas por tipo y corrige la clasificación si hace falta. Puedes copiar, compartir o archivar cada entrada.
- **Exportar.** En **Bandeja → Exportar y gestionar datos** puedes descargar o copiar un Markdown con las entradas pendientes y archivadas, su tipo y su fecha de captura.

La interfaz se adapta a móvil y escritorio y sigue el modo claro u oscuro del sistema.

## Instalar en iPhone

1. Abre [Memoria Externa](https://guillermobuenavista17-tech.github.io/memoria-externa/) en Safari.
2. Toca **Compartir → Añadir a pantalla de inicio**.
3. Activa **Abrir como app web** si aparece y pulsa **Añadir**.
4. Abre la app desde el icono con conexión y espera a que aparezca **Disponible sin conexión en este dispositivo**. Puedes comprobarlo activando el modo avión y abriendo de nuevo el icono.

## Dónde se guardan tus notas

Las entradas se guardan en el almacenamiento local del navegador. La app funciona sin cuenta y las entradas no se sincronizan entre dispositivos. Si borras los datos del sitio o el navegador libera su almacenamiento, podrías perder las entradas. Exporta las que quieras conservar.

## Ejecutar en local

Dentro de la carpeta del proyecto, ejecuta:

```bash
python3 -m http.server 8000
```

Abre [http://localhost:8000](http://localhost:8000). El proyecto usa HTML, CSS y JavaScript, sin dependencias ni compilación.
