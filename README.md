# claude-frontend-cli (`cfc`)

Firmowy **installer konfiguracji Claude Code** dla projektów frontend. Domyślnie zbudowany pod
**Nuxt 3 / Vue 3 / TypeScript** (na tym stacku powstała baza), z wyborem stacku przy instalacji
(`nuxt-vue` / `react` / `generic`). Jedną komendą wnosi do projektu sprawdzoną bazę: przewodniki stacku
(`.docs/`), skille (`/check`, `/review`, `/new-form`, …), agenta jakości, serwery MCP, bazowe uprawnienia
i szkielet `CLAUDE.md`.

Działa **jak `claude init`**: jeśli w projekcie nie ma jeszcze Claude Code — inicjuje go od zera; jeśli już jest —
**dokłada i merguje** artefakty do istniejącej konfiguracji, nie niszcząc Twoich zmian.

> Wzorowane na [`przeprogramowani/10x-cli`](https://github.com/przeprogramowani/10x-cli). Różnica: treść jest
> **zbundlowana lokalnie** w tym repo (żadnego API/logowania) — installer działa offline.

---

## Instalacja

Trzy kanały:

```bash
# 1. Zero-install (prosto z gita)
npx github:marek-radzik/claude-frontend-cli init

# 2. Globalnie z npm
npm i -g claude-frontend-cli
cfc init

# 3. Dewelopersko (praca nad samym kitem)
git clone https://github.com/marek-radzik/claude-frontend-cli
cd claude-frontend-cli && npm install && npm run build && npm link
```

## Wymagania

- **Node 20+**
- Projekt frontend (dla pełni możliwości skille korzystają ze skryptów npm `lint`, `type-check`, `test:unit`).

## Quick start

```bash
cd twoj-projekt
cfc init            # pyta o stack, nazwę projektu, API URL, encję, prefix — i wszystko instaluje
# ustaw sekrety (nigdy nie commituj .env):
cp .env.example .env && $EDITOR .env
export $(grep -v '^#' .env | xargs)
cfc doctor          # sprawdza instalację + obecność wymaganych kluczy env
```

W projekcie bez `CLAUDE.md` powstaje pełna konfiguracja od zera. W projekcie, który już ma Claude Code,
dokładane są brakujące pliki, a do `CLAUDE.md` dopisywana jest zarządzana sekcja (Twoja treść zostaje).

**Wolisz z poziomu Claude Code?** Uruchom skill `/cfc-setup` — przeprowadzi Cię przez instalację sokratejsko
(pytanie po pytaniu) i sam wywoła `cfc`.

---

## Komendy

| Komenda | Opis |
|---------|------|
| `cfc init` | Bootstrap lub merge całej bazy. Flagi: `--stack <id>`, `--with-jira`, `--no-mcp`, `--yes`, `--set K=V`, `--dry-run`, `--force`, `--tool` |
| `cfc get --type <t> --name <n>` | Dołóż pojedynczy artefakt (np. skill) później |
| `cfc sync` | Zaktualizuj zainstalowane do nowszej wersji kitu (zachowuje lokalne edycje) |
| `cfc list` | Katalog artefaktów + oznaczenie co jest zainstalowane |
| `cfc doctor` | Diagnostyka: narzędzie, skrypty npm, integralność sentineli, drift, wymagane sekrety env (`✓/✗`), wersja kitu |

### Przykłady

```bash
cfc init --stack react                      # React/Next zamiast domyślnego Nuxt/Vue
cfc init --with-jira                         # dołącz opcjonalny moduł Jira/sprint
cfc init --no-mcp                            # pomiń konfigurację MCP (.mcp.json)
cfc init --yes --stack react \
  --set PROJECT_NAME="Acme" --set API_BASE_URL=https://api.acme.dev   # nieinteraktywnie (CI / skill)
cfc get --type skill --name new-table
cfc sync --dry-run                           # podgląd zmian bez zapisu
cfc sync --force                             # nadpisz lokalne edycje zarządzanych plików
```

Przykładowy output (`init`):

```
Changes
  created              .docs/TDD.md
  created              .claude/skills/check/SKILL.md
  created              CLAUDE.md
  ...
29 created
```

Akcje w raporcie: `created`, `updated`, `unchanged`, `skipped`, `removed`,
`conflict_overwritten`, `conflict_saved_user`, `conflict_skipped`.

---

## Co zostaje zainstalowane

```
twoj-projekt/
├── .docs/                      # generyczne przewodniki stacku (ARCHITECTURE, TDD, TABLES*, FORMS*, …)
├── .instructions/              # stuby projektowe do wypełnienia (PROJECT-SETUP, BUSINESS-DOMAIN, …)
├── .claude/
│   ├── skills/                 # /check, /review, /new-form*, /fix-types, … (+ /cfc-guide, /cfc-setup)
│   ├── agents/vue-quality-enforcer.md
│   ├── settings.json           # bazowe uprawnienia + enabledMcpjsonServers (tworzone tylko gdy brak)
│   ├── scripts/jira-tasks.sh   # tylko z --with-jira
│   └── .cfc-manifest.json      # ślad instalacji (wersja, stack, moduły, hash-e, odpowiedzi)
├── .mcp.json                   # serwery MCP (puppeteer + context7); klucz przez ${CONTEXT7_API_KEY}
├── .env.example                # szablon sekretów do skopiowania → .env (gitignored)
└── CLAUDE.md                   # wpięcie + zarządzana sekcja między markerami
```

`*` — pliki Vue/PrimeVue-specyficzne; pomijane w stacku `react`/`generic`.

Warstwy: **generic** (kopiowane 1:1), **template** (stuby z placeholderami, tworzone raz),
**optional** (moduły `mcp` — domyślnie wł., `jira` — `--with-jira`).

## Wybór stacku

`cfc init` pyta o stack; wybrany stack steruje tym, które docs/skille są instalowane, tabelą technologii
w `CLAUDE.md` i listą bibliotek w `.mcp.json`:

| Stack | Opis |
|-------|------|
| `nuxt-vue` (domyślny) | Nuxt 3 + Vue 3 (PrimeVue/Pinia/Tailwind) — pełny zestaw |
| `react` | React / Next.js — core docs + biblioteki React, bez Vue-specyficznych przewodników |
| `generic` | Dowolny framework — tylko stack-agnostyczne best practices (TDD, TS, architektura, i18n, …) |

Kolejne stacki dodajesz jednym wpisem w sekcji `stacks` w `manifest.json`.

## MCP i sekrety (`.env`)

**Żaden token/klucz nie jest wpisywany do plików** — wszystkie sekrety żyją w `.env` (gitignored), a pliki
odwołują się do zmiennych środowiskowych.

- `.mcp.json` konfiguruje serwery `puppeteer` (bez sekretu) i `context7` (`"CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"`).
- `.env.example` (kopiowany na start konfiguracji) grupuje klucze w poziomy:
  - **REQUIRED:** `CONTEXT7_API_KEY` (dla context7).
  - **OPTIONAL:** `GIT_TOKEN` (GitLab/GitHub/inne — dowolność; fani GitHuba mogą użyć `gh auth login`),
    oraz dostęp do projektu/E2E (`<PREFIX>_TOKEN`, `<PREFIX>_E2E_LOGIN/_PASSWORD`) — do dodania z czasem.
  - **JIRA (z `--with-jira`):** `JIRA_EMAIL`, `JIRA_TOKEN`, `JIRA_USER_ID`.

Ustawienie wartości (kroki wypisywane też przez `init` i skill `/cfc-setup`):

```bash
cp .env.example .env
# edytuj .env i wpisz wartości, potem:
export $(grep -v '^#' .env | xargs)
```

`cfc doctor` raportuje `✓/✗` obecności **wymaganych** zmiennych (nigdy nie pokazuje wartości).

## Merge do istniejącej konfiguracji

- **`CLAUDE.md`** — nasza treść żyje między markerami `<!-- BEGIN claude-frontend-cli -->` … `<!-- END … -->`.
  `sync` odświeża **tylko** ten blok; wszystko poza markerami jest Twoje i zostaje nietknięte. Re-apply jest
  idempotentny (drugi przebieg = `unchanged`).
- **Zarządzane pliki** (skille, docs, agent) — jeśli zmodyfikujesz je lokalnie, `sync` wykryje to i zapyta:
  `overwrite` / zapis kopii `.user` / `skip` (w trybie nieinteraktywnym domyślnie `skip`). `--force` nadpisuje.
- **`.claude/settings.json` i `.instructions/*`** — tworzone raz i **nigdy** nadpisywane przez `sync` (są Twoje).

## Parametryzacja

`init` pyta o wartości, które wypełniają placeholdery w szablonach:

| Placeholder | Znaczenie |
|-------------|-----------|
| `{{PROJECT_NAME}}` | Nazwa projektu |
| `{{API_BASE_URL}}` | Bazowy URL API |
| `{{PRIMARY_ENTITY}}` | Główna encja domenowa |
| `{{BRANCH_PREFIX}}` | Prefix brancha/commita |
| `{{JIRA_PROJECT}}`, `{{JIRA_BASE}}`, … | Konfiguracja Jira (moduł `--with-jira`) |

Odpowiedzi (oraz wybrany `stack` i włączone moduły) zapisują się w `.claude/.cfc-manifest.json` — `sync`/`get`
renderują szablony bez ponownego pytania. Wartości pochodne (`PROJECT_SLUG`, `PROJECT_ENV_PREFIX`,
`PRIMARY_ENTITY_LOWER`) liczone są automatycznie. **Sekrety nie są placeholderami** — idą wyłącznie do `.env`.

## Aktualizacja

Po wypuszczeniu nowej wersji kitu:

```bash
cfc sync --dry-run   # zobacz co się zmieni
cfc sync             # zastosuj (zachowuje lokalne edycje)
cfc doctor           # potwierdź spójność
```

## Rozszerzanie kitu

- **Nowy skill/doc:** dodaj plik do `content/` (np. `content/skills/core/moj-skill/SKILL.md`) + wpis w `manifest.json`
  (`id`, `type`, `layer`, `strategy`, ścieżki), potem `npm run build && npm test`.
- **Nowy stack** (np. Svelte, Solid): jeden wpis w sekcji `stacks` (`label`, `excludeDocs`, `excludeSkills`,
  `libraries`, `techTable`).
- **Nowy sekret/token:** wpis w `envKeys` (`key`, `group`, `required`, `comment`) — trafi do `.env.example`
  w odpowiedniej sekcji.

Strategie artefaktów (w `manifest.json`): `copy`, `template`, `template-once`, `skip-if-exists`, `rules-block`
(blok w CLAUDE.md), `env-file` (generowany `.env.example`).

## Skille CLI: `cfc-setup` i `cfc-guide`

- **`/cfc-setup`** — sokratejski instalator: prowadzi wywiad krok-po-kroku (stack, projekt, moduły, sekrety)
  i sam uruchamia `cfc`. Dla osób, które wolą konfigurować z poziomu Claude Code niż z konsoli.
- **`/cfc-guide`** — po instalacji Claude w Twoim repo wie, jak używać `cfc` (kiedy `sync`, jak dołożyć skill,
  jak nie zepsuć zarządzanego bloku).

## Rozwój

```bash
npm run build      # tsup → dist/
npm test           # vitest (sentinel, template, writer, stack/mcp/env + brak-sekretów)
npm run lint       # oxlint
npm run typecheck  # tsc --noEmit
```

## Licencja

MIT
