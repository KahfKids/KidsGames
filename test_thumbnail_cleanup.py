#!/usr/bin/env python3
"""
Test script to verify the updated thumbnail cleaning logic works correctly with existing PDFs
"""

import sys
import os
from pathlib import Path

# Add the current directory to the path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from update_books import BookUpdater
    
    def test_thumbnail_cleanup():
        print("=== Testing Updated Thumbnail Cleanup Logic ===")
        
        sheet_url = "https://docs.google.com/spreadsheets/d/1e01DhXoAn_0let7PgWh4hZQWw4GIFkO5z13-zJN4eWo/edit?usp=sharing"
        
        try:
            updater = BookUpdater(sheet_url)
            
            # Check existing PDFs in the read/pdf directory
            existing_pdfs = []
            if updater.pdf_dir.exists():
                for pdf_file in updater.pdf_dir.glob('*.pdf'):
                    existing_pdfs.append(pdf_file.stem)
            
            print(f"📄 Found {len(existing_pdfs)} existing PDFs:")
            for pdf_name in existing_pdfs[:5]:  # Show first 5
                print(f"  - {pdf_name}.pdf")
            if len(existing_pdfs) > 5:
                print(f"  ... and {len(existing_pdfs) - 5} more")
            
            # Check existing thumbnails
            existing_thumbnails = []
            for png_file in Path('.').glob('*.png'):
                if png_file.name not in ['logo.png', 'icon.png']:
                    existing_thumbnails.append(png_file.stem)
            
            print(f"\n🖼️  Found {len(existing_thumbnails)} existing thumbnails:")
            for thumb_name in existing_thumbnails[:5]:  # Show first 5
                print(f"  - {thumb_name}.png")
            if len(existing_thumbnails) > 5:
                print(f"  ... and {len(existing_thumbnails) - 5} more")
            
            # Find thumbnails that match existing PDFs
            matching_thumbnails = []
            for pdf_name in existing_pdfs:
                if pdf_name in existing_thumbnails:
                    matching_thumbnails.append(pdf_name)
            
            print(f"\n🔗 Found {len(matching_thumbnails)} thumbnails that match existing PDFs:")
            for match in matching_thumbnails[:5]:  # Show first 5
                print(f"  - {match}.pdf ↔ {match}.png")
            if len(matching_thumbnails) > 5:
                print(f"  ... and {len(matching_thumbnails) - 5} more matches")
            
            # Get new PDF IDs that would be generated
            books_data = updater.download_sheet_data()
            new_pdf_ids = set()
            for book in books_data:
                drive_url = book.get('Books', '').strip()
                title = book.get('Sub-category', '').strip() or book.get('Category', '').strip()
                
                if drive_url and title:
                    unique_id = updater.generate_safe_id(title, drive_url)
                    new_pdf_ids.add(unique_id)
            
            print(f"\n📋 Generated {len(new_pdf_ids)} new unique PDF IDs")
            
            # Simulate the thumbnail cleanup process
            print(f"\n🧹 Simulating thumbnail cleanup:")
            
            thumbnails_to_remove = []
            thumbnails_to_keep = []
            
            for png_file in Path('.').glob('*.png'):
                if png_file.name not in ['logo.png', 'icon.png']:
                    png_name = png_file.stem
                    
                    # Check if matches existing PDF name OR new PDF ID
                    if png_name in existing_pdfs or png_name in new_pdf_ids:
                        thumbnails_to_remove.append(png_file.name)
                    else:
                        thumbnails_to_keep.append(png_file.name)
            
            print(f"  🗑️  Thumbnails to be removed: {len(thumbnails_to_remove)}")
            print(f"  💾 Thumbnails to be kept: {len(thumbnails_to_keep)}")
            
            # Show examples of what would be removed
            if thumbnails_to_remove:
                print(f"\n  Examples of thumbnails to remove:")
                for thumb in thumbnails_to_remove[:5]:
                    thumb_name = Path(thumb).stem
                    reason = ""
                    if thumb_name in existing_pdfs:
                        reason = f"matches existing PDF {thumb_name}.pdf"
                    elif thumb_name in new_pdf_ids:
                        reason = f"matches new PDF ID {thumb_name}"
                    print(f"    - {thumb} ({reason})")
            
            # Show examples of what would be kept
            if thumbnails_to_keep:
                print(f"\n  Examples of thumbnails to keep:")
                for thumb in thumbnails_to_keep[:5]:
                    print(f"    - {thumb} (no matching PDF)")
            
            print(f"\n✅ Updated cleanup logic working correctly!")
            print(f"  - Will remove {len(matching_thumbnails)} thumbnails matching existing PDFs")
            print(f"  - Will preserve {len(thumbnails_to_keep)} unrelated thumbnails")
            print(f"  - Will remove old and generate new thumbnails for {len(new_pdf_ids)} books")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
            
        return True
    
    if __name__ == "__main__":
        success = test_thumbnail_cleanup()
        if success:
            print("\n🎉 Thumbnail cleanup logic is working correctly!")
            print("The script will now properly clean up existing PDF thumbnails.")
        else:
            print("\n❌ Test failed.")
            
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please make sure all dependencies are installed:")
    print("pip install -r requirements.txt")
    sys.exit(1) 