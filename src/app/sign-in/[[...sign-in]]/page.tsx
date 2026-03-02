import { SignIn } from "@clerk/nextjs";

import { AuthPageShell } from "@/components/auth-page-shell";

const isClerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function SignInPage() {
  if (!isClerkConfigured) {
    return (
      <AuthPageShell
        title="Sign in unavailable"
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
      title="Welcome back"
      subtitle="Sign in to continue your design-to-website comparison workflow."
      highlights={[
        "Run screenshot capture and pixel diff securely.",
        "Request AI review with clear rate-limit visibility.",
        "Switch devices and continue with the same account.",
      ]}
    >
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
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
