import fs from 'fs';
const src = fs.readFileSync('c:\\Work\\git\\Mankoo\\seed\\seed.json', 'utf8');
const lines = src.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"media"') || lines[i].includes("'media'") || lines[i].includes('"slug": "media"')) {
    // Print context lines
    for (let j = Math.max(0,i-2); j < Math.min(lines.length, i+10); j++) {
      console.log((j+1) + ': ' + lines[j]);
    }
    console.log('---');
  }
}