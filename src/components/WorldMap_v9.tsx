"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import GameOverlay, { GameType } from "@/components/GameOverlay";
type WNode={node_id:string;node_index:number;node_type:string;title:string;pos_x:number;pos_y:number;target_ref:string|null;max_stars:number;completed:boolean;stars:number;unlocked:boolean;reward_xp:number;};
type Assets=Record<string,string>;
type XPData={xp:number;level:number;xp_into_level:number;xp_needed_level:number;progress_pct:number;};
const fmt=(n:number)=>n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":String(n);
const BOSS=new Set([5,10,15,20]);
export default function WorldMap({playerId}:{playerId:string}) {
  const sb=createClient();
  const [nodes,setNodes]=useState<WNode[]>([]);
  const [assets,setAssets]=useState<Assets>({});
  const [xp,setXp]=useState<XPData|null>(null);
  const [prof,setProf]=useState<{gold_coins:number;sweeps_coins:number}|null>(null);
  const [game,setGame]=useState<{game:GameType;nodeId:string;level:number}|null>(null);
  const [loading,setLoading]=useState(true);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    async function load(){
      const[nr,ar,xr,pr]=await Promise.all([
        sb.from("world_nodes").select("*").order("node_index"),
        sb.rpc("get_world_assets"),
        sb.rpc("get_player_xp",{p_player_id:playerId}),
        sb.from("profiles").select("gold_coins,sweeps_coins").eq("id",playerId).single(),
      ]);
      if(nr.data)setNodes(nr.data);
      if(ar.data){const m:Assets={};for(const a of ar.data)m[a.asset_key]=a.url;setAssets(m);}
      if(xr.data?.[0])setXp(xr.data[0]);
      if(pr.data)setProf(pr.data);
      setLoading(false);
      setTimeout(()=>{
        const active=nr.data?.find((n:WNode)=>n.unlocked&&!n.completed);
        if(active&&ref.current){const h=ref.current.scrollHeight;ref.current.scrollTo({top:(active.pos_y/100)*h-window.innerHeight*0.55,behavior:"smooth"});}
      },700);
    }
    load();
  },[playerId]);
  const open=useCallback((n:WNode)=>{
    if(!n.unlocked)return;
    const g=n.target_ref as GameType;
    if(g!=="ballmatch"&&g!=="neural_cascade")return;
    setGame({game:g,nodeId:n.node_id,level:n.node_index});
  },[]);
  const done=useCallback(async(r:{win:boolean;stars:number;xp:number})=>{
    if(r.win){
      const[nr,xr,pr]=await Promise.all([sb.from("world_nodes").select("*").order("node_index"),sb.rpc("get_player_xp",{p_player_id:playerId}),sb.from("profiles").select("gold_coins,sweeps_coins").eq("id",playerId).single()]);
      if(nr.data)setNodes(nr.data);if(xr.data?.[0])setXp(xr.data[0]);if(pr.data)setProf(pr.data);
    }
    setGame(null);
  },[playerId]);
  if(loading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100dvh",background:"#08080C",color:"rgba(200,200,255,.5)"}}>Cargando...</div>;
  const mapH=Math.max(520,nodes.length*130);
  return(<>
    <GameOverlay game={game?.game??null} nodeId={game?.nodeId??null} level={game?.level??1} playerId={playerId} onClose={()=>setGame(null)} onComplete={done}/>
    {/* HUD */}
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:"linear-gradient(180deg,rgba(8,4,20,.95),transparent)",padding:"env(safe-area-inset-top,10px) 14px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{position:"relative",width:42,height:42}}>
          <svg width="42" height="42" style={{transform:"rotate(-90deg)"}}>
            <circle cx="21" cy="21" r="17" fill="none" stroke="rgba(120,80,220,.3)" strokeWidth="3"/>
            <circle cx="21" cy="21" r="17" fill="none" stroke="#C8941A" strokeWidth="3" strokeDasharray={`${2*Math.PI*17}`} strokeDashoffset={`${2*Math.PI*17*(1-(xp?.progress_pct??0)/100)}`} strokeLinecap="round"/>
          </svg>
          <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#C8941A"}}>{xp?.level??1}</span>
        </div>
        <div style={{fontSize:11,color:"rgba(200,200,255,.7)"}}>
          <div style={{fontWeight:700,color:"#C8941A"}}>NV {xp?.level??1}</div>
          <div style={{fontSize:10}}>{fmt(xp?.xp_into_level??0)}/{fmt(xp?.xp_needed_level??100)} XP</div>
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        {[{icon:"🪙",v:prof?.gold_coins??0},{icon:"💎",v:prof?.sweeps_coins??0}].map(({icon,v},i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:4,background:"rgba(255,255,255,.06)",borderRadius:20,padding:"4px 10px"}}>
            <span style={{fontSize:13}}>{icon}</span><span style={{fontSize:12,fontWeight:700}}>{fmt(v)}</span>
          </div>
        ))}
      </div>
    </div>
    {/* Mapa */}
    <div ref={ref} style={{height:"100dvh",overflowY:"auto",overflowX:"hidden",background:`url(${assets["bg-miami-mobile"]??""}) center/cover no-repeat`,backgroundColor:"#08080C",position:"relative"}}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(8,4,20,.45),rgba(4,2,12,.65))",pointerEvents:"none",zIndex:1}}/>
      <div style={{position:"relative",zIndex:2,height:`${mapH}vh`,minHeight:`${nodes.length*140}px`}}>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
          {nodes.map((n,i)=>{if(!i)return null;const p=nodes[i-1];return<line key={n.node_id} x1={`${p.pos_x}%`} y1={`${p.pos_y}%`} x2={`${n.pos_x}%`} y2={`${n.pos_y}%`} stroke={n.unlocked?"rgba(120,80,220,.45)":"rgba(60,30,100,.22)"} strokeWidth="2.5" strokeDasharray={n.unlocked?"none":"8,5"}/>;})}
        </svg>
        {nodes.map(n=>{
          const boss=BOSS.has(n.node_index),active=n.unlocked&&!n.completed,sz=boss?76:62;
          return(
            <div key={n.node_id} onClick={()=>open(n)} style={{position:"absolute",left:`${n.pos_x}%`,top:`${n.pos_y}%`,transform:"translate(-50%,-50%)",width:sz,height:sz,borderRadius:boss?16:"50%",background:!n.unlocked?"rgba(20,10,40,.85)":boss?"linear-gradient(135deg,rgba(200,148,26,.25),rgba(255,50,154,.18))":n.completed?"rgba(25,70,45,.85)":"rgba(30,10,70,.85)",border:!n.unlocked?"1.5px solid rgba(100,60,180,.28)":boss?"2.5px solid rgba(200,148,26,.8)":n.completed?"2px solid rgba(45,210,110,.65)":"2px solid rgba(120,80,220,.75)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,cursor:n.unlocked?"pointer":"default",backdropFilter:"blur(8px)",boxShadow:active?`0 0 ${boss?24:16}px ${boss?"rgba(200,148,26,.55)":"rgba(120,80,220,.55)"}`:n.completed?"0 0 8px rgba(45,200,100,.25)":"none",animation:active?"nodePulse 1.8s ease-in-out infinite":"none",zIndex:boss?5:3}}>
              <span style={{fontSize:boss?22:18}}>{boss?"⭐":!n.unlocked?"🔒":n.completed?"✅":"🎮"}</span>
              <span style={{fontSize:boss?9:8,fontWeight:700,textAlign:"center",color:boss?"#C8941A":"rgba(200,200,255,.85)",maxWidth:sz-10,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{n.title}</span>
              {n.completed&&<div style={{display:"flex",gap:2}}>{Array.from({length:n.max_stars}).map((_,i)=><span key={i} style={{fontSize:8,opacity:i<n.stars?1:.25}}>⭐</span>)}</div>}
              <span style={{position:"absolute",top:-7,right:-5,background:boss?"#C8941A":"rgba(100,60,200,.9)",borderRadius:10,fontSize:8,fontWeight:800,color:"#fff",padding:"1px 5px",border:"1px solid rgba(255,255,255,.2)"}}>{n.node_index}</span>
            </div>
          );
        })}
        {(()=>{const a=nodes.find(n=>n.unlocked&&!n.completed);if(!a||!assets["mascot-global"])return null;return<img src={assets["mascot-global"]} alt="mascot" style={{position:"absolute",left:`${a.pos_x}%`,top:`${a.pos_y}%`,transform:"translate(-50%,-152%)",width:50,height:50,objectFit:"contain",filter:"drop-shadow(0 4px 8px rgba(0,0,0,.6))",animation:"mascotBob 2s ease-in-out infinite",zIndex:8,pointerEvents:"none"}}/>;})()}
      </div>
      <div style={{height:"12vh"}}/>
    </div>
    <style>{`@keyframes nodePulse{0%,100%{box-shadow:0 0 14px rgba(120,80,220,.4);transform:translate(-50%,-50%) scale(1)}50%{box-shadow:0 0 26px rgba(120,80,220,.7);transform:translate(-50%,-50%) scale(1.07)}}@keyframes mascotBob{0%,100%{transform:translate(-50%,-152%)}50%{transform:translate(-50%,-167%)}}`}</style>
  </>);
}
