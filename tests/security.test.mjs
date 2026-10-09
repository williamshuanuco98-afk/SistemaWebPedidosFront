import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const data=new Map();
globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
const events=[];
globalThis.window={dispatchEvent:e=>events.push(e.type),addEventListener:()=>{}};
const source=fs.readFileSync(new URL('../js/api.js',import.meta.url),'utf8');
const {api,BASE_URL}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('denied mutations never become local successes',async()=>{
  data.clear();data.set('inplabel_clientes',JSON.stringify([{id_cliente:7}]));
  globalThis.fetch=async()=>({ok:false,status:403,json:async()=>({message:'Sin permiso'})});
  await assert.rejects(api.deleteCliente(7),{name:'ApiError',status:403});
  await assert.rejects(api.addPedido({id_cliente:1}),{name:'ApiError',status:403});
  await assert.rejects(api.createLetrasBatch([]),{name:'ApiError',status:403});
  assert.equal(JSON.parse(data.get('inplabel_clientes')).length,1);
  assert.equal(data.has('inplabel_pedidos'),false);
  assert.equal(data.has('inplabel_letras'),false);
});
test('network failures do not enable offline login or persistence',async()=>{
  globalThis.fetch=async()=>{throw new Error('offline')};
  await assert.rejects(api.login('admin','admin123'),{name:'ApiError'});
  await assert.rejects(api.addPedido({id_cliente:1}),{name:'ApiError'});
});
test('requests use cookies and CSRF header without trusting local role',async()=>{
  data.set('inplabel_user',JSON.stringify({rol:'ADMIN',username:'forged'}));
  globalThis.fetch=async(url,opts)=>{
    assert.equal(url,'/api/pedidos');assert.equal(opts.credentials,'same-origin');
    assert.equal(opts.headers['X-Requested-With'],'XMLHttpRequest');
    assert.equal(opts.headers['X-User-Role'],undefined);
    assert.equal(opts.headers['X-Username'],undefined);
    return {ok:true,json:async()=>[]};
  };
  await api.getPedidos();assert.equal(BASE_URL,'/api');
});
test('expired session is reported and never replaced with cached data',async()=>{
  globalThis.fetch=async()=>({ok:false,status:401,json:async()=>({message:'Sesión expirada'})});
  await assert.rejects(api.getPedidos(),{status:401});assert.ok(events.includes('session-expired'));
});
test('local user does not authenticate the UI',async()=>{
  const source=fs.readFileSync(new URL('../js/modules/auth.module.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
  const auth=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  data.set('inplabel_user',JSON.stringify({username:'admin',rol:'ADMIN'}));
  assert.equal(auth.isAuthenticated(),false);assert.equal(auth.getCurrentUser(),null);
});

test('malformed save response cannot become a local success',async()=>{
  globalThis.fetch=async()=>({ok:true,json:async()=>{throw new SyntaxError('invalid JSON')}});
  await assert.rejects(api.addPedido({id_cliente:1}),{name:'ApiError'});
  await assert.rejects(api.addCliente({nombre_cliente:'Prueba'}),{name:'ApiError'});
});
