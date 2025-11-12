#!/bin/bash

# Script to update all index.html files in games/ and premium-games/ directories
# to use the correct /KidsGames/ subdirectory paths

echo "Updating game HTML files for /KidsGames/ subdirectory deployment..."

# Function to update a single HTML file
update_html_file() {
    local file="$1"
    echo "Processing: $file"

    # Create backup
    cp "$file" "$file.backup"

    # Update common path patterns
    sed -i '' \
        -e 's|href="/manifest\.json"|href="/KidsGames/manifest.json"|g' \
        -e 's|src="/sw\.js"|src="/KidsGames/sw.js"|g' \
        -e 's|register("\/sw\.js")|register("/KidsGames/sw.js")|g' \
        -e 's|href="/icons/|href="/KidsGames/icons/|g' \
        -e 's|src="/icons/|src="/KidsGames/icons/|g' \
        -e 's|href="/index\.html"|href="/KidsGames/index.html"|g' \
        -e 's|href="/read/|href="/KidsGames/read/|g' \
        -e 's|action="/read/|action="/KidsGames/read/|g' \
        -e 's|href="/games/|href="/KidsGames/games/|g' \
        -e 's|src="/games/|src="/KidsGames/games/|g' \
        -e 's|action="/games/|action="/KidsGames/games/|g' \
        -e 's|href="/premium-games/|href="/KidsGames/premium-games/|g' \
        -e 's|src="/premium-games/|src="/KidsGames/premium-games/|g' \
        -e 's|action="/premium-games/|action="/KidsGames/premium-games/|g' \
        -e 's|url: "/|url: "/KidsGames/|g' \
        -e 's|"/ "|"/KidsGames/ "|g' \
        "$file"

    echo "Updated: $file"
}

# Find and update all index.html files in games directory
for game_dir in games/*/; do
    if [ -f "$game_dir/index.html" ]; then
        update_html_file "$game_dir/index.html"
    fi
done

# Find and update all index.html files in premium-games directory
for game_dir in premium-games/*/; do
    if [ -f "$game_dir/index.html" ]; then
        update_html_file "$game_dir/index.html"
    fi
done

echo "Update complete!"
echo "Backup files created with .backup extension"
echo "Run 'find games premium-games -name \"*.backup\" -delete' to remove backups after verification"