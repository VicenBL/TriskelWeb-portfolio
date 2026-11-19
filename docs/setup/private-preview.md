# Vista previa privada y pantalla de construcción

**Estado de revisión:** cierre pendiente por validación independiente incompleta. El defecto Unicode se reprodujo (la contraseña exacta con ñ devolvía 401 tras generar su hash) y se corrigió. Las 32 pruebas focalizadas del implementador pasan. Un verificador independiente completó 16 comprobaciones de Unicode, variantes, atributos de cookie y errores de lectura, pero su arnés falló antes de completar sesiones, rutas y recursos. No se repitió esa comprobación ni se declara aprobación de seguridad o producción. La terminal TTY real sigue sin validarse.

## Alcance y separación de responsabilidades

`/construccion` es la entrada pública de TriskelWeb. Usa el símbolo original `public/brand/triskel-simbolo.png`, sin sustituirlo ni cambiar sus bytes. Un único formulario permite acceder a la Home en el mismo dominio. No se utiliza autenticación HTTP Basic ni un segundo formulario de vista previa.

Son tres controles distintos:

1. **Vista previa:** contraseña compartida y cookie `triskelweb_preview`; permite consultar el sitio privado.
2. **Identidad de cliente:** Firebase Authentication y `triskelweb_session`; conserva su implementación independiente.
3. **Autorización comercial:** guardas internas, incluida la condición administrativa. Una sesión de vista previa no convierte al visitante en cliente ni administrador.

No hay VPS contratado/configurado ni despliegue HTTPS validado. La configuración de `deploy/` es una propuesta ejecutable que requiere validación en el host real, no una garantía de producción.

## Barreras de acceso

| Capa | Comportamiento |
| --- | --- |
| Middleware Node de Next.js 15.5 | Comprueba la sesión antes de continuar y aplica política de caché/indexación. No es la única barrera. |
| Páginas privadas | Home y `/login` verifican la sesión en servidor antes de producir su contenido. Son dinámicas, no páginas privadas prerenderizadas. |
| API | Las rutas de autenticación, sesión administrativa y health pasan por una guarda de vista previa antes de sus handlers originales. Sus controles de identidad/autorización permanecen vigentes. |
| Originales privados | `beforeFiles` redirige `/images/*` y `/brand/*` al handler Node de recursos. Este vuelve a comprobar la sesión, valida la ruta y su `realpath` antes de leer archivos. Sólo el símbolo exacto queda exento. |
| Optimizador | `localPatterns` admite exclusivamente `/brand/triskel-simbolo.png`, sin query en el origen. Los orígenes privados no pueden obtenerse por `/_next/image`. |
| Proxy futuro | Nginx repite la validación mediante `auth_request` y la misma cookie. El subrequest `/_preview_auth` es `internal`: el visitante no puede invocarlo directamente. Consulta mediante GET `/api/preview/session`, que sólo devuelve éxito si la sesión es válida; no emite sesiones por GET. No sirve directamente un directorio de recursos privados. |

Las imágenes privadas conservan `next/image`, dimensiones, recortes y originales, pero utilizan un loader que apunta al recurso protegido; el parámetro de anchura no implica remuestreo. Se renuncia temporalmente a optimizar esos originales porque el optimizador no reenvía la autenticación al leerlos. El símbolo público sí puede optimizarse sin crear un archivo alternativo. El coste de transferencia de las fotografías privadas debe medirse antes de producción.

### Excepciones públicas explícitas

- `/construccion`: pantalla y formulario; no contiene la fotografía del hero ni el contenido de la Home.
- `/brand/triskel-simbolo.png`: único recurso de marca público.
- `/_next/image`: exclusivamente el origen del símbolo permitido por configuración; no abre el resto de imágenes.
- `/_next/static/*`: CSS/JavaScript técnicos necesarios para renderizar e hidratar la pantalla. Los mapas `.map` se rechazan.
- `/api/preview/session`: POST de acceso, DELETE de salida y GET de validación. Su exposición no equivale a aceptar credenciales o sesiones inválidas.
- `/robots.txt`: indica `Disallow: /`.
- `/aviso-legal`, `/privacidad` y `/cookies`: rutas públicas cuyo registro servidor sólo puede publicar textos completos aprobados. Con el registro actual vacío siguen devolviendo 404.

Cualquier nuevo archivo en `public/`, página, API, ruta de metadatos o integración requiere revisar esta política. No se promete que un bundle público o una futura copia pública del código sea confidencial. Esta barrera tampoco revoca copias de recursos que alguien ya haya descargado.

## Contraseña y configuración local

No hay contraseña predeterminada. La ausencia de configuración nunca habilita la Home privada. No se genera una contraseña del propietario durante las pruebas: se usan únicamente valores sintéticos efímeros.

1. Copia `env.example` a `.env.local`, sin versionar el archivo resultante.
2. Elige una contraseña larga, única y no reutilizada; la utilidad exige entre 12 y 1024 bytes UTF-8. Conserva exactamente ñ, tildes, símbolos, caracteres suplementarios, espacios iniciales/finales y secuencias Unicode descompuestas: no recorta ni normaliza. Dos formas visualmente iguales pueden ser contraseñas distintas.
3. Desde una terminal interactiva ejecuta:

   ```bash
   npm run preview:credentials
   ```

   Introduce y confirma la contraseña sin eco. La utilidad imprime el hash, no la contraseña. Un decodificador UTF-8 incremental estricto admite caracteres divididos entre lecturas sin mostrar su contenido. Enter termina la entrada; retroceso elimina un punto de código, no necesariamente un grafema completo. UTF-8 inválido o incompleto, fin/cierre/error antes de Enter, exceso de longitud, controles no admitidos o varias líneas pegadas fallan con un mensaje genérico y sin hash. La API rechaza cadenas Unicode mal formadas en JSON para evitar sustituciones por U+FFFD. Rechaza argumentos inesperados y entrada no TTY; no admite pasar la contraseña por argumentos, tuberías ni archivos.

4. Genera un secreto de sesión independiente:

   ```bash
   npm run preview:credentials -- --session-secret
   ```

   Conserva la salida únicamente en tu entorno privado. No reutilices `SESSION_SECRET` ni el secreto de otro servicio.

5. Completa estas variables; los valores sensibles se dejan deliberadamente vacíos en el ejemplo:

   ```dotenv
   PREVIEW_ACCESS_MODE=protected
   PREVIEW_ORIGIN=http://localhost:3000
   PREVIEW_PASSWORD_HASH=
   PREVIEW_SESSION_SECRET=
   ```

6. Ejecuta `npm run dev` y abre `http://localhost:3000`. Sin sesión serás dirigido a `/construccion`. El origen configurado debe coincidir exactamente con el navegador: `localhost` y `127.0.0.1` no son intercambiables.

El modo omitido equivale a `protected`. Un modo desconocido se rechaza. `public` sólo permite desarrollo explícitamente sin barrera y está prohibido en `NODE_ENV=production`. Publicar el sitio sin esta protección requiere una decisión posterior, no dejar variables vacías.

El hash usa scrypt con `N=65536`, `r=8`, `p=1`, sal aleatoria de 16 bytes y salida de 64 bytes; el formato versionado es `scrypt-v1:65536:8:1:<sal-base64url>:<derivación-base64url>`. No se aceptan parámetros arbitrarios de coste. La comparación usa `timingSafeEqual` y la verificación HTTP es asíncrona.

## Sesión, cierre y rotación

| Propiedad | Valor |
| --- | --- |
| Cookie | `triskelweb_preview`, distinta de `triskelweb_session` |
| Ámbito | `Path=/`, sin atributo `Domain` |
| Protección | `HttpOnly`, `SameSite=Lax`, `Secure` en producción |
| Duración | Dos horas, sin renovación deslizante |
| Autenticación | HMAC-SHA-256 con secreto independiente de al menos 32 bytes aleatorios |
| Contenido | Audiencia, emisión, vencimiento y huella SHA-256 de la configuración de contraseña; no contiene el hash scrypt ni la contraseña |
| Mutaciones | POST y DELETE exigen `Origin` exacto; la contraseña sólo viaja en el cuerpo JSON del POST |
| Caché | Respuestas privadas `no-store`; no se deben almacenar en un CDN/caché compartido |

El control «Cerrar acceso privado» elimina únicamente esta cookie y regresa a construcción. No cierra Firebase ni elimina la sesión comercial. El modelo no tiene una base de sesiones: **una copia sustraída del token puede reproducirse hasta su caducidad**, aunque el navegador original cierre sesión. No hay revocación individual ni identificación de colaboradores.

Para invalidar todas las sesiones, cambia `PREVIEW_SESSION_SECRET` o genera y aplica un nuevo `PREVIEW_PASSWORD_HASH`. Reinicia las instancias afectadas; una instancia con configuración antigua continúa aceptando sus tokens. La cookie es firmada, no cifrada; no debe añadirse información personal a sus claims.

La rotación en Docker requiere recrear el servicio con el archivo de entorno privado actualizado. No basta con `docker compose restart` para cargar variables nuevas:

```bash
docker compose --env-file .env.production up -d --force-recreate app
```

Este comando describe el procedimiento futuro: no implica que exista hoy un despliegue ni que se haya ejecutado.

## Fuerza bruta y errores

La aplicación permite hasta 20 intentos por ventana de 15 minutos y proceso, con dos verificaciones scrypt concurrentes. Las respuestas de límite usan 429 y `Retry-After`; el cuerpo está limitado a 4096 bytes, la contraseña a 1024 bytes y la lectura del cuerpo tiene plazo limitado. Las credenciales incorrectas no devuelven detalles internos.

El límite global no confía en `X-Forwarded-For`, `X-Real-IP` ni otras cabeceras del visitante. Se reinicia con el proceso, no se distribuye entre réplicas y puede reducir la disponibilidad si alguien agota el presupuesto compartido. **No sustituye** el límite de Nginx por dirección del peer real. No se ha validado una garantía distribuida contra fuerza bruta o denegación de servicio.

## Preparación del VPS y Nginx

`docker-compose.yml` sólo publica 80 y 443 del proxy. Next.js y PostgreSQL no tienen puertos publicados en el host; PostgreSQL pertenece a una red interna. `deploy/nginx.conf` usa `auth_request` contra el GET de sesión, con la misma cookie del formulario.

Antes de utilizarlo:

1. Contrata y endurece el VPS Ubuntu, configura DNS y firewall; no publiques 3000 ni 5432.
2. Revisa imágenes, recursos y empaquetado standalone en Linux. El aviso `EPERM` de la comprobación Windows no se considera resuelto por disponer de un Dockerfile.
3. Configura certificados TLS válidos para `triskelfolk.es`. `TRISKEL_TLS_DIRECTORY` debe señalar un directorio privado con `fullchain.pem` y `privkey.pem`; no copies la clave al repositorio.
4. Prepara `.env.production` fuera de Git: contraseña PostgreSQL propia, `DATABASE_URL` interna, hash de vista previa y secreto independiente. En producción el origen es `https://triskelfolk.es`.
5. Revisa la configuración sin exponer su salida: `docker compose config` puede imprimir valores sensibles. Para una comprobación silenciosa utiliza:

   ```bash
   docker compose --env-file .env.production config --quiet
   ```

6. Verifica disponibilidad del módulo `auth_request` y sintaxis con `nginx -t` dentro del contenedor preparado. Valida la pila completa en una red aislada antes de publicar DNS.
7. Comprueba externamente TLS, cookie Secure, ausencia de acceso directo al puerto de aplicación, bypass de rutas/recursos, límites del proxy, caché y comportamiento ante secretos ausentes.

El proxy sobrescribe las cabeceras reenviadas y elimina `X-Middleware-Subrequest`; no acepta una IP indicada por el cliente como identidad. No configures `real_ip` para cualquier origen. Si se incorpora un CDN o balanceador, sólo se podrán confiar sus rangos explícitamente verificados.

El log propuesto registra método, ruta sin query y estado, nunca cuerpo, cookie o contraseña. Deben definirse permisos, retención y revisión operativa. El healthcheck de construcción es únicamente una señal de vida, no acredita configuración completa, acceso a Firebase o consistencia de PostgreSQL. La configuración comercial de Firebase/sesiones y las migraciones siguen siendo pasos separados, no activados por esta entrega.

## Cómo verificar y límites de evidencia

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:preview
```

`test:preview` crea una copia aislada bajo `.next/cache`, arranca un servidor de desarrollo temporal exclusivamente en loopback y lo termina en `finally`, con un límite global de tiempo. Genera credenciales sintéticas sólo en memoria. Comprueba acceso directo a páginas, APIs y recursos, sesión, manipulación, vencimiento, salida y ausencia de esos valores en los bundles cliente generados. No usa credenciales reales ni realiza operaciones comerciales o migraciones.

La inspección responsive y el recorrido del formulario pueden añadirse con un navegador CDP ya autorizado mediante `PREVIEW_BROWSER_CDP`; no se inicia automáticamente un navegador persistente. La comprobación no es una auditoría exhaustiva de bundles ni una certificación de seguridad.

Siguen pendientes de validación real: terminal TTY interactiva, HTTPS/Secure y Nginx en Linux, límites de red/recursos bajo carga, operación multiinstancia, empaquetado standalone, revisión completa de teclado/contraste y datos/textos legales definitivos. Los resultados concretos de la revisión local se resumen en el [README](../../README.md).

El repositorio principal `VicenBL/TriskelWeb` permanece privado. Una copia pública de portfolio será otro repositorio, revisado y saneado expresamente; no se crea ni se cambia la visibilidad como parte de esta funcionalidad.
