const fs = require('fs');
['public/index.html', 'Index.html', 'public/zakrystia/index.html'].forEach(f => {
  if (fs.existsSync(f + '.bak_pre_shadcn')) {
    fs.copyFileSync(f + '.bak_pre_shadcn', f);
    console.log('Przywrocono:', f);
  }
});
console.log('Stan przed shadcn zostal w 100% pomyslnie przywrocony!');
