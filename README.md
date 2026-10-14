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
