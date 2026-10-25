# Smart Trash Bin & Rice Vendo System

An IoT-enabled smart waste bin and rice vending system featuring real-time material identification, interactive kiosk interface, dynamic material pricing, and an administrative management dashboard.

## 📋 Table of Contents

- [Prerequisites](#-prerequisites)
- [Clone and Setup](#-clone-and-setup)
- [Backend Setup](#-backend-setup)
- [Frontend Setup & HTTPS](#-frontend-setup--https)
- [Accepting Local Certificates](#-accepting-local-certificates)
- [📁 Repository Structure](#-repository-structure)
- [🛠️ Production Deployment](#-production-deployment)

---

## 📋 Prerequisites

Ensure you have the following installed on your machine before setting up the project:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

---

## 💻 Clone and Setup

Clone the repository and open it in VS Code:

```bash
git clone <repository-url>
cd Smart_Trash_Bin
code .
```

---

## 🚀 Backend Setup

The REST API runs on port `4000` by default; all endpoints are mounted under `/api`.

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create your local environment file:
   ```bash
   # Linux / macOS / Git Bash
   cp .env.example .env

   # Windows (CMD)
   copy .env.example .env
   ```

3. Configure your `.env` settings:
   ```env
   PORT=4000
   NODE_ENV=development
   CORS_ORIGIN=https://192.168.254.156:3000
   QR_SECRET=your_qr_hmac_secret_key
   JWT_SECRET=your_admin_jwt_secret_key

   # Database Credentials
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USERNAME=root
   DB_PASSWORD=your_password
   DB_DATABASE=smart_trash_bin
   ```

4. Install dependencies and start the development server:
   ```bash
   npm install
   npm run dev
   ```

---

## 🖥️ Frontend Setup & HTTPS

The frontend is built with Next.js and uses Next.js's experimental HTTPS mode so camera and QR scanner permissions work seamlessly over the local network.

1. Open a new terminal window and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Create your local environment configuration:
   ```bash
   # Linux / macOS / Git Bash
   cp .env.example .env.local

   # Windows (CMD)
   copy .env.example .env.local
   ```

3. Set your backend URL in `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=https://192.168.254.156:4000
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Start the development server with automatic HTTPS certificate setup:
   ```bash
   npm run dev:https
   ```
   > **Note:** Next.js will automatically download and create local certificates via `mkcert`. No manual OpenSSL key generation commands are required!

6. Open **`https://localhost:3000`** (or `https://192.168.254.156:3000`) in your browser.

---

## ⚠️ Accepting Local Certificates

When accessing the app over local network IP addresses (`https://192.168.254.156:3000`), your browser will show a standard local SSL notice on first visit.

1. Open `https://192.168.254.156:3000` or `https://localhost:3000`.
2. Click **Advanced** -> **Proceed to site (unsafe)** to grant the browser access to local network hardware APIs.

---

## 📁 Repository Structure

```
Smart_Trash_Bin/
├── backend/                  # Express.js REST API
│   ├── config/               # Database and environment configurations
│   ├── middleware/           # Auth, error handling, session validation
│   ├── routes/               # Routes (/deposit, /qr, /session, /admin)
│   ├── services/             # MySQL store and business logic
│   └── app.js                # Express app entry
├── frontend/                 # Next.js Kiosk & Admin Dashboard
│   ├── app/                  # App Router pages (/admin, /kiosk)
│   ├── components/           # Kiosk UI, terminal views, and admin panels
│   ├── hooks/                # Custom hooks (kiosk session, scanner)
│   └── lib/                  # Resolver utilities and API fetchers
└── README.md
```

---

## 🛠️ Production Deployment

For production deployments:

- **Backend:** Run `npm start` inside the `backend` folder.
- **Frontend:** Build and launch the production Next.js instance:
  ```bash
  cd frontend
  npm run build
  npm start
  ```