"use client";
import { useEffect, useRef } from "react";

export default function AvatarWithFrame({
  avatarUrl, frameUrl, size = 160, className = "",
}: { avatarUrl?: string; frameUrl?: string; size?: number; className?: string; }) {
  const isVideo = frameUrl ? /\.(webm|mp4)$/i.test(frameUrl) : false;
  const videoRef = useRef<HTMLVideoElement|null>(null);
  useEffect(() => { if (isVideo && videoRef.current) videoRef.current.play().catch(()=>{}); }, [isVideo, frameUrl]);

  return (
    <div className={`avatar-frame ${className}`} style={{ width: size, height: size }}>
      <img className="avatar" src={avatarUrl || "/assets/defaults/avatar.png"} alt="avatar" />
      {frameUrl && !isVideo && <img className="frame" src={frameUrl} alt="frame" />}
      {frameUrl && isVideo && <video className="frame" ref={videoRef} autoPlay muted loop playsInline><source src={frameUrl} /></video>}
    </div>
  );
}
