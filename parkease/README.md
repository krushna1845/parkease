# ParkEase – Smart Parking Slot Booking System (MERN)

## Run it
Requirements: Node 18+, MongoDB running locally (or an Atlas URI).

```bash
# Terminal 1 - backend
cd server
cp .env.example .env        # set MONGO_URI and JWT_SECRET
npm install
npm run seed                # creates admin, demo user, 2 areas, 12 slots
npm run dev                 # http://localhost:5000

# Terminal 2 - frontend
cd client
npm install
npm run dev                 # http://localhost:5173
```
Logins after seeding: admin `admin@parkease.com / admin123`, user `user@parkease.com / user123`.
Without SMTP settings, "emails" are printed in the server console.

Full explanation (architecture, data flow, workflow, viva Q&A): see **DOCS.md**.
