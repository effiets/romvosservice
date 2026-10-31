import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Resolve paths relative to the project, independent of the shell's directory.
const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'yes');

await mkdir(output, { recursive: true });
await cp(join(root, 'index.html'), join(output, 'index.html'));
await cp(join(root, 'assets'), join(output, 'assets'), { recursive: true });

console.log('Build complete: index.html and assets/ copied to yes/.');
