import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    // Extract movie data from request body
    const movieData = await request.json();

    // Insert the movie into the database
    const { data, error } = await supabase
      .from('movies')
      .insert([
        {
          title: movieData.title,
          description: movieData.description,
          thumbnail_url: movieData.thumbnail_url,
          backdrop_url: movieData.backdrop_url,
          poster_url: movieData.poster_url,
          video_url: movieData.video_url,
          rating: movieData.rating,
          release_year: movieData.release_year,
          duration: movieData.duration,
          genre: movieData.genre,
          director: movieData.director,
          movie_cast: movieData.movie_cast
        }
      ])
      .select();

    if (error) {
      console.error('Error inserting movie:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // If adding subtitles is required, you could add code here
    // to insert subtitles for the movie

    return NextResponse.json({ 
      success: true, 
      message: 'Movie added successfully', 
      data 
    });
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'An unexpected error occurred' 
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get('genre');
    
    // Build the query
    let query = supabase.from('movies').select('*');
    
    // Add filter by genre if specified
    if (genre) {
      query = query.contains('genre', [genre]);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching movies:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'An unexpected error occurred' 
    }, { status: 500 });
  }
} 