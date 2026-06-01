import "./AuthScreen.css";
import "./ResetPasswordScreen.css";
import { useState } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "~/lib/auth-context";
import { useNavigate } from "react-router";
import { useTranslation } from "~/hooks/useTranslation";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { resetPassword, isPasswordRecovery } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError(t('RESET_PASSWORD_ERROR_TOO_SHORT'));
      return;
    }
    if (password !== confirm) {
      setError(t('RESET_PASSWORD_ERROR_MISMATCH'));
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
          <img src='/logo-black.svg' alt={t('APP_LOGO_ALT')} className='auth-screen__logo-img' />
          <p className='auth-screen__tagline'>{t('TAGLINE')}</p>
        </div>

        {done ? (
          <div className='auth-screen__forgot-success'>
            <Icon icon='mdi:check-circle-outline' width={40} height={40} className='auth-screen__forgot-success-icon' />
            <p className='auth-screen__forgot-success-title'>{t('RESET_PASSWORD_SUCCESS_TITLE')}</p>
            <p className='auth-screen__forgot-success-body'>{t('RESET_PASSWORD_SUCCESS_BODY')}</p>
            <button className='auth-screen__submit reset-password__go-btn' onClick={() => navigate("/login")}>
              {t('RESET_PASSWORD_GO_TO_LOGIN')}
            </button>
          </div>
        ) : !isPasswordRecovery ? (
          <div className='auth-screen__forgot-success'>
            <Icon icon='mdi:link-off' width={40} height={40} className='reset-password__invalid-icon' />
            <p className='auth-screen__forgot-success-title'>{t('RESET_PASSWORD_INVALID_TITLE')}</p>
            <p className='auth-screen__forgot-success-body'>
              {t('RESET_PASSWORD_INVALID_BODY')}
            </p>
            <button className='auth-screen__back-link' onClick={() => navigate("/login")}>
              {t('AUTH_BACK_TO_LOG_IN')}
            </button>
          </div>
        ) : (
          <>
            <div className='auth-screen__forgot-header'>
              <p className='auth-screen__forgot-title'>{t('RESET_PASSWORD_TITLE')}</p>
              <p className='auth-screen__forgot-subtitle'>{t('RESET_PASSWORD_SUBTITLE')}</p>
            </div>
            <form className='auth-screen__form' onSubmit={handleSubmit}>
              <div className='auth-screen__field'>
                <label className='auth-screen__label'>{t('RESET_PASSWORD_LABEL_NEW')}</label>
                <div className='auth-screen__input-wrap'>
                  <input
                    type={showPassword ? "text" : "password"}
                    className='auth-screen__input auth-screen__input--with-toggle'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('AUTH_PLACEHOLDER_PASSWORD')}
                    autoFocus
                  />
                  <button
                    type='button'
                    className='auth-screen__input-toggle'
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? t('AUTH_HIDE_PASSWORD') : t('AUTH_SHOW_PASSWORD')}
                  >
                    <Icon icon={showPassword ? "mdi:eye-off" : "mdi:eye"} width={18} height={18} />
                  </button>
                </div>
              </div>
              <div className='auth-screen__field'>
                <label className='auth-screen__label'>{t('RESET_PASSWORD_LABEL_CONFIRM')}</label>
                <input
                  type={showPassword ? "text" : "password"}
                  className='auth-screen__input'
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t('AUTH_PLACEHOLDER_PASSWORD')}
                />
              </div>
              {error && <div className='auth-screen__error'>{error}</div>}
              <button type='submit' className='auth-screen__submit' disabled={loading}>
                {loading ? t('RESET_PASSWORD_UPDATING') : t('RESET_PASSWORD_SUBMIT')}
              </button>
            </form>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
