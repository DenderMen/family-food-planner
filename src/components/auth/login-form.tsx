"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("E-Mail oder Passwort falsch.");
      setLoading(false);
      return;
    }

    router.push("/plan");
    router.refresh();
  }

  return (
    <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-md p-6 space-y-4">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 border border-red-200">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-warm-900 mb-1">
          E-Mail
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-warm-200 px-4 py-2.5 text-warm-900 focus:outline-none focus:ring-2 focus:ring-[#C85D3B] focus:border-transparent"
          placeholder="deine@email.de"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-warm-900 mb-1">
          Passwort
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-warm-200 px-4 py-2.5 text-warm-900 focus:outline-none focus:ring-2 focus:ring-[#C85D3B] focus:border-transparent"
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#C85D3B] text-white font-semibold rounded-lg py-2.5 px-4 hover:bg-[#b05233] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Anmelden..." : "Anmelden"}
      </button>
    </form>
  );
}
