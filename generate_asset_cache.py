#!/usr/bin/env python3
"""
Asset Cache Generator for KidsGames PWA

This script scans the entire project structure and generates a comprehensive
list of static assets (CSS, JS, images, fonts) that should be pre-cached
by the service worker for reliable offline functionality.
"""

import os
import json
import re
from pathlib import Path

def find_assets(base_path, asset_extensions):
    """Find all assets with given extensions in the base path."""
    assets = []
    base_path = Path(base_path)

    # Skip these directories to avoid unnecessary files
    skip_dirs = {
        '__pycache__', '.git', 'node_modules', '.vscode',
        '.DS_Store', '*.tmp', '*.log', 'venv', 'env'
    }

    for root, dirs, files in os.walk(base_path):
        # Skip unwanted directories
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in skip_dirs]

        for file in files:
            if not file.startswith('.') and file.endswith(tuple(asset_extensions)):
                # Get relative path from base_path
                full_path = Path(root) / file
                relative_path = full_path.relative_to(base_path)
                assets.append(f"/KidsGames/{relative_path}")

    return sorted(assets)

def categorize_assets():
    """Categorize assets by type and priority."""

    # Asset extensions by category
    extensions = {
        'css': ['.css'],
        'js': ['.js', '.mjs'],
        'images': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'],
        'fonts': ['.woff', '.woff2', '.ttf', '.otf', '.eot'],
        'media': ['.mp3', '.wav', '.mp4', '.webm', '.ogg']
    }

    # Directories to scan
    directories = ['games', 'premium-games', 'read', 'icons']

    categorized_assets = {}

    for category, ext_list in extensions.items():
        assets = []
        for directory in directories:
            if os.path.exists(directory):
                assets.extend(find_assets(directory, ext_list))

        # Also check root level for assets
        root_path = Path('.')
        root_assets = []
        for file in root_path.iterdir():
            if file.is_file() and not file.name.startswith('.') and file.name.endswith(tuple(ext_list)):
                root_assets.append(f"/KidsGames/{file.name}")
        assets.extend(root_assets)

        # Remove duplicates
        assets = list(set(assets))
        categorized_assets[category] = sorted(assets)

    return categorized_assets

def generate_service_worker_assets(categorized_assets):
    """Generate the STATIC_ASSETS array for the service worker."""

    # Core PWA files
    core_assets = [
        '/KidsGames/',
        '/KidsGames/index.html',
        '/KidsGames/manifest.json',
        '/KidsGames/sw.js'
    ]

    # Add high priority assets (CSS and JS)
    high_priority = []
    high_priority.extend(categorized_assets.get('css', []))
    high_priority.extend(categorized_assets.get('js', []))
    high_priority.extend(categorized_assets.get('fonts', []))

    # Add medium priority assets (essential images)
    medium_priority = []
    for img in categorized_assets.get('images', []):
        # Include icons and essential UI images
        if any(keyword in img.lower() for keyword in ['icon', 'logo', 'ui', 'button', 'background']):
            medium_priority.append(img)

    # Add low priority assets (all other images and media)
    low_priority = []
    for img in categorized_assets.get('images', []):
        if img not in medium_priority:
            low_priority.append(img)

    low_priority.extend(categorized_assets.get('media', []))

    return {
        'core': core_assets,
        'high_priority': high_priority,
        'medium_priority': medium_priority,
        'low_priority': low_priority
    }

def generate_cache_version():
    """Generate a cache version based on current timestamp."""
    import datetime
    return datetime.datetime.now().strftime('%Y%m%d-%H%M%S')

def update_service_worker(assets_by_priority):
    """Update the service worker with new asset lists."""

    sw_file = 'sw.js'
    if not os.path.exists(sw_file):
        print(f"Error: {sw_file} not found!")
        return False

    # Read current service worker
    with open(sw_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Generate new STATIC_ASSETS array
    all_assets = []
    all_assets.extend(assets_by_priority['core'])
    all_assets.extend(assets_by_priority['high_priority'])
    all_assets.extend(assets_by_priority['medium_priority'])

    # Limit low priority assets to prevent cache size issues
    low_priority_limit = 100  # Adjust based on cache size constraints
    all_assets.extend(assets_by_priority['low_priority'][:low_priority_limit])

    # Create the new STATIC_ASSETS array
    static_assets_str = 'const STATIC_ASSETS = [\n'
    for asset in all_assets:
        static_assets_str += f"  '{asset}',\n"
    static_assets_str += '];'

    # Update the service worker content
    # Find and replace the STATIC_ASSETS definition
    pattern = r'const STATIC_ASSETS = \[[\s\S]*?\];'
    new_content = re.sub(pattern, static_assets_str, content)

    # Update cache version
    cache_version = generate_cache_version()
    version_pattern = r'const CACHE_VERSION = [\'"][^\'\"]*[\'"];'
    new_content = re.sub(version_pattern, f"const CACHE_VERSION = '{cache_version}';", new_content)

    # Write updated service worker
    with open(sw_file, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"✅ Updated {sw_file} with {len(all_assets)} assets")
    print(f"📦 Cache version: {cache_version}")
    return True

def main():
    """Main function to generate asset cache and update service worker."""
    print("🔍 Scanning for static assets...")

    # Categorize all assets
    categorized_assets = categorize_assets()

    # Print asset summary
    total_assets = sum(len(assets) for assets in categorized_assets.values())
    print(f"\n📊 Found {total_assets} total assets:")
    for category, assets in categorized_assets.items():
        print(f"  {category}: {len(assets)} files")

    # Generate assets for service worker
    assets_by_priority = generate_service_worker_assets(categorized_assets)

    print(f"\n📋 Asset distribution for caching:")
    print(f"  Core: {len(assets_by_priority['core'])}")
    print(f"  High Priority (CSS/JS/Fonts): {len(assets_by_priority['high_priority'])}")
    print(f"  Medium Priority (Essential Images): {len(assets_by_priority['medium_priority'])}")
    print(f"  Low Priority (Other Assets): {len(assets_by_priority['low_priority'])}")

    # Save asset inventory to JSON file for reference
    inventory_file = 'asset_inventory.json'
    with open(inventory_file, 'w', encoding='utf-8') as f:
        json.dump({
            'categorized': categorized_assets,
            'by_priority': assets_by_priority,
            'cache_version': generate_cache_version()
        }, f, indent=2)

    print(f"\n💾 Asset inventory saved to {inventory_file}")

    # Update service worker
    if update_service_worker(assets_by_priority):
        print("✅ Service worker updated successfully!")
        print("\n🚀 PWA is now configured for complete offline functionality!")
        print("💡 Remember to clear browser cache and restart the PWA to test.")
    else:
        print("❌ Failed to update service worker")

if __name__ == '__main__':
    main()