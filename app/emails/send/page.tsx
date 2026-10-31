import React, { Suspense } from "react";
import SendEmailForm from "./components/SendEmailForm";

export default function SendEmailPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            maxWidth: "820px",
            margin: "40px auto",
            padding: "24px",
            color: "#a1a1aa",
            fontSize: "14px",
          }}
        >
          Loading email dispatcher...
        </div>
      }
    >
      <SendEmailForm />
    </Suspense>
  );
}
