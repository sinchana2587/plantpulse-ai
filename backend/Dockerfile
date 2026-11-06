FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and system libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Ensure storage directories exist
RUN mkdir -p data/uploads data/models data/seed_data data/disease_datasets

EXPOSE 8000

ENV PORT=8000
ENV ENVIRONMENT=production

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
