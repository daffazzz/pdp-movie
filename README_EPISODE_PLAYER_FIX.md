# TV Episode Player Fix

## Problem

The TV episode player was not working correctly while movie playback was functioning properly. The issue was traced to these key differences:

1. **Different Domain Usage:**
   - Movies use `player.vidsrc.co` for the embed URL
   - TV shows were using `vidsrc.to`

2. **Inconsistent URL Formats:**
   - Movies: 
     - `url`: `https://vidsrc.to/embed/movie/{id}`
     - `embed_url`: `https://player.vidsrc.co/embed/movie/{id}`
   - TV Shows:
     - Both `video_url` and `embed_url` were using: `https://vidsrc.to/embed/tv/{id}/{season}/{episode}`

3. **Error Handling:**
   - The direct iframe embedding approach for TV shows lacked proper error handling
   - The direct approach did not handle domain conversion on-the-fly

## Solution

We implemented a comprehensive fix with both database updates and front-end enhancements:

### 1. Database Fix: Updated Episode URLs

Created and executed `fix_episode_player.sql` which:
- Updates all existing episode `embed_url` values to use `player.vidsrc.co` instead of `vidsrc.to`
- Modifies the trigger function to generate proper URLs for new episodes
- Maintains backward compatibility by keeping `video_url` with the old format

### 2. New EpisodePlayer Component

Created a dedicated `EpisodePlayer.tsx` component that:
- Follows the same pattern as the working `MoviePlayer` component
- Provides robust error handling
- Automatically converts any remaining `vidsrc.to` URLs to `player.vidsrc.co` on the client side
- Updates the database with the corrected URL for future use

### 3. TV Show Page Update

Modified `app/tvshows/[id]/page.tsx` to:
- Replace the direct iframe with our new `EpisodePlayer` component
- Provide proper error handling
- Maintain the same UI layout and appearance

## Implementation Details

### Database Changes

The trigger function now generates both URL formats:
```sql
CREATE OR REPLACE FUNCTION generate_episode_tmdb_url()
RETURNS TRIGGER AS $$
DECLARE
    series_tmdb_id INT;
BEGIN
    -- Get the tmdb_id from the series table
    SELECT tmdb_id INTO series_tmdb_id
    FROM public.series
    WHERE id = NEW.series_id;
    
    -- Set video_url field to vidsrc.to URL format (keep for backwards compatibility)
    IF series_tmdb_id IS NOT NULL THEN
        NEW.video_url := 'https://vidsrc.to/embed/tv/' || series_tmdb_id || '/' || NEW.season || '/' || NEW.episode;
        -- Set embed_url to player.vidsrc.co URL format (this is what works for movies)
        NEW.embed_url := 'https://player.vidsrc.co/embed/tv/' || series_tmdb_id || '/' || NEW.season || '/' || NEW.episode;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Component Logic

The `EpisodePlayer` component includes:
- Proper loading states
- Error handling
- Fallback UI
- URL format conversion
- Automatic database updates for legacy URLs

### Additional Fixes

The `VidsrcFixer` component remains in place to address any remaining references to the old domain in client-side code.

## How to Implement

1. Run the SQL script `fix_episode_player.sql` in your Supabase SQL Editor
2. Ensure the `EpisodePlayer.tsx` component is added to your codebase
3. Update the TV show page to use the new component

## Troubleshooting

If issues persist:
1. Check console logs for errors
2. Verify that the URLs in your database are using the correct format
3. Ensure the `VidsrcFixer` component is loaded globally

## References

- Movie player component pattern: `app/components/MoviePlayer.tsx`
- VidSrc documentation: Their API expects different domains for embedding vs direct access 