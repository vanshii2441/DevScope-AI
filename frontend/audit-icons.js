const l = require('lucide-react');
const available = new Set(Object.keys(l));
const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory() && f !== 'node_modules' && f !== '.next') {
      walk(full).forEach(function(x) { files.push(x); });
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

const files = walk('./src');
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('lucide-react')) continue;
  const re = /import\s*\{([^}]+)\}\s*from\s+['"]lucide-react['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const icons = m[1].split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    for (const icon of icons) {
      if (!available.has(icon)) {
        console.log(file.replace(process.cwd(), '.') + ' -> MISSING: ' + icon);
      }
    }
  }
}
console.log('DONE');
