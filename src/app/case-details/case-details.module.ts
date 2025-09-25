import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common"; 
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from "@angular/common/http";
import { CaseDetailsComponent } from "./case-details.component";
import { RouterModule } from "@angular/router";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule 

  ],
  declarations: [
    CaseDetailsComponent,
  ],
  exports: [
    CaseDetailsComponent,
  ],
})
export class CaseDetailsModule {}
