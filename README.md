# Hotel Booking API

API REST para la gestión de reservas hoteleras, desplegada en Render.

- URL principal: `https://hotel-backend-625r.onrender.com`

## Descripción

Este backend ofrece funciones de administración de clientes, tipos de habitación, habitaciones, servicios adicionales, reservas, consumos y pagos.
Está diseñado con Node.js + Express y PostgreSQL, usando autenticación JWT para proteger las rutas.

## Tecnologías

- Node.js
- Express 5
- PostgreSQL
- JWT (`jsonwebtoken`)
- Bcrypt (`bcrypt`)
- Helmet (`helmet`)
- CORS (`cors`)
- Dotenv (`dotenv`)

## Estructura del proyecto

- `index.js` - Entrada principal del servidor.
- `config/db.js` - Configuración de conexión a PostgreSQL con `pg`.
- `routes/` - Definición de rutas por módulo.
- `controllers/` - Lógica de negocio y consultas a la base de datos.
- `middlewares/authMiddleware.js` - Validación de token JWT.

## Variables de entorno

El proyecto usa `dotenv`. Las variables esperadas son:

- `PORT` - Puerto en el que corre el servidor (opcional, por defecto `3000`).
- `JWT_SECRET` - Secreto para firmar y verificar JWT.
- `DB_EXTERNAL_URL` - Cadena de conexión PostgreSQL.

## Inicio local

1. Instalar dependencias:

```bash
npm install
```

2. Crear el archivo `.env` con las variables necesarias.

3. Ejecutar el servidor:

```bash
node index.js
```

## Mejoras recientes

- Autenticación segura con JWT y expiración de tokens (`jsonwebtoken`).
- Almacenamiento seguro de contraseñas con `bcrypt` (hash + salt).
- Uso de transacciones en operaciones críticas (crear reservas y checkout) para mantener consistencia (`BEGIN` / `COMMIT` / `ROLLBACK`).
- Conexión a PostgreSQL mediante `pg` con `Pool` y soporte para transacciones (`getClient()`).
- Habilitado SSL en la conexión a la base de datos con `rejectUnauthorized: false` para despliegues en plataformas cloud.
- Middlewares de seguridad y hardening: `helmet()` y `cors()` aplicados globalmente.
- Validaciones básicas en controladores (fechas, disponibilidad, estado de usuario, integridad referencial a nivel aplicación).
- Endpoints agrupados por módulos: autenticación, catálogo, reservas, consumos y pagos, roles.
- `express` v5 y estructura modular de rutas/controles para facilitar mantenimiento.

## Scripts útiles

- Instalar dependencias:

```bash
npm install
```

- Ejecutar servidor en local:

```bash
node index.js
```

Nota: `package.json` no define scripts adicionales por defecto; puedes agregar `start` o `dev` según tu flujo (ej. `nodemon index.js`).

## Archivo `.env` de ejemplo

Coloca un archivo `.env` en la raíz con al menos estas variables:

```
PORT=3000
JWT_SECRET=tu_secreto_largo_y_seguro
DB_EXTERNAL_URL=postgres://usuario:password@host:puerto/dbname
```

Si despliegas en servicios como Render, asegúrate de configurar variables de entorno en la plataforma y mantener `rejectUnauthorized: false` solo si tu proveedor lo requiere.

## Ejecutar pruebas rápidas

Hay un script de prueba auxiliar `test-api.js` que prepara datos y ejecuta llamadas HTTP de ejemplo. Antes de usarlo asegúrate de:

- Tener la API corriendo en local (puerto configurado en `.env`).
- Revisar las URLs dentro de `test-api.js` (por defecto pueden apuntar a `localhost:5432`) y ajustarlas al puerto correcto (ej. `http://localhost:3000`).

Ejecutar:

```bash
node test-api.js
```

## Notas de despliegue y seguridad

- Nunca expongas `JWT_SECRET` o credenciales en repositorios públicos.
- Revisa las reglas de CORS según el dominio del frontend en producción.
- Considera activar `rejectUnauthorized: true` y gestionar certificados si controlas la capa TLS entre app y DB.

## Contribuciones y siguientes pasos sugeridos

- Agregar scripts NPM (`start`, `dev`, `test`) y un `lint`/`format`.
- Añadir pruebas automatizadas y CI (GitHub Actions) para proteger cambios en endpoints críticos.
- Documentar la API con OpenAPI / Swagger para facilitar integración con frontends.
- Añadir validaciones más robustas y manejo de errores centralizado (middleware de error).

---

Si quieres, actualizo el `package.json` con scripts sugeridos y agrego una ruta de Swagger mínima. ¿Lo hago? 

## Middleware global

El servidor aplica estos middlewares:

- `helmet()` para cabeceras de seguridad.
- `cors()` para habilitar CORS.
- `express.json()` para parsear JSON en el cuerpo de las peticiones.

## Rutas disponibles

### Autenticación

- `POST /api/auth/register`
  - Registra un usuario.
  - Body: `{ id_role, nombre_completo, username, email, password }`
  - Respuesta: datos del usuario creado.

- `POST /api/auth/login`
  - Inicia sesión.
  - Body: `{ username, password }`
  - Respuesta: token JWT y datos básicos de usuario.

### Reglas generales

- Las rutas bajo `/api` excepto `/api/auth/*` requieren `Authorization: Bearer <token>`.
- El token se valida en `middlewares/authMiddleware.js`.

### Catálogo y datos maestros

Todas estas rutas usan `verifyToken`.

#### Clientes
- `GET /api/clientes` - Lista todos los clientes.
- `POST /api/clientes` - Crea un cliente.
  - Body: `{ documento_identidad, nombre_completo, email, telefono }`
- `PUT /api/clientes/:id` - Actualiza un cliente.
- `DELETE /api/clientes/:id` - Elimina un cliente solo si no tiene reservas asociadas.

#### Tipos de habitación
- `GET /api/tipos-habitacion` - Lista tipos de habitación.
- `POST /api/tipos-habitacion` - Crea un tipo de habitación.
  - Body: `{ nombre_tipo, capacidad_maxima, precio_base_noche }`

#### Habitaciones
- `GET /api/habitaciones` - Lista habitaciones. Permite filtrar por `?estado=`.
- `POST /api/habitaciones` - Crea una habitación.
  - Body: `{ numero_habitacion, id_tipo_habitacion, estado }`
- `DELETE /api/habitaciones/:id` - Elimina una habitación solo si no tiene historial en `Detalle_Reservas`.

#### Servicios adicionales
- `GET /api/servicios` - Lista servicios adicionales.
- `POST /api/servicios` - Crea un servicio.
  - Body: `{ nombre_servicio, descripcion, precio_actual }`
- `DELETE /api/servicios/:id` - Elimina un servicio solo si no tiene consumos asociados.

### Reservas

Todas las rutas de reservas usan `verifyToken`.

- `POST /api/reservas`
  - Crea una reserva con detalle de habitaciones.
  - Body esperado:

```json
{
  "id_cliente": 1,
  "notas_adicionales": "Solicitud de cama adicional",
  "habitaciones_detalle": [
    {
      "id_habitacion": 10,
      "fecha_checkin": "2026-07-01",
      "fecha_checkout": "2026-07-05"
    }
  ]
}
```

  - Comprueba disponibilidad, inserta la cabecera, detalle y marca las habitaciones como `Ocupada`.

- `GET /api/reservas/:id/estado-cuenta`
  - Obtiene el estado de cuenta de una reserva.
  - Devuelve totales de habitaciones, consumos, pagos y balance pendiente.

- `POST /api/reservas/:id/checkout`
  - Finaliza la reserva.
  - Requiere que el balance pendiente sea cero.
  - Actualiza `Reservas.estado_reserva` a `Finalizada` y libera las habitaciones.

### Consumos y pagos

Todas las rutas usan `verifyToken`.

#### Consumos
- `POST /api/consumos`
  - Registra un consumo de servicio asociado a una reserva.
  - Body: `{ id_reserva, id_servicio, cantidad, precio_cobrado }`
- `GET /api/consumos/reserva/:id` - Lista los consumos de una reserva.

#### Pagos
- `POST /api/pagos`
  - Registra un pago asociado a una reserva.
  - Body: `{ id_reserva, monto, metodo_pago, observaciones }`
- `GET /api/pagos/reserva/:id` - Lista los pagos de una reserva.

## Detalles importantes

- La autenticación se basa en JWT con `JWT_SECRET`.
- `config/db.js` usa `DB_EXTERNAL_URL` y habilita SSL con `rejectUnauthorized: false` para despliegues en plataformas cloud.
- `reservasController.js` usa transacciones (`BEGIN` / `COMMIT` / `ROLLBACK`) para asegurar consistencia.
- Las operaciones de eliminación aplican restricciones de integridad referencial a nivel de aplicación.

## Endpoint de prueba

- `GET /`
  - Devuelve un mensaje de que la API está funcionando.

## Notas de despliegue

- Ya está desplegado en Render en:
  - `https://hotel-backend-625r.onrender.com`

A partir de aquí puedes usar este README como referencia para trabajar con el backend, agregar nuevos endpoints o integrar el frontend con la API actual.
