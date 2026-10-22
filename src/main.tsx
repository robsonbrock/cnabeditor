import { render } from "preact";
import { App } from "./ui/App";
import "./ui/styles/tokens.css";
import "./ui/styles/app.css";

render(<App />, document.getElementById("app")!);
