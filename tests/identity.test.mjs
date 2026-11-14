import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { actorText, loadActorLabels } = require('../src/features/identity/actors.ts');
const first='10000000-0000-4000-8000-000000000001', second='10000000-0000-4000-8000-000000000002';
const row={scope_type:'claim',scope_id:first,reporter_id:first,reporter_display_name:'Same Name',respondent_id:second,respondent_display_name:'Same Name',claim_id:first};
test('duplicate names remain distinguishable and You belongs to verified viewer only',()=>{
  assert.notEqual(actorText(first,row,first),actorText(second,row,first));
  assert.match(actorText(first,row,first),/Same Name \(Bạn\).*TK#/);
  assert.doesNotMatch(actorText(second,row,first),/Bạn/);
  assert.notEqual(actorText(first),actorText(second));
});
test('empty display name retains stable participant identity',()=>{
  assert.match(actorText(first,{...row,reporter_display_name:'  '}),/Thành viên.*0001/);
  assert.doesNotMatch(actorText(second,{...row,respondent_display_name:null}),/Same Name/);
});
test('actor lookup batches, deduplicates, bounds scope IDs and sends no arbitrary account lookup',async()=>{
  let received;
  const client={rpc:async(name,args)=>{received={name,args};return {data:[row]};}};
  const result=await loadActorLabels(client,[first,first],Array.from({length:50},(_,i)=>String(i)));
  assert.equal(received.name,'actor_labels');
  assert.deepEqual(received.args.p_item_ids,[first]);
  assert.equal(received.args.p_claim_ids.length,40);
  assert.deepEqual([...result.keys()],['claim:'+first]);
});
test('empty scopes never call transport; unavailable projection leaves IDs usable',async()=>{
  const client={rpc:()=>{throw new Error('must not call');}};
  assert.equal((await loadActorLabels(client)).size,0);
  assert.equal((await loadActorLabels({rpc:async()=>({error:{code:'PGRST202'}})},[first])).size,0);
  assert.match(actorText(first,undefined,first),/Bạn.*TK#/);
});

require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
const { renderToStaticMarkup } = require('react-dom/server');
const { createElement } = require('react');
const { ClaimActors, ReportActors } = require('../src/features/identity/actor-summary.tsx');
const fixture = {id:first,claimant_id:second,status:'PENDING',owner_proof_submitted_at:null,ownership_verified_at:null,items:{reporter_id:first,type:'FOUND',status:'OPEN'},actors:{...row,reporter_display_name:'Reporter A',respondent_display_name:'Responder B'}};
const render = claim => renderToStaticMarkup(createElement(ClaimActors,{claim,viewerId:first}));
test('FOUND claimant is recipient; LOST responder is holder and next verification actor reverses',()=>{
  const found=render(fixture);
  assert.match(found,/Người yêu cầu nhận/);
  assert.match(found,/Giao đồ:<\/strong> Reporter A/);
  assert.match(found,/Nhận đồ:<\/strong> Responder B/);
  assert.match(found,/Chờ người đăng tin xét duyệt: Reporter A/);
  const lost={...fixture,status:'APPROVED',items:{...fixture.items,type:'LOST'}};
  const waitingProof=render(lost);
  assert.match(waitingProof,/Người phản hồi nhặt được/);
  assert.match(waitingProof,/Giao đồ:<\/strong> Responder B/);
  assert.match(waitingProof,/Nhận đồ:<\/strong> Reporter A/);
  assert.match(waitingProof,/Chờ người báo mất gửi bằng chứng: Reporter A/);
  lost.owner_proof_submitted_at='2026-11-09T00:00:00Z';
  assert.match(render(lost),/Chờ người giữ đồ xác minh bằng chứng: Responder B/);
});
test('pending never implies completion; rejected claims on resolved items do not claim handover',()=>{
  assert.match(render(fixture),/chưa hoàn tất bàn giao/);
  const rejected=render({...fixture,status:'REJECTED',items:{...fixture.items,status:'RESOLVED'}});
  assert.match(rejected,/không có bàn giao theo yêu cầu này/);
  assert.doesNotMatch(rejected,/Đã hoàn tất trao trả|Giao đồ:/);
  const complete=render({...fixture,status:'APPROVED',items:{...fixture.items,status:'RESOLVED'}});
  assert.match(complete,/Đã hoàn tất trao trả/);
  assert.doesNotMatch(complete,/dự kiến/);
});
test('unavailable labels do not falsely state no approved match; resolved LOST no longer says expected recipient',()=>{
  const unknown=renderToStaticMarkup(createElement(ReportActors,{item:{...fixture.items,id:first},viewerId:first}));
  assert.doesNotMatch(unknown,/Chưa duyệt/);
  const done=renderToStaticMarkup(createElement(ReportActors,{item:{...fixture.items,id:first,type:'LOST',status:'RESOLVED'},labels:row,viewerId:first}));
  assert.match(done,/đã nhận lại đồ/);
  assert.doesNotMatch(done,/dự kiến/);
});

const {coordinationProgress}=require('../src/features/identity/progress.ts');
test('handover progress names the actual waiting account after proposal, confirmation and paused issue',()=>{
  const claim={...fixture,status:'APPROVED',items:{...fixture.items,type:'LOST',status:'IN_PROGRESS'},ownership_verified_at:'now'};
  const handover={proposed_by:first,accepted_at:null,change_requested:false,reporter_confirmed_at:null,claimant_confirmed_at:null};
  assert.match(coordinationProgress(claim,handover,[],first),/Chờ chấp thuận lịch hẹn: Responder B/);
  assert.match(coordinationProgress(claim,{...handover,accepted_at:'now',reporter_confirmed_at:'now'},[],first),/Chờ xác nhận đã giao: Responder B/);
  assert.doesNotMatch(coordinationProgress(claim,{...handover,accepted_at:'now',reporter_confirmed_at:'now'},[],first),/Chờ xác nhận đã nhận/);
  const issue={status:'OPEN',reporter_resumed_at:'now',claimant_resumed_at:null};
  assert.match(coordinationProgress(claim,handover,[issue],first),/Tạm dừng do sự cố.*Responder B/);
  assert.match(coordinationProgress(claim,{...handover,change_requested:true},[],first),/gửi đề xuất mới/);
});

const {workflowStatusLabel}=require('../src/features/workflow/labels.ts');
test('completed accepted match has completion label while rejected competitors keep their own outcome',()=>{
  assert.equal(workflowStatusLabel({...fixture,status:'APPROVED',items:{...fixture.items,status:'RESOLVED'}}),'Đã hoàn tất trao trả');
  assert.equal(workflowStatusLabel({...fixture,status:'REJECTED',items:{...fixture.items,status:'RESOLVED'}}),'Đã từ chối');
});
