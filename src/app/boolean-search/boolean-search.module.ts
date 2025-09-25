import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from "@angular/common/http";
import { BooleanSearchComponent } from "./boolean-search.component";
import { RouterModule } from "@angular/router";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
  ],
  declarations: [
    BooleanSearchComponent,
  ],
  exports: [
    BooleanSearchComponent,
  ],
})
export class BooleanSearchModule {} 