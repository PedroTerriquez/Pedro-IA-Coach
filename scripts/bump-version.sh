#!/bin/bash
# Bump APP_VERSION in src/lib/pwa.ts
FILE="src/lib/pwa.ts"
NOW=$(date "+%Y-%m-%d %H:%M")
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
echo "→ $NEWVER · $NOW · $DESC"
