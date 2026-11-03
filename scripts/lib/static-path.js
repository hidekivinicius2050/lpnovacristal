'use strict';
const path=require('node:path'),fs=require('node:fs');
function staticPath(root,url){
 let pathname;try{pathname=decodeURIComponent(new URL(url,'http://localhost').pathname);}catch{return null;}
 if(pathname.includes('\0')||pathname.includes('\\')||pathname.split('/').some(p=>p.startsWith('.'))||/^\/(?:api|scripts|docs|node_modules)(?:\/|$)/i.test(pathname))return null;
 const target=path.resolve(root,'.'+pathname);
 if(target!==root&&!target.startsWith(root+path.sep))return null;
 if(fs.existsSync(target)){const real=fs.realpathSync(target);if(real!==root&&!real.startsWith(root+path.sep))return null;}
 return target;
}
module.exports={staticPath};
