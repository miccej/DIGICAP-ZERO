import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgContent = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Deep Navy Background (#081427) matching 1st page canvas -->
  <rect width="512" height="512" fill="#081427" />

  <!-- Subtle Inner Luster Accent Border -->
  <rect x="8" y="8" width="496" height="496" fill="none" stroke="#334155" stroke-width="2" rx="12" opacity="0.6" />

  <g transform="translate(256, 240)">
    <!-- Main Title: DIGICAP -->
    <text 
      x="-18" 
      y="10" 
      text-anchor="middle" 
      fill="#ffffff" 
      style="font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-weight: 900; font-size: 82px; letter-spacing: 0.02em;"
    >DIGICAP</text>
    
    <!-- Registered Symbol ® -->
    <text 
      x="172" 
      y="-35" 
      text-anchor="start" 
      fill="#cbd5e1" 
      style="font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-weight: 700; font-size: 22px;"
    >®</text>

    <!-- Subtitle: CAPABILITY ANYWHERE -->
    <text 
      x="-2" 
      y="44" 
      text-anchor="middle" 
      fill="#94a3b8" 
      style="font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; font-weight: 600; font-size: 19.5px; letter-spacing: 0.38em; text-transform: uppercase;"
    >CAPABILITY ANYWHERE</text>
  </g>
</svg>`;

async function generate() {
  const rootDir = process.cwd();
  
  // Save SVG
  const svgPath = path.join(rootDir, 'digicap_console_logo.svg');
  fs.writeFileSync(svgPath, svgContent);
  console.log('Saved SVG:', svgPath);

  // Convert to PNG 512x512
  const pngPath = path.join(rootDir, 'digicap_console_logo.png');
  await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .png()
    .toFile(pngPath);
  console.log('Saved PNG:', pngPath);

  // Convert to JPG 512x512
  const jpgPath = path.join(rootDir, 'digicap_console_logo.jpg');
  await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .jpeg({ quality: 95 })
    .toFile(jpgPath);
  console.log('Saved JPG:', jpgPath);
}

generate().catch(console.error);
