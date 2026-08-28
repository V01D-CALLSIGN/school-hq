import "@testing-library/jest-dom/vitest";
import {afterEach} from "vitest";
import {cleanup} from "@testing-library/react";
const store=new Map<string,string>();
const storage={getItem:(key:string)=>store.get(key)??null,setItem:(key:string,value:string)=>store.set(key,value),removeItem:(key:string)=>store.delete(key),clear:()=>store.clear(),key:(index:number)=>[...store.keys()][index]??null,get length(){return store.size}};
Object.defineProperty(globalThis,"localStorage",{value:storage,configurable:true});
afterEach(()=>{cleanup();localStorage.clear()});
