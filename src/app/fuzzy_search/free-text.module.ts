
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common"; 
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from "@angular/common/http"; 
import { FuzzySearchComponent } from "./free-text.component";
import { RouterModule } from "@angular/router";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule, // ✅ Add this

  ],
  declarations: [
    FuzzySearchComponent,
  ],
  exports: [
    FuzzySearchComponent,
  ],
})
export class   FuzzySearchModule {}
