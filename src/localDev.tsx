import React from "react";
import ReactDOM from "react-dom/client";
import CER from "./webparts/cer/components/CER";
import "./tailwind.generated.css";

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <CER
        newcurrentUserName="Shiven Pandit (Project Proponent)"
        newcurrentUserEmail="shiven.pandit@vedanta.co.in"
        newcurrentUserId={101}
      />
    </React.StrictMode>
  );
}
