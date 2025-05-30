# TMDB Dataset Integration

This document summarizes the changes made to integrate the TMDB Movies Dataset (930k movies) from Kaggle into the demo application.

## Changes Made

### 1. Python Scripts Added
- **`nextjs-app/scripts/requirements.txt`**: Python dependencies for data loading
- **`nextjs-app/scripts/load-tmdb-data.py`**: Main script to download and process TMDB data
- **`nextjs-app/scripts/setup-tmdb-data.sh`**: Shell script to automate the setup process

### 2. TypeScript Interface Updates
- **`nextjs-app/lib/elasticsearch.ts`**: Updated Movie interface to match TMDB fields:
  - Added: `tagline`, `genres`, `overview`, `release_date`, `vote_average`, `vote_count`, `popularity`
  - Removed: `year`, `director`, `description` (old sample data fields)
  - Updated search fields to use TMDB field names with proper weights

### 3. Frontend Updates
- **`nextjs-app/app/page.tsx`**: Updated UI to display TMDB fields:
  - Shows movie tagline in italics
  - Displays release year and TMDB rating
  - Uses `genres` array instead of `genre`
  - Shows `overview` instead of `description`

### 4. Package.json Script
- Added `npm run load-tmdb` command for easy data loading

### 5. Documentation
- Updated **`README.md`** with comprehensive TMDB setup instructions
- Added troubleshooting and customization sections

## New Movie Data Structure

```typescript
interface Movie {
  id: string;
  title: string;           // Movie title
  tagline?: string;        // Movie tagline/slogan
  genres: string[];        // Array of genre names
  overview: string;        // Plot summary
  release_date?: string;   // Release date (YYYY-MM-DD)
  vote_average?: number;   // TMDB rating (0-10)
  vote_count?: number;     // Number of votes
  popularity?: number;     // TMDB popularity score
}
```

## How to Use

### Quick Setup
```bash
cd nextjs-app
npm run load-tmdb
```

### Manual Setup
```bash
cd nextjs-app/scripts
pip3 install -r requirements.txt
python3 load-tmdb-data.py
```

### What the Script Does
1. Downloads the TMDB dataset from Kaggle (930k movies)
2. Processes the CSV file to extract relevant fields
3. Creates proper Elasticsearch index mapping
4. Bulk imports 50,000 movies (configurable)
5. Handles genre parsing from JSON strings
6. Filters out movies without titles or descriptions
7. Uses TMDB movie ID as consistent document ID in Elasticsearch

## Search Functionality

The search now covers these fields with different weights:
- **title** (3x weight) - Primary search field
- **tagline** (2x weight) - Movie slogans
- **overview** (2x weight) - Plot summaries  
- **genres** (1x weight) - Genre keywords

### Ranking Algorithm
The search results are ranked using a combination of:
1. **Text relevance** - How well the movie matches your search terms
2. **Popularity** (2x weight) - TMDB popularity score with logarithmic scaling
3. **Rating** (1x weight) - TMDB vote average with square root scaling

This ensures that popular and highly-rated movies appear higher in search results when relevance scores are similar.

### Performance Optimizations
- Returns only top 10 results for efficiency
- Shows total count of all matching results
- Uses Elasticsearch's `track_total_hits` for accurate counts
- Adult content is automatically filtered out during import

## Frontend Features

The updated UI now shows:
- Movie title with search relevance score
- Release year and TMDB rating (⭐ 8.5/10)
- Tagline in italics when available
- Genre tags as styled badges
- Full plot overview
- Result count display (e.g., "Found 1,234 results in 45ms")
- "Showing top 10 results" indicator when more than 10 matches exist

## Configuration Options

### Dataset Size
Edit `max_movies` in `load-tmdb-data.py`:
```python
total = bulk_index_movies(csv_path, max_movies=100000)  # Load 100k movies
```

### Search Field Weights
Edit field weights in `lib/elasticsearch.ts`:
```typescript
fields: ['title^3', 'tagline^2', 'overview^2', 'genres']
```

### Elasticsearch Index Settings
The script creates an optimized index with:
- Single shard for demo purposes
- No replicas for faster indexing
- Proper field mappings for each data type
- Date format handling for release dates

## Benefits of TMDB Integration

1. **Real Data**: 930k real movies instead of 5 sample movies
2. **Rich Metadata**: Taglines, ratings, popularity scores
3. **Better Search**: More fields to search across
4. **Scalable**: Configurable dataset size
5. **Production Ready**: Proper data processing and error handling

## Next Steps

- The application is now ready to search through real movie data
- Start the Next.js app with `npm run dev`
- Try searching for popular movies like "Avengers", "Star Wars", "Batman"
- The search will return relevant results with TMDB ratings and metadata
