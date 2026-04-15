"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const C = {bg:"#0F0F14",card:"#16161E",border:"#1E1E2A",accent:"#7C6FFF",accentSoft:"#2D2A4A",green:"#22D37A",greenSoft:"#0F2A1E",red:"#FF5B5B",redSoft:"#2A1010",text:"#E8E6F0",muted:"#6B6882"};
const CAT:any = {"Alimentación":"#7C6FFF","Transporte":"#22D37A","Restaurantes":"#F5A623","Servicios":"#FF5B5B","Entretenimiento":"#B06FFF","Combustible":"#F5A623","Ingresos":"#22D37A","Otros":"#4A4A6A"};
const CLP = (n:number) => "$"+Math.abs(Math.round(n)).toLocaleString("es-CL");

export default function Dashboard() {
  const {data:session,status} = useSession();
  const router = useRouter();
  const [scanning,setScanning] = useState(false);
  const [txs,setTxs] = useState<any[]>([]);
  const [error,setError] = useState("");
  const [progress,setProgress] = useState("");
  const [tab,setTab] = useState("dashboard");
  const [saved,setSaved] = useState(false);

  useEffect(()=>{if(status==="unauthenticated")router.push("/login");},[status,router]);

  useEffect(()=>{
    const stored = localStorage.getItem("finzen-txs");
    if(stored) setTxs(JSON.parse(stored));
  },[]);

  async function scan() {
    setScanning(true);setError("");setSaved(false);
    const token=(session as any)?.accessToken;
    if(!token){setError("Sin token — vuelve a hacer login");setScanning(false);return;}
    try {
      setProgress("Buscando correos bancarios...");
      const g = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=from:santander.cl OR from:bancochile.cl&maxResults=20",{headers:{Authorization:"Bearer "+token}}).then(r=>r.json());
      const msgs = g.messages||[];
      if(!msgs.length){setError("No hay correos bancarios");setScanning(false);return;}
      const results=[];
      for(let i=0;i<Math.min(msgs.length,15);i++){
        setProgress("Analizando correo "+(i+1)+" de "+Math.min(msgs.length,15)+"...");
        const m = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/"+msgs[i].id+"?format=full",{headers:{Authorization:"Bearer "+token}}).then(r=>r.json());
        const subject=m.payload?.headers?.find((h:any)=>h.name==="Subject")?.value||"";
        const from=m.payload?.headers?.find((h:any)=>h.name==="From")?.value||"";
        const snippet=m.snippet||"";
        const p = await fetch("http://localhost:4000/api/parse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subject,from,snippet})}).then(r=>r.json());
        if(p.transaction)results.push({...p.transaction,id:msgs[i].id});
      }
      setTxs(results);
      localStorage.setItem("finzen-txs",JSON.stringify(results));
      setSaved(true);
      setProgress("");
    } catch(e:any){setError(e.message);}
    setScanning(false);
  }

  if(status==="loading")return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",color:C.accent,fontFamily:"system-ui"}}>Cargando...</div>;

  const expenses=txs.filter(t=>t.type!=="income");
  const totalExp=expenses.reduce((s,t)=>s+(t.amount||0),0);
  const totalInc=txs.filter(t=>t.type==="income").reduce((s,t)=>s+(t.amount||0),0);
  const bycat=expenses.reduce((a:any,t)=>{a[t.category||"Otros"]=(a[t.category||"Otros"]||0)+(t.amount||0);return a;},{});
  const catData=Object.entries(bycat).map(([k,v])=>({category:k,amount:v as number})).sort((a,b)=>b.amount-a.amount);
  const NAV=[{id:"dashboard",label:"Inicio",icon:"⊞"},{id:"transactions",label:"Movimientos",icon:"↕"},{id:"analytics",label:"Análisis",icon:"📊"}];

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"system-ui",maxWidth:420,margin:"0 auto",paddingBottom:80}}>
      <div style={{padding:"20px 20px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:20,fontWeight:800}}>FinZen <span style={{color:C.accent}}>✦</span></div>
        <button onClick={()=>signOut({callbackUrl:"/login"})} style={{background:C.card,border:"1px solid "+C.border,color:C.muted,padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12}}>Salir</button>
      </div>

      {tab==="dashboard"&&<div style={{padding:"0 16px"}}>
        {txs.length>0&&<div style={{background:"linear-gradient(135deg,#1A1730,#2D2A4A)",borderRadius:20,padding:20,marginBottom:16,border:"1px solid "+C.border}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Resumen del período</div>
          <div style={{display:"flex",gap:12}}>
            <div style={{flex:1,background:C.greenSoft,borderRadius:12,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:C.muted}}>Ingresos</div>
              <div style={{fontSize:14,fontWeight:700,color:C.green}}>{CLP(totalInc)}</div>
            </div>
            <div style={{flex:1,background:C.redSoft,borderRadius:12,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:C.muted}}>Gastos</div>
              <div style={{fontSize:14,fontWeight:700,color:C.red}}>{CLP(totalExp)}</div>
            </div>
          </div>
          {totalInc>0&&<div style={{marginTop:12,background:totalInc>totalExp?C.greenSoft:C.redSoft,borderRadius:10,padding:"8px 12px",display:"flex",justifyContent:"space-between"}}>
            <div style={{fontSize:12,color:C.muted}}>Balance</div>
            <div style={{fontSize:14,fontWeight:700,color:totalInc>totalExp?C.green:C.red}}>{totalInc>totalExp?"+":""}{CLP(totalInc-totalExp)}</div>
          </div>}
        </div>}

        <div onClick={!scanning?scan:undefined} style={{background:C.card,borderRadius:16,padding:"14px 16px",marginBottom:16,border:"1px solid "+C.border,cursor:scanning?"default":"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:12,background:C.accentSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{scanning?"⏳":txs.length>0?"✅":"📧"}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600}}>{scanning?progress:txs.length>0?txs.length+" transacciones detectadas":"Detectar gastos automáticamente"}</div>
              <div style={{fontSize:11,color:C.muted}}>{saved?"💾 Guardado localmente":"Banco de Chile · Santander · Gmail"}</div>
            </div>
          </div>
          {scanning&&<div style={{marginTop:10,height:3,borderRadius:4,background:C.border,overflow:"hidden"}}><div style={{height:"100%",width:"70%",background:C.accent,borderRadius:4}}/></div>}
        </div>

        {error&&<div style={{background:C.redSoft,borderRadius:12,padding:12,marginBottom:16,fontSize:13,color:C.red}}>⚠️ {error}</div>}

        {txs.slice(0,4).map((tx,i)=>(
          <div key={i} style={{background:C.card,borderRadius:12,padding:"10px 14px",marginBottom:8,border:"1px solid "+C.border,display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:C.accentSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{tx.type==="income"?"💰":"💸"}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600}}>{tx.merchant}</div>
              <div style={{fontSize:11,color:C.muted}}>{tx.category} · {tx.date}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontWeight:700,color:tx.type==="income"?C.green:C.text,fontSize:13}}>{tx.type==="income"?"+":"-"}{CLP(tx.amount)}</div>
              <div style={{fontSize:10,color:C.accent}}>⚡ auto</div>
            </div>
          </div>
        ))}
        {txs.length>4&&<div style={{textAlign:"center",fontSize:12,color:C.muted,cursor:"pointer"}} onClick={()=>setTab("transactions")}>Ver {txs.length-4} más →</div>}
      </div>}

      {tab==="transactions"&&<div style={{padding:"0 16px"}}>
        <div style={{fontSize:16,fontWeight:700,marginBottom:16}}>Movimientos ({txs.length})</div>
        {txs.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",marginTop:40}}>Escanea tus correos primero 📧</div>}
        {txs.map((tx,i)=>(
          <div key={i} style={{background:C.card,borderRadius:12,padding:"10px 14px",marginBottom:8,border:"1px solid "+C.border,display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:C.accentSoft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{tx.type==="income"?"💰":"💸"}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600}}>{tx.merchant}</div>
              <div style={{fontSize:11,color:C.muted}}>{tx.category} · {tx.date}</div>
            </div>
            <div style={{fontWeight:700,color:tx.type==="income"?C.green:C.text,fontSize:13}}>{tx.type==="income"?"+":"-"}{CLP(tx.amount)}</div>
          </div>
        ))}
      </div>}

      {tab==="analytics"&&<div style={{padding:"0 16px"}}>
        <div style={{fontSize:16,fontWeight:700,marginBottom:16}}>Análisis de gastos</div>
        {catData.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",marginTop:40}}>Escanea tus correos primero 📧</div>}
        {catData.map((c,i)=>(
          <div key={i} style={{background:C.card,borderRadius:12,padding:"12px 16px",marginBottom:8,border:"1px solid "+C.border}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <div style={{fontSize:13,fontWeight:600}}>{c.category}</div>
              <div style={{fontSize:13,fontWeight:700}}>{CLP(c.amount)}</div>
            </div>
            <div style={{height:4,borderRadius:2,background:C.border}}>
              <div style={{height:"100%",width:Math.round(c.amount/totalExp*100)+"%",background:CAT[c.category]||"#4A4A6A",borderRadius:2,minWidth:4}}/>
            </div>
            <div style={{fontSize:10,color:C.muted,marginTop:4}}>{Math.round(c.amount/totalExp*100)}% del total</div>
          </div>
        ))}
        {catData.length>0&&<div style={{background:"linear-gradient(135deg,#1A1730,#2D2A4A)",borderRadius:16,padding:"14px 16px",marginTop:8,border:"1px solid "+C.border}}>
          <div style={{fontSize:11,color:C.accent,fontWeight:700,marginBottom:4}}>✦ INSIGHT</div>
          <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{catData[0]?.category} es tu mayor gasto</div>
          <div style={{fontSize:12,color:C.muted}}>{txs.length} transacciones detectadas · Guardadas localmente 💾</div>
        </div>}
      </div>}

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:420,background:C.card,borderTop:"1px solid "+C.border,display:"flex",padding:"10px 0 14px",zIndex:100}}>
        {NAV.map(n=>(
          <div key={n.id} onClick={()=>setTab(n.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",flex:1}}>
            <div style={{fontSize:18,opacity:tab===n.id?1:0.4}}>{n.icon}</div>
            <div style={{fontSize:10,fontWeight:tab===n.id?700:400,color:tab===n.id?C.accent:C.muted}}>{n.label}</div>
            {tab===n.id&&<div style={{width:4,height:4,borderRadius:2,background:C.accent}}/>}
          </div>
        ))}
      </div>
    </div>
  );
}
