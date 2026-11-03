'use strict';
class MemoryJournal {
 constructor(){this.items=new Map();this.hits=new Map();}
 async get(key){return this.items.has(key)?JSON.parse(this.items.get(key)):null;}
 async set(key,value,ttl,nx){if(nx&&this.items.has(key))return null;this.items.set(key,JSON.stringify(value));return 'OK';}
 async del(key){this.items.delete(key);}
 async count(key){const n=(this.hits.get(key)||0)+1;this.hits.set(key,n);return n;}
}
module.exports={MemoryJournal};
