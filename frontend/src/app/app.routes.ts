import { Routes } from '@angular/router';
import { EntriesPage } from './pages/entries-page/entries-page';
import { ActivityTypesPage } from './pages/activity-types-page/activity-types-page';
import { TotalsPage } from './pages/totals-page/totals-page';

export const routes: Routes = [
  { path: '', component: EntriesPage },
  { path: 'activity-types', component: ActivityTypesPage },
  { path: 'totals', component: TotalsPage },
  { path: '**', redirectTo: '' },
];
