import Didact from "./didact";

function App() {
  return (
    /** @jsx Didact.createElement */
    <div className="App">
      <h1>Hello CodeSandbox</h1>
      <h2>Start editing to see some magic happen!</h2>
    </div>
  );
}

const rootElement = document.getElementById("root");
Didact.render(App(), rootElement);
