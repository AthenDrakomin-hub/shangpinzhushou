module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  let hasModifications = false;

  // Find all CallExpressions where the callee is "fetch"
  root.find(j.CallExpression, {
    callee: { type: 'Identifier', name: 'fetch' }
  }).forEach(path => {
    // We only want to replace fetch calls that are relative to our API, or just assume fetch -> fetchApi globally
    // We'll replace fetch with fetchApi
    path.node.callee.name = 'fetchApi';
    hasModifications = true;

    // Now look at the second argument (options object)
    if (path.node.arguments.length > 1 && path.node.arguments[1].type === 'ObjectExpression') {
      const options = path.node.arguments[1];
      
      // Find the 'headers' property
      const headersPropIndex = options.properties.findIndex(p => 
        p.key && p.key.name === 'headers' || p.key && p.key.value === 'headers'
      );

      if (headersPropIndex !== -1) {
        const headersProp = options.properties[headersPropIndex];
        if (headersProp.value.type === 'ObjectExpression') {
          // Remove Authorization property
          headersProp.value.properties = headersProp.value.properties.filter(p => {
            if (p.key && (p.key.name === 'Authorization' || p.key.value === 'Authorization')) {
              return false;
            }
            // Remove '...getAuthHeaders()' spread
            if (p.type === 'SpreadElement' && p.argument && p.argument.callee && p.argument.callee.name === 'getAuthHeaders') {
              return false;
            }
            return true;
          });

          // If headers object is empty after removal, we could remove it, but keeping {} is fine
        }
      }
    }
  });

  if (hasModifications) {
    // Add import statement for fetchApi at the top if not exists
    const importExists = root.find(j.ImportDeclaration, {
      source: { value: '../utils/apiClient' } // Simplistic check
    }).size() > 0 || root.source.includes('fetchApi');

    if (!root.source.includes('import { fetchApi }')) {
      const depth = fileInfo.path.split('src/')[1].split('/').length - 1;
      const relativePath = depth === 0 ? './utils/apiClient' : '../'.repeat(depth) + 'utils/apiClient';
      
      const importStatement = j.importDeclaration(
        [j.importSpecifier(j.identifier('fetchApi'))],
        j.literal(relativePath)
      );
      
      const body = root.get().value.program.body;
      const firstImport = body.findIndex(node => node.type === 'ImportDeclaration');
      if (firstImport !== -1) {
        body.splice(firstImport, 0, importStatement);
      } else {
        body.unshift(importStatement);
      }
    }
  }

  return hasModifications ? root.toSource() : null;
};
