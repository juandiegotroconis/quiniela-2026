import "./VerifyEmailScreen.css";
import { useLocation, useNavigate } from "react-router";
import { Icon } from "@iconify/react";

export default function VerifyEmailScreen() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const email = (state as { email?: string } | null)?.email;

  return (
    <div className="verify-email">
      <div className="verify-email__inner">
        <div className="verify-email__logo">
          <img
            src="/logo-black.svg"
            alt="FIFA World Cup 2026"
            className="verify-email__logo-img"
          />
        </div>

        <div className="verify-email__icon">
          <Icon icon="mdi:email-check-outline" />
        </div>

        <h1 className="verify-email__title">Check your email</h1>

        <p className="verify-email__body">
          We sent a verification link to
        </p>
        <p className="verify-email__email">{email ?? "your email address"}</p>
        <p className="verify-email__body">
          Click the link in the email to activate your account, then come back to log in.
        </p>

        <button
          className="verify-email__back"
          onClick={() => navigate("/login")}
        >
          Back to Log In
        </button>

        <p className="verify-email__hint">
          Can't find it? Check your spam folder.
        </p>
      </div>
    </div>
  );
}
