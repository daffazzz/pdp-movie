import { NextRequest, NextResponse } from 'next/server';
import { enhancedSearch } from '../../../utils/search-utils';

export async function GET(request: NextRequest) {
  try {
    // Get search query from URL
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Missing search query parameter' },
        { status: 400 }
      );
    }
    
    // Perform enhanced search
    const results = await enhancedSearch(query);
    
    return NextResponse.json({
      query,
      resultsCount: results.length,
      results
    });
  } catch (error: any) {
    console.error('Enhanced search API error:', error);
    
    return NextResponse.json(
      { error: error.message || 'An error occurred during search' },
      { status: 500 }
    );
  }
} 