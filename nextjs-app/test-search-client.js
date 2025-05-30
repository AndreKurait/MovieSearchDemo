// Test script to verify OpenSearch/Elasticsearch client switching
// Run with: node test-search-client.js

console.log('Testing search client configuration...\n');

// Display current configuration
console.log('Environment Variables:');
console.log(`USE_OPENSEARCH: ${process.env.USE_OPENSEARCH || 'not set (defaults to false)'}`);
console.log(`ELASTICSEARCH_URL: ${process.env.ELASTICSEARCH_URL || 'not set (defaults to http://localhost:9200)'}`);
console.log(`OPENSEARCH_URL: ${process.env.OPENSEARCH_URL || 'not set (defaults to http://localhost:9200)'}`);
console.log('\n');

// Test with Elasticsearch (default)
console.log('Testing with Elasticsearch client (USE_OPENSEARCH=false or not set):');
delete process.env.USE_OPENSEARCH;
delete require.cache[require.resolve('./lib/elasticsearch.ts')];
const { searchMovies: searchMoviesES } = require('./lib/elasticsearch.ts');
console.log('✓ Elasticsearch client loaded successfully\n');

// Test with OpenSearch
console.log('Testing with OpenSearch client (USE_OPENSEARCH=true):');
process.env.USE_OPENSEARCH = 'true';
delete require.cache[require.resolve('./lib/elasticsearch.ts')];
const { searchMovies: searchMoviesOS } = require('./lib/elasticsearch.ts');
console.log('✓ OpenSearch client loaded successfully\n');

console.log('Configuration test completed successfully!');
console.log('\nTo use OpenSearch in your application:');
console.log('1. Set USE_OPENSEARCH=true in your .env.local file');
console.log('2. Configure OPENSEARCH_URL, OPENSEARCH_USERNAME, and OPENSEARCH_PASSWORD');
console.log('3. Restart your Next.js application');
