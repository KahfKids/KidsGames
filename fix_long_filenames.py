#!/usr/bin/env python3
"""
Script to fix files with extremely long Unicode names that cause GitHub Actions to fail
"""

import os
import hashlib
from pathlib import Path
import shutil

def get_safe_filename(original_name, max_length=100):
    """Generate a safe filename from a long Unicode name"""
    # Remove file extension
    name_without_ext = Path(original_name).stem
    ext = Path(original_name).suffix
    
    # If name is already short enough, just return it
    if len(name_without_ext) <= max_length:
        return original_name
    
    # Take first part and add hash for uniqueness
    truncated = name_without_ext[:max_length]
    # Remove any trailing incomplete Unicode characters
    truncated = truncated.encode('utf-8')[:max_length].decode('utf-8', errors='ignore')
    
    # Add hash for uniqueness
    name_hash = hashlib.md5(original_name.encode()).hexdigest()[:8]
    safe_name = f"{truncated}-{name_hash}{ext}"
    
    return safe_name

def fix_long_filenames():
    """Find and rename files with extremely long names"""
    print("🔍 Looking for files with extremely long names...")
    
    # Check root directory for PNG files
    root_files = list(Path('.').glob('*.png'))
    pdf_files = list(Path('read/pdf').glob('*.pdf')) if Path('read/pdf').exists() else []
    
    all_files = root_files + pdf_files
    renamed_count = 0
    
    for file_path in all_files:
        filename = file_path.name
        
        # Check if filename is too long (over 200 characters)
        if len(filename) > 200:
            print(f"📁 Found long filename: {filename}")
            print(f"   Length: {len(filename)} characters")
            
            # Generate safe filename
            safe_filename = get_safe_filename(filename)
            new_path = file_path.parent / safe_filename
            
            print(f"   Renaming to: {safe_filename}")
            print(f"   New length: {len(safe_filename)} characters")
            
            try:
                # Rename the file
                file_path.rename(new_path)
                print(f"   ✅ Successfully renamed")
                renamed_count += 1
            except Exception as e:
                print(f"   ❌ Error renaming: {e}")
        
        # Also check for files with Unicode characters that might be problematic
        elif any(ord(char) > 127 for char in filename) and len(filename) > 100:
            print(f"⚠️  Found potentially problematic Unicode filename: {filename}")
            print(f"   Length: {len(filename)} characters")
            
            # Generate safe filename
            safe_filename = get_safe_filename(filename)
            new_path = file_path.parent / safe_filename
            
            print(f"   Renaming to: {safe_filename}")
            
            try:
                # Rename the file
                file_path.rename(new_path)
                print(f"   ✅ Successfully renamed")
                renamed_count += 1
            except Exception as e:
                print(f"   ❌ Error renaming: {e}")
    
    if renamed_count > 0:
        print(f"\n✅ Successfully renamed {renamed_count} files")
        print("💡 You should now commit and push these changes to fix the GitHub Actions deployment")
    else:
        print("\n✅ No files with extremely long names found")

if __name__ == "__main__":
    fix_long_filenames() 