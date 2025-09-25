import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CURRENT_API_URL } from '../core/serachpage/api-urls';

interface TreeNode {
  id: string;
  uuid: string;
  name: string;
  handle: string;
  type: 'community' | 'subcommunity' | 'collection' | 'facet';
  expanded: boolean;
  loading: boolean;
  children: TreeNode[];
  // For facet nodes
  count?: number;
  facetType?: string;
  searchLink?: string;
  // Pagination properties for collections
  currentPage?: number;
  totalPages?: number;
  totalElements?: number;
  pageSize?: number;
  hasMoreItems?: boolean;
}

@Component({
  selector: 'app-tree-view',
  templateUrl: './tree-view.component.html',
  styleUrls: ['./tree-view.component.scss'],
})
export class RepositoryTreeComponent implements OnInit {
  treeNodes: TreeNode[] = [];
  loading = true;
  error: string = null;
  
  // Base URL for the DSpace REST API
  private baseUrl = `${CURRENT_API_URL}/server/api`;
  private defaultPageSize = 20;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadRepositoryStructure();
  }

  loadRepositoryStructure(): void {
    this.loading = true;
    this.cdr.detectChanges();
    
    // Use the exact API endpoint provided with larger embed size for collections
    const apiUrl = `${this.baseUrl}/core/communities/search/top?page=0&size=20&sort=dc.title,ASC&embed.size=subcommunities=20&embed=subcommunities&embed.size=collections=20&embed=collections`;
    
    this.http.get<any>(apiUrl).pipe(
      map(response => {
        // Parse the response to create tree nodes
        if (response._embedded && response._embedded.communities) {
          return this.parseCommunitiesResponse(response._embedded.communities);
        }
        return [];
      }),
      catchError(error => {
        this.error = `Error loading repository structure: ${error.message}`;
        this.loading = false;
        this.cdr.detectChanges();
        return of([]);
      })
    ).subscribe(nodes => {
      this.treeNodes = nodes;
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  parseCommunitiesResponse(communities: any[]): TreeNode[] {
    return communities.map(community => {
      const node: TreeNode = {
        id: community.id,
        uuid: community.uuid,
        name: community.name,
        handle: community.handle,
        type: 'community',
        expanded: false,
        loading: false,
        children: []
      };

      // Add subcommunities if they exist
      if (community._embedded && community._embedded.subcommunities && 
          community._embedded.subcommunities._embedded && 
          community._embedded.subcommunities._embedded.subcommunities) {
        
        const subcommunities = community._embedded.subcommunities._embedded.subcommunities;
        node.children.push(...this.parseSubcommunitiesResponse(subcommunities));
      }

      // Add collections if they exist
      if (community._embedded && community._embedded.collections && 
          community._embedded.collections._embedded && 
          community._embedded.collections._embedded.collections) {
        
        const collections = community._embedded.collections._embedded.collections;
        node.children.push(...this.parseCollectionsResponse(collections));
      }

      return node;
    });
  }

  parseSubcommunitiesResponse(subcommunities: any[]): TreeNode[] {
    return subcommunities.map(subcommunity => {
      return {
        id: subcommunity.id,
        uuid: subcommunity.uuid,
        name: subcommunity.name,
        handle: subcommunity.handle,
        type: 'subcommunity',
        expanded: false,
        loading: false,
        children: []
      };
    });
  }

  parseCollectionsResponse(collections: any[]): TreeNode[] {
    return collections.map(collection => {
      return {
        id: collection.id,
        uuid: collection.uuid,
        name: collection.name,
        handle: collection.handle,
        type: 'collection',
        expanded: false,
        loading: false,
        children: [],
        currentPage: 0,
        totalPages: 0,
        totalElements: 0,
        pageSize: this.defaultPageSize,
        hasMoreItems: false
      };
    });
  }

  toggleNode(node: TreeNode, event: Event): void {
    // Stop event propagation to prevent navigation when toggling
    event.stopPropagation();
    
    node.expanded = !node.expanded;
    
    // If this is a subcommunity and we need to load its children
    if ((node.type === 'subcommunity') && node.expanded && node.children.length === 0) {
      this.loadSubcommunityChildren(node);
    }
    
    // If this is a collection and we need to load its facets
    if (node.type === 'collection' && node.expanded && node.children.length === 0) {
      this.loadCollectionFacets(node);
    }
  }

  loadSubcommunityChildren(node: TreeNode): void {
    node.loading = true;
    this.cdr.detectChanges();
    
    // API call to get subcommunity's collections and subcommunities with larger embed size
    const apiUrl = `${this.baseUrl}/core/communities/${node.id}?embed.size=collections=20&embed=collections&embed.size=subcommunities=20&embed=subcommunities`;
    
    this.http.get<any>(apiUrl).pipe(
      catchError(error => {
        console.error(`Error loading subcommunity children: ${error.message}`);
        node.loading = false;
        this.cdr.detectChanges();
        return of(null);
      })
    ).subscribe(response => {
      if (response && response._embedded) {
        // Add subcommunities if they exist
        if (response._embedded.subcommunities && 
            response._embedded.subcommunities._embedded && 
            response._embedded.subcommunities._embedded.subcommunities) {
          
          const subcommunities = response._embedded.subcommunities._embedded.subcommunities;
          node.children.push(...this.parseSubcommunitiesResponse(subcommunities));
        }

        // Add collections if they exist
        if (response._embedded.collections && 
            response._embedded.collections._embedded && 
            response._embedded.collections._embedded.collections) {
          
          const collections = response._embedded.collections._embedded.collections;
          node.children.push(...this.parseCollectionsResponse(collections));
        }
      }
      node.loading = false;
      this.cdr.detectChanges();
    });
  }

  // Method to load facets instead of items - only shows case type values
  loadCollectionFacets(node: TreeNode): void {
    node.loading = true;
    this.cdr.detectChanges();
    
    // API call to get facets for the collection
    const apiUrl = `${this.baseUrl}/discover/search/objects?dsoType=item&scope=${node.uuid}`;
    
    this.http.get<any>(apiUrl).pipe(
      catchError(error => {
        console.error(`Error loading collection facets: ${error.message}`);
        node.loading = false;
        this.cdr.detectChanges();
        return of(null);
      })
    ).subscribe(response => {
      if (response && response._embedded && response._embedded.facets) {
        this.parseFacetsResponse(response._embedded.facets, node);
      }
      node.loading = false;
      this.cdr.detectChanges();
    });
  }

  parseFacetsResponse(facets: any[], parentNode: TreeNode): void {
    // Only focus on dc_case_type facet
    const caseTypeFacet = facets.find(facet => facet.name === 'dc_case_type');
    
    if (caseTypeFacet && caseTypeFacet._embedded && caseTypeFacet._embedded.values && caseTypeFacet._embedded.values.length > 0) {
      // Add individual case type values directly to the collection node (no intermediate group)
      caseTypeFacet._embedded.values.forEach((value: any, index: number) => {
        const facetValueNode: TreeNode = {
          id: `${parentNode.id}_case_type_${index}`,
          uuid: `${parentNode.uuid}_case_type_${index}`,
          name: `${value.label} (${value.count})`,
          handle: parentNode.uuid, // Store parent collection UUID for navigation
          type: 'facet',
          expanded: false,
          loading: false,
          children: [],
          count: value.count,
          facetType: 'dc_case_type',
          searchLink: value._links?.search?.href
        };
        parentNode.children.push(facetValueNode);
      });
    }
  }

  getNodeIcon(node: TreeNode): string {
    switch (node.type) {
      case 'community':
        return node.expanded ? 'fa-folder-open' : 'fa-folder';
      case 'subcommunity':
        return node.expanded ? 'fa-folder-open' : 'fa-folder';
      case 'collection':
        return 'fa-archive';
      case 'facet':
        return 'fa-tag';
      default:
        return 'fa-circle';
    }
  }

  getNodeClass(node: TreeNode): string {
    return `node-${node.type}`;
  }

  getPaginationInfo(node: TreeNode): string {
    if (node.type === 'collection' && node.children.length > 0) {
      return `Case types: ${node.children.length}`;
    }
    return '';
  }

  trackByNodeId(index: number, node: TreeNode): string {
    return node.id;
  }

  refreshView(): void {
    this.cdr.detectChanges();
  }

  // Navigation methods
  navigateToNode(node: TreeNode, event: Event): void {
    // Stop event propagation to prevent other handlers from firing
    event.stopPropagation();
    
    switch (node.type) {
      case 'community':
      case 'subcommunity':
        this.router.navigate(['/communities', node.uuid]);
        break;
      case 'collection':
        this.router.navigate(['/collections', node.uuid]);
        break;
      case 'facet':
        if (node.facetType === 'dc_case_type') {
          // Extract the case type value from the node name (remove the count part)
          const caseTypeValue = node.name.split(' (')[0]; // Gets "WP(C)" from "WP(C) (10)"
          
          // Use the parent collection UUID stored in the handle
          const collectionUuid = node.handle;
          
          if (collectionUuid) {
            // Construct the URL with collection UUID and case type filter
            const filterUrl = `http://localhost:4000/collections/${collectionUuid}?f.dc_case_type=${encodeURIComponent(caseTypeValue)},equals&spc.page=1`;
            
            // Navigate to the filtered collection view
            window.location.href = filterUrl;
          }
        }
        break;
    }
  }
}