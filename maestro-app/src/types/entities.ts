// src/types/entities.ts — Data Fabric entity types (Blueprint v3)

export interface ImportCaseRecord {
  id?: string;
  CaseRef: string;
  ImporterName: string;
  SupplierName: string;
  PoNumber: string;
  HtsCode?: string;
  CurrentStage: string;
  CaseState: string;
  SlaDeadline?: string;
  CbpStatus?: string;
  CbpEntryNumber?: string;
  TotalValueUsd?: number;
  DutyAmountUsd?: number;
  PortOfEntry?: string;
  CountryOfOrigin?: string;
  PgaFlag?: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface HumanTaskRecord {
  id?: string;
  CaseRef: string;
  TaskCode: string;
  TaskTitle: string;
  AssigneeRole: string;
  TaskState: string;
  SlaDeadline: string;
  CompletedAt?: string;
  DecisionOutcome?: string;
  InputPayload?: string;
  CreatedAt?: string;
}

export interface OfacScreeningRecord {
  id?: string;
  CaseRef: string;
  PartyName: string;
  PartyRole: string;
  PartyCountry?: string;
  MatchResult: string;
  MatchScore?: number;
  MatchedSdnEntry?: string;
  ListVersion?: string;
  ReviewedBy?: string;
  ReviewNotes?: string;
  ScreenedAt?: string;
}

export interface IsfFilingRecord {
  id?: string;
  CaseRef: string;
  FilingStatus: string;
  DeadlineUtc: string;
  SubmittedAt?: string;
  AceTxnNumber?: string;
  SlaBreached?: boolean;
  SellerNameAddress?: string;
  BuyerNameAddress?: string;
  ImporterOfRecord?: string;
  ConsigneeNameAddress?: string;
  ManufacturerNameAddress?: string;
  ShipToParty?: string;
  CountryOfOrigin?: string;
  HtsCode?: string;
  ContainerStuffingLocation?: string;
  ConsolidatorName?: string;
}

export interface ShipmentDocument {
  id?: string;
  CaseRef: string;
  FileName: string;
  DocumentCategory: string;
  UploadedBy?: string;
  UploadedAt?: string;
  IdpConfidence?: number;
  RetentionYears?: number;
  FileSizeBytes?: number;
  ExtractedFields?: string;
  ExpiresAt?: string;
}

export interface DutyCalculation {
  id?: string;
  CaseRef: string;
  HtsCode?: string;
  MfnRatePercent?: number;
  Section301Percent?: number;
  AddCvdPercent?: number;
  MpfUsd?: number;
  HmfUsd?: number;
  TotalDutyUsd?: number;
  DeclaredValueUsd?: number;
  ActualDutyUsd?: number;
  VarianceUsd?: number;
  VariancePct?: number;
  CalculatedAt?: string;
}

export interface AuditEntry {
  id?: string;
  CaseRef: string;
  ActorUserId: string;
  ActorRole: string;
  ActionType: string;
  StageId: string;
  TaskCode?: string;
  FieldChanged?: string;
  PreviousValue?: string;
  NewValue?: string;
  DecisionOutcome?: string;
  SessionId?: string;
  RecordedAt: string;
}
