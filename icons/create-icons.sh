#!/bin/bash

# KidsGames PWA Icon Generator
# This script generates all required PWA icons from appicon.png

APPICON_PATH="/Users/jashem/prod/audacity/KidsGames/appicon.png"
ICON_DIR="/Users/jashem/prod/audacity/KidsGames/icons"

# Check if appicon.png exists
if [ ! -f "$APPICON_PATH" ]; then
    echo "❌ Error: appicon.png not found at $APPICON_PATH"
    echo "Please place your appicon.png file in the KidsGames directory"
    exit 1
fi

echo "✅ Found appicon.png - generating PWA icons..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Please install it:"
    echo "brew install imagemagick"
    exit 1
fi

# Create icon sizes
declare -a ICON_SIZES=(
    "16:icon-16x16.png"
    "32:icon-32x32.png"
    "70:icon-70x70.png"
    "72:icon-72x72.png"
    "96:icon-96x96.png"
    "128:icon-128x128.png"
    "144:icon-144x144.png"
    "150:icon-150x150.png"
    "152:icon-152x152.png"
    "167:icon-167x167.png"
    "180:icon-180x180.png"
    "192:icon-192x192.png"
    "194:icon-194x194.png"
    "195:icon-195x195.png"
    "196:icon-196x196.png"
    "210:icon-210x210.png"
    "256:icon-256x256.png"
    "310:icon-310x310.png"
    "320:icon-320x320.png"
    "384:icon-384x384.png"
    "400:icon-400x400.png"
    "512:icon-512x512.png"
    "1024:icon-1024x1024.png"
)

# Generate standard icons
for size_info in "${ICON_SIZES[@]}"; do
    IFS=':' read -r size filename <<< "$size_info"
    echo "📱 Generating ${filename} (${size}x${size})"
    convert "$APPICON_PATH" -resize "${size}x${size}" -alpha off "$ICON_DIR/$filename"
done

# Generate maskable icons (with safe area)
echo "🎭 Generating maskable icons..."
convert "$APPICON_PATH" \
    -resize 512x512 \
    -size 512x512 xc:"#4f391a" \
    +swap -gravity center -composite \
    "$ICON_DIR/maskable-icon-512x512.png"

convert "$APPICON_PATH" \
    -resize 192x192 \
    -size 192x192 xc:"#4f391a" \
    +swap -gravity center -composite \
    "$ICON_DIR/maskable-icon-192x192.png"

# Generate monochrome icons
echo "⚫ Generating monochrome icons..."
convert "$APPICON_PATH" \
    -resize 512x512 \
    -colorspace Gray \
    "$ICON_DIR/monochrome-icon-512x512.png"

convert "$APPICON_PATH" \
    -resize 192x192 \
    -colorspace Gray \
    "$ICON_DIR/monochrome-icon-192x192.png"

# Generate shortcut icons
echo "🎮 Generating shortcut icons..."
for game in "2048" "quran" "hextris"; do
    convert "$APPICON_PATH" \
        -resize 96x96 \
        -background "#4f391a" \
        -gravity south \
        -extent 96x120 \
        -fill white \
        -font Arial-Bold \
        -pointsize 14 \
        -gravity south \
        -annotate +0+8 "${game^^}" \
        "$ICON_DIR/shortcut-${game}.png"
done

# Generate favicon.ico (requires multiple sizes)
echo "🌐 Generating favicon.ico..."
convert \
    "$ICON_DIR/icon-16x16.png" \
    "$ICON_DIR/icon-32x32.png" \
    "$ICON_DIR/icon-48x48.png" \
    "$ICON_DIR/icon-64x64.png" \
    "$ICON_DIR/icon-128x128.png" \
    "$ICON_DIR/icon-256x256.png" \
    "/Users/jashem/prod/audacity/KidsGames/favicon.ico"

echo ""
echo "✅ All icons generated successfully!"
echo ""
echo "📁 Generated files in $ICON_DIR:"
ls -la "$ICON_DIR"/*.png | wc -l | xargs echo "PNG files:"
echo ""
echo "📱 Your PWA is now ready with custom icons!"
echo "🚀 Deploy to GitHub Pages for full PWA functionality!"