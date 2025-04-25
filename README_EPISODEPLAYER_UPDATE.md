# EpisodePlayer Component Update

## Problem

There was a mismatch between the defined props for the EpisodePlayer component and how the component was being used in the TVShows page. This caused errors when trying to load episode videos.

Specifically:

1. The EpisodePlayer component **defined** these props:
```typescript
interface EpisodePlayerProps {
  embedUrl: string;
  videoUrl?: string; // For backward compatibility
  showTitle: string;
  seasonNumber: number;
  episodeNumber: number;
}
```

2. But it was **used** with different props in `app/tvshows/[id]/page.tsx`:
```typescript
<EpisodePlayer 
  seriesId={series.id}
  season={season}
  episode={episodeNum}
  height="100%"
  onError={(errorMsg) => console.error("Episode player error:", errorMsg)}
/>
```

3. The component wasn't designed to fetch episode data from the database, but the way it was used in the TVShows page expected it to.

## Solution

We updated the EpisodePlayer component to:

1. Support both usage patterns:
   - **Direct URL mode**: When embedUrl/videoUrl are provided directly
   - **Database fetch mode**: When seriesId, season, and episode numbers are provided

2. Update the props interface to make all props optional and include both naming conventions:
```typescript
interface EpisodePlayerProps {
  // Original props
  embedUrl?: string;
  videoUrl?: string;
  showTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  
  // New props that match how it's used in the TVShows page
  seriesId?: string;
  season?: number;
  episode?: number;
  height?: string;
  onError?: (errorMsg: string) => void;
}
```

3. Add database fetching logic that:
   - Gets the series title if not provided
   - Fetches the specific episode's embed_url and video_url
   - Ensures URLs are in the correct format (player.vidsrc.co)
   - Updates the database with corrected URLs when needed

4. Support flexible height (percentage-based or explicit height)

5. Add proper error handling and propagation through the onError callback

## Benefits

1. **Forward and Backward Compatibility**: The component now works with both the original prop structure and the new one.

2. **Improved Error Handling**: Errors during fetch and playback are properly captured and reported.

3. **Self-Healing URLs**: The component automatically converts any remaining vidsrc.to URLs to player.vidsrc.co and updates the database.

4. **Better Fallbacks**: The component has improved fallback behavior when props are missing or incomplete.

## Usage

### Direct URL Mode (Original)
```jsx
<EpisodePlayer
  embedUrl="https://player.vidsrc.co/embed/tv/12345/1/1"
  showTitle="Show Title"
  seasonNumber={1}
  episodeNumber={1}
/>
```

### Database Fetch Mode (New)
```jsx
<EpisodePlayer
  seriesId="uuid-of-series"
  season={1}
  episode={1}
  height="100%"
  onError={(error) => console.error("Player error:", error)}
/>
```

## Related Changes

1. The SQL trigger for episode URL generation was previously fixed to generate both URL formats:
   - `video_url`: Using vidsrc.to (for backward compatibility)
   - `embed_url`: Using player.vidsrc.co (which works better)

2. A SQL migration script was created to update existing episode records.

## Next Steps

1. Consider standardizing the component prop interface across all players.
2. Ensure the episode URL update SQL script has been run on all environments.
3. Consider adding additional error recovery strategies for failed playbacks. 