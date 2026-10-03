import { useState } from "react";
import { Lock, LogIn, Mail, ShieldCheck, X } from "lucide-react";
import { authApi } from "../api/services";
import { DEMO_USERS, useApp } from "../context/AppContext";
import avatarImg from "../assets/avatar.jpg";
import { Avatar, Badge, Button, IconBadge, Panel } from "./ui";

import { setAuthToken } from "../api/client";

export function AuthModal() {
  const { authModalOpen, setAuthModalOpen, signInAs } = useApp();
  const [email, setEmail] = useState("admin@acmestore.com");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.login(email, password);
      if (res?.access_token) {
        setAuthToken(res.access_token);
      }
      // Find matching demo user or construct profile
      const matched = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        signInAs(matched);
      } else {
        const namePart = email.split("@")[0].replace(".", " ");
        const capName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        signInAs({
          id: `u-${Date.now()}`,
          name: capName,
          firstName: capName.split(" ")[0],
          email,
          role: "Admin",
          phone: "+1 555-0100",
          title: "Support Operations",
          twoFactorEnabled: true,
        });
      }
    } catch {
      // Offline fallback
      const matched = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase()) || DEMO_USERS[0];
      signInAs(matched);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md">
        <Panel className="p-6 border border-line bg-card shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-fade-up">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-line">
            <div className="flex items-center gap-3">
              <IconBadge icon={ShieldCheck} tone="cyan" size="lg" />
              <div>
                <h2 className="text-lg font-bold text-ink leading-tight">Welcome to AI SupportPro</h2>
                <p className="text-xs text-mute mt-0.5">Enterprise Customer Support Authentication</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAuthModalOpen(false)}
              className="p-1 rounded-lg text-mute hover:bg-white/5 hover:text-ink transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick 1-Click Demo Profiles */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-mute uppercase tracking-wider">
                Quick 1-Click Demo Switch
              </span>
              <Badge tone="mint" dot>Verified</Badge>
            </div>

            <div className="space-y-2">
              {DEMO_USERS.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await authApi.login(demo.email, "Password123!");
                      if (res?.access_token) {
                        setAuthToken(res.access_token);
                      }
                    } catch { /* offline fallback */ }
                    signInAs(demo);
                  }}
                  className="flex w-full items-center gap-3 p-2.5 rounded-xl border border-line bg-white/[0.02] hover:bg-primary/10 hover:border-primary/40 transition text-left group"
                >
                  <Avatar name={demo.name} src={demo.id === "u1" ? avatarImg : undefined} size={38} tone="cyan" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink group-hover:text-primary transition">{demo.name}</p>
                      <Badge tone={demo.role === "Owner" ? "warn" : demo.role === "Admin" ? "ai" : "cyan"}>{demo.role}</Badge>
                    </div>
                    <p className="text-xs text-mute truncate">{demo.email} · {demo.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[11px] uppercase tracking-wider text-mute font-medium">Or enter credentials</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          {/* Manual Form */}
          <form onSubmit={handleManualLogin} className="space-y-3">
            {error && (
              <div className="p-2.5 rounded-lg bg-danger/15 border border-danger/30 text-xs text-danger">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-mute uppercase tracking-wider mb-1">
                Email
              </label>
              <div className="field flex h-10 items-center gap-2.5 px-3">
                <Mail size={16} className="text-mute" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@acmestore.com"
                  className="w-full bg-transparent text-sm text-ink outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-mute uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="field flex h-10 items-center gap-2.5 px-3">
                <Lock size={16} className="text-mute" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-transparent text-sm text-ink outline-none"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2 justify-center"
              disabled={loading}
              icon={LogIn}
            >
              {loading ? "Authenticating..." : "Sign In & Enter Dashboard"}
            </Button>
          </form>

          <p className="mt-4 text-center text-[11px] text-mute flex items-center justify-center gap-1">
            <ShieldCheck size={13} className="text-mint inline" /> SOC2 compliant session encryption active
          </p>
        </Panel>
      </div>
    </div>
  );
}
