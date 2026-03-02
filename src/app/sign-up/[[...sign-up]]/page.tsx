import { SignUp } from "@clerk/nextjs";

import { AuthPageShell } from "@/components/auth-page-shell";

const isClerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function SignUpPage() {
  if (!isClerkConfigured) {
    return (
      <AuthPageShell
        title="Sign up unavailable"
        subtitle="Clerk keys are missing. Configure environment variables to enable auth."
        highlights={[
          "Protected APIs require authenticated users.",
          "AI review quota is tracked per account.",
          "Your comparison sessions stay user-scoped.",
        ]}
      >
        <p>Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.</p>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Create account"
      subtitle="Create your account and start matching websites to your reference designs."
      highlights={[
        "Get authenticated access to screenshot comparison APIs.",
        "Use AI review with user-scoped hourly quota.",
        "Keep your workflow secure on Vercel deployment.",
      ]}
    >
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/"
        appearance={{
          variables: {
            colorPrimary: "#ff6a1a",
            colorText: "#17191d",
            colorBackground: "#fffdf7",
            colorInputBackground: "#fffdf7",
            colorInputText: "#17191d",
            borderRadius: "12px",
            fontFamily: "var(--font-bricolage)",
          },
          elements: {
            rootBox: "clerk-root",
            card: "clerk-card",
            headerTitle: "clerk-header-title",
            headerSubtitle: "clerk-header-subtitle",
            socialButtonsBlockButton: "clerk-social-btn",
            formFieldInput: "clerk-input",
            formFieldLabel: "clerk-label",
            formButtonPrimary: "clerk-primary-btn",
            footer: "clerk-footer",
            footerActionLink: "clerk-link",
          },
        }}
      />
    </AuthPageShell>
  );
}
