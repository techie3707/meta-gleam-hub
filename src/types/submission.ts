/**
 * TypeScript interfaces for the DSpace Submission Workflow
 * Used by CreateItem dynamic form generation
 */

/** Submission Section from the submission definition */
export interface SubmissionSection {
  id: string;
  header?: string;
  mandatory: boolean;
  sectionType: "submission-form" | "upload" | "license" | string;
  type: string;
  scope?: string;
  visibility?: {
    main: string | null;
    other: string;
  };
  _links: {
    self: { href: string };
    config?: { href: string };
  };
}

/** Submission Form Configuration (response from /api/config/submissionforms/{id}) */
export interface SubmissionFormConfig {
  id: string;
  name: string;
  rows: FormRow[];
  type: string;
  _links: {
    self: { href: string };
  };
}

/** A single row in the form config */
export interface FormRow {
  fields: DynamicFormField[];
}

/** A dynamic form field definition */
export interface DynamicFormField {
  input: {
    type: "onebox" | "date" | "dropdown" | "textarea" | "series" | string;
  };
  label: string;
  mandatory: boolean;
  repeatable: boolean;
  hints?: string;
  mandatoryMessage?: string;
  style?: string;
  selectableMetadata: SelectableMetadata[];
  languageCodes: any[];
  typeBind: any[];
}

/** Selectable metadata binding for a field */
export interface SelectableMetadata {
  metadata: string;
  label: string | null;
  closed: boolean;
  controlledVocabulary?: string;
}

/** Full workspace item response including submission definition */
export interface WorkspaceItemWithDefinition {
  id: number;
  errors?: Array<{
    message: string;
    paths: string[];
  }>;
  lastModified: string;
  sections: Record<string, any>;
  type: string;
  _links: Record<string, any>;
  _embedded: {
    item?: {
      id: string;
      uuid: string;
      name: string;
      handle?: string;
      metadata: Record<string, any>;
      inArchive?: boolean;
      discoverable?: boolean;
      withdrawn?: boolean;
      lastModified?: string;
      type: string;
    };
    collection?: {
      uuid: string;
      name: string;
      handle?: string;
      type: string;
    };
    submissionDefinition?: {
      id: string;
      name: string;
      type: string;
      isDefault?: boolean;
      _links: Record<string, any>;
      _embedded?: {
        sections?: {
          _embedded?: {
            sections: SubmissionSection[];
          };
          _links?: Record<string, any>;
          page?: {
            number: number;
            size: number;
            totalPages: number;
            totalElements: number;
          };
        };
      };
    };
  };
}

/** Parsed form section for UI rendering */
export interface ParsedFormSection {
  id: string;
  header: string;
  sectionType: string;
  mandatory: boolean;
  configUrl?: string;
  formConfig?: SubmissionFormConfig;
}
