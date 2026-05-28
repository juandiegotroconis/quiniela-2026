import "./AuthScreen.css";
import { useState } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "~/lib/auth-context";
import { useNavigate } from "react-router";

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { login, signup, forgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "forgot") {
      if (!email) {
        setError("Please enter your email");
        return;
      }
      setLoading(true);
      const err = await forgotPassword(email);
      setLoading(false);
      if (err) {
        setError(err);
        return;
      }
      setForgotSent(true);
      return;
    }

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (mode === "signup" && !name) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    const err =
      mode === "login"
        ? await login(email, password)
        : await signup(email, password, name);
    setLoading(false);

    if (err) {
      if (mode === "login" && err.toLowerCase().includes("not confirmed")) {
        navigate("/verify-email", { state: { email } });
        return;
      }
      setError(err);
      return;
    }
    if (mode === "login") {
      navigate("/profile");
    } else {
      navigate("/verify-email", { state: { email } });
    }
  };

  const switchMode = (m: "login" | "signup") => {
    setMode(m);
    setError("");
    setPassword("");
  };

  return (
    <div className='auth-screen'>
      <div className='auth-screen__inner'>
        <div className='auth-screen__stripe' />
        <div className='auth-screen__content'>
          <div className='auth-screen__logo'>
            <img
              src='/logo-black.svg'
              alt='FIFA World Cup 2026'
              className='auth-screen__logo-img'
            />
            <p className='auth-screen__tagline'>Predict · Compete · Win</p>
          </div>

          {mode === "forgot" ? (
            forgotSent ? (
              <div className='auth-screen__forgot-success'>
                <Icon
                  icon='mdi:email-check-outline'
                  width={44}
                  height={44}
                  className='auth-screen__forgot-success-icon'
                />
                <p className='auth-screen__forgot-success-title'>
                  Check your inbox
                </p>
                <p className='auth-screen__forgot-success-body'>
                  We sent a password reset link to <strong>{email}</strong>.
                </p>
                <button
                  className='auth-screen__back-link'
                  onClick={() => {
                    setMode("login");
                    setForgotSent(false);
                    setEmail("");
                    setError("");
                  }}
                >
                  Back to Log In
                </button>
              </div>
            ) : (
              <>
                <div className='auth-screen__forgot-header'>
                  <p className='auth-screen__forgot-title'>Reset password</p>
                  <p className='auth-screen__forgot-subtitle'>
                    Enter your email and we'll send you a reset link.
                  </p>
                </div>
                <form className='auth-screen__form' onSubmit={handleSubmit}>
                  <div className='auth-screen__field'>
                    <label className='auth-screen__label'>Email</label>
                    <input
                      type='email'
                      className='auth-screen__input'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder='you@example.com'
                      autoFocus
                    />
                  </div>
                  {error && <div className='auth-screen__error'>{error}</div>}
                  <button
                    type='submit'
                    className='auth-screen__submit'
                    disabled={loading}
                  >
                    {loading ? "Sending…" : "Send Reset Link"}
                  </button>
                </form>
                <div className='auth-screen__footer'>
                  <button
                    className='auth-screen__back-link'
                    onClick={() => {
                      setMode("login");
                      setError("");
                    }}
                  >
                    Back to Log In
                  </button>
                </div>
              </>
            )
          ) : (
            <>
              <div className='auth-screen__toggle'>
                {(["login", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    className={`auth-screen__toggle-btn${mode === m ? " auth-screen__toggle-btn--active" : ""}`}
                    onClick={() => switchMode(m)}
                  >
                    {m === "login" ? "Log In" : "Sign Up"}
                  </button>
                ))}
              </div>

              <form className='auth-screen__form' onSubmit={handleSubmit}>
                {mode === "signup" && (
                  <div className='auth-screen__field'>
                    <label className='auth-screen__label'>Full Name</label>
                    <input
                      type='text'
                      className='auth-screen__input'
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder='Juan Rodríguez'
                    />
                  </div>
                )}
                <div className='auth-screen__field'>
                  <label className='auth-screen__label'>Email</label>
                  <input
                    type='email'
                    className='auth-screen__input'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder='you@example.com'
                  />
                </div>
                <div className='auth-screen__field'>
                  <label className='auth-screen__label'>Password</label>
                  <div className='auth-screen__input-wrap'>
                    <input
                      type={showPassword ? "text" : "password"}
                      className='auth-screen__input auth-screen__input--with-toggle'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder='••••••••'
                    />
                    <button
                      type='button'
                      className='auth-screen__input-toggle'
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      <Icon
                        icon={showPassword ? "mdi:eye-off" : "mdi:eye"}
                        width={18}
                        height={18}
                      />
                    </button>
                  </div>
                </div>

                {error && <div className='auth-screen__error'>{error}</div>}

                <button
                  type='submit'
                  className='auth-screen__submit'
                  disabled={loading}
                >
                  {loading
                    ? "Please wait…"
                    : mode === "login"
                      ? "Log In"
                      : "Create Account"}
                </button>
              </form>

              {mode === "login" && (
                <div className='auth-screen__footer'>
                  <button
                    className='auth-screen__footer-link auth-screen__footer-link--btn'
                    onClick={() => {
                      setMode("forgot");
                      setError("");
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
