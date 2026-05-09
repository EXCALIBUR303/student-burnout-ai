# Burnout/AI backend — explicit Dockerfile so Railway picks this up instead
# of nixpacks. Nixpacks was ignoring our aptPkgs config and silently failing
# to install libgomp1 (required by LightGBM in the v4/v5 stacking ensemble).
#
# When this image is detected, Railway uses it instead of nixpacks.

FROM python:3.13-slim

# System deps:
#   libgomp1 — GNU OpenMP runtime (required by LightGBM and XGBoost C extensions)
#   build-essential — only here in case any wheel needs to compile from source
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first so the layer caches when only code changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend
COPY . .

# Railway provides $PORT at runtime; bind to it
ENV PYTHONUNBUFFERED=1
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
