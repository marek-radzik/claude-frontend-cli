# claude-frontend-cli (`cfc`)

Firmowy **installer konfiguracji Claude Code** dla projektów frontend w stacku Nuxt 3 / Vue 3 / TypeScript.
Jedną komendą wnosi do projektu sprawdzoną bazę: przewodniki stacku (`.docs/`), skille (`/check`, `/review`,
`/new-form`, …), agenta jakości, bazowe uprawnienia i szkielet `CLAUDE.md`.

Działa **jak `claude init`**: jeśli w projekcie nie ma jeszcze Claude Code — inicjuje go od zera; jeśli już jest —
**dokłada i merguje** artefakty do istniejącej konfiguracji, nie niszcząc Twoich zmian.

> Wzorowane na [`przeprogramowani/10x-cli`](https://github.com/przeprogramowani/10x-cli). Różnica: treść jest
> **zbundlowana lokalnie** w tym repo (żadnego API/logowania) — installer działa offline.

---

## Instalacja

Trzy kanały:

```bash
# 1. Zero-install (prosto z gita)
npx github:your-org/claude-frontend-cli init

# 2. Globalnie z npm
npm i -g claude-frontend-cli
cfc init

# 3. Dewelopersko (praca nad samym kitem)
git clone https://github.com/your-org/claude-frontend-cli
cd claude-frontend-cli && npm install && npm run build && npm link
```

## Wymagania

- **Node 20+**
- Projekt frontend (dla pełni możliwości skille korzystają ze skryptów npm `lint`, `type-check`, `test:unit`).

## Quick start

```bash
cd twoj-projekt
cfc init            # pyta o nazwę projektu, API URL, encję, prefix — i wszystko instaluje
cfc doctor          # sprawdza poprawność instalacji
```

W projekcie bez `CLAUDE.md` powstaje pełna konfiguracja od zera. W projekcie, który już ma Claude Code,
dokładane są brakujące pliki, a do `CLAUDE.md` dopisywana jest zarządzana sekcja (Twoja treść zostaje).

---

## Komendy

| Komenda | Opis |
|---------|------|
| `cfc init` | Bootstrap lub merge całej bazy. Flagi: `--with-jira`, `--yes`, `--dry-run`, `--force`, `--tool` |
| `cfc get --type <t> --name <n>` | Dołóż pojedynczy artefakt (np. skill) później |
| `cfc sync` | Zaktualizuj zainstalowane do nowszej wersji kitu (zachowuje lokalne edycje) |
| `cfc list` | Katalog artefaktów + oznaczenie co jest zainstalowane |
| `cfc doctor` | Diagnostyka: narzędzie, skrypty npm, drift, wersja kitu |

### Przykłady

```bash
cfc init --with-jira            # dołącz opcjonalny moduł Jira/sprint
cfc init --yes                  # bez pytań — zostawia {{PLACEHOLDERY}} do ręcznego wypełnienia
cfc get --type skill --name new-table
cfc get --type skill --name sprint-tasks --dry-run
cfc sync --dry-run              # podgląd zmian bez zapisu
cfc sync --force                # nadpisz lokalne edycje zarządzanych plików
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
├── .docs/                      # 11 generycznych przewodników stacku (ARCHITECTURE, TDD, TABLES, FORMS, …)
├── .instructions/              # stuby projektowe do wypełnienia (PROJECT-SETUP, BUSINESS-DOMAIN, …)
├── .claude/
│   ├── skills/                 # /check, /review, /new-form, /new-table, /fix-types, … (+ /cfc-guide)
│   ├── agents/vue-quality-enforcer.md
│   ├── settings.json           # bazowe uprawnienia (tworzone tylko gdy brak)
│   ├── scripts/jira-tasks.sh   # tylko z --with-jira
│   └── .cfc-manifest.json      # ślad instalacji (wersja, hash-e, odpowiedzi)
└── CLAUDE.md                   # wpięcie + zarządzana sekcja między markerami
```

Warstwy: **generic** (kopiowane 1:1), **template** (stuby z placeholderami, tworzone raz),
**optional** (moduł Jira/sprint — `--with-jira`).

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

Odpowiedzi zapisują się w `.claude/.cfc-manifest.json` — `sync`/`get` renderują szablony bez ponownego pytania.
Wartości pochodne (`PROJECT_SLUG`, `PROJECT_ENV_PREFIX`, `PRIMARY_ENTITY_LOWER`) liczone są automatycznie.

## Aktualizacja

Po wypuszczeniu nowej wersji kitu:

```bash
cfc sync --dry-run   # zobacz co się zmieni
cfc sync             # zastosuj (zachowuje lokalne edycje)
cfc doctor           # potwierdź spójność
```

## Rozszerzanie kitu

1. Dodaj plik do `content/` (np. `content/skills/core/moj-skill/SKILL.md`).
2. Dopisz wpis w `manifest.json` (`id`, `type`, `layer`, `strategy`, ścieżki).
3. `npm run build && npm test`.

Placeholdery w treści (`{{...}}`) i strategie (`copy`, `template`, `template-once`, `skip-if-exists`,
`rules-block`) są opisane w `manifest.json`.

## Skill `cfc-guide`

Po instalacji projekt dostaje skill `/cfc-guide` — Claude w Twoim repo wie wtedy, jak używać `cfc`
(kiedy `sync`, jak dołożyć skill, jak nie zepsuć zarządzanego bloku).

## Rozwój

```bash
npm run build      # tsup → dist/
npm test           # vitest (sentinel, template, writer)
npm run lint       # oxlint
npm run typecheck  # tsc --noEmit
```

## Licencja

MIT
