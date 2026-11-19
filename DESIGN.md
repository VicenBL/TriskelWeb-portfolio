# TriskelWeb — Jerarquía tipográfica y continuidad visual

## Pantalla pública de construcción

La entrada `/construccion` presenta el símbolo original `triskel-simbolo.png` sobre negro cálido `#120c08`, sin fotografía de fondo ni logotipo tipográfico. Conserva transparencia y proporción 1260 × 1357, con anchura responsive de 200–280 px. El H1 usa Georgia, peso 400 y escala propia de entrada; el texto y los controles mantienen Helvetica/Arial, marfil y dorado apagado. La composición centrada dispone símbolo, título, descripción y formulario en una columna, con controles de 48 px y foco visible. Los errores están asociados al campo y se anuncian mediante `role="alert"`.

Se inspeccionaron 1440, 768, 390 y 320 px sin desbordamiento y se comprobó en navegador el acceso y la salida con credenciales sintéticas. La Home aprobada conserva su composición tras autenticar. La entrega de imágenes privadas cambia a originales protegidos: se preservan dimensiones/recortes, pero no se afirma optimización mediante el endpoint público. Sólo el símbolo de construcción usa el optimizador. La configuración y sus límites se describen en [vista previa privada](docs/setup/private-preview.md).

## Alcance y elementos conservados

El hero aprobado conserva íntegros su código, fotografía, logotipo con sombra, capas atmosféricas, CTA y comportamiento responsive. La estructura de Biografía, Música, Galería, dossier y tienda se conserva. Las identidades y Biografía con ancla compatible se conservan. Se conservan el vídeo editorial dentro de Música y los perfiles oficiales antes del footer. El cierre visual retira únicamente la marca del footer, amplía sus columnas, suaviza el separador y alinea el título social con la escala H2 compartida. No modifica la composición musical, los recortes de Galería ni el hover del header.

Se mantienen Next.js, React, TypeScript, CSS Modules y componentes de servidor. No se añaden dependencias, fuentes, carruseles, reproductores, animaciones de scroll ni lógica de cliente.

## Música: composición y transición

Música abandona la alternancia entre grandes portadas y títulos externos. El encabezado mantiene Georgia y utiliza la escala común de los títulos de sección, de 28,8–48 px con tamaño raíz de 16 px. Las carátulas forman una única fila de cuatro columnas desde 1024 px; por debajo, una cuadrícula de dos columnas y dos filas. Los espacios son uniformes, de 12–24 px. No hay marcos, esquinas redondeadas, sombras exageradas ni desplazamiento horizontal.

El fondo propio se concentra en un pseudo-elemento aislado dentro de Música: gradiente desde `#0A0908` hacia `#050505`, que termina desvaneciéndose hacia el fondo cálido existente. Un `clip-path: polygon(...)` crea una entrada ligeramente diagonal de 32 px. El corte reconoce el cambio de ambiente sin construir cuatro paneles separados; la salida recupera progresivamente la atmósfera de la Home. El fondo compartido de las demás secciones no se modifica.

Cada portada conserva el diseño completo mediante `object-fit: contain` dentro de un espacio cuadrado. Esto respeta las pequeñas diferencias de proporción de los originales de Arenas, Resaca y Taberna. Los nombres permanecen en H3 ocultos solo visualmente, asociados a cada artículo mediante `aria-labelledby`; las imágenes mantienen textos alternativos específicos.

## Jerarquía tipográfica

La Home conserva dos familias funcionales: Georgia con alternativas `"Times New Roman", serif` para los títulos de sección y la identidad textual del footer; `Helvetica, Arial, sans-serif` para lectura, navegación, acciones y etiquetas. La biografía se renderizó con Arial local en el navegador inspeccionado. La declaración de Helvetica no significa que esté instalada ni descargada; no se detectaron fuentes web. El ámbito `.site` sustituye la pila global Inter/system, por lo que no se añaden fuentes ni se modifica el ámbito de otras pantallas.

| Función | Regla |
| --- | --- |
| Títulos H2 de Biografía, Música, Galería, Contratación, Tienda y Sigue a Triskel | Georgia, peso 400, `--section-title-size: clamp(1.8rem, 3.5vw, 3rem)`, interlineado 1,2. Medidos a 48 px en 1440 y 28,8 px en 768, 390 y 320. |
| Separación de título y contenido | `--section-title-gap: clamp(1.25rem, 2vw, 1.75rem)`. El margen base evita que el reset de la página anule la separación de Galería. Contratación y Tienda conservan la separación propia de su grid o flex. |
| Texto de lectura | Biografía de 16–19 px, interlineado 1,8–1,85 y medida máxima de 58 caracteres; no se iguala a títulos ni controles. |
| Mensajes y disponibilidad | Descripción profesional de 17 px; disponibilidad y estado de tienda de 15 px. Siguen siendo párrafos, no títulos competidores. |
| Etiquetas y metadatos | Nombres de Galería de 14–16 px; funciones de 12–13 px. Se mantienen las diferencias entre identificación y función. |
| Navegación y acciones | Navegación de escritorio de 15 px en negrita; CTA principal de 15–16 px en negrita. Se conservan el hover radial aprobado y los estados existentes. |
| Niveles secundarios del footer | Sin logotipo ni eslogan; títulos Georgia de 18 px, enlaces de 15 px y textos de 13–14 px. No compiten con los títulos principales de la Home. |

La semántica conserva un H1 de identidad oculto visualmente, seis H2 principales de sección y los H3 accesibles de los cuatro lanzamientos. Las excepciones de tamaño que hacían Música de 72 px y Tienda de 24 px se retiran únicamente en los títulos pares. No se modifican las portadas, el mosaico ni los recortes.

Con texto al 200 % a 320 px, el espacio del logotipo del header antes no podía reducirse y desplazaba el menú hasta 333 px de anchura documental. Su base móvil sigue siendo de 120 px, pero puede contraerse únicamente cuando falta espacio; la imagen mantiene proporción y el enlace conserva 44 px de altura mínima. La geometría normal del header y del hero permanece igual a la referencia. La comprobación posterior no registró desbordamiento ni a 320 ni a 390 px con ese aumento de texto. Esta simulación no sustituye todas las modalidades de zoom o dispositivos físicos.

## Interacción diferenciada

### Escritorio con hover y puntero fino, desde 1024 px

En reposo se ve la portada. Al pasar el cursor o enfocar sus enlaces con teclado, solo la imagen recibe `blur(5px) brightness(0.45)`. Spotify y YouTube aparecen por encima, con sus iconos y textos nítidos. No hay escalado, movimiento ni cambios de tamaño.

La aparición utiliza opacidad, no `display: none` ni `visibility: hidden`, de modo que los enlaces siguen disponibles en la secuencia de teclado. `:focus-within` revela el grupo y `:focus-visible` dibuja un contorno interior contrastado. Al salir el cursor, se restaura la portada, salvo que un control conserve el foco.

Las transiciones de filtro y opacidad duran 180 ms y solo se habilitan con `prefers-reduced-motion: no-preference`. Con movimiento reducido, los cambios de estado siguen funcionando sin transición.

### Móvil, tableta y ausencia de hover fino

Las dos acciones permanecen visibles sobre una franja inferior translúcida. Cada destino tiene un enlace independiente con objetivo mínimo de 44 × 44 px, icono monocromo y nombre de plataforma. No hace falta pulsar antes la portada para descubrirlos. La portada completa no es un enlace.

Los filtros de desenfoque no se aplican en móvil. La cuadrícula 2 × 2 permite contemplar los cuatro lanzamientos sin recorrer cuatro imágenes de ancho casi completo.

## Datos, enlaces y rendimiento

`src/components/music/releases.ts` centraliza los cuatro títulos, sus rutas y dimensiones y las ocho URLs HTTPS exactas proporcionadas por el propietario. `MusicSection` y `ReleaseFeature` siguen siendo componentes de servidor reutilizables. Se conserva el soporte de URLs opcionales sin generar controles vacíos.

Las acciones tienen nombres como «Escuchar Inquebrantable en Spotify» y «Ver Inquebrantable en YouTube». Utilizan enlaces HTTPS normales y SVG ligeros, sin SDK, protocolos personalizados, detección de aplicaciones, pestañas forzadas, autoplay ni reproducción incrustada. No existe un enlace global a un álbum no proporcionado.

Los ocho endpoints oficiales oEmbed respondieron HTTP 200. Seis títulos coinciden con los del propietario; las dos plataformas publican «La Taberna del Trisquel». La web conserva «La Taberna del Triskel» y los enlaces facilitados, sin corregir la grafía silenciosamente. Los metadatos no acreditan reproducción regional ni apertura de aplicaciones en un dispositivo físico.

Se carga una sola imagen por lanzamiento mediante `next/image`, con carga diferida y `sizes` ajustado a la cuadrícula. En vista previa el loader conserva la URL del original autenticado y no remuestrea su anchura. Se retiran las cuatro imágenes de fondo adicionales y sus filtros permanentes. Los originales no se alteran.

## Galería de integrantes

Galería prolonga la atmósfera cálida de las secciones inferiores con un mosaico editorial de siete retratos originales, no tarjetas uniformes. En escritorio se disponen cuatro columnas con Joseph ocupando dos filas; en móvil se compactan a dos columnas y el retrato de Fátima ocupa el ancho completo. CSS mantiene un `object-position` individual para escritorio y móvil, sin modificar ni recortar físicamente los JPEG. Los rostros y los instrumentos presentes en cada fotografía se mantienen dentro del encuadre; el encuadre de Fátima conserva su rostro en la banda superior.

Los nombres y funciones se muestran permanentemente en dispositivos móviles y al enfocar con teclado; únicamente el escritorio con puntero fino los revela mediante hover. Los enlaces tienen nombre accesible y conservan como destino directo cada fotografía original. El visor usa un `<dialog>` modal nativo con controles de anterior/siguiente, flechas, Escape, retorno del foco al enlace activador y ciclo explícito de Tab entre los controles para impedir que el foco salga del visor. El detalle usa `next/image` con `contain`; la cuadrícula utiliza carga diferida y `sizes` adaptados a su anchura. El movimiento de las captions respeta `prefers-reduced-motion`.

La revisión visual del build de producción inspeccionó los siete retratos, sus recortes, las identificaciones móviles y la continuidad Música → Galería → Contratación. Se comprobaron los cuatro tamaños de pantalla (1440, 768, 390 y 320 px), las imágenes optimizadas, la interacción táctil, ausencia de desbordamiento y texto al 200 %. La comparación geométrica con la versión anterior no terminó correctamente: a 768 px, Música midió 871,9375 px frente a 885,4375 px en la referencia. Una comprobación independiente reprodujo ambas medidas en el mismo build y observó que `clientWidth` cambia de 753 a 768 px al retirar la barra de desplazamiento; las dos filas cuadradas ganan conjuntamente 13,5 px. La referencia se midió después de esa captura y la versión actual antes. No se observó una regresión en Música ni se modificó su código; el fallo de la comparación se conserva como limitación, no como aprobación. La revisión visual automatizada de los archivos fuente no encontró incidencias; la revisión renderizada informó de Helvetica (código 2) y no pudo medir contraste porque la pestaña estaba oculta. La comprobación del visor confirmó 28 aperturas y cierres mediante DOM, foco inicial, imagen seleccionada y retorno al disparador. La comprobación independiente de Tab/Shift+Tab, Escape y flechas no llegó a ejecutarse y queda pendiente. La aceptación visual del propietario sigue pendiente.

## Logotipo del header

El header utiliza `public/brand/triskel-logotipo-sombra-header.png`: PNG transparente de 600 × 216 px y 157.755 bytes, derivado del original de 4096 × 1714 px. Se retiran exclusivamente los márgenes exteriores con alfa cero —rectángulo de origen x180, y186, 3736 × 1348—, conservando la sombra real, y se reduce proporcionalmente.

La imagen se sirve con `next/image` y tamaños de 150 px en escritorio y 120 px por debajo de 1024 px. El header conserva su disposición, navegación, enlace a Inicio y nombre accesible «Triskel, inicio». El alt vacío se conserva porque el enlace ya proporciona el nombre. El hero sigue usando directamente el original aprobado, sin cambios.

## Interacción de navegación del header

Desde 1024 px, con hover y puntero fino, cada enlace del menú de escritorio revela un gradiente radial cálido y semitransparente bajo el texto y escala a 1,10, con origen centrado. La capa decorativa escala a 1,12: junto con el cambio anterior del enlace desde 1,04, la huella elíptica aumenta aproximadamente un 40,3 % de área y un 18,5 % en anchura y altura. Se conservan los márgenes base de la capa (`inset: -0.35rem -0.65rem`) y el desvanecimiento a transparente al 74 %. El ámbar central pasa del 24 % al 32 % de opacidad y el cobre intermedio del 13 % al 18 %, manteniendo visible la fotografía y `pointer-events: none`. La opacidad y la escala se transicionan en 240 ms, sin alterar el flujo ni desplazar enlaces vecinos. El mismo efecto se aplica a `:focus-visible`, manteniendo el contorno de foco existente. Con movimiento reducido, el estado cambia sin transición. La regla no se aplica a la navegación móvil, que conserva su disclosure nativo y objetivos mínimos de 44 px.

## Vídeo editorial y perfiles oficiales

El walkthrough de Rock Imperium se sitúa inmediatamente después de la cuadrícula de lanzamientos, fuera de sus datos y sin modificar las cuatro portadas ni sus ocho acciones. Un bloque de hasta 980 px reúne imagen y texto en dos columnas; por debajo de 768 px se apila. La portada AVIF local conserva sus 900 × 506 px de proporción, sin recorte destructivo. La etiqueta «VÍDEO ESPECIAL», el título «Así vivimos Rock Imperium 2026», la descripción y «Ver en YouTube» distinguen contenido editorial de un single o álbum. El fondo oscuro y el borde cobre tenue acompañan Música, sin crear otro hero.

El CTA es visible sin hover, mide al menos 44 px y conserva el contorno dorado efectivo de la web (`#cc9a55`), por encima del estilo local de respaldo. Su fondo pasa de `#8b572d` a `#9d6235`; la variación es cromática, no geométrica, y no se transiciona con movimiento reducido. La imagen usa `next/image`, `sizes` y carga diferida, sin reproductor ni SDK externo; en vista previa se sirve el original mediante la ruta autenticada.

«Sigue a Triskel», con «Música, vídeos y novedades», ocupa una franja cálida oscura después de Tienda y antes del footer. El H2 hereda Georgia, peso 400, tamaño `var(--section-title-size)` e interlineado 1,2 de la Home, sin escala local alternativa. Título y subtítulo están centrados. Conserva los siete nombres con SVG locales dorados. La composición es de siete elementos por fila en escritorio amplio, 4 + 3 en tableta y 2 + 2 + 3 en móvil: no deja un último perfil aislado. Los enlaces móviles agrupan icono y nombre en vertical, sin scroll horizontal, con objetivos mínimos de 80 px de altura. Hover y foco no alteran dimensiones; se respeta el movimiento reducido.

## Footer e identidad definitiva

El footer no contiene logotipo ni eslogan; se conservan los del header, hero y contenido de identidad. Las dos columnas son Secciones a la izquierda —Biografía, Música, Galería y Contratación— y Contacto a la derecha —Redes y plataformas y Contratación profesional—. Su contenedor centrado tiene un máximo de 60 rem (960 px con raíz de 16 px), separación de 8 rem y texto alineado a la izquierda; hasta 480 px se apilan con separación de 1,25 rem. Un pseudoelemento de 1 px, ancho máximo de 60 rem y degradado transparente → dorado apagado → transparente sustituye el borde superior rígido. El padding superior es 2,5 rem en escritorio y 2 rem en móvil, sin hueco de marca residual. El pie legal conserva su ancho completo; los enlaces mantienen objetivos mínimos de 44 px y foco dorado visible.

El fondo `#17100b` continúa el recorrido cálido; enlaces y texto usan `#c9b186`, con títulos y hover `#fbe5b2`. Una línea dorada tenue separa el año actual, el estado «Información legal en preparación» y el acceso de cliente. No se añaden efectos de movimiento, formularios aparentes ni enlaces legales sin publicar. En el fondo opaco del footer, los textos secundarios y enlaces alcanzan 9,07:1 de contraste; los encabezados marfil, 15,20:1, y el dorado del foco, 7,46:1. El estilo de foco se inspeccionó forzando únicamente el estado CSS: la comprobación interactiva completa de teclado y el contraste del resto de la Home siguen pendientes.

«Redes y plataformas» lleva a `#redes`, con los siete perfiles aportados por el propietario, sin crear otra página. «Contratación profesional» lleva a `#dossier`, con mensaje de formulario próximo. Biografía usa `#biografia`; el alias de altura cero `#banda` mantiene enlaces anteriores sin alterar el layout. Los metadatos conservan folk metal y precisan Cartagena (Murcia).

Joseph D'Folk figura como «Flauta y whistles» y Fátima G «Faty» como «Percusión» en la fuente tipada compartida por Galería y visor; también se actualizan los textos alternativos. No cambian sus fotos, posiciones ni escalas de recorte. La estructura y el contenido legal pendientes se detallan en [preparación legal y privacidad](docs/planning/legal-privacy-readiness.md), no en textos públicos provisionales.

## Verificación actual de vídeo, perfiles y footer

Se comprobaron 1440, 1024, 768, 390 y 320 px en la vista previa existente, con capturas normales de escritorio y móvil. La imagen AVIF carga y conserva proporción; el bloque especial mide aproximadamente 288 px de altura a 1440 y 427 px a 390. Las redes se distribuyen sin elementos aislados y el contenedor del footer coincide con el centro útil del documento en los cinco anchos. El separador degradado mide 1 px y el borde superior del footer es 0 px. El contenedor de columnas alcanza 960 px cuando hay espacio; ambos textos sociales están centrados y el H2 coincide en tamaño, peso, interlineado y familia con Música, Galería y Tienda. No se detectó desbordamiento ni cambios geométricos en los controles comprobados al forzar hover y foco.

Hero y Biografía conservan sus rectángulos; las cuatro portadas, sus acciones y encabezados previos mantienen geometría y destinos. Galería conserva anchura y altura: su desplazamiento vertical por el nuevo contenido es esperado. Los textos nuevos inspeccionados superan 4,5:1; dos pruebas fijan además el contraste del CTA en reposo y hover. Las ocho acciones nuevas tienen transiciones de 0 s con movimiento reducido. El foco efectivo es dorado; se inspeccionó mediante estado CSS, sin repetir la interacción de teclado previamente pendiente. No es una certificación WCAG global.

## Verificación y límites

En la validación histórica de la versión anterior a Galería, 113 pruebas en 19 archivos estaban aprobadas; 15 correspondían a Home y ocho a Música. Typecheck, lint y build terminaron con código 0. La validación técnica actual de Galería y del efecto de navegación está resumida en README.md: 148 pruebas en 25 archivos, con typecheck y lint terminados con código 0. La compilación del mismo código en una copia aislada terminó con salida 0, pero la copia de archivos standalone emitió `EPERM`; no se valida el paquete desplegable. La revisión tipográfica actual sí cuenta con nuevas capturas y mediciones antes/después a 1440, 768, 390 y 320 px, reutilizando la vista previa existente. Las pruebas fijan los ocho destinos bajo sus lanzamientos, la semántica de enlaces, la carga de una imagen, los títulos accesibles, la interacción CSS y la conservación del hero.

En Edge se comprobaron 1440, 768, 390 y 320 px sin desbordamiento horizontal. Las cuatro portadas comparten fila a 1440 px; las demás vistas muestran 2 × 2. Antes de añadir el vídeo editorial, Música medía aproximadamente 612 px en escritorio, 542 px a 390 y 472 px a 320; no son las alturas de la composición actual. Se verificaron los ocho enlaces por teclado con foco visible y, mediante eventos táctiles sintetizados, una pulsación por cada acción en ambos tamaños móviles. La navegación externa se canceló únicamente en la pestaña de prueba para registrar los destinos sin abandonar la página. No se modificó la aplicación para ello.

Hover y salida restauran la portada sin cambiar su tamaño. Las capturas directas del viewport confirman que solo la portada activa se desenfoca y revela sus acciones. Las capturas CDP recortadas mostraron capas fantasma pese a opacidades calculadas cero; se conservan como diagnóstico, no como evidencia del aspecto de escritorio. Se entregan las capturas directas de reposo y hover. Las capturas móviles muestran los cuatro lanzamientos con sus acciones permanentes.

En la comparación histórica de Música, el código y CSS de la página principal, la navegación móvil, el footer y sus estilos compartidos coincidían con su referencia anterior. Aquella corrección tipográfica modificó únicamente la jerarquía y separación de los títulos y el ajuste del espacio del logotipo al ampliar texto; no cambió los componentes del hero, el comportamiento del menú ni el footer. El cierre actual del footer y del título social se describe en sus apartados superiores. Los diez originales conservan sus hashes. La geometría del hero y su logotipo permanece idéntica; la comparación de píxeles por debajo del header no presenta diferencias en escritorio ni móvil. La cabecera se excluye porque su logotipo cambia expresamente.

Texto al 200 % a 390 px y movimiento reducido también comprobados. La revisión visual automatizada no encontró incidencias en las fuentes modificadas (código 0); las vistas renderizadas a 1440 y 390 px señalaron Helvetica (código 2), conservada por formar parte del estilo aprobado. No se verificó el contraste. Las comprobaciones técnicas no sustituyen la aceptación visual del propietario ni certifican conformidad WCAG completa, apertura en aplicaciones físicas o despliegue público.

La revisión guardada de la navegación registra seis efectos individuales sin desplazar enlaces vecinos ni cambiar la geometría del header. El foco visible se inspeccionó de forma programática, no mediante una secuencia real de Tab. Quedan pendientes la comprobación segura de Tab/Shift+Tab, flechas y Escape del visor y el contraste completo. El desbordamiento de 333 px con texto al 200 % a 320 px se reprodujo y corrigió en la revisión tipográfica actual. La comprobación programática previa del CTA del hero no superó su aserción y detuvo esa secuencia: no se aprueban el foco ni las interacciones posteriores por ese intento, ni se deduce un defecto real de teclado. La revisión de capturas existentes no sustituye estas comprobaciones ni la aceptación del propietario.

El dossier descargable, los datos de contratación y la tienda operativa siguen pendientes. No se modifica autenticación, base de datos, API ni pagos.
