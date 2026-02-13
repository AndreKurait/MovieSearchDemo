#!/bin/bash
# Search quality test suite for movie search
# Tests keyword, semantic, and hybrid search modes against the improved queries
# Usage: ./scripts/test-search-quality.sh [ES_URL]

ES_URL="${1:-http://localhost:9200}"
PASS=0
FAIL=0
TOTAL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

check_result() {
  local test_name="$1"
  local query_type="$2"
  local expected_pattern="$3"
  local results="$4"
  
  TOTAL=$((TOTAL + 1))
  
  if echo "$results" | grep -qi "$expected_pattern"; then
    PASS=$((PASS + 1))
    echo -e "  ${GREEN}PASS${NC} [$query_type] $test_name"
    echo -e "  ${CYAN}     -> $(echo "$results" | head -3 | tr '\n' ', ')${NC}"
  else
    FAIL=$((FAIL + 1))
    echo -e "  ${RED}FAIL${NC} [$query_type] $test_name (expected '$expected_pattern')"
    echo -e "       Got: $(echo "$results" | tr '\n' ', ')"
  fi
}

keyword_search() {
  local q="$1"
  curl -s "$ES_URL/movies/_search" -H 'Content-Type: application/json' -d "{
    \"size\": 5, \"_source\": [\"title\", \"genres\", \"crew\", \"cast\", \"keywords\"],
    \"query\": {
      \"function_score\": {
        \"query\": {\"bool\": {\"should\": [
          {\"multi_match\": {\"query\": \"$q\", \"fields\": [\"title^3\", \"title.raw^4\", \"tagline^1.5\", \"overview\", \"genres^2\", \"keywords.text^3\", \"cast.name^5\", \"crew.name^5\"], \"type\": \"best_fields\", \"fuzziness\": \"AUTO\"}},
          {\"multi_match\": {\"query\": \"$q\", \"fields\": [\"title^2\", \"overview\", \"keywords.text^2\", \"cast.name^4\", \"crew.name^4\"], \"type\": \"cross_fields\"}},
          {\"match_phrase\": {\"title\": {\"query\": \"$q\", \"boost\": 10}}},
          {\"match_phrase\": {\"cast.name\": {\"query\": \"$q\", \"boost\": 10}}},
          {\"match_phrase\": {\"crew.name\": {\"query\": \"$q\", \"boost\": 10}}},
          {\"match_phrase\": {\"keywords.text\": {\"query\": \"$q\", \"boost\": 8}}},
          {\"match_phrase\": {\"overview\": {\"query\": \"$q\", \"slop\": 2, \"boost\": 3}}}
        ]}},
        \"functions\": [
          {\"field_value_factor\": {\"field\": \"vote_count\", \"factor\": 1.0, \"modifier\": \"log2p\", \"missing\": 1}, \"weight\": 0.5},
          {\"field_value_factor\": {\"field\": \"vote_average\", \"factor\": 1.0, \"modifier\": \"none\", \"missing\": 5}, \"weight\": 0.1}
        ],
        \"score_mode\": \"sum\", \"boost_mode\": \"multiply\"
      }
    }
  }" | python3 -c "import json,sys; [print(h['_source']['title']) for h in json.load(sys.stdin).get('hits',{}).get('hits',[])]" 2>/dev/null
}

semantic_search() {
  local q="$1"
  curl -s "$ES_URL/movies/_search" -H 'Content-Type: application/json' -d "{
    \"size\": 5, \"_source\": [\"title\", \"genres\"],
    \"query\": {\"bool\": {\"should\": [
      {\"text_expansion\": {\"overview_embedding\": {\"model_id\": \".elser_model_2\", \"model_text\": \"$q\", \"boost\": 5}}},
      {\"text_expansion\": {\"title_embedding\": {\"model_id\": \".elser_model_2\", \"model_text\": \"$q\", \"boost\": 1}}}
    ]}}
  }" | python3 -c "import json,sys; [print(h['_source']['title']+' ('+'/'.join(h['_source'].get('genres',[]))+')') for h in json.load(sys.stdin).get('hits',{}).get('hits',[])]" 2>/dev/null
}

hybrid_search() {
  local q="$1"
  curl -s "$ES_URL/movies/_search" -H 'Content-Type: application/json' -d "{
    \"sub_searches\": [
      {\"query\": {
        \"function_score\": {
          \"query\": {\"bool\": {\"should\": [
            {\"multi_match\": {\"query\": \"$q\", \"fields\": [\"title^3\", \"title.raw^4\", \"tagline^1.5\", \"overview\", \"genres^2\", \"keywords.text^3\", \"cast.name^5\", \"crew.name^5\"], \"type\": \"best_fields\", \"fuzziness\": \"AUTO\"}},
            {\"multi_match\": {\"query\": \"$q\", \"fields\": [\"title^2\", \"overview\", \"keywords.text^2\", \"cast.name^4\", \"crew.name^4\"], \"type\": \"cross_fields\"}},
            {\"match_phrase\": {\"title\": {\"query\": \"$q\", \"boost\": 10}}},
            {\"match_phrase\": {\"cast.name\": {\"query\": \"$q\", \"boost\": 10}}},
            {\"match_phrase\": {\"crew.name\": {\"query\": \"$q\", \"boost\": 10}}},
            {\"match_phrase\": {\"keywords.text\": {\"query\": \"$q\", \"boost\": 8}}},
            {\"match_phrase\": {\"overview\": {\"query\": \"$q\", \"slop\": 2, \"boost\": 3}}}
          ]}},
          \"functions\": [
            {\"field_value_factor\": {\"field\": \"vote_count\", \"factor\": 1.0, \"modifier\": \"log2p\", \"missing\": 1}, \"weight\": 0.5},
            {\"field_value_factor\": {\"field\": \"vote_average\", \"factor\": 1.0, \"modifier\": \"none\", \"missing\": 5}, \"weight\": 0.1}
          ],
          \"score_mode\": \"sum\", \"boost_mode\": \"multiply\"
        }
      }},
      {\"query\": {\"bool\": {\"should\": [
        {\"text_expansion\": {\"overview_embedding\": {\"model_id\": \".elser_model_2\", \"model_text\": \"$q\", \"boost\": 5}}},
        {\"text_expansion\": {\"title_embedding\": {\"model_id\": \".elser_model_2\", \"model_text\": \"$q\", \"boost\": 1}}}
      ]}}}
    ],
    \"rank\": {\"rrf\": {\"rank_constant\": 60, \"rank_window_size\": 100}},
    \"size\": 5,
    \"_source\": [\"title\", \"genres\", \"crew\", \"cast\"]
  }" | python3 -c "import json,sys; [print(h['_source']['title']+' ('+'/'.join(h['_source'].get('genres',[]))+')') for h in json.load(sys.stdin).get('hits',{}).get('hits',[])]" 2>/dev/null
}

echo ""
echo "========================================="
echo " Movie Search Quality Test Suite"
echo " ES: $ES_URL"
echo "========================================="

echo ""
echo -e "${YELLOW}--- Keyword Search Tests ---${NC}"
echo -e "${YELLOW}    (Strengths: exact names, titles, specific terms)${NC}"

RESULTS=$(keyword_search "batman")
check_result "'batman' -> Batman movies" "keyword" "Batman" "$RESULTS"

RESULTS=$(keyword_search "Christopher Nolan")
check_result "'Christopher Nolan' -> his directed movies" "keyword" "Nolan\|Inception\|Dark Knight\|Memento\|Prestige\|Interstellar\|Tenet\|Dunkirk" "$RESULTS"

RESULTS=$(keyword_search "Tom Hanks")
check_result "'Tom Hanks' -> movies with Tom Hanks" "keyword" "Hanks\|Forrest Gump\|Cast Away\|Toy Story\|Saving Private Ryan\|Green Mile\|Philadelphia" "$RESULTS"

RESULTS=$(keyword_search "time travel")
check_result "'time travel' -> time travel movies" "keyword" "Time Travel\|Looper\|Back to the Future\|Terminator\|Timecop\|Butterfly Effect\|Donnie Darko\|12 Monkeys\|Predestination\|Source Code\|About Time\|Frequently Asked" "$RESULTS"

RESULTS=$(keyword_search "romantic comedy")
check_result "'romantic comedy' -> Romance/Comedy movies" "keyword" "Comedy\|Romance\|Romantic" "$RESULTS"

RESULTS=$(keyword_search "horror")
check_result "'horror' -> Horror genre movies" "keyword" "Horror\|Amityville\|Exorcist\|Halloween\|Scream" "$RESULTS"

RESULTS=$(keyword_search "space adventure")
check_result "'space adventure' -> sci-fi space movies" "keyword" "Space\|Star\|Zathura" "$RESULTS"

echo ""
echo -e "${YELLOW}--- Semantic Search Tests ---${NC}"
echo -e "${YELLOW}    (Strengths: conceptual/thematic queries)${NC}"

RESULTS=$(semantic_search "films about time travel")
check_result "'films about time travel' -> time travel themed movies" "semantic" "Time\|Timecop\|Timecrimes\|Frequently\|Butterfly\|Clockmaker\|12 Monkeys\|Looper\|Primer" "$RESULTS"

RESULTS=$(semantic_search "space adventure")
check_result "'space adventure' -> space/sci-fi adventure" "semantic" "Space\|Science Fiction\|Star\|Lost\|Explorers\|Adventure" "$RESULTS"

RESULTS=$(semantic_search "movies about dreams and reality")
check_result "'dreams and reality' -> dream-themed movies" "semantic" "Dream\|Nightmare\|Meshes\|Inception\|Matrix\|Nemo\|Passion\|Brainscan\|Vanilla Sky" "$RESULTS"

RESULTS=$(semantic_search "revenge story")
check_result "'revenge story' -> revenge-themed movies" "semantic" "Revenge\|Kill Bill\|Punisher\|Gladiator\|Count of Monte\|Oldboy\|Payback" "$RESULTS"

RESULTS=$(semantic_search "dystopian future")
check_result "'dystopian future' -> dystopia/sci-fi movies" "semantic" "Science Fiction\|Blade Runner\|Mad Max\|Hunger Games\|Divergent\|Maze Runner\|1984\|Elysium\|Gattaca\|Fahrenheit\|Equilibrium" "$RESULTS"

echo ""
echo -e "${YELLOW}--- Hybrid Search Tests ---${NC}"
echo -e "${YELLOW}    (Strengths: combines exact matching + conceptual understanding)${NC}"

RESULTS=$(hybrid_search "Christopher Nolan")
check_result "'Christopher Nolan' -> his movies" "hybrid" "Nolan\|Inception\|Dark Knight\|Memento\|Following\|Prestige\|Interstellar\|Tenet\|Dunkirk" "$RESULTS"

RESULTS=$(hybrid_search "space adventure")
check_result "'space adventure' -> space/adventure movies" "hybrid" "Space\|Science Fiction\|Adventure\|Star\|Lost" "$RESULTS"

RESULTS=$(hybrid_search "time travel")
check_result "'time travel' -> time travel movies" "hybrid" "Time\|Timecop\|Frequently\|Butterfly\|Looper\|Back to the Future\|12 Monkeys" "$RESULTS"

RESULTS=$(hybrid_search "romantic comedy")
check_result "'romantic comedy' -> rom-com movies" "hybrid" "Comedy\|Romance\|Romantic" "$RESULTS"

echo ""
echo "========================================="
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC} out of $TOTAL"
echo "========================================="
echo ""
