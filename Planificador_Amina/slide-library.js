(function(){
  const DB='amina-presentations',STORE='presentations',VERSION=1;
  function open(){return new Promise((resolve,reject)=>{let r=indexedDB.open(DB,VERSION);r.onupgradeneeded=()=>{let db=r.result;if(!db.objectStoreNames.contains(STORE)){let s=db.createObjectStore(STORE,{keyPath:'id'});s.createIndex('updatedAt','updatedAt')}};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
  async function run(mode,action){let db=await open();return new Promise((resolve,reject)=>{let tx=db.transaction(STORE,mode),store=tx.objectStore(STORE),req=action(store);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close()})}
  const id=()=>crypto.randomUUID?.()||'slides-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  window.SlideLibrary={
    id,
    save:record=>run('readwrite',s=>s.put(record)),
    get:key=>run('readonly',s=>s.get(key)),
    remove:key=>run('readwrite',s=>s.delete(key)),
    list:async()=>{let rows=await run('readonly',s=>s.getAll());return(rows||[]).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))},
    duplicate:async key=>{let r=await window.SlideLibrary.get(key);if(!r)throw Error('Presentación no encontrada');let now=new Date().toISOString(),copy={...r,id:id(),title:r.title+' · copia',createdAt:now,updatedAt:now};await window.SlideLibrary.save(copy);return copy}
  };
})();
