#!/bin/bash
# Jira Tasks Fetcher for Claude Code
# Usage:
#   jira-tasks sprint                          — wszystkie zadania z aktywnego sprintu
#   jira-tasks sprint --status todo            — tylko zadania "To Do"
#   jira-tasks sprint --status "in progress"   — tylko "In Progress"
#   jira-tasks sprint --type bug               — tylko bugi
#   jira-tasks sprint --type bug --status todo  — bugi w "To Do"
#   jira-tasks sprint --limit 10               — max 10 wyników
#   jira-tasks backlog                         — zadania z backloga
#   jira-tasks backlog --type story --limit 5  — 5 story z backloga
#   jira-tasks {{JIRA_PROJECT}}-1418                       — szczegóły konkretnego zadania
#   jira-tasks statuses                        — lista dostępnych statusów
#   jira-tasks types                           — lista dostępnych typów zadań

set -euo pipefail

JIRA_BASE="${JIRA_BASE:-{{JIRA_BASE}}}"
JIRA_PROJECT="${JIRA_PROJECT:-{{JIRA_PROJECT}}}"
JIRA_USER_ID="${JIRA_USER_ID:-YOUR_JIRA_ACCOUNT_ID}"

if [[ -z "${JIRA_EMAIL:-}" || -z "${JIRA_TOKEN:-}" ]]; then
  echo "ERROR: Set JIRA_EMAIL and JIRA_TOKEN environment variables"
  echo "  export JIRA_EMAIL='your-email@example.com'"
  echo "  export JIRA_TOKEN='your-api-token'"
  exit 1
fi

AUTH=$(echo -n "${JIRA_EMAIL}:${JIRA_TOKEN}" | base64)

jira_api() {
  local endpoint="$1"
  curl -s -H "Authorization: Basic ${AUTH}" \
       -H "Content-Type: application/json" \
       "${JIRA_BASE}/rest/api/3/${endpoint}"
}

# Nowy endpoint search (stary /search został usunięty przez Atlassian)
jira_search() {
  local jql="$1"
  local fields="${2:-summary,status,priority,issuetype,description,customfield_10016}"
  local max="${3:-50}"
  local encoded_jql
  encoded_jql=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$jql'))")
  curl -s -H "Authorization: Basic ${AUTH}" \
       -H "Content-Type: application/json" \
       "${JIRA_BASE}/rest/api/3/search/jql?jql=${encoded_jql}&fields=${fields}&maxResults=${max}"
}

format_description() {
  echo "$1" | jq -r '
    .description.content[]? |
    if .type == "paragraph" then
      [.content[]? | .text // empty] | join("")
    elif .type == "heading" then
      "\n## " + ([.content[]? | .text // empty] | join(""))
    elif .type == "bulletList" then
      [.content[]? | .content[]? | "- " + ([.content[]? | .text // empty] | join(""))] | join("\n")
    elif .type == "orderedList" then
      [.content[]? | .content[]? | "- " + ([.content[]? | .text // empty] | join(""))] | join("\n")
    else empty
    end
  ' 2>/dev/null || echo "(brak opisu)"
}

# --- Parse flags ---
cmd="${1:-sprint}"
shift 2>/dev/null || true

STATUS=""
TYPE=""
LIMIT="50"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --status|-s)
      STATUS="$2"
      shift 2
      ;;
    --type|-t)
      TYPE="$2"
      shift 2
      ;;
    --limit|-l)
      LIMIT="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# --- Build JQL filters ---
build_filters() {
  local filters=""

  if [[ -n "$STATUS" ]]; then
    # Support common aliases
    local status_jql
    case "${STATUS,,}" in
      todo|"to do"|"to_do")       status_jql="To Do" ;;
      "in progress"|inprogress|ip|wip) status_jql="In Progress" ;;
      done|closed)                 status_jql="Done" ;;
      review|"in review"|"code review") status_jql="In Review" ;;
      testing|test|qa)             status_jql="Testing" ;;
      blocked)                     status_jql="Blocked" ;;
      *)                           status_jql="$STATUS" ;;
    esac
    filters="${filters} AND status=\"${status_jql}\""
  fi

  if [[ -n "$TYPE" ]]; then
    local type_jql
    case "${TYPE,,}" in
      bug|bugs)           type_jql="Bug" ;;
      story|stories)      type_jql="Story" ;;
      task|tasks)          type_jql="Task" ;;
      subtask|subtasks|"sub-task") type_jql="Sub-task" ;;
      epic|epics)          type_jql="Epic" ;;
      *)                   type_jql="$TYPE" ;;
    esac
    filters="${filters} AND issuetype=\"${type_jql}\""
  fi

  echo "$filters"
}

# URL-encode a string
urlencode() {
  python3 -c "import urllib.parse; print(urllib.parse.quote('$1', safe=''))"
}

case "$cmd" in
  sprint)
    FILTERS=$(build_filters)
    HEADER="Zadania z aktywnego sprintu"
    [[ -n "$STATUS" ]] && HEADER="${HEADER} [status: ${STATUS}]"
    [[ -n "$TYPE" ]] && HEADER="${HEADER} [typ: ${TYPE}]"

    echo "## ${HEADER} — ${JIRA_EMAIL}"
    echo ""

    JQL="project=${JIRA_PROJECT} AND assignee=${JIRA_USER_ID} AND sprint in openSprints()${FILTERS} ORDER BY priority DESC"
    ENCODED_JQL=$(urlencode "$JQL")

    RESULT=$(jira_search "$JQL" "summary,status,priority,issuetype,description,customfield_10016" "$LIMIT")

    ERROR=$(echo "$RESULT" | jq -r '.errorMessages[0]? // empty')
    if [[ -n "$ERROR" ]]; then
      echo "ERROR: ${ERROR}"
      echo ""
      echo "Tip: Użyj 'jira-tasks statuses' lub 'jira-tasks types' żeby zobaczyć dostępne wartości."
      exit 1
    fi

    TOTAL=$(echo "$RESULT" | jq '.total // 0')
    RETURNED=$(echo "$RESULT" | jq '.issues | length')
    echo "Znaleziono: ${TOTAL} zadań (wyświetlam: ${RETURNED})"
    echo ""

    echo "$RESULT" | jq -r '.issues[]? | "### \(.key): \(.fields.summary)\n- **Status:** \(.fields.status.name)\n- **Priorytet:** \(.fields.priority.name)\n- **Typ:** \(.fields.issuetype.name)\n- **Story Points:** \(.fields.customfield_10016 // "—")\n"'
    ;;

  backlog)
    FILTERS=$(build_filters)
    HEADER="Backlog"
    [[ -n "$STATUS" ]] && HEADER="${HEADER} [status: ${STATUS}]"
    [[ -n "$TYPE" ]] && HEADER="${HEADER} [typ: ${TYPE}]"

    echo "## ${HEADER} — ${JIRA_EMAIL}"
    echo ""

    JQL="project=${JIRA_PROJECT} AND assignee=${JIRA_USER_ID} AND sprint is EMPTY AND status != Done${FILTERS} ORDER BY priority DESC"
    ENCODED_JQL=$(urlencode "$JQL")

    RESULT=$(jira_search "$JQL" "summary,status,priority,issuetype" "$LIMIT")

    ERROR=$(echo "$RESULT" | jq -r '.errorMessages[0]? // empty')
    if [[ -n "$ERROR" ]]; then
      echo "ERROR: ${ERROR}"
      exit 1
    fi

    TOTAL=$(echo "$RESULT" | jq '.total // 0')
    RETURNED=$(echo "$RESULT" | jq '.issues | length')
    echo "Znaleziono: ${TOTAL} zadań (wyświetlam: ${RETURNED})"
    echo ""

    echo "$RESULT" | jq -r '.issues[]? | "- **\(.key)**: \(.fields.summary) [\(.fields.status.name)] (\(.fields.priority.name))"'
    ;;

  {{JIRA_PROJECT}}-*|*-[0-9]*)
    TICKET="${cmd^^}"
    echo "## ${TICKET} — Szczegóły"
    echo ""

    RESULT=$(jira_api "issue/${TICKET}?fields=summary,status,priority,issuetype,description,assignee,reporter,created,updated,customfield_10016,subtasks,parent")

    ERROR=$(echo "$RESULT" | jq -r '.errorMessages[0]? // empty')
    if [[ -n "$ERROR" ]]; then
      echo "ERROR: ${ERROR}"
      exit 1
    fi

    echo "$RESULT" | jq -r '"**Tytuł:** \(.fields.summary)\n**Status:** \(.fields.status.name)\n**Priorytet:** \(.fields.priority.name)\n**Typ:** \(.fields.issuetype.name)\n**Story Points:** \(.fields.customfield_10016 // "—")\n**Parent:** \(.fields.parent.key // "—")\n**Utworzono:** \(.fields.created[:10])\n**Zaktualizowano:** \(.fields.updated[:10])"'

    echo ""
    echo "### Opis"
    format_description "$RESULT"

    SUBTASKS=$(echo "$RESULT" | jq -r '.fields.subtasks[]? | "- **\(.key)**: \(.fields.summary) [\(.fields.status.name)]"')
    if [[ -n "$SUBTASKS" ]]; then
      echo ""
      echo "### Subtaski"
      echo "$SUBTASKS"
    fi
    ;;

  statuses)
    echo "## Dostępne statusy w projekcie ${JIRA_PROJECT}"
    echo ""
    RESULT=$(jira_api "project/${JIRA_PROJECT}/statuses")
    echo "$RESULT" | jq -r '.[]? | "### \(.name)\n" + ([.statuses[]? | "- \(.name)"] | unique | join("\n")) + "\n"'
    ;;

  types)
    echo "## Dostępne typy zadań w projekcie ${JIRA_PROJECT}"
    echo ""
    RESULT=$(jira_api "project/${JIRA_PROJECT}")
    echo "$RESULT" | jq -r '.issueTypes[]? | "- **\(.name)** — \(.description // "brak opisu")"'
    ;;

  *)
    echo "Usage: jira-tasks <command> [options]"
    echo ""
    echo "Commands:"
    echo "  sprint                  — zadania z aktywnego sprintu"
    echo "  backlog                 — zadania z backloga"
    echo "  {{JIRA_PROJECT}}-XXXX              — szczegóły konkretnego zadania"
    echo "  statuses               — lista dostępnych statusów"
    echo "  types                  — lista dostępnych typów zadań"
    echo ""
    echo "Options:"
    echo "  --status, -s <status>  — filtruj po statusie (todo, \"in progress\", done, review, testing, blocked)"
    echo "  --type, -t <type>      — filtruj po typie (bug, story, task, subtask, epic)"
    echo "  --limit, -l <number>   — max wyników (domyślnie 50)"
    echo ""
    echo "Examples:"
    echo "  jira-tasks sprint --status todo"
    echo "  jira-tasks sprint --type bug --status todo"
    echo "  jira-tasks sprint --type story --limit 10"
    echo "  jira-tasks backlog --type bug"
    echo "  jira-tasks {{JIRA_PROJECT}}-1418"
    ;;
esac
