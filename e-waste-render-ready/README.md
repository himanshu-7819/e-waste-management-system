# E-Waste Management System (Render-ready)

This project is a simple E-Waste Management System built with Node.js, Express and SQLite.
It is prepared to be deployed on Render.com (or similar services) without additional setup.

## Features
- User signup/login (password hashed with bcrypt)
- JWT authentication
- Create collection requests
- Admin dashboard to view and update request status
- SQLite database stored in `e-waste.db` (auto-created)
- Frontend served from `public/`

## How to deploy on Render.com (quick)
1. Create a GitHub repository and push all files from this project.
2. Sign in to Render (https://render.com) and connect your GitHub.
3. Create a **New Web Service**:
   - Choose your repo
   - Branch: main (or whichever)
   - Build command: `npm install`
   - Start command: `npm start`
4. Add environment variables on Render (optional but recommended):
   - `JWT_SECRET` = your_secret_here
   - `TOKEN_EXPIRES_IN` = `7d` (optional)
   - `DB_FILE` = `./e-waste.db` (default)
5. Deploy — after a few moments your service will be live and Render will provide a URL.

## Local run (for testing)
1. Copy `.env.example` to `.env` and edit if needed.
2. Run:
```bash
npm install
node server.js
```
3. Open `http://localhost:3000`

## Admin credentials (auto-created on first run)
- Email: `admin@example.com`
- Password: `admin123`

## Notes
- Do **NOT** commit the `e-waste.db` file if you want a fresh DB on each deployment. It's included in `.gitignore`.
- If Render's ephemeral filesystem removes the DB after restarts, consider using a persistent DB solution (e.g., Managed PostgreSQL or MongoDB) for production.

