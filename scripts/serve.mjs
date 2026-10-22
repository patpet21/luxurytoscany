import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import availability from '../netlify/functions/availability.mjs';
const root = path.resolve('dist');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml','.mp4':'video/mp4','.woff2':'font/woff2','.ttf':'font/ttf','.ico':'image/x-icon'};
http.createServer(async (req,res)=>{
  const url = new URL(req.url,'http://localhost');
  if (url.pathname === '/.netlify/functions/availability') {
    try {
      const response = await availability(new Request(url, {method:req.method}));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
    } catch {
      res.writeHead(503, {'Content-Type':'application/json','Cache-Control':'no-store'});
      res.end(JSON.stringify({state:'unavailable', intervals:[]}));
    }
    return;
  }
  let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) && file !== root) {res.writeHead(403);res.end();return;}
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file,'index.html');
  if (!fs.existsSync(file)) {const fallback=path.join(root,'404.html');res.writeHead(fs.existsSync(fallback)?404:503,{'Content-Type':'text/html; charset=utf-8'});res.end(fs.existsSync(fallback)?fs.readFileSync(fallback):'Preview is rebuilding. Please reload shortly.');return;}
  const stat = fs.statSync(file);
  const range = req.headers.range;
  if (range && path.extname(file)==='.mp4') {
    const [a,b] = range.replace('bytes=','').split('-');const start=Number(a);const end=b?Number(b):stat.size-1;
    if(start>=stat.size || end>=stat.size){res.writeHead(416);res.end();return;}
    res.writeHead(206,{'Content-Type':'video/mp4','Content-Range':`bytes ${start}-${end}/${stat.size}`,'Accept-Ranges':'bytes','Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res);return;
  }
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':stat.size});fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${process.env.PORT||4173}`));
