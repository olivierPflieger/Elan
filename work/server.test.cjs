const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createServer,strictSchema}=require('../server.cjs');
const {CodexBridge}=require('./codex-bridge.cjs');
const core=require('../elan/dist/app.js');
const source='Compétences requises : rédaction de contenus, analyse de données, gestion de projets, maîtrise de Figma et suivi des campagnes. Travail en équipe, sens de l’organisation, autonomie, rigueur et adaptabilité sont essentiels. Notre esprit collaboratif favorise les échanges.';
const mapSkills=values=>values.map(name=>({name,evidence:name}));
const sample=()=>({status:'ok',reason:'',title:'',company:'',hardSkills:mapSkills(['rédaction de contenus','analyse de données','gestion de projets','maîtrise de Figma','suivi des campagnes']),softSkills:mapSkills(['Travail en équipe','sens de l’organisation','autonomie','rigueur','adaptabilité']),culture:{style:'Collaboratif',tone:'Direct',certainty:'Explicite',evidence:'esprit collaboratif'},required:[],preferred:[]});
const cv='Chargée de communication depuis 2022. Rédaction de contenus pour les réseaux sociaux et suivi des campagnes avec Google Analytics. Coordination avec une équipe créative et gestion du calendrier éditorial.';
const optimized=()=>({status:'ok',reason:'',headline:'Chargée de communication digitale',optimizedCv:'**Chargée de communication digitale**\nRédaction de contenus.',changes:[{section:'Titre',original:'Chargée de communication',optimized:'**Chargée de communication digitale**',rationale:'Alignement avec l’offre.',keywords:['communication digitale']}],missingKeywords:[],warnings:[]});
async function setup(t,generate=async()=>({data:sample()})){
  const bridge={account:async()=>({connected:true,plan:'plus'}),login:async()=>({authUrl:'https://auth.openai.com/'}),generate};
  const server=createServer(bridge);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(()=>{server.closeAllConnections();server.close();});
  const base='http://127.0.0.1:'+server.address().port;
  const post=(route,body,headers={})=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json','X-Elan-Client':'local',...headers},body:JSON.stringify(body)});
  return {base,post};
}
test('local assets work; foreign origins, hostnames and missing client header are refused',async t=>{
  const {base,post}=await setup(t);
  assert.equal((await fetch(base+'/')).status,200);
  assert.equal((await fetch(base+'/api/account')).status,403);
  assert.equal((await post('/api/login',{}, {Origin:'https://example.com'})).status,403);
  const hostStatus=await new Promise((resolve,reject)=>require('node:http').get(base+'/',{headers:{Host:'example.com'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject));
  assert.equal(hostStatus,403);
  assert.equal((await fetch(base+'/.local/codex/auth.json')).status,403);
});
test('valid analysis passes through and fabricated quotes are retried only once',async t=>{
  let calls=0;const {post}=await setup(t,async()=>{calls++;const data=sample();if(calls===1)data.hardSkills[0].evidence='citation inventée';return {data};});
  const response=await post('/api/analyze',{source});assert.equal(response.status,200);const data=await response.json();assert.equal(data.hardSkills.length,5);assert.equal(data.softSkills.length,5);assert.equal(calls,2);
});
test('short offers are rejected before invoking Codex',async t=>{
  let called=false;const {post}=await setup(t,async()=>{called=true;});
  assert.equal((await post('/api/analyze',{source:'test'})).status,400);assert.equal(called,false);
});
test('CV optimization requires the offer analysis and returns grounded changes',async t=>{
  const {post}=await setup(t,async()=>({data:optimized()}));
  let response=await post('/api/optimize',{cv,offer:source,analysis:sample()});assert.equal(response.status,200);assert.equal((await response.json()).headline,'Chargée de communication digitale');
  response=await post('/api/optimize',{cv:'trop court',offer:source,analysis:sample()});assert.equal(response.status,400);
});
test('insufficient offers are not retried',async t=>{
  let calls=0;const {post}=await setup(t,async()=>{calls++;return {data:{status:'insufficient',reason:'Offre trop vague'}};});
  assert.equal((await post('/api/analyze',{source})).status,400);assert.equal(calls,1);
});
test('link reading requires evidence of an actual open of the requested URL',async t=>{
  const {post}=await setup(t,async()=>({data:{accessible:true,url:'https://example.com/job',text:source},items:[]}));
  const response=await post('/api/read-offer',{url:'https://example.com/job'});assert.equal(response.status,400);assert.match((await response.json()).error,/colle son texte/);
});
test('schemas close all object shapes',()=>{
  const s=strictSchema(core.schema);assert.equal(s.additionalProperties,false);assert.equal(s.properties.hardSkills.items.additionalProperties,false);assert.equal(s.properties.softSkills.items.additionalProperties,false);
  const o=strictSchema(core.optimizationSchema);assert.equal(o.additionalProperties,false);assert.equal(o.properties.changes.items.additionalProperties,false);
});
test('bridge collects final JSON and handles notifications before turn/start returns',async()=>{
  const bridge=new CodexBridge(process.cwd());bridge.account=async()=>({connected:true});
  bridge.call=async method=>{if(method==='thread/start')return {thread:{id:'t'}};
    if(method==='turn/start'){bridge.emit('notification',{method:'item/completed',params:{threadId:'t',item:{type:'agentMessage',text:'{"ok":true}'}}});bridge.emit('notification',{method:'turn/completed',params:{threadId:'t',turn:{status:'completed'}}});return {turn:{id:'u'}};}return {};};
  assert.deepEqual((await bridge.generate('instructions','source',{},new AbortController().signal)).data,{ok:true});
});
test('cancellation interrupts active turn and removes listeners',async()=>{
  const bridge=new CodexBridge(process.cwd());const controller=new AbortController();let interrupted=false;
  bridge.account=async()=>({connected:true});bridge.call=async method=>{if(method==='thread/start')return {thread:{id:'t'}};if(method==='turn/start'){setImmediate(()=>controller.abort());return {turn:{id:'u'}};}if(method==='turn/interrupt')interrupted=true;return {};};
  await assert.rejects(bridge.generate('instructions','source',{},controller.signal),/annulée/);assert.equal(interrupted,true);assert.equal(bridge.listenerCount('notification'),0);
});
