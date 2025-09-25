import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from "@angular/common/http";
import { ProximitySearchComponent } from "./proximity-search.component";
import { RouterModule } from "@angular/router";
import { FreeTextService } from '../core/serachpage/free-text.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
  ],
  declarations: [
    ProximitySearchComponent,
  ],
  exports: [
    ProximitySearchComponent,
  ],
  providers: [FreeTextService],
})
export class ProximitySearchModule {} 