# Production image for the Django API (referenced in DEPLOY-AWS.md).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# collectstatic at build time (admin assets); ignore failure if no static yet.
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

# Gunicorn = production WSGI server (don't use runserver in prod).
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
