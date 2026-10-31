import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const source = readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
};
const { createReportSchema, editReportSchema, photoExtension, photoPath, MAX_PHOTO_BYTES, pageNumber } = require('../src/features/reports/validation.ts');
const { createReport, updateReport, ownReport, ownReports } = require('../src/features/reports/services.ts');
const { photoOperations } = require('../src/features/reports/storage.ts');
const { uploadPhoto, reconcileUpload, removePhoto } = require('../src/features/reports/photo-lifecycle.ts');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const ID = '33333333-3333-4333-8333-333333333333';
const FILE = '44444444-4444-4444-8444-444444444444';
const fields = { title: ' Black backpack ', description: '', category: 'Bags', location: 'Library', event_date: '2026-10-31' };
const photo = { id: FILE, item_id: ID, image_slot: 1, storage_path: photoPath(A, ID, FILE, 'jpg') };

function clientFixture({ data = { id: ID }, error = null, user = { id: A } } = {}) {
  const calls = [];
  const builder = {};
  for (const method of ['select','insert','update','delete','eq','order','range']) builder[method] = (...args) => { calls.push([method,...args]); return builder; };
  builder.single = builder.maybeSingle = async () => ({ data, error });
  builder.then = (resolve, reject) => Promise.resolve({ data,error }).then(resolve,reject);
  const client = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: table => { calls.push(['from',table]); return builder; },
    storage: { from: () => { throw new Error('Unexpected storage mutation'); } },
  };
  return { client, calls };
}

test('LOST/FOUND validation normalizes optional description without protected fields', () => {
  for (const type of ['LOST','FOUND']) assert.deepEqual(createReportSchema.parse({ type,...fields }), { type,...fields,title:'Black backpack',description:null });
});
test('blank, excessive and malformed fields fail validation', () => {
  for (const invalid of [{title:' '},{title:'x'.repeat(201)},{description:'x'.repeat(5001)},{category:''},{location:'x'.repeat(201)},{event_date:'2026-02-30'},{event_date:'2026-2-3'},{event_date:'0000-01-01'},{type:'OTHER'}]) {
    assert.equal(createReportSchema.safeParse({type:'LOST',...fields,...invalid}).success,false);
  }
  assert.equal(createReportSchema.safeParse({type:'LOST',...fields,event_date:'2028-02-29'}).success,true);
});
test('create/edit reject client-supplied protected fields', () => {
  for (const key of ['reporter_id','role','status','id','created_at','updated_at']) {
    assert.equal(createReportSchema.safeParse({type:'FOUND',...fields,[key]:A}).success,false,key);
    assert.equal(editReportSchema.safeParse({...fields,[key]:A}).success,false,key);
  }
  assert.equal(editReportSchema.safeParse({...fields,type:'FOUND'}).success,false);
});
test('create sends only allowed values and returns database-generated identity', async () => {
  const {client,calls}=clientFixture();
  assert.equal(await createReport(client,{type:'LOST',...fields}),ID);
  assert.deepEqual(calls.find(call=>call[0]==='insert')[1],{type:'LOST',...fields,title:'Black backpack',description:null});
});
test('unverified user cannot reach a report write', async () => {
  const {client,calls}=clientFixture({user:null});
  await assert.rejects(createReport(client,{type:'FOUND',...fields}),/session/);
  assert.deepEqual(calls,[]);
});
test('ambiguous creation response never automatically replays insert', async () => {
  const {client,calls}=clientFixture({data:null,error:{message:'provider detail'}});
  await assert.rejects(createReport(client,{type:'FOUND',...fields}),/Check My reports/);
  assert.equal(calls.filter(call=>call[0]==='insert').length,1);
});
test('owner queries explicitly filter reporter and item rather than relying on public RLS reads', async () => {
  const {client,calls}=clientFixture({data:null});
  assert.equal(await ownReport(client,A,ID),null);
  assert.ok(calls.some(call=>call[0]==='eq'&&call[1]==='reporter_id'&&call[2]===A));
  assert.ok(calls.some(call=>call[0]==='eq'&&call[1]==='id'&&call[2]===ID));
});
test('edit filters verified owner and handles zero affected rows as failure', async () => {
  const {client,calls}=clientFixture({data:null});
  await assert.rejects(updateReport(client,ID,fields),/not confirmed/);
  assert.ok(calls.some(call=>call[0]==='eq'&&call[1]==='reporter_id'&&call[2]===A));
  assert.deepEqual(Object.keys(calls.find(call=>call[0]==='update')[1]).sort(),Object.keys(fields).sort());
});
test('owner listing fetches a bounded next-page sentinel in newest-first order', async () => {
  const {client,calls}=clientFixture({data:Array.from({length:21},(_,i)=>({id:i}))});
  const result=await ownReports(client,A,2);
  assert.equal(result.reports.length,20);assert.equal(result.hasNext,true);
  assert.deepEqual(calls.find(call=>call[0]==='range'),['range',20,40]);
  assert.deepEqual(calls.filter(call=>call[0]==='order').map(call=>call[1]),['created_at','id']);
});
test('pagination input rejects malformed, excessive and repeated values', () => {
  for (const input of [undefined,'0','-1','1e3','9999999',['2','3']]) assert.equal(pageNumber(input),1);
  assert.equal(pageNumber('2'),2);
});
test('photo type, size and UUID path validation reject unsupported files and traversal', () => {
  for (const type of ['image/jpeg','image/png','image/webp']) assert.ok(photoExtension({type,size:MAX_PHOTO_BYTES}));
  for (const file of [{type:'image/svg+xml',size:2},{type:'image/jpeg',size:0},{type:'image/jpeg',size:MAX_PHOTO_BYTES+1}]) assert.throws(()=>photoExtension(file));
  assert.throws(()=>photoPath('../other',ID,FILE,'jpg'));
  assert.throws(()=>photoPath(A,ID,FILE,'html'));
});
test('storage mutations refuse a mismatched verified account', async () => {
  const {client}=clientFixture();
  await assert.rejects(photoOperations(client,ID,B),/unavailable/);
});
test('storage operation refuses paths outside its verified owner/item scope', async () => {
  const {client}=clientFixture();
  const operations=await photoOperations(client,ID,A);
  await assert.rejects(operations.upload(photoPath(B,ID,FILE,'jpg'),{}),/Invalid photo path/);
});

function photoFixture(overrides={}) {
  const calls=[];
  let stored=null;
  const ops={
    async upload(path) {calls.push(['upload',path]);},
    async find(path) {calls.push(['find',path]);return stored;},
    async register(path) {calls.push(['register',path]);stored=photo;return photo;},
    async removeMetadata(value) {calls.push(['metadata-delete',value.id]);stored=null;},
    async removeObject(path) {calls.push(['object-delete',path]);},
    ...overrides,
  };
  return {ops,calls,setStored(value){stored=value;}};
}
test('upload registers metadata only after a successful object upload',async()=>{
  const {ops,calls}=photoFixture();
  assert.equal((await uploadPhoto(ops,photo.storage_path,{})).ok,true);
  assert.deepEqual(calls.map(call=>call[0]),['upload','register']);
});
test('registration failure removes only the current unregistered upload',async()=>{
  const {ops,calls}=photoFixture({async register(){throw new Error('fourth slot rejected');}});
  const result=await uploadPhoto(ops,photo.storage_path,{});
  assert.equal(result.ok,false);assert.equal(result.pending,undefined);
  assert.deepEqual(calls.filter(call=>call[0]==='object-delete'),[['object-delete',photo.storage_path]]);
});
test('lost registration acknowledgement preserves the successfully registered object',async()=>{
  const fixture=photoFixture();
  fixture.ops.register=async()=>{fixture.setStored(photo);throw new Error('response lost');};
  const result=await uploadPhoto(fixture.ops,photo.storage_path,{});
  assert.equal(result.ok,true);assert.equal(result.photo.id,photo.id);
  assert.equal(fixture.calls.some(call=>call[0]==='object-delete'),false);
});
test('uncertain metadata outcome queues reconciliation and never blindly deletes',async()=>{
  const {ops,calls}=photoFixture({async register(){throw new Error();},async find(){throw new Error();}});
  const result=await uploadPhoto(ops,photo.storage_path,{});
  assert.equal(result.pending.kind,'upload-cleanup');
  assert.equal(calls.some(call=>call[0]==='object-delete'),false);
});
test('a failed upload never attempts metadata registration',async()=>{
  const {ops,calls}=photoFixture({async upload(){throw new Error();}});
  assert.equal((await uploadPhoto(ops,photo.storage_path,{})).ok,false);
  assert.equal(calls.some(call=>call[0]==='register'),false);
});
test('cleanup failure remains retryable without touching another object',async()=>{
  const {ops}=photoFixture({async removeObject(){throw new Error();}});
  const result=await reconcileUpload(ops,photo.storage_path);
  assert.deepEqual(result.pending,{path:photo.storage_path,kind:'upload-cleanup'});
});
test('photo removal confirms metadata absence before removing the exact object',async()=>{
  const fixture=photoFixture();fixture.setStored(photo);
  assert.equal((await removePhoto(fixture.ops,photo)).ok,true);
  assert.deepEqual(fixture.calls.map(call=>call[0]),['find','metadata-delete','find','object-delete']);
});
test('failed metadata deletion preserves the object and returns removal recovery',async()=>{
  const fixture=photoFixture({async removeMetadata(){throw new Error();}});fixture.setStored(photo);
  assert.equal((await removePhoto(fixture.ops,photo)).pending.kind,'removal');
  assert.equal(fixture.calls.some(call=>call[0]==='object-delete'),false);
});
test('a failed object deletion can resume after metadata has already been removed',async()=>{
  const fixture=photoFixture({async removeObject(){throw new Error();}});fixture.setStored(photo);
  const failed=await removePhoto(fixture.ops,photo);assert.equal(failed.pending.kind,'removal');
  fixture.ops.removeObject=async path=>fixture.calls.push(['retry-object-delete',path]);
  assert.equal((await removePhoto(fixture.ops,photo)).ok,true);
  assert.equal(fixture.calls.filter(call=>call[0]==='metadata-delete').length,1);
});
