import type {Metadata} from "next";
import {FocusTimer} from "@/features/focus/focus-timer";
export const metadata:Metadata={title:"Focus"};
export default function FocusPage(){return <FocusTimer/>}
