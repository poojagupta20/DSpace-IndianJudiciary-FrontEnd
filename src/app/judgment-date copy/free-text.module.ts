
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common"; 
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from "@angular/common/http"; 
import { FreeTextComponent } from "./free-text.component";
import { RouterModule } from "@angular/router";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule, // ✅ Add this

  ],
  declarations: [
    FreeTextComponent,
  ],
  exports: [
    FreeTextComponent,
  ],
})
export class   FreeTextModule {}
