const fs = require('fs');
const path = require('path');

function replaceColorsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Replace white
  content = content.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,/g, 'rgba(var(--white-rgb),');
  
  // Replace black
  content = content.replace(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,/g, 'rgba(var(--black-rgb),');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
      replaceColorsInFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'src', 'app'));
walkDir(path.join(__dirname, 'src', 'components'));
console.log('Color replacement done.');
