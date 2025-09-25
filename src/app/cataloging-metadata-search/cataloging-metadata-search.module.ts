import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CatalogingMetadataSearchComponent } from './cataloging-metadata-search.component';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
  ],
  declarations: [
    CatalogingMetadataSearchComponent,
  ],
  exports: [
    CatalogingMetadataSearchComponent,
  ],
})
export class CatalogingMetadataSearchModule {} 