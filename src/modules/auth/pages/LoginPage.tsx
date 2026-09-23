import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { loginSchema, type LoginFormValues } from "@/modules/auth/loginSchema";
import { authService } from "@/services/auth";
import { useSessionStore } from "@/store/sessionStore";
import { useUiStore } from "@/store/uiStore";
import { ROLES } from "@/types/auth";
import type { AdminUser } from "@/types/auth";
import { Input, FieldLabel } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import styles from "./LoginPage.module.css";

const LOGIN_HIGHLIGHTS = [
  { label: "Warehouse → doorstep" },
  { label: "Pickers & riders" },
  { label: "Live order ops" },
  { label: "Role-scoped access" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const requireOtp = useSessionStore((s) => s.requireOtp);
  const completeOtp = useSessionStore((s) => s.completeOtp);
  const defaultLanding = useUiStore((s) => s.defaultLanding);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", role: "Operations Admin" },
  });

  const role = watch("role");

  async function onSubmit(values: LoginFormValues) {
    setAuthError(null);
    try {
      const result = await authService.login(values);
      if (result.requiresOtp) {
        requireOtp(result.email, values.role);
        navigate("/otp");
      } else {
        // Real mode: token already set, user returned directly — skip OTP screen
        completeOtp(result.user as AdminUser);
        navigate(defaultLanding || "/dashboard", { replace: true });
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unable to sign in.");
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.brand}>
        <div className={styles.brandTop}>
          <div className={styles.mark}>S</div>
          <div>
            <div className={styles.brandName}>Selorg</div>
            <div className={styles.brandSub}>Dark store operations</div>
          </div>
        </div>
        <div className={styles.pitch}>
          <div className={styles.headline}>
            One console for warehouse, dark stores, pickers and riders.
          </div>
          <div className={styles.subline}>
            Central warehouse receiving through to the customer&rsquo;s doorstep — every order,
            transfer, scan and settlement in one place.
          </div>
        </div>
        <div className={styles.stats}>
          {LOGIN_HIGHLIGHTS.map((s) => (
            <div key={s.label}>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.formSide}>
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.formTitle}>Sign in</div>
          <div className={styles.formSub}>
            Use your Selorg work account. Access is scoped to your role.
          </div>

          <FieldLabel>Work email</FieldLabel>
          <Input
            type="email"
            placeholder="arun@selorg.in"
            autoComplete="username"
            error={errors.email?.message}
            {...register("email")}
          />

          <div className={styles.spacer} />
          <FieldLabel>Password</FieldLabel>
          <Input
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />

          <div className={styles.spacer} />
          <FieldLabel>Sign in as</FieldLabel>
          <Select
            value={role}
            onValueChange={(v) => setValue("role", v as LoginFormValues["role"])}
            options={ROLES.map((r) => ({ value: r, label: r }))}
            aria-label="Sign in as"
          />

          {authError ? <div className={styles.errorBanner}>{authError}</div> : null}

          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className={styles.submit}
          >
            Continue
          </Button>

          <div className={styles.footerRow}>
            <a href="#forgot">Forgot password?</a>
            <span className={styles.sso}>SSO available for admins</span>
          </div>

          <div className={styles.securityNote}>
            <ShieldCheck size={13} />
            Protected by two-factor authentication. Every sign-in and admin action is written to
            the audit log.
          </div>
        </form>
      </div>
    </div>
  );
}
