/* Shared, side-effect-free view data. Existing date/status rules stay in js/food.js. */
window.ChillData = (() => {
  const sources = {
    chicken:'chicken', pasta:'pasta', spinach:'spinach', milk:'milk', yogurt:'yogurt',
    tomatoes:'tomatoes', eggs:'eggs', cheddar:'cheddar', cookies:'cookies',
    soup:'soup', peppers:'stuffed-peppers', container:'container'
  };
  let remotePhotos = {};
  let scans = [];
  const asset = key => remotePhotos[key] || window.CHILLCHECK_IMAGES?.[key] || `assets/products/${key}.jpg`;
  function photo(name, photoKey) {
    const rules = [[/soup/i,'soup'],[/stuffed.*(?:pepper|paprica)|(?:pepper|paprica).*rice/i,'peppers'],
      [/\bchicken\b/i,'chicken'],[/\bpasta\b/i,'pasta'],[/spinach/i,'spinach'],[/milk/i,'milk'],
      [/yogh?urt/i,'yogurt'],[/tomato/i,'tomatoes'],[/\beggs?\b/i,'eggs'],[/cheddar/i,'cheddar'],[/cookie/i,'cookies']];
    const key = rules.find(([test])=>test.test(name))?.[1] || 'container';
    return {src:asset(photoKey || sources[key]), key:photoKey || sources[key], placeholder:key==='container'};
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
  return {photo,recipes,asset,get scans(){return scans;},
    loadCatalog(data, urlFor) {
      remotePhotos=Object.fromEntries(data.photos.map(p=>[p.id,urlFor(p.object_path)]));
      scans=data.scans.map(s=>s.items);
      recipes.splice(0,recipes.length,...data.recipes.map(r=>r.data));
    }};
})();
