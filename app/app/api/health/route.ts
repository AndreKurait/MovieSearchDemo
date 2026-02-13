import { NextResponse } from 'next/server';
import { getHealthInfo } from '@/lib/elasticsearch';

export async function GET() {
  try {
    const health = await getHealthInfo();
    const status = health.status === 'ok' ? 200 : 503;
    return NextResponse.json({
      ...health,
      timestamp: new Date().toISOString(),
    }, { status });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed: ' + error,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
