// src/app/cnr-manager/cnr.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CnrManagerComponent } from './cnr-manager.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [CnrManagerComponent],
  imports: [CommonModule, FormsModule, HttpClientModule],
  exports: [CnrManagerComponent]
})
export class CnrModule {}
