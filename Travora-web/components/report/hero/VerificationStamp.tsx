"use client";

interface VerificationStampProps {
  date?: string;
  time?: string;
}

export default function VerificationStamp({
  date = new Date()
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase(),
  time = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }),
}: VerificationStampProps) {
  return (
    <div
      className="hidden xl:flex items-center justify-center rounded-full"
      style={{
        width: "118px",
        height: "118px",
        border: "2px solid #c14c3d",
        transform: "rotate(-11deg)",
        opacity: 0.92,
        background: "rgba(161,58,46,0.05)",
      }}
    >
      <div
        className="flex flex-col items-center justify-center text-center rounded-full font-mono"
        style={{
          width: "96px",
          height: "96px",
          border: "1px solid #c14c3d",
          color: "#c14c3d",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            letterSpacing: "0.16em",
            fontWeight: 600,
          }}
        >
          VERIFIED
        </div>
        <div
          style={{
            fontSize: "8.5px",
            letterSpacing: "0.05em",
            marginTop: "5px",
            opacity: 0.85,
          }}
        >
          {date}
          <br />
          {time} IST
        </div>
      </div>
    </div>
  );
}