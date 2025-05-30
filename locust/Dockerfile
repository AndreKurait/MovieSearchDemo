FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy locust files
COPY locustfile.py .
COPY start-locust-v2.sh .
RUN chmod +x start-locust-v2.sh

# Expose web UI port
EXPOSE 8089

# Use the simplified startup script
ENTRYPOINT ["/app/start-locust-v2.sh"]
