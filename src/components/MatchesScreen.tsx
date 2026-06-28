import "./MatchesScreen.css";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Icon } from "@iconify/react";
import { useTranslation } from "~/hooks/useTranslation";
import PageContainer from "./PageContainer";
import Wc26Banner from "./Wc26Banner";
import SectionHeader from "./SectionHeader";
import MatchCard from "./MatchCard";
import MatchCardSkeleton from "./MatchCardSkeleton";
import MatchFiltersDrawer from "./MatchFiltersDrawer";
import type { FilterOption } from "./MatchFiltersDrawer";
import { useData } from "~/lib/data-context";
import {
  getStageLabelKey,
  formatMatchDate,
  KNOCKOUT_STAGE_ORDER,
} from "~/lib/helpers";
import type { MatchStatus } from "~/lib/types";

function localDateKey(utcDate: string): string {
  const d = new Date(utcDate);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// Last day of the WC2026 tournament (the final) — upper bound for the date filter.
const WC_FINAL_DATE = "2026-07-19";

// How many of the most recently finished matches "Load previous matches"
// reveals on the default tab — keeps it to recent results, not the full history.
const RECENT_FINISHED_LIMIT = 6;

export default function MatchesScreen() {
  const [tab, setTab] = useState("default");
  const [stage, setStage] = useState("knockout");
  const [group, setGroup] = useState("all");
  const [knockoutStage, setKnockoutStage] = useState("all");
  const [date, setDate] = useState("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showRecentFinished, setShowRecentFinished] = useState(false);
  const navigate = useNavigate();
  const { matches, matchesLoading } = useData();
  const { t, language } = useTranslation();

  const STATUS_OPTIONS: FilterOption[] = [
    { id: "all", label: t("MATCHES_FILTER_ALL") },
    { id: "default", label: t("MATCHES_FILTER_DEFAULT") },
    { id: "live", label: t("MATCHES_FILTER_LIVE") },
    { id: "upcoming", label: t("MATCHES_FILTER_UPCOMING") },
    { id: "finished", label: t("MATCHES_FILTER_FINISHED") },
  ];

  const STAGE_OPTIONS: FilterOption[] = [
    { id: "group", label: t("MATCHES_STAGE_GROUP") },
    { id: "knockout", label: t("MATCHES_STAGE_KNOCKOUT") },
  ];

  const groups = useMemo(() => {
    const seen = new Set<string>();
    for (const m of matches)
      if (m.stage === "GROUP_STAGE" && m.group) seen.add(m.group);
    return [...seen].sort();
  }, [matches]);

  const knockoutStages = useMemo(() => {
    const seen = new Set<string>();
    for (const m of matches) if (m.stage !== "GROUP_STAGE") seen.add(m.stage);
    return KNOCKOUT_STAGE_ORDER.filter((s) => seen.has(s));
  }, [matches]);

  const groupOptions: FilterOption[] = [
    { id: "all", label: t("MATCHES_GROUP_ALL") },
    ...groups.map((g) => ({
      id: g,
      label: `${t("MATCHES_GROUP_PREFIX")} ${g}`,
    })),
  ];

  const knockoutStageOptions: FilterOption[] = [
    { id: "all", label: t("MATCHES_KNOCKOUT_ALL") },
    ...knockoutStages.map((s) => {
      const labelKey = getStageLabelKey(s);
      return { id: s, label: labelKey ? t(labelKey) : s };
    }),
  ];

  const handleStageChange = (next: string) => {
    setStage(next);
    setGroup("all");
    setKnockoutStage("all");
  };

  const clearAllFilters = () => {
    setTab("all");
    setStage("group");
    setGroup("all");
    setKnockoutStage("all");
    setDate("all");
  };

  const activeFilters: { key: string; label: string; onRemove: () => void }[] =
    [];
  if (tab !== "all") {
    const opt = STATUS_OPTIONS.find((o) => o.id === tab);
    if (opt)
      activeFilters.push({
        key: "status",
        label: opt.label,
        onRemove: () => setTab("all"),
      });
  }
  if (stage === "knockout") {
    activeFilters.push({
      key: "stage",
      label: t("MATCHES_STAGE_KNOCKOUT"),
      onRemove: () => handleStageChange("group"),
    });
  }
  if (stage === "group" && group !== "all") {
    activeFilters.push({
      key: "group",
      label: `${t("MATCHES_GROUP_PREFIX")} ${group}`,
      onRemove: () => setGroup("all"),
    });
  }
  if (stage === "knockout" && knockoutStage !== "all") {
    const labelKey = getStageLabelKey(knockoutStage);
    activeFilters.push({
      key: "round",
      label: labelKey ? t(labelKey) : knockoutStage,
      onRemove: () => setKnockoutStage("all"),
    });
  }
  if (date !== "all") {
    activeFilters.push({
      key: "date",
      label: formatMatchDate(`${date}T00:00:00`, language),
      onRemove: () => setDate("all"),
    });
  }

  const firstMatchDate = useMemo(() => {
    let min = "";
    for (const m of matches) {
      if (!m.utcDate) continue;
      const key = localDateKey(m.utcDate);
      if (!min || key < min) min = key;
    }
    return min || "2026-06-11";
  }, [matches]);

  // Default tab: hide finished matches and surface live ones first, then
  // upcoming. An explicit date filter overrides this so users can still look
  // back at finished matches on a chosen day. "All" shows every status.
  const hidePastByDefault = tab === "default" && date === "all";

  // Among matches hidden by hidePastByDefault, the most recent finished ones —
  // shown when the user taps "Load previous matches" instead of unhiding all history.
  const recentFinishedIds = useMemo(() => {
    if (!hidePastByDefault) return new Set<number>();
    const candidates = matches.filter((m) => {
      if (m.status !== "finished") return false;
      if (stage === "group") {
        if (m.stage !== "GROUP_STAGE") return false;
        if (group !== "all" && m.group !== group) return false;
      } else {
        if (m.stage === "GROUP_STAGE") return false;
        if (knockoutStage !== "all" && m.stage !== knockoutStage) return false;
      }
      return true;
    });
    candidates.sort((a, b) => b.utcDate.localeCompare(a.utcDate));
    return new Set(candidates.slice(0, RECENT_FINISHED_LIMIT).map((m) => m.id));
  }, [matches, hidePastByDefault, stage, group, knockoutStage]);

  // On the default tab, the only finished matches ever shown are the ones the
  // user explicitly revealed via "Load previous matches" — surface those above
  // live/upcoming instead of the usual live > upcoming > finished order.
  const STATUS_RANK: Record<MatchStatus, number> = hidePastByDefault
    ? { finished: 0, live: 1, upcoming: 2 }
    : { live: 0, upcoming: 1, finished: 2 };

  const filtered = matches
    .filter((m) => {
      if (hidePastByDefault) {
        if (
          m.status === "finished" &&
          !(showRecentFinished && recentFinishedIds.has(m.id))
        )
          return false;
      } else if (tab !== "all" && tab !== "default") {
        if (tab === "live" && m.status !== "live") return false;
        if (tab === "upcoming" && m.status !== "upcoming") return false;
        if (tab === "finished" && m.status !== "finished") return false;
      }
      if (stage === "group") {
        if (m.stage !== "GROUP_STAGE") return false;
        if (group !== "all" && m.group !== group) return false;
      } else {
        if (m.stage === "GROUP_STAGE") return false;
        if (knockoutStage !== "all" && m.stage !== knockoutStage) return false;
      }
      if (date !== "all" && localDateKey(m.utcDate) !== date) return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (tab !== "all") {
        const rankDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        if (rankDiff !== 0) return rankDiff;
      }
      return dir * a.utcDate.localeCompare(b.utcDate);
    });

  return (
    <>
      <Wc26Banner />
      <PageContainer>
        <div className='matches-screen__header'>
          <SectionHeader
            title={t("MATCHES_TITLE")}
            subtitle={t("MATCHES_SUBTITLE")}
          />
          <div className='matches-screen__header-actions'>
            <button
              className='matches-screen__sort-btn'
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              title={
                sortDir === "asc"
                  ? t("MATCHES_SORT_ASC")
                  : t("MATCHES_SORT_DESC")
              }
            >
              <Icon
                icon={
                  sortDir === "asc"
                    ? "mdi:sort-clock-ascending-outline"
                    : "mdi:sort-clock-descending-outline"
                }
                width={18}
              />
            </button>
            <button
              className='matches-screen__filters-btn'
              onClick={() => setFiltersOpen(true)}
            >
              <Icon icon='mdi:filter-variant' width={18} />
              {t("MATCHES_FILTERS_BUTTON")}
              {activeFilters.length > 0 && (
                <span className='matches-screen__filters-badge'>
                  {activeFilters.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className='matches-screen__active-filters'>
            {activeFilters.map((f) => (
              <button
                key={f.key}
                className='matches-screen__active-chip'
                onClick={f.onRemove}
              >
                {f.label}
                <Icon icon='mdi:close' width={14} />
              </button>
            ))}
          </div>
        )}

        {hidePastByDefault &&
          !showRecentFinished &&
          recentFinishedIds.size > 0 && (
            <button
              className='matches-screen__load-prev-btn'
              onClick={() => setShowRecentFinished(true)}
            >
              <Icon icon='mdi:history' width={16} />
              {t("MATCHES_LOAD_PREVIOUS")}
            </button>
          )}

        {!matchesLoading && filtered.length === 0 && (
          <div className='matches-screen__empty'>{t("MATCHES_EMPTY")}</div>
        )}

        <div className='matches-screen__grid'>
          {matchesLoading
            ? Array.from({ length: 6 }, (_, i) => <MatchCardSkeleton key={i} />)
            : filtered.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  onTap={() => navigate(`/matches/${m.id}`)}
                />
              ))}
        </div>

        {filtersOpen && (
          <MatchFiltersDrawer
            onClose={() => setFiltersOpen(false)}
            onClearAll={clearAllFilters}
            status={tab}
            onStatusChange={setTab}
            statusOptions={STATUS_OPTIONS}
            stage={stage}
            onStageChange={handleStageChange}
            stageOptions={STAGE_OPTIONS}
            group={group}
            onGroupChange={setGroup}
            groupOptions={groupOptions}
            knockoutStage={knockoutStage}
            onKnockoutStageChange={setKnockoutStage}
            knockoutStageOptions={knockoutStageOptions}
            date={date}
            onDateChange={setDate}
            dateMin={firstMatchDate}
            dateMax={WC_FINAL_DATE}
          />
        )}
      </PageContainer>
    </>
  );
}
