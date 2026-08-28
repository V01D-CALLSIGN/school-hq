import {render,screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it} from "vitest";
import {Planner} from "@/features/planner/planner";
describe("Planner",()=>{it("parses a brain dump into an editable review before planning",async()=>{const user=userEvent.setup();render(<Planner/>);expect(screen.getByRole("textbox",{name:/what's on your plate/i})).toBeInTheDocument();await user.click(screen.getByRole("button",{name:/parse brain dump/i}));expect(await screen.findByDisplayValue("Momentum problems 1–12",{},{timeout:2000})).toBeInTheDocument();expect(screen.getAllByText(/minutes/i).length).toBeGreaterThan(0);expect(screen.getByRole("button",{name:/confirm and generate plan/i})).toBeEnabled()})});
