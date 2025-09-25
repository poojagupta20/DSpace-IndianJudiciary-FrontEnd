// import { NgModule } from "@angular/core"
// import { CommonModule } from "@angular/common"
// import { ReactiveFormsModule } from "@angular/forms"
// import { NgbModule } from "@ng-bootstrap/ng-bootstrap"
// import { SharedModule } from "../shared/shared.module"
// import { PetitionerRespondentSearchComponent } from "./petitioner-respondent-search.component" 


// @NgModule({
//   imports: [CommonModule, ReactiveFormsModule, NgbModule, SharedModule, PetitionerRespondentSearchComponent],
//   declarations: [PetitionerRespondentSearchComponent],
//   exports: [PetitionerRespondentSearchComponent],
// })
// export class PetitionerRespondentSearchModule {}

import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PetitionerRespondentSearchComponent2 } from "./petitioner-respondent-search2.component" 
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from "@angular/common/http";
import { SharedModule } from "../shared/shared.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,ReactiveFormsModule,SharedModule
  ],
  declarations: [
    PetitionerRespondentSearchComponent2,
  ],
  exports: [
    PetitionerRespondentSearchComponent2,
  ],
})
export class PetitionerRespondentSearchModule2 {}
