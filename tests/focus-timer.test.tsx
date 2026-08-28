import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it} from "vitest";
import {FocusTimer} from "@/features/focus/focus-timer";
describe("FocusTimer",()=>{it("starts, pauses, and resumes while persisting timestamp state",async()=>{const user=userEvent.setup();render(<FocusTimer/>);const start=screen.getByRole("button",{name:"Start"});await user.click(start);expect(screen.getByRole("button",{name:"Pause"})).toBeInTheDocument();expect(JSON.parse(localStorage.getItem("school-hq-focus-timer-v1")??"{}").endAt).toBeTypeOf("number");await user.click(screen.getByRole("button",{name:"Pause"}));expect(screen.getByRole("button",{name:"Resume"})).toBeInTheDocument();await user.click(screen.getByRole("button",{name:"Resume"}));expect(screen.getByRole("button",{name:"Pause"})).toBeInTheDocument()})});
