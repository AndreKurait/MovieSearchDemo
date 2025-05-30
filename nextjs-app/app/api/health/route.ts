import { NextResponse } from 'next/server';
import { Client } from '@elastic/elasticsearch';

// Create a separate client instance for health checks with shorter timeout
const healthClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || ''
  },
  tls: {
    rejectUnauthorized: false
  },
  requestTimeout: 2000, // 2 seconds for health checks
  maxRetries: 1 // Don't retry health checks
});

export async function GET() {
  try {
    // Check if the application is ready
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        app: 'ok',
        elasticsearch: 'checking'
      }
    };

    // Try to ping Elasticsearch
    await healthClient.ping();
    checks.checks.elasticsearch = 'ok';

    return NextResponse.json(checks, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'Error: ' + error, 
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
