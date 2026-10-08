import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateIcons() {
  const svgPath = path.resolve('public/icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // 1. 512x512 PWA Icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/pwa-512x512.png'));
  console.log('Generated public/pwa-512x512.png');

  // 2. 192x192 PWA Icon
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.resolve('public/pwa-192x192.png'));
  console.log('Generated public/pwa-192x192.png');

  // 3. Apple Touch Icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.resolve('public/apple-touch-icon.png'));
  console.log('Generated public/apple-touch-icon.png');

  // 4. Favicon 32x32 / 48x48
  await sharp(svgBuffer)
    .resize(48, 48)
    .png()
    .toFile(path.resolve('public/favicon.png'));
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.resolve('public/favicon.ico'));
  console.log('Generated public/favicon.png and public/favicon.ico');

  // 5. Maskable 512x512 (with 10% padding for safe area)
  const innerSize = Math.round(512 * 0.8);
  const padding = Math.round((512 - innerSize) / 2);
  const innerBuffer = await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 29, g: 39, b: 59, alpha: 1 }, // #1d273b brand background
    },
  })
    .composite([
      {
        input: innerBuffer,
        top: padding,
        left: padding,
      },
    ])
    .png()
    .toFile(path.resolve('public/pwa-maskable-512x512.png'));
  console.log('Generated public/pwa-maskable-512x512.png');

  console.log('All icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
