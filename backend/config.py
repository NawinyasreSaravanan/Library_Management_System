"""Central config, read from environment variables (see .env.example)."""
import os

# Load backend/.env (KEY=value per line) so you don't have to set variables in every terminal
_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
if os.path.isfile(_env):
    for _line in open(_env, encoding='utf-8'):
        _line = _line.strip()
        if _line and not _line.startswith('#') and '=' in _line:
            _k, _v = _line.split('=', 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

SECRET = os.environ.get("LMS_SECRET", "change-me-in-production")


DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "port": int(os.environ.get("DB_PORT", "3306")),
    "user": os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASSWORD", ""),
    "database": os.environ.get("DB_NAME", "library_db"),
    "charset": "utf8mb4",
    "autocommit": True
}

# Default admin, created automatically on startup if no admin exists
ADMIN_EMAIL    = os.environ.get('ADMIN_EMAIL', 'admin@library.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Library@2024')
