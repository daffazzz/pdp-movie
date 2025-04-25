# PDP Movie - Streaming Platform

A Netflix-style movie streaming application built with Next.js, Supabase, and Video.js.

![PDP Movie](https://via.placeholder.com/800x400?text=PDP+Movie)

## Features

- 🎬 Browse and search movies by genre, title, or description
- 🌟 Display movie details including rating, description, and cast
- 📺 Efficient video playback with Video.js
- 📱 Responsive design for all devices
- 🎭 Netflix-like UI with smooth animations and transitions
- 🗣️ Support for multiple subtitle languages
- 🔐 Integration with Supabase for data storage and management

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Video Player**: Video.js (with HTTP streaming)
- **Styling**: Tailwind CSS + custom styling
- **Icons**: React Icons

## Setup Instructions

### Prerequisites

- Node.js (v18 or newer)
- npm or yarn
- A Supabase account

### Setup Steps

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/pdp-movie.git
cd pdp-movie
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Set up Supabase**

- Create a new project in Supabase
- Set up the database schema using the SQL in `supabase/schema.sql`
- Get your Supabase URL and anon key

4. **Configure environment variables**

Create a `.env.local` file in the root directory with the following content:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. **Run the development server**

```bash
npm run dev
# or
yarn dev
```

6. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## Database Schema

The application uses the following tables in Supabase:

- **movies**: Stores all movie information
- **subtitles**: Stores subtitle information for movies
- **genres**: List of all available genres
- **profiles**: User profile information
- **watchlist**: Movies added to user watchlists
- **watch_history**: User watch history

## Adding Movies

To add movies to your platform:

1. Use the Supabase dashboard to insert movie records
2. Add subtitles for each movie in the `subtitles` table
3. Make sure all movie thumbnails, posters, and video URLs are publicly accessible

## Customization

- Change the color scheme in `tailwind.config.js`
- Modify the layout in `app/layout.tsx`
- Update the logo and branding in the `Navbar.tsx` component

## License

This project is open-source and available under the MIT License.

## Acknowledgements

- Next.js team for the amazing framework
- Supabase for the backend infrastructure
- Video.js for the video player
- All the contributors to the dependencies used in this project

## Video Player Integration

Aplikasi ini menggunakan integasi dengan VidSrc untuk memutar video film. Terdapat beberapa komponen penting:

1. **MoviePlayer Component** - Komponen React untuk menampilkan video dari VidSrc
2. **Database Schema** - Tabel `movie_sources` untuk menyimpan URL video
3. **Triggers** - Trigger database untuk menambahkan sumber video secara otomatis

## Setup VidSrc Integration

1. Jalankan file migrasi SQL untuk menyiapkan tabel dan trigger:

```bash
# Dari Supabase Dashboard
1. Buka project di Supabase
2. Buka menu SQL Editor
3. Buka file setup_movie_sources.sql
4. Jalankan SQL untuk membuat tabel dan trigger
```

Atau menggunakan CLI:

```bash
# Menggunakan Supabase CLI
supabase db reset
```

2. Migrasikan film yang sudah ada ke format baru:

File SQL akan melakukan hal berikut:
- Membuat tabel `movie_sources` jika belum ada
- Menambahkan kolom `external_ids` dan `has_sources` ke tabel `movies`
- Membuat trigger untuk menambahkan sumber video otomatis
- Memigrasikan film yang ada dengan `external_ids` ke format baru

## Penggunaan VidSrc API

VidSrc API mendukung dua format ID film:
1. IMDB ID (format: tt123456)
2. TMDB ID (format: 12345)

URL embed yang benar untuk VidSrc adalah:
```
https://player.vidsrc.co/embed/movie/{id}
```

Di mana {id} adalah:
- IMDB ID (diutamakan jika tersedia)
- TMDB ID (jika IMDB ID tidak tersedia)

## Troubleshooting

Jika video player menampilkan error:

1. **Error VTT Subtitle**
   - Ini adalah error normal dari VidSrc dan tidak mempengaruhi pemutaran video
   - Error VTT berhubungan dengan loading subtitle, bukan masalah dengan player 

2. **Player tidak muncul/blank**
   - Periksa apakah film memiliki `external_ids` yang valid
   - Pastikan kolom `has_sources` bernilai `true`

3. **Periksa Movie Sources**
   - Gunakan SQL berikut untuk melihat sumber video yang tersedia:
   ```sql
   SELECT m.title, ms.* 
   FROM movie_sources ms
   JOIN movies m ON ms.movie_id = m.id
   WHERE m.id = '<masukkan-id-film>';
   ```

## Menambahkan Film Baru

Ketika menambahkan film baru ke database, pastikan:

1. Kolom `external_ids` diisi dengan:
   ```json
   {
     "imdb_id": "tt1234567",
     "tmdb_id": 1234567
   }
   ```

2. Trigger akan secara otomatis menambahkan sumber VidSrc berdasarkan ID tersebut

## Update Manual Source

Jika perlu update source secara manual:

```sql
INSERT INTO movie_sources (movie_id, provider, url, embed_url, is_default)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000', -- ID film
  'vidsrc',
  'https://vidsrc.to/embed/movie/tt1234567',
  'https://player.vidsrc.co/embed/movie/tt1234567',
  true
)
ON CONFLICT (movie_id, provider) DO UPDATE
SET url = EXCLUDED.url, embed_url = EXCLUDED.embed_url;
```

## Deployment on Vercel

This project is configured for easy deployment on Vercel. Follow these steps to deploy:

1. Push your code to a GitHub repository
2. Sign in to [Vercel](https://vercel.com) and create a new project
3. Import your GitHub repository
4. Configure the following environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `NEXT_PUBLIC_TMDB_API_KEY`: Your TMDB API key
5. Deploy the project

The Vercel configuration includes:
- Optimized build settings
- Security headers
- Caching strategies for static assets
- Asia (Singapore) region deployment for optimal performance

To update the deployment after code changes, simply push to your GitHub repository and Vercel will automatically redeploy.

**Note:** Make sure your Supabase project is properly configured with the necessary tables, functions, and policies for the application to work correctly.
