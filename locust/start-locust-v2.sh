#!/bin/bash

# Simple startup script without ConfigMap dependency
echo "Starting Locust in standalone mode..."
echo "Target host: $LOCUST_HOST"

# Start locust with the provided environment variables
if [ "$LOCUST_HEADLESS" = "true" ]; then
    echo "Running in headless mode..."
    locust -f /app/locustfile.py \
        --host="$LOCUST_HOST" \
        --users="$LOCUST_USERS" \
        --spawn-rate="$LOCUST_SPAWN_RATE" \
        --run-time="$LOCUST_RUN_TIME" \
        --headless
else
    echo "Running with web UI..."
    locust -f /app/locustfile.py --host="$LOCUST_HOST"
fi
