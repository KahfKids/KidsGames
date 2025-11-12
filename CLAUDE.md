# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Kahf KidsGames is a Progressive Web App (PWA) collection of educational and Islamic games for children. The project is a static site designed to work on GitHub Pages and includes both free and premium content.

## Architecture

### Main Structure
- **Main Hub**: `index.html` - Central game selection interface with theme support
- **Free Games**: `games/` directory - 14 free educational games
- **Premium Games**: `premium-games/` directory - 30+ premium games with secret-based access control
- **Reading Section**: `read/` directory - Interactive book reader with PDF support
- **PWA Infrastructure**: Service worker (`sw.js`), manifest (`manifest.json`), icons

### Game Architecture
Each game is self-contained in its own directory with:
- `index.html` - Main game file
- `css/` - Stylesheets (if needed)
- `js/` - JavaScript files (if needed)
- Assets are typically embedded or stored locally

### Key Features
- **PWA Support**: Offline functionality, installable, caching strategies
- **Theme System**: Light/dark modes with YouTube integration support
- **Premium Content Protection**: Secret-based access control for premium games
- **Mobile-First Design**: Responsive design optimized for mobile devices
- **Content Delivery**: Optimized for GitHub Pages hosting

## Development Commands

### Python Scripts (for content management)
```bash
# Install Python dependencies
pip install -r requirements.txt

# Update books from Google Sheets (requires .env setup)
python update_books.py

# Generate thumbnails from PDFs
python pdf_to_thumbnail.py

# Fix long filenames (maintenance)
python fix_long_filenames.py
```

### Icon Generation
```bash
# Open in browser to generate PWA icons
open icons/icon-generator.html
```

### PWA Testing
- Use Chrome DevTools → Application → Service Workers for debugging
- Test offline functionality with Network tab "Offline" checkbox
- Verify manifest in Chrome DevTools → Application → Manifest

## File Organization

### Core Files
- `index.html` - Main hub with game grid
- `manifest.json` - PWA manifest with metadata and shortcuts
- `sw.js` - Service worker for caching strategies
- `icons/` - PWA icons in various sizes

### Game Categories
- `games/` - Free games (2048, Tic-Tac-Toe, Quran Quest, etc.)
- `premium-games/` - Premium content (Islamic educational games, books)
- `read/` - PDF book reader with audio support

### Content Management
- `update_books.py` - Script to update books from Google Sheets API
- `pdf_to_thumbnail.py` - Generate thumbnails from PDF files
- `.env` - Environment variables (API keys, secrets)

## Important Implementation Details

### PWA Caching Strategy
The service worker implements different strategies:
- **Core Assets**: Cache First for immediate loading
- **Game Files**: Stale While Revalidate for fresh content
- **Premium Games**: Network First to maintain security

### Theme System
Themes are controlled via URL parameters:
- `brightness` - Light/Dark
- `theme` - Normal/YouTube
- `hideHeader` - Show/hide header
- `isWeb` - Web vs mobile app context
- `isPremiumPurchased` - Premium content access

### Premium Content Security
- Premium games require secret parameter: `secret=kahf-kids-games-premium-games-AXjKIWUY`
- Initial online verification required for premium content
- Offline access available after successful verification

### Mobile Integration
- Games designed for WebView embedding
- Custom deep linking support (`web+kidsgames://`)
- Touch-optimized interfaces
- Install prompts for standalone app experience

## Development Workflow

### Adding New Games
1. Create directory in `games/` (free) or `premium-games/` (premium)
2. Follow existing game structure with responsive design
3. Add game entry to main `index.html`
4. Update `manifest.json` shortcuts if needed
5. Test PWA functionality

### Content Updates
- Books: Use `update_books.py` to sync from Google Sheets
- Images: Optimize for web and generate thumbnails
- Games: Test both online and offline functionality

### PWA Updates
- Update version numbers in `sw.js` and `manifest.json`
- Clear cache and test new features
- Verify install prompts and offline functionality

## Browser Compatibility

### Full Support
- Chrome/Edge (Desktop & Mobile) - Complete PWA features
- Firefox (Desktop) - Basic PWA support
- Safari (iOS 11.3+) - Limited PWA support

### Fallbacks
- Progressive enhancement ensures basic functionality on all browsers
- Regular website functionality maintained without PWA features

## Environment Setup

### Development
- Static site - no build process required
- Local testing via any HTTP server
- Python scripts require virtual environment setup

### Deployment
- Designed for GitHub Pages
- All features work with static hosting
- No server-side dependencies

## Security Considerations

### Premium Content
- Secret-based access control
- Client-side verification (appropriate for content type)
- Offline caching after verification

### PWA Security
- HTTPS required for install prompts
- Service worker scope limited to origin
- Content Security Policy handled by GitHub Pages

## Troubleshooting

### Common Issues
1. **Service Worker Updates**: Clear browser cache and refresh
2. **Premium Access**: Check secret parameter and online verification
3. **Icon Loading**: Verify all icon sizes exist in `icons/` directory
4. **Offline Functionality**: Test with DevTools offline mode

### Debug Tools
- Chrome DevTools Application tab for PWA debugging
- Console logging for service worker events
- Network tab for caching strategy verification