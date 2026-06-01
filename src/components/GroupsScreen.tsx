import './GroupsScreen.css';
import PageContainer from './PageContainer';
import { useTranslation } from '~/hooks/useTranslation';
import SectionHeader from './SectionHeader';
import GroupPanel from './GroupPanel';
import GroupNav from './GroupNav';
import Wc26Banner from './Wc26Banner';
import { GROUPS } from '~/lib/mock-data';

export default function GroupsScreen() {
  const { t } = useTranslation();
  const groupIds = Object.keys(GROUPS);
  return (
    <>
      <Wc26Banner />
      <PageContainer wide>
      <SectionHeader
        title={t('GROUPS_TITLE')}
        subtitle={t('GROUPS_SUBTITLE')}
      />
      <GroupNav groups={groupIds} />
      <div className="groups-screen__grid">
        {groupIds.map(g => (
          <div key={g} id={`group-${g}`}>
            <GroupPanel groupId={g} />
          </div>
        ))}
      </div>
    </PageContainer>
    </>
  );
}
