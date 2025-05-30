#!/bin/bash

# Test script for movie ingestion API

echo "Testing movie ingestion API..."

# Create a test movie
curl -X POST http://localhost:3000/api/movies \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Movie",
    "tagline": "This is a test",
    "genres": ["Action", "Drama"],
    "overview": "A test movie to verify the ingestion API works correctly.",
    "release_date": "2024-01-01",
    "vote_average": 7.5,
    "vote_count": 100,
    "popularity": 50.0,
    "runtime": 120,
    "status": "Released"
  }'

echo -e "\n\nSearching for the test movie..."
sleep 2

# Search for the movie
curl "http://localhost:3000/api/search?q=Test%20Movie"
