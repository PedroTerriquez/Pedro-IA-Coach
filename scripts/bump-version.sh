#!/bin/bash
# Bump APP_VERSION in src/lib/pwa.ts
#
# #############################################################################
# GUARDRAIL — LEE ESTO ANTES DE BUMPEAR (es obligatorio, no opcional):
#
#   NUNCA bumpees el versionado sin que los tests PASEN PRIMERO.
#
#   Este script CORRE los tests él mismo y ABORTA el bump si algo falla:
#     - npm run check   (svelte-check / typecheck)
#     - npm run build   (adapter-static)
#     - npx playwright test  (E2E sobre el build de preview)
#
#   Si cualquiera falla, el versionado NO se ejecuta y se sale con código
#   de error distinto de 0 (para que cualquier agente/CI lo detecte y se
#   detenga en seco, sin commitear ni pushear con tests rotos).
#
#   Para saltarte este gate temporalmente (solo diagnóstico rápido) puedes
#   exportar BUMP_SKIP_TESTS=1, pero NO commitees un bump con tests fallando.
# #############################################################################

# ── GUARD: run all checks/tests before touching the version ──
if [ "${BUMP_SKIP_TESTS:-0}" != "1" ]; then
  echo "──> [bump] Corriendo npm run check ..."
  if ! npm run check; then
    echo "✗ [bump] npm run check FALLÓ. No se bumpea el versionado." >&2
    exit 1
  fi

  echo "──> [bump] Corriendo npx playwright test (E2E) ..."
  if ! npx playwright test; then
    echo "✗ [bump] npx playwright test FALLÓ. No se bumpea el versionado." >&2
    exit 1
  fi
fi
# ── /GUARD ──

# Bump APP_VERSION in src/lib/pwa.ts
FILE="src/lib/pwa.ts"
NOW=$(TZ=America/Mexico_City date "+%Y-%m-%d %H:%M")
# Read current version number (e.g. v2.10)
VER=$(grep "^const _VER_BASE" "$FILE" | grep -o "v[0-9]\+\.[0-9]\+")
if [ -z "$VER" ]; then echo "Cannot find version"; exit 1; fi
# Bump minor (zero-padded to 2 digits)
MAJOR=$(echo "$VER" | cut -d. -f1 | tr -d v)
MINOR=$(echo "$VER" | cut -d. -f2)
MINOR=$((10#$MINOR + 1))
NEWVER=$(printf "v%d.%02d" "$MAJOR" "$MINOR")
# Read description
DESC=$(grep "^const _VER_DESC" "$FILE" | sed "s/^const _VER_DESC = '//;s/'$//")
if [ -z "$DESC" ]; then
  read -p "Description: " DESC
fi
sed -i '' "s|^const _VER_BASE = '.*'|const _VER_BASE = '$NEWVER'|" "$FILE"
sed -i '' "s|^const _VER_DESC = '.*'|const _VER_DESC = '$DESC'|" "$FILE"
sed -i '' "s|^const _VER_TIME = '.*'|const _VER_TIME = '$NOW'|" "$FILE"
echo "→ $NEWVER · $NOW · $DESC"
