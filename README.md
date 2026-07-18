# Taweed Lughoh — Admin Dashboard

Admin dashboard for the Taweed Lughoh Arabic learning event.

## Stack

- React + Vite
- Tailwind CSS v4
- React Router
- shadcn/ui
- Lucide React Icons
- Backend: Google Apps Script + Google Sheets — see [`apps-script/README.md`](./apps-script/README.md)

Real login with role-based access (admin / tutor). Tutors only see and edit
their assigned class. No data is mocked — everything reads/writes through
the Apps Script API.

## Pages

- Login — real auth against the Users sheet
- Dashboard — total students, classes, meetings, today's attendance
- Students — search, add/edit/delete (admin only)
- Attendance — filter by meeting/class, editable status per student
- Scores — filter by class, pre-test/post-test table (admin + tutor for their own class)

## Getting started

1. Copy `.env.local.example` (or add to `.env.local`) a `VITE_API_BASE_URL`
   pointing at the deployed Apps Script web app URL — see
   [`apps-script/README.md`](./apps-script/README.md) for deployment steps.
2. Install and run:

```bash
npm install
npm run dev
```
