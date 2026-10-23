import { render } from "preact";
import { App } from "./ui/App";
import { initAnalytics } from "./ui/analytics";
import "./ui/styles/tokens.css";
import "./ui/styles/app.css";

render(<App />, document.getElementById("app")!);
// Depois do render: a medição nunca atrasa a abertura do editor (005, research A7).
initAnalytics();
