---
description: Review Jira sprint tasks assigned to me, analyze code & API, and plan implementation in plan mode
user-invocable: true
---

# /sprint-tasks — Przegląd tasków ze sprintu, planowanie i wdrożenie

Jesteś agentem do przeglądu zadań (tasks/stories) z aktywnego sprintu Jira (projekt {{JIRA_PROJECT}}) przypisanych do {{JIRA_USER_NAME}}. Analizujesz każde zadanie, sprawdzasz powiązany kod frontendowy, backend API i GitLab, a następnie tworzysz plan implementacji w plan mode. Po zatwierdzeniu planu — wdrażasz, testujesz, commitujesz i pushujesz.

## Argumenty

Użytkownik powinien podać aktualny token API jako argument:
```
/sprint-tasks Bearer <token>
```

Opcjonalnie można filtrować po typie:
```
/sprint-tasks Bearer <token> --type story
/sprint-tasks Bearer <token> --type task
/sprint-tasks Bearer <token>                   ← wszystkie typy (bez bugów)
```

Jeśli token nie został podany — sprawdź zmienną `${{PROJECT_ENV_PREFIX}}_TOKEN` w env. Jeśli brak obu — poproś o token.

## Konfiguracja

- **Jira:** Projekt {{JIRA_PROJECT}}, Board {{JIRA_BOARD}}
- **Jira User ID:** Zmienna `JIRA_USER_ID` (ustaw w env lub `.claude/scripts/jira-tasks.sh`)
- **Skrypt Jira:** `.claude/scripts/jira-tasks.sh` (wymaga env: `JIRA_EMAIL`, `JIRA_TOKEN`, `JIRA_BASE`, `JIRA_USER_ID`)
- **API Backend:** {{API_BASE_URL}}/api/v1
- **API Docs:** {{API_BASE_URL}}/docs/api.json
- **GitLab Backend:** {{GITLAB_URL}}/{{GITLAB_BACKEND_PATH}}
- **GitLab Token:** Zmienna `$GITLAB_TOKEN` w env (PAT, NIGDY nie commituj)
- **Projekt Frontend:** Nuxt 3 w bieżącym katalogu
- **E2E Login:** Zmienne `${{PROJECT_ENV_PREFIX}}_E2E_LOGIN` i `${{PROJECT_ENV_PREFIX}}_E2E_PASSWORD` w env
- **Zmienne env:** Wszystkie potrzebne dane (tokeny, loginy) powinny być w env vars — sprawdź je zanim pytasz użytkownika

---

## FAZA 1: Analiza i planowanie (read-only)

### Krok 1: Pobierz zadania ze sprintu (ZAWSZE FRESH z Jira)

**WAŻNE:** ZAWSZE pobieraj dane bezpośrednio z Jira API — nigdy nie polegaj na cache, wcześniejszych planach ani memory. Opis ticketa mógł się zmienić.

Pobierz WSZYSTKIE zadania przypisane do mnie (bez bugów, chyba że użytkownik chce inaczej):
```bash
JIRA_PROJECT={{JIRA_PROJECT}} .claude/scripts/jira-tasks.sh sprint
```

Odfiltruj:
- Zadania ze statusem "Gotowe" / "Done"
- Bugi (typ "Błąd w programie" / "Bug") — chyba że użytkownik poprosi o inny typ

Sprawdź git log, czy któreś zadanie nie ma już commitu w develop:
```bash
git log --oneline -30 develop
```

### Krok 2: Pobierz PEŁNE szczegóły każdego otwartego zadania

**WAŻNE:** Zawsze czytaj pełną treść ticketa — tytuł, opis (w tym zagnieżdżone sekcje jak "Najważniejsze szczegóły"), załączniki i komentarze. Kluczowy kontekst często jest w screenshotach, mockupach i komentarzach!

Dla każdego otwartego zadania:
```bash
JIRA_PROJECT={{JIRA_PROJECT}} .claude/scripts/jira-tasks.sh {{JIRA_PROJECT}}-XXXX
```

**Jeśli są załączniki (screenshoty, mockupy, PDF)**, pobierz je i przejrzyj:
```bash
JIRA_BASE="{{JIRA_BASE}}"
AUTH=$(echo -n "${JIRA_EMAIL}:${JIRA_TOKEN}" | base64)
curl -s -L -H "Authorization: Basic ${AUTH}" "<attachment_url>" -o /tmp/{{PROJECT_SLUG}}-XXXX-attachment.png
```
Następnie użyj Read tool na pobranym pliku, żeby zobaczyć wizualny kontekst zadania.

**Sprawdź powiązane taski** — task frontendowy może mieć powiązany task backendowy (linked issues). Jeśli tak — zanotuj numer, bo backend może jeszcze nie mieć endpointu.

### Krok 3: Analiza kodu frontendowego

Dla każdego zadania:
1. Zidentyfikuj domenę (kontrahenci, oferty, zamówienia, CRM, flota, itp.)
2. Użyj Agent (Explore) do znalezienia powiązanych plików:
   - Komponenty (`src/components/[domain]/`)
   - Strony (`src/pages/[domain]/`)
   - Composables (`src/composables/[domain]/`)
   - Store (`src/stores/[domain]/`)
   - Repository (`src/repository/[domain]/`)
   - Typy (`src/types/[Domain]/`)
   - Helpery (`src/helpers/`)
   - Schematy walidacji (`src/validatorSchemas/`)
   - Testy (`src/tests/`)
   - Lokalizacje (`src/static/locales/pl.json`)
3. Przeczytaj kluczowe pliki, żeby zrozumieć obecną implementację
4. Sprawdź istniejące wzorce — czy podobna funkcjonalność już istnieje w innej domenie

### Krok 4: Sprawdź backend API (curl + dokumentacja)

Użyj tokenu (z argumentu lub `${{PROJECT_ENV_PREFIX}}_TOKEN` z env):
```bash
# Sprawdź endpoint powiązany z zadaniem
curl -sk -H "Authorization: ${{PROJECT_ENV_PREFIX}}_TOKEN" "{{API_BASE_URL}}/api/v1/<endpoint>" | jq . | head -50

# Sprawdź dostępne endpointy w dokumentacji API
curl -sk "{{API_BASE_URL}}/docs/api.json" | jq '.paths | keys[]' | grep -i "<keyword>" | head -20

# Sprawdź schemat odpowiedzi
curl -sk "{{API_BASE_URL}}/docs/api.json" | jq '.paths["/v1/<endpoint>"].get.responses["200"]' | head -50
```

### Krok 5: Analiza backendu na GitLab

**OBOWIĄZKOWE** gdy API curl nie daje pełnego obrazu lub endpoint nie istnieje.

Użyj `$GITLAB_TOKEN` z env do dostępu do GitLab API:
```bash
# Sprawdź strukturę projektu backendowego
curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "{{GITLAB_URL}}/api/v4/projects/$GITLAB_PROJECT_ID/repository/tree?path=app/Http/Controllers&per_page=50" | jq '.[].name'

# Przeczytaj kontroler powiązany z zadaniem
curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "{{GITLAB_URL}}/api/v4/projects/$GITLAB_PROJECT_ID/repository/files/<encoded_path>/raw?ref=develop"

# Sprawdź pliki MD z Claude Code backendowca (mogą mieć kontekst implementacji)
curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "{{GITLAB_URL}}/api/v4/projects/$GITLAB_PROJECT_ID/repository/tree?path=.instructions&per_page=50&ref=develop" | jq '.[].name'

# Sprawdź branche backendowe (może endpoint jest w trakcie implementacji)
curl -s --header "PRIVATE-TOKEN: $GITLAB_TOKEN" "{{GITLAB_URL}}/api/v4/projects/$GITLAB_PROJECT_ID/repository/branches?search={{JIRA_PROJECT}}-XXXX&per_page=10" | jq '.[].name'
```

### Krok 6: API Contract — jeśli endpoint nie istnieje w backendzie

Jeśli endpoint zwraca 404/405, nie istnieje w `api.json`, lub backend jeszcze go nie zaimplementował:

1. Sprawdź czy istnieje powiązany task backendowy na Jirze (linked issues)
2. Sprawdź branch backendowy na GitLab (może jest w trakcie)
3. Jeśli backend nie ma endpointu → **stwórz kontrakt API**:
   - Plik: `.instructions/api-contracts/{{JIRA_PROJECT}}-XXXX-<nazwa>.md`
   - Zawartość: endpointy, request/response schema, kody HTTP, permissions
   - Bazuj na: Jira opis + istniejące wzorce API + kod backendu z GitLab
4. Implementuj frontend na podstawie kontraktu (typy, repo, store, composable, testy z mockami)
5. Oznacz w podsumowaniu jako "⚠️ Wymaga backendu — kontrakt API w `.instructions/api-contracts/`"

**WAŻNE:** Pliki kontraktów API NIE commitujemy — przekazujemy innym kanałem komunikacji.

### Krok 7: Podsumowanie + pytania + Plan Mode

**7a. Tabela podsumowująca:**

```
| # | Ticket | Tytuł | Status Jira | Git | Priorytet | Typ | Złożoność | Backend |
|---|--------|-------|-------------|-----|-----------|-----|-----------|---------|
| 1 | {{JIRA_PROJECT}}-X | ...   | Do zrobienia | brak | Medium | Story | Prosta | ✅/⚠️ |
```

Dla każdego zadania podaj:
- **Cel:** Co trzeba zrobić (na podstawie opisu Jira + komentarzy + mockupów)
- **Istniejący kod:** Jakie pliki już istnieją i co trzeba zmienić/rozszerzyć
- **Nowe pliki:** Jakie pliki trzeba utworzyć
- **Endpoint API:** Jaki endpoint jest powiązany i co zwraca
- **Backend GitLab:** Co znaleziono w kodzie backendowym
- **API Contract:** Czy potrzebny (jeśli tak — jaki)
- **Uprawnienia:** Jakie permissions są wymagane (page + component level)
- **Szacowana złożoność:** Prosta / Średnia / Złożona

**7b. Pytania wyjaśniające:**

Jeśli brakuje informacji do wdrożenia — **PYTAJ zanim zaczniesz implementację**:
- Niejasne wymagania z Jiry
- Brak mockupów/screenshotów
- Niejednoznaczne zachowanie UI
- Brakujący endpoint API (i brak kontraktu)
- Potrzebne dane (tokeny, loginy) — sprawdź najpierw env vars

**7c. Wejdź w Plan Mode** (użyj EnterPlanMode) i stwórz plan implementacji zgodnie z TDD i architekturą warstwową:

1. **Typy** (`/types/`) — interfejsy i typy danych
2. **Repository** (`/repository/`) — komunikacja z API
3. **Store** (`/stores/`) — stan Pinia
4. **Composable** (`/composables/`) — logika biznesowa
5. **Schema** (`/validatorSchemas/`) — walidacja Zod
6. **Component** (`/components/`) — komponenty Vue
7. **Page** (`/pages/`) — strony z routing i permissions
8. **i18n** (`/static/locales/`) — tłumaczenia
9. **Testy** (`/tests/`) — TDD: RED → GREEN → REFACTOR

---

## FAZA 2: Implementacja (po zatwierdzeniu planu)

### Krok 8: Implementacja TDD

Po zatwierdzeniu planu przez użytkownika:
1. **RED** — napisz failing testy
2. **GREEN** — zaimplementuj minimalny kod żeby testy przeszły
3. **REFACTOR** — uprość, wyczyść, dodaj i18n

Przestrzegaj architektury warstwowej: Typy → Repository → Store → Composable → Schema → Component → Page → i18n

Szukaj istniejących wzorców w projekcie — nie wymyślaj nowych jeśli można użyć sprawdzonych.

### Krok 9: Quality Gates — `npm run ci`

**OBOWIĄZKOWE** po implementacji:

```bash
npm run ci
```

To uruchamia: ESLint + Stylelint + type-check + testy.

Jeśli są błędy:
1. **ESLint** — napraw automatycznie (`npm run lint -- --fix`) lub ręcznie
2. **Stylelint** — napraw style CSS/SCSS
3. **TypeScript** — napraw błędy typów (NIGDY nie używaj `any`)
4. **Testy** — napraw failing testy
5. **Powtórz** `npm run ci` aż przejdzie czysto

### Krok 10: Testy E2E z Puppeteer (ZAWSZE na localhost)

**OBOWIĄZKOWE** — po implementacji wykonaj testy E2E na **localhost** (NIE na {{STAGING_HOST}} — serwer testowy nie ma Twoich zmian!).

1. **Sprawdź czy `npm run dev` działa:**
```bash
lsof -i :3000 -i :3001 | head -5
```
Jeśli nie działa — uruchom `npm run dev` w tle.

2. **Zaloguj się** przez Puppeteer MCP:
```
puppeteer_navigate → http://localhost:3000
```
- Login: `${{PROJECT_ENV_PREFIX}}_E2E_LOGIN` / Hasło: `${{PROJECT_ENV_PREFIX}}_E2E_PASSWORD`
- Zaakceptuj regulamin (przewiń do końca, kliknij "Akceptuj")

3. **Przejdź do strony dotkniętej zmianą** — nawiguj do odpowiedniej sekcji

4. **Zweryfikuj wizualnie** że implementacja działa:
   - Sprawdź interakcje (klikanie, filtry, sortowanie, formularze, modale)
   - Sprawdź uprawnienia (czy elementy są widoczne/ukryte poprawnie)
   - Zrób screenshot jako dowód weryfikacji

5. **Podsumuj wyniki** E2E:
```
| Element | Oczekiwanie | Wynik | Status |
|---------|-------------|-------|--------|
| ...     | ...         | ...   | OK/FAIL |
```

### Krok 11: Branch + Commit + Push

**WAŻNE:** Commit message ZAWSZE po angielsku. NIGDY nie dodawaj Co-Authored-By, Claude, AI, Anthropic ani żadnych wzmianek o AI w commitach, MR-ach ani git history.

1. **Branch** — jeśli jeszcze nie ma, utwórz z numerem Jira:
```bash
git checkout -b {{JIRA_PROJECT}}-XXXX
```
Jeśli jest **kilka tasków** — użyj jednego zbiorczego brancha z numerem jednego z tasków. Pozostałe taski opisz w commitach i poinformuj użytkownika żeby zaktualizował opisy pozostałych tasków na Jirze (że są realizowane na tym branchu).

2. **Staging** — dodaj zmienione pliki (konkretne, nie `git add .`):
```bash
git add src/components/... src/tests/... src/types/...
```
**NIE dodawaj:** `.instructions/api-contracts/` (przekazywane innym kanałem), `.env`, credentials

3. **Commit** — po angielsku, bez AI attribution:
```bash
git commit -m "{{JIRA_PROJECT}}-XXXX: <opis po angielsku>"
```

4. **Push** — wypushuj branch:
```bash
git push -u origin {{JIRA_PROJECT}}-XXXX
```

5. **MR** — utwórz Merge Request przez GitLab API:
   - **Tytuł:** `{{JIRA_PROJECT}}-XXXX, {{JIRA_PROJECT}}-YYYY: <opis>`
   - **Opis:** Sekcja `## Summary` z bullet pointami co zostało zrobione + opcjonalnie `## Backend required` jeśli są kontrakty API
   - **NIGDY nie dodawaj** sekcji "Test plan", "Verification plan" ani podobnych do opisu MR
   - **Target branch:** `develop`

6. **Info dla użytkownika** — wylistuj:
   - Które taski są na tym branchu
   - Które taski wymagają aktualizacji opisu na Jirze (dopisanie brancha)

---

## Zasady

- Odpowiadaj po polsku
- Przestrzegaj architektury warstwowej (ARCHITECTURE.md)
- Pamiętaj o TDD (TDD.md)
- W Fazie 1 nie modyfikuj plików — tylko analiza i planowanie
- W Fazie 2 implementuj dopiero po zatwierdzeniu planu
- Podawaj referencje do plików jako `file_path:line_number`
- Jeśli task wymaga zmian backendowych — stwórz API contract
- Sprawdź czy istniejące testy pokrywają scenariusz
- Szukaj istniejących wzorców w projekcie — nie wymyślaj nowych
- ZAWSZE sprawdź env vars zanim pytasz użytkownika o dane
- NIGDY nie dodawaj AI attribution do git (Co-Authored-By, Claude, Anthropic)
- NIGDY nie dodawaj "Test plan" / "Verification plan" do opisu MR
- ZAWSZE wykonuj testy E2E na localhost (nie {{STAGING_HOST}})
- ZAWSZE uruchom `npm run ci` przed commitem
