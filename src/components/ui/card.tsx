import {cn} from "@/lib/utils";
export function Card({className,...props}:React.HTMLAttributes<HTMLDivElement>){return <section className={cn("surface rounded-2xl",className)} {...props}/>}
export function CardHeader({className,...props}:React.HTMLAttributes<HTMLDivElement>){return <div className={cn("flex items-start justify-between gap-4 p-4 pb-0 sm:p-5 sm:pb-0",className)} {...props}/>}
export function CardContent({className,...props}:React.HTMLAttributes<HTMLDivElement>){return <div className={cn("p-4 sm:p-5",className)} {...props}/>}
