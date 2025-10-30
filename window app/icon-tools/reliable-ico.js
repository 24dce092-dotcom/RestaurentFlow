import fs from 'node:fs';
import path from 'node:path';
import toIco from 'to-ico';

async function main() {
  const [,, srcPng, outIco] = process.argv;
  if (!srcPng || !outIco) {
    console.error('Usage: node reliable-ico.js <src.png> <out.ico>');
    process.exit(1);
  }
  const absSrc = path.resolve(process.cwd(), srcPng);
  const absOut = path.resolve(process.cwd(), outIco);
  if (!fs.existsSync(absSrc)) {
    console.error(`Source PNG not found: ${absSrc}`);
    process.exit(2);
  }
  
  // Read PNG and convert to ICO with multiple sizes
  const pngBuffer = fs.readFileSync(absSrc);
  const icoBuffer = await toIco([pngBuffer], {
    sizes: [16, 32, 48, 256],
    resize: true
  });
  
  fs.mkdirSync(path.dirname(absOut), { recursive: true });
  fs.writeFileSync(absOut, icoBuffer);
  console.log(`Wrote reliable ICO: ${absOut}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(99);
});