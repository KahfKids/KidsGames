# Book Update Script Documentation

## Overview
This script automates the process of updating books from a Google Sheets database. It downloads high-quality books, generates thumbnails, and updates the HTML interface.

## Features
- Downloads book data from Google Sheets
- Filters for high-quality books only
- Downloads PDFs from Google Drive links with unique names
- **PDF Filtering**: Only includes books with actual PDF files in the HTML
- Generates thumbnails automatically
- Updates HTML file with new books (thumbnail-only cards)
- Supports multiple languages
- Preserves existing thumbnails that don't match new PDFs
- Only replaces PDFs and thumbnails for books being updated
- Clean interface with no text overlays on book cards
- **Missing File Handling**: Skips books without PDFs and provides detailed feedback

## Prerequisites
1. Python 3.7 or higher
2. Required packages (install with: `pip install -r requirements.txt`)
   - pdf2image
   - Pillow
   - requests
3. poppler-utils (for PDF to image conversion)
   - On Ubuntu/Debian: `sudo apt-get install poppler-utils`
   - On macOS: `brew install poppler`
   - On Windows: Download from https://poppler.freedesktop.org/

## Usage

### Step 1: Test Connection
First, test if you can access the Google Sheets data:
```bash
python test_sheet_access.py
```

This will:
- Verify Google Sheets access
- Show how many high-quality books are available
- Display sample book titles and languages

### Step 2: Run Full Update
Once the test passes, run the complete update:
```bash
python run_book_update.py
```

This will:
1. Download all high-quality books from the Google Sheet
2. Download PDF files from Google Drive
3. Generate thumbnails (200x200 PNG files)
4. Update the HTML file with new books organized by language
5. Overwrite all existing files

### Alternative: Direct Script Execution
You can also run the main script directly:
```bash
python update_books.py
```

## Google Sheets Structure
The script expects the following columns in the Google Sheet:
- **Books**: Google Drive links to PDF files
- **Category**: Book category
- **Sub-category**: Book subcategory (used as title)
- **Language**: Book language(s), comma-separated
- **Quality**: Quality rating (only "High" books are processed)

## File Structure
```
KidsGames/
├── update_books.py          # Main update script
├── run_book_update.py       # User-friendly runner
├── test_sheet_access.py     # Test script
├── pdf_to_thumbnail.py      # Thumbnail generation
├── requirements.txt         # Dependencies
├── read/
│   ├── pdf/                # PDF storage directory
│   └── index.html          # HTML file to update
└── *.png                   # Generated thumbnails
```

## Process Flow
1. **Download Sheet Data**: Fetches CSV data from Google Sheets
2. **Filter Books**: Selects only books with "High" quality
3. **Generate Unique IDs**: Creates unique filenames for each book
4. **Clean Files**: Removes existing PDFs and matching thumbnails
5. **Download PDFs**: Downloads each PDF from Google Drive with virus scan handling
6. **PDF Filtering**: Filters out books where PDF download failed
7. **Generate Thumbnails**: Creates 200x200 PNG thumbnails for new books
8. **Update HTML**: Rebuilds language sections in the HTML file (only for books with PDFs)
9. **Update JavaScript**: Adds flipbook initialization calls (only for books with PDFs)

## Language Support
Books are automatically organized by language based on the "Language" column:
- Single language: "English"
- Multiple languages: "English, Arabic"
- Books appear in all specified language sections

## Unique Naming System
The script generates unique names for PDFs to prevent conflicts:
- **Format**: `{title-slug}-{url-hash}`
- **Example**: `test-book-00504e5e.pdf`
- **Benefits**: 
  - Same book title with different URLs get different names
  - Same URL always generates the same name (consistent)
  - URL hash ensures uniqueness across different sources

## Thumbnail Preservation
The script intelligently handles existing thumbnails:
- **Preserves**: Thumbnails that don't match any PDF being downloaded
- **Replaces**: Only thumbnails for PDFs being updated
- **Keeps**: Special files like `logo.png`, `icon.png`
- **Example**: If updating 5 books, only those 5 thumbnails are replaced

## Google Drive Download Improvements
Enhanced download logic handles various Google Drive scenarios:
- **Virus Scan Warnings**: Automatically bypasses "Download anyway" pages for large files
- **Token Extraction**: Parses HTML forms to extract confirm tokens and UUIDs
- **Content Validation**: Verifies downloaded content is actually PDF (not HTML error pages)
- **Multiple Attempts**: Falls back to alternative download URLs if needed
- **Size Verification**: Ensures downloaded files are reasonable PDF sizes

## Error Handling
- Network errors are caught and reported
- Invalid Google Drive links are skipped
- **PDF Filtering**: Books without PDF files are automatically filtered out
- **Missing File Feedback**: Detailed reporting of which books were skipped and why
- **Download Summary**: Shows successful vs failed downloads
- HTML backup is recommended before running

## Troubleshooting

### Common Issues
1. **Import Error**: Install dependencies with `pip install -r requirements.txt`
2. **PDF Conversion Error**: Install poppler-utils for your system
3. **Download Fails**: Check Google Drive link permissions
4. **HTML Not Updated**: Verify `read/index.html` exists

### Google Drive Access
- Ensure PDF files are publicly accessible
- Links should be in the format: `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`
- **Large File Support**: Script automatically handles virus scan warnings for files >25MB
- **Smart Download**: Extracts confirm tokens and UUIDs from Google's warning pages
- **Multiple Formats**: Supports various Google Drive URL formats
- **Content Verification**: Validates downloaded content to ensure PDFs are properly received

## Safety Notes
- **Selective Updates**: Only replaces PDFs and thumbnails for books being updated
- **Preserves Existing**: Keeps unrelated thumbnails and files
- **Network Usage**: Downloads can consume significant bandwidth
- **Disk Space**: Ensure adequate space for all PDF files
- **Rate Limits**: Google Drive may impose download limits
- **Backup Recommended**: Always backup important files before running

## Customization
To modify the Google Sheets URL, edit the `sheet_url` variable in:
- `update_books.py`
- `run_book_update.py`
- `test_sheet_access.py`

## Support
If you encounter issues:
1. Run the test script first
2. Check your internet connection
3. Verify Google Sheets access permissions
4. Ensure all dependencies are installed 