import "./MatchFiltersDrawer.css";
import { useEffect } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "~/hooks/useTranslation";

export interface FilterOption {
  id: string;
  label: string;
}

interface Props {
  onClose: () => void;
  onClearAll: () => void;
  status: string;
  onStatusChange: (id: string) => void;
  statusOptions: FilterOption[];
  stage: string;
  onStageChange: (id: string) => void;
  stageOptions: FilterOption[];
  group: string;
  onGroupChange: (id: string) => void;
  groupOptions: FilterOption[];
  knockoutStage: string;
  onKnockoutStageChange: (id: string) => void;
  knockoutStageOptions: FilterOption[];
  date: string;
  onDateChange: (value: string) => void;
  dateMin: string;
  dateMax: string;
}

export default function MatchFiltersDrawer({
  onClose,
  onClearAll,
  status,
  onStatusChange,
  statusOptions,
  stage,
  onStageChange,
  stageOptions,
  group,
  onGroupChange,
  groupOptions,
  knockoutStage,
  onKnockoutStageChange,
  knockoutStageOptions,
  date,
  onDateChange,
  dateMin,
  dateMax,
}: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className='match-filters-drawer__overlay' onClick={onClose}>
      <div
        className='match-filters-drawer__sheet'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='match-filters-drawer__header'>
          <h2 className='match-filters-drawer__title'>
            {t("MATCHES_FILTERS_TITLE")}
          </h2>
          <button
            className='match-filters-drawer__close'
            onClick={onClose}
            aria-label='Close'
          >
            <Icon icon='mdi:close' width={20} />
          </button>
        </div>

        <div className='match-filters-drawer__body'>
          <div className='match-filters-drawer__section'>
            <h3 className='match-filters-drawer__section-title'>
              {t("MATCHES_FILTERS_STATUS")}
            </h3>
            <div className='match-filters-drawer__options'>
              {statusOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={`match-filters-drawer__option${status === opt.id ? " match-filters-drawer__option--active" : ""}`}
                  onClick={() => onStatusChange(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className='match-filters-drawer__section'>
            <h3 className='match-filters-drawer__section-title'>
              {t("MATCHES_FILTERS_STAGE")}
            </h3>
            <div className='match-filters-drawer__options'>
              {stageOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={`match-filters-drawer__option${stage === opt.id ? " match-filters-drawer__option--active" : ""}`}
                  onClick={() => onStageChange(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {stage === "group" ? (
            <div className='match-filters-drawer__section'>
              <h3 className='match-filters-drawer__section-title'>
                {t("MATCHES_FILTERS_GROUP")}
              </h3>
              <div className='match-filters-drawer__options'>
                {groupOptions.map((opt) => (
                  <button
                    key={opt.id}
                    className={`match-filters-drawer__option${group === opt.id ? " match-filters-drawer__option--active" : ""}`}
                    onClick={() => onGroupChange(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className='match-filters-drawer__section'>
              <h3 className='match-filters-drawer__section-title'>
                {t("MATCHES_FILTERS_ROUND")}
              </h3>
              <div className='match-filters-drawer__options'>
                {knockoutStageOptions.map((opt) => (
                  <button
                    key={opt.id}
                    className={`match-filters-drawer__option${knockoutStage === opt.id ? " match-filters-drawer__option--active" : ""}`}
                    onClick={() => onKnockoutStageChange(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className='match-filters-drawer__section'>
            <h3 className='match-filters-drawer__section-title'>
              {t("MATCHES_FILTERS_DATE")}
            </h3>
            <div className='match-filters-drawer__options'>
              <button
                className={`match-filters-drawer__option${date === "all" ? " match-filters-drawer__option--active" : ""}`}
                onClick={() => onDateChange("all")}
              >
                {t("MATCHES_DATE_ALL")}
              </button>
              <input
                type='date'
                className={`match-filters-drawer__date-input${date !== "all" ? " match-filters-drawer__date-input--active" : ""}`}
                value={date === "all" ? "" : date}
                min={dateMin}
                max={dateMax}
                onChange={(e) => onDateChange(e.target.value || "all")}
                placeholder='Select date'
              />
            </div>
          </div>
        </div>

        <div className='match-filters-drawer__footer'>
          <button className='match-filters-drawer__clear' onClick={onClearAll}>
            {t("MATCHES_FILTERS_CLEAR_ALL")}
          </button>
          <button className='match-filters-drawer__done' onClick={onClose}>
            {t("MATCHES_FILTERS_DONE")}
          </button>
        </div>
      </div>
    </div>
  );
}
