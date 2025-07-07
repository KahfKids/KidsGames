#!/usr/bin/env python3
"""
Test script to verify Google Sheets access and data parsing
"""

import sys
import os
from pathlib import Path

# Add the current directory to the path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from update_books import BookUpdater
    
    def test_sheet_access():
        print("=== Testing Google Sheets Access ===")
        
        sheet_url = "https://docs.google.com/spreadsheets/d/1e01DhXoAn_0let7PgWh4hZQWw4GIFkO5z13-zJN4eWo/edit?usp=sharing"
        
        try:
            updater = BookUpdater(sheet_url)
            
            # Test CSV URL generation
            csv_url = updater.get_csv_url()
            print(f"✅ CSV URL generated: {csv_url}")
            
            # Test sheet data download
            books_data = updater.download_sheet_data()
            print(f"✅ Downloaded {len(books_data)} high-quality books")
            
            # Show sample data
            if books_data:
                print("\n📚 Sample books found:")
                for i, book in enumerate(books_data[:5]):  # Show first 5 books
                    title = book.get('Sub-category', '').strip() or book.get('Category', '').strip()
                    languages = book.get('Language', '').strip()
                    print(f"  {i+1}. {title} ({languages})")
                
                if len(books_data) > 5:
                    print(f"  ... and {len(books_data) - 5} more books")
            
            else:
                print("⚠️  No high-quality books found in the sheet")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
            
        return True
    
    if __name__ == "__main__":
        success = test_sheet_access()
        if success:
            print("\n✅ Test completed successfully!")
            print("You can now run the full update process with: python run_book_update.py")
        else:
            print("\n❌ Test failed. Please check your internet connection and try again.")
            
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please make sure all dependencies are installed:")
    print("pip install -r requirements.txt")
    sys.exit(1) 