const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
const context={window:{},EXAMPLE_SCANS:[]};vm.createContext(context);
vm.runInContext(fs.readFileSync('src/data.js','utf8'),context);
const data=context.window.ChillData;
const catalog=JSON.parse(fs.readFileSync('supabase/mock-catalog.json'));
for(const row of catalog.photos){
 assert(fs.existsSync(data.localAsset(row.id)));
 assert.equal(data.localAsset(row.id),data.localAsset(row.object_path));
 assert.equal(data.localAsset(row.id),'assets/products/'+row.object_path);
}
const examples={'Rice-stuffed peppers':'stuffed-peppers.jpg','Leftover vegetable soup':'soup.jpg','Baby spinach':'spinach.jpg','Greek yogurt':'yogurt.jpg','Milk 3.6%':'milk.jpg'};
for(const [name,filename] of Object.entries(examples)){
 assert.equal(data.photo(name).filename,filename);
 assert.equal(data.photo(name,name.toLowerCase().replaceAll(' ','-')+'.jpg').filename,filename);
}
assert.equal(data.localAsset('stuffed-peppers.jpg'),'assets/products/stuffed-peppers.jpg');
assert.equal(data.localAsset('unrecognized.jpg'),'assets/products/container.jpg');
data.loadCatalog({photos:[{id:'rice-stuffed-peppers.jpg',object_path:'rice-stuffed-peppers.jpg'}],scans:[],recipes:[]},p=>'https://storage.example/mock-photos/'+p);
assert.equal(data.photo('Rice-stuffed peppers').src,'https://storage.example/mock-photos/stuffed-peppers.jpg');
console.log('PASS: all 15 filenames, legacy aliases, JPG references and canonical Storage paths.');
