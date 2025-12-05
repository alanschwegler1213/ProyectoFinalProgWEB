# StorePhone - Proyecto Final

Proyecto con catálogo de productos y sistema de gestión de usuarios. Incluye autenticación con roles y operaciones CRUD.

## Tecnologías

- Backend: Node.js, Express.js
- Base de Datos: SQLite3
- Frontend: TypeScript, HTML5, CSS3
- Autenticación: express-session, bcrypt

## Instalación

### Requisitos

- Node.js v14 o superior

### Pasos

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Inicializar base de datos:
   ```bash
   node backend/migrate.js
   ```
   Este comando crea las tablas y las cuentas de prueba:
   - Administrador: `admin@gmail.com` / `admin123`
   - Usuario: `usuario@gmail.com` / `usuario123`

3. Iniciar servidor:
   ```bash
   npm start
   ```

4. Acceder a la aplicación:
   Abre http://localhost:3000/StorePhone.html en tu navegador.

   Importante: Usa la URL de localhost. Abrir el archivo HTML directamente causará errores de CORS.

## Sistema de Autenticación

El proyecto incluye dos roles con diferentes permisos:

### Administrador

- Acceso al panel de administración
- Ver todos los usuarios registrados
- Editar información de usuarios
- Eliminar usuarios
- Operaciones CRUD completas

### Usuario Normal

- Acceso al panel de usuario (solo lectura)
- Ver lista de usuarios registrados
- No puede editar ni eliminar usuarios

### Iniciar Sesión

1. Haz clic en el botón "Iniciar Sesión" o "Panel Administrador" en el footer
2. Serás redirigido a la página de login
3. Ingresa las credenciales correspondientes
4. Una vez autenticado, podrás acceder al panel desde el botón en el footer

## Estructura del Proyecto

```
StorePhoneFinal/
├── backend/
│   ├── db.js              # Configuración de SQLite3
│   ├── datos.json         # Datos de ejemplo (vacío por defecto)
│   ├── server.js          # Servidor Express con API REST
│   ├── usuarios.db        # Base de datos SQLite
│   └── migrate.js         # Script de inicialización
├── frontend/
│   └── main.ts            # Lógica TypeScript del frontend
├── dist/
│   └── main.js            # JavaScript compilado
├── img/                   # Imágenes del proyecto
├── StorePhone.html        # Página principal
├── login.html             # Página de inicio de sesión
├── StorePhone.css         # Estilos principales
├── login.css              # Estilos del login
├── package.json
└── tsconfig.json
```

## Scripts

- `npm install`: Instala las dependencias
- `npm run build`: Compila TypeScript
- `npm start`: Compila y inicia el servidor

## Solución de Problemas

**Error al cargar usuarios en el panel**
- Verifica que estés autenticado
- Asegúrate de acceder a través de http://localhost:3000/StorePhone.html
- No abras el archivo HTML directamente

**Error de autenticación**
- Ejecuta `node backend/migrate.js` para crear las cuentas de prueba
- Verifica las credenciales correctas

**Error: "address already in use"**
- El puerto 3000 está ocupado. Detén el proceso anterior

**Error: "Cannot find module"**
- Ejecuta `npm install` para instalar las dependencias
