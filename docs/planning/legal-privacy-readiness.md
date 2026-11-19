# Preparación legal, privacidad y contacto

## Estado y límites

Este documento es un inventario técnico y una lista de decisiones previas al despliegue, no un aviso legal ni una política de privacidad definitivos. La web **no está jurídicamente lista para publicación**. Debe revisarse el caso real con una gestoría o profesional jurídico. Una vista previa privada no elimina automáticamente las obligaciones aplicables ni convierte un tratamiento en conforme.

Joseph ha comunicado que la solicitud de registro del nombre y logotipo está a su nombre. Eso no acredita que sea el prestador de la web, el responsable de todos los tratamientos o el futuro vendedor. No se publican domicilios, correos ni identificadores ficticios, ni se guardan NIF o domicilios particulares en este documento.

## Publicación de las páginas legales

- `src/components/legal/legal-documents.ts` reserva las claves `aviso-legal`, `privacidad` y `cookies` y el formato común de título, fecha de revisión y apartados.
- El registro de documentos aprobados está vacío. La ruta `src/app/(legal)/[legalDocument]/page.tsx` responde con 404 mientras no exista el documento; no publica borradores. El footer no enlaza a esas rutas y muestra «Información legal en preparación».
- El registro es una lista de publicación editorial, no una validación jurídica automática. Solo se añadirán textos completos, revisados y aprobados, sin ejemplos ni datos provisionales. Antes de activarlos se validarán contenido, URL, acceso público y enlaces del footer. `/cookies` se incorporará solo si el inventario definitivo justifica una página separada; la información técnica pertinente puede integrarse en privacidad.
- Los documentos se renderizan en servidor, con semántica de lectura y estilo compartido, sin autenticación en esa ruta. Existe una pantalla pública de construcción y un control de vista previa independiente de Firebase; no se ha validado todavía en un VPS. Véase la [configuración de acceso privado](../setup/private-preview.md).
- **Contrato de la protección:** permitir el acceso público directo a `/aviso-legal`, `/privacidad` y, si se publica, `/cookies`, y a sus recursos necesarios, antes de aplicar cualquier contraseña o pantalla de construcción. Comprobar desde un navegador sin sesión que devuelven 200, texto completo y ningún redireccionamiento a login. La política implementada exceptúa estas rutas y se ha comprobado que siguen devolviendo 404 con el registro vacío; el caso 200 con textos definitivos deberá probarse cuando exista contenido aprobado.

## Inventario técnico

La observación local usa una visita nueva a la Home sin iniciar sesión. No se ha autenticado una cuenta real ni se han probado Firebase, PostgreSQL, correo o infraestructura de producción de extremo a extremo.

| Elemento | Hecho comprobado / fuente | Consecuencia y pendiente |
| --- | --- | --- |
| Cookies de la visita pública | En un contexto de navegador nuevo, la Home no dejó cookies en su origen, incluidas las consultadas por la interfaz de red, no solo `document.cookie`. | No demuestra ausencia de cookies en login, otras configuraciones o producción. |
| Almacenamiento de Home | `localStorage`, `sessionStorage` e IndexedDB estaban vacíos en esa visita. No se hallaron llamadas directas de la aplicación pública a los dos primeros almacenes. | Repetir con los flujos y tecnologías de producción. No equivale a auditar todos los comportamientos internos de los SDK. |
| Vista previa privada | `triskelweb_preview`, dos horas, `Path=/`, `HttpOnly`, `SameSite=Lax`, `Secure` en producción; sólo se emite tras una contraseña correcta. No contiene identidad personal ni sustituye la cuenta de cliente. | Finalidad de acceso privado solicitado; no se activa en la mera visita a construcción. Revisar información, necesidad, duración y registros operativos antes del despliegue, sin declarar automáticamente una exención. La rotación y los límites de revocación figuran en la guía de acceso privado. |
| Sesión propia | `src/services/app-session.ts`: cookie `triskelweb_session`, duración predeterminada de siete días, `Path=/`, `HttpOnly`, `SameSite=Lax`; `Secure` se activa en producción desde los handlers. | Finalidad de autenticar la cuenta solicitada, no de analítica. `HttpOnly` impide inspeccionarla con JavaScript de página. Duración persistente y necesidad deben justificarse antes de declarar la exención. No se ha cambiado su configuración. |
| Inicio/cierre y estado de sesión | `/api/auth/session` ofrece GET, POST y DELETE. Tras superar la vista previa, GET sin cookie de cliente devuelve estado no autenticado con HTTP 200; sin sesión de vista previa la nueva guarda impide ejecutar el handler; POST verifica el ID token y la cuenta vinculada; DELETE expira la cookie. | Trata identificadores y atributos de cuenta. La visita local no prueba un inicio de sesión real. No enviar contraseñas a este endpoint: el cliente las presenta a Firebase. |
| Administración | `/api/admin/session` comprueba sesión y autorización. En la visita sin sesión devolvió 401. | No es un panel ni un flujo de comercio completo. No se han cambiado sus permisos. |
| Firebase Auth | `firebase-client.ts` usa `getAuth` sin configurar explícitamente persistencia; `LoginForm.tsx` contiene acceso con correo/contraseña y cierre de sesión. La verificación de tokens del servidor consulta certificados públicos de Google. | Datos de identidad y tráfico a un tercero en autenticación; revisar configuración, persistencia real del SDK, proveedores, condiciones, destinatarios y transferencias. No se ha confirmado el almacenamiento del SDK tras una autenticación real. |
| PostgreSQL | El repositorio de cuentas consulta UID, correo, nombre, identificadores, verificación y atributos de autorización. | Son datos personales aunque la Home no solicite datos. Definir responsable, acceso, conservación y medidas de seguridad. No se ha ejecutado un flujo real de cuenta contra producción. |
| Música y perfiles oficiales | Ocho enlaces HTTPS ordinarios a los cuatro lanzamientos, un enlace al walkthrough de Rock Imperium y siete perfiles facilitados por el propietario, centralizados por separado en `social/profiles.ts` y visibles en `#redes`. Imagen local y SVG, sin embeds, SDK, autoplay ni reproductores. | Son enlaces a terceros, no recursos incrustados. La navegación externa conduce a sus plataformas; no se ha auditado su reproducción ni sus tecnologías una vez que el visitante sale del sitio. |
| Imágenes y fuentes | Recursos locales servidos por la aplicación; tipografía de sistema. La visita observada solo registró recursos del mismo origen. | No se detectaron fuentes remotas, analítica ni píxeles en esa visita. Confirmar CDN, proxy y cabeceras finales al desplegar. |
| Scripts y métricas | En el código público inspeccionado no aparecen analítica, publicidad ni newsletter. Los recursos de desarrollo de la aplicación no acreditan el comportamiento de producción. | No se ha añadido ningún script externo. Repetir inventario en el build servido en producción. |
| Contacto y correo | No hay formulario activo, API de contacto ni envío. El footer remite a la sección informativa. | El tratamiento futuro no existe todavía; requiere las decisiones descritas más abajo. |
| VPS y operación | Aún no se han verificado proxy, registros de IP/errores, copias de seguridad, alojamiento, DNS, CDN ni correo. | Identificar encargados, ubicación, accesos, contratos, conservación y posibles transferencias antes de desplegar. |

## Cookies y consentimiento

No se implanta un banner por defecto: en la visita pública inspeccionada no se identificaron tecnologías no esenciales que lo requieran. Esto no autoriza a introducirlas después sin nueva evaluación ni constituye una declaración global de exención.

El artículo 22.2 LSSI exceptúa el almacenamiento/acceso técnico necesario para la transmisión o para prestar un servicio expresamente solicitado. Las tecnologías estrictamente necesarias para autenticar y proteger un acceso solicitado pueden encajar en esa excepción si se usan exclusivamente con esa finalidad y con alcance y duración justificados; se informará de ellas por transparencia aunque no requieran consentimiento.

**La cookie actual es persistente, no únicamente de sesión.** La guía de la AEPD enumera la autenticación «únicamente de sesión» y exige relacionar caducidad y finalidad. No se declara automáticamente exenta la duración actual de siete días. Revisar necesidad y caducidad, la persistencia de Firebase y cualquier almacenamiento equivalente con la configuración definitiva. Si se identifican finalidades sujetas a consentimiento, habrá que impedir su activación previa e implementar la elección adecuada; no se realiza en esta tarea.

## Datos que faltan para los textos definitivos

1. Identidad y condición del prestador de la web, responsable de tratamientos y, por separado, eventual vendedor. Confirmar si coinciden; no deducirlo de la solicitud de marca.
2. Domicilio o dirección válida aplicable y contacto directo efectivo. Joseph no desea publicar su domicilio particular: consultar un domicilio profesional alternativo jurídicamente admisible; no sustituirlo por «Cartagena», una dirección inventada o un apartado postal sin análisis.
3. Identificación fiscal y datos registrales o profesionales cuando correspondan. Recabarlos por un canal seguro; no incorporarlos a notas o plantillas del repositorio por anticipado.
4. Derechos y autorización de uso de marca, fotografías y demás contenidos; situación real de la solicitud de registro.
5. Proveedores efectivos de alojamiento, autenticación, correo y copias; contratos de encargo cuando procedan, ubicación, destinatarios y transferencias.
6. Finalidades, bases jurídicas, plazos o criterios de conservación, ejercicio de derechos, contacto responsable y reclamación ante la AEPD. Representante o delegado solo si proceden.
7. Inventario real de cookies/almacenamiento y registros de producción, con duración, finalidad y necesidad; resolver la persistencia de autenticación.

El artículo 10 LSSI incluye los requisitos de identificación, domicilio/establecimiento y contacto del prestador sujeto a la ley. La asesoría debe determinar la aplicación al modelo real y los datos exigibles; no basta una declaración genérica de marca para completar el aviso legal.

## Futuro `/contacto`: requisitos sin implementación

- Campos: nombre, correo electrónico, asunto o motivo y mensaje; recoger únicamente lo necesario. No añadir documentos, identificadores o teléfonos por defecto.
- Validar tanto en cliente como en servidor: formato, obligatoriedad, longitudes y tamaño total; devolver errores accesibles sin perder el mensaje. Evitar inyección de cabeceras y no usar texto del visitante como remitente del dominio.
- Protección antispam proporcionada y limitación de envíos en servidor. No añadir servicios externos ni captcha sin evaluar sus datos y tecnologías. Definir los identificadores y la conservación de cualquier limitador que trate IP u otros datos.
- Transporte HTTPS, acceso mínimo a mensajes y credenciales, secretos fuera del cliente y del repositorio, logs sin contenido ni credenciales; definir conservación y eliminación.
- Información de privacidad en el propio formulario, por capas, enlazada a una política completa: responsable, fines, base jurídica, conservación, destinatarios/transferencias y derechos según proceda.
- No asumir el consentimiento como base universal. Una petición precontractual puede requerir una base distinta de una consulta general; concretar finalidad y base aplicable con la asesoría, incluido el análisis necesario si se usa interés legítimo. No incorporar aceptación comercial obligatoria ni suscripción implícita.
- Contratar/configurar el correo profesional de `triskelfolk.es`, decidir entrega y proveedor, permisos y condiciones de tratamiento; configurar y verificar los mecanismos del dominio que procedan antes de enviar.
- Definir confirmaciones de éxito/error y comportamiento ante fallos, duplicados y limitación. Solo mostrar envío disponible cuando funcione realmente.

No se ha creado `/contacto`, proveedor SMTP, API, buzón ni envío real.

## Fuentes oficiales

- [BOE: Ley 34/2002, artículos 10 y 22.2](https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758). Los datos fiscales se recogen en el artículo 10.1.e.
- [AEPD: Guía sobre el uso de las cookies](https://www.aepd.es/guias/guia-cookies.pdf), especialmente autenticación de sesión, excepción técnica y duración de cookies persistentes.
- [AEPD: información cuando los datos se obtienen del interesado](https://www.aepd.es/preguntas-frecuentes/2-tus-obligaciones-como-responsable-del-tratamiento/6-el-deber-de-informacion/FAQ-0217-que-informacion-debe-facilitarse-cuando-los-datos-se-obtengan-directamente-del-afectado).
- [RGPD, artículos 6 y 13, EUR-Lex](https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32016R0679).

Las fuentes orientan los requisitos; este inventario técnico no sustituye la revisión jurídica del caso ni certifica cumplimiento.
