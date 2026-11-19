# Producto

## Plataforma

Web.

## Público y finalidad

TriskelWeb es la plataforma oficial de Triskel, banda de folk metal de Cartagena (Murcia) con influencias rock y celtas. Atiende a dos públicos de igual importancia:

- Seguidores y nuevos oyentes que descubren la música, las fotografías y los canales confirmados de la banda.
- Programadores, promotores y prensa que consultan información profesional y, cuando esté disponible, el dossier y el contacto.

La plataforma conserva una base de comercio electrónico y administración a largo plazo. Sus flujos se describen en `docs/planning/`; no forman parte de esta entrega pública. El objetivo inicial de una primera versión en menos de 24 horas era una meta de proyecto, no un plazo de entrega verificado.

## Contexto técnico

La aplicación utiliza Next.js App Router, React y TypeScript; PostgreSQL y Drizzle para los datos comerciales y Firebase Auth para identidad. Firebase Storage sigue previsto. Se conserva esta base sin migraciones innecesarias. La configuración y sus límites se documentan en `docs/setup/`.

## Capacidades implementadas y límites

La entrada pública es `/construccion`, con el símbolo oficial y un único formulario de contraseña. La Home aprobada se conserva tras una sesión de vista previa independiente de Firebase y de la autorización comercial. La protección de páginas, APIs y originales se implementa en servidor, con refuerzo Nginx preparado pero no validado en VPS. Configuración, excepciones, rotación y límites: [vista previa privada](docs/setup/private-preview.md).

- La Home reúne Inicio, Biografía, Música, Galería, Dossier y contratación, Tienda y «Sigue a Triskel». No se crea una página adicional de biografía: `#biografia` es el destino principal y `#banda` conserva compatibilidad con enlaces anteriores y el CTA existente.
- La biografía contiene los hechos confirmados por el propietario. Música muestra cuatro lanzamientos, sus portadas oficiales y ocho enlaces HTTPS concretos a Spotify/YouTube. Después de las portadas se añade el walkthrough de Rock Imperium 2026 como vídeo especial editorial, con portada local y enlace ordinario a YouTube; no es un lanzamiento ni una grabación íntegra. No hay reproducción incrustada ni autoplay.
- Galería utiliza siete retratos individuales, recortes CSS por integrante, dos columnas en móvil y un visor nativo con controles implementados de teclado. La comprobación interactiva completa de teclado sigue pendiente; no se confunde implementación con verificación.
- El footer prescinde de logotipo y eslogan y conserva dos grupos: Secciones —Biografía, Música, Galería y Contratación— y Contacto —Redes y plataformas hacia `#redes` y Contratación profesional hacia la sección informativa—. Las columnas se alinean a la izquierda en un contenedor centrado de hasta 960 px y se apilan en móvil. El separador superior de 1 px tiene un centro dorado apagado y extremos transparentes. Se conservan copyright, estado legal y acceso de cliente en la zona inferior.
- Los siete perfiles oficiales facilitados por el propietario aparecen directamente en `#redes`, tras Tienda y antes del footer: Spotify, Instagram, YouTube, TikTok, Apple Music, Facebook y SoundCloud. La estructura tipada `src/components/social/profiles.ts` es independiente de los enlaces de lanzamientos. El título y subtítulo están centrados; el H2 hereda la escala común de Música, Galería y Tienda. Se muestran nombres e iconos SVG locales y se mantienen las filas responsive; no hay páginas adicionales, contador de seguidores ni afirmaciones de verificación.
- El formulario profesional futuro dependerá del correo de `triskelfolk.es`, de su entrega y del tratamiento de datos. No existe formulario activo, envío, proveedor SMTP ni API de contacto.
- Dossier y contacto continúan anunciados como próximos; no hay descarga ficticia. La tienda permanece «En preparación», sin compras ni pagos aparentes.
- Las rutas legales comparten una estructura preparada pero ningún texto definitivo está publicado. No hay enlaces a documentos inexistentes. La web no está jurídicamente lista para publicación; véase la [preparación legal y de privacidad](docs/planning/legal-privacy-readiness.md).

## Identidad y material aprobado

El nombre de la banda es Triskel; el de la plataforma, TriskelWeb. Se conservan la fotografía natural, la atmósfera cálida cinematográfica y el logotipo dorado, sin modificar originales.

El hero aprobado mantiene composición, fotografía, logotipo con sombra y CTA. La navegación incorpora el hover radial cálido aprobado, escala 1,10 y transición de 240 ms. La jerarquía tipográfica y la corrección de texto ampliado se conservan; el footer incorpora sus propios niveles secundarios sin alterar los títulos principales. Música mantiene el ambiente casi negro, entrada diagonal, cuatro columnas en escritorio y cuadrícula 2 × 2 por debajo de 1024 px. Las secciones restantes conservan la continuidad cálida. El propietario ha aprobado la dirección general del footer; los ajustes de centrado, el vídeo y la sección social quedan pendientes de su aceptación visual.

No se inventan conciertos, fechas, contactos, perfiles, campañas ni disponibilidad comercial.

## Biografía confirmada por el propietario

La Home utiliza una versión resumida en dos párrafos; estos hechos sirven como referencia de contenido, no como obligación de crear otra página:

- Triskel nace en Cartagena (Murcia) por iniciativa de Joseph D'Folk, intérprete de flauta y whistles.
- En 2022 comienza a profesionalizarse con el guitarrista y compositor Ismael Ros, con quien desarrolla repertorio propio.
- Se incorporan el vocalista Manuel Conesa, la violinista Alicia Trillo y el guitarrista Vicente B. «Mesi».
- La banda presenta «Inquebrantable», «La Taberna del Triskel» y «Resaca en Alta Mar». No se han facilitado fechas de lanzamiento. El material posterior incorpora también «Arenas del Tiempo», sin tipo de lanzamiento, fecha ni posición cronológica confirmados.
- Tras actuar en Rock Imperium 2026, Fernando García se incorpora al bajo y Fátima G «Faty» a la percusión, completando siete integrantes.

Identificaciones definitivas de Galería y visor:

| Integrante | Función |
| --- | --- |
| Joseph D'Folk | Flauta y whistles |
| Ismael Ros | Guitarra |
| Manuel Conesa | Voz |
| Alicia Trillo | Violín |
| Vicente B. «Mesi» | Guitarra |
| Fernando García | Bajo |
| Fátima G «Faty» | Percusión |

## Recursos y evidencia

- Marca: `public/brand/triskel-simbolo.png` y `triskel-logotipo.png` conservan sus bytes; `triskel-logotipo-web.png` es una derivada recortada y reducida para web. El hero utiliza `triskel-logotipo-sombra.png`, de 4096 × 1714 px con transparencia. El header utiliza `triskel-logotipo-sombra-header.png`, derivada de 600 × 216 px y 157.755 bytes, sin cambiar el original. El footer no utiliza marca gráfica.
- Fotografías de grupo: `public/images/banda/triskel-promocional-frontal.jpeg` y `triskel-promocional-sentados.jpeg`. La frontal tiene prioridad en el hero móvil y la de integrantes sentados acompaña a la biografía móvil.
- Retratos bajo `public/images/banda/`: `JOSEPH front.jpeg`, `ISMA front.jpeg`, `MANU front.jpeg`, `ALICIA sentada.jpeg`, `MESI front.jpeg`, `FERNANDO front.jpeg` y `FATIMA front.jpeg`. `members.ts` centraliza identidad, función, texto alternativo y recortes; las correcciones de nombres no alteran los archivos ni los encuadres.
- Portadas bajo `public/images/musica/`: `INQUEBRANTABLE_portada.jpg` (1357 × 1357), `TABERNA-portada-baja.jpg` (8496 × 8500), `RESACA-portada.jpg` (1365 × 1357) y `ARENAS-portada-alta.jpg` (1335 × 1357). Su orden visual no establece cronología.
- `src/components/music/releases.ts` centraliza los cuatro lanzamientos. Las URLs opcionales `spotifyUrl` y `youtubeUrl` están tipadas para HTTPS; las ocho están informadas y tienen acciones separadas con nombres accesibles y SVG ligeros. Se mantiene una imagen con dimensiones y carga diferida por portada; durante la vista previa se entrega el original por una ruta autenticada, no por el optimizador público y no se añade SDK, reproductor, CMS ni tabla musical.
- La portada del walkthrough `public/images/media/wakthrough-portada.jpg.avif` es AVIF de 900 × 506 px y 60.401 bytes. Muestra la estructura del escenario y el logotipo de Triskel; se reutiliza sin modificaciones, con dimensiones y carga diferida; su entrega original está protegida por sesión. El bloque se titula «Así vivimos Rock Imperium 2026» y no modifica el listado de cuatro lanzamientos.
- Las ocho URL nuevas respondieron HTTP 200. El vídeo y cinco perfiles devolvieron títulos identificables; el canal de YouTube respondió sin título y con parámetros propios, y TikTok devolvió contenido genérico. Se conservan los destinos limpios del propietario; no se certifican reproducción, titularidad o funcionamiento regional.
- Los ocho endpoints oEmbed oficiales respondieron HTTP 200 en una comprobación anterior. Seis títulos coincidían; ambos destinos de Taberna usan «La Taberna del Trisquel». Se conserva «La Taberna del Triskel», aportado por el propietario, y las URLs originales. Los metadatos no demuestran reproducción regional ni apertura en aplicaciones físicas.
- Los PNG de marca tienen transparencia; las fotografías JPEG no. Las decisiones de composición, tamaños y límites de verificación se describen en [DESIGN.md](DESIGN.md).
- La inspección de recursos no acredita derechos de publicación ni atribución fotográfica. Siguen pendientes de confirmación.

## Preparación legal y privacidad

La solicitud de registro de nombre y logotipo comunicada por Joseph no determina por sí sola quién presta la actividad de la web, quién es responsable del tratamiento o quién será vendedor. Falta confirmar esas funciones y una dirección válida aplicable con asesoría; no se sustituye el domicilio por una localización genérica ni se publican datos ficticios.

La visita local a Home sin sesión no dejó cookies ni almacenamiento observado. Existe por separado una cookie persistente de autenticación y una integración de Firebase: su necesidad, duración, persistencia y condiciones deben revisarse antes de afirmar una exención o conformidad en producción. No se incorpora un banner de cookies, analítica, publicidad o newsletter por defecto.

Los textos legales definitivos deberán ser accesibles sin contraseña aunque se publique una pantalla de construcción. La protección de vista previa respeta esas rutas y su registro de publicación: los documentos aún no aprobados siguen devolviendo 404. Los datos, decisiones, fuentes y requisitos del futuro formulario se recogen en el documento de preparación enlazado, sin almacenar identificadores sensibles de trabajo.

## Principios de producto

1. Dar igual prioridad al descubrimiento musical y la consulta profesional.
2. Publicar hechos confirmados, no contenido inventado.
3. Entregar una web pública cuidada antes de activar comercio.
4. Reutilizar la base técnica sin ampliar innecesariamente el alcance.
5. Distinguir siempre lo implementado, lo verificado y lo pendiente; las pruebas técnicas no sustituyen revisión visual ni jurídica.
