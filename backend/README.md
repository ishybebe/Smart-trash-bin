# Smart Bin · Rice Vendo — Backend

Express API for the Smart Bin kiosk: deposits, points codes, sessions, rice dispensing,
hardware status, and admin access. Database schema lives in `db/schema.sql`.

## Clone and Setup

Clone the repository and open it in VS Code:

```bash
git clone <url>
cd Smart_Trash_Bin
code .
```

Then install and run the backend:

```bash
cd backend
cp .env.example .env   # Windows: copy .env.example .env, then fill in the values
npm install
npm run dev
```

The API runs on [http://localhost:4000](http://localhost:4000); all endpoints are mounted
under `/api`. For production, run `npm start` instead of `npm run dev`.

The frontend is a separate app and is not started from this folder; see `frontend/README.md`.

## Database

Schema: `db/schema.sql` (MySQL 8). Apply it with:

```bash
mysql --host "$DB_HOST" --port "$DB_PORT" --user "$DB_USERNAME" -p "$DB_DATABASE" < db/schema.sql
```

Connection is configured in `.env`:

| Variable | Purpose |
|---|---|
| `DB_HOST` | Database host |
| `DB_PORT` | Database port (provider-specific) |
| `DB_USERNAME` | Database user |
| `DB_PASSWORD` | Database password |
| `DB_DATABASE` | Database name (`defaultdb`) |

The active hosted instance is Aiven for MySQL and requires TLS. Set `DB_SSL_CA` to the
provider CA file to verify the server certificate.

### Tables

| Table | Purpose |
|---|---|
| `accepted_materials` | Accepted recyclable types, their labels, and points value. |
| `kiosk_sessions` | One kiosk session and its live points balance. |
| `trash_deposits` | Every camera-detected deposit with confidence, status, and `event_id` idempotency key. |
| `points_codes` | Single-use QR/fallback codes stored as SHA-256 hashes, with source/used session and expiry. |
| `rice_inventory` | Singleton row with packs available and low-stock threshold. |
| `rice_pricing` | Active or hidden rice pack sizes and their points prices. |
| `rice_dispenses` | Each dispense with `request_id`, historical `pack_size`, stock/points snapshots, and actuator status. |
| `hardware_status` | Current online/offline/unknown state for kiosk, camera, and ESP32. |
| `admin_users` | Optional hashed admin accounts and roles. |
| `admin_audit_log` | Admin actions with entity references and details. |

Balances and stock live on `kiosk_sessions` and `rice_inventory`; the action tables
(`trash_deposits`, `points_codes`, `rice_dispenses`) are the history/audit trail. All
mutations should run in transactions with row locks.

## Rice Pricing API

Rice prices are read from `rice_pricing` for every dispense. Admin requests use the
Bearer token returned by `/api/admin/login`:

```text
GET  /api/admin/rice-pricing
POST /api/admin/rice-pricing
```

The update body is `{ "pack_size": "1/4", "points_price": 20, "is_active": true }`.
Price changes are recorded in `admin_audit_log` with the `UPDATE_RICE_PRICE` action.

For an existing database, add the historical pack snapshot before deploying the new
dispense service:

```sql
ALTER TABLE rice_dispenses
ADD COLUMN pack_size ENUM('1/8', '1/4', '1/2') NOT NULL AFTER quantity;
```
