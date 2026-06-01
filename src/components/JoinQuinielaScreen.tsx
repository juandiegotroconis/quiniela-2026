import "./JoinQuinielaScreen.css";
import {
  useState,
  useRef,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";
import { useAuth } from "~/lib/auth-context";
import { useNavigate } from "react-router";
import { useTranslation } from "~/hooks/useTranslation";

const CODE_LENGTH = 6;

export default function JoinQuinielaScreen() {
  const { joinWithCode, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const focus = (i: number) => inputs.current[i]?.focus();

  const handleChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    if (digit && i < CODE_LENGTH - 1) focus(i + 1);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) focus(i - 1);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = [...digits];
    for (let j = 0; j < pasted.length; j++) next[j] = pasted[j];
    setDigits(next);
    focus(Math.min(pasted.length, CODE_LENGTH - 1));
  };

  const handleSubmit = async () => {
    const code = digits.join("");
    if (code.length < CODE_LENGTH) {
      setError(t('JOIN_QUINIELA_ERROR_INCOMPLETE'));
      return;
    }
    setError("");
    setLoading(true);
    const err = await joinWithCode(code);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    navigate("/rankings");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className='join-screen'>
      <div className='join-screen__inner'>
        <div className='join-screen__logo'>
          <img
            src='/logo-black.svg'
            alt={t('APP_LOGO_ALT')}
            className='join-screen__logo-img'
          />
          <p className='join-screen__tagline'>{t('TAGLINE_ALT')}</p>
        </div>

        <div className='join-screen__card'>
          <h2 className='join-screen__title'>{t('JOIN_QUINIELA_TITLE')}</h2>
          <p className='join-screen__subtitle'>
            {t('JOIN_QUINIELA_SUBTITLE')}
          </p>

          <div className='join-screen__otp'>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                type='text'
                inputMode='numeric'
                maxLength={1}
                className={`join-screen__otp-input${error ? " join-screen__otp-input--error" : ""}`}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && <div className='join-screen__error'>{error}</div>}

          <button
            className='join-screen__submit'
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? t('JOIN_QUINIELA_JOINING') : t('JOIN_QUINIELA_SUBMIT')}
          </button>
        </div>

        <button className='join-screen__logout' onClick={handleLogout}>
          {t('JOIN_QUINIELA_SIGN_OUT')}
        </button>
      </div>
    </div>
  );
}
