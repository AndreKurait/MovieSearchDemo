import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { Client as OpenSearchClient } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

// Determine which client to use based on environment variable
const useOpenSearch = process.env.USE_OPENSEARCH === 'true';
const useAwsSigv4 = process.env.OPENSEARCH_AUTH === 'sigv4';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any;

if (useOpenSearch) {
  if (useAwsSigv4) {
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
    client = new OpenSearchClient({
      ...AwsSigv4Signer({
        region,
        service: process.env.OPENSEARCH_SERVICE === 'aoss' ? 'aoss' : 'es',
        getCredentials: () => fromNodeProviderChain()(),
      }),
      node: process.env.OPENSEARCH_URL ?? 'https://localhost:9200',
      requestTimeout: 30_000,
      maxRetries: 2,
    });
    console.log(`Using OpenSearch client with SigV4 (region=${region})`);
  } else {
    client = new OpenSearchClient({
      node: process.env.OPENSEARCH_URL ?? 'http://localhost:9200',
      ...(process.env.OPENSEARCH_USERNAME ? {
        auth: {
          username: process.env.OPENSEARCH_USERNAME,
          password: process.env.OPENSEARCH_PASSWORD ?? ''
        }
      } : {}),
      ssl: { rejectUnauthorized: false },
      requestTimeout: 30_000,
      maxRetries: 2,
    });
    console.log('Using OpenSearch client with basic auth');
  }
} else {
  client = new ElasticsearchClient({
    node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
    ...(process.env.ELASTICSEARCH_USERNAME ? {
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD ?? ''
      }
    } : {}),
    tls: { rejectUnauthorized: false },
    requestTimeout: 30_000,
    maxRetries: 2,
  });
  console.log('Using Elasticsearch client');
}

// ─── Types ───────────────────────────────────────────────────────────

export interface CastMember {
  name: string;
  character: string;
  profile_path?: string;
}

export interface CrewMember {
  name: string;
  job: string;
}

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
  poster_path?: string;
  backdrop_path?: string;
  runtime?: number;
  original_language?: string;
  cast?: CastMember[];
  crew?: CrewMember[];
  keywords?: string[];
  _score?: number;
}

export interface SearchResult {
  movies: Movie[];
  total: number;
  latency: number;
  genres?: { key: string; doc_count: number }[];
}

export interface SearchParams {
  query: string;
  genres?: string[];
  ratingMin?: number;
  ratingMax?: number;
  page?: number;
  pageSize?: number;
}

// ─── Helper: Extract response body ──────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBody(result: any) {
  return useOpenSearch ? result.body : result;
}

// ─── Build keyword query ────────────────────────────────────────────

function buildKeywordQuery(query: string) {
  return {
    function_score: {
      query: {
        bool: {
          should: [
            {
              multi_match: {
                query,
                fields: [
                  'title^3', 'title.keyword^4', 'tagline^1.5', 'overview',
                  'cast.name^3', 'director^3'
                ],
                type: 'best_fields',
                fuzziness: 'AUTO'
              }
            },
            {
              multi_match: {
                query,
                fields: ['title^2', 'overview', 'cast.name^3', 'director^3'],
                type: 'cross_fields'
              }
            },
            // Exact matches on keyword fields (genres, keywords)
            { term: { genres: { value: query, boost: 4 } } },
            { term: { keywords: { value: query.toLowerCase(), boost: 3 } } },
            // Phrase matches
            { match_phrase: { title: { query, boost: 8 } } },
            { match_phrase: { 'cast.name': { query, boost: 6 } } },
            { match_phrase: { overview: { query, slop: 2, boost: 2 } } }
          ]
        }
      },
      functions: [
        {
          field_value_factor: {
            field: 'vote_count',
            modifier: 'log2p',
            missing: 1
          },
          weight: 0.4
        },
        {
          field_value_factor: {
            field: 'vote_average',
            modifier: 'none',
            missing: 5
          },
          weight: 0.1
        },
        {
          gauss: {
            release_date: {
              origin: 'now',
              scale: '1825d',
              decay: 0.5
            }
          },
          weight: 0.2
        }
      ],
      score_mode: 'sum',
      boost_mode: 'multiply'
    }
  };
}

// ─── Build filters ──────────────────────────────────────────────────

function buildFilters(params: SearchParams) {
  const filters = [];
  if (params.genres && params.genres.length > 0) {
    filters.push({ terms: { genres: params.genres } });
  }
  if (params.ratingMin !== undefined || params.ratingMax !== undefined) {
    const range: Record<string, number> = {};
    if (params.ratingMin !== undefined) range.gte = params.ratingMin;
    if (params.ratingMax !== undefined) range.lte = params.ratingMax;
    filters.push({ range: { vote_average: range } });
  }
  return filters;
}

// ─── Hybrid Search (main search function) ───────────────────────────

export async function searchMovies(params: SearchParams): Promise<SearchResult> {
  const startTime = Date.now();
  const {
    query,
    page = 1,
    pageSize = 24,
  } = params;

  const from = (page - 1) * pageSize;
  const filters = buildFilters(params);

  try {
    const result = await client.search({
      index: 'movies',
      body: {
        query: query.trim() ? buildKeywordQuery(query) : {
          function_score: {
            query: { match_all: {} },
            functions: [
              { field_value_factor: { field: 'popularity', modifier: 'log1p', missing: 1 }, weight: 1 },
              { field_value_factor: { field: 'vote_average', modifier: 'none', missing: 5 }, weight: 0.5 },
              { field_value_factor: { field: 'vote_count', modifier: 'log2p', missing: 1 }, weight: 0.3 },
              { gauss: { release_date: { origin: 'now', scale: '365d', decay: 0.5 } }, weight: 2 }
            ],
            score_mode: 'sum',
            boost_mode: 'replace'
          }
        },
        ...(filters.length > 0 ? { post_filter: { bool: { must: filters } } } : {}),
        from,
        size: pageSize,
        _source: {
          excludes: ['model_id', 'elser_error']
        },
        track_total_hits: true,
        aggs: {
          genres: {
            terms: { field: 'genres', size: 30 }
          }
        },
        ...(!query.trim() ? {} : {})
      }
    });

    const body = getBody(result);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movies: Movie[] = body.hits.hits.map((hit: any) => ({
      id: hit._id,
      ...hit._source,
      _score: hit._score,
    }));

    const total = typeof body.hits.total === 'number'
      ? body.hits.total
      : body.hits.total?.value || 0;

    const genres = body.aggregations?.genres?.buckets || [];
    const latency = Date.now() - startTime;

    return { movies, total, latency, genres };
  } catch (error) {
    console.error(`Search failed for query: "${query}"`, error);
    throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ─── Get single movie by ID ─────────────────────────────────────────

export async function getMovie(id: string): Promise<Movie | null> {
  try {
    const result = await client.get({
      index: 'movies',
      id,
      _source_excludes: ['model_id', 'elser_error']
    });
    const body = getBody(result);
    return {
      id: body._id,
      ...body._source,
    };
  } catch {
    return null;
  }
}

// ─── Get similar movies (semantic similarity via ELSER) ─────────────

export async function getSimilarMovies(movieId: string, limit: number = 8): Promise<Movie[]> {
  try {
    const result = await client.search({
      index: 'movies',
      body: {
        query: {
          bool: {
            must: [
              {
                more_like_this: {
                  fields: ['title', 'overview', 'genres', 'keywords'],
                  like: [{ _index: 'movies', _id: movieId }],
                  min_term_freq: 1,
                  min_doc_freq: 2,
                  max_query_terms: 25
                }
              }
            ],
            must_not: [
              { ids: { values: [movieId] } }
            ]
          }
        },
        size: limit,
        _source: {
          excludes: ['model_id', 'elser_error']
        }
      }
    });

    const body = getBody(result);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return body.hits.hits.map((hit: any) => ({
      id: hit._id,
      ...hit._source,
      _score: hit._score,
    }));
  } catch (error) {
    console.error(`Failed to get similar movies for ${movieId}:`, error);
    return [];
  }
}

// ─── Get all genres with counts ─────────────────────────────────────

export async function getGenres(): Promise<{ key: string; doc_count: number }[]> {
  try {
    const result = await client.search({
      index: 'movies',
      body: {
        size: 0,
        aggs: {
          genres: {
            terms: { field: 'genres', size: 50 }
          }
        }
      }
    });

    const body = getBody(result);
    return body.aggregations?.genres?.buckets || [];
  } catch (error) {
    console.error('Failed to get genres:', error);
    return [];
  }
}

// ─── Index a movie ──────────────────────────────────────────────────

export async function indexMovie(movie: Omit<Movie, 'id' | '_score'>): Promise<{ id: string }> {
  try {
    const id = `generated_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const result = await client.index({
      index: 'movies',
      id,
      body: movie,
      refresh: false as const,
    });

    const body = getBody(result);
    return { id: body._id };
  } catch (error) {
    console.error('Failed to index movie:', error);
    throw new Error(`Failed to index movie: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ─── Health check info ──────────────────────────────────────────────

export async function getHealthInfo() {
  const info: Record<string, unknown> = {
    status: 'ok',
    engine: useOpenSearch ? 'opensearch' : 'elasticsearch',
  };

  try {
    await client.ping();
    info.status = 'ok';
  } catch {
    info.status = 'error';
  }

  return info;
}

// ─── Cluster info from "/" endpoint ─────────────────────────────────

export async function getClusterInfo() {
  const result = await client.info();
  return getBody(result);
}
