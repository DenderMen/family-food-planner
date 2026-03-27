import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🍽️</div>
          <h1 className="text-3xl font-[var(--font-fraunces)] text-warm-900">
            Die Breuers
          </h1>
          <p className="text-warm-800 opacity-70 mt-2">
            Willkommen zurück!
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
