const {encodeFunctionData,decodeFunctionResult,decodeAbiParameters,parseAbi,toFunctionSelector}=require("/Users/ayush/Desktop/wif-hackathon/Privora/node_modules/viem");
const {execFileSync}=require("child_process");
const S=process.argv[2];
const live=JSON.parse(require("fs").readFileSync(S+"/live.json"));
const R="https://rpc.testnet.chain.robinhood.com";
let n=0;
function call(to,data){ for(let t=0;t<4;t++){ execFileSync("sleep",["1.2"]);
  const out=execFileSync("curl",["-s","-m","30","-X","POST","-H","content-type: application/json","--data",JSON.stringify({jsonrpc:"2.0",id:1,method:"eth_call",params:[{to,data},"latest"]}),R]).toString();
  const j=JSON.parse(out); if(j.error&&j.error.code===429){continue;} return j; } return {error:{message:"429 persist"}}; }
const erc=parseAbi(["function symbol() view returns (string)","function name() view returns (string)","function decimals() view returns (uint8)"]);
const sv=parseAbi(["function getSlot0(bytes32) view returns (uint160 sqrtPriceX96,int24 tick,uint24 protocolFee,uint24 lpFee)"]);
const qa=parseAbi(["function quoteExactInputSingle(((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData)) returns (uint256 amountOut,uint256 gasEstimate)"]);
// pick: top 2 big-liq 1% pools + top 3 of 0.3% pools
const pick=[...live.filter(p=>p.fee===3000).slice(0,3),...live.filter(p=>p.fee===10000).slice(0,2)];
const Z="0x0000000000000000000000000000000000000000";
for(const p of pick){
  const ts=p.ts<2**23?p.ts:p.ts-2**24;
  const r={pool:p.id.slice(0,10),token:p.c1,fee:p.fee,ts};
  for(const f of["symbol","name","decimals"]){ const j=call(p.c1,encodeFunctionData({abi:erc,functionName:f})); try{r[f]=decodeFunctionResult({abi:erc,functionName:f,data:j.result})}catch{r[f]="?"} }
  try{ const j=call("0xf3334192d15450cdd385c8b70e03f9a6bd9e673b",encodeFunctionData({abi:sv,functionName:"getSlot0",args:[p.id]})); const d=decodeFunctionResult({abi:sv,functionName:"getSlot0",data:j.result}); r.tick=d[1]; r.sqrtPriceX96=String(d[0]); }catch(e){r.slot0="fail"}
  try{ const j=call("0x8dc178efb8111bb0973dd9d722ebeff267c98f94",encodeFunctionData({abi:qa,functionName:"quoteExactInputSingle",args:[{poolKey:{currency0:Z,currency1:p.c1,fee:p.fee,tickSpacing:ts,hooks:Z},zeroForOne:true,exactAmount:10n**15n,hookData:"0x"}]}));
    if(j.error) r.quote="ERR "+j.error.message.slice(0,80); else {const d=decodeFunctionResult({abi:qa,functionName:"quoteExactInputSingle",data:j.result}); r.quote_0_001ETH_out=String(d[0]); r.gas=String(d[1]);} }catch(e){r.quote="decode fail "+String(e).slice(0,60)}
  console.log(JSON.stringify(r));
}
