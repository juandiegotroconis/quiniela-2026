import "./TopNav.css";
import { NavLink } from "react-router";
import Avatar from "./Avatar";
import { useAuth } from "~/lib/auth-context";
import { useTranslation } from "~/hooks/useTranslation";
export default function TopNav() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const displayName = user?.name ?? t('PROFILE_YOU');

  return (
    <header className='top-nav'>
      <NavLink to='/rankings' className='top-nav__logo'>
        <img
          src='/logo-black.svg'
          alt={t('APP_LOGO_NAV_ALT')}
          className='top-nav__logo-icon'
        />
        <span>{t('APP_NAME')}</span>
        <span className='top-nav__logo-sub'>{t('APP_SUBTITLE')}</span>
      </NavLink>

      <nav className='top-nav__nav'>
        {[
          { to: "/rankings", label: t('NAV_RANKINGS') },
          { to: "/matches", label: t('NAV_MATCHES') },
          { to: "/groups", label: t('NAV_GROUPS') },
        ].map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `top-nav__btn${isActive ? " top-nav__btn--active" : ""}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <NavLink
        // to={`/player/${user?.id}`}
        to='/profile'
        className={({ isActive }) =>
          `top-nav__profile${isActive ? " top-nav__profile--active" : ""}`
        }
      >
        <Avatar
          name={displayName}
          size={32}
          color={user?.avatarColor ?? undefined}
        />
        <span className='top-nav__profile-name'>{displayName}</span>
      </NavLink>
    </header>
  );
}
