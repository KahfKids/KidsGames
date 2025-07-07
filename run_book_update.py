#!/usr/bin/env python3
"""
Simple script to run the book update process
"""

import sys
import os
from pathlib import Path

# Add the current directory to the path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from update_books import BookUpdater
    
    def main():
        print("=== Kids Games Book Updater ===")
        print("This script will:")
        print("1. Download high-quality books from Google Sheets")
        print("2. Download PDFs from Google Drive")
        print("3. Generate thumbnails")
        print("4. Update the HTML file")
        print()
        
        # Confirm before proceeding
        response = input("Do you want to proceed? This will overwrite existing files. (y/N): ")
        if response.lower() != 'y':
            print("Operation cancelled.")
            return
        
        # Check if required directories exist
        if not Path('read').exists():
            print("Error: 'read' directory not found. Please run this script from the project root.")
            return
        
        if not Path('read/index.html').exists():
            print("Error: 'read/index.html' not found.")
            return
        
        sheet_url = "https://docs.google.com/spreadsheets/d/1e01DhXoAn_0let7PgWh4hZQWw4GIFkO5z13-zJN4eWo/edit?usp=sharing"
        
        try:
            updater = BookUpdater(sheet_url)
            updater.run()
            print("\n✅ Update completed successfully!")
            
        except Exception as e:
            print(f"\n❌ Error during update: {e}")
            print("Please check your internet connection and try again.")
            
    if __name__ == "__main__":
        main()
        
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please make sure all dependencies are installed:")
    print("pip install -r requirements.txt")
    sys.exit(1) 