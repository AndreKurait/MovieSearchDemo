// Test script to verify OpenSearch/Elasticsearch client switching
// Run with: npx tsx test-search-client.ts

console.log('Testing search client configuration...\n');

// Display current configuration
console.log('Environment Variables:');
console.log(`USE_OPENSEARCH: ${process.env.USE_OPENSEARCH || 'not set (defaults to false)'}`);
console.log(`ELASTICSEARCH_URL: ${process.env.ELASTICSEARCH_URL || 'not set (defaults to http://localhost:9200)'}`);
console.log(`OPENSEARCH_URL: ${process.env.OPENSEARCH_URL || 'not set (defaults to http://localhost:9200)'}`);
console.log('\n');

async function testClient() {
  // Dynamic import of the elasticsearch module
  const { searchMovies, getHealthInfo } = await import('./lib/elasticsearch');

  console.log('Testing health check...');
  try {
    const health = await getHealthInfo();
    console.log(`Health: ${JSON.stringify(health, null, 2)}`);
  } catch (e) {
    console.log(`Health check failed (expected if no server running): ${e}`);
  }

  console.log('\nTesting search...');
  try {
    const results = await searchMovies({ query: 'batman', page: 1, pageSize: 5 });
    console.log(`Found ${results.total} movies in ${results.latency}ms`);
    results.movies.forEach(m => console.log(`  - ${m.title} (${m.vote_average})`));
  } catch (e) {
    console.log(`Search failed (expected if no server running): ${e}`);
  }
}

testClient().then(() => {
  console.log('\nConfiguration test completed!');
  console.log('\nTo use OpenSearch in your application:');
  console.log('1. Set USE_OPENSEARCH=true in your .env.local file');
  console.log('2. Configure OPENSEARCH_URL, OPENSEARCH_USERNAME, and OPENSEARCH_PASSWORD');
  console.log('3. Restart your Next.js application');
});
