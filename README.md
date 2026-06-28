# Study Tracker

Track academic progress — semesters, subjects, units, topics, and resources.

## Stack

- Next.js 16 (App Router) · TypeScript · Tailwind CSS 4
- Prisma + Neon Postgres
- Auth.js v5 (Credentials)
- UploadThing (image + file uploads)

## Local setup

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env
# Fill in DATABASE_URL, AUTH_SECRET, AUTH_URL, UPLOADTHING_* in .env

# 3. Database
npx prisma migrate dev --name init
npx prisma db seed        # creates demo@studytracker.dev / demo1234

# 4. Dev server
npm run dev               # http://localhost:3000
```

## Deploy (Vercel + Neon)

1. Push to GitHub
2. Import repo in Vercel
3. Add all `.env.example` vars in Vercel → Settings → Environment Variables
4. Vercel runs `npm run build` automatically

## Demo credentials

```
Email:    demo@studytracker.dev
Password: demo1234
```
