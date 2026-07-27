import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,join,normalize} from 'node:path';
import {fileURLToPath} from 'node:url';
import {networkInterfaces} from 'node:os';

const root=fileURLToPath(new URL('.',import.meta.url)),port=8787;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.pdf':'application/pdf','.doc':'application/msword','.ics':'text/calendar; charset=utf-8'};
const keys=['vinculacion','objetivoConceptual','objetivoProcedimental','objetivoActitudinal','indicadorConceptual','indicadorProcedimental','indicadorActitudinal','criterioConceptual','criterioProcedimental','criterioActitudinal','inicio','pronunciacion','gramatica','reading','writing','listening','cierre','formaEvaluacion','estrategiaEvaluacion'];
let attendance={active:null,students:new Map(),records:new Map()};
let publishedGrades=new Map();

function promptFor(d){return `Actúa como Amina, asistente curricular experta. Elabora o mejora un plan de clase de inglés por competencias. Datos y borrador actual: ${JSON.stringify(d)}. Devuelve EXCLUSIVAMENTE un objeto JSON válido con estas claves exactas: ${keys.join(', ')}. Conserva los textos válidos del docente, mejora coherencia y alineación, usa verbos observables de Bloom, integra las habilidades comunicativas y no uses porcentajes.`}
async function body(req){let chunks=[],size=0;for await(const c of req){size+=c.length;if(size>1_000_000)throw new Error('Solicitud demasiado grande');chunks.push(c)}return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
function lanAddress(){let configured=String(process.env.AMINA_HOST||'').trim();if(/^\d{1,3}(\.\d{1,3}){3}$/.test(configured))return configured;try{let choices=[];for(const [name,list] of Object.entries(networkInterfaces()))for(const net of list||[])if(net.family==='IPv4'&&!net.internal){let privateIp=/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(net.address),physical=/wi-?fi|wireless|ethernet/i.test(name),virtual=/virtual|vethernet|vmware|vbox|docker|wsl|vpn/i.test(name);choices.push({address:net.address,score:(physical?4:0)+(privateIp?2:0)-(virtual?5:0)})}choices.sort((a,b)=>b.score-a.score);if(choices[0])return choices[0].address}catch{}return'localhost'}

async function generate(req,res){if(!process.env.OPENAI_API_KEY)return json(res,503,{error:'Falta OPENAI_API_KEY. Reinicie con INICIAR_PLANIFICADOR.bat y escriba una clave para usar Amina.'});try{let data=await body(req),api=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.6',input:promptFor(data),max_output_tokens:12000,store:false})}),out=await api.json();if(!api.ok)throw new Error(out?.error?.message||'Error de OpenAI');let text=out.output_text||out.output?.flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text||'';json(res,200,JSON.parse(text.replace(/^```json\s*|\s*```$/g,'').trim()))}catch(e){json(res,500,{error:e.message})}}

async function attendanceApi(req,res,path){try{
  if(path==='/api/network'&&req.method==='GET')return json(res,200,{baseUrl:`http://${lanAddress()}:${port}`});
  if(path==='/api/attendance/start'&&req.method==='POST'){let d=await body(req);attendance.active={sessionId:String(d.sessionId),date:String(d.date),expiresAt:Number(d.expiresAt)};attendance.students=new Map((d.students||[]).map(s=>[String(s.card),{id:String(s.id),card:String(s.card),name:String(s.name)}]));attendance.records=new Map();return json(res,200,{ok:true,students:attendance.students.size});}
  if(path==='/api/attendance/checkin'&&req.method==='POST'){let d=await body(req),now=Date.now();if(!attendance.active)return json(res,409,{error:'El docente todavía no ha iniciado la sesión.'});if(now>attendance.active.expiresAt)return json(res,410,{error:'La ventana de asistencia de 15 minutos ya cerró.'});let student=attendance.students.get(String(d.card||''));if(!student)return json(res,404,{error:'Este carnet no pertenece a la lista del curso.'});let record={studentId:student.id,card:student.card,name:student.name,sessionId:attendance.active.sessionId,at:new Date().toISOString(),method:'QR celular'};attendance.records.set(student.id,record);return json(res,200,{ok:true,record});}
  if(path==='/api/attendance/updates'&&req.method==='GET')return json(res,200,{active:attendance.active,records:[...attendance.records.values()]});
  return false;
}catch(e){return json(res,500,{error:e.message})}}

async function gradesApi(req,res,path){try{
  if(path==='/api/grades/publish'&&req.method==='POST'){let d=await body(req);for(const record of d.records||[])if(record.code)publishedGrades.set(String(record.code).toUpperCase(),record);return json(res,200,{ok:true,published:publishedGrades.size})}
  if(path==='/api/grades/lookup'&&req.method==='POST'){let d=await body(req),record=publishedGrades.get(String(d.code||'').trim().toUpperCase());if(!record)return json(res,404,{error:'Código no encontrado. Verifique e intente nuevamente.'});return json(res,200,{ok:true,record})}
  return false
}catch(e){return json(res,500,{error:e.message})}}
async function serve(req,res){let pathname=new URL(req.url,'http://localhost').pathname;if(pathname.startsWith('/api/attendance/')||pathname==='/api/network'){let handled=await attendanceApi(req,res,pathname);if(handled!==false)return}if(pathname.startsWith('/api/grades/')){let handled=await gradesApi(req,res,pathname);if(handled!==false)return}if(pathname==='/api/generate'&&req.method==='POST')return generate(req,res);let rel=pathname==='/'?'index.html':decodeURIComponent(pathname.slice(1)),safe=normalize(rel).replace(/^(\.\.[/\\])+/,'');let file=join(root,safe);if(!file.startsWith(root))return json(res,403,{error:'Ruta no permitida'});try{if((await stat(file)).isDirectory())file=join(file,'index.html');let bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file).toLowerCase()]||'application/octet-stream'});res.end(bytes)}catch{res.writeHead(404);res.end('No encontrado')}}

http.createServer(serve).listen(port,'0.0.0.0',()=>{console.log(`Planificador docente: http://localhost:${port}`);console.log(`Acceso para celulares: http://${lanAddress()}:${port}`);console.log('La computadora y los celulares deben usar la misma red Wi-Fi.')});
