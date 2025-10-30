
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

async function multiSizePngs(srcPng, outDir) {
  const sizes = [16, 32, 48, 256];
  const outPngs = [];
  for (const size of sizes) {
    const outPng = path.join(outDir, `icon_${size}.png`);
    await sharp(srcPng).resize(size, size).toFile(outPng);
    outPngs.push(outPng);
  }
  return outPngs;
}

async function main() {
  const [,, srcPng, outIco] = process.argv;
  if (!srcPng || !outIco) {
    console.error('Usage: node png-to-ico.js <src.png> <out.ico>');
    process.exit(1);
  }
  const absSrc = path.resolve(process.cwd(), srcPng);
  const absOut = path.resolve(process.cwd(), outIco);
  const tmpDir = path.join(process.cwd(), 'tmp_icons');
  fs.mkdirSync(tmpDir, { recursive: true });
  if (!fs.existsSync(absSrc)) {
    console.error(`Source PNG not found: ${absSrc}`);
    process.exit(2);
  }
  const pngs = await multiSizePngs(absSrc, tmpDir);
  const buf = await pngToIco(pngs);
  fs.writeFileSync(absOut, buf);
  console.log(`Wrote ICO: ${absOut}`);
  // Clean up temp PNGs
  for (const p of pngs) fs.unlinkSync(p);
  fs.rmdirSync(tmpDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(99);
});
