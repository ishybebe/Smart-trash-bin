Smart Trash Bin & Rice Vendo System

An IoT-enabled smart waste bin and rice vending system featuring real-time material identification, interactive kiosk interface, dynamic material pricing, and an administrative management dashboard.

📋 Table of Contents

Prerequisites

Clone and Setup

Step 1: Generate Local SSL/TLS Certificates

Step 2: Backend Setup

Step 3: Frontend Setup

Step 4: Accepting Self-Signed Certificates

📁 Repository Structure

🛠️ Production Deployment

📋 Prerequisites

Ensure you have the following installed on your machine before setting up the project:

Node.js: v18.0.0 or higher

npm: v9.0.0 or higher

OpenSSL: Pre-installed on macOS/Linux; accessible via Git Bash or OpenSSL binary on Windows.

💻 Clone and Setup

Clone the repository and open it in VS Code:

git clone <repository-url>
cd Smart_Trash_Bin
code .


🔒 Step 1: Generate Local SSL/TLS Certificates

Because modern browsers enforce strict Web Camera, QR Scanner, and HTTPS security restrictions, both frontend and backend must run over HTTPS during local network testing (e.g., when connecting a kiosk tablet or mobile camera via IP address).

Run the following command from the project root (Smart_Trash_Bin) to generate self-signed certificates:

# macOS / Linux / Git Bash (Windows)
mkdir -p backend/certs frontend/certs

# Generate backend SSL certificate (replace IP with your local Wi-Fi IP if needed)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout backend/certs/key.pem \
  -out backend/certs/cert.pem \
  -subj "/CN=192.168.254.156"

# Copy certificates for frontend local HTTPS development
cp backend/certs/key.pem frontend/certs/key.pem
cp backend/certs/cert.pem frontend/certs/cert.pem


🚀 Step 2: Backend Setup

The API runs on https://localhost:4000 (or https://192.168.254.156:4000); all endpoints are mounted under /api.

Navigate to the backend directory:

cd backend


Create your local environment file:

# Linux / macOS / Git Bash
cp .env.example .env

# Windows (CMD)
copy .env.example .env


Configure your .env settings:

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


Install dependencies and start the backend development server:

npm install
npm run dev


🖥️ Step 3: Frontend Setup

The frontend is a Next.js web application.

Open a new terminal window and navigate to the frontend directory:

cd frontend


Create your local environment configuration:

# Linux / macOS / Git Bash
cp .env.example .env.local

# Windows (CMD)
copy .env.example .env.local


Update .env.local to point to your secure backend API URL:

NEXT_PUBLIC_API_URL=https://192.168.254.156:4000


Install dependencies and start the development server:

npm install
npm run dev


Wait for the server to compile, then open https://localhost:3000 (or https://192.168.254.156:3000) in your browser.

⚠️ Step 4: Accepting Self-Signed Certificates

When using self-signed HTTPS certificates on a local network, modern browsers will initially display a security warning ("Your connection is not private").

To authorize local requests:

Visit `https://192.168.
