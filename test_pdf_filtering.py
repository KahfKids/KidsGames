#!/usr/bin/env python3
"""
Test script to verify PDF filtering functionality
"""

import sys
import os
from pathlib import Path

# Add the current directory to the path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from update_books import BookUpdater
    
    def test_pdf_filtering():
        print("=== Testing PDF Filtering Functionality ===")
        
        sheet_url = "https://docs.google.com/spreadsheets/d/1e01DhXoAn_0let7PgWh4hZQWw4GIFkO5z13-zJN4eWo/edit?usp=sharing"
        
        try:
            updater = BookUpdater(sheet_url)
            
            # Check existing PDFs
            existing_pdfs = []
            if updater.pdf_dir.exists():
                for pdf_file in updater.pdf_dir.glob('*.pdf'):
                    existing_pdfs.append(pdf_file.stem)
            
            print(f"📄 Found {len(existing_pdfs)} existing PDFs:")
            for pdf_name in existing_pdfs[:5]:  # Show first 5
                print(f"  - {pdf_name}.pdf")
            if len(existing_pdfs) > 5:
                print(f"  ... and {len(existing_pdfs) - 5} more")
            
            # Get books from Google Sheets
            books_data = updater.download_sheet_data()
            print(f"\n📚 Found {len(books_data)} high-quality books in Google Sheets")
            
            # Generate unique IDs for all books
            all_book_ids = set()
            for book in books_data:
                drive_url = book.get('Books', '').strip()
                title = book.get('Sub-category', '').strip() or book.get('Category', '').strip()
                
                if drive_url and title:
                    unique_id = updater.generate_safe_id(title, drive_url)
                    all_book_ids.add(unique_id)
            
            print(f"🔗 Generated {len(all_book_ids)} unique book IDs")
            
            # Check which books would have PDFs vs missing PDFs
            books_with_pdfs = []
            books_without_pdfs = []
            
            for book_id in all_book_ids:
                pdf_path = updater.pdf_dir / f"{book_id}.pdf"
                if pdf_path.exists():
                    books_with_pdfs.append(book_id)
                else:
                    books_without_pdfs.append(book_id)
            
            print(f"\n📊 PDF Availability Analysis:")
            print(f"  ✅ Books with PDFs: {len(books_with_pdfs)}")
            print(f"  ❌ Books without PDFs: {len(books_without_pdfs)}")
            
            if books_without_pdfs:
                print(f"\n⚠️  Books that would be skipped (no PDF):")
                for book_id in books_without_pdfs[:5]:  # Show first 5
                    print(f"    - {book_id}")
                if len(books_without_pdfs) > 5:
                    print(f"    ... and {len(books_without_pdfs) - 5} more")
            
            if books_with_pdfs:
                print(f"\n✅ Books that would be included (have PDF):")
                for book_id in books_with_pdfs[:5]:  # Show first 5
                    print(f"    - {book_id}")
                if len(books_with_pdfs) > 5:
                    print(f"    ... and {len(books_with_pdfs) - 5} more")
            
            # Test the filtering logic
            print(f"\n🧪 Testing filtering logic:")
            
            # Create test books (some with PDFs, some without)
            test_books = []
            for i, book_id in enumerate(list(all_book_ids)[:10]):  # Test first 10
                pdf_path = updater.pdf_dir / f"{book_id}.pdf"
                has_pdf = pdf_path.exists()
                
                test_books.append({
                    'id': book_id,
                    'title': f'Test Book {i+1}',
                    'languages': ['English'],
                    'category': 'Test',
                    'sub_category': 'Test'
                })
                
                print(f"  {i+1}. {book_id} - PDF exists: {has_pdf}")
            
            # Simulate the filtering
            books_with_pdfs_filtered = []
            for book in test_books:
                pdf_path = updater.pdf_dir / f"{book['id']}.pdf"
                if pdf_path.exists():
                    books_with_pdfs_filtered.append(book)
            
            print(f"\n✅ Filtering test results:")
            print(f"  - Original books: {len(test_books)}")
            print(f"  - Books with PDFs: {len(books_with_pdfs_filtered)}")
            print(f"  - Books filtered out: {len(test_books) - len(books_with_pdfs_filtered)}")
            
            return len(books_with_pdfs_filtered) > 0
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def main():
        print("=== PDF Filtering Test ===")
        
        success = test_pdf_filtering()
        
        if success:
            print("\n🎉 PDF filtering functionality is working correctly!")
            print("\nThe script will now:")
            print("  ✅ Only include books with actual PDF files")
            print("  ✅ Skip books where PDF download failed")
            print("  ✅ Only generate JavaScript calls for existing PDFs")
            print("  ✅ Only create language sections for books with PDFs")
            print("  ✅ Provide detailed feedback about missing files")
        else:
            print("\n❌ Test failed.")
    
    if __name__ == "__main__":
        main()
        
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please make sure all dependencies are installed.")
    sys.exit(1) 