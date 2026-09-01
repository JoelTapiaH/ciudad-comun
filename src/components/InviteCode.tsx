"use client";

import { useState } from "react";

export default function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p
        className="num rounded-[3px] border-2 border-[var(--ink)] px-4 py-2 text-2xl tracking-[0.3em]"
        style={{ background: "var(--yellow)", color: "#16204a" }}
      >
        {code}
      </p>
      <button type="button" className="btn btn-sm" onClick={copy}>
        {copied ? "Copiado" : "Copiar código"}
      </button>
    </div>
  );
}
