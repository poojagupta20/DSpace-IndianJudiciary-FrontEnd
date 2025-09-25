import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminPoolComponent } from './admin-pool.component';

const routes: Routes = [
  {
    path: '',
    component: AdminPoolComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminPoolRoutingModule {}
