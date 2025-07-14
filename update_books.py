#!/usr/bin/env python3
"""
Script to update books from Google Sheets
- Downloads Google Sheet data
- Filters for high-quality books
- Downloads PDFs from Google Drive
- Generates thumbnails
- Updates HTML file
"""

import os
import re
import csv
import requests
import subprocess
from urllib.parse import urlparse, parse_qs
from pathlib import Path
import shutil
import time
import hashlib
from dotenv import load_dotenv
from pdf_to_thumbnail import create_thumbnails

# Load environment variables from .env file
load_dotenv()

class BookUpdater:
    def __init__(self, sheet_url):
        self.sheet_url = sheet_url
        self.pdf_dir = Path('read/pdf')
        self.html_file = Path('read/index.html')
        self.books_data = []
        
    def get_csv_url(self):
        """Convert Google Sheets URL to CSV export URL"""
        # Extract sheet ID from URL
        pattern = r'/spreadsheets/d/([a-zA-Z0-9-_]+)'
        match = re.search(pattern, self.sheet_url)
        if not match:
            raise ValueError("Invalid Google Sheets URL")
        
        sheet_id = match.group(1)
        return f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
    
    def download_sheet_data(self):
        """Download and parse Google Sheet data"""
        csv_url = self.get_csv_url()
        print(f"Downloading sheet data from: {csv_url}")
        
        try:
            response = requests.get(csv_url)
            response.raise_for_status()
            
            # Parse CSV data
            csv_data = response.text
            reader = csv.DictReader(csv_data.splitlines())
            
            all_books = []
            for row in reader:
                if row.get('Quality', '').strip().lower() == 'high':
                    all_books.append(row)
            
            print(f"Found {len(all_books)} high-quality books")
            return all_books
            
        except Exception as e:
            print(f"Error downloading sheet data: {e}")
            return []
    
    def get_drive_file_id(self, drive_url):
        """Extract file ID from Google Drive URL"""
        patterns = [
            r'/file/d/([a-zA-Z0-9-_]+)',
            r'id=([a-zA-Z0-9-_]+)',
            r'/d/([a-zA-Z0-9-_]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, drive_url)
            if match:
                return match.group(1)
        
        return None
    
    def normalize_filename(self, filename):
        """Normalize filename by replacing spaces with underscores"""
        if not filename:
            return filename
        return filename.replace(' ', '_')
    
    def get_pdf_filename_from_drive(self, drive_url):
        """Get the actual PDF filename from Google Drive and normalize it"""
        file_id = self.get_drive_file_id(drive_url)
        if not file_id:
            return None
        
        # Try to get filename from Drive API or headers
        download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
        
        try:
            # Make a HEAD request to get headers without downloading
            response = requests.head(download_url, allow_redirects=True)
            
            # Try to get filename from Content-Disposition header
            content_disposition = response.headers.get('content-disposition', '')
            if 'filename=' in content_disposition:
                filename_match = re.search(r'filename[*]?=["\']?([^"\';\r\n]+)', content_disposition)
                if filename_match:
                    filename = filename_match.group(1).strip()
                    # Remove .pdf extension and normalize
                    if filename.lower().endswith('.pdf'):
                        filename = filename[:-4]
                    return self.normalize_filename(filename)
            
            # Fallback: try to get filename from the file metadata via a different URL
            metadata_url = f"https://drive.google.com/file/d/{file_id}/view"
            response = requests.get(metadata_url)
            
            # Look for filename in the page content
            title_match = re.search(r'<title>([^<]+)</title>', response.text)
            if title_match:
                title = title_match.group(1).strip()
                # Remove " - Google Drive" suffix if present
                title = re.sub(r'\s*-\s*Google Drive\s*$', '', title)
                # Remove .pdf extension if present
                if title.lower().endswith('.pdf'):
                    title = title[:-4]
                return self.normalize_filename(title)
            
        except Exception as e:
            print(f"Could not get filename from Drive: {e}")
        
        return None
    
    def download_pdf(self, drive_url, fallback_filename):
        """Download PDF from Google Drive"""
        file_id = self.get_drive_file_id(drive_url)
        if not file_id:
            print(f"Could not extract file ID from: {drive_url}")
            return False, None
        
        # Get actual filename from Drive
        actual_filename = self.get_pdf_filename_from_drive(drive_url)
        if not actual_filename:
            print(f"Could not get filename from Drive, using fallback: {fallback_filename}")
            actual_filename = fallback_filename
        
        # Check if PDF already exists with the normalized name
        pdf_path = self.pdf_dir / f"{actual_filename}.pdf"
        if pdf_path.exists():
            print(f"📄 PDF already exists, skipping download: {actual_filename}.pdf")
            return True, actual_filename
        
        # Check if there's an old version with spaces and rename it
        original_filename = actual_filename.replace('_', ' ')
        if original_filename != actual_filename:
            old_pdf_path = self.pdf_dir / f"{original_filename}.pdf"
            if old_pdf_path.exists():
                print(f"🔄 Renaming existing PDF: {original_filename}.pdf → {actual_filename}.pdf")
                old_pdf_path.rename(pdf_path)
                
                # Also rename corresponding thumbnail if it exists
                old_thumbnail_path = Path(f"{original_filename}.png")
                new_thumbnail_path = Path(f"{actual_filename}.png")
                if old_thumbnail_path.exists():
                    old_thumbnail_path.rename(new_thumbnail_path)
                    print(f"🔄 Renamed thumbnail: {original_filename}.png → {actual_filename}.png")
                
                return True, actual_filename
        
        download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
        
        try:
            print(f"Downloading: {actual_filename}")
            response = requests.get(download_url)
            
            # Handle Google Drive's virus scan warning
            if 'virus scan warning' in response.text.lower() or 'download anyway' in response.text.lower():
                print(f"  Handling virus scan warning for {actual_filename}")
                
                # Extract confirm token from the HTML form
                confirm_token = None
                
                # Look for confirm value in hidden input field
                confirm_match = re.search(r'name="confirm"\s+value="([^"]+)"', response.text)
                if confirm_match:
                    confirm_token = confirm_match.group(1)
                else:
                    # Fallback: look for confirm in any context
                    confirm_match = re.search(r'confirm["\']?\s*[:=]\s*["\']?([^"\'&\s]+)', response.text)
                    if confirm_match:
                        confirm_token = confirm_match.group(1)
                
                # Also extract uuid if present (sometimes needed)
                uuid_token = None
                uuid_match = re.search(r'name="uuid"\s+value="([^"]+)"', response.text)
                if uuid_match:
                    uuid_token = uuid_match.group(1)
                
                if confirm_token:
                    # Try the direct download URL from the form action
                    form_action_match = re.search(r'action="([^"]+)"', response.text)
                    if form_action_match:
                        download_url = form_action_match.group(1)
                        if uuid_token:
                            download_url = f"{download_url}?id={file_id}&export=download&confirm={confirm_token}&uuid={uuid_token}"
                        else:
                            download_url = f"{download_url}?id={file_id}&export=download&confirm={confirm_token}"
                    else:
                        # Fallback to standard URL
                        download_url = f"https://drive.google.com/uc?export=download&confirm={confirm_token}&id={file_id}"
                    
                    print(f"  Using confirm token: {confirm_token}")
                    response = requests.get(download_url)
                else:
                    print(f"  Could not find confirm token for {actual_filename}")
                    return False, None
            
            # Check if we got HTML instead of PDF content
            if response.text.startswith('<!DOCTYPE html') or response.text.startswith('<html'):
                print(f"  Still getting HTML response for {actual_filename}, download may have failed")
                # Try one more time with a different approach
                download_url = f"https://drive.usercontent.google.com/download?id={file_id}&export=download&authuser=0&confirm=t"
                response = requests.get(download_url)
            
            response.raise_for_status()
            
            # Verify we got binary content (PDF)
            if len(response.content) < 1000 or response.content.startswith(b'<!DOCTYPE html'):
                print(f"  Warning: Downloaded content for {actual_filename} may not be a valid PDF")
                return False, None
            
            # Save the PDF
            pdf_path = self.pdf_dir / f"{actual_filename}.pdf"
            with open(pdf_path, 'wb') as f:
                f.write(response.content)
            
            print(f"Successfully downloaded: {actual_filename}.pdf ({len(response.content)} bytes)")
            return True, actual_filename
            
        except Exception as e:
            print(f"Error downloading {actual_filename}: {e}")
            return False, None
    
    def clean_pdf_directory(self):
        """Remove all existing PDF files"""
        if self.pdf_dir.exists():
            for pdf_file in self.pdf_dir.glob('*.pdf'):
                pdf_file.unlink()
                print(f"Removed: {pdf_file}")
        else:
            self.pdf_dir.mkdir(parents=True, exist_ok=True)
    
    def clean_thumbnails(self, pdf_ids_to_keep):
        """Remove thumbnail files that correspond to existing PDFs or new PDFs being replaced"""
        # Get existing PDF names from the pdf directory
        existing_pdf_names = set()
        if self.pdf_dir.exists():
            for pdf_file in self.pdf_dir.glob('*.pdf'):
                existing_pdf_names.add(pdf_file.stem)  # filename without extension
        
        print(f"Found {len(existing_pdf_names)} existing PDFs to clean thumbnails for")
        
        for png_file in Path('.').glob('*.png'):
            # Don't remove specific images that might be needed
            if png_file.name not in ['logo.png', 'icon.png']:
                png_name = png_file.stem  # filename without extension
                
                # Remove if thumbnail matches existing PDF name OR new PDF ID
                if png_name in existing_pdf_names or png_name in pdf_ids_to_keep:
                    png_file.unlink()
                    print(f"Removed thumbnail: {png_file}")
                else:
                    print(f"Keeping existing thumbnail: {png_file}")
    
    def generate_safe_id(self, title, drive_url):
        """Generate a unique safe ID from title and drive URL"""
        # Remove special characters and convert to lowercase
        safe_id = re.sub(r'[^a-zA-Z0-9\s]', '', title.lower())
        safe_id = re.sub(r'\s+', '-', safe_id.strip())
        safe_id = safe_id[:40]  # Limit length for base name
        
        # Create a hash from the drive URL to ensure uniqueness
        url_hash = hashlib.md5(drive_url.encode()).hexdigest()[:8]
        
        # Combine title and hash for uniqueness
        unique_id = f"{safe_id}-{url_hash}"
        return unique_id
    
    def generate_safe_html_id(self, filename, is_premium=False):
        """Generate a safe HTML ID by removing all special characters"""
        # Remove all special characters except letters and numbers
        safe_id = re.sub(r'[^a-zA-Z0-9]', '', filename)
        
        # Ensure it starts with a letter (HTML requirement)
        if safe_id and not safe_id[0].isalpha():
            safe_id = 'book' + safe_id
        
        # If empty after cleaning, use a default
        if not safe_id:
            safe_id = 'book'
        
        # Add premium prefix for premium books
        if is_premium:
            safe_id = 'premium-' + safe_id
        
        return safe_id
    
    def remove_pdfs_not_in_sheet(self, valid_drive_urls):
        """Remove PDFs, thumbnails and HTML references for files not in current sheet based on original PDF names"""
        if not self.pdf_dir.exists():
            return
        
        # Get all current PDF files
        existing_pdfs = list(self.pdf_dir.glob('*.pdf'))
        
        # Get original PDF filenames that should exist based on current sheet
        should_exist_filenames = set()
        
        print("📋 Getting original PDF names from Google Drive URLs...")
        for drive_url in valid_drive_urls:
            actual_filename = self.get_pdf_filename_from_drive(drive_url)
            if actual_filename:
                normalized_filename = self.normalize_filename(actual_filename)
                should_exist_filenames.add(f"{normalized_filename}.pdf")
                # Also add the original with spaces version for backward compatibility
                if normalized_filename != actual_filename:
                    should_exist_filenames.add(f"{actual_filename}.pdf")
                print(f"  ✓ Should exist: {normalized_filename}.pdf")
            else:
                print(f"  ⚠️  Could not get filename from: {drive_url}")
        
        print(f"📊 Found {len(should_exist_filenames)} PDF names from sheet")
        print(f"📁 Found {len(existing_pdfs)} existing PDFs in directory")
        
        removed_count = 0
        removed_filenames = []
        
        # Remove PDFs whose names don't match any current sheet PDF names
        for pdf_file in existing_pdfs:
            if pdf_file.name not in should_exist_filenames:
                print(f"🗑️  Removing PDF not in sheet: {pdf_file.name}")
                pdf_file.unlink()
                
                # Track removed filename for HTML cleanup
                removed_filenames.append(pdf_file.stem)
                
                # Also remove corresponding thumbnail
                thumbnail_path = Path(f"{pdf_file.stem}.png")
                if thumbnail_path.exists():
                    thumbnail_path.unlink()
                    print(f"🗑️  Removed thumbnail: {thumbnail_path.name}")
                
                removed_count += 1
            else:
                print(f"✓ Keeping existing PDF: {pdf_file.name}")
        
        # Clean up HTML references for removed PDFs
        if removed_filenames:
            self.cleanup_html_for_removed_pdfs(removed_filenames)
        
        if removed_count > 0:
            print(f"✅ Removed {removed_count} PDFs not in current sheet")
        else:
            print("📋 All existing PDFs match current sheet")
    
    def cleanup_html_for_removed_pdfs(self, removed_filenames):
        """Remove HTML references and JavaScript for removed PDF files"""
        if not self.html_file.exists():
            return
        
        print(f"🧹 Cleaning HTML references for {len(removed_filenames)} removed PDFs...")
        
        # Read current HTML
        with open(self.html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        cleaned_content = html_content
        total_cleaned = 0
        
        for filename in removed_filenames:
            # Generate safe HTML IDs for both regular and premium versions
            regular_html_id = self.generate_safe_html_id(filename, False)
            premium_html_id = self.generate_safe_html_id(filename, True)
            
            for safe_html_id in [regular_html_id, premium_html_id]:
                # Remove direct initFlipbook calls for this PDF (using safe ID)
                js_pattern = rf"initFlipbook\('{re.escape(safe_html_id)}', 'pdf/[^']*\.pdf'\);?\s*"
                js_matches = len(re.findall(js_pattern, cleaned_content, re.MULTILINE))
                cleaned_content = re.sub(js_pattern, '', cleaned_content, flags=re.MULTILINE)
                
                # Remove HTML elements for this PDF (using safe ID)
                html_pattern = rf'<a class="game-link[^"]*" id="{re.escape(safe_html_id)}"[^>]*>.*?</a>\s*'
                html_matches = len(re.findall(html_pattern, cleaned_content, re.DOTALL))
                cleaned_content = re.sub(html_pattern, '', cleaned_content, flags=re.DOTALL)
                
                if js_matches > 0 or html_matches > 0:
                    print(f"  🗑️  Cleaned {filename} ({safe_html_id}): {js_matches} JS + {html_matches} HTML references")
                    total_cleaned += js_matches + html_matches
        
        # Write updated HTML if changes were made
        if total_cleaned > 0:
            with open(self.html_file, 'w', encoding='utf-8') as f:
                f.write(cleaned_content)
            print(f"✅ Cleaned {total_cleaned} HTML/JS references from {self.html_file}")
        else:
            print("📄 No HTML cleanup needed")
    
    def process_books(self):
        """Download all high-quality books"""
        books_data = self.download_sheet_data()
        if not books_data:
            print("No books to process")
            return []
        
        # First pass: Generate unique IDs and collect valid drive URLs for all books that will be processed
        pdf_ids_to_replace = set()
        valid_books = []
        valid_drive_urls = []
        
        for book in books_data:
            drive_url = book.get('Books', '').strip()
            title = book.get('Sub-category', '').strip() or book.get('Category', '').strip()
            languages = book.get('Language', '').strip()
            
            if not drive_url or not title:
                continue
            
            # Generate unique safe filename
            safe_id = self.generate_safe_id(title, drive_url)
            pdf_ids_to_replace.add(safe_id)
            valid_books.append((book, safe_id, drive_url, title, languages))
            valid_drive_urls.append(drive_url)
        
        # Remove PDFs that are no longer in the sheet (based on original PDF names)
        print("🔍 Checking for PDFs to remove...")
        self.remove_pdfs_not_in_sheet(valid_drive_urls)
        
        # We'll clean thumbnails after processing to only clean ones for files we actually downloaded
        
        processed_books = []
        successful_downloads = 0
        failed_downloads = 0
        
        for book, safe_id, drive_url, title, languages in valid_books:
            # Download PDF
            success, actual_filename = self.download_pdf(drive_url, safe_id)
            if success and actual_filename:
                # Parse and normalize languages
                parsed_languages = []
                if languages:
                    for lang in languages.split(','):
                        lang = lang.strip()
                        if lang:
                            # Normalize language names (capitalize first letter)
                            normalized_lang = lang.capitalize()
                            parsed_languages.append(normalized_lang)
                
                # Default to English if no languages specified
                if not parsed_languages:
                    parsed_languages = ['English']
                
                # Check if book is premium based on Price column
                price = book.get('Price', '').strip()
                is_premium = price.lower() == 'premium'
                
                processed_books.append({
                    'id': actual_filename,  # Use actual filename from Drive
                    'title': title,
                    'languages': parsed_languages,
                    'category': book.get('Category', '').strip(),
                    'sub_category': book.get('Sub-category', '').strip(),
                    'is_premium': is_premium,
                    'price': price
                })
                premium_status = "Premium" if is_premium else "Free"
                print(f"  📚 {actual_filename} → Languages: {', '.join(parsed_languages)} → {premium_status}")
                successful_downloads += 1
            else:
                failed_downloads += 1
        
        # Note: Thumbnail cleanup for removed PDFs is handled in remove_pdfs_not_in_sheet()
        
        print(f"\n📊 Download Summary:")
        print(f"  ✅ Successfully downloaded: {successful_downloads}")
        print(f"  ❌ Failed downloads: {failed_downloads}")
        print(f"  📚 Total books to process: {len(valid_books)}")
        print(f"  🗂️  Using actual filenames from Drive")
        
        return processed_books
    
    def cleanup_missing_pdfs(self, html_content):
        """Remove initFlipbook calls for PDFs that don't exist"""
        # Pattern to match direct initFlipbook calls
        patterns = [
            # Direct initFlipbook calls: initFlipbook('id', 'pdf/file.pdf');
            r"initFlipbook\(['\"]([^'\"]+)['\"],\s*['\"]pdf/([^'\"]+\.pdf)['\"][^;]*\);?\n?"
        ]
        
        cleaned_content = html_content
        removed_count = 0
        
        for pattern in patterns:
            matches = re.finditer(pattern, cleaned_content, re.MULTILINE)
            for match in reversed(list(matches)):  # Process in reverse to maintain positions
                if len(match.groups()) >= 2:
                    # Extract PDF filename (last group is always the PDF filename)
                    pdf_filename = match.groups()[-1]
                    pdf_path = self.pdf_dir / pdf_filename
                    
                    # Also check normalized version (with underscores)
                    pdf_name_without_ext = pdf_filename[:-4] if pdf_filename.endswith('.pdf') else pdf_filename
                    normalized_pdf_path = self.pdf_dir / f"{self.normalize_filename(pdf_name_without_ext)}.pdf"
                    
                    if not pdf_path.exists() and not normalized_pdf_path.exists():
                        print(f"🗑️  Removing reference to missing PDF: {pdf_filename}")
                        # Remove the entire match
                        start, end = match.span()
                        cleaned_content = cleaned_content[:start] + cleaned_content[end:]
                        removed_count += 1
        
        # Also remove HTML elements that reference missing PDFs
        html_pattern = r'<a class="game-link" id="([^"]+)"[^>]*>.*?</a>'
        html_matches = re.finditer(html_pattern, cleaned_content, re.DOTALL)
        
        for match in reversed(list(html_matches)):
            safe_html_id = match.group(1)
            # Need to find the corresponding PDF file - this is more complex now
            # since we need to reverse-engineer the original filename from the safe ID
            # Check if any PDF file exists that would generate this safe ID (regular or premium)
            found_pdf = False
            for pdf_file in self.pdf_dir.glob('*.pdf'):
                regular_id = self.generate_safe_html_id(pdf_file.stem, False)
                premium_id = self.generate_safe_html_id(pdf_file.stem, True)
                if safe_html_id in [regular_id, premium_id]:
                    found_pdf = True
                    break
            
            if not found_pdf:
                # Check if this might be a premium ID by checking both regular and premium versions
                found_any_version = False
                for pdf_file in self.pdf_dir.glob('*.pdf'):
                    regular_id = self.generate_safe_html_id(pdf_file.stem, False)
                    premium_id = self.generate_safe_html_id(pdf_file.stem, True)
                    if safe_html_id in [regular_id, premium_id]:
                        found_any_version = True
                        break
                
                if not found_any_version:
                    print(f"🗑️  Removing HTML element for missing PDF: {safe_html_id}")
                    start, end = match.span()
                    cleaned_content = cleaned_content[:start] + cleaned_content[end:]
                    removed_count += 1
        
        if removed_count > 0:
            print(f"✅ Cleaned up {removed_count} total references to missing PDFs")
        
        return cleaned_content
    
    def cleanup_all_javascript(self, html_content):
        """Remove ALL existing JavaScript content from the script tag to start fresh"""
        print("🧹 Cleaning up existing JavaScript content...")
        
        # Find the script tag containing $(document).ready
        script_start = html_content.find('<script type="text/javascript">')
        if script_start != -1:
            # Find the closing </script> tag
            script_end = html_content.find('</script>', script_start)
            if script_end != -1:
                # Extract the content before and after the script tag
                before_script = html_content[:script_start]
                after_script = html_content[script_end + 9:]  # +9 for '</script>'
                
                # Create empty script tag structure
                empty_script = '  <script type="text/javascript">\n'
                empty_script += '    $(document).ready(function () {\n'
                empty_script += '      \n'  # Empty content
                empty_script += '    });\n'
                empty_script += '  </script>'
                
                # Combine everything with empty script
                cleaned_content = before_script + empty_script + after_script
                print("✅ Cleaned up existing JavaScript content")
                return cleaned_content
            else:
                print("❌ Could not find closing script tag")
        else:
            print("❌ Could not find JavaScript script tag")
        
        return html_content
    
    def update_html_file(self, books):
        """Update the HTML file with new books"""
        if not self.html_file.exists():
            print(f"HTML file not found: {self.html_file}")
            return
        
        # Filter books to only include those with actual PDF files
        books_with_pdfs = []
        for book in books:
            pdf_path = self.pdf_dir / f"{book['id']}.pdf"
            if pdf_path.exists():
                books_with_pdfs.append(book)
            else:
                print(f"⚠️  Skipping {book['id']} - PDF file not found")
        
        print(f"📄 Found {len(books_with_pdfs)} books with actual PDF files out of {len(books)} total")
        
        if not books_with_pdfs:
            print("❌ No books with PDF files found. HTML will not be updated.")
            return
        
        # Read current HTML
        with open(self.html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Clean up existing initFlipbook calls for non-existent PDFs
        html_content = self.cleanup_missing_pdfs(html_content)
        
        # Clean up ALL existing JavaScript content before adding new ones
        html_content = self.cleanup_all_javascript(html_content)
        
        # Group books by language -> category -> subcategory -> premium status
        books_by_language = {}
        for book in books_with_pdfs:
            print(f"📖 Processing {book['id']} with languages: {book['languages']}")
            category = book.get('category', '').strip() or 'General'
            sub_category = book.get('sub_category', '').strip() or 'General'
            is_premium = book.get('is_premium', False)
            
            for lang in book['languages']:
                if lang not in books_by_language:
                    books_by_language[lang] = {}
                    print(f"  🆕 Created new language section: {lang}")
                
                if category not in books_by_language[lang]:
                    books_by_language[lang][category] = {}
                    print(f"    🆕 Created category: {category}")
                
                if sub_category not in books_by_language[lang][category]:
                    books_by_language[lang][category][sub_category] = {'regular': [], 'premium': []}
                    print(f"      🆕 Created subcategory: {sub_category}")
                
                # Add to appropriate list based on premium status
                if is_premium:
                    books_by_language[lang][category][sub_category]['premium'].append(book)
                    print(f"  ➕ Added {book['id']} to {lang} > {category} > {sub_category} > Premium")
                else:
                    books_by_language[lang][category][sub_category]['regular'].append(book)
                    print(f"  ➕ Added {book['id']} to {lang} > {category} > {sub_category} > Regular")
        
        print(f"\n📊 Book Organization by Language > Category > Subcategory:")
        for lang, categories in books_by_language.items():
            total_books = 0
            for category, subcategories in categories.items():
                for subcategory, book_types in subcategories.items():
                    regular_count = len(book_types['regular'])
                    premium_count = len(book_types['premium'])
                    total_books += regular_count + premium_count
                    print(f"  {lang} > {category} > {subcategory}: {regular_count} regular + {premium_count} premium")
            print(f"  📚 Total for {lang}: {total_books} books")
        
        # Generate direct initFlipbook calls for books with PDFs
        js_calls = []
        premium_click_handlers = []
        processed_ids = set()
        premium_ids = []
        
        # Flatten the nested structure to process all books
        all_books_flattened = []
        for lang, categories in books_by_language.items():
            for category, subcategories in categories.items():
                for subcategory, book_types in subcategories.items():
                    all_books_flattened.extend(book_types['regular'])
                    all_books_flattened.extend(book_types['premium'])
        
        for book in all_books_flattened:
            is_premium = book.get('is_premium', False)
            safe_html_id = self.generate_safe_html_id(book['id'], is_premium)
            normalized_id = self.normalize_filename(book['id'])  # Still use for file paths
            
            if safe_html_id not in processed_ids:
                # ALL books get the global initFlipbook call
                js_calls.append(f"        initFlipbook('{safe_html_id}', 'pdf/{normalized_id}.pdf');")
                
                if is_premium:
                    # Premium books ALSO get click handler for when premium is not purchased
                    premium_click_handlers.append(f"""        $(`#{safe_html_id}`).click(function () {{
          const isPremiumPurchased = getQueryParam("isPremiumPurchased") || "false";
          if (isPremiumPurchased === "false") {{
            initFlipbook('{safe_html_id}', 'pdf/{normalized_id}.pdf', {{}}, true);
          }}
        }});""")
                    premium_ids.append(safe_html_id)
                
                processed_ids.add(safe_html_id)
        
        print(f"🔧 Generated {len(js_calls)} total initFlipbook calls and {len(premium_click_handlers)} additional premium click handlers")
        
        # Completely clear and replace JavaScript section
        print("🔧 Replacing JavaScript section...")
        
        # Find the script tag containing $(document).ready
        script_start = html_content.find('<script type="text/javascript">')
        if script_start != -1:
            # Find the closing </script> tag
            script_end = html_content.find('</script>', script_start)
            if script_end != -1:
                # Extract the content before and after the script tag
                before_script = html_content[:script_start]
                after_script = html_content[script_end + 9:]  # +9 for '</script>'
                
                # Build the new script content
                new_script_content = '  <script type="text/javascript">\n'
                new_script_content += '    $(document).ready(function () {\n'
                
                # Add regular initFlipbook calls
                if js_calls:
                    new_script_content += '\n'.join(js_calls) + '\n'
                
                # Add premium click handlers
                if premium_click_handlers:
                    if js_calls:  # Add extra newline if there were regular calls
                        new_script_content += '\n'
                    new_script_content += '\n'.join(premium_click_handlers) + '\n'
                
                new_script_content += '    });\n'
                new_script_content += '  </script>'
                
                # Combine everything
                html_content = before_script + new_script_content + after_script
                total_js_items = len(js_calls) + len(premium_click_handlers)
                print(f"✅ Successfully replaced JavaScript section with {len(js_calls)} initFlipbook calls + {len(premium_click_handlers)} premium click handlers = {total_js_items} total")
            else:
                print("❌ Could not find closing script tag")
        else:
            print("❌ Could not find JavaScript script tag")
        
        # Remove all existing language sections except the structure
        # Find the content container and remove all existing language sections
        content_start = html_content.find('<div class="content-container">')
        content_end = html_content.find('</div>\n    </div>')
        
        if content_start != -1 and content_end != -1:
            # Keep the opening div and add new language sections
            before_content = html_content[:content_start]
            after_content = html_content[content_end:]
            
            # Build new content with language sections (only for languages with books)
            new_sections = []
            for language, categories in books_by_language.items():
                if categories:  # Only add sections that have books
                    section_html = self.generate_language_section(language, categories)
                    new_sections.append(section_html)
                    
                    # Count books for logging
                    total_regular = 0
                    total_premium = 0
                    for category, subcategories in categories.items():
                        for subcategory, book_types in subcategories.items():
                            total_regular += len(book_types['regular'])
                            total_premium += len(book_types['premium'])
                    
                    print(f"  📂 {language}: {total_regular} free + {total_premium} premium books")
            
            new_content = f'''<div class="content-container">
{chr(10).join(new_sections)}
      </div>'''
            
            html_content = before_content + new_content + after_content
        
        # Write updated HTML
        with open(self.html_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"✅ Updated HTML file with {len(books_with_pdfs)} books that have PDF files")
        print(f"📊 Language sections: {list(books_by_language.keys())}")
    
    def generate_language_section(self, language, categories):
        """Generate HTML for a language section with category/subcategory subsections"""
        all_subsections = []
        
        # Add main language title
        language_header = f'''        <div class="language-section">
          <h2 class="language-title">{language}</h2>'''
        
        # Generate subsections for each category/subcategory combination
        for category, subcategories in categories.items():
            for subcategory, book_types in subcategories.items():
                # Generate regular books subsection if there are any
                if book_types['regular']:
                    regular_games_html = []
                    for book in book_types['regular']:
                        safe_html_id = self.generate_safe_html_id(book['id'], False)
                        normalized_id = self.normalize_filename(book['id'])
                        
                        game_html = f'''            <a class="game-link" id="{safe_html_id}">
              <div class="game-card">
                <img
                  src="../{normalized_id}.png"
                  alt="{book['title']}"
                  class="game-thumbnail"
                />
              </div>
            </a>'''
                        regular_games_html.append(game_html)
                    
                    # Create title for this subsection
                    if subcategory != category and subcategory != 'General':
                        subsection_title = f"{category} - {subcategory}"
                    else:
                        subsection_title = category
                    
                    subsection_html = f'''          <div class="category-subsection">
            <h3 class="category-title">{subsection_title}</h3>
            <div class="games-scroll">
{chr(10).join(regular_games_html)}
            </div>
          </div>'''
                    all_subsections.append(subsection_html)
                
                # Generate premium books subsection if there are any
                if book_types['premium']:
                    premium_games_html = []
                    for book in book_types['premium']:
                        safe_html_id = self.generate_safe_html_id(book['id'], True)
                        normalized_id = self.normalize_filename(book['id'])
                        
                        game_html = f'''            <a class="game-link premium-game" id="{safe_html_id}">
              <div class="game-card">
                <img
                  src="../{normalized_id}.png"
                  alt="{book['title']}"
                  class="game-thumbnail"
                />
              </div>
            </a>'''
                        premium_games_html.append(game_html)
                    
                    # Create title for premium subsection
                    if subcategory != category and subcategory != 'General':
                        premium_title = f"{category} - {subcategory} (Premium)"
                    else:
                        premium_title = f"{category} (Premium)"
                    
                    premium_subsection_html = f'''          <div class="category-subsection">
            <h3 class="category-title">{premium_title}</h3>
            <div class="games-scroll">
{chr(10).join(premium_games_html)}
            </div>
          </div>'''
                    all_subsections.append(premium_subsection_html)
        
        # Combine header with all subsections and close the language section
        complete_section = language_header + '\n' + '\n'.join(all_subsections) + '\n        </div>'
        
        return complete_section
    
    def compress_all_pdfs(self):
        """Compress all PDF files using ghostscript for smaller file sizes"""
        if not self.pdf_dir.exists():
            print("📁 No PDF directory found, skipping compression")
            return
        
        pdf_files = list(self.pdf_dir.glob('*.pdf'))
        if not pdf_files:
            print("📄 No PDF files found for compression")
            return
        
        print(f"🗜️  Starting PDF compression for {len(pdf_files)} files...")
        
        compressed_count = 0
        failed_count = 0
        total_original_size = 0
        total_compressed_size = 0
        
        for pdf_file in pdf_files:
            try:
                # Get original file size
                original_size = pdf_file.stat().st_size
                total_original_size += original_size
                
                # Create temporary output file
                temp_output = pdf_file.parent / f"temp_{pdf_file.name}"
                
                # Build ghostscript command
                gs_command = [
                    'gs',
                    '-sDEVICE=pdfwrite',
                    '-dCompatibilityLevel=1.4',
                    '-dPDFSETTINGS=/screen',
                    '-dNOPAUSE',
                    '-dQUIET',
                    '-dBATCH',
                    f'-sOutputFile={temp_output}',
                    str(pdf_file)
                ]
                
                print(f"  🗜️  Compressing: {pdf_file.name}")
                
                # Run ghostscript compression
                result = subprocess.run(gs_command, capture_output=True, text=True)
                
                if result.returncode == 0 and temp_output.exists():
                    # Get compressed file size
                    compressed_size = temp_output.stat().st_size
                    total_compressed_size += compressed_size
                    
                    # Calculate compression ratio
                    if original_size > 0:
                        compression_ratio = ((original_size - compressed_size) / original_size) * 100
                    else:
                        compression_ratio = 0
                    
                    # Replace original with compressed version if it's actually smaller
                    if compressed_size < original_size:
                        pdf_file.unlink()  # Remove original
                        temp_output.rename(pdf_file)  # Rename compressed to original name
                        print(f"    ✅ {pdf_file.name}: {original_size:,} → {compressed_size:,} bytes ({compression_ratio:.1f}% reduction)")
                        compressed_count += 1
                    else:
                        # Keep original if compressed version is larger
                        temp_output.unlink()  # Remove temp file
                        print(f"    ℹ️  {pdf_file.name}: Keeping original (no size reduction)")
                        total_compressed_size = total_compressed_size - compressed_size + original_size
                else:
                    # Compression failed
                    if temp_output.exists():
                        temp_output.unlink()
                    print(f"    ❌ Failed to compress: {pdf_file.name}")
                    if result.stderr:
                        print(f"       Error: {result.stderr.strip()}")
                    failed_count += 1
                    total_compressed_size += original_size  # Keep original size in totals
                    
            except Exception as e:
                print(f"    ❌ Error compressing {pdf_file.name}: {e}")
                failed_count += 1
                total_compressed_size += original_size  # Keep original size in totals
        
        # Print summary
        print(f"\n📊 PDF Compression Summary:")
        print(f"  ✅ Successfully compressed: {compressed_count}")
        print(f"  ❌ Failed compressions: {failed_count}")
        print(f"  📁 Total files processed: {len(pdf_files)}")
        
        if total_original_size > 0:
            total_reduction = ((total_original_size - total_compressed_size) / total_original_size) * 100
            print(f"  📏 Original total size: {total_original_size:,} bytes")
            print(f"  📏 Compressed total size: {total_compressed_size:,} bytes")
            print(f"  📉 Overall size reduction: {total_reduction:.1f}%")
    
    def run(self):
        """Run the complete update process"""
        print("Starting book update process...")
        
        # Process books
        books = self.process_books()
        
        if not books:
            print("No books were processed successfully")
            return
        
        # Generate thumbnails
        print("Generating thumbnails...")
        create_thumbnails()
        
        # Update HTML file
        print("Updating HTML file...")
        self.update_html_file(books)
        
        # Compress all PDFs for smaller file sizes
        print("Compressing PDF files...")
        self.compress_all_pdfs()
        
        print(f"Process completed successfully! Added {len(books)} books.")

def main():
    # Get Google Sheets URL from environment variable
    sheet_url = os.getenv('GOOGLE_SHEET_URL')
    
    if not sheet_url:
        print("❌ Error: GOOGLE_SHEET_URL environment variable not set!")
        print("Please create a .env file with your Google Sheets URL.")
        print("Example .env file content:")
        print("GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit")
        return
    
    print(f"📋 Using Google Sheet from environment variable")
    updater = BookUpdater(sheet_url)
    updater.run()

if __name__ == "__main__":
    main() 