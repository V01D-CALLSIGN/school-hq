"use client";
import * as Switch from "@radix-ui/react-switch";
import {Bell,CalendarSync,Check,LogOut,Moon,Palette,Shield,Sun} from "lucide-react";
import {useEffect,useState} from "react";
import {Button} from "@/components/ui/button";
import {Card,CardContent,CardHeader} from "@/components/ui/card";
import {PageHeader} from "@/components/page-header";

export function SettingsView(){
  const[theme,setTheme]=useState<"dark"|"light">("dark");
  const[saved,setSaved]=useState(false);
  useEffect(()=>{queueMicrotask(()=>setTheme(localStorage.getItem("school-hq-theme")==="light"?"light":"dark"))},[]);
  useEffect(()=>{document.documentElement.dataset.theme=theme},[theme]);
  function choose(value:"dark"|"light"){setTheme(value);localStorage.setItem("school-hq-theme",value)}
  return <div className="space-y-5">
    <PageHeader eyebrow="Settings" title="Make School HQ yours." description="Appearance, calendar behavior, and the amount of nagging you can tolerate."/>
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]"><div className="space-y-5">
      <Card><CardHeader><Title icon={<Palette className="text-accent" size={19}/>} title="Appearance" detail="Theme and visual preferences"/></CardHeader><CardContent><div className="grid grid-cols-2 gap-3">{(["dark","light"] as const).map(t=><button key={t} onClick={()=>choose(t)} className={`relative min-h-24 rounded-xl border p-3 text-left capitalize ${theme===t?"border-accent bg-accent/5":"border-border bg-card-strong"}`}>{t==="dark"?<Moon size={20}/>:<Sun size={20}/>}<span className="mt-3 block text-sm font-semibold">{t}</span>{theme===t&&<Check size={16} className="absolute right-3 top-3 text-accent"/>}</button>)}</div></CardContent></Card>
      <Card><CardHeader><Title icon={<Bell className="text-violet-300" size={19}/>} title="Notifications" detail="Choose what deserves your attention"/></CardHeader><CardContent className="space-y-1"><SettingToggle title="Plan ready" description="When your generated evening plan is ready" defaultChecked/><SettingToggle title="Task reminders" description="15 minutes before a study block" defaultChecked/><SettingToggle title="Daily summary" description="A 5 PM overview of the night ahead"/></CardContent></Card>
      <Card><CardHeader><Title icon={<CalendarSync className="text-success" size={19}/>} title="Calendar" detail="Connected sources and defaults"/></CardHeader><CardContent><div className="flex items-center justify-between rounded-xl bg-card-strong p-3"><div><p className="text-sm font-semibold">School calendar.ics</p><p className="mt-1 text-xs text-muted">Synced 4 minutes ago · 23 events</p></div><span className="size-2 rounded-full bg-success"/></div><Button variant="secondary" className="mt-3">Manage classifications</Button></CardContent></Card>
    </div><aside className="space-y-5"><Card><CardContent><div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-full bg-accent/10 text-lg font-bold text-accent">AB</div><div><p className="font-semibold">Aarush Bagchi</p><p className="text-xs text-muted">aarush@example.com</p></div></div><Button variant="secondary" className="mt-5 w-full" onClick={()=>setSaved(true)}>{saved?<><Check size={16}/>Saved</>:"Edit profile"}</Button></CardContent></Card><Card><CardContent><div className="flex items-start gap-3"><Shield className="mt-0.5 text-muted" size={18}/><div><p className="text-sm font-semibold">Privacy first</p><p className="mt-1 text-xs leading-5 text-muted">Your calendar details are used only to find study windows.</p></div></div></CardContent></Card><Button variant="ghost" className="w-full justify-start text-danger"><LogOut size={17}/>Sign out</Button></aside></div>
  </div>
}
function Title({icon,title,detail}:{icon:React.ReactNode;title:string;detail:string}){return <div className="flex items-center gap-3">{icon}<div><h2 className="font-semibold">{title}</h2><p className="text-xs text-muted">{detail}</p></div></div>}
function SettingToggle({title,description,defaultChecked=false}:{title:string;description:string;defaultChecked?:boolean}){return <div className="flex min-h-16 items-center justify-between gap-4 rounded-xl p-3 hover:bg-card-strong"><div><p className="text-sm font-medium">{title}</p><p className="mt-0.5 text-xs text-muted">{description}</p></div><Switch.Root defaultChecked={defaultChecked} className="relative h-6 w-11 shrink-0 rounded-full bg-card-strong data-[state=checked]:bg-accent" aria-label={title}><Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-5"/></Switch.Root></div>}
