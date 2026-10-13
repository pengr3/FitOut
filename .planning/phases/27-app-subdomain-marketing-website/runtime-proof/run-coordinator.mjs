import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { executeCoordinator, RETRY_ID, protectedProject } from './coordinator.mjs';
import { prepareExport } from './prepare-export.mjs';
import { vercelTransport } from './driver.mjs';
import { PACKET_ID, SOURCE } from './probe.mjs';

const run = promisify(execFile);
const root = 'C:/Users/Admin/Roaming/FitOut';
const repository = 'C:/Users/Admin/.codex/worktrees/phase27-production-continuity/FitOut';
const cli = 'C:/Users/Admin/AppData/Roaming/npm/node_modules/vercel/dist/index.js';
const team = 'team_EZAfhT8qJ6msqrCzas3rvdjG';
const project = 'prj_my7iigeFoojFO2QmXYYfr49p8uiz';
const baseline = 'dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg';
const baselineHost = 'fitout-6dr93opgm-pengr3s-projects.vercel.app';
const generatedAlias = 'fitout-web-pengr3s-projects.vercel.app';
const dir = resolve(root, 'playwright/.cache/phase27-08/provider-runtime-coordinator-retry-20261013');
const owned = fileURLToPath(new URL('./', import.meta.url));
const read = async name => JSON.parse(await readFile(resolve(dir, name), 'utf8'));
const save = async (name, value) => writeFile(resolve(dir, name), JSON.stringify(value, null, 2));
const delay = () => new Promise(resolveDelay => setTimeout(resolveDelay, 20000));
const announce = value => console.log(JSON.stringify(value));
const providerKeys = ['PAYMONGO_SECRET_KEY','PAYMONGO_PUBLIC_KEY','PAYMONGO_WEBHOOK_SECRET','DIDIT_API_KEY','DIDIT_WORKFLOW_ID','DIDIT_ENVIRONMENT','DIDIT_WEBHOOK_SECRET'];
const metadata = envs => envs.filter(e => providerKeys.includes(e.key) && e.target.includes('production')).map(e => ({
  id: e.id, key: e.key, type: e.type, target: e.target, gitBranch: e.gitBranch ?? null, configurationId: e.configurationId ?? null, updatedAt: e.updatedAt,
}));
async function command(args, cwd = root, timeout = 30000) {
  try { return await run(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', timeout, maxBuffer: 8 * 1024 * 1024, windowsHide: true }); }
  catch { throw new Error('Authenticated CLI operation failed or outcome unknown; no automatic retry'); }
}
async function api(path) {
  const r = await command(['api', path + (path.includes('?') ? '&' : '?') + 'teamId=' + team, '--method','GET','--raw','--non-interactive']);
  return JSON.parse(r.stdout);
}
async function aliases() {
  const v = await api('/v4/aliases?projectId=' + project + '&limit=100');
  return v.aliases.map(a => ({ alias: a.alias, deploymentId: a.deploymentId }));
}
async function validatePlatform() {
  const pins = await Promise.all(['fitout.live','app.fitout.live','fitout-web-psi.vercel.app',generatedAlias,'ops.fitout.live'].map(async host => {
    const a = await api('/v4/aliases/' + host); return { host, deploymentId: a.deploymentId };
  }));
  if (pins.some(p => p.deploymentId !== (p.host === 'ops.fitout.live' ? 'dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4' : baseline))) throw new Error('Baseline alias drift');
  const flags = await Promise.all([[project,'dnMtMhC8l8iT0R29'],[project,'NftlOnb5TDKNewez'],['prj_cUmYg0pQne8gkYKrHd8KY2O4rAQj','rQL4dNKbzaXbN08K']].map(async ([p,id]) => {
    const e = await api(`/v1/projects/${p}/env/${id}`); return { id, value: e.value };
  }));
  if (flags.some(e => e.value !== 'false')) throw new Error('Contact flag drift');
  const envs = metadata((await api('/v9/projects/' + project + '/env?decrypt=false')).envs);
  const reference = metadata(JSON.parse(await readFile(root + '/playwright/.cache/phase27-08/inventory-reconcile-2026-10-13-78dca654/env-metadata.json','utf8'))[0]);
  if (JSON.stringify(envs) !== JSON.stringify(reference)) throw new Error('Provider metadata drift');
  const p = await api('/v9/projects/' + project);
  if (!protectedProject(p,project,team)) throw new Error('Protection or project scope drift');
  return { observedAt: new Date().toISOString(), pins, flags, providerMetadata: envs, protected: true };
}

async function main() {
  const approval = await read('approval.json'); // Absent/prepared authority must refuse before any CLI operation.
  let exported; let deployment; const journal = [];
  const ops = {
    diagnosticMarkerPath: resolve(dir, 'diagnostic-attempt.json'),
    beginAttempt: async () => {
      await writeFile(resolve(dir,'coordinator-attempt.json'),JSON.stringify({ attemptId: RETRY_ID, source: SOURCE, startedAt: new Date().toISOString(), maximumBuilds: 1 }),{flag:'wx'});
      for (const item of (await read('reviewed-artifacts.json')).artifacts) {
        if (!/^[a-z.-]+$/.test(item.path)) throw new Error('Unexpected reviewed path');
        const bytes = await readFile(resolve(owned,item.path));
        if (createHash('sha256').update(bytes).digest('hex') !== item.sha256) throw new Error('Reviewed coordinator artifact changed');
      }
    },
    preflight: async () => {
      const registered = await read('baseline-registrations.json');
      if (registered.originalReceiverVerified !== true || registered.financialFunctions !== 14 || registered.contactFunctions !== 1 ||
        Date.now() - Date.parse(registered.observedAt) > 600000) throw new Error('Fresh baseline registration readback required');
      await save('preflight-platform.json',await validatePlatform());
    },
    prepare: async ({config, approval: authority}) => {
      exported = await prepareExport({repository,workspace:root,name:'provider-proof-coordinator-retry-20261013',config,approval:authority});
      await mkdir(resolve(exported.destination,'.vercel'));
      await writeFile(resolve(exported.destination,'.vercel/project.json'),JSON.stringify({projectId:project,orgId:team,projectName:'fitout-web'}));
      await save('export-result.json',exported); await save('public-probe-config.json',config);
      return exported;
    },
    stageOnce: async e => {
      await writeFile(resolve(dir,'build-attempt.json'),JSON.stringify({attemptId:RETRY_ID,source:SOURCE,submittedAt:new Date().toISOString(),maximumBuilds:1}),{flag:'wx'});
      const r = await command(['deploy','--prod','--skip-domain','--no-wait','--yes','--non-interactive','--no-color','--scope','pengr3s-projects','--project',project,
        '--env','CONTACT_PRODUCTION_ENABLED=false','--env','CONTACT_INGRESS_VERIFICATION_MODE=false','--build-env','CONTACT_PRODUCTION_ENABLED=false','--build-env','CONTACT_INGRESS_VERIFICATION_MODE=false',
        '--meta','phase27ProofPacket=' + PACKET_ID,'--meta','phase27ProofAttempt=' + RETRY_ID,'--meta','phase27BaseRevision=' + SOURCE,'--json'],e.destination,120000);
      const v = JSON.parse(r.stdout).deployment;
      deployment = {id:v.id,host:v.url.replace(/^https:\/\//,''),observedAt:new Date().toISOString()}; await save('stage-created.json',deployment); announce({status:'staged',...deployment}); return deployment;
    },
    waitReady: async (d, {maximumMs,notAfter}) => {
      const start = Date.now(); let previous;
      while (Date.now() - start < maximumMs && Date.now() < notAfter - 300000) {
        const v = await api('/v13/deployments/' + d.id);
        if (v.readyState !== previous) { announce({status:'build-state',state:v.readyState}); previous=v.readyState; }
        if (['ERROR','CANCELED'].includes(v.readyState)) throw new Error('Remote staged build failed');
        if (v.readyState === 'READY') {
          if (v.projectId !== project || v.ownerId !== team || v.target !== 'production' || v.autoAssignCustomDomains !== false ||
            v.meta?.phase27ProofAttempt !== RETRY_ID || v.meta?.phase27BaseRevision !== SOURCE || v.url !== d.host) throw new Error('Actual staged deployment mismatch');
          await save('ready-deployment.json',{...d,projectId:v.projectId,teamId:v.ownerId,target:v.target,ready:true,protected:true});
          // This one generated alias reassignment is explicit in the retry packet.
          const maps = await aliases(); const generated = maps.find(x=>x.alias===generatedAlias);
          if (generated?.deploymentId === d.id) await command(['alias','set',baselineHost,generatedAlias,'--scope','pengr3s-projects','--non-interactive','--no-color'],exported.destination);
          else if (generated?.deploymentId !== baseline) throw new Error('Unexpected generated-alias mapping');
          await save('platform-after-staging.json',await validatePlatform());
          if ((await aliases()).some(x=>x.deploymentId===d.id)) throw new Error('Diagnostic deployment has an assigned alias');
          return await read('ready-deployment.json');
        }
        await delay();
      }
      throw new Error('Build or lease deadline reached');
    },
    waitReconciled: async (d,{notAfter}) => {
      announce({status:'awaiting-original-receiver-restoration',deploymentId:d.id});
      while (Date.now() < notAfter - 300000) {
        try {
          const r = await read('reconciled.json');
          if (r.deploymentId!==d.id || r.originalReceiverVerified!==true || r.financialFunctions!==14 || r.contactFunctions!==1 ||
            !Number.isFinite(Date.parse(r.observedAt)) || Date.parse(r.observedAt)<Date.parse((await read('stage-created.json')).observedAt)) throw new Error('Invalid registration handoff');
          await validatePlatform(); return {...d,aliasesAssigned:false,baselineAndRegistrationsVerified:true};
        } catch (error) { if (error.code!=='ENOENT') throw error; }
        await delay();
      }
      throw new Error('Restoration or lease deadline reached');
    },
    transport: async (url,headers) => {
      if (journal.length>=3) throw new Error('Diagnostic request cap reached');
      const row={ordinal:journal.length+1,startedAt:new Date().toISOString(),status:null}; journal.push(row); await save('request-journal.json',journal);
      const result=await vercelTransport({node:process.execPath,cli,cwd:exported.destination})(url,headers);
      row.status=result.status; row.completedAt=new Date().toISOString(); await save('request-journal.json',journal); return result;
    },
    saveProof: async result => { await save('runtime-proof.json',result); announce({status:'bounded-proof-complete',diagnosticGets:result.diagnosticGets}); },
    finish: async info => { await save('coordinator-finished.json',{...info,privateKeyPersisted:false,privateKeyReferenceDropped:true,finishedAt:new Date().toISOString(),finalBrowserRegistrationReadbackRequired:true}); },
  };
  await executeCoordinator({approval,ops});
}
await mkdir(dir,{recursive:true});
try { await main(); } catch (error) { announce({status:'closed-no-retry',message:String(error.message).slice(0,180)}); process.exitCode=1; }
