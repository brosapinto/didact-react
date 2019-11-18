import Didact from "./didact";

/** @jsx Didact.createElement */
function App({ props }) {
  return <h1>Hi {props.name}</h1>;
}

const element = <App name="foo" />;
const container = document.getElementById("root");
Didact.render(element, container);
