import './StreakWidgets.css';
import { Link } from 'react-router';
import { useTranslation } from '~/hooks/useTranslation';
import type { TranslationKey } from '~/lib/translation-context';
import Avatar from './Avatar';
import type { Member } from '~/lib/types';

interface Item {
  key: string;
  icon: string;
  labelKey: TranslationKey;
  member: Member | null;
  value: number;
  tone: 'hot' | 'cold';
}

interface Props {
  currentHot: Member | null;
  currentCold: Member | null;
  allTimeHot: Member | null;
  allTimeCold: Member | null;
}

export default function StreakWidgets({ currentHot, currentCold, allTimeHot, allTimeCold }: Props) {
  const { t } = useTranslation();

  const allItems: Item[] = [
    {
      key: 'current-hot',
      icon: '🔥',
      labelKey: 'RANKINGS_STREAK_CURRENT_BEST_LABEL',
      member: currentHot,
      value: currentHot?.currentStreak ?? 0,
      tone: 'hot',
    },
    {
      key: 'current-cold',
      icon: '🥶',
      labelKey: 'RANKINGS_STREAK_CURRENT_WORST_LABEL',
      member: currentCold,
      value: Math.abs(currentCold?.currentStreak ?? 0),
      tone: 'cold',
    },
    {
      key: 'alltime-hot',
      icon: '🏆',
      labelKey: 'RANKINGS_STREAK_BEST_LABEL',
      member: allTimeHot,
      value: allTimeHot?.bestStreak ?? 0,
      tone: 'hot',
    },
    {
      key: 'alltime-cold',
      icon: '💀',
      labelKey: 'RANKINGS_STREAK_WORST_LABEL',
      member: allTimeCold,
      value: allTimeCold?.worstStreak ?? 0,
      tone: 'cold',
    },
  ];
  const items = allItems.filter(item => item.member && item.value > 1);

  if (items.length === 0) return null;

  return (
    <div className="streak-widgets">
      {items.map(item => (
        <Link
          key={item.key}
          to={`/player/${item.member!.userId}`}
          className={`streak-widget streak-widget--${item.tone}`}
        >
          <span className="streak-widget__icon">{item.icon}</span>
          <div className="streak-widget__body">
            <span className="streak-widget__label">{t(item.labelKey)}</span>
            <div className="streak-widget__player">
              <Avatar name={item.member!.displayName} color={item.member!.avatarColor} size={24} />
              <span className="streak-widget__name">{item.member!.displayName}</span>
            </div>
          </div>
          <span className="streak-widget__count">
            {item.value}
            <span className="streak-widget__count-label">{t('RANKINGS_STREAK_IN_A_ROW')}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
