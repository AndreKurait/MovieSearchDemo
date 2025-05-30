#!/bin/bash

# Use LOCUST_HOST from ConfigMap if available, otherwise use default
if [ -z "$LOCUST_HOST" ]; then
    echo "LOCUST_HOST not set from ConfigMap, using default: $LOCUST_HOST_DEFAULT"
    export LOCUST_HOST="$LOCUST_HOST_DEFAULT"
else
    echo "Using LOCUST_HOST from ConfigMap: $LOCUST_HOST"
fi

# Start locust in standalone mode (no master/worker setup)
echo "Starting Locust in standalone mode..."
locust -f /app/locustfile.py --host="$LOCUST_HOST"
