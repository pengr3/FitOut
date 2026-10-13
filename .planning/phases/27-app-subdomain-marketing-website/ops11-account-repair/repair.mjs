import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const root='C:/Users/Admin/Roaming/FitOut';
const sourceRoot='C:/Users/Admin/.codex/worktrees/phase27-production-continuity/FitOut/.p27/22dfd169577d';
const phase=root+'/.planning/phases/27-app-subdomain-marketing-website';
const cache=root+'/playwright/.cache/phase27-08/ops11-account-repair-6bb';
const source='6bb6e3f74e2acb4b3fe9ec7c8de4fecc7a5f05d3';
const target='987a6470-5c2a-4fab-8816-a1d4dd78209d',actor='kjn85RQWK4rF8uyOhxwV3s4iT4JxEjq8';
const sha=x=>createHash('sha256').update(x).digest('hex');
const policyHash='b0cf76d277e7a5b0b73d17aa76921fcf98ee929d9725ffdb745b13806914a697';
const schemaHash='dfc97131f3569978ce32b24462dafa709dd59b9e751d47f23aa4f4ec350064f7';
const allowedHosts=['ep-aged-bonus-b3n08ajs.c-4.ap-southeast-1.aws.neon.tech','ep-aged-bonus-b3n08ajs-pooler.c-4.ap-southeast-1.aws.neon.tech','ep-aged-bonus-b3n08ajs-cwg.c-4.ap-southeast-1.aws.neon.tech','ep-aged-bonus-b3n08ajs-cwg-pooler.c-4.ap-southeast-1.aws.neon.tech'];
let client,secret='',credentialsRead=false,attemptStarted=false;
const report={source,targetUserId:target,actorId:actor,actorAuthenticated:false,actorAttribution:'Owner instruction; existing CLI role authority uses asserted attribution',credentialsPersisted:false,contactTouched:false,financialJobsInvoked:0};
try{
 if(process.argv.length!==2)throw Error('No command-line credentials or alternative targets allowed');
 let authority;try{authority=JSON.parse(await fs.readFile(cache+'/authority.json','utf8'));}catch{throw Error('Exact account-repair approval missing; database credential input was not read');}
 if(authority.status!=='approved'||authority.source!==source||authority.targetUserId!==target||authority.actorId!==actor||authority.projectId!=='misty-bar-13534461'||authority.branchId!=='br-divine-lake-b3in9zag'||authority.maximumTransactions!==1||Date.now()>Date.parse(authority.approvedAt)+900000)throw Error('Exact account-repair authority mismatch or expired');
 if(sha(await fs.readFile(phase+'/27-OPS11-ACCOUNT-REPAIR-PACKET.md'))!==authority.packetSha256||sha(await fs.readFile(new URL(import.meta.url)))!==authority.driverSha256)throw Error('Approved artifact changed');
 if(sha(await fs.readFile(sourceRoot+'/src/lib/ops/grant.ts'))!==policyHash||sha(await fs.readFile(sourceRoot+'/src/lib/db/schema.ts'))!==schemaHash)throw Error('Tested role authority/schema changed');
 await fs.mkdir(cache,{recursive:true});await fs.writeFile(cache+'/attempt.json',JSON.stringify({source,target,actor,at:new Date().toISOString(),maximumTransactions:1}),{flag:'wx'});attemptStarted=true;
 process.stdin.setEncoding('utf8');for await(const chunk of process.stdin){secret+=chunk;if(secret.length>8192)throw Error('Credential input too large');}credentialsRead=true;
 let url;try{url=new URL(secret.trim());}catch{throw Error('Scoped database input invalid');}
 if(!['postgres:','postgresql:'].includes(url.protocol)||!allowedHosts.includes(url.hostname)||url.pathname!=='/neondb'||!url.password||url.searchParams.get('sslmode')!=='require')throw Error('Primary database scope/TLS mismatch');
 const require=createRequire(sourceRoot+'/package.json');const postgres=require('postgres'),{drizzle}=require('drizzle-orm/postgres-js'),{sql}=require('drizzle-orm');
 const {grantStaff}=await import(pathToFileURL(sourceRoot+'/src/lib/ops/grant.ts').href);
 client=postgres(secret.trim(),{max:1,connect_timeout:10,idle_timeout:5,prepare:false,onnotice:()=>{}});secret='';url=null;
 const db=drizzle(client);
 const snapshot=async tx=>(await tx.execute(sql`SELECT id,role,can_book,can_host,updated_at,
  (SELECT coalesce(jsonb_agg(id ORDER BY id),'[]'::jsonb) FROM booking WHERE booker_id=u.id) AS booking_ids,
  (SELECT coalesce(jsonb_agg(id ORDER BY id),'[]'::jsonb) FROM listing WHERE host_id=u.id) AS listing_ids,
  (SELECT coalesce(jsonb_agg(id ORDER BY id),'[]'::jsonb) FROM host_verification WHERE user_id=u.id) AS verification_ids,
  (SELECT coalesce(jsonb_agg(id ORDER BY id),'[]'::jsonb) FROM host_payout WHERE user_id=u.id) AS payout_ids,
  (SELECT coalesce(jsonb_agg(id ORDER BY id),'[]'::jsonb) FROM host_payout_destination WHERE user_id=u.id) AS destination_ids,
  (SELECT coalesce(jsonb_agg(id ORDER BY id),'[]'::jsonb) FROM host_payout_ledger WHERE host_id=u.id) AS ledger_ids
  FROM "user" u WHERE id=${target}`))[0];
 const ids=row=>Object.fromEntries(['booking_ids','listing_ids','verification_ids','payout_ids','destination_ids','ledger_ids'].map(k=>[k,row[k]]));
 const timestamp=x=>new Date(x).toISOString();
 const result=await db.transaction(async tx=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('fitout:staff-role-policy',0))`);
  await tx.execute(sql`SET LOCAL statement_timeout='15s'`);
  await tx.execute(sql`SELECT id FROM "user" WHERE id=${target} FOR UPDATE`);
  const before=await snapshot(tx);
  if(!before||before.id!==target||before.role!=='staff'||before.can_book!==true||before.can_host!==true||timestamp(before.updated_at)!=='2026-09-27T02:50:00.335Z'||before.booking_ids.length!==3||before.listing_ids.length!==0||before.verification_ids.length!==0||before.payout_ids.length!==1||before.destination_ids.length!==1||before.ledger_ids.length!==0)throw Error('Target role/capability/provenance or business-record precondition drift; transaction rolled back');
  const oldAudits=await tx.execute(sql`SELECT id FROM audit WHERE action='ops_grant_staff' AND actor_id=${actor} AND meta->>'targetUserId'=${target}`);
  const written=await grantStaff(tx,target,actor,{convertMarketplaceAccount:true});
  if(written.outcome!=='written'||written.userId!==target||written.previousRole!=='staff'||written.role!=='staff')throw Error('Existing authority did not perform the exact retained-staff conversion');
  const after=await snapshot(tx);
  if(after.role!=='staff'||after.can_book!==false||after.can_host!==false||JSON.stringify(ids(before))!==JSON.stringify(ids(after)))throw Error('Role/capability or record-retention postcondition failed; transaction rolled back');
  const audits=await tx.execute(sql`SELECT id,action,outcome,meta FROM audit WHERE action='ops_grant_staff' AND actor_id=${actor} AND meta->>'targetUserId'=${target}`);
  const fresh=audits.filter(a=>!oldAudits.some(old=>old.id===a.id));
  if(fresh.length!==1||fresh[0].outcome!=='ok'||fresh[0].meta.previousRole!=='staff'||fresh[0].meta.role!=='staff'||fresh[0].meta.convertedMarketplaceAccount!==true||fresh[0].meta.previousCanBook!==true||fresh[0].meta.previousCanHost!==true)throw Error('Exact atomic audit postcondition failed; transaction rolled back');
  return{before,after,newAudit:fresh[0],authorityResult:written};
 });
 Object.assign(report,{passed:true,committed:true,existingRoleAuthority:true,policySha256:policyHash,logicalTransactions:1,newAuditRows:1,...result});
}catch(error){report.passed=false;report.error=error.message?.startsWith('Exact ')||error.message?.startsWith('Target ')||error.message?.startsWith('Role/')||error.message?.startsWith('Tested ')?error.message:'Account repair stopped; preserve evidence and read back primary before any further attempt';process.exitCode=1;}
finally{secret='';if(client)await client.end({timeout:5});report.credentialsRead=credentialsRead;report.attemptStarted=attemptStarted;report.finishedAt=new Date().toISOString();if(attemptStarted)await fs.writeFile(cache+'/result.json',JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));}
