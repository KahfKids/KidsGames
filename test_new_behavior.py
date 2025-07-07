#!/usr/bin/env python3
"""
Test script to demonstrate the new unique naming and thumbnail preservation behavior
"""

import sys
import os
from pathlib import Path

# Add the current directory to the path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from update_books import BookUpdater
    
    def test_new_behavior():
        print("=== Testing New Behavior with Real Data ===")
        
        sheet_url = "https://docs.google.com/spreadsheets/d/1e01DhXoAn_0let7PgWh4hZQWw4GIFkO5z13-zJN4eWo/edit?usp=sharing"
        
        try:
            updater = BookUpdater(sheet_url)
            
            # Get real data from the sheet
            books_data = updater.download_sheet_data()
            print(f"✅ Found {len(books_data)} high-quality books")
            
            # Show first few books and their unique IDs
            print("\n📚 Sample unique IDs that would be generated:")
            for i, book in enumerate(books_data[:5]):
                drive_url = book.get('Books', '').strip()
                title = book.get('Sub-category', '').strip() or book.get('Category', '').strip()
                
                if drive_url and title:
                    unique_id = updater.generate_safe_id(title, drive_url)
                    print(f"  {i+1}. '{title}' -> '{unique_id}'")
            
            # Count existing thumbnails
            existing_thumbnails = list(Path('.').glob('*.png'))
            existing_thumbnails = [t for t in existing_thumbnails if t.name not in ['logo.png', 'icon.png']]
            print(f"\n🖼️ Current thumbnails: {len(existing_thumbnails)}")
            
            # Generate unique IDs for all books
            pdf_ids_to_replace = set()
            for book in books_data:
                drive_url = book.get('Books', '').strip()
                title = book.get('Sub-category', '').strip() or book.get('Category', '').strip()
                
                if drive_url and title:
                    unique_id = updater.generate_safe_id(title, drive_url)
                    pdf_ids_to_replace.add(unique_id)
            
            print(f"📄 PDFs to be downloaded: {len(pdf_ids_to_replace)}")
            
            # Check which thumbnails would be affected
            thumbnails_to_remove = []
            thumbnails_to_keep = []
            
            for png_file in existing_thumbnails:
                png_name = png_file.stem
                if png_name in pdf_ids_to_replace:
                    thumbnails_to_remove.append(png_file.name)
                else:
                    thumbnails_to_keep.append(png_file.name)
            
            print(f"\n🗑️  Thumbnails to be replaced: {len(thumbnails_to_remove)}")
            print(f"💾 Thumbnails to be preserved: {len(thumbnails_to_keep)}")
            
            if thumbnails_to_remove:
                print(f"  Examples of thumbnails to replace: {thumbnails_to_remove[:3]}...")
            
            if thumbnails_to_keep:
                print(f"  Examples of thumbnails to keep: {thumbnails_to_keep[:3]}...")
            
            print(f"\n✅ New behavior summary:")
            print(f"  - Unique PDF names prevent conflicts")
            print(f"  - {len(thumbnails_to_keep)} existing thumbnails will be preserved")
            print(f"  - Only {len(thumbnails_to_remove)} thumbnails will be replaced")
            print(f"  - {len(pdf_ids_to_replace)} new PDFs will be downloaded")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
            
        return True
    
    if __name__ == "__main__":
        success = test_new_behavior()
        if success:
            print("\n🎉 Ready to run the updated script!")
            print("Run: python run_book_update.py")
        else:
            print("\n❌ Test failed.")
            
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please make sure all dependencies are installed:")
    print("pip install -r requirements.txt")
    sys.exit(1) 