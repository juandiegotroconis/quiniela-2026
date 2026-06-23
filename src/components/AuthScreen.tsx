import "./AuthScreen.css";
import { useState } from "react";
import { Icon } from "@iconify/react";
import { useAuth } from "~/lib/auth-context";
import { useNavigate } from "react-router";
import { useTranslation } from "~/hooks/useTranslation";
import { useLogo } from "~/hooks/useLogo";

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const { login, signup, forgotPassword, signInWithPasskey } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const logoSrc = useLogo();
  const passkeysSupported =
    typeof window !== "undefined" && "PublicKeyCredential" in window;

  const handlePasskeyLogin = async () => {
    setError("");
    setPasskeyLoading(true);
    const err = await signInWithPasskey();
    setPasskeyLoading(false);
    if (err) {
      setError(err);
      return;
    }
    navigate("/rankings");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "forgot") {
      if (!email) {
        setError(t("AUTH_ERROR_ENTER_EMAIL"));
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
      setError(t("AUTH_ERROR_FILL_ALL_FIELDS"));
      return;
    }
    if (mode === "signup" && !name) {
      setError(t("AUTH_ERROR_ENTER_NAME"));
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
      navigate("/rankings");
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
              src={logoSrc}
              alt={t("APP_LOGO_ALT")}
              className='auth-screen__logo-img'
            />
            <p className='auth-screen__tagline'>{t("TAGLINE")}</p>
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
                  {t("FORGOT_SUCCESS_TITLE")}
                </p>
                <p className='auth-screen__forgot-success-body'>
                  {t("FORGOT_SUCCESS_BODY")} <strong>{email}</strong>.
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
                  {t("AUTH_BACK_TO_LOG_IN")}
                </button>
              </div>
            ) : (
              <>
                <div className='auth-screen__forgot-header'>
                  <p className='auth-screen__forgot-title'>
                    {t("FORGOT_PASSWORD_TITLE")}
                  </p>
                  <p className='auth-screen__forgot-subtitle'>
                    {t("FORGOT_PASSWORD_SUBTITLE")}
                  </p>
                </div>
                <form className='auth-screen__form' onSubmit={handleSubmit}>
                  <div className='auth-screen__field'>
                    <label className='auth-screen__label'>
                      {t("AUTH_LABEL_EMAIL")}
                    </label>
                    <input
                      type='email'
                      className='auth-screen__input'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("AUTH_PLACEHOLDER_EMAIL")}
                      autoFocus
                    />
                  </div>
                  {error && <div className='auth-screen__error'>{error}</div>}
                  <button
                    type='submit'
                    className='auth-screen__submit'
                    disabled={loading}
                  >
                    {loading
                      ? t("FORGOT_PASSWORD_SENDING")
                      : t("FORGOT_PASSWORD_SEND_LINK")}
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
                    {t("AUTH_BACK_TO_LOG_IN")}
                  </button>
                </div>
              </>
            )
          ) : (
            <>
              {mode === "login" && passkeysSupported && (
                <>
                  <button
                    type='button'
                    className='auth-screen__passkey-btn'
                    onClick={handlePasskeyLogin}
                    disabled={passkeyLoading}
                  >
                    <Icon
                      icon='material-symbols:passkey-rounded'
                      width={22}
                      height={22}
                      className='auth-screen__passkey-icon'
                    />
                    {passkeyLoading
                      ? t("AUTH_PLEASE_WAIT")
                      : t("AUTH_LOG_IN_WITH_PASSKEY")}
                  </button>
                  <div className='auth-screen__divider'>
                    <span>{t("AUTH_OR_DIVIDER")}</span>
                  </div>
                </>
              )}

              <form className='auth-screen__form' onSubmit={handleSubmit}>
                {mode === "signup" && (
                  <div className='auth-screen__field'>
                    <label className='auth-screen__label'>
                      {t("AUTH_LABEL_FULL_NAME")}
                    </label>
                    <input
                      type='text'
                      className='auth-screen__input'
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("AUTH_PLACEHOLDER_NAME")}
                    />
                  </div>
                )}
                <div className='auth-screen__field'>
                  <label className='auth-screen__label'>
                    {t("AUTH_LABEL_EMAIL")}
                  </label>
                  <input
                    type='email'
                    className='auth-screen__input'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("AUTH_PLACEHOLDER_EMAIL")}
                  />
                </div>
                <div className='auth-screen__field'>
                  <label className='auth-screen__label'>
                    {t("AUTH_LABEL_PASSWORD")}
                  </label>
                  <div className='auth-screen__input-wrap'>
                    <input
                      type={showPassword ? "text" : "password"}
                      className='auth-screen__input auth-screen__input--with-toggle'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("AUTH_PLACEHOLDER_PASSWORD")}
                    />
                    <button
                      type='button'
                      className='auth-screen__input-toggle'
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={
                        showPassword
                          ? t("AUTH_HIDE_PASSWORD")
                          : t("AUTH_SHOW_PASSWORD")
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
                    ? t("AUTH_PLEASE_WAIT")
                    : mode === "login"
                      ? t("AUTH_LOG_IN")
                      : t("AUTH_CREATE_ACCOUNT")}
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
                    {t("AUTH_FORGOT_PASSWORD")}
                  </button>
                </div>
              )}

              <div className='auth-screen__footer'>
                {mode === "login" ? (
                  <>
                    {t("AUTH_NO_ACCOUNT_PROMPT")}{" "}
                    <button
                      className='auth-screen__footer-link auth-screen__footer-link--btn'
                      onClick={() => switchMode("signup")}
                    >
                      {t("AUTH_SIGN_UP")}
                    </button>
                  </>
                ) : (
                  <>
                    {t("AUTH_HAVE_ACCOUNT_PROMPT")}{" "}
                    <button
                      className='auth-screen__footer-link auth-screen__footer-link--btn'
                      onClick={() => switchMode("login")}
                    >
                      {t("AUTH_LOG_IN")}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
