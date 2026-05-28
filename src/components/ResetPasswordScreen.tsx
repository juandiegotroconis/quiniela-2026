import "./AuthScreen.css";
import "./ResetPasswordScreen.css";
import { useState } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "~/lib/auth-context";
import { useNavigate } from "react-router";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { resetPassword, isPasswordRecovery } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const err = await resetPassword(password);
    setLoading(false);
    if (err) { setError(err); return; }
    setDone(true);
  };

  return (
    <div className='auth-screen'>
      <div className='auth-screen__inner'>
        <div className='auth-screen__stripe' />
        <div className='auth-screen__content'>
        <div className='auth-screen__logo'>
          <img src='/logo-black.svg' alt='FIFA World Cup 2026' className='auth-screen__logo-img' />
          <p className='auth-screen__tagline'>Predict · Compete · Win</p>
        </div>

        {done ? (
          <div className='auth-screen__forgot-success'>
            <Icon icon='mdi:check-circle-outline' width={40} height={40} className='auth-screen__forgot-success-icon' />
            <p className='auth-screen__forgot-success-title'>Password updated</p>
            <p className='auth-screen__forgot-success-body'>Your password has been changed successfully.</p>
            <button className='auth-screen__submit reset-password__go-btn' onClick={() => navigate("/login")}>
              Go to Log In
            </button>
          </div>
        ) : !isPasswordRecovery ? (
          <div className='auth-screen__forgot-success'>
            <Icon icon='mdi:link-off' width={40} height={40} className='reset-password__invalid-icon' />
            <p className='auth-screen__forgot-success-title'>Invalid link</p>
            <p className='auth-screen__forgot-success-body'>
              This reset link is invalid or has expired. Please request a new one.
            </p>
            <button className='auth-screen__back-link' onClick={() => navigate("/login")}>
              Back to Log In
            </button>
          </div>
        ) : (
          <>
            <div className='auth-screen__forgot-header'>
              <p className='auth-screen__forgot-title'>New password</p>
              <p className='auth-screen__forgot-subtitle'>Choose a new password for your account.</p>
            </div>
            <form className='auth-screen__form' onSubmit={handleSubmit}>
              <div className='auth-screen__field'>
                <label className='auth-screen__label'>New Password</label>
                <div className='auth-screen__input-wrap'>
                  <input
                    type={showPassword ? "text" : "password"}
                    className='auth-screen__input auth-screen__input--with-toggle'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder='••••••••'
                    autoFocus
                  />
                  <button
                    type='button'
                    className='auth-screen__input-toggle'
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon icon={showPassword ? "mdi:eye-off" : "mdi:eye"} width={18} height={18} />
                  </button>
                </div>
              </div>
              <div className='auth-screen__field'>
                <label className='auth-screen__label'>Confirm Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  className='auth-screen__input'
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder='••••••••'
                />
              </div>
              {error && <div className='auth-screen__error'>{error}</div>}
              <button type='submit' className='auth-screen__submit' disabled={loading}>
                {loading ? "Updating…" : "Update Password"}
              </button>
            </form>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
