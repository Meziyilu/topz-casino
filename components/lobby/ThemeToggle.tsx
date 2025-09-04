"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(()=>{ document.documentElement.classList.toggle("dark", dark); },[dark]);
  return (
    <button onClick={()=>setDark(d=>!d)} className="lb-btn" style={{padding:"6px 12px"}}>
      {dark ? "☀︎" : "☾"}
    </button>
  );
}
