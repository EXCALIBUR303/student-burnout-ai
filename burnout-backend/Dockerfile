# Burnout/AI backend -- explicit Dockerfile for Railway
FROM python:3.12-slim

RUN apt-get update     && apt-get install -y --no-install-recommends libgomp1     && apt-get clean     && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

ENV PYTHONUNBUFFERED=1
ENV OMP_NUM_THREADS=1
ENV OPENBLAS_NUM_THREADS=1
ENV MKL_NUM_THREADS=1

# start.sh is in the repo and gets copied by COPY . .
# chmod makes it executable inside the image.
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
