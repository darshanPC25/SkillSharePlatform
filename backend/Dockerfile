FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Collect static files (if needed and not handled exclusively via S3)
# RUN python manage.py collectstatic --noinput

# Run via Daphne for ASGI support (REST + WebSockets)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "skill_swap.asgi:application"]
