# ParkEase – Application Root

This directory contains the ParkEase application source code, Docker configuration, and documentation.

- **Main Documentation:** Please see the root [README.md](../README.md) for full project architecture, installation instructions, Docker guides, and screenshots.
- **Design & ER Documentation:** See [DOCS.md](DOCS.md) for complete database schema, ER diagrams, data flow diagrams, and viva Q&A.

## Quick Run

### Local Development
```bash
# Terminal 1 - Backend
cd server
cp .env.example .env
npm install
npm run seed
npm run dev

# Terminal 2 - Frontend
cd client
cp .env.example .env
npm install
npm run dev
```

### Docker Compose
```bash
cp .env.example .env
docker compose up -d --build
docker compose exec server node seed.js
```

### Demo Accounts
- Admin: `admin@parkease.com` / `admin123`
- User: `user@parkease.com` / `user123`
