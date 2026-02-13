#!/bin/bash
set -e

ES_URL="${ELASTICSEARCH_URL:-http://localhost:9200}"

echo "Loading sample movie data into Elasticsearch..."
echo "Elasticsearch URL: $ES_URL"

# Create index with mapping
curl -s -X PUT "$ES_URL/movies" -H 'Content-Type: application/json' -d '{
  "settings": {
    "analysis": {
      "analyzer": {
        "autocomplete": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "edge_ngram_filter"]
        },
        "autocomplete_search": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase"]
        }
      },
      "filter": {
        "edge_ngram_filter": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 15
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "english",
        "fields": {
          "keyword": {"type": "keyword"},
          "raw": {"type": "text", "analyzer": "standard"},
          "autocomplete": {
            "type": "text",
            "analyzer": "autocomplete",
            "search_analyzer": "autocomplete_search"
          }
        }
      },
      "tagline": { "type": "text", "analyzer": "english" },
      "overview": { "type": "text", "analyzer": "english" },
      "genres": { "type": "keyword" },
      "release_date": { "type": "date", "ignore_malformed": true },
      "vote_average": { "type": "float" },
      "vote_count": { "type": "integer" },
      "popularity": { "type": "float" },
      "cast": {
        "type": "object",
        "properties": {
          "name": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
          "character": { "type": "text" },
          "profile_path": { "type": "keyword" }
        }
      },
      "crew": {
        "type": "object",
        "properties": {
          "name": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
          "job": { "type": "keyword" }
        }
      },
      "keywords": {
        "type": "keyword",
        "fields": {
          "text": { "type": "text", "analyzer": "english" }
        }
      }
    }
  }
}' || true

echo ""

# Sample movies
curl -s -X POST "$ES_URL/movies/_bulk" -H 'Content-Type: application/json' -d '
{"index":{"_id":"1"}}
{"title":"The Shawshank Redemption","tagline":"Fear can hold you prisoner. Hope can set you free.","overview":"Framed in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison.","genres":["Drama","Crime"],"release_date":"1994-09-23","vote_average":8.7,"vote_count":24000,"popularity":80.5}
{"index":{"_id":"2"}}
{"title":"The Godfather","tagline":"An offer you cannot refuse.","overview":"Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family.","genres":["Drama","Crime"],"release_date":"1972-03-14","vote_average":8.7,"vote_count":18000,"popularity":75.2}
{"index":{"_id":"3"}}
{"title":"The Dark Knight","tagline":"Why so serious?","overview":"Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations.","genres":["Action","Crime","Drama"],"release_date":"2008-07-16","vote_average":8.5,"vote_count":29000,"popularity":90.1}
{"index":{"_id":"4"}}
{"title":"Pulp Fiction","tagline":"Just because you are a character does not mean you have character.","overview":"A burger-loving hit man, his philosophical partner, a drug-addled gangster moll and a washed-up boxer converge in this sprawling, comedic crime caper.","genres":["Crime","Thriller"],"release_date":"1994-09-10","vote_average":8.5,"vote_count":25000,"popularity":70.3}
{"index":{"_id":"5"}}
{"title":"Inception","tagline":"Your mind is the scene of the crime.","overview":"Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets is offered a chance to regain his old life.","genres":["Action","Science Fiction","Adventure"],"release_date":"2010-07-15","vote_average":8.4,"vote_count":33000,"popularity":85.7}
{"index":{"_id":"6"}}
{"title":"The Matrix","tagline":"Welcome to the Real World.","overview":"Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents fighting the vast and powerful computers who now rule the earth.","genres":["Action","Science Fiction"],"release_date":"1999-03-30","vote_average":8.2,"vote_count":22000,"popularity":78.9}
{"index":{"_id":"7"}}
{"title":"Forrest Gump","tagline":"Life is like a box of chocolates...you never know what you are gonna get.","overview":"A man with a low IQ has accomplished great things in his life and been present during significant historic events.","genres":["Comedy","Drama","Romance"],"release_date":"1994-06-23","vote_average":8.5,"vote_count":24000,"popularity":72.4}
{"index":{"_id":"8"}}
{"title":"Interstellar","tagline":"Mankind was born on Earth. It was never meant to die here.","overview":"The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.","genres":["Adventure","Drama","Science Fiction"],"release_date":"2014-11-05","vote_average":8.4,"vote_count":31000,"popularity":88.2}
{"index":{"_id":"9"}}
{"title":"Fight Club","tagline":"Mischief. Mayhem. Soap.","overview":"A ticking-Loss time bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.","genres":["Drama"],"release_date":"1999-10-15","vote_average":8.4,"vote_count":26000,"popularity":65.8}
{"index":{"_id":"10"}}
{"title":"Goodfellas","tagline":"Three Decades of Life in the Mafia.","overview":"The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners.","genres":["Drama","Crime"],"release_date":"1990-09-12","vote_average":8.5,"vote_count":11000,"popularity":55.3}
'

echo ""
echo "Sample data loaded! Verifying..."
curl -s "$ES_URL/movies/_count" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Total documents: {d[\"count\"]}')"
