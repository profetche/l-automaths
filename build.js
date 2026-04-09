#!/usr/bin/env node
/**
 * AutoMaths — Build Script
 * Compile app.js (JSX) → app-compiled.js (plain JS)
 * 
 * Usage:
 *   npm install @babel/core @babel/plugin-transform-react-jsx
 *   node build.js
 */

const fs   = require('fs');
const path = require('path');

let babel;
try {
  babel = require('@babel/core');
} catch(e) {
  console.error('\n❌ Babel non installé. Lance d\'abord :\n');
  console.error('   npm install @babel/core @babel/plugin-transform-react-jsx\n');
  process.exit(1);
}

console.log('🔧 Compilation AutoMaths...');

const src  = path.join(__dirname, 'app.js');
const dest = path.join(__dirname, 'app-compiled.js');

const code = fs.readFileSync(src, 'utf8');

const result = babel.transformSync(code, {
  plugins: [
    ['@babel/plugin-transform-react-jsx', {
      pragma: 'React.createElement',
      pragmaFrag: 'React.Fragment',
    }]
  ],
  filename: 'app.js',
  // Increase size limit
  compact: false,
  sourceType: 'script',
});

// Prepend: extract React hooks from global
const header = `/* AutoMaths — compiled ${new Date().toISOString()} */\n`;

fs.writeFileSync(dest, header + result.code, 'utf8');

const sizeKB = Math.round(fs.statSync(dest).size / 1024);
console.log(`✅ app-compiled.js créé (${sizeKB}KB)`);
console.log('\n🚀 Maintenant déploie avec : git add . && git commit -m "Build" && git push\n');
