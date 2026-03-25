import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div
        className="font-orbitron"
        style={{
          fontSize: "8rem",
          fontWeight: 900,
          background: "linear-gradient(135deg, hsla(258,90%,66%,0.3), hsla(196,100%,50%,0.3))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          lineHeight: 1,
          marginBottom: "1rem",
        }}
      >
        404
      </div>
      <h1
        className="font-orbitron"
        style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210,40%,90%)", marginBottom: "0.75rem" }}
      >
        Page Not Found
      </h1>
      <p style={{ fontSize: "0.9rem", color: "hsl(220,10%,50%)", marginBottom: "2rem", maxWidth: "360px" }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/" className="btn-primary" data-testid="link-go-home">
        <ArrowLeft size={16} />
        Back to Home
      </Link>
    </div>
  );
}
