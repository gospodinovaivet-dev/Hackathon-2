// Node 24: tests the Edge Function handler with mocked Auth, DB quota and provider.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const {stripTypeScriptTypes}=require('node:module');
let handler,calls=[],scenario='ok';const env={SUPABASE_URL:'https://project.invalid',SUPABASE_ANON_KEY:'public-test',ANTHROPIC_API_KEY:'test-only',ANTHROPIC_MODEL:'test-model'};
let sent=[];
const fetch=async(url,options)=>{calls.push(url);if(url.endsWith('/auth/v1/user'))return Response.json({id:'user'},{status:scenario==='unauthorized'?401:200});if(url.endsWith('/claim_ai_request'))return Response.json({}, {status:scenario==='quota'?400:200});sent.push({url,headers:options.headers,body:JSON.parse(options.body)});if(scenario==='provider-error')return Response.json({}, {status:429});const text=scenario==='invalid-json'?'not JSON':'{"items":[]}';
 if(url.includes('generativelanguage.googleapis.com'))return Response.json(scenario==='blocked'?{promptFeedback:{blockReason:'SAFETY'}}:{candidates:[{content:{parts:[{text:'reasoning',thought:true},{text}]},finishReason:'STOP'}]});
 if(scenario==='refusal')return Response.json({stop_reason:'refusal',content:[]});if(scenario==='cut-off')return Response.json({stop_reason:'max_tokens',content:[{type:'text',text:'{"items":['}]});if(scenario==='chat')return Response.json({stop_reason:'end_turn',content:[{type:'text',text:'```json\n{"reply":"Step two: simmer for five minutes.","recipes":[]}\n```'}]});
 return Response.json({content:[{type:'text',text}]});};
vm.runInNewContext(stripTypeScriptTypes(fs.readFileSync('supabase/functions/chill-ai/index.ts','utf8')),{Deno:{env:{get:key=>env[key]},serve:fn=>handler=fn},fetch,Response,Request,AbortSignal,JSON});
async function request(body={prompt:'Scan food',image:null},auth='Bearer test-user'){calls=[];sent=[];return handler(new Request('https://edge.invalid',{method:'POST',headers:auth?{Authorization:auth}:{},body:JSON.stringify(body)}));}
(async()=>{
 let res=await request(undefined,'');assert.equal(res.status,401);assert.equal(calls.length,0);
 scenario='unauthorized';res=await request();assert.equal(res.status,401);assert.equal(calls.length,1);
 scenario='ok';delete env.ANTHROPIC_API_KEY;res=await request();assert.equal(res.status,503);assert.equal(calls.length,1);env.ANTHROPIC_API_KEY='test-only';
 res=await request({prompt:'x',image:'not base64!'});assert.equal(res.status,400);assert.equal(calls.length,1);
 scenario='quota';res=await request();assert.equal(res.status,429);assert.equal(calls.length,2);
 scenario='provider-error';res=await request();assert.equal(res.status,502);
 scenario='invalid-json';res=await request();assert.equal(res.status,502);
 scenario='ok';res=await request();assert.equal(res.status,200);assert.deepEqual(await res.json(),{items:[]});assert.equal(calls.length,3);assert.match(sent[0].url,/api\.anthropic\.com/);assert.deepEqual(sent[0].body.output_config,{effort:'low'});assert.equal(sent[0].body.max_tokens,6000);
 assert.equal(sent[0].body.model,'test-model');assert.equal(sent[0].body.messages[0].content.at(-1).text,'Scan food');
 scenario='refusal';res=await request();assert.equal(res.status,422);assert.match((await res.json()).error,/declined/);
 scenario='cut-off';res=await request();assert.equal(res.status,502);assert.match((await res.json()).error,/cut off/);
 scenario='chat';res=await request({prompt:'Explain step two',image:null});assert.equal(res.status,200);assert.deepEqual(await res.json(),{reply:'Step two: simmer for five minutes.',recipes:[]});
 // Gemini provider: same auth, quota and validation path; only the upstream call differs.
 env.AI_PROVIDER='unknown';res=await request();assert.equal(res.status,503);assert.equal(calls.length,1);
 env.AI_PROVIDER='Gemini';res=await request();assert.equal(res.status,503);assert.match((await res.json()).error,/GEMINI_API_KEY/);assert.equal(calls.length,1);
 Object.assign(env,{GEMINI_API_KEY:'gemini-test-only',GEMINI_MODEL:'gemini-test-model'});
 scenario='unauthorized';res=await request();assert.equal(res.status,401);assert.equal(sent.length,0);
 scenario='quota';res=await request();assert.equal(res.status,429);assert.equal(sent.length,0);
 scenario='ok';res=await request({prompt:'Scan food',image:'aGVsbG8='});assert.equal(res.status,200);assert.deepEqual(await res.json(),{items:[]});
 assert.equal(sent.length,1);assert.equal(sent[0].url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-test-model:generateContent');
 assert.equal(sent[0].headers['x-goog-api-key'],'gemini-test-only');assert.equal(sent[0].headers['x-api-key'],undefined);
 assert.deepEqual(sent[0].body.contents[0].parts,[{inline_data:{mime_type:'image/jpeg',data:'aGVsbG8='}},{text:'Scan food'}]);
 assert.equal(sent[0].body.generation_config.response_mime_type,'application/json');assert.match(sent[0].body.system_instruction.parts[0].text,/untrusted data/);
 scenario='blocked';res=await request();assert.equal(res.status,502);
 scenario='provider-error';res=await request();assert.equal(res.status,502);assert.match((await res.json()).error,/busy/);
 scenario='invalid-json';res=await request();assert.equal(res.status,502);
 // Split routing: photo requests use AI_PROVIDER_SCAN, text-only requests AI_PROVIDER_CHAT; both fall back to AI_PROVIDER.
 delete env.AI_PROVIDER;Object.assign(env,{AI_PROVIDER_SCAN:'anthropic',AI_PROVIDER_CHAT:'gemini'});scenario='ok';
 res=await request({prompt:'Scan food',image:'aGVsbG8='});assert.equal(res.status,200);assert.match(sent[0].url,/api\.anthropic\.com/);assert.equal(sent[0].body.messages[0].content[0].type,'image');
 res=await request({prompt:'Recipe idea'});assert.equal(res.status,200);assert.match(sent[0].url,/generativelanguage\.googleapis\.com/);
 delete env.ANTHROPIC_API_KEY;res=await request({prompt:'Scan food',image:'aGVsbG8='});assert.equal(res.status,503);assert.match((await res.json()).error,/ANTHROPIC_API_KEY/);assert.equal(calls.length,1);
 res=await request({prompt:'Recipe idea'});assert.equal(res.status,200);assert.match(sent[0].url,/generativelanguage/);env.ANTHROPIC_API_KEY='test-only';
 delete env.AI_PROVIDER_SCAN;env.AI_PROVIDER='gemini';res=await request({prompt:'Scan food',image:'aGVsbG8='});assert.equal(res.status,200);assert.match(sent[0].url,/generativelanguage/);
 env.AI_PROVIDER_CHAT='nope';res=await request({prompt:'Recipe idea'});assert.equal(res.status,503);assert.match((await res.json()).error,/AI_PROVIDER_CHAT/);assert.equal(calls.length,1);
 delete env.AI_PROVIDER_CHAT;
 delete env.AI_PROVIDER;scenario='ok';res=await request();assert.equal(res.status,200);assert.match(sent[0].url,/api\.anthropic\.com/);
 console.log('PASS: Edge Function authentication, missing secrets, payload validation, quota, provider errors, refusals, cut-off answers, conversation replies and JSON parsing for Anthropic, Gemini and photo/text provider routing.');
})().catch(e=>{console.error(e);process.exit(1)});
