import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { Client as OpenSearchClient } from '@opensearch-project/opensearch';

// Determine which client to use based on environment variable
const useOpenSearch = process.env.USE_OPENSEARCH === 'true';

// Create the appropriate client with type assertion
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any;

if (useOpenSearch) {
  client = new OpenSearchClient({
    node: process.env.OPENSEARCH_URL || 'http://localhost:9200',
    auth: {
      username: process.env.OPENSEARCH_USERNAME || 'admin',
      password: process.env.OPENSEARCH_PASSWORD || ''
    },
    ssl: {
      rejectUnauthorized: false
    },
    requestTimeout: 5000, // 5 seconds
    maxRetries: 15, // Increased retries for shorter timeout
    sniffOnStart: false,
    sniffOnConnectionFault: false
  });
} else {
  client = new ElasticsearchClient({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    auth: {
      username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
      password: process.env.ELASTICSEARCH_PASSWORD || ''
    },
    tls: {
      rejectUnauthorized: false
    },
    requestTimeout: 5000, // 5 seconds
    maxRetries: 15, // Increased retries for shorter timeout
    sniffOnStart: false,
    sniffOnConnectionFault: false
  });
}

// Log which client is being used
console.log(`Using ${useOpenSearch ? 'OpenSearch' : 'Elasticsearch'} client`);

// Movie data structure for TMDB dataset
export interface Movie {
  id: string;
  title: string;
  tagline?: string;
  genres: string[];
  overview: string;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  _score?: number;
}

export async function searchMovies(query: string): Promise<{ movies: Movie[], total: number, latency: number }> {
  try {
    const startTime = Date.now();
    
    // Build search request compatible with both clients
    const searchRequest = {
      index: 'movies',
      body: {
        query: {
          function_score: {
            query: {
              bool: {
                must: [
                  {
                    multi_match: {
                      query,
                      fields: ['title^2', 'tagline', 'overview', 'genres'],
                      type: 'best_fields',
                      fuzziness: '2'
                    }
                  },
                  {
                    match_phrase: {
                      title: {
                        query,
                        boost: 10
                      }
                    }
                  }
                ]
              }
            },
            functions: [
              {
                field_value_factor: {
                  field: 'vote_count',
                  factor: 1.0,
                  modifier: 'log1p',
                  missing: 1
                },
                weight: 30
              },
              {
                field_value_factor: {
                  field: 'vote_average',
                  factor: 1.0,
                  modifier: 'log1p',
                  missing: 1
                },
                weight: 10
              },
            ],
            score_mode: 'sum',
            boost_mode: 'sum'
          }
        },
        size: 10,
        _source: true,
        track_total_hits: true,
        explain: true
      }
    };

    // Execute search with appropriate client
    const result = await client.search(searchRequest);
    
    // Handle response structure differences
    const responseBody = useOpenSearch ? result.body : result;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movies = responseBody.hits.hits.map((hit: any) => {
      // Extract scoring details from explanation if available
      let textScore = 0;
      let functionScore = 0;
      
      if (hit._explanation && hit._explanation.details) {
        // The explanation structure varies, but typically:
        // - First detail is the query score
        // - Second detail (if exists) is the function score
        for (const detail of hit._explanation.details) {
          if (detail.description.includes('sum of:') || detail.description.includes('weight')) {
            // This is likely the text relevance score
            if (!detail.description.includes('function score')) {
              textScore = detail.value || 0;
            }
          } else if (detail.description.includes('function score')) {
            functionScore = detail.value || 0;
          }
        }
      }
      
      // If we couldn't parse from explanation, estimate
      if (textScore === 0 && functionScore === 0) {
        // Rough estimation based on the scoring formula
        const voteCount = hit._source.vote_count || 0;
        const voteAverage = hit._source.vote_average || 0;
        const estimatedFunctionScore = (voteCount > 0 ? Math.log1p(voteCount) * 50 : 0) + 
                                       (voteAverage > 0 ? Math.log1p(voteAverage) * 20 : 0);
        functionScore = estimatedFunctionScore;
        textScore = Math.max(0, hit._score - estimatedFunctionScore);
      }
      
      return {
        id: hit._id,
        ...hit._source,
        _score: hit._score,
        _textScore: textScore,
        _functionScore: functionScore
      };
    });

    const total = typeof responseBody.hits.total === 'number' 
      ? responseBody.hits.total 
      : responseBody.hits.total?.value || 0;

    const latency = Date.now() - startTime;
    return { movies, total, latency };
  } catch (error) {
    throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function indexMovie(movie: Omit<Movie, 'id' | '_score'>): Promise<{ id: string }> {
  try {
    // Generate a unique ID based on timestamp and random number
    const id = `generated_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    const indexRequest = {
      index: 'movies',
      id: id,
      body: movie,
      refresh: false as const
    };

    // Execute index with appropriate client
    const result = await client.index(indexRequest);
    
    // Handle response structure differences
    const responseBody = useOpenSearch ? result.body : result;

    return { id: responseBody._id };
  } catch (error) {
    throw new Error(`Failed to index movie: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
