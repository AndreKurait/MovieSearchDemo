import { NextResponse } from 'next/server';
import { getGenres } from '@/lib/elasticsearch';

export async function GET() {
  try {
    const genres = await getGenres();
    return NextResponse.json({ genres });
  } catch (error) {
    console.error('Genres API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
