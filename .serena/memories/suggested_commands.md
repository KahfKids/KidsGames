# Suggested Commands

## Development Server
```bash
# Start local HTTP server
python -m http.server 8000
```

## Python Scripts (Content Management)
```bash
# Install Python dependencies
pip install -r requirements.txt

# Update books from Google Sheets
python update_books.py
# Or use the user-friendly runner:
python run_book_update.py

# Test Google Sheets access
python test_sheet_access.py

# Generate thumbnails from PDFs
python pdf_to_thumbnail.py

# Generate asset inventory for service worker
python generate_asset_cache.py

# Fix long filenames (maintenance)
python fix_long_filenames.py
```

## Deployment
```bash
# Update game paths for /KidsGames/ subdirectory
./update_game_paths.sh
```

## Git Commands
```bash
git status
git add .
git commit -m "message"
git push
```

## System Utilities (Linux)
```bash
ls -la          # List files
grep -r "text"  # Search for text
find . -name "*.html"  # Find files
```

## PWA Testing
- Chrome DevTools → Application → Service Workers
- Test offline mode with Network tab "Offline" checkbox
