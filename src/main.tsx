import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@aws-amplify/ui-react/styles.css";
import "./index.css";
import { Amplify } from "aws-amplify";
import awsexports from "./aws-exports.cjs";

Amplify.configure(awsexports);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
