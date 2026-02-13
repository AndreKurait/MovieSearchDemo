import { NextRequest, NextResponse } from 'next/server';
import { getSimilarMovies } from '@/lib/elasticsearch';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '8', 10);

  try {
    const movies = await getSimilarMovies(id, Math.min(20, Math.max(1, limit)));
    return NextResponse.json({ movies });
  } catch (error) {
    console.error('Similar movies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
