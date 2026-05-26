import './GroupsScreen.css';
import PageContainer from './PageContainer';
import SectionHeader from './SectionHeader';
import GroupPanel from './GroupPanel';
import Wc26Banner from './Wc26Banner';
import { GROUPS } from '~/lib/mock-data';

export default function GroupsScreen() {
  return (
    <>
      <Wc26Banner />
      <PageContainer wide>
      <SectionHeader
        title="Group Standings"
        subtitle="FIFA World Cup 2026 · Group Stage"
      />
      <div className="groups-screen__grid">
        {Object.keys(GROUPS).map(g => (
          <GroupPanel key={g} groupId={g} />
        ))}
      </div>
    </PageContainer>
    </>
  );
}
