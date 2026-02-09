import React from 'react';
import AuthGate from './components/AuthGate';
import DashboardApp from './DashboardApp';

const App: React.FC = () => {
  return <AuthGate>{({ session, access }) => <DashboardApp session={session} access={access} />}</AuthGate>;
};

export default App;
