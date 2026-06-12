import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgPath = path.resolve('digicap_console_logo.svg');

if (!fs.existsSync(svgPath)) {
  console.error(`Error: Header logo file not found at ${svgPath}`);
  process.exit(1);
}

// Background colors
const backgroundHex = '#0d111d'; // Deep slate-cobalt matching the logo inner card
const backgroundAlpha = { r: 13, g: 17, b: 29, alpha: 1 };

// Full dimensions lists
const mipmaps = [
  { name: 'mipmap-mdpi', size: 48, fgSize: 48 },
  { name: 'mipmap-hdpi', size: 72, fgSize: 72 },
  { name: 'mipmap-xhdpi', size: 96, fgSize: 96 },
  { name: 'mipmap-xxhdpi', size: 144, fgSize: 144 },
  { name: 'mipmap-xxxhdpi', size: 192, fgSize: 192 }
];

const splashes = [
  { name: 'drawable', w: 1024, h: 1024, logo: 256 },
  { name: 'drawable-land-hdpi', w: 800, h: 480, logo: 156 },
  { name: 'drawable-land-mdpi', w: 480, h: 320, logo: 100 },
  { name: 'drawable-land-xhdpi', w: 1280, h: 720, logo: 220 },
  { name: 'drawable-land-xxhdpi', w: 1600, h: 960, logo: 280 },
  { name: 'drawable-land-xxxhdpi', w: 1920, h: 1280, logo: 350 },
  { name: 'drawable-port-hdpi', w: 480, h: 800, logo: 156 },
  { name: 'drawable-port-mdpi', w: 320, h: 480, logo: 100 },
  { name: 'drawable-port-xhdpi', w: 720, h: 1280, logo: 220 },
  { name: 'drawable-port-xxhdpi', w: 960, h: 1600, logo: 280 },
  { name: 'drawable-port-xxxhdpi', w: 1280, h: 1920, logo: 350 }
];

async function generate() {
  console.log('Starting uncorrupted Android Resource Generation...');

  // 1. Generate Launcher Icons (Mipmaps)
  for (const mip of mipmaps) {
    const dirPath = path.join('android', 'app', 'src', 'main', 'res', mip.name);
    fs.mkdirSync(dirPath, { recursive: true });

    // ic_launcher.png (Full logo image)
    const iconPath = path.join(dirPath, 'ic_launcher.png');
    await sharp(svgPath)
      .resize(mip.size, mip.size)
      .png({ compressionLevel: 9, palette: true, quality: 100 })
      .toFile(iconPath);
    console.log(`Generated: ${iconPath} (${mip.size}x${mip.size})`);

    // ic_launcher_round.png (Round variant)
    const roundIconPath = path.join(dirPath, 'ic_launcher_round.png');
    await sharp(svgPath)
      .resize(mip.size, mip.size)
      .png({ compressionLevel: 9, palette: true, quality: 100 })
      .toFile(roundIconPath);
    console.log(`Generated: ${roundIconPath} (${mip.size}x${mip.size})`);

    // ic_launcher_foreground.png (Adaptive icon foreground, needs inside transparent safe space, e.g. 108dp viewport)
    // For adaptive foreground we can pad the logo or scale it to look perfect in the center
    const fgName = path.join(dirPath, 'ic_launcher_foreground.png');
    const fgViewportSize = Math.round(mip.size * 1.5); // normally 108dp base
    const fgLogoSize = Math.round(fgViewportSize * 0.65); // 65% safe-zone to avoid clipping

    const resizedLogo = await sharp(svgPath)
      .resize(fgLogoSize, fgLogoSize)
      .toBuffer();

    await sharp({
      create: {
        width: fgViewportSize,
        height: fgViewportSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent foreground background
      }
    })
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png({ compressionLevel: 9, palette: true, quality: 100 })
    .toFile(fgName);
    console.log(`Generated foreground icon: ${fgName} (${fgViewportSize}x${fgViewportSize})`);
  }

  // 2. Generate Splash Screens
  for (const splash of splashes) {
    const dirPath = path.join('android', 'app', 'src', 'main', 'res', splash.name);
    fs.mkdirSync(dirPath, { recursive: true });

    const outputPath = path.join(dirPath, 'splash.png');

    // Make crisp centered version of the logo
    const resizedLogo = await sharp(svgPath)
      .resize(splash.logo, splash.logo)
      .toBuffer();

    await sharp({
      create: {
        width: splash.w,
        height: splash.h,
        channels: 4,
        background: backgroundAlpha
      }
    })
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png({ compressionLevel: 9, palette: true, quality: 100 })
    .toFile(outputPath);
    console.log(`Generated splash: ${outputPath} (${splash.w}x${splash.h})`);
  }

  console.log('✅ Success: All Android assets regenerated with uncorrupted binary streams!');
}

generate().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
