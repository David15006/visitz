const fs = require('fs');
const babel = require('@babel/core');

function compileHtml(inputFile) {
  let html = fs.readFileSync(inputFile, 'utf8');
  
  const babelScriptRegex = /<script type="text\/babel">([\s\S]*?)<\/script>/;
  const match = html.match(babelScriptRegex);
  if (!match) { console.log('No babel script in', inputFile); return; }
  
  const jsxCode = match[1];
  
  // Only transform JSX → JS, keep modern ES6+ as-is (modern browsers support it)
  const result = babel.transformSync(jsxCode, {
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    compact: true
  });
  
  let newHtml = html
    .replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"></script>\n', '')
    .replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"></script>', '')
    .replace(babelScriptRegex, `<script>\n${result.code}\n</script>`);
  
  fs.writeFileSync(inputFile, newHtml, 'utf8');
  
  const origSize = Buffer.byteLength(html, 'utf8');
  const newSize = Buffer.byteLength(newHtml, 'utf8');
  console.log(`${inputFile.split('/').pop()}: ${Math.round(origSize/1024)}KB -> ${Math.round(newSize/1024)}KB (saved ${Math.round((origSize-newSize)/1024)}KB inline, +800KB Babel removed from network)`);
}

compileHtml('/home/user/visitz/visitepro_DEMO_PC.html');
compileHtml('/home/user/visitz/visitepro_DEMO-3.html');
compileHtml('/home/user/visitz/visitepro2_dashboard-33.html');
