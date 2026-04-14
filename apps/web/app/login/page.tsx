"use client";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0F0F14",fontFamily:"system-ui"}}>
      <div style={{background:"#16161E",border:"1px solid #1E1E2A",borderRadius:24,padding:"40px 32px",width:"100%",maxWidth:380,textAlign:"center"}}>
        <div style={{fontSize:32,fontWeight:800,color:"#E8E6F0",marginBottom:8}}>
          FinZen <span style={{color:"#7C6FFF"}}>✦</span>
        </div>
        <div style={{fontSize:14,color:"#6B6882",marginBottom:32}}>
          Tu asistente financiero automático
        </div>
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:"#7C6FFF",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}
        >
          Conectar con Google
        </button>
        <div style={{fontSize:11,color:"#4A4A6A",marginTop:16}}>
          Solo lectura · Nunca almacenamos tus correos completos
        </div>
      </div>
    </div>
  );
}
