import { AsyncPipe, NgFor, NgIf } from "@angular/common"
import {
  Component,
    ElementRef,
  EventEmitter,
  Input,
    OnDestroy,
    OnInit,
  Output,
  ViewChild,
} from "@angular/core"
import {   NgbModal,   NgbNavChangeEvent, NgbNavModule } from "@ng-bootstrap/ng-bootstrap"
import {
  DynamicDatePickerModel,
    DynamicFormControlModel,
  DynamicFormGroupModel,
  DynamicSelectModel,
} from "@ng-dynamic-forms/core"
import { TranslateModule } from "@ngx-translate/core"
import {
  BehaviorSubject,
  combineLatest as observableCombineLatest,
    Observable,
  of as observableOf,
    Subscription,
} from "rxjs"
import { filter, map, take } from "rxjs/operators"

import  { DSONameService } from "../../../core/breadcrumbs/dso-name.service"
import  { RemoteData } from "../../../core/data/remote-data"
import  { RequestService } from "../../../core/data/request.service"
import  { EPersonDataService } from "../../../core/eperson/eperson-data.service"
import  { GroupDataService } from "../../../core/eperson/group-data.service"
import { ResourcePolicy } from "../../../core/resource-policy/models/resource-policy.model"
import { RESOURCE_POLICY } from "../../../core/resource-policy/models/resource-policy.resource-type"
import   { DSpaceObject } from "../../../core/shared/dspace-object.model"
import { getFirstSucceededRemoteData } from "../../../core/shared/operators"
import { BtnDisabledDirective } from "../../btn-disabled.directive"
import { dateToISOFormat, stringToNgbDateStruct } from "../../date.util"
import { hasValue, hasValueOperator, isEmpty, isNotEmpty } from "../../empty.util"
import { EpersonGroupListComponent } from "../../eperson-group-list/eperson-group-list.component"
import { DsDynamicInputModel } from "../../form/builder/ds-dynamic-form-ui/models/ds-dynamic-input.model"
import { DsDynamicTextAreaModel } from "../../form/builder/ds-dynamic-form-ui/models/ds-dynamic-textarea.model"
import { FormComponent } from "../../form/form.component"
import   { FormService } from "../../form/form.service"
import {
  RESOURCE_POLICY_FORM_ACTION_TYPE_CONFIG,
  RESOURCE_POLICY_FORM_DATE_GROUP_CONFIG,
  RESOURCE_POLICY_FORM_DATE_GROUP_LAYOUT,
  RESOURCE_POLICY_FORM_DESCRIPTION_CONFIG,
  RESOURCE_POLICY_FORM_END_DATE_CONFIG,
  RESOURCE_POLICY_FORM_END_DATE_LAYOUT,
  RESOURCE_POLICY_FORM_NAME_CONFIG,
  RESOURCE_POLICY_FORM_POLICY_TYPE_CONFIG,
  RESOURCE_POLICY_FORM_START_DATE_CONFIG,
  RESOURCE_POLICY_FORM_START_DATE_LAYOUT,
} from "./resource-policy-form.model"
import { FormsModule } from "@angular/forms"

export interface ResourcePolicyEvent {
  object: ResourcePolicy
  target: {
    type: string
    uuid: string
  }
  updateTarget: boolean
}

@Component({
  selector: "ds-resource-policy-form",
  templateUrl: "./resource-policy-form.component.html",
  imports: [
    FormsModule,
    FormComponent,
    NgbNavModule,
    EpersonGroupListComponent,
    TranslateModule,
    AsyncPipe,
    NgIf,
    NgFor,
    BtnDisabledDirective,
  ],
  standalone: true,
})
/**
 * Component that show form for adding/editing a resource policy
 */
export class ResourcePolicyFormComponent implements OnInit, OnDestroy {
  /**
   * If given contains the resource policy to edit
   * @type {ResourcePolicy}
   */
  @Input() resourcePolicy: ResourcePolicy

  /**
   * A boolean representing if form submit operation is processing
   * @type {boolean}
   */
  @Input() isProcessing: Observable<boolean> = observableOf(false)

  /**
   * An event fired when form is canceled.
   * Event's payload is empty.
   */
  @Output() reset: EventEmitter<any> = new EventEmitter<any>()

  /**
   * An event fired when form is submitted.
   * Event's payload equals to a new ResourcePolicy.
   */
  @Output() submit: EventEmitter<ResourcePolicyEvent> = new EventEmitter<ResourcePolicyEvent>()

  @ViewChild("content") content: ElementRef

  /**
   * The form id
   * @type {string}
   */
  public formId: string

  /**
   * The form model
   * @type {DynamicFormControlModel[]}
   */
  public formModel: DynamicFormControlModel[]

  /**
   * The eperson or group that will be granted the permission
   * @type {DSpaceObject}
   */
  public resourcePolicyGrant: DSpaceObject

  /**
   * The type of the object that will be grant of the permission. It could be 'eperson' or 'group'
   * @type {string}
   */
  public resourcePolicyGrantType: string

  /**
   * The name of the eperson or group that will be granted the permission
   * @type {BehaviorSubject<string>}
   */
  public resourcePolicyTargetName$: BehaviorSubject<string> = new BehaviorSubject("")

  /**
   * A boolean representing if component is active
   * @type {boolean}
   */
  private isActive: boolean

  /**
   * Array to track all subscriptions and unsubscribe them onDestroy
   * @type {Array}
   */
  private subs: Subscription[] = []

  navActiveId: string

  resourcePolicyTargetUpdated = false
  pageStart: number = null
  pageEnd: number = null

  // New properties for time selection
  startTime = "00:00"
  endTime = "23:59"

  // Properties for print and download restrictions
  print = false
  download = false

  // Flag to indicate if validation errors exist
  validationErrors: string[] = []

  /**
   * Initialize instance variables
   *
   * @param {DSONameService} dsoNameService
   * @param {EPersonDataService} ePersonService
   * @param {FormService} formService
   * @param {GroupDataService} groupService
   * @param {RequestService} requestService
   * @param modalService
   */
  constructor(
    private dsoNameService: DSONameService,
    private ePersonService: EPersonDataService,
    private formService: FormService,
    private groupService: GroupDataService,
    private requestService: RequestService,
    private modalService: NgbModal,
  ) {}

  /**
   * Initialize the component, setting up the form model
   */
  ngOnInit(): void {
    this.isActive = true
    this.formId = this.formService.getUniqueId("resource-policy-form")
    this.formModel = this.buildResourcePolicyForm()

    if (this.isBeingEdited()) {
      // Log the entire resource policy object to see all available data
      console.log("FULL RESOURCE POLICY OBJECT:", JSON.stringify(this.resourcePolicy, null, 2))
      console.log("Resource Policy Links:", this.resourcePolicy._links)

      // If there's a self link, log it as this is likely the API endpoint
      if (this.resourcePolicy._links && this.resourcePolicy._links.self) {
        console.log("API ENDPOINT:", this.resourcePolicy._links.self.href)
      }

      const epersonRD$ = this.ePersonService
        .findByHref(this.resourcePolicy._links.eperson.href, false)
        .pipe(getFirstSucceededRemoteData())
      const groupRD$ = this.groupService
        .findByHref(this.resourcePolicy._links.group.href, false)
        .pipe(getFirstSucceededRemoteData())
      const dsoRD$: Observable<RemoteData<DSpaceObject>> = observableCombineLatest([epersonRD$, groupRD$]).pipe(
        map((rdArr: RemoteData<DSpaceObject>[]) => {
          return rdArr.find((rd: RemoteData<DSpaceObject>) => isNotEmpty(rd.payload))
        }),
        hasValueOperator(),
      )
      this.subs.push(
        dsoRD$.pipe(filter(() => this.isActive)).subscribe((dsoRD: RemoteData<DSpaceObject>) => {
          this.resourcePolicyGrant = dsoRD.payload
          this.navActiveId = String(dsoRD.payload.type)
          this.resourcePolicyTargetName$.next(this.getResourcePolicyTargetName())
        }),
      )

      // Initialize page start and page end values if editing an existing policy
      this.pageStart = this.resourcePolicy.pageStart || null
      this.pageEnd = this.resourcePolicy.pageEnd || null

      // Initialize print and download values if editing an existing policy
      if (this.resourcePolicy.hasOwnProperty("print")) {
        this.print = this.resourcePolicy.print
        console.log("Loaded print value:", this.print)
      }

      if (this.resourcePolicy.hasOwnProperty("download")) {
        this.download = this.resourcePolicy.download
        console.log("Loaded download value:", this.download)
      }

      // Log the raw date values
      if (hasValue(this.resourcePolicy.startDate)) {
        console.log("FULL START DATE VALUE:", this.resourcePolicy.startDate)
        console.log("START DATE TYPE:", typeof this.resourcePolicy.startDate)
        console.log("Start Date Object:", new Date(this.resourcePolicy.startDate))
        this.extractTimeFromDate(this.resourcePolicy.startDate, true)
      }

      if (hasValue(this.resourcePolicy.endDate)) {
        console.log("FULL END DATE VALUE:", this.resourcePolicy.endDate)
        console.log("END DATE TYPE:", typeof this.resourcePolicy.endDate)
        console.log("End Date Object:", new Date(this.resourcePolicy.endDate))
        this.extractTimeFromDate(this.resourcePolicy.endDate, false)
      }
    }
  }

  /**
   * Extract time from ISO date string and set to appropriate time field
   *
   * @param dateString ISO date string
   * @param isStartDate whether this is for start date or end date
   */
  private extractTimeFromDate(dateString: string, isStartDate: boolean): void {
    try {
      console.log(`Extracting time from ${isStartDate ? "start" : "end"} date:`, dateString)

      // Parse the ISO date string
      const date = new Date(dateString)

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date")
      }

      // Extract hours and minutes, ensuring they are padded with leading zeros
      const hours = date.getHours().toString().padStart(2, "0")
      const minutes = date.getMinutes().toString().padStart(2, "0")

      // Format as HH:MM
      const timeString = `${hours}:${minutes}`
      console.log(`Extracted time: ${timeString}`)

      // Set the appropriate time property
      if (isStartDate) {
        this.startTime = timeString
        console.log("Set start time to:", this.startTime)
      } else {
        this.endTime = timeString
        console.log("Set end time to:", this.endTime)
      }
    } catch (e) {
      console.error(`Error parsing ${isStartDate ? "start" : "end"} date:`, e)
      // Use default values if parsing fails
      if (isStartDate) {
        this.startTime = "00:00"
        console.log("Using default start time:", this.startTime)
      } else {
        this.endTime = "23:59"
        console.log("Using default end time:", this.endTime)
      }
    }
  }

  /**
   * Method to check if the form status is valid or not
   *
   * @return Observable that emits the form status
   */
  isFormValid(): Observable<boolean> {
    return this.formService.isValid(this.formId).pipe(
      map((isValid: boolean) => {
        // Check if the form is valid and if there are no validation errors
        const valid = isValid && isNotEmpty(this.resourcePolicyGrant) && this.validatePageRange()
        return valid
      }),
    )
  }

  /**
   * Validate the page range (start and end)
   * @returns boolean indicating if the page range is valid
   */
  validatePageRange(): boolean {
    this.validationErrors = []

    if (this.pageStart === null) {
      this.validationErrors.push("resource-policies.form.date.page-start.required")
    }
    if (this.pageEnd === null) {
      this.validationErrors.push("resource-policies.form.date.page-end.required")
    }

    // If both pageStart and pageEnd are set, ensure pageStart <= pageEnd
    if (this.pageStart !== null && this.pageEnd !== null) {
      if (this.pageStart > this.pageEnd) {
        this.validationErrors.push("resource-policies.form.date.page-range.invalid")
      }
    }

    return this.validationErrors.length === 0
  }

  /**
   * Initialize the form model
   *
   * @return the form models
   */
  private buildResourcePolicyForm(): DynamicFormControlModel[] {
    const formModel: DynamicFormControlModel[] = []

    const nameConfig = {
      ...RESOURCE_POLICY_FORM_NAME_CONFIG,
      required: true,
      validators: { required: null },
      errorMessages: { required: "resource-policies.form.name.required" },
    }
    const descriptionConfig = {
      ...RESOURCE_POLICY_FORM_DESCRIPTION_CONFIG,
      required: true,
      validators: { required: null },
      errorMessages: { required: "resource-policies.form.description.required" },
    }

    formModel.push(
      new DsDynamicInputModel(nameConfig),
      new DsDynamicTextAreaModel(descriptionConfig),
      new DynamicSelectModel(RESOURCE_POLICY_FORM_POLICY_TYPE_CONFIG),
      new DynamicSelectModel(RESOURCE_POLICY_FORM_ACTION_TYPE_CONFIG),
    )

    const startDateModel = new DynamicDatePickerModel(
      {
        ...RESOURCE_POLICY_FORM_START_DATE_CONFIG,
        required: true,
        validators: { required: null },
        errorMessages: { required: "resource-policies.form.date.start.required" },
      },
      RESOURCE_POLICY_FORM_START_DATE_LAYOUT,
    )
    const endDateModel = new DynamicDatePickerModel(
      {
        ...RESOURCE_POLICY_FORM_END_DATE_CONFIG,
        required: true,
        validators: { required: null },
        errorMessages: { required: "resource-policies.form.date.end.required" },
      },
      RESOURCE_POLICY_FORM_END_DATE_LAYOUT,
    )
    const dateGroupConfig = Object.assign({}, RESOURCE_POLICY_FORM_DATE_GROUP_CONFIG, { group: [] })
    dateGroupConfig.group.push(startDateModel, endDateModel)
    formModel.push(new DynamicFormGroupModel(dateGroupConfig, RESOURCE_POLICY_FORM_DATE_GROUP_LAYOUT))

    this.initModelsValue(formModel)
    return formModel
  }

  /**
   * Setting up the form models value
   *
   * @return the form models
   */
  initModelsValue(formModel: DynamicFormControlModel[]): DynamicFormControlModel[] {
    if (this.resourcePolicy) {
      formModel.forEach((model: any) => {
        if (model.id === "date") {
          const startDateControl = model.get(0)
          const endDateControl = model.get(1)

          if (hasValue(this.resourcePolicy.startDate)) {
            startDateControl.value = stringToNgbDateStruct(this.resourcePolicy.startDate)
          } else {
            // Default to current date if no start date is provided
            startDateControl.value = stringToNgbDateStruct(new Date().toISOString())
          }

          if (hasValue(this.resourcePolicy.endDate)) {
            endDateControl.value = stringToNgbDateStruct(this.resourcePolicy.endDate)
          } else {
            // Default to current date if no end date is provided
            endDateControl.value = stringToNgbDateStruct(new Date().toISOString())
          }
        } else {
          if (this.resourcePolicy.hasOwnProperty(model.id) && this.resourcePolicy[model.id]) {
            model.value = this.resourcePolicy[model.id]
          }
        }
      })
    }

    return formModel
  }

  /**
   * Return a boolean representing If is possible to set policy grant
   *
   * @return true if is possible, false otherwise
   */
  isBeingEdited(): boolean {
    return !isEmpty(this.resourcePolicy)
  }

  /**
   * Return the name of the eperson or group that will be granted the permission
   *
   * @return the object name
   */
  getResourcePolicyTargetName(): string {
    return isNotEmpty(this.resourcePolicyGrant) ? this.dsoNameService.getName(this.resourcePolicyGrant) : ""
  }

  /**
   * Update reference to the eperson or group that will be granted the permission
   */
  updateObjectSelected(object: DSpaceObject, isEPerson: boolean): void {
    this.resourcePolicyTargetUpdated = true
    this.resourcePolicyGrant = object
    this.resourcePolicyGrantType = isEPerson ? "eperson" : "group"
    this.resourcePolicyTargetName$.next(this.getResourcePolicyTargetName())
  }

  /**
   * Method called on reset
   * Emit a new reset Event
   */
  onReset(): void {
    this.reset.emit()
  }

  /**
   * Update print value and log the change
   */
  updatePrint(value: boolean): void {
    this.print = value
    console.log("Print value changed to:", this.print)
  }

  /**
   * Update download value and log the change
   */
  updateDownload(value: boolean): void {
    this.download = value
    console.log("Download value changed to:", this.download)
  }

  /**
   * Method called on submit.
   * Emit a new submit Event whether the form is valid
   */
  onSubmit(): void {
    // Validate the page range
    if (!this.validatePageRange()) {
      console.error("Validation errors:", this.validationErrors)
      return
    }

    // Log current values before submission
    console.log("Before submission - Print:", this.print)
    console.log("Before submission - Download:", this.download)
    console.log("Before submission - Page Start:", this.pageStart)
    console.log("Before submission - Page End:", this.pageEnd)

    this.formService
      .getFormData(this.formId)
      .pipe(take(1))
      .subscribe((data) => {
        const eventPayload: ResourcePolicyEvent = Object.create({})
        eventPayload.object = this.createResourcePolicyByFormData(data)

        // Log the final resource policy object
        console.log("Resource Policy Object to be submitted:", eventPayload.object)

        eventPayload.target = {
          type: this.resourcePolicyGrantType,
          uuid: this.resourcePolicyGrant.id,
        }
        eventPayload.updateTarget = this.resourcePolicyTargetUpdated

        // Emit the event with all fields included in a single object
        // This ensures all data is sent in a single PUT request
        this.submit.emit(eventPayload)
      })
  }

  /**
   * Create e new ResourcePolicy by form data
   *
   * @return the new ResourcePolicy object
   */
  createResourcePolicyByFormData(data): ResourcePolicy {
    const resourcePolicy = new ResourcePolicy()
    resourcePolicy.name = data.name ? data.name[0].value : null
    resourcePolicy.description = data.description ? data.description[0].value : null
    resourcePolicy.policyType = data.policyType ? data.policyType[0].value : null
    resourcePolicy.action = data.action ? data.action[0].value : null

    // Combine date and time for start date
    if (data.date && data.date.start && data.date.start[0].value) {
      const startDate = this.combineDateAndTime(data.date.start[0].value, this.startTime)
      resourcePolicy.startDate = startDate
    } else {
      // If no date is selected, populate with current date
      resourcePolicy.startDate = new Date().toISOString()
    }

    // Combine date and time for end date
    if (data.date && data.date.end && data.date.end[0].value) {
      const endDate = this.combineDateAndTime(data.date.end[0].value, this.endTime)
      resourcePolicy.endDate = endDate
    } else {
      // If no date is selected, populate with current date
      resourcePolicy.endDate = new Date().toISOString()
    }

    // Include all fields in the object for a single PUT request
    resourcePolicy.pageStart = this.pageStart
    resourcePolicy.pageEnd = this.pageEnd
    resourcePolicy.print = this.print
    resourcePolicy.download = this.download

    console.log("Creating resource policy with all fields:", {
      name: resourcePolicy.name,
      description: resourcePolicy.description,
      policyType: resourcePolicy.policyType,
      action: resourcePolicy.action,
      startDate: resourcePolicy.startDate,
      endDate: resourcePolicy.endDate,
      pageStart: resourcePolicy.pageStart,
      pageEnd: resourcePolicy.pageEnd,
      print: resourcePolicy.print,
      download: resourcePolicy.download,
    })

    resourcePolicy.type = RESOURCE_POLICY

    return resourcePolicy
  }

  /**
   * Combines a date object with a time string to create an ISO date string
   *
   * @param dateStruct NgbDateStruct from the date picker
   * @param timeString Time string in format "HH:MM"
   * @returns ISO formatted date string with time
   */
  private combineDateAndTime(dateStruct: any, timeString: string): string {
    if (!dateStruct || !timeString) {
      return null
    }

    try {
      // First convert the date struct to ISO format (this gives us just the date part)
      const dateString = dateToISOFormat(dateStruct)

      // Parse the time string
      const [hours, minutes] = timeString.split(":").map((part) => Number.parseInt(part, 10))

      // Create a new date object from the ISO string
      const dateObj = new Date(dateString)

      // Set the time components
      dateObj.setHours(hours)
      dateObj.setMinutes(minutes)
      dateObj.setSeconds(0)
      dateObj.setMilliseconds(0)

      // Return the ISO string of the combined date and time
      return dateObj.toISOString()
    } catch (e) {
      console.error("Error combining date and time:", e)
      // Fallback to just the date if there's an error
      return dateToISOFormat(dateStruct)
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  ngOnDestroy(): void {
    this.isActive = false
    this.formModel = null
    this.subs.filter((subscription) => hasValue(subscription)).forEach((subscription) => subscription.unsubscribe())
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    // if a policy is being edited it should not be possible to switch between group and eperson
    if (this.isBeingEdited()) {
      changeEvent.preventDefault()
      this.modalService.open(this.content)
    }
  }
}
