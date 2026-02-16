import { NextResponse } from 'next/server';
import { getClusterInfo } from '@/lib/elasticsearch';

export async function GET() {
  try {
    const info = await getClusterInfo();
    return NextResponse.json(info);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get cluster info: ' + error },
      { status: 503 }
    );
  }
}
