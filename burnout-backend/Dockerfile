# Burnout/AI backend - explicit Dockerfile so Railway picks this up instead
# of nixpacks.

FROM python:3.12-slim

# System deps: libgomp1 required by LightGBM and XGBoost C extensions
RUN apt-get update     && apt-get install -y --no-install-recommends libgomp1     && apt-get clean     && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first so the layer caches when only code changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend
COPY . .

ENV PYTHONUNBUFFERED=1
ENV OMP_NUM_THREADS=1
ENV OPENBLAS_NUM_THREADS=1
ENV MKL_NUM_THREADS=1

# Railway runs startCommand in exec form (no shell), so $PORT is never
# expanded if we pass it inline. A shell script (#!/bin/sh) is executed
# by sh, so ${PORT:-8000} expands to the real port number.
RUN printf '#!/bin/sh
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
' > /app/start.sh     && chmod +x /app/start.sh

CMD ["/app/start.sh"]
