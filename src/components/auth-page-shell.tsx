import Link from "next/link";

type AuthPageShellProps = {
  title: string;
  subtitle: string;
  highlights: string[];
  children: React.ReactNode;
};

export function AuthPageShell({
  title,
  subtitle,
  highlights,
  children,
}: AuthPageShellProps) {
  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <p className="eyebrow">Design Match Evaluator</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>

        <ul className="auth-highlights">
          {highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>

        <div className="auth-note">
          <strong>Why login?</strong>
          <p>
            Authentication enables per-user AI quota tracking (5 reviews/hour)
            and secure API access.
          </p>
        </div>

        <Link className="auth-home-link" href="/">
          Back to home
        </Link>
      </section>

      {children}
    </main>
  );
}
