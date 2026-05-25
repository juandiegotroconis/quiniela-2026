import "./TopNav.css";
import { NavLink, useNavigate } from "react-router";
import Avatar from "./Avatar";
import { useAuth } from "~/lib/auth-context";
import { ME_ID } from "~/lib/mock-data";

export default function TopNav() {
  const { user } = useAuth();
  const displayName = user?.name ?? "You";

  return (
    <header className='top-nav'>
      <NavLink to='/rankings' className='top-nav__logo'>
        <img
          src='/logo-white.png'
          alt='FWC26 Quiniela Logo'
          className='top-nav__logo-icon'
        />
        <span>FWC26</span>
        <span className='top-nav__logo-sub'>Quiniela</span>
      </NavLink>

      <nav className='top-nav__nav'>
        {[
          { to: "/rankings", label: "Rankings" },
          { to: "/matches", label: "Matches" },
          { to: "/groups", label: "Groups" },
        ].map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `top-nav__btn${isActive ? " top-nav__btn--active" : ""}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <NavLink
        to='/profile'
        className={({ isActive }) =>
          `top-nav__profile${isActive ? " top-nav__profile--active" : ""}`
        }
      >
        <Avatar name={displayName} index={ME_ID - 1} size={32} />
        <span className='top-nav__profile-name'>{displayName}</span>
      </NavLink>
    </header>
  );
}
