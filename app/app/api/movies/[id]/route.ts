import { NextRequest, NextResponse } from 'next/server';
import { getMovie } from '@/lib/elasticsearch';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const movie = await getMovie(id);
    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }
    return NextResponse.json(movie);
  } catch (error) {
    console.error('Get movie error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
