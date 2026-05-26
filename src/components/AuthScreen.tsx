import "./AuthScreen.css";
import { useState } from "react";
import { useAuth } from "~/lib/auth-context";
import { useNavigate } from "react-router";

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
      setError(err);
      return;
    }
    // Login: navigate to app. Signup: auth state change drives to JoinQuinielaScreen.
    if (mode === "login") navigate("/rankings");
  };

  return (
    <div className='auth-screen'>
      <div className='auth-screen__inner'>
        <div className='auth-screen__logo'>
          <img
            src='/logo-black.svg'
            alt='FIFA World Cup 2026'
            className='auth-screen__logo-img'
          />
          <p className='auth-screen__tagline'>Predict. Compete. Win.</p>
        </div>

        <div className='auth-screen__toggle'>
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              className={`auth-screen__toggle-btn${mode === m ? " auth-screen__toggle-btn--active" : ""}`}
              onClick={() => {
                setMode(m);
                setError("");
              }}
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
            <input
              type='password'
              className='auth-screen__input'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='••••••••'
            />
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
            <a
              href='#'
              className='auth-screen__footer-link'
              onClick={(e) => e.preventDefault()}
            >
              Forgot password?
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
