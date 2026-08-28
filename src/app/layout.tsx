import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000"),title:{default:"School HQ",template:"%s · School HQ"},description:"A focused command center for assignments, study plans, and deep work.",applicationName:"School HQ",appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"School HQ"},openGraph:{title:"School HQ",description:"Plan less. Finish more.",images:[{url:"/og.png",width:1200,height:630,alt:"School HQ — Plan less. Finish more."}]},twitter:{card:"summary_large_image",title:"School HQ",description:"Plan less. Finish more.",images:["/og.png"]}};
export const viewport:Viewport={themeColor:"#090b10",colorScheme:"dark light"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body><PwaRegister/><AppShell>{children}</AppShell></body></html>}
