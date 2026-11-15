import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "leaflet/dist/leaflet.css";
import "./app.css";
// Keep device-size layout adjustments together, after the existing styles.
import "./responsive.css";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
