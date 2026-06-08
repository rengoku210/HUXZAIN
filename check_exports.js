const fs = require('fs');
const path = require('path');

function searchPackages(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file === 'node_modules' || file === '.git') continue;
      searchPackages(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.json')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('createServerFileRoute') || content.includes('createAPIFileRoute')) {
          console.log(`Found reference in: ${fullPath}`);
        }
      } catch (e) {}
    }
  }
}

searchPackages('D:/huxzain-trusted-exchange-flow-main/node_modules/@tanstack');
console.log('Search finished!');
