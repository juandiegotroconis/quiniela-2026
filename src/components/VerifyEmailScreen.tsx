import "./VerifyEmailScreen.css";
import { useLocation, useNavigate } from "react-router";
import { Icon } from "@iconify/react";
import { useTranslation } from "~/hooks/useTranslation";
import { useLogo } from "~/hooks/useLogo";

export default function VerifyEmailScreen() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const logoSrc = useLogo();
  const email = (state as { email?: string } | null)?.email;

  return (
    <div className="verify-email">
      <div className="verify-email__inner">
        <div className="verify-email__logo">
          <img
            src={logoSrc}
            alt={t('APP_LOGO_ALT')}
            className="verify-email__logo-img"
          />
        </div>

        <div className="verify-email__icon">
          <Icon icon="mdi:email-check-outline" />
        </div>

        <h1 className="verify-email__title">{t('VERIFY_EMAIL_TITLE')}</h1>

        <p className="verify-email__body">
          {t('VERIFY_EMAIL_BODY_SENT')}
        </p>
        <p className="verify-email__email">{email ?? t('VERIFY_EMAIL_FALLBACK_ADDRESS')}</p>
        <p className="verify-email__body">
          {t('VERIFY_EMAIL_BODY_INSTRUCTIONS')}
        </p>

        <button
          className="verify-email__back"
          onClick={() => navigate("/login")}
        >
          {t('VERIFY_EMAIL_BACK')}
        </button>

        <p className="verify-email__hint">
          {t('VERIFY_EMAIL_HINT')}
        </p>
      </div>
    </div>
  );
}
