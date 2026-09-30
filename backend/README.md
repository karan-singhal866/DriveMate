# DriveMate Production-Ready Foundation

DriveMate is a customer-owned-vehicle driver booking platform.

## Included
- JWT authentication and roles
- Customer, driver and admin workflows
- Driver applications and approval
- Vehicle management and inspections
- Booking lifecycle
- Secure hashed handover/return OTPs
- Notifications
- Reviews and driver ratings
- Admin dashboard endpoints
- Socket.IO live trip updates
- Driver GPS location endpoint
- Helmet, CORS, rate limiting and centralized errors
- MongoDB indexes and graceful shutdown

## Third-party integrations
The architecture leaves clean integration points for Google Maps, Razorpay, SMS/email providers and cloud image storage. Those services require your own accounts and secret credentials.

## Setup
1. Copy `.env.example` to `.env`.
2. Fill in `MONGO_URI` and a random `JWT_SECRET` of at least 32 characters.
3. Run `npm.cmd install`.
4. Run `npm.cmd start`.
5. Test `GET http://localhost:5000/health`.

Never commit `.env`.
