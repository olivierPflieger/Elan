'use strict';
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const {EventEmitter} = require('node:events');

function executable() {
  if (process.env.ELAN_CODEX_BIN) return process.env.ELAN_CODEX_BIN;
  if (process.platform !== 'win32') return 'codex';
  const base = path.join(process.env.APPDATA || '', 'npm/node_modules/@openai/codex/node_modules/@openai');
  for (const arch of ['x64','arm64']) {
    const target = arch === 'x64' ? 'x86_64' : 'aarch64';
    const file = path.join(base, `codex-win32-${arch}/vendor/${target}-pc-windows-msvc/bin/codex.exe`);
    if (fs.existsSync(file)) return file;
  }
  throw new Error('Codex est introuvable. Installe Codex CLI ou configure ELAN_CODEX_BIN.');
}

class CodexBridge extends EventEmitter {
  constructor(root) { super(); this.root=root; this.pending=new Map(); this.sequence=0; }
  async start() {
    const home=path.join(this.root,'.local/codex');
    this.cwd=path.join(this.root,'.local/analysis');
    fs.mkdirSync(home,{recursive:true}); fs.mkdirSync(this.cwd,{recursive:true});
    // Dedicated configuration: no user's plugins, MCP servers or instructions.
    fs.writeFileSync(path.join(home,'config.toml'), 'forced_login_method = "chatgpt"\nweb_search = "disabled"\n[features]\nshell_tool = false\nunified_exec = false\napply_patch_freeform = false\nmulti_agent = false\ncode_mode = false\n');
    const env={...process.env,CODEX_HOME:home};
    delete env.OPENAI_API_KEY; delete env.CODEX_API_KEY;
    this.proc=spawn(executable(),['app-server','--stdio'],{cwd:this.cwd,env,windowsHide:true,stdio:['pipe','pipe','pipe']});
    this.proc.stderr.on('data',()=>{}); // Never forward credentials or raw diagnostic logs to the browser.
    this.proc.stdin.on('error',()=>{});
    readline.createInterface({input:this.proc.stdout}).on('line',line=>{
      let message; try { message=JSON.parse(line); } catch { return; }
      if (message.method && message.id !== undefined) {
        this.send({id:message.id,error:{code:-32601,message:'Interactive tools are not available in Elan.'}}); return;
      }
      if (message.id !== undefined) {
        const waiting=this.pending.get(message.id); if (!waiting) return;
        this.pending.delete(message.id); clearTimeout(waiting.timer);
        if (message.error) waiting.reject(new Error(message.error.message)); else waiting.resolve(message.result);
      } else this.emit('notification',message);
    });
    const stop=()=>{
      for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('Codex est arrêté. Relance Élan.')); }
      this.pending.clear(); this.emit('stopped');
    };
    this.proc.on('error',stop); this.proc.on('exit',stop);
    await this.call('initialize',{clientInfo:{name:'elan_local',title:'Élan local',version:'0.2.0'}});
    this.send({method:'initialized',params:{}});
  }
  send(message) { this.proc.stdin.write(JSON.stringify(message)+'\n'); }
  call(method,params={}) {
    return new Promise((resolve,reject)=>{
      const id=++this.sequence;
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Codex ne répond pas. Relance Élan.'));},30000);
      this.pending.set(id,{resolve,reject,timer}); this.send({id,method,params});
    });
  }
  async account() {
    const {account}=await this.call('account/read',{});
    return {connected:account?.type==='chatgpt',plan:account?.type==='chatgpt' ? account.planType : null};
  }
  async login() {
    if (this.loginResult) return this.loginResult;
    const result=await this.call('account/login/start',{type:'chatgpt'});
    const url=new URL(result.authUrl);
    if (url.protocol!=='https:' || !['auth.openai.com','chatgpt.com','auth.chatgpt.com'].includes(url.hostname)) throw new Error('Adresse de connexion inattendue.');
    this.loginResult={authUrl:result.authUrl};
    const listener=m=>{if(m.method==='account/login/completed'){this.loginResult=null;this.off('notification',listener);}};
    this.on('notification',listener);
    return this.loginResult;
  }
  async generate(instructions,text,schema,signal,{web=false}={}) {
    if (!(await this.account()).connected) throw new Error('Connecte ton compte ChatGPT dans les paramètres.');
    if(signal?.aborted) throw new Error('Analyse annulée.');
    const {thread}=await this.call('thread/start',{
      cwd:this.cwd,ephemeral:true,sandbox:'read-only',approvalPolicy:'never',
      baseInstructions:instructions,config:{web_search:web?'live':'disabled'}
    });
    return new Promise((resolve,reject)=>{
      let turnId, finished=false, lastText=''; const items=[];
      const cleanup=()=>{clearTimeout(timer);this.off('notification',onMessage);this.off('stopped',onStop);signal?.removeEventListener('abort',abort);};
      const finish=(error,result)=>{if(finished)return;finished=true;cleanup();error?reject(error):resolve(result);};
      const interrupt=()=>{if(turnId)this.call('turn/interrupt',{threadId:thread.id,turnId}).catch(()=>{});};
      const abort=()=>{interrupt();finish(new Error('Analyse annulée.'));};
      const onStop=()=>finish(new Error('Codex est arrêté. Relance Élan.'));
      const timer=setTimeout(()=>{interrupt();finish(new Error('L’analyse prend trop de temps. Réessaie avec le texte de l’offre.'));},300000);
      const onMessage=m=>{
        const p=m.params;if(p?.threadId!==thread.id)return;
        if(m.method==='item/completed') {items.push(p.item);if(p.item.type==='agentMessage')lastText=p.item.text;}
        if(m.method==='turn/completed') {
          if(p.turn.status!=='completed') return finish(new Error(p.turn.error?.message || 'L’analyse a été interrompue.'));
          try {finish(null,{data:JSON.parse(lastText),items});}catch {finish(new Error('La réponse de Codex est invalide. Réessaie.'));}
        }
      };
      this.on('notification',onMessage);this.on('stopped',onStop);signal?.addEventListener('abort',abort,{once:true});
      if(signal?.aborted){abort();return;}
      this.call('turn/start',{threadId:thread.id,input:[{type:'text',text,text_elements:[]}],outputSchema:schema}).then(r=>{
        turnId=r.turn.id;if(finished)interrupt();
      }).catch(error=>finish(error));
    });
  }
  close(){this.proc?.kill();}
}
module.exports={CodexBridge};
