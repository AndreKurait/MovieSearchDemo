from locust import HttpUser, task, between
import random
import urllib3
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class MovieSearchUser(HttpUser):
    wait_time = between(1, 3)

    # Sample search queries
    search_queries = [
        "matrix",
        "inception",
        "dark knight",
        "pulp fiction",
        "shawshank",
        "christopher nolan",
        "action",
        "drama",
        "sci-fi",
        "crime",
        "redemption",
        "batman",
        "dreams",
        "reality",
        "prison",
    ]

    genres_list = [
        "Action",
        "Adventure",
        "Animation",
        "Comedy",
        "Crime",
        "Documentary",
        "Drama",
        "Family",
        "Fantasy",
        "History",
        "Horror",
        "Music",
        "Mystery",
        "Romance",
        "Science Fiction",
        "Thriller",
        "War",
        "Western",
    ]

    # Track movie IDs discovered during the test
    known_movie_ids = []

    @task(9)
    def search_movies(self):
        query = random.choice(self.search_queries)
        try:
            response = self.client.get(f"/api/search?q={query}", timeout=10)

            if response.status_code == 200:
                data = response.json()
                # Collect movie IDs for use by other tasks
                for movie in data.get("movies", data.get("results", [])):
                    movie_id = movie.get("_id") or movie.get("id")
                    if movie_id and movie_id not in self.known_movie_ids:
                        self.known_movie_ids.append(movie_id)
                print(f"Search for '{query}' returned {data.get('total', 0)} results")
            else:
                print(f"Search for '{query}' failed with status {response.status_code}")
        except Exception as e:
            print(f"Search for '{query}' failed with error: {str(e)}")

    @task(3)
    def semantic_search(self):
        """Search with semantic ratio to exercise ELSER hybrid search"""
        query = random.choice(self.search_queries)
        ratio = round(random.uniform(0.3, 1.0), 1)
        try:
            response = self.client.get(
                f"/api/search?q={query}&semanticRatio={ratio}", timeout=15
            )

            if response.status_code == 200:
                data = response.json()
                print(
                    f"Semantic search for '{query}' (ratio={ratio}) returned {data.get('total', 0)} results"
                )
            else:
                print(
                    f"Semantic search for '{query}' failed with status {response.status_code}"
                )
        except Exception as e:
            print(f"Semantic search for '{query}' failed with error: {str(e)}")

    @task(2)
    def search_random_word(self):
        # Generate random search terms to test various scenarios
        random_words = ["movie", "film", "story", "adventure", "hero", "villain"]
        query = random.choice(random_words)
        try:
            response = self.client.get(f"/api/search?q={query}", timeout=10)

            if response.status_code == 200:
                data = response.json()
                print(
                    f"Random search for '{query}' returned {data.get('total', 0)} results"
                )
        except Exception as e:
            print(f"Random search for '{query}' failed with error: {str(e)}")

    @task(2)
    def search_with_genre_filter(self):
        """Search with genre filter to exercise the genre filtering capability"""
        query = random.choice(self.search_queries)
        genre = random.choice(self.genres_list)
        try:
            response = self.client.get(
                f"/api/search?q={query}&genres={genre}", timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                print(
                    f"Genre-filtered search for '{query}' (genre={genre}) returned {data.get('total', 0)} results"
                )
        except Exception as e:
            print(f"Genre-filtered search failed with error: {str(e)}")

    @task(2)
    def get_genres(self):
        """Fetch the list of available genres"""
        try:
            response = self.client.get("/api/genres", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"Fetched {len(data.get('genres', []))} genres")
        except Exception as e:
            print(f"Get genres failed with error: {str(e)}")

    @task(3)
    def get_movie_details(self):
        """Fetch details for a specific movie"""
        if not self.known_movie_ids:
            return
        movie_id = random.choice(self.known_movie_ids)
        try:
            response = self.client.get(f"/api/movies/{movie_id}", timeout=10)
            if response.status_code == 200:
                print(f"Fetched details for movie {movie_id}")
            elif response.status_code == 404:
                # Movie may have been deleted; remove from list
                self.known_movie_ids.remove(movie_id)
        except Exception as e:
            print(f"Get movie {movie_id} failed with error: {str(e)}")

    @task(2)
    def get_similar_movies(self):
        """Fetch similar movies for a known movie"""
        if not self.known_movie_ids:
            return
        movie_id = random.choice(self.known_movie_ids)
        try:
            response = self.client.get(f"/api/movies/{movie_id}/similar", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(
                    f"Found {len(data.get('movies', []))} similar movies for {movie_id}"
                )
        except Exception as e:
            print(f"Get similar movies for {movie_id} failed with error: {str(e)}")

    def on_start(self):
        # This runs when a user starts
        print("Starting load test for movie search API")
        # Disable SSL verification for self-signed certificates
        self.client.verify = False

        # Configure connection retries
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=[
                "HEAD",
                "GET",
                "PUT",
                "DELETE",
                "OPTIONS",
                "TRACE",
                "POST",
            ],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.client.mount("http://", adapter)
        self.client.mount("https://", adapter)
