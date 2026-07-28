#!/bin/bash
# Bump APP_VERSION in src/lib/pwa.ts with current datetime
FILE="src/lib/pwa.ts"
NOW=$(date "+%Y-%m-%d %H:%M")
# Read current version number (e.g. v2.04)
VER=$(grep -o "v[0-9]\+\.[0-9]\+" "$FILE" | head -1)
if [ -z "$VER" ]; then echo "Cannot find version"; exit 1; fi
# Bump minor (zero-padded to 2 digits)
MAJOR=$(echo "$VER" | cut -d. -f1 | tr -d v)
MINOR=$(echo "$VER" | cut -d. -f2)
MINOR=$((10#$MINOR + 1))
NEWVER=$(printf "v%d.%02d" "$MAJOR" "$MINOR")
# Read description (everything after the second "· ")
DESC=$(grep "^export const APP_VERSION" "$FILE" | sed "s/^export const APP_VERSION = '//;s/'$//" | awk -F'· ' '{for(i=3;i<=NF;i++) printf "%s%s", (i>3?" ":""), $i}')
if [ -z "$DESC" ]; then
  read -p "Description: " DESC
fi
sed -i '' "s/^export const APP_VERSION = '.*'/export const APP_VERSION = '$NEWVER · $NOW · $DESC'/" "$FILE"
echo "→ $NEWVER · $NOW · $DESC"
