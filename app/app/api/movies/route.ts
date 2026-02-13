import { NextRequest, NextResponse } from 'next/server';
import { indexMovie } from '@/lib/elasticsearch';

export async function POST(request: NextRequest) {
  try {
    const movie = await request.json();
    
    // Index the movie into Elasticsearch
    const result = await indexMovie(movie);
    
    return NextResponse.json({ 
      success: true, 
      id: result.id,
      message: 'Movie indexed successfully' 
    });
  } catch (error) {
    console.error('Movie ingestion error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to index movie' 
    }, { status: 500 });
  }
}
