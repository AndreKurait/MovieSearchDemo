import { NextRequest, NextResponse } from 'next/server';
import { searchMovies, SearchParams } from '@/lib/elasticsearch';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const semanticRatio = parseFloat(searchParams.get('semanticRatio') || '0');
  const genres = searchParams.get('genres')?.split(',').filter(Boolean) || [];
  const ratingMin = searchParams.get('ratingMin') ? parseFloat(searchParams.get('ratingMin')!) : undefined;
  const ratingMax = searchParams.get('ratingMax') ? parseFloat(searchParams.get('ratingMax')!) : undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '24', 10);

  try {
    const params: SearchParams = {
      query,
      semanticRatio: isNaN(semanticRatio) ? 0 : Math.max(0, Math.min(1, semanticRatio)),
      genres: genres.length > 0 ? genres : undefined,
      ratingMin: ratingMin !== undefined && !isNaN(ratingMin) ? ratingMin : undefined,
      ratingMax: ratingMax !== undefined && !isNaN(ratingMax) ? ratingMax : undefined,
      page: Math.max(1, page),
      pageSize: Math.min(50, Math.max(1, pageSize)),
    };

    const results = await searchMovies(params);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
