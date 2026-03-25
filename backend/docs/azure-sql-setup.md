# Azure SQL Setup (Backend)



## 1. Variables de entorno

Configura `backend/.env` con estos valores:

```env
DB_HOST=alertify-server-johan-2.database.windows.net
DB_PORT=1433
DB_NAME=AlertifyDB
DB_USER=adminAlertify
DB_PASSWORD=TU_PASSWORD_REAL
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false

# IMPORTANTE: hacer URL-encode de la password para DATABASE_URL
DATABASE_URL="sqlserver://alertify-server-johan-2.database.windows.net:1433;database=AlertifyDB;user=adminAlertify;password=TU_PASSWORD_URL_ENCODED;encrypt=true;trustServerCertificate=false"
```

## 2. Conversion desde cadena ADO.NET

Si tienes una cadena como esta:

```text
Server=tcp:alertify-server-johan-2.database.windows.net,1433;Initial Catalog=AlertifyDB;User ID=adminAlertify;Password=...;Encrypt=True;TrustServerCertificate=False;
```

Mapeo directo:

- `Server=tcp:HOST,PUERTO` -> `DB_HOST`, `DB_PORT`
- `Initial Catalog` -> `DB_NAME`
- `User ID` -> `DB_USER`
- `Password` -> `DB_PASSWORD`
- `Encrypt=True` -> `DB_ENCRYPT=true`
- `TrustServerCertificate=False` -> `DB_TRUST_SERVER_CERTIFICATE=false`

## 3. Firewall y acceso en Azure

- Habilita el firewall de Azure SQL para la IP del entorno donde corre el backend.
- Si vas a desplegar backend en Azure App Service/Container, habilita ese origen tambien.

## 4. Comandos de base de datos

Desde `backend/`:

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

## 5. Arranque de backend

```bash
npm run start:dev
```

## 6. Verificacion funcional minima

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

Si estos 3 endpoints funcionan, frontend web y app movil seguiran operando normalmente (solo consumen API HTTP, no DB directa).
