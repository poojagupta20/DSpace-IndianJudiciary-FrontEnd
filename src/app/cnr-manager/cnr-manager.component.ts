import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { finalize, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CnrService, FileRecord } from './cnr.service';
import { SearchPageService } from '../core/serachpage/search-page.service';

type SubmitState = 'idle' | 'submitting' | 'submitted' | 'error';
type CheckState = 'idle' | 'checking' | 'checked' | 'error';

@Component({
  selector: 'app-cnr-manager',
  templateUrl: './cnr-manager.component.html',
  styleUrls: ['./cnr-manager.component.scss']
})
export class CnrManagerComponent implements OnInit {
  // ===== Search mode & inputs =====
  searchMode: 'cino' | 'case' = 'cino';
  searchQuery = '';
  caseNumberInput = '';
  caseTypeInput = '';
  caseYearInput = '';

  loading = false;
  generating = false;
  submitting = false;

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  filterSubmitted: '' | 'submit' | 'notSubmitted' = '';
  sortDir: 'asc' | 'desc' = 'desc';

  searchResults: FileRecord[] = [];
  selectedSearchFiles: FileRecord[] = [];
  selectedGeneratedFiles: FileRecord[] = [];
  generatedFiles: Array<FileRecord & {
    selected: boolean;
    status: SubmitState;
    checkStatusState: CheckState;
    userFriendlyPostResponse: string;
    userFriendlyCheckResponse: string;
    postResponse?: string;
    ackId?: string | null;
    deleting?: boolean; // <-- NEW: row-level deleting flag
  }> = [];

  // Report
  reportFrom: string | null = null;
  reportTo: string | null = null;
  reportLoading = false;
  reportFormat: 'csv' | 'pdf' = 'csv'; // <-- NEW: report format selector

  // ===== Cart state =====
  private cartKeySet = new Set<string>();
  cartItems: FileRecord[] = [];

  // Cart modal
  showCart = false;

  constructor(
    private cnrService: CnrService,
    private cdr: ChangeDetectorRef,
    private searchPageService: SearchPageService
  ) {}

  ngOnInit(): void {
    this.loadGeneratedFiles();
  }

  // ---------- Cart helpers ----------
  private fileKey(f: FileRecord): string {
    return (f as any).itemUUID || f.fileName || '';
  }

  get cartCount(): number {
    return this.cartItems.length;
  }

  isInCart(file: FileRecord): boolean {
    const key = this.fileKey(file);
    return !!key && this.cartKeySet.has(key);
  }

  addSingleToCart(file: FileRecord): void {
    const key = this.fileKey(file);
    if (!key || this.cartKeySet.has(key)) return;
    this.cartKeySet.add(key);
    this.cartItems = [...this.cartItems, file];
    this.cdr.detectChanges();
  }

  removeFromCart(file: FileRecord): void {
    const key = this.fileKey(file);
    if (!key) return;
    if (this.cartKeySet.delete(key)) {
      this.cartItems = this.cartItems.filter(f => this.fileKey(f) !== key);
      this.cdr.detectChanges();
    }
  }

  clearCart(): void {
    this.cartKeySet.clear();
    this.cartItems = [];
    this.cdr.detectChanges();
  }

  // Derived safe view for the modal
  get cartView() {
    return this.cartItems.map(it => ({
      cino: (it as any).cino ?? (it as any).cinoNumber ?? 'N/A',
      fileName: it.fileName ?? 'N/A',
      createdAt: (it as any).createdAt ?? null,
      _raw: it
    }));
  }

  // trackBy method for cart rows
  trackByCart(index: number, row: any) {
    const r = row?._raw ?? row;
    return r?.itemUUID ?? r?.fileName ?? index;
  }

  // Modal controls
  openCart(): void { this.showCart = true; this.cdr.detectChanges(); }
  closeCart(): void { this.showCart = false; this.cdr.detectChanges(); }
  viewCart(): void { this.openCart(); }

  // ---------- Report ----------
  // BACKWARD-COMPAT: keep existing method name; route to new unified handler
  downloadReportCsv() {
    this.reportFormat = 'csv';
    this.downloadReport();
  }

  // NEW unified downloader (CSV or PDF)
  downloadReport() {
    if (!this.reportFrom || !this.reportTo) return;
    if (new Date(this.reportFrom) > new Date(this.reportTo)) {
      alert('From date cannot be after To date');
      return;
    }

    this.reportLoading = true;
    this.cdr.detectChanges();

    const handleBlob = (blob: Blob, ext: 'csv' | 'pdf') => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jtdr_report_${this.reportFrom}_to_${this.reportTo}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      this.reportLoading = false;
      this.cdr.detectChanges();
    };

    if (this.reportFormat === 'csv') {
      this.cnrService.getReportCsv(this.reportFrom, this.reportTo).subscribe({
        next: (blob: Blob) => handleBlob(blob, 'csv'),
        error: (err) => {
          console.error('Report CSV failed:', err);
          this.reportLoading = false;
          alert('Failed to generate report CSV.');
          this.cdr.detectChanges();
        }
      });
    } else {
      // PDF branch
      this.cnrService.getReportPdf(this.reportFrom, this.reportTo).subscribe({
        next: (blob: Blob) => handleBlob(blob, 'pdf'),
        error: (err) => {
          console.error('Report PDF failed:', err);
          this.reportLoading = false;
          alert('Failed to generate report PDF.');
          this.cdr.detectChanges();
        }
      });
    }
  }

  // --- Friendly maps ---
  private readonly POST_CODE_MAP: Record<string, string> = {
    '200': 'Submitted successfully.',
    '201': 'Case created.',
    '202': 'Submission accepted for processing.',
    '401': 'CNR must not be null or empty.',
    '402': 'Zip hash must not be null or empty.',
    '403': 'Invalid Zip File.',
    '404': 'Zip name mismatch.',
    '405': 'ZIP hash mismatch.',
    '406': 'Invalid userId.',
    '407': 'UserId not found in JTDR.',
    '409': 'Duplicate case detected. Case already exists for provided CNR.',
    '500': 'Internal Server Error.'
  };

  private readonly CHECK_CODE_MAP: Record<string, string> = {
    '200': 'Checked successfully.',
    '202': 'Check accepted for processing.',
    '401': 'CNR must not be null or empty.',
    '402': 'Zip hash must not be null or empty.',
    '403': 'Invalid Zip File.',
    '405': 'ZIP hash mismatch.',
    '409': 'Duplicate case detected. Case already exists for provided CNR.',
    '500': 'Internal Server Error.'
  };

  // ---------- Utils ----------
  private asString(v: any): string {
    if (typeof v === 'string') return v;
    try { return JSON.stringify(v); } catch { return String(v); }
  }

  private parsePostResult(input: any): { code?: string; message?: string; ackId?: string; raw: string } {
    const httpStatus = input?.status ? String(input.status) : undefined;

    // Plain object
    if (input && typeof input === 'object' && !('error' in input)) {
      const code = input.statusCode ? String(input.statusCode) : httpStatus;
      return { code, message: input.message, ackId: input.ackId, raw: this.asString(input) };
    }

    // HttpErrorResponse with JSON
    if (input?.error && typeof input.error === 'object') {
      const code = input.error.statusCode ? String(input.error.statusCode) : httpStatus;
      return { code, message: input.error.message ?? input.message, ackId: input.error.ackId, raw: this.asString(input.error) };
    }

    // Text body
    const text: string =
      typeof input?.error === 'string'
        ? input.error
        : (typeof input === 'string' ? input : input?.message ?? '');

    const codeFromText =
      text.match(/"statusCode"\s*:\s*"?(\d{3})"?/i)?.[1] ||
      text.match(/\b(\d{3})\b/)?.[1] ||
      httpStatus;

    const msgFromText = text.match(/"message"\s*:\s*"([^"]+)"/i)?.[1];

    return { code: codeFromText, message: msgFromText, raw: text || this.asString(input) };
  }

  private mapFriendly(map: Record<string, string>, code?: string, message?: string, raw?: string, fallback = 'Unknown response'): string {
    return (code && map[code]) || message || raw || fallback;
  }

  /** Safely get the first metadata value, supporting alternate keys */
  private mdFirst(md: any, primary: string, alts: string[] = []): string | undefined {
    const keys = [primary, ...alts];
    for (const k of keys) {
      const arr = md?.[k];
      if (Array.isArray(arr) && arr[0]?.value != null) {
        return String(arr[0].value);
      }
    }
    return undefined;
  }

  /** Build display filename as: title_caseType_caseYear */
  private buildDisplayFileName(md: any): string {
    const title    = this.mdFirst(md, 'dc.title');
    const caseType = this.mdFirst(md, 'dc.casetype', ['dc.case.type']);
    const caseYear = this.mdFirst(md, 'dc.caseyear', ['dc.case.year']);
    const parts = [title, caseType, caseYear].filter(Boolean);
    return parts.length ? parts.join('_') : 'N/A';
  }

  // ---------- Generated files table ----------
  loadGeneratedFiles(page: number = this.currentPage) {
    this.cnrService.getRecords(
      page,
      this.pageSize,
      this.filterSubmitted === '' ? undefined : this.filterSubmitted,
      'createdAt',
      this.sortDir
    )
    .subscribe({
      next: (response: any) => {
        this.totalPages  = response.totalPages ?? 0;
        this.currentPage = response.number ?? 0;

        const postErrorMap  = this.POST_CODE_MAP;
        const checkErrorMap = this.CHECK_CODE_MAP;
        const records = Array.isArray(response.content) ? response.content : [];

        this.generatedFiles = records.map((file: any) => {
          const postResp: string  = file.postResponse ?? '';
          const checkResp: string = file.getCheckResponse ?? '';

          const postStatusCode: string | undefined =
            (file.postStatus != null ? String(file.postStatus) : undefined) ||
            postResp.match(/^(\d{3})/)?.[1];

          const checkStatusCode: string | undefined =
            (file.getCheckStatus != null ? String(file.getCheckStatus) : undefined) ||
            checkResp.match(/^(\d{3})/)?.[1];

          let userFriendlyPostResponse = '';
          if (file.status && String(file.status).trim().length > 0) {
            userFriendlyPostResponse = String(file.status).trim();
          } else if (postResp.includes('Folder to zip not found')) {
            userFriendlyPostResponse = 'Folder to zip not found.';
          } else if (postStatusCode && postErrorMap[postStatusCode]) {
            userFriendlyPostResponse = postErrorMap[postStatusCode];
          } else {
            userFriendlyPostResponse = postResp || 'Not submitted yet';
          }

          const userFriendlyCheckResponse =
            (checkStatusCode && checkErrorMap[checkStatusCode]) ||
            checkResp ||
            'Not verified yet';

          return {
            ...file,
            selected: false,
            status: 'idle',
            checkStatusState: 'idle',
            userFriendlyPostResponse,
            userFriendlyCheckResponse,
            deleting: false
          };
        });

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching generated files:', err);
        this.generatedFiles = [];
        this.cdr.detectChanges();
      }
    });
  }

  // ---------- Search ----------
  searchItems() {
    this.loading = true;
    this.cdr.detectChanges();

    if (this.searchMode === 'cino') {
      if (this.searchQuery.trim() === '') {
        this.loading = false;
        this.searchResults = [];
        this.cdr.detectChanges();
        return;
      }

      this.cnrService.getSearchResults(this.searchQuery)
        .pipe(finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }))
        .subscribe({
          next: (response) => {
            const objects = response._embedded?.searchResult?._embedded?.objects || [];
            this.searchResults = objects.map((obj: any) => {
              const metadata = obj._embedded?.indexableObject?.metadata || {};
              return {
                cino: metadata['dc.cino']?.[0]?.value || 'N/A',
                fileName: this.buildDisplayFileName(metadata),
                hashValue: 'N/A',
                createdAt: obj._embedded?.indexableObject?.lastModified || 'N/A',
                selected: false,
                ackId: obj._embedded?.indexableObject?.ackId || null,
                itemUUID: obj._embedded?.indexableObject?.uuid || null
              } as FileRecord;
            });
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Search error:', err);
            this.searchResults = [];
            this.cdr.detectChanges();
          }
        });

    } else {
      const caseNumber = this.caseNumberInput?.trim() || undefined;
      const caseType   = this.caseTypeInput?.trim()   || undefined;
      const caseYear   = this.caseYearInput?.trim()   || undefined;

      if (!caseNumber && !caseType && !caseYear) {
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }

      this.searchPageService
        .getSearchResults(caseNumber, caseType, caseYear, 'dc.title', 'ASC', 10)
        .pipe(finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }))
        .subscribe({
          next: (response) => {
            const objects = response?._embedded?.searchResult?._embedded?.objects || [];
            this.searchResults = objects.map((obj: any) => {
              const md = obj._embedded?.indexableObject?.metadata || {};
              return {
                cino: md['dc.cino']?.[0]?.value || 'N/A',
                fileName: this.buildDisplayFileName(md),
                hashValue: 'N/A',
                createdAt: obj._embedded?.indexableObject?.lastModified || 'N/A',
                selected: false,
                ackId: obj._embedded?.indexableObject?.ackId || null,
                itemUUID: obj._embedded?.indexableObject?.uuid || null
              } as FileRecord;
            });
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Case search error:', err);
            this.searchResults = [];
            this.cdr.detectChanges();
          }
        });
    }
  }

  onSearchInput() {
    if (this.searchMode !== 'cino') return;
    if (this.searchQuery.trim() === '') {
      this.searchResults = [];
      this.cdr.detectChanges();
    }
  }

  clearCaseInputs() {
    this.caseNumberInput = '';
    this.caseTypeInput = '';
    this.caseYearInput = '';
    this.cdr.detectChanges();
  }

  onSearchSelectionChange() {
    this.selectedSearchFiles = this.searchResults.filter(file => (file as any).selected);
    this.cdr.detectChanges();
  }
  onGeneratedSelectionChange() {
    this.selectedGeneratedFiles = this.generatedFiles.filter(file => file.selected);
    this.cdr.detectChanges();
  }

  // ---------- Generate ----------
  generateFiles() {
    if (this.cartItems.length === 0) return;

    this.generating = true;
    this.cdr.detectChanges();

    const calls = this.cartItems.map(item =>
      this.cnrService.generate(item.itemUUID).pipe(
        catchError(err => {
          console.error(`Error generating zip for Item UUID: ${item.itemUUID}`, err);
          return of(null);
        })
      )
    );

    forkJoin(calls)
      .pipe(finalize(() => {
        this.generating = false;
        // Refresh generated files list without full page reload
        this.loadGeneratedFiles(this.currentPage);
        this.cdr.detectChanges();
      }))
      .subscribe();
  }

  // ---------- Submit Single (ackId-aware) ----------
  submitFile(file: FileRecord & {
    status?: SubmitState;
    userFriendlyPostResponse?: string;
    postResponse?: string;
    ackId?: string;
    checkStatusState?: CheckState;
    userFriendlyCheckResponse?: string;
  }) {
    if (!file.fileName) return;

    // If already posted (ackId present), just check status
    if (file.ackId) {
      this.checkStatus(file as any);
      return;
    }

    // Otherwise, post it
    file.status = 'submitting';
    file.userFriendlyPostResponse = '';
    this.cdr.detectChanges();

    this.cnrService.submitCase(file.fileName).subscribe({
      next: (response) => {
        const { code, message, ackId, raw } = this.parsePostResult(response);
        if (ackId) (file as any).ackId = ackId;

        const isSuccess = code ? code.startsWith('2') : true;
        file.status = isSuccess ? 'submitted' : 'error';

        file.userFriendlyPostResponse = this.mapFriendly(this.POST_CODE_MAP, code, message, raw, 'Unknown response');
        file.postResponse = raw;
        this.cdr.detectChanges();
      },
      error: (err) => {
        const { code, message, raw } = this.parsePostResult(err);
        file.status = 'error';
        file.userFriendlyPostResponse = this.mapFriendly(this.POST_CODE_MAP, code, message, raw, 'Submission failed');
        file.postResponse = raw;
        this.cdr.detectChanges();
      }
    });
  }

  // ---------- Submit Multiple (Post All Files) ----------
  // For each selected file:
  //    * if ackId == null -> POST
  //    * if ackId exists  -> CHECK status
  submitAllFiles() {
    if (this.selectedGeneratedFiles.length === 0) return;

    this.submitting = true;
    this.cdr.detectChanges();

    const toPost  = this.selectedGeneratedFiles.filter(f => !f.ackId);
    const toCheck = this.selectedGeneratedFiles.filter(f => !!f.ackId);

    const postCalls = toPost.map(item => {
      item.status = 'submitting';
      item.userFriendlyPostResponse = '';
      return this.cnrService.submitCase(item.fileName).pipe(
        map(resp => {
          const { code, message, ackId, raw } = this.parsePostResult(resp);
          if (ackId) item.ackId = ackId;
          const isSuccess = code ? code.startsWith('2') : true;
          item.status = isSuccess ? 'submitted' : 'error';
          item.userFriendlyPostResponse = this.mapFriendly(this.POST_CODE_MAP, code, message, raw, 'Unknown response');
          item.postResponse = raw;
          return true;
        }),
        catchError(err => {
          const { code, message, raw } = this.parsePostResult(err);
          item.status = 'error';
          item.userFriendlyPostResponse = this.mapFriendly(this.POST_CODE_MAP, code, message, raw, 'Submission failed');
          item.postResponse = raw;
          return of(false);
        })
      );
    });

    const checkCalls = toCheck.map(item => {
      item.checkStatusState = 'checking';
      return this.cnrService.checkStatus(item.ackId as string).pipe(
        map(resp => {
          const { code, message, raw } = this.parsePostResult(resp);
          item.checkStatusState = 'checked';
          item.userFriendlyCheckResponse = this.mapFriendly(this.CHECK_CODE_MAP, code, message, raw, 'Checked successfully');
          return true;
        }),
        catchError(err => {
          const { code, message, raw } = this.parsePostResult(err);
          item.checkStatusState = 'error';
          item.userFriendlyCheckResponse = this.mapFriendly(this.CHECK_CODE_MAP, code, message, raw, 'Status check failed');
          return of(false);
        })
      );
    });

    const allCalls = [...postCalls, ...checkCalls];

    forkJoin(allCalls.length ? allCalls : [of(true)])
      .pipe(finalize(() => {
        this.submitting = false;
        this.loadGeneratedFiles(this.currentPage); // Refresh list to reflect ackIds/statuses
        this.cdr.detectChanges();
      }))
      .subscribe();
  }

  // ---------- Delete a generated (zip) file ----------
  deleteGenerated(file: FileRecord & { fileName?: string }) {
    if (!file?.fileName) return;
    const row = this.generatedFiles.find(f => f.fileName === file.fileName);
    if (row) row.deleting = true;
    this.cdr.detectChanges();

    this.cnrService.deleteGenerated(file.fileName)
      .pipe(finalize(() => {
        if (row) row.deleting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          // Refresh list after successful delete
          this.loadGeneratedFiles(this.currentPage);
        },
        error: (err) => {
          console.error('Delete failed:', err);
          alert('Failed to delete file.');
        }
      });
  }

  // ---------- Check Status ----------
  checkStatus(file: FileRecord & { checkStatusState?: CheckState; userFriendlyCheckResponse?: string; ackId?: string }) {
    if (!file.ackId) return;

    file.checkStatusState = 'checking';
    this.cdr.detectChanges();

    this.cnrService.checkStatus(file.ackId).subscribe({
      next: (response) => {
        const { code, message, raw } = this.parsePostResult(response);
        file.checkStatusState = 'checked';
        file.userFriendlyCheckResponse = this.mapFriendly(this.CHECK_CODE_MAP, code, message, raw, 'Checked successfully');
        this.cdr.detectChanges();
      },
      error: (err) => {
        const { code, message, raw } = this.parsePostResult(err);
        file.checkStatusState = 'error';
        file.userFriendlyCheckResponse = this.mapFriendly(this.CHECK_CODE_MAP, code, message, raw, 'Status check failed');
        this.cdr.detectChanges();
      }
    });
  }

  // ---------- Filters ----------
  applyFilters() {
    this.currentPage = 0;
    this.loadGeneratedFiles(0);
  }

  // Optional helper (currently unused)
  private computeStatusText(rec: any): string {
    const backendStatus = (rec.status || '').toString().trim();
    if (backendStatus) return backendStatus;
    const postStatus = rec.postStatus ? String(rec.postStatus) : undefined;
    if (postStatus && this.POST_CODE_MAP[postStatus]) {
      return this.POST_CODE_MAP[postStatus];
    }
    const postResp = rec.postResponse || '';
    if (postResp) {
      const { code, message, raw } = this.parsePostResult(postResp);
      const friendly = this.mapFriendly(this.POST_CODE_MAP, code, message, raw, '');
      if (friendly) return friendly;
      return postResp;
    }
    return 'Not submitted yet';
  }
}
