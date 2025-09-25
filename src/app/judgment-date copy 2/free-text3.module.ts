
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common"; 
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from "@angular/common/http";  
import { FreeTextComponent3 } from "./free-text3.component";
import { RouterModule } from "@angular/router";
// import { FreeTextComponent } from "./free-text.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule, // ✅ Add this

  ],
  declarations: [
    FreeTextComponent3,
  ],
  exports: [
    FreeTextComponent3,
  ],
})
export class   FreeTextModule3 {}
