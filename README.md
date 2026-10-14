# Library Management System

Flask + MySQL backend serving a plain HTML/JS frontend.

## Run locally
1. Install Python 3.10+ and MySQL.
2. Create the database: mysql -u root -p < database/schema.sql (then database/add_feedback_table.sql if needed).
3. cd backend; python -m venv .venv; activate it; pip install -r requirements.txt
4. Set env vars from backend/.env.example (DB_PASSWORD, LMS_SECRET, ...).
   - PowerShell: $env:DB_PASSWORD="yourpass"; $env:LMS_SECRET="randomstring"
   - Linux/Mac: export DB_PASSWORD=yourpass LMS_SECRET=randomstring
5. python app.py, then open http://127.0.0.1:5000

## Logins
| Role | Page | Credentials |
|------|------|-------------|
| Admin | `/admin/login.html` | `admin@library.com` / `Library@2024` (auto-created on first start if no admin exists; override with `ADMIN_EMAIL` / `ADMIN_PASSWORD`) |
| Student | `/login.html` (has Register tab) | register a new account, or use dummy data below |

## Dummy data
`cd backend && python seed.py` adds 8 students (password `Student@123`, e.g. `arun@student.com`), 20 books, 3 events, approved memberships and some borrow records (incl. overdue). Safe to re-run.
Students need an **approved membership** to borrow; `sneha@student.com` is pending and `vignesh@student.com` has none, so you can test the approval flow from the admin panel.

## Updating an existing install
After pulling new code, restart `python app.py` (it adds any new database columns automatically) and hard-refresh the browser (Ctrl+F5).
