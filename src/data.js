/* Shared, side-effect-free view data. Existing date/status rules stay in js/food.js. */
window.ChillData = (() => {
  // Canonical database keys map explicitly to the actual checked-in filenames.
  const files = {
    "breakfast-bowl": "breakfast-bowl.jpg",
    "cheddar": "cheddar.jpg",
    "chicken": "chicken.jpg",
    "container": "container.jpg",
    "cookies": "cookies.jpg",
    "creamy-pasta": "creamy-pasta.jpg",
    "eggs": "eggs.jpg",
    "milk": "milk.jpg",
    "omelette": "omelette.jpg",
    "pasta": "pasta.jpg",
    "soup": "soup.jpg",
    "spinach": "spinach.jpg",
    "stuffed-peppers": "stuffed-peppers.jpg",
    "tomatoes": "tomatoes.jpg",
    "yogurt": "yogurt.jpg"
};
  const aliases = {
    'peppers':'stuffed-peppers', 'rice-stuffed-peppers':'stuffed-peppers',
    'leftover-vegetable-soup':'soup', 'vegetable-soup':'soup',
    'baby-spinach':'spinach', 'greek-yogurt':'yogurt', 'greek-yoghurt':'yogurt',
    'chicken-breast':'chicken', 'leftover-pasta':'pasta', 'milk-3.6%':'milk',
    'unknown-container':'container', 'spinach-and-tomato-omelette':'omelette',
    'leftover-pasta-with-creamy-spinach':'creamy-pasta', 'honey-yogurt-breakfast-bowl':'breakfast-bowl'
  };
  function photoKey(value) {
    const name=String(value||'').split(/[?#]/)[0].split('/').pop().trim().toLowerCase().replace(/\.(?:jpe?g|png|webp)$/,'').replace(/\s+/g,'-');
    const key=aliases[name]||name;
    return Object.prototype.hasOwnProperty.call(files,key)?key:null;
  }
  let remotePhotos = {};
  let scans = EXAMPLE_SCANS;
  const localAsset = value => {const key=photoKey(value)||'container';return window.CHILLCHECK_IMAGES?.[key] || `assets/products/${files[key]}`;};
  const asset = value => remotePhotos[photoKey(value)] || localAsset(value);
  function photo(name, storedKey) {
    const rules = [[/soup/i,'soup'],[/stuffed.*(?:pepper|paprica)|(?:pepper|paprica).*rice/i,'stuffed-peppers'],
      [/\bchicken\b/i,'chicken'],[/\bpasta\b/i,'pasta'],[/spinach/i,'spinach'],[/milk/i,'milk'],
      [/yogh?urt/i,'yogurt'],[/tomato/i,'tomatoes'],[/\beggs?\b/i,'eggs'],[/cheddar/i,'cheddar'],[/cookie/i,'cookies']];
    const key = photoKey(storedKey) || rules.find(([test])=>test.test(name))?.[1] || 'container';
    return {src:asset(key), key, filename:files[key], placeholder:key==='container'};
  }
  const recipes = [
    {name:'Spinach and tomato omelette', photo:'omelette', minutes:10, servings:1, kcal:340,
     uses:['Eggs','Baby spinach','Tomatoes','Cheddar'], pantry:['Olive oil','Salt','Pepper'],
     steps:['Beat 3 eggs with a pinch of salt and pepper.','Wilt a handful of spinach in a pan with a little oil.','Add the eggs, sliced tomato and 20 g grated cheddar.','Cook until the eggs are set, fold and serve.']},
    {name:'Leftover pasta with creamy spinach',photo:'creamy-pasta',minutes:12,servings:2,kcal:520,
     uses:['Leftover pasta','Baby spinach','Milk 3.6%','Cheddar'],pantry:['Garlic','Butter'],
     steps:['Melt a knob of butter with a chopped garlic clove.','Add 100 ml milk and 40 g grated cheddar; stir.','Add the spinach and leftover pasta.','Heat thoroughly and season.']},
    {name:'Honey yogurt breakfast bowl',photo:'breakfast-bowl',minutes:5,servings:1,kcal:280,
     uses:['Greek yogurt'],pantry:['Honey','Oats','Fresh berries'],
     steps:['Spoon yogurt into a bowl.','Top with oats and berries.','Drizzle with honey.']}
  ];
  const extras = [
    {name:'Soup & a golden cheese toast',photo:'soup',minutes:10,servings:2,kcal:390,uses:['Leftover vegetable soup','Cheddar'],pantry:['Bread'],steps:['Check when the soup was cooked and that it was stored safely.','Heat the soup thoroughly until steaming throughout.','Toast bread with cheddar and serve alongside.']},
    {name:'Balkan peppers, yogurt on the side',photo:'stuffed-peppers',minutes:12,servings:2,kcal:420,uses:['Rice-stuffed peppers','Greek yogurt'],pantry:['Parsley'],steps:['Confirm when the rice-stuffed peppers were cooked and refrigerated.','Reheat only the portions you need until steaming throughout.','Serve with cold yogurt and parsley.']}
  ];
  recipes.push(...extras);
  const isUnrecognized = item => /unknown|unidentified|unrecognized|unrecognised/i.test(item.name||'') || (item.category==='unknown' && !!item.container);
  const isBalkan = item => /ice.?cream (?:tub|box|container)|biscuit tin|cookie tin|reused|repurposed/i.test((item.container||'')+' '+(item.note||''));
  return {photo,photoKey,recipes,asset,localAsset,isUnrecognized,isBalkan,
    fallbackImage(e,key) { const img=e.currentTarget;if(img.dataset.fallback)return;img.dataset.fallback='true';img.src=localAsset(key); },
    example(n=0) { return scans[n%scans.length].map(i=>{const date=i.printedIn==null?'':Dates.addDays(Dates.today(),i.printedIn);return {...i,...(date?{printedDate:date,dateText:date.split('-').reverse().join('.')}:{})};}); },
    demoItems() {
      const examples=this.example();
      if(!examples.some(isUnrecognized)) examples.push({...scans.flat().find(isUnrecognized)||{name:'Unknown container',qty:'1 box',container:'Blue opaque box, white lid',confidence:'low',note:'What is inside? Open the box and identify the contents before using it.'},kind:'other',category:'unknown',daysLeft:null,photoKey:'container'});
      return Food.merge([],examples).rows.map(i=>({...i,...(isUnrecognized(i)?{expires:null,dateSource:'unknown',category:'unknown'}:{}),demo:true}));
    },
    get scans(){return scans;},
    loadCatalog(data, urlFor) {
      remotePhotos=Object.fromEntries(data.photos.map(p=>{
        const key=photoKey(p.id)||photoKey(p.object_path);
        // Use the same exact filename for Storage and local assets.
        return key?[key,urlFor(files[key])]:null;
      }).filter(Boolean));
      if(data.scans.length) scans=data.scans.map(s=>s.items);
      if(data.recipes.length) recipes.splice(0,recipes.length,...data.recipes.map(r=>r.data),...extras.filter(e=>!data.recipes.some(r=>r.name===e.name)));
    }};
})();
