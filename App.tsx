import React from 'react';
import AuthGate from './components/AuthGate';
import DashboardApp from './DashboardApp';

const App: React.FC = () => {
  return <AuthGate>{({ session }) => <DashboardApp session={session} />}</AuthGate>;
};

export default App;
