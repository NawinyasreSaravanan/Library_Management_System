"""Central config, read from environment variables (see .env.example)."""
import os

SECRET = os.environ.get("LMS_SECRET", "change-me-in-production")

DB_CONFIG = {
    "host"    : os.environ.get("DB_HOST", "localhost"),
    "user"    : os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASSWORD", ""),
    "database": os.environ.get("DB_NAME", "library_db"),
    "charset" : "utf8mb4",
    "autocommit": True
}

# Default admin, created automatically on startup if no admin exists
ADMIN_EMAIL    = os.environ.get('ADMIN_EMAIL', 'admin@library.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Library@2024')
