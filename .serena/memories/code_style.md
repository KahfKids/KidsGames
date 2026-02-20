# Code Style and Conventions

## JavaScript (Games & Service Worker)
- Vanilla JavaScript, no frameworks
- ES6+ features (const/let, arrow functions, template literals)
- Event-driven architecture with addEventListener
- Async/await for asynchronous operations
- Service worker uses caching strategies: Cache First, Network First, Stale While Revalidate

## HTML/CSS
- Mobile-first responsive design
- Self-contained games (single HTML file when possible)
- Embedded CSS and JS for portability
- Theme support via URL parameters

## Python Scripts
- Class-based structure (e.g., BookUpdater class)
- Type hints not enforced but appreciated
- Docstrings for methods
- Environment variables via .env file
- Error handling with try/except and logging

## File Naming
- Lowercase with hyphens: `tic-tac-toe`, `space-shooter`
- Descriptive names for games
- Python files use underscores: `update_books.py`

## Game Structure
Each game in its own directory:
```
games/game-name/
├── index.html    # Main game file
├── css/          # Stylesheets (optional)
└── js/           # JavaScript files (optional)
```
