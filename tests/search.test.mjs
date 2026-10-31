import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename,'utf8'), { compilerOptions: { module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true } }).outputText,filename);
const { createClient } = require('@supabase/supabase-js');
const { parseDiscoveryFilters, discoveryFiltersSchema, discoveryUrl, escapeLike, emptyFilters } = require('../src/features/discovery/validation.ts');
const { listDiscovery, discoveryItem, visiblePhotos, summaryFields, detailFields } = require('../src/features/discovery/services.ts');
const { createPhotoAccess } = require('../src/features/discovery/photo-access.ts');
const ID='33333333-3333-4333-8333-333333333333';
const item={id:ID,type:'FOUND',title:'Wallet',category:'Accessories',location:'Library',event_date:'2026-10-31',status:'OPEN'};
const photo={id:'44444444-4444-4444-8444-444444444444',item_id:ID,image_slot:1,storage_path:'offline-owner/offline-item/offline-photo.png'};
function fixture(data=[],status=200) {
  const requests=[];
  const client=createClient('https://offline.example','sb_publishable_offline_fixture',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(input,init)=>{
    requests.push({url:new URL(typeof input==='string'?input:input.url??String(input)),method:init?.method??'GET'});
    return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
  }}});
  return {client,requests};
}
const filters=overrides=>({...emptyFilters,...overrides});

test('empty parameters provide a bounded public first-page default',()=>{
  assert.deepEqual(parseDiscoveryFilters({}),{ok:true,filters:emptyFilters});
});
test('URL parsing trims text and accepts the supported type/category/location fields',()=>{
  assert.deepEqual(parseDiscoveryFilters({q:' wallet ',type:'FOUND',category:'Accessories',location:' Library ',page:'2'}).filters,filters({q:'wallet',type:'FOUND',category:'Accessories',location:'Library',page:2}));
});
test('invalid, repeated, excessive and control-character parameters are rejected',()=>{
  for(const params of [{type:'ADMIN'},{type:['LOST','FOUND']},{q:['a','b']},{page:'0'},{page:'-1'},{page:'1e2'},{page:'1.5'},{page:'10001'},{page:''},{q:'x'.repeat(121)},{category:'x'.repeat(81)},{location:'x'.repeat(201)},{q:'x\u0000y'},{q:'x\ny'}]) assert.equal(parseDiscoveryFilters(params).ok,false,JSON.stringify(params));
});
test('PostgREST asterisk wildcard alias is rejected for literal text search',()=>{
  assert.equal(parseDiscoveryFilters({q:'*'}).ok,false);
  assert.equal(parseDiscoveryFilters({location:'Lib*'}).ok,false);
});
test('unknown parameters cannot introduce a status, owner or logic filter',()=>{
  assert.deepEqual(parseDiscoveryFilters({status:'CLOSED',reporter_id:'other',or:'anything'}).filters,emptyFilters);
});
test('page links preserve filters and safely encode query delimiters',()=>{
  const active=filters({q:'wallet & keys',type:'FOUND',category:'Bags, accessories',location:'A/B',page:7});
  const url=new URL(discoveryUrl(active,2),'https://offline.example');
  assert.equal(url.pathname,'/items');assert.equal(url.searchParams.get('q'),active.q);assert.equal(url.searchParams.get('page'),'2');assert.equal(url.searchParams.get('location'),'A/B');
  assert.equal(new URL(discoveryUrl(active),'https://offline.example').searchParams.has('page'),false);
  assert.equal(discoveryUrl(emptyFilters),'/items');
});
test('LIKE metacharacters are escaped as literal percent/underscore/backslash',()=>{
  assert.equal(escapeLike('10%_\\'), '10\\%\\_\\\\');
});
test('public listing requests only allowlisted fields and active statuses',async()=>{
  const {client,requests}=fixture([item]);const result=await listDiscovery(client,emptyFilters);const url=requests[0].url;
  assert.equal(url.pathname,'/rest/v1/items');assert.equal(url.searchParams.get('select'),summaryFields);assert.equal(url.searchParams.get('status'),'in.(OPEN,IN_PROGRESS)');assert.deepEqual(result.items,[item]);assert.equal(result.hasNext,false);
  assert.equal(requests[0].method,'GET');assert.doesNotMatch(summaryFields,/reporter_id|email|profiles|claims|storage_path|\*/);
});
test('keyword search uses a scalar case-insensitive title filter',async()=>{
  const {client,requests}=fixture();await listDiscovery(client,filters({q:'WaLLeT'}));assert.equal(requests[0].url.searchParams.get('title'),'ilike.%WaLLeT%');
});
test('LOST/FOUND filter is an equality condition',async()=>{
  for(const type of ['LOST','FOUND']){const {client,requests}=fixture();await listDiscovery(client,filters({type}));assert.equal(requests[0].url.searchParams.get('type'),'eq.'+type);}
});
test('category filter is exact and never interpolated into an OR expression',async()=>{
  const {client,requests}=fixture();await listDiscovery(client,filters({category:'Accessories, or(test)'}));assert.equal(requests[0].url.searchParams.get('category'),'eq.Accessories, or(test)');assert.equal(requests[0].url.searchParams.has('or'),false);
});
test('location search is a case-insensitive contains filter',async()=>{
  const {client,requests}=fixture();await listDiscovery(client,filters({location:'Library'}));assert.equal(requests[0].url.searchParams.get('location'),'ilike.%Library%');
});
test('all filters combine with the forced public status restriction',async()=>{
  const {client,requests}=fixture();await listDiscovery(client,filters({q:'wallet',type:'FOUND',category:'Accessories',location:'Library'}));
  const p=requests[0].url.searchParams;for(const key of ['title','type','category','location','status'])assert.ok(p.has(key));assert.equal(p.has('or'),false);
});
test('special search punctuation cannot add filter operators or widen wildcard matching',async()=>{
  const text='wallet),status.eq.CLOSED,or=(title.eq.x) %_\\"';const {client,requests}=fixture();await listDiscovery(client,filters({q:text,type:'FOUND'}));const p=requests[0].url.searchParams;
  assert.equal(p.get('title'),'ilike.%'+escapeLike(text)+'%');assert.equal(p.get('status'),'in.(OPEN,IN_PROGRESS)');assert.equal(p.get('type'),'eq.FOUND');assert.equal(p.has('or'),false);
});
test('pagination uses 12 rows plus one next-page sentinel and stable ordering',async()=>{
  const {client,requests}=fixture(Array.from({length:13},(_,n)=>({...item,id:String(n)})));const result=await listDiscovery(client,filters({page:2}));const p=requests[0].url.searchParams;
  assert.equal(p.get('offset'),'12');assert.equal(p.get('limit'),'13');assert.equal(p.get('order'),'created_at.desc,id.desc');assert.equal(result.items.length,12);assert.equal(result.hasNext,true);
});
test('empty results and exactly one full page do not invent a next page',async()=>{
  for(const rows of [[],Array(12).fill(item)]){const {client}=fixture(rows);const result=await listDiscovery(client,emptyFilters);assert.equal(result.items.length,rows.length);assert.equal(result.hasNext,false);}
});
test('service validates bounds before making a network request',async()=>{
  const {client,requests}=fixture();await assert.rejects(listDiscovery(client,filters({page:10001})));assert.equal(requests.length,0);
  assert.equal(discoveryFiltersSchema.safeParse(filters({type:'CLOSED'})).success,false);
});
test('listing errors do not expose database error details',async()=>{
  const {client}=fixture({message:'private backend diagnostic',code:'XX000'},500);await assert.rejects(listDiscovery(client,emptyFilters),error=>error.message==='Items could not be loaded. Please try again.');
});
test('malformed item IDs fail without querying',async()=>{
  const {client,requests}=fixture();for(const id of ['bad','../profiles','',ID+'?select=*'])assert.equal(await discoveryItem(client,id),null);assert.equal(requests.length,0);
});
test('missing or RLS-inaccessible detail is null rather than a fabricated result',async()=>{
  const {client}=fixture([]);assert.equal(await discoveryItem(client,ID),null);
});
test('detail uses its allowlist and current session visibility without joining private data',async()=>{
  const detail={...item,description:'Plain item description',created_at:'2026-10-31T00:00:00Z'};const {client,requests}=fixture([detail]);assert.deepEqual(await discoveryItem(client,ID),detail);const p=requests[0].url.searchParams;
  assert.equal(p.get('select'),detailFields);assert.equal(p.get('id'),'eq.'+ID);assert.doesNotMatch(detailFields,/reporter_id|email|profiles|claims|storage_path|\*/);
});
test('public detail excludes terminal owner reports as well as private columns',async()=>{
  const {client,requests}=fixture([]);await discoveryItem(client,ID);assert.equal(requests[0].url.searchParams.get('status'),'in.(OPEN,IN_PROGRESS)');
});
test('photo metadata requests are limited and scoped to the visible item',async()=>{
  const {client,requests}=fixture([photo]);assert.deepEqual(await visiblePhotos(client,ID),[photo]);const p=requests[0].url.searchParams;
  assert.equal(requests[0].url.pathname,'/rest/v1/item_images');assert.equal(p.get('item_id'),'eq.'+ID);assert.equal(p.get('limit'),'3');assert.equal(p.get('order'),'image_slot.asc');
});

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
function accessFixture(overrides={}){const events=[];const options={verify:async()=> 'verified-A',load:async()=>[photo],onPending:()=>events.push(['pending']),onAnonymous:()=>events.push(['anonymous']),onReady:(user,photos)=>events.push(['ready',user,photos]),onError:()=>events.push(['error']),...overrides};return {access:createPhotoAccess(options),events};}
test('anonymous photo access never queries metadata or downloads',async()=>{
  let loads=0;const {access,events}=accessFixture({verify:async()=>null,load:async()=>{loads++;return[photo];}});await access.check();assert.equal(loads,0);assert.deepEqual(events,[['pending'],['anonymous']]);
});
test('verified member photo access loads only after identity verification',async()=>{
  const {access,events}=accessFixture();await access.check();assert.deepEqual(events,[['pending'],['ready','verified-A',[photo]]]);
});
test('photo metadata permission failure fails closed without raw errors',async()=>{
  const {access,events}=accessFixture({load:async()=>{throw new Error('private provider detail');}});await access.check();assert.deepEqual(events,[['pending'],['error']]);
});
test('sign-out invalidates an in-flight photo response',async()=>{
  const response=deferred();const {access,events}=accessFixture({load:()=>response.promise});const pending=access.check();await Promise.resolve();access.signOut();response.resolve([photo]);await pending;assert.equal(events.some(e=>e[0]==='ready'),false);assert.equal(events.at(-1)[0],'anonymous');
});
test('suspension blocks late verification before metadata is requested',async()=>{
  const identity=deferred();let loads=0;const {access,events}=accessFixture({verify:()=>identity.promise,load:async()=>{loads++;return[photo];}});const pending=access.check();access.suspend();identity.resolve('verified-A');await pending;assert.equal(loads,0);assert.equal(events.some(e=>e[0]==='ready'),false);
});
test('a new identity check wins over an older pending request',async()=>{
  const identity=deferred();let calls=0;const {access,events}=accessFixture({verify:()=>++calls===1?identity.promise:Promise.resolve('verified-B')});const older=access.check();await access.check();identity.resolve('verified-A');await older;assert.deepEqual(events.filter(e=>e[0]==='ready').map(e=>e[1]),['verified-B']);
});
test('disposal suppresses late results and subsequent checks',async()=>{
  const response=deferred();const {access,events}=accessFixture({load:()=>response.promise});const pending=access.check();await Promise.resolve();access.dispose();response.resolve([photo]);await pending;const length=events.length;await access.check();assert.equal(events.length,length);assert.equal(events.some(e=>e[0]==='ready'),false);
});
test('a stale load error cannot replace a signed-out state',async()=>{
  const response=deferred();const {access,events}=accessFixture({load:()=>response.promise});const pending=access.check();await Promise.resolve();access.signOut();response.reject(new Error('late'));await pending;assert.equal(events.at(-1)[0],'anonymous');
});
