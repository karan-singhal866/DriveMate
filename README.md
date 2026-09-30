# DriveMate

Production-oriented full-stack foundation for a service that lets customers book verified drivers to operate their own vehicles.

## Stack
- Backend: Node.js, Express, MongoDB/Mongoose, JWT, Socket.IO
- Frontend: React, Vite, React Router, Axios
- Security baseline: Helmet, CORS allowlist, rate limiting, hashed passwords/OTPs, centralized errors
- Real-time: Socket.IO trip status and driver-location events

## Important production note
This repository is a complete runnable application foundation, but a real public launch still requires your own production infrastructure and credentials:
- MongoDB Atlas production database
- HTTPS/domain
- Google Maps Platform key
- Payment provider account and webhook secrets
- SMS/email provider
- Cloud image storage
- Monitoring/logging
- Backup and recovery policy
- Legal/privacy/terms documents
- Security and load testing

Do not commit `.env` files or private API secrets.

## Run locally

### Backend
```powershell
cd backend
copy .env.example .env
npm.cmd install
npm.cmd start
```

### Frontend
```powershell
cd frontend
copy .env.example .env
npm.cmd install
npm.cmd run dev
```

Backend health: http://localhost:5000/health
Frontend: http://localhost:5173

## Demo flow
1. Register customer.
2. Create vehicle.
3. A driver must exist and be verified before appearing in Book Driver.
4. Customer creates booking.
5. Driver accepts.
6. Customer generates handover OTP.
7. Driver verifies OTP and starts trip.
8. Customer generates return OTP.
9. Driver verifies OTP and completes trip.
10. Customer can review the completed trip.

## Before public launch
Use production credentials, HTTPS, strict CORS, secure deployment secrets, backups, monitoring, payment webhooks, image upload validation, abuse controls, automated tests, and a security review.
