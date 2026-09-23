import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Input, FieldLabel } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { NewCustomerInput } from "@/services/commerce/customerService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: NewCustomerInput) => void;
  isLoading: boolean;
}

export function CustomerFormModal({ open, onOpenChange, onSubmit, isLoading }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setName(""); setEmail(""); setPhoneNumber(""); setError(""); }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    if (!email.trim() && !phoneNumber.trim()) { setError("Email or phone number is required"); return; }
    setError("");
    onSubmit({ name: name.trim(), email: email.trim() || undefined, phoneNumber: phoneNumber.trim() || undefined });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Register new customer"
      description="Create a customer account directly without OTP verification."
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button size="sm" variant="secondary" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button size="sm" variant="primary" isLoading={isLoading} onClick={handleSubmit as never}>Register</Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error ? <div style={{ color: "var(--red-tx, #dc2626)", fontSize: "0.82rem", padding: "8px 12px", background: "var(--red-bg, #fef2f2)", borderRadius: 6 }}>{error}</div> : null}
        <div>
          <FieldLabel>Full name *</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Kumar" required />
        </div>
        <div>
          <FieldLabel>Email</FieldLabel>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ramesh@email.com" />
        </div>
        <div>
          <FieldLabel>Phone number</FieldLabel>
          <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="10-digit mobile number" maxLength={10} />
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--tx-muted)", lineHeight: 1.5 }}>
          At least one of email or phone is required. The customer can log in via OTP on the customer app.
        </div>
      </form>
    </Dialog>
  );
}
