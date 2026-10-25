/* Shelf suggestions use the food contents, never the packaging's original label.
   Sources: safefood.net/food-safety/storing-food-safely/storing-food-fridge
   ask.fsis.usda.gov/article/Is-it-safe-to-store-eggs-in-the-door-of-a-refrigerator */
window.ChillStorage=(()=>{
 const tips={
  'Top shelf':'Ready-to-eat foods and covered cooked leftovers. Keep them separate from raw meat and fish.',
  'Middle shelf':'Milk, yogurt, cheese and eggs in their carton. An interior shelf avoids the temperature swings of the door.',
  'Bottom shelf':'Raw meat, poultry and fish in sealed, leakproof containers, below ready-to-eat food to catch drips.',
  'Crisper drawer':'Salad leaves and produce that need refrigeration. Keep them separate from raw meat; follow produce and drawer instructions.',
  'Door rack':'Condiments and drinks whose labels allow this storage. Keep milk and eggs on an interior shelf; the door warms when opened.'
 };
 function suggest(item){
  const name=(item.name||'').toLowerCase(),category=Food.categoryOf(item);
  if(ChillData.isUnrecognized(item))return {shelf:null,reason:'Identify what is inside first. Choose a shelf for the contents, not the label on the tub.'};
  if(/\b(ice cream|frozen)\b/.test(name))return {shelf:null,reason:'This belongs in the freezer if the label says to keep frozen, not on a fridge shelf.'};
  if(item.kind==='cooked'||category==='cooked'||/\b(leftover|cooked|ready.to.eat)\b/.test(name))return {shelf:'Top shelf',allowed:['Top shelf','Middle shelf'],reason:'Keep covered cooked food above raw meat and fish. A reused tub does not change where the food belongs.'};
  if(/\beggs?\b/.test(name))return {shelf:'Middle shelf',reason:'Keep eggs in their carton on an interior shelf, away from door temperature swings.'};
  if(/milk|yogh?urt|cheese|cheddar|cream/.test(name)||category==='dairy')return {shelf:'Middle shelf',reason:'An interior shelf gives chilled dairy a more consistent temperature than the door.'};
  if(category==='protein'||/\b(chicken|beef|pork|lamb|fish|salmon|turkey|mince|prawns?)\b/.test(name))return {shelf:'Bottom shelf',reason:'If raw, store in a sealed, leakproof container below ready-to-eat foods. If cooked, update the food kind first.'};
  if(category==='fruit'||category==='veg')return {shelf:'Crisper drawer',reason:'For produce that needs chilling, use the produce drawer and follow the storage instructions for that food.'};
  if(/\b(ketchup|mustard|condiment|soda|sparkling water)\b/.test(name))return {shelf:'Door rack',reason:'Use the door for suitable condiments and drinks, following the label after opening.'};
  return {shelf:null,reason:'Check the storage label and identify the food type before choosing a shelf.'};
 }
 return {tips,suggest,headings:{'Top shelf':'Leftovers','Middle shelf':'Dairy','Bottom shelf':'Raw','Crisper drawer':'Produce','Door rack':'Condiments'}};
})();
