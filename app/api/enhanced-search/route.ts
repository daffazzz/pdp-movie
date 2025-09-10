import { NextRequest, NextResponse } from 'next/server';
import { enhancedSearch } from '@/utils/search-utils';

export async function GET(request: NextRequest) {
  try {
    // Get the search query from URL parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    
    // Validate query
    if (!query.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Search query is required'
      }, { status: 400 });
    }
    
    // Perform the search
    const results = await enhancedSearch(query);
    
    // Return results
    return NextResponse.json({
      success: true,
      results: results,
      query: query,
      total: results.length
    });
  } catch (error: any) {
    console.error('Error in enhanced search API:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to perform search'
    }, { status: 500 });
  }
}