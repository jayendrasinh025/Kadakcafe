/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MenuProvider } from './context/MenuContext';
import { CustomerMenuView } from './components/CustomerMenuView';
import { OwnerDashboardView } from './components/OwnerDashboardView';

export default function App() {
  return (
    <MenuProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CustomerMenuView />} />
          <Route path="/admin" element={<OwnerDashboardView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MenuProvider>
  );
}
