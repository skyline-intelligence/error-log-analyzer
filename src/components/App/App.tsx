import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';
import { ROUTES } from '../../constants';
const PageOne = React.lazy(() => import('../../pages/PageOne'));
const PageTwo = React.lazy(() => import('../../pages/PageTwo'));
const PageThree = React.lazy(() => import('../../pages/PageThree'));
const PageFour = React.lazy(() => import('../../pages/PageFour'));
const HourPage = React.lazy(() => import('../../pages/hour'));
const MinutePage = React.lazy(() => import('../../pages/minute'));
const RealTimePage = React.lazy(() => import('../../pages/realtime'));
import RolesConfiguration from '../../pages/RolesConfiguration';
const RulesConfiguration = React.lazy(() => import('../../pages/RulesConfiguration'));

function App(props: AppRootProps) {
  return (
    <Routes>
      <Route path={ROUTES.Two} element={<PageTwo />} />
      <Route path={`${ROUTES.Three}/:id?`} element={<PageThree />} />

      {/* Full-width page (this page will have no side navigation) */}
      <Route path={ROUTES.Four} element={<PageFour />} />

      <Route path={ROUTES.Hour} element={<HourPage />} />
      
      <Route path={ROUTES.Minute} element={<MinutePage />} />

      <Route path={ROUTES.RealTime} element={<RealTimePage />} />

      <Route path={ROUTES.RolesConfiguration} element={<RolesConfiguration />} />

      <Route path={ROUTES.RulesConfiguration} element={<RulesConfiguration />} />
      
      {/* Default page */}
      <Route path="*" element={<PageOne />} />
    </Routes>
  );
}

export default App;
