# Task Completion Checklist

## After Adding/Modifying Games
1. Test game functionality in browser
2. Test offline functionality (DevTools offline mode)
3. Verify responsive design on mobile
4. Update `manifest.json` shortcuts if needed
5. Update `sw.js` version if caching changes

## After Modifying Service Worker
1. Increment `CACHE_NAME` version
2. Clear browser cache
3. Test offline functionality
4. Verify all cached assets load correctly

## After Content Updates (Books)
1. Run `python test_sheet_access.py` first
2. Run `python run_book_update.py`
3. Verify PDFs downloaded correctly
4. Check thumbnails generated
5. Test book reader functionality

## Before Deployment
1. Run `./update_game_paths.sh` for GitHub Pages
2. Update version in `manifest.json` and `sw.js`
3. Test on local server
4. Verify PWA installation prompt works
5. Test offline functionality

## No Automated Tests
- This project has no automated test suite
- Manual testing in browser required
- Test on multiple browsers (Chrome, Firefox, Safari)
