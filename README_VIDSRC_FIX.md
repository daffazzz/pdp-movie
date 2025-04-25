# VidSrc Domain Fix Documentation

## Overview

This documentation explains the comprehensive solution to fix the issues with VidSrc video players on the PDP Movie application. The main issues being addressed are:

1. The vidsrc.xyz domain is deprecated, causing 404 errors
2. The trigger `generate_episode_tmdb_url` needs to be fixed in the database
3. URLs in the database need to be updated to use the correct format and domain

## Solution Components

### 1. Database Fixes

Three SQL scripts have been created to fix the database issues:

#### a. `fix_episode_trigger.sql`

This script addresses the issue with the trigger that generates episode URLs. It:
- Checks and drops existing triggers
- Creates a new function that generates the correct URL format
- Creates a new trigger that only executes if it doesn't already exist

To run:
```
Execute this script in the Supabase SQL Editor
```

#### b. `fix_episode_urls.sql`

This script fixes the existing URLs in the database:
- Updates URLs with the incorrect `/tv-tmdb` format to the correct `/tv` format
- Updates URLs using the old vidsrc.xyz domain to vidsrc.to
- Regenerates missing or empty URLs using series TMDB IDs
- Provides reporting on any remaining problematic URLs

To run:
```
Execute this script in the Supabase SQL Editor
```

#### c. `fix_vidsrc_domain_references.sql`

This script performs a comprehensive scan of the database to find and fix any other references to vidsrc.xyz:
- Scans all text columns in all tables for references to vidsrc.xyz
- Specifically checks settings and configuration tables
- Fixes episode URLs (redundant with fix_episode_urls.sql but included for completeness)
- Reports any remaining references that couldn't be fixed

To run:
```
Execute this script in the Supabase SQL Editor
```

### 2. Front-end Fixes

Two front-end components have been added to address client-side issues:

#### a. VidsrcFixer Component (`app/components/VidsrcFixer.tsx`)

This is a global component that intercepts and fixes any attempts to load resources from vidsrc.xyz:
- Intercepts and blocks errors from failed vidsrc.xyz resource loading
- Patches the fetch API to rewrite vidsrc.xyz URLs to vidsrc.to
- Modifies script elements to rewrite src attributes that reference vidsrc.xyz

The component has been added to the `layout.tsx` file to ensure it's loaded on all pages.

#### b. Episode Player Fix (`app/tvshows/[id]/page.tsx`)

An additional fix has been added specifically to the TV show episode player to:
- Block errors from vidsrc.xyz resources
- Prevent console errors from the sbx.js script

## Implementation Steps

To fully implement this solution:

1. Run the database scripts in the Supabase SQL Editor in this order:
   - `fix_episode_trigger.sql`
   - `fix_episode_urls.sql`
   - `fix_vidsrc_domain_references.sql`

2. Ensure the front-end components are correctly added to your codebase:
   - `VidsrcFixer.tsx` component exists in the components folder
   - `VidsrcFixer` is imported and added to the layout.tsx file
   - The fix in the TV shows page is implemented

3. If you're still experiencing issues with specific player components, you may need to:
   - Check for any hardcoded references to vidsrc.xyz in your code
   - Update any direct integrations with VidSrc to use the player.vidsrc.co or vidsrc.to domains

## Possible Additional Steps

If issues persist, consider:

1. Updating to the newest VidSrc embedding method as per their documentation
2. Adding a Content Security Policy that allows vidsrc.to/player.vidsrc.co but blocks vidsrc.xyz
3. Implementing a custom player that doesn't rely on external embeds

## References

- VidSrc Official Documentation: https://docs.vidsrc.me/
- Current VidSrc endpoint format: `https://player.vidsrc.co/embed/tv/{id}/{season}/{episode}`

## Support

If you continue to experience issues after implementing these fixes, please check:
1. Console errors in your browser's developer tools
2. Network requests to see if any vidsrc.xyz requests are still being made
3. The Supabase database to ensure all URLs have been properly updated 