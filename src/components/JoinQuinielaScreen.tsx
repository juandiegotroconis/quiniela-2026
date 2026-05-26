import "./JoinQuinielaScreen.css";
import {
  useState,
  useRef,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";
import { useAuth } from "~/lib/auth-context";
import { useNavigate } from "react-router";

const CODE_LENGTH = 6;

export default function JoinQuinielaScreen() {
  const { joinWithCode, logout } = useAuth();
  const navigate = useNavigate();
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
      setError("Please enter all 6 digits.");
      return;
    }
    setError("");
    setLoading(true);
    const err = await joinWithCode(code);
    setLoading(false);
    if (err) {
      setError(err);
      setDigits(Array(CODE_LENGTH).fill(""));
      focus(0);
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
            alt='FIFA World Cup 2026'
            className='join-screen__logo-img'
          />
          <p className='join-screen__tagline'>Predict. Compete. Win.</p>
        </div>

        <div className='join-screen__card'>
          <h2 className='join-screen__title'>Join a Quiniela</h2>
          <p className='join-screen__subtitle'>
            Enter the 6-digit code from your group organizer to access the
            tournament.
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
            {loading ? "Joining…" : "Join Quiniela"}
          </button>
        </div>

        <button className='join-screen__logout' onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </div>
  );
}
