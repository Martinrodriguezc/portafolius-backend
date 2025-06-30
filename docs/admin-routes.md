# Documentación de Rutas de Administrador

## Descripción General

Las rutas de administrador (`/admin`) proporcionan funcionalidades exclusivas para usuarios con rol de administrador en el sistema. Todas las rutas requieren autenticación y verificación de rol administrativo.

## Middlewares

### `authAdminMiddleware`
Middleware compuesto que combina:
- `authenticateToken`: Verifica la validez del token JWT
- `checkAdmin`: Verifica que el usuario tenga rol de administrador

**Respuesta de error (403):**
```json
{
  "msg": "Acceso denegado. Solo administradores pueden acceder a esta ruta."
}
```

## Rutas Principales

### Dashboard

#### `GET /admin/dashboard`
Obtiene los datos principales del dashboard administrativo.

**Headers requeridos:**
```
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "totalUsuarios": 150,
  "totalProfesores": 25,
  "totalEstudiantes": 120,
  "estudiosActivos": 45,
  // ... otros datos del dashboard
}
```

---

### Gestión de Asignaciones Profesor-Estudiante

#### `POST /admin/assign-teacher`
Asigna un profesor a un estudiante específico.

**Headers requeridos:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body requerido:**
```json
{
  "profesorId": "profesor_uuid",
  "estudianteId": "estudiante_uuid"
}
```

**Respuesta exitosa (200):**
```json
{
  "msg": "Profesor asignado exitosamente",
  "asignacion": {
    "id": "asignacion_uuid",
    "profesorId": "profesor_uuid",
    "estudianteId": "estudiante_uuid",
    "fechaAsignacion": "2024-01-15T10:30:00Z"
  }
}
```

#### `GET /admin/assignments`
Obtiene todas las asignaciones profesor-estudiante del sistema.

**Headers requeridos:**
```
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "asignaciones": [
    {
      "id": "asignacion_uuid",
      "profesor": {
        "id": "profesor_uuid",
        "nombre": "Juan Pérez",
        "email": "juan@example.com"
      },
      "estudiante": {
        "id": "estudiante_uuid",
        "nombre": "María García",
        "email": "maria@example.com"
      },
      "fechaAsignacion": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Rutas de Métricas

### `GET /admin/metricas/usuarios-por-rol`
Obtiene la distribución de usuarios por rol en el sistema.

**Respuesta exitosa (200):**
```json
{
  "metricas": [
    {
      "rol": "estudiante",
      "cantidad": 120
    },
    {
      "rol": "profesor",
      "cantidad": 25
    },
    {
      "rol": "admin",
      "cantidad": 5
    }
  ]
}
```

### `GET /admin/metricas/usuarios-por-mes`
Obtiene el registro de usuarios nuevos por mes.

**Respuesta exitosa (200):**
```json
{
  "metricas": [
    {
      "mes": "2024-01",
      "cantidad": 45
    },
    {
      "mes": "2024-02",
      "cantidad": 52
    }
  ]
}
```

### `GET /admin/metricas/estudios-por-mes`
Obtiene la cantidad de estudios creados por mes.

**Respuesta exitosa (200):**
```json
{
  "metricas": [
    {
      "mes": "2024-01",
      "cantidad": 28
    },
    {
      "mes": "2024-02",
      "cantidad": 35
    }
  ]
}
```

### `GET /admin/metricas/tasa-finalizacion-estudios`
Obtiene la tasa de finalización de estudios.

**Respuesta exitosa (200):**
```json
{
  "tasaFinalizacion": 75.5,
  "estudiosCompletados": 120,
  "estudiosTotal": 159
}
```

### `GET /admin/metricas/top-profesores-evaluaciones`
Obtiene el ranking de profesores mejor evaluados.

**Respuesta exitosa (200):**
```json
{
  "topProfesores": [
    {
      "profesorId": "profesor_uuid",
      "nombre": "Ana López",
      "promedioEvaluacion": 4.8,
      "totalEvaluaciones": 25
    }
  ]
}
```

### `GET /admin/metricas/video-clips-por-mes`
Obtiene la cantidad de video clips subidos por mes.

**Respuesta exitosa (200):**
```json
{
  "metricas": [
    {
      "mes": "2024-01",
      "cantidad": 142
    },
    {
      "mes": "2024-02",
      "cantidad": 178
    }
  ]
}
```

### `GET /admin/metricas/material-por-tipo`
Obtiene la distribución de material por tipo.

**Respuesta exitosa (200):**
```json
{
  "metricas": [
    {
      "tipo": "video",
      "cantidad": 450
    },
    {
      "tipo": "audio",
      "cantidad": 320
    },
    {
      "tipo": "documento",
      "cantidad": 180
    }
  ]
}
```

### `GET /admin/metricas/usuarios-por-promedio`
Obtiene la distribución de usuarios por promedio de calificaciones.

**Respuesta exitosa (200):**
```json
{
  "metricas": [
    {
      "rangoPromedio": "4.0-5.0",
      "cantidad": 45
    },
    {
      "rangoPromedio": "3.0-3.9",
      "cantidad": 38
    },
    {
      "rangoPromedio": "2.0-2.9",
      "cantidad": 22
    }
  ]
}
```

---

## Gestión de Profesores

### `GET /admin/usuarios/profesores-pendientes`
Obtiene la lista de profesores pendientes de autorización.

**Headers requeridos:**
```
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "profesoresPendientes": [
    {
      "id": "profesor_uuid",
      "nombre": "Carlos Mendoza",
      "email": "carlos@example.com",
      "fechaRegistro": "2024-01-15T10:30:00Z",
      "documento": "documento_url",
      "especialidad": "Música"
    }
  ]
}
```

### `PATCH /admin/usuarios/:id/autorizar`
Autoriza a un profesor pendiente para que pueda acceder al sistema.

**Parámetros de ruta:**
- `id`: UUID del profesor a autorizar

**Headers requeridos:**
```
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "msg": "Profesor autorizado exitosamente",
  "profesor": {
    "id": "profesor_uuid",
    "nombre": "Carlos Mendoza",
    "email": "carlos@example.com",
    "estado": "autorizado"
  }
}
```

### `DELETE /admin/usuarios/:id/rechazar`
Rechaza la solicitud de un profesor y elimina su registro.

**Parámetros de ruta:**
- `id`: UUID del profesor a rechazar

**Headers requeridos:**
```
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "msg": "Profesor rechazado y eliminado del sistema"
}
```

---

## Códigos de Error Comunes

| Código | Descripción |
|--------|-------------|
| 401 | Token inválido o expirado |
| 403 | Acceso denegado - No es administrador |
| 404 | Recurso no encontrado |
| 500 | Error interno del servidor |

## Notas Importantes

1. **Autenticación Requerida**: Todas las rutas requieren un token JWT válido en el header `Authorization`.

2. **Rol Administrativo**: Solo usuarios con rol `admin` pueden acceder a estas rutas.

3. **Formato de Fechas**: Todas las fechas se devuelven en formato ISO 8601 UTC.

4. **Paginación**: Algunas rutas pueden implementar paginación en futuras versiones.

5. **Rate Limiting**: Se recomienda implementar rate limiting para prevenir abuso.

## Ejemplos de Uso

### Obtener datos del dashboard
```bash
curl -X GET \
  http://localhost:3000/admin/dashboard \
  -H 'Authorization: Bearer <tu_token_jwt>'
```

### Asignar profesor a estudiante
```bash
curl -X POST \
  http://localhost:3000/admin/assign-teacher \
  -H 'Authorization: Bearer <tu_token_jwt>' \
  -H 'Content-Type: application/json' \
  -d '{
    "profesorId": "profesor_uuid",
    "estudianteId": "estudiante_uuid"
  }'
```

### Autorizar profesor
```bash
curl -X PATCH \
  http://localhost:3000/admin/usuarios/profesor_uuid/autorizar \
  -H 'Authorization: Bearer <tu_token_jwt>'
``` 