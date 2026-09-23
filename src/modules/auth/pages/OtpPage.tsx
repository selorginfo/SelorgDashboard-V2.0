import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { otpSchema, type OtpFormValues } from "@/modules/auth/loginSchema";
import { authService } from "@/services/auth";
import { useSessionStore } from "@/store/sessionStore";
import { useUiStore } from "@/store/uiStore";
import type { Role } from "@/types/auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import styles from "./OtpPage.module.css";

export function OtpPage() {
  const navigate = useNavigate();
  const pendingOtpEmail = useSessionStore((s) => s.pendingOtpEmail);
  const role = useSessionStore((s) => s.pendingOtpRole);
  const completeOtp = useSessionStore((s) => s.completeOtp);
  const defaultLanding = useUiStore((s) => s.defaultLanding);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  // completeOtp() clears pendingOtpEmail on success, which would otherwise make the guard below
  // fire and bounce back to /login in the same tick as the intended navigate("/dashboard").
  const [verified, setVerified] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema), defaultValues: { code: "" } });

  useEffect(() => {
    setResent(false);
  }, [pendingOtpEmail]);

  if (!pendingOtpEmail && !verified) {
    return <Navigate to="/login" replace />;
  }

  async function onSubmit(values: OtpFormValues) {
    setAuthError(null);
    try {
      const user = await authService.verifyOtp(pendingOtpEmail as string, values.code, role as Role);
      setVerified(true);
      completeOtp(user);
      navigate(defaultLanding || "/dashboard", { replace: true });
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unable to verify code.");
    }
  }

  async function onResend() {
    await authService.resendOtp(pendingOtpEmail as string);
    setResent(true);
  }

  return (
    <div className={styles.wrap}>
      <Card className={styles.card}>
        <div className={styles.icon}>
          <ShieldCheck size={20} />
        </div>
        <div className={styles.title}>Two-factor verification</div>
        <div className={styles.desc}>
          Enter the 6-digit code from your authenticator app. Signing in as{" "}
          <strong>{role}</strong>.
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <input
            className={styles.codeInput}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            {...register("code")}
          />
          {errors.code ? <div className={styles.fieldError}>{errors.code.message}</div> : null}
          {authError ? <div className={styles.errorBanner}>{authError}</div> : null}

          <Button type="submit" variant="primary" isLoading={isSubmitting} className={styles.submit}>
            Verify &amp; sign in
          </Button>
        </form>

        <div className={styles.footerRow}>
          <button type="button" className={styles.backBtn} onClick={() => navigate("/login")}>
            ← Back
          </button>
          <button type="button" className={styles.resendBtn} onClick={onResend}>
            {resent ? "Code resent" : "Resend code"}
          </button>
        </div>
      </Card>
    </div>
  );
}
