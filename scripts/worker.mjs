const base=process.env.APP_URL||process.env.NEXT_PUBLIC_APP_URL||'http://127.0.0.1:3000';
const secret=process.env.WORKER_SECRET;
if(!secret) throw new Error('WORKER_SECRET is required');
const r=await fetch(`${base.replace(/\/$/,'')}/api/internal/worker`,{method:'POST',headers:{'x-plane-worker-secret':secret}});
const body=await r.text();if(!r.ok){console.error(body);process.exit(1);}console.log(body);
