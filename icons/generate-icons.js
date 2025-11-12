#!/usr/bin/env node

/**
 * KidsGames PWA Icon Generator
 * This script generates all required PWA icons from the master SVG file.
 * Run this script in a browser environment or use Node.js with canvas and sharp libraries.
 */

const iconSizes = [
    { size: 16, name: 'icon-16x16.png' },
    { size: 32, name: 'icon-32x32.png' },
    { size: 72, name: 'icon-72x72.png' },
    { size: 96, name: 'icon-96x96.png' },
    { size: 128, name: 'icon-128x128.png' },
    { size: 144, name: 'icon-144x144.png' },
    { size: 152, name: 'icon-152x152.png' },
    { size: 192, name: 'icon-192x192.png' },
    { size: 384, name: 'icon-384x384.png' },
    { size: 512, name: 'icon-512x512.png' },
    { size: 192, name: 'maskable-icon-192x192.png', maskable: true },
    { size: 512, name: 'maskable-icon-512x512.png', maskable: true },
    { size: 192, name: 'monochrome-icon-192x192.png', monochrome: true },
    { size: 512, name: 'monochrome-icon-512x512.png', monochrome: true }
];

const shortcutSizes = [
    { size: 96, name: 'shortcut-2048.png', type: '2048' },
    { size: 96, name: 'shortcut-quran.png', type: 'quran' },
    { size: 96, name: 'shortcut-hextris.png', type: 'hextris' }
];

function generateIcon(size, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const { maskable = false, monochrome = false, type = 'default' } = options;

    // Background
    if (maskable) {
        // Maskable icons extend to edges with solid color
        ctx.fillStyle = '#4f391a';
        ctx.fillRect(0, 0, size, size);
    } else if (monochrome) {
        // Monochrome icons with transparency
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);
    } else {
        // Regular icon with gradient background
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, '#ece4d9');
        gradient.addColorStop(1, '#eed9bb');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Apply rounded corners
        ctx.globalCompositeOperation = 'destination-in';
        roundRect(ctx, 0, 0, size, size, size * 0.15);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    // Draw icon content based on type
    if (type === '2048') {
        draw2048Icon(ctx, size, monochrome);
    } else if (type === 'quran') {
        drawQuranIcon(ctx, size, monochrome);
    } else if (type === 'hextris') {
        drawHextrisIcon(ctx, size, monochrome);
    } else {
        drawGameControllerIcon(ctx, size, monochrome);
    }

    return canvas;
}

function drawGameControllerIcon(ctx, size, monochrome) {
    const iconColor = monochrome ? '#ffffff' : '#4f391a';
    ctx.fillStyle = iconColor;
    ctx.strokeStyle = iconColor;
    ctx.lineWidth = Math.max(1, size / 32);

    const padding = size * 0.15;
    const bodyWidth = size * 0.7;
    const bodyHeight = size * 0.4;
    const centerX = size / 2;
    const centerY = size / 2;

    // Controller body
    roundRect(ctx, centerX - bodyWidth/2, centerY - bodyHeight/2, bodyWidth, bodyHeight, size * 0.1);
    ctx.fill();

    // D-Pad
    const dpadSize = size * 0.08;
    const dpadX = centerX - bodyWidth/2 + bodyWidth * 0.25;
    const dpadY = centerY;

    ctx.fillRect(dpadX - dpadSize/2, dpadY - dpadSize * 1.5, dpadSize, dpadSize * 3);
    ctx.fillRect(dpadX - dpadSize * 1.5, dpadY - dpadSize/2, dpadSize * 3, dpadSize);

    // Action buttons
    const buttonSize = size * 0.06;
    const buttonX = centerX + bodyWidth/2 - bodyWidth * 0.25;
    const buttonY = centerY;

    // Draw 4 buttons
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
        ctx.beginPath();
        ctx.arc(buttonX + Math.cos(angle) * buttonSize, buttonY + Math.sin(angle) * buttonSize, buttonSize, 0, Math.PI * 2);
        ctx.fill();
    }

    // Add "KIDS" text for larger icons
    if (size >= 192) {
        ctx.font = `bold ${size * 0.08}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('KIDS', centerX, centerY + bodyHeight/2 + size * 0.08);
    }
}

function draw2048Icon(ctx, size, monochrome) {
    const iconColor = monochrome ? '#ffffff' : '#ff6b6b';
    ctx.fillStyle = iconColor;

    const gridSize = 4;
    const padding = size * 0.1;
    const cellSize = (size - padding * 2) / gridSize;

    // Draw 2048 grid
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const x = padding + i * cellSize + cellSize * 0.1;
            const y = padding + j * cellSize + cellSize * 0.1;
            const w = cellSize * 0.8;
            const h = cellSize * 0.8;

            // Alternate colors for visual interest
            if ((i + j) % 2 === 0) {
                ctx.fillRect(x, y, w, h);
            } else {
                roundRect(ctx, x, y, w, h, cellSize * 0.1);
                ctx.fill();
            }
        }
    }

    // Add "2048" text
    ctx.font = `bold ${size * 0.3}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('2048', size / 2, size / 2 + size * 0.1);
}

function drawQuranIcon(ctx, size, monochrome) {
    const iconColor = monochrome ? '#ffffff' : '#4CAF50';
    ctx.fillStyle = iconColor;

    // Draw book shape
    const bookWidth = size * 0.6;
    const bookHeight = size * 0.8;
    const centerX = size / 2;
    const centerY = size / 2;

    // Book cover
    roundRect(ctx, centerX - bookWidth/2, centerY - bookHeight/2, bookWidth, bookHeight, size * 0.05);
    ctx.fill();

    // Book spine
    ctx.fillRect(centerX - bookWidth/2 + bookWidth * 0.1, centerY - bookHeight/2, bookWidth * 0.05, bookHeight);

    // Crescent moon and star (Islamic symbols)
    ctx.font = `${size * 0.4}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('☪', centerX, centerY + size * 0.1);
}

function drawHextrisIcon(ctx, size, monochrome) {
    const iconColor = monochrome ? '#ffffff' : '#9C27B0';
    ctx.fillStyle = iconColor;

    const centerX = size / 2;
    const centerY = size / 2;
    const hexSize = size * 0.15;

    // Draw hexagonal grid pattern
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const x = centerX + (col - 1) * hexSize * 1.8;
            const y = centerY + (row - 1) * hexSize * 1.8 + (col % 2) * hexSize * 0.9;

            drawHexagon(ctx, x, y, hexSize);
        }
    }
}

function drawHexagon(ctx, x, y, size) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = x + size * Math.cos(angle);
        const hy = y + size * Math.sin(angle);
        if (i === 0) {
            ctx.moveTo(hx, hy);
        } else {
            ctx.lineTo(hx, hy);
        }
    }
    ctx.closePath();
    ctx.fill();
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function downloadCanvas(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Generate all icons
function generateAllIcons() {
    const container = document.getElementById('iconContainer');

    if (container) {
        container.innerHTML = '';
    }

    // Generate main icons
    iconSizes.forEach(iconSpec => {
        const canvas = generateIcon(iconSpec.size, {
            maskable: iconSpec.maskable,
            monochrome: iconSpec.monochrome
        });

        if (container) {
            displayIcon(canvas, iconSpec.name, container);
        } else {
            downloadCanvas(canvas, iconSpec.name);
        }
    });

    // Generate shortcut icons
    shortcutSizes.forEach(iconSpec => {
        const canvas = generateIcon(iconSpec.size, {
            type: iconSpec.type
        });

        if (container) {
            displayIcon(canvas, iconSpec.name, container);
        } else {
            downloadCanvas(canvas, iconSpec.name);
        }
    });
}

function displayIcon(canvas, name, container) {
    const iconItem = document.createElement('div');
    iconItem.style.cssText = `
        display: inline-block;
        text-align: center;
        margin: 10px;
        padding: 10px;
        border: 2px solid #4f391a;
        border-radius: 8px;
        background: #eed9bb;
    `;

    const title = document.createElement('div');
    title.textContent = name;
    title.style.cssText = 'font-weight: bold; margin-bottom: 5px;';
    iconItem.appendChild(title);

    canvas.style.cssText = 'display: block; margin: 5px auto; border: 1px solid #4f391a;';
    iconItem.appendChild(canvas);

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Download';
    downloadBtn.style.cssText = 'background: #ff6b6b; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;';
    downloadBtn.onclick = () => downloadCanvas(canvas, name);
    iconItem.appendChild(downloadBtn);

    container.appendChild(iconItem);
}

// Auto-generate on page load if in browser
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(generateAllIcons, 100);
    });
}

// Export for Node.js use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateIcon, generateAllIcons };
}