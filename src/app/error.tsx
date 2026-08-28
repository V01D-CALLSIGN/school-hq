"use client";
import {useEffect} from "react";
import {StatusState} from "@/components/status-state";
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){useEffect(()=>{console.error(error)},[error]);return <StatusState kind="error" title="That panel lost the plot." description="Your data is safe. Retry the view, and if it keeps failing check the API connection." onRetry={reset}/>}
