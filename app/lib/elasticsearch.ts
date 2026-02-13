import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { Client as OpenSearchClient } from '@opensearch-project/opensearch';

// Determine which client to use based on environment variable
const useOpenSearch = process.env.USE_OPENSEARCH === 'true';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any;

if (useOpenSearch) {
  client = new OpenSearchClient({
    node: process.env.OPENSEARCH_URL ?? 'http://localhost:9200',
    auth: {
      username: process.env.OPENSEARCH_USERNAME ?? 'elastic',
      password: process.env.OPENSEARCH_PASSWORD ?? ''
    },
    requestTimeout: 30_000,
    maxRetries: 2,
  });
} else {
  client = new ElasticsearchClient({
    node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
    auth: {
      username: process.env.ELASTICSEARCH_USERNAME ?? 'elastic',
      password: process.env.ELASTICSEARCH_PASSWORD ?? ''
    },
    tls: {
      rejectUnauthorized: false
    },
    requestTimeout: 30_000,
    maxRetries: 2,
  });
}

console.log(`Using ${useOpenSearch ? 'OpenSearch' : 'Elasticsearch'} client`);

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
  semanticRatio?: number;   // 0 = keyword only, 1 = semantic only, 0.5 = hybrid
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

// ─── Check if ELSER is available ────────────────────────────────────

let elserAvailable: boolean | null = null;

async function checkElserAvailable(): Promise<boolean> {
  if (elserAvailable !== null) return elserAvailable;
  try {
    const result = await client.ml.getTrainedModelsStats({
      model_id: '.elser_model_2'
    });
    const body = getBody(result);
    const models = body.trained_model_stats || [];
    elserAvailable = models.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m: any) => m.deployment_stats?.state === 'started' ||
        m.deployment_stats?.allocation_status?.state === 'started'
    );
    console.log(`ELSER model available: ${elserAvailable}`);
  } catch {
    elserAvailable = false;
    console.log('ELSER model not available, using keyword-only search');
  }
  return elserAvailable ?? false;
}

// Reset cache periodically so we can detect model becoming available
setInterval(() => { elserAvailable = null; }, 60_000);

// ─── Build keyword query ────────────────────────────────────────────

function buildKeywordQuery(query: string) {
  return {
    function_score: {
      query: {
        bool: {
          should: [
            // Primary: best_fields across all searchable text fields
            {
              multi_match: {
                query,
                fields: [
                  'title^3', 'title.raw^4', 'tagline^1.5', 'overview',
                  'genres^2', 'keywords.text^3',
                  'cast.name^5', 'crew.name^5'
                ],
                type: 'best_fields',
                fuzziness: 'AUTO'
              }
            },
            // Cross-fields for multi-word queries spanning different fields
            {
              multi_match: {
                query,
                fields: [
                  'title^2', 'overview', 'keywords.text^2',
                  'cast.name^4', 'crew.name^4'
                ],
                type: 'cross_fields'
              }
            },
            // Exact phrase matches get high boosts
            {
              match_phrase: {
                title: {
                  query,
                  boost: 10
                }
              }
            },
            {
              match_phrase: {
                'cast.name': {
                  query,
                  boost: 10
                }
              }
            },
            {
              match_phrase: {
                'crew.name': {
                  query,
                  boost: 10
                }
              }
            },
            {
              match_phrase: {
                'keywords.text': {
                  query,
                  boost: 8
                }
              }
            },
            {
              match_phrase: {
                overview: {
                  query,
                  slop: 2,
                  boost: 3
                }
              }
            }
          ]
        }
      },
      // Popularity boost: multiplicative so it gently re-ranks
      // rather than overwhelming text relevance
      functions: [
        {
          field_value_factor: {
            field: 'vote_count',
            factor: 1.0,
            modifier: 'log2p',
            missing: 1
          },
          weight: 0.5
        },
        {
          field_value_factor: {
            field: 'vote_average',
            factor: 1.0,
            modifier: 'none',
            missing: 5
          },
          weight: 0.1
        },
      ],
      score_mode: 'sum',
      boost_mode: 'multiply'
    }
  };
}

// ─── Build semantic query (ELSER text_expansion) ───────────────────

function buildSemanticQuery(query: string) {
  return {
    bool: {
      should: [
        // ELSER sparse vector on overview (combined with keywords+genres at ingest)
        // This is the primary semantic signal
        {
          text_expansion: {
            'overview_embedding': {
              model_id: '.elser_model_2',
              model_text: query,
              boost: 5
            }
          }
        },
        // ELSER sparse vector on title - lower weight to avoid
        // literal title word matches dominating conceptual results
        {
          text_expansion: {
            'title_embedding': {
              model_id: '.elser_model_2',
              model_text: query,
              boost: 1
            }
          }
        }
      ]
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
    semanticRatio = 0,
    page = 1,
    pageSize = 24,
  } = params;

  const from = (page - 1) * pageSize;
  const hasElser = await checkElserAvailable();
  const actualSemanticRatio = hasElser ? semanticRatio : 0;

  const filters = buildFilters(params);

  try {
    let searchRequest;

    if (actualSemanticRatio === 0 || !query.trim()) {
      // Pure keyword search
      searchRequest = {
        index: 'movies',
        body: {
          query: query.trim() ? buildKeywordQuery(query) : { match_all: {} },
          ...(filters.length > 0 ? { post_filter: { bool: { must: filters } } } : {}),
          from,
          size: pageSize,
          _source: {
            excludes: ['overview_embedding', 'title_embedding', 'model_id', 'elser_error']
          },
          track_total_hits: true,
          aggs: {
            genres: {
              terms: { field: 'genres', size: 30 }
            }
          },
          // For empty queries, sort by popularity
          ...(!query.trim() ? { sort: [{ popularity: 'desc' }] } : {})
        }
      };
    } else if (actualSemanticRatio >= 1) {
      // Pure semantic search
      searchRequest = {
        index: 'movies',
        body: {
          query: buildSemanticQuery(query),
          ...(filters.length > 0 ? { post_filter: { bool: { must: filters } } } : {}),
          from,
          size: pageSize,
          _source: {
            excludes: ['overview_embedding', 'title_embedding', 'model_id', 'elser_error']
          },
          track_total_hits: true,
          timeout: '60s',
          aggs: {
            genres: {
              terms: { field: 'genres', size: 30 }
            }
          }
        }
      };
    } else {
      // Hybrid search using RRF (Reciprocal Rank Fusion)
      // Available in ES 8.14+
      // Use transport.request directly to avoid client field name transformations
      const rrfBody = {
        sub_searches: [
          { query: buildKeywordQuery(query) },
          { query: buildSemanticQuery(query) }
        ],
        rank: {
          rrf: {
            rank_constant: 60,
            rank_window_size: 100
          }
        },
        ...(filters.length > 0 ? { post_filter: { bool: { must: filters } } } : {}),
        from,
        size: pageSize,
        _source: {
          excludes: ['overview_embedding', 'title_embedding', 'model_id', 'elser_error']
        },
        track_total_hits: true,
        aggs: {
          genres: {
            terms: { field: 'genres', size: 30 }
          }
        }
      };

      const result = await client.transport.request({
        method: 'POST',
        path: '/movies/_search',
        body: rrfBody
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
    }

    const searchOptions = actualSemanticRatio >= 1 ? { requestTimeout: 60_000 } : {};
    const result = await client.search(searchRequest, searchOptions);
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

    // If semantic or hybrid search fails (e.g. ELSER queue full during ingestion), fall back to keyword
    if (actualSemanticRatio > 0) {
      console.log(`Semantic/hybrid search failed (ratio=${actualSemanticRatio}), falling back to keyword search`);
      return searchMovies({ ...params, semanticRatio: 0 });
    }

    throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ─── Get single movie by ID ─────────────────────────────────────────

export async function getMovie(id: string): Promise<Movie | null> {
  try {
    const result = await client.get({
      index: 'movies',
      id,
      _source_excludes: ['overview_embedding', 'title_embedding']
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
    // First get the movie to use its content for similarity
    const movie = await getMovie(movieId);
    if (!movie) return [];

    const hasElser = await checkElserAvailable();

    if (hasElser) {
      // Use ELSER text_expansion for semantic similarity
      // Keep search text short to avoid ELSER token limit (512)
      const overview = (movie.overview || '').slice(0, 200);
      const searchText = `${movie.title} ${(movie.genres || []).join(' ')} ${overview}`;

      const result = await client.search({
        index: 'movies',
        body: {
          query: {
            bool: {
              should: [
                {
                  text_expansion: {
                    'overview_embedding': {
                      model_id: '.elser_model_2',
                      model_text: searchText,
                      boost: 2
                    }
                  }
                },
                {
                  text_expansion: {
                    'title_embedding': {
                      model_id: '.elser_model_2',
                      model_text: movie.title,
                      boost: 1
                    }
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
            excludes: ['overview_embedding', 'title_embedding', 'model_id', 'elser_error']
          }
        }
      }, { requestTimeout: 60_000 });

      const body = getBody(result);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return body.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source,
        _score: hit._score,
      }));
    } else {
      // Fallback: use more_like_this query
      return await getSimilarMoviesMLT(movieId, limit);
    }
  } catch (error) {
    console.error(`Failed to get similar movies for ${movieId}:`, error);
    // If ELSER failed (e.g. queue full during ingestion), fall back to more_like_this
    console.log('Falling back to more_like_this for similar movies');
    try {
      return await getSimilarMoviesMLT(movieId, limit);
    } catch {
      return [];
    }
  }
}

// ─── Similar movies fallback using more_like_this ───────────────────

async function getSimilarMoviesMLT(movieId: string, limit: number): Promise<Movie[]> {
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
        excludes: ['overview_embedding', 'title_embedding', 'model_id', 'elser_error']
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
      pipeline: 'elser-ingest'
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
    elserAvailable: false,
  };

  try {
    await client.ping();
    info.status = 'ok';
    info.elserAvailable = await checkElserAvailable();
  } catch {
    info.status = 'error';
  }

  return info;
}
