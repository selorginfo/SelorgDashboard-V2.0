import { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Input, FieldLabel } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useSendUserOtp, useVerifyUserOtp } from "@/modules/system/hooks/useUsers";
import type { AdminUserInput } from "@/services/system/usersService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AdminUserInput) => void;
  isLoading: boolean;
}

const ROLES = ["admin", "darkstore", "warehouse", "finance", "rider", "vendor", "production", "merch"];

type Step = "details" | "otp" | "verified";

export function AdminUserFormModal({ open, onOpenChange, onSubmit, isLoading }: Props) {
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("admin");
  const [otp, setOtp] = useState("");
  const [verificationRequestId, setVerificationRequestId] = useState("");
  const [emailVerifiedToken, setEmailVerifiedToken] = useState("");
  const [error, setError] = useState("");

  const sendOtp = useSendUserOtp();
  const verifyOtp = useVerifyUserOtp();

  useEffect(() => {
    if (open) {
      setStep("details");
      setName(""); setEmail(""); setPassword(""); setDepartment(""); setRole("admin");
      setOtp(""); setVerificationRequestId(""); setEmailVerifiedToken(""); setError("");
    }
  }, [open]);

  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    if (!email.trim()) { setError("Email is required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError("");
    sendOtp.mutate(email.trim().toLowerCase(), {
      onSuccess: (res) => {
        setVerificationRequestId(res.verificationRequestId);
        setStep("otp");
        if (res.devOtp) setOtp(res.devOtp);
      },
      onError: (err) => setError((err as Error).message),
    });
  }

  function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) { setError("Enter the 6-digit code"); return; }
    setError("");
    verifyOtp.mutate({ email: email.trim().toLowerCase(), otp, verificationRequestId }, {
      onSuccess: (res) => {
        setEmailVerifiedToken(res.emailVerifiedToken);
        setStep("verified");
      },
      onError: (err) => setError((err as Error).message),
    });
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      department: department.trim() || undefined,
      roleId: role,
      emailVerifiedToken,
    });
  }

  const footerByStep: Record<Step, React.ReactNode> = {
    details: (
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button size="sm" variant="secondary" onClick={() => onOpenChange(false)} disabled={sendOtp.isPending}>Cancel</Button>
        <Button size="sm" variant="primary" isLoading={sendOtp.isPending} onClick={handleSendOtp as never}>
          Send verification code
        </Button>
      </div>
    ),
    otp: (
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button size="sm" variant="secondary" onClick={() => setStep("details")} disabled={verifyOtp.isPending}>Back</Button>
        <Button size="sm" variant="primary" isLoading={verifyOtp.isPending} onClick={handleVerifyOtp as never}>
          Verify code
        </Button>
      </div>
    ),
    verified: (
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button size="sm" variant="secondary" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
        <Button size="sm" variant="primary" isLoading={isLoading} onClick={handleCreate as never}>
          Create user
        </Button>
      </div>
    ),
  };

  const titleByStep: Record<Step, string> = {
    details: "New admin user",
    otp: "Verify email",
    verified: "Confirm & create",
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={titleByStep[step]}
      description={
        step === "details"
          ? "Fill in the user details. A 6-digit code will be sent to the email to confirm access."
          : step === "otp"
          ? `Enter the 6-digit code sent to ${email}. It expires in 10 minutes.`
          : "Email verified. Review details and create the account."
      }
      footer={footerByStep[step]}
    >
      {error ? (
        <div style={{ color: "var(--red-tx, #dc2626)", fontSize: "0.82rem", padding: "8px 12px", background: "var(--red-bg, #fef2f2)", borderRadius: 6, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      {step === "details" && (
        <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <FieldLabel>Full name *</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" required />
          </div>
          <div>
            <FieldLabel>Email *</FieldLabel>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="priya@selorg.com" required />
          </div>
          <div>
            <FieldLabel>Temporary password *</FieldLabel>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" minLength={6} required />
          </div>
          <div>
            <FieldLabel>Department</FieldLabel>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Operations" />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--tx)", fontSize: "0.875rem" }}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
          <ShieldCheck size={32} style={{ color: "var(--blue-tx, #2563eb)", marginTop: 4 }} />
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            style={{ width: "100%", padding: "12px 16px", fontSize: "1.5rem", letterSpacing: "0.5em", textAlign: "center", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--tx)" }}
          />
          <button
            type="button"
            onClick={() => {
              setError("");
              sendOtp.mutate(email.trim().toLowerCase(), {
                onSuccess: (res) => { setVerificationRequestId(res.verificationRequestId); if (res.devOtp) setOtp(res.devOtp); },
                onError: (err) => setError((err as Error).message),
              });
            }}
            style={{ fontSize: "0.8rem", color: "var(--tx-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            Resend code
          </button>
        </form>
      )}

      {step === "verified" && (
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--green-bg, #f0fdf4)", borderRadius: 6, marginBottom: 4 }}>
            <ShieldCheck size={16} style={{ color: "var(--green-tx, #16a34a)" }} />
            <span style={{ fontSize: "0.82rem", color: "var(--green-tx, #16a34a)" }}>Email verified — {email}</span>
          </div>
          {[
            ["Name", name],
            ["Role", role.charAt(0).toUpperCase() + role.slice(1)],
            department ? ["Department", department] : null,
          ].filter(Boolean).map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--tx-muted)" }}>{label}</span>
              <span style={{ fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </form>
      )}
    </Dialog>
  );
}
