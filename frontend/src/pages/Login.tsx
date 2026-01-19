// src/pages/Login.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, type LoginInput } from "../lib/zodSchemas";
import { useAuth } from "../state/AuthContext";
import { useState } from "react";
import { getErrorMessage } from "../lib/api";
import { Link, useNavigate, useLocation } from "react-router-dom";

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M12 11v3.8h5.4c-.2 1.4-1.6 4-5.4 4-3.2 0-5.8-2.7-5.8-6s2.6-6 5.8-6c1.8 0 3 .7 3.7 1.3l2.5-2.4C16.8 4 14.6 3 12 3 6.9 3 2.8 7 2.8 12s4.1 9 9.2 9c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1-.2-1.4H12z"
        fill="currentColor"
      />
    </svg>
  );
}

function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOffIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function Login() {
  const { login, loginWithGoogle } = useAuth() as any;
  const navigate = useNavigate();
  const location = useLocation();

  const [serverError, setServerError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  function getPostLoginRedirect(): string {
    const params = new URLSearchParams(location.search);

    if (params.get("from") === "editor") {
      const pid = params.get("project") || params.get("pid") || params.get("id");
      const share = params.get("share");
      if (pid) {
        return `/project/${pid}${share ? `?share=${encodeURIComponent(share)}` : ""}`;
      }
    }

    const qpNext = params.get("next") || params.get("redirect");
    if (qpNext && qpNext.startsWith("/")) return qpNext;

    const st: any = (location as any).state;
    if (st?.from && typeof st.from === "string" && st.from.startsWith("/")) {
      return st.from;
    }

    try {
      const ss = sessionStorage.getItem("postLoginRedirect");
      if (ss && ss.startsWith("/")) return ss;
    } catch {}

    return "/app";
  }

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate(getPostLoginRedirect(), { replace: true });
    } catch (e) {
      setServerError(getErrorMessage(e));
    }
  };

  const onGoogle = async () => {
    try {
      if (typeof loginWithGoogle === "function") {
        await loginWithGoogle(getPostLoginRedirect());
        return;
      }
      const base = (import.meta as any).env?.VITE_API_URL || "";
      const redirectPath = getPostLoginRedirect();
      const redirectAbs = `${window.location.origin}${redirectPath}`;
      const url = `${String(base).replace(/\/$/, "")}/auth/google?redirect=${encodeURIComponent(redirectAbs)}`;
      window.location.href = url;
    } catch (e) {
      setServerError(getErrorMessage(e));
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 gradient-mesh flex items-center justify-center px-4 py-10 transition-colors duration-300">
      <div className="w-full max-w-md animate-fade-in">
        {/* Card */}
        <div className="card glass p-6 md:p-8 shadow-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl gradient-primary text-white grid place-items-center shadow-glow">
              <span className="text-lg font-bold tracking-tight">UML</span>
            </div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
              Bienvenido de vuelta
            </h1>
            <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
              Ingresa con tu correo o usa tu cuenta de Google
            </p>
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={onGoogle}
            className="btn-secondary w-full mb-6 group"
            disabled={isSubmitting}
          >
            <GoogleIcon className="h-5 w-5 text-surface-600 dark:text-surface-300 group-hover:scale-110 transition-transform" />
            Continuar con Google
          </button>

          {/* Divider */}
          <div className="divider mb-6">o con email</div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300">
                Email
              </label>
              <input
                {...register("email")}
                placeholder="tucorreo@ejemplo.com"
                className={`input ${errors.email ? "border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                autoComplete="email"
                inputMode="email"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                  Contraseña
                </label>
                <Link
                  to="/reset-password"
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  {...register("password")}
                  placeholder="••••••••"
                  className={`input pr-12 ${errors.password ? "border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>

              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300 animate-fade-in">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {serverError}
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              disabled={isSubmitting}
              className="btn-primary w-full mt-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Ingresando…
                </>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-surface-600 dark:text-surface-400">
            ¿No tienes cuenta?{" "}
            <Link
              to="/register"
              className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              Regístrate gratis
            </Link>
          </p>
        </div>

        {/* Terms */}
        <p className="mt-6 text-center text-xs text-surface-400 dark:text-surface-500">
          Al continuar aceptas nuestros{" "}
          <a href="#" className="hover:text-surface-600 dark:hover:text-surface-300 underline">Términos</a>
          {" "}y{" "}
          <a href="#" className="hover:text-surface-600 dark:hover:text-surface-300 underline">Política de Privacidad</a>.
        </p>
      </div>
    </div>
  );
}
