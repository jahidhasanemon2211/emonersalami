# AK ISP Manager

AK ISP Manager is a production-ready, full-stack web application designed for ISP billing and network management (similar to Maxim, TNR Soft, Net Billing).

## Features

*   **Role-Based Access Control:** Super Admin, Admin, Manager, Support, Accountant, Reseller, Customer.
*   **MikroTik Integration:** Full RouterOS API integration for managing PPPoE, Hotspot, and Queues (Speed Limits).
*   **Automated Billing:** Generates monthly invoices and manages payments.
*   **Payment Gateways:** Supports bKash, Nagad, SSLCommerz, Stripe, and PayPal.
*   **Notifications:** Integrated with Telegram, WhatsApp, SMS, and Email.
*   **Support Tickets:** Built-in ticketing system for customer support.
*   **Reporting & Analytics:** Dashboard with real-time stats via Socket.io.
*   **Multi-language Support:** English and Bangla via i18n.
*   **Dockerized:** Easy deployment using Docker and Docker Compose.

## Tech Stack

*   **Frontend:** React.js 18+, Tailwind CSS 3+, Vite
*   **Backend:** Node.js 20+, Express.js
*   **Database:** PostgreSQL 15 (via Prisma ORM)
*   **Cache & Queue:** Redis + Bull
*   **Reverse Proxy:** Nginx

## Getting Started

### Prerequisites

*   Docker and Docker Compose installed.
*   Node.js (v18+) if running locally outside of Docker.

### Running with Docker (Production Mode)

1.  Clone the repository.
2.  Copy `.env.example` to `.env` in the root folder and configure the variables (like `DATABASE_URL`, `JWT_SECRET`, etc.).
3.  Run the following command:

    ```bash
    docker-compose up -d --build
    ```

4.  The application will be accessible at `http://localhost`.

### Local Development

#### Backend

1.  Navigate to the `server/` directory.
2.  Run `npm install`.
3.  Set up your PostgreSQL database and add the `DATABASE_URL` in `server/.env`.
4.  Run Prisma migrations: `npx prisma migrate dev`.
5.  Start the development server: `npm run dev`.

#### Frontend (WIP)

1.  Navigate to the `client/` directory.
2.  Run `npm install`.
3.  Start the Vite dev server: `npm run dev`.

## Project Structure

*   `/client`: React Frontend application.
*   `/server`: Node.js Express Backend.
*   `/server/prisma`: Database schema and migrations.
*   `/nginx`: Nginx configuration files.
*   `docker-compose.yml`: Container orchestration setup.

## Documentation

*   See `API_DOCUMENTATION.md` for detailed REST API endpoints.
*   See `DEPLOYMENT.md` for VPS deployment instructions.
