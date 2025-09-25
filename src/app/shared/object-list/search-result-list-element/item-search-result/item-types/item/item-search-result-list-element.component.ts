import { AsyncPipe, NgClass, NgFor, NgIf } from "@angular/common"
import { Component,  OnInit } from "@angular/core"
import { RouterLink } from "@angular/router"
import { trigger, style, animate, transition } from "@angular/animations"

import  { Item } from "../../../../../../core/shared/item.model"
import { ViewMode } from "../../../../../../core/shared/view-mode.model"
import { getItemPageRoute } from "../../../../../../item-page/item-page-routing-paths"
import { ThemedThumbnailComponent } from "../../../../../../thumbnail/themed-thumbnail.component"
import { ThemedBadgesComponent } from "../../../../../object-collection/shared/badges/themed-badges.component"
import { ItemSearchResult } from "../../../../../object-collection/shared/item-search-result.model"
import { listableObjectComponent } from "../../../../../object-collection/shared/listable-object/listable-object.decorator"
import { TruncatableComponent } from "../../../../../truncatable/truncatable.component"
import { TruncatablePartComponent } from "../../../../../truncatable/truncatable-part/truncatable-part.component"
import { SearchResultListElementComponent } from "../../../search-result-list-element.component"

@listableObjectComponent("PublicationSearchResult", ViewMode.ListElement)
@listableObjectComponent(ItemSearchResult, ViewMode.ListElement)
@Component({
  selector: "ds-item-search-result-list-element",
  styleUrls: ["./item-search-result-list-element.component.scss"],
  templateUrl: "./item-search-result-list-element.component.html",
  standalone: true,
  imports: [
    NgIf,
    RouterLink,
    ThemedThumbnailComponent,
    NgClass,
    ThemedBadgesComponent,
    TruncatableComponent,
    TruncatablePartComponent,
    NgFor,
    AsyncPipe,
  ],
  animations: [
    trigger("caseInfoAnimation", [
      transition(":enter", [
        style({ opacity: 0, transform: "translateY(-10px)" }),
        animate("300ms ease-out", style({ opacity: 1, transform: "translateY(0)" })),
      ]),
    ]),
  ],
})
export class ItemSearchResultListElementComponent
  extends SearchResultListElementComponent<ItemSearchResult, Item>
  implements OnInit
{
  itemPageRoute: string

  ngOnInit(): void {
    super.ngOnInit()
    this.showThumbnails = this.showThumbnails ?? this.appConfig.browseBy.showThumbnails
    this.itemPageRoute = getItemPageRoute(this.dso)

    // Debug: Log metadata to console
    console.log("Item metadata:", this.dso.metadata)
  }

  /**
   * Get formatted case information with correct metadata fields
   */
  getCaseInfo(): string {
    const caseType = this.dso.firstMetadataValue("dc.casetype") || ""
    const caseNumber = this.dso.firstMetadataValue("dc.title") || ""
    const caseYear = this.dso.firstMetadataValue("dc.caseyear") || ""

    let caseInfo = ""

    if (caseType) {
      caseInfo += caseType
    }

    if (caseNumber) {
      caseInfo += caseInfo ? ` ${caseNumber}` : caseNumber
    }

    if (caseYear) {
      caseInfo += caseInfo ? ` (${caseYear})` : `(${caseYear})`
    }

    return caseInfo || this.dsoTitle
  }

  /**
   * Get petitioner name from metadata
   */
  getPetitionerName(): string {
    return this.dso.firstMetadataValue("dc.pname") || this.dso.firstMetadataValue("dc.pname") || ""
  }

  /**
   * Get respondent name from metadata
   */
  getRespondentName(): string {
    return this.dso.firstMetadataValue("dc.rname") || this.dso.firstMetadataValue("dc.rname") || ""
  }

  /**
   * Helper method to debug available metadata fields
   */
  getAllMetadataFields(): string {
    if (!this.dso || !this.dso.metadata) {
      return "No metadata available"
    }

    return Object.keys(this.dso.metadata).join(", ")
  }
}
