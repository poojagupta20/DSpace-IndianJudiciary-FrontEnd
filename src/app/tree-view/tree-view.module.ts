import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common"; 
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from "@angular/common/http"; 
import { RouterModule } from "@angular/router";
import { AuthorizationDataService } from "../core/data/feature-authorization/authorization-data.service";
import { RepositoryTreeComponent } from "./tree-view.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule 

  ],
  declarations: [
    RepositoryTreeComponent,
  ],
  exports: [
    RepositoryTreeComponent,
  ],
  providers: [
    // Add if using permissions
    AuthorizationDataService
  ]
  
})
export class TreeViewModule {}
