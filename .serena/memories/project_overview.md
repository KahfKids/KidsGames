# KidsGames Project Overview

## Purpose
Kahf KidsGames is a Progressive Web App (PWA) collection of educational and Islamic games for children. It's a static site designed for GitHub Pages.

## Tech Stack
- **Frontend**: HTML, CSS, JavaScript (vanilla, no framework)
- **PWA**: Service Worker, Web App Manifest
- **Backend/Scripts**: Python 3.7+
- **PDF Processing**: pdf2image, poppler-utils
- **Hosting**: GitHub Pages (static)

## Project Structure
```
├── index.html          # Main hub with game grid
├── manifest.json       # PWA manifest
├── sw.js               # Service worker for caching
├── games/              # 55+ free educational games
├── icons/              # PWA icons
├── read/               # Interactive book reader
├── *.py                # Python scripts for content management
└── *.sh                # Shell scripts for deployment
```

## Key Features
- PWA support with offline functionality
- Theme system (light/dark modes)
- Premium content with secret-based access
- Mobile-first responsive design
- Google Sheets integration for book updates
