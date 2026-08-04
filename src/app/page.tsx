import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <div className="card">
        <span className="badge">Phase 1 — Text Simulation</span>
        <h1>AI Voice Receptionist</h1>
        <p>
          Public reference implementation and modular monolith architecture
          showcase. This project is under active development and uses fictional
          data only.
        </p>
        <p>
          <Link href="/demo">Open the fictional text simulation demo →</Link>
        </p>
      </div>
    </main>
  );
}
