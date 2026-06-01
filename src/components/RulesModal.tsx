import './RulesModal.css';
import { useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from '~/hooks/useTranslation';

interface Props {
  onClose: () => void;
}

export default function RulesModal({ onClose }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className='rules-modal__overlay' onClick={onClose}>
      <div className='rules-modal__sheet' onClick={(e) => e.stopPropagation()}>
        <div className='rules-modal__header'>
          <h2 className='rules-modal__title'>{t('RULES_TITLE')}</h2>
          <button className='rules-modal__close' onClick={onClose} aria-label='Close'>
            <Icon icon='mdi:close' width={20} />
          </button>
        </div>

        <div className='rules-modal__body'>
          <p className='rules-modal__intro'>{t('RULES_INTRO')}</p>

          {/* Group Stage */}
          <div className='rules-modal__section'>
            <h3 className='rules-modal__section-title'>
              <Icon icon='mdi:calendar-month' width={16} />
              {t('RULES_GROUP_STAGE_TITLE')}
            </h3>

            <RuleRow pts={5} title={t('RULES_GROUP_5_TITLE')} variant='exact'>
              <p>{t('RULES_GROUP_5_BODY')}</p>
              <Example>{t('RULES_GROUP_5_EXAMPLE_WIN')}</Example>
              <Example>{t('RULES_GROUP_5_EXAMPLE_DRAW')}</Example>
            </RuleRow>

            <RuleRow pts={3} title={t('RULES_GROUP_3_TITLE')} variant='winner'>
              <p>{t('RULES_GROUP_3_BODY')}</p>
              <Example>{t('RULES_GROUP_3_EXAMPLE_WIN')}</Example>
              <Example>{t('RULES_GROUP_3_EXAMPLE_DRAW')}</Example>
            </RuleRow>

            <RuleRow pts={0} title={t('RULES_GROUP_0_TITLE')} variant='miss'>
              <p>{t('RULES_GROUP_0_BODY')}</p>
            </RuleRow>
          </div>

          {/* Knockout Stage */}
          <div className='rules-modal__section'>
            <h3 className='rules-modal__section-title'>
              <Icon icon='mdi:trophy-outline' width={16} />
              {t('RULES_KNOCKOUT_STAGE_TITLE')}
            </h3>
            <p className='rules-modal__section-intro'>{t('RULES_KNOCKOUT_INTRO')}</p>

            <RuleRow pts={5} title={t('RULES_KNOCKOUT_5_TITLE')} variant='exact'>
              <Example>{t('RULES_KNOCKOUT_5_BODY_WINNER')}</Example>
              <Example>{t('RULES_KNOCKOUT_5_BODY_PENALTIES')}</Example>
            </RuleRow>

            <RuleRow pts={4} title={t('RULES_KNOCKOUT_4_TITLE')} variant='four'>
              <p>{t('RULES_KNOCKOUT_4_BODY')}</p>
            </RuleRow>

            <RuleRow pts={3} title={t('RULES_KNOCKOUT_3_TITLE')} variant='winner'>
              <Example>{t('RULES_KNOCKOUT_3_BODY_WINNER')}</Example>
              <Example note>{t('RULES_KNOCKOUT_3_BODY_DRAW')}</Example>
            </RuleRow>
          </div>

          {/* Matchup Points */}
          <div className='rules-modal__section'>
            <h3 className='rules-modal__section-title'>
              <Icon icon='mdi:target' width={16} />
              {t('RULES_MATCHUP_TITLE')}
            </h3>
            <span className='rules-modal__subtitle-chip'>{t('RULES_MATCHUP_SUBTITLE')}</span>
            <p className='rules-modal__section-intro'>{t('RULES_MATCHUP_INTRO')}</p>

            <RuleRow pts='+2' title={t('RULES_MATCHUP_2_TITLE')} variant='matchup'>
              <p>{t('RULES_MATCHUP_2_BODY')}</p>
            </RuleRow>

            <RuleRow pts='+1' title={t('RULES_MATCHUP_1_TITLE')} variant='matchup'>
              <p>{t('RULES_MATCHUP_1_BODY')}</p>
            </RuleRow>

            <p className='rules-modal__note'>{t('RULES_MATCHUP_NOTE')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleRow({
  pts,
  title,
  variant,
  children,
}: {
  pts: number | string;
  title: string;
  variant: 'exact' | 'winner' | 'four' | 'miss' | 'matchup';
  children: React.ReactNode;
}) {
  return (
    <div className={`rules-modal__rule rules-modal__rule--${variant}`}>
      <div className='rules-modal__rule-bar' />
      <div className='rules-modal__rule-pts'>{pts}</div>
      <div className='rules-modal__rule-content'>
        <strong className='rules-modal__rule-title'>{title}</strong>
        {children}
      </div>
    </div>
  );
}

function Example({ children, note }: { children: React.ReactNode; note?: boolean }) {
  return (
    <p className={`rules-modal__example${note ? ' rules-modal__example--note' : ''}`}>
      {children}
    </p>
  );
}
