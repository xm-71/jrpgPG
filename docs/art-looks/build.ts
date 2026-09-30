import { writeFileSync } from 'node:fs';
const which = process.argv.slice(2);
const out = new URL('./out', import.meta.url).pathname;
for (const name of which) {
  const [mod, fn] = name.split('.');
  const m = await import(`./styles/${mod}.ts`);
  writeFileSync(`${out}/${mod}-${fn}.svg`, m[fn]());
  console.log('wrote', `${mod}-${fn}.svg`);
}
