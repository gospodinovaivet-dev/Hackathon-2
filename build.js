// Bundle the React app and local browser dependencies. No npm packages required.
// Run python3 scripts/setup.py first, then node build.js.
// --configured writes a gitignored local bundle containing public Supabase settings.
const fs = require('fs');
const path = require('path');
const root = __dirname;
const configured = process.argv.includes('--configured');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
try {
  let html = read(configured ? 'index.local.html' : 'index.html');
  html=html.replace('</head>','<script>window.CHILLCHECK_LOGO='+JSON.stringify('data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/brand/chillcheck-header.png')).toString('base64'))+'</script></head>');
  const assets={};
  for (const file of fs.readdirSync(path.join(root,'assets/products'))) {
    if (file.endsWith('.jpg')) assets[file.slice(0,-4)]='data:image/jpeg;base64,'+fs.readFileSync(path.join(root,'assets/products',file)).toString('base64');
  }
  html=html.replace('</head>','<script>window.CHILLCHECK_IMAGES='+JSON.stringify(assets)+'</script>\n</head>');
  html=html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g,(_,file)=>'<style>\n'+read(file.split('?')[0])+'\n</style>');
  html=html.replace(/<script src="((?:js|src|vendor)\/[^"]+)"><\/script>/g,(_,file)=> {
    file=file.split('?')[0];
    // Supabase's UMD runtime needs a script URL to resolve its public path.
    if (file === 'vendor/supabase.js') return '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/dist/umd/supabase.js"></script>';
    return '<script>\n'+read(file).replace(/<\/script/gi,'<\\/script')+'\n</script>';
  });
  fs.mkdirSync(path.join(root,'dist'),{recursive:true});
  const destination='dist/chillcheck'+(configured?'.local':'')+'.html';
  fs.writeFileSync(path.join(root,destination),html);
  console.log('Built '+destination+' ('+(Buffer.byteLength(html)/1024/1024).toFixed(1)+' MB)');
  if (!configured) console.log('Unconfigured preview. Use node build.js --configured for a local Supabase-connected bundle.');
} catch (error) {
  console.error('Build failed. Run python3 scripts/setup.py first. '+error.message);
  process.exitCode=1;
}
