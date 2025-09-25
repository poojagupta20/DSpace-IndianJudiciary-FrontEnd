import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SearchPageComponent } from "./search-page.component";
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from "@angular/common/http";
import { RouterModule } from "@angular/router";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,

    
  ],
  declarations: [
    SearchPageComponent,
  ],
  exports: [
    SearchPageComponent,
  ],
})
export class SearchPageModule {}
