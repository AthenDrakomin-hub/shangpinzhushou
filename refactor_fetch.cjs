const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function findFiles(dir, filter) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(findFiles(filePath, filter));
    } else if (filter(filePath)) {
      results.push(filePath);
    }
  }
  return results;
}

const tsxFiles = findFiles(srcDir, (f) => f.endsWith('.tsx') || f.endsWith('.ts'));

tsxFiles.forEach(file => {
  if (file.includes('apiClient.ts')) return; // Skip apiClient itself
  
  let content = fs.readFileSync(file, 'utf-8');
  let originalContent = content;

  // Add import if not exists
  if (content.includes('fetch(') || content.includes('fetch(`/api')) {
    // Preserve the original quote mark using capture group
    content = content.replace(/fetch\s*\(\s*(['"`])\/api\//g, "fetchApi($1/api/");
    content = content.replace(/fetch\s*\(\s*url\s*/g, "fetchApi(url");
    content = content.replace(/fetch\s*\(\s*endpoint\s*/g, "fetchApi(endpoint");
    
    // Replace all occurrences of headers: { Authorization: ... }
    // We will carefully remove Authorization: Bearer stuff
    content = content.replace(/['"]?Authorization['"]?:\s*`Bearer \$\{.*?}`\s*,?/g, "");
    content = content.replace(/['"]?Authorization['"]?:\s*['"]Bearer \$\{.*?\}['"]\s*,?/g, "");
    content = content.replace(/['"]?Authorization['"]?:\s*`Bearer ` \+ .*?,?/g, "");
    
    // Remove ...getAuthHeaders()
    content = content.replace(/\.\.\.getAuthHeaders\(\),?/g, "");
    content = content.replace(/headers:\s*getAuthHeaders\(\),?/g, "");

    // Only add import if we actually replaced something or if fetchApi is used
    if (content.includes('fetchApi(') && !content.includes("import { fetchApi }")) {
      const depth = file.split('src/')[1].split('/').length - 1;
      const relativePath = depth === 0 ? './utils/apiClient' : '../'.repeat(depth) + 'utils/apiClient';
      
      const importStmt = `import { fetchApi } from '${relativePath}';\n`;
      content = importStmt + content;
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf-8');
      console.log(`Refactored: ${file}`);
    }
  }
});
