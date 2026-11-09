import json,subprocess,sys
S=sys.argv[1]
z='0x'+'0'*40
rows=[]
for line in open(S+'/pools.jsonl'):
    line=line.strip()
    if not line: continue
    for l in json.loads(line).get('result',[]):
        d=l['data'][2:];w=[d[i:i+64] for i in range(0,len(d),64)]
        rows.append(dict(block=int(l['blockNumber'],16),id=l['topics'][1],c1='0x'+l['topics'][3][-40:],c0='0x'+l['topics'][2][-40:],fee=int(w[0],16),ts=int(w[1],16),hook='0x'+w[2][-40:]))
nh=[r for r in rows if r['hook']==z and r['c0']==z]
SV='0xf3334192d15450cdd385c8b70e03f9a6bd9e673b'
R='https://rpc.testnet.chain.robinhood.com'
res=[]
import time
nh=nh[-200:]
for i in range(0,len(nh),10):
    time.sleep(1.2)
    chunk=nh[i:i+10]
    batch=[{"jsonrpc":"2.0","id":j,"method":"eth_call","params":[{"to":SV,"data":"0xfa6793d5"+p['id'][2:]},"latest"]} for j,p in enumerate(chunk)]
    out=subprocess.run(["curl","-s","-m","60","-X","POST","-H","content-type: application/json","--data",json.dumps(batch),R],capture_output=True,text=True).stdout
    try: arr=json.loads(out)
    except Exception: print("bad batch",i,out[:200]); continue
    if isinstance(arr,dict): print("batch err",i,str(arr)[:200]); continue
    for a in arr:
        p=chunk[a['id']]
        if 'result' in a and a['result'] not in('0x',None): p['liq']=int(a['result'],16)
        else: p['liq']=None
        res.append(p)
live=[p for p in res if p['liq']]
print('checked',len(res),'with liquidity>0:',len(live))
live.sort(key=lambda p:-p['liq'])
json.dump(live,open(S+'/live.json','w'))
for p in live[:15]: print(p['liq'],p['c1'],'fee',p['fee'],'ts',p['ts'] if p['ts']<2**23 else p['ts']-2**24,p['id'])
