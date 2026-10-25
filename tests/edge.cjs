// Node 24: tests the Edge Function handler with mocked Auth, DB quota and provider.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const {stripTypeScriptTypes}=require('node:module');
let handler,calls=[],scenario='ok';const env={SUPABASE_URL:'https://project.invalid',SUPABASE_ANON_KEY:'public-test',ANTHROPIC_API_KEY:'test-only',ANTHROPIC_MODEL:'test-model'};
const fetch=async(url,options)=>{calls.push(url);if(url.endsWith('/auth/v1/user'))return Response.json({id:'user'},{status:scenario==='unauthorized'?401:200});if(url.endsWith('/claim_ai_request'))return Response.json({}, {status:scenario==='quota'?400:200});if(scenario==='provider-error')return Response.json({}, {status:429});return Response.json({content:[{type:'text',text:scenario==='invalid-json'?'not JSON':'{"items":[]}'}]});};
vm.runInNewContext(stripTypeScriptTypes(fs.readFileSync('supabase/functions/chill-ai/index.ts','utf8')),{Deno:{env:{get:key=>env[key]},serve:fn=>handler=fn},fetch,Response,Request,AbortSignal,JSON});
async function request(body={prompt:'Scan food',image:null},auth='Bearer test-user'){calls=[];return handler(new Request('https://edge.invalid',{method:'POST',headers:auth?{Authorization:auth}:{},body:JSON.stringify(body)}));}
(async()=>{
 let res=await request(undefined,'');assert.equal(res.status,401);assert.equal(calls.length,0);
 scenario='unauthorized';res=await request();assert.equal(res.status,401);assert.equal(calls.length,1);
 scenario='ok';delete env.ANTHROPIC_API_KEY;res=await request();assert.equal(res.status,503);assert.equal(calls.length,1);env.ANTHROPIC_API_KEY='test-only';
 res=await request({prompt:'x',image:'not base64!'});assert.equal(res.status,400);assert.equal(calls.length,1);
 scenario='quota';res=await request();assert.equal(res.status,429);assert.equal(calls.length,2);
 scenario='provider-error';res=await request();assert.equal(res.status,502);
 scenario='invalid-json';res=await request();assert.equal(res.status,502);
 scenario='ok';res=await request();assert.equal(res.status,200);assert.deepEqual(await res.json(),{items:[]});assert.equal(calls.length,3);
 console.log('PASS: Edge Function authentication, missing secrets, payload validation, quota, provider errors and JSON parsing.');
})().catch(e=>{console.error(e);process.exit(1)});
