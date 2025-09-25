import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminPoolComponent } from './admin-pool.component';
import { AdminPoolRoutingModule } from './admin-pool-routing.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [AdminPoolComponent],
  imports: [
    CommonModule,
    FormsModule,
    AdminPoolRoutingModule,
  ],
})
export class AdminPoolModule {}
