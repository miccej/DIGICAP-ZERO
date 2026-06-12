import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function main() {
  const svgPath = path.resolve('digicap_console_logo.svg');
  const pngPath = path.resolve('digicap_console_logo.png');
  const jpgPath = path.resolve('digicap_console_logo.jpg');

  console.log(`Reading SVG from ${svgPath}...`);
  if (!fs.existsSync(svgPath)) {
    console.error("Error: digicap_console_logo.svg not found!");
    process.exit(1);
  }

  // Generate 512x512 PNG
  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(pngPath);
  console.log(`Generated 512x512 PNG at ${pngPath}`);

  // Generate 512x512 JPG
  await sharp(svgPath)
    .resize(512, 512)
    .jpeg({ quality: 95 })
    .toFile(jpgPath);
  console.log(`Generated 512x512 JPG at ${jpgPath}`);
}

main().catch(console.error);
