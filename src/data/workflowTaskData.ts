export interface SortOption {
  value: string;
  label: string;
  apiValue: string;
}

// Facet response from API
export interface FacetResponse {
  _embedded?: {
    values?: FacetValue[];
  };
}

// Individual facet value
export interface FacetValue {
  label: string;
  count: number;
  authorityKey: string | null;
  _links: {
    search: {
      href: string;
    };
  };
}

// Workflow objects response
export interface WorkflowObjectsResponse {
  _embedded: {
    searchResult: {
      _embedded: {
        objects: Array<{
          _embedded: {
            indexableObject: {
              id: number;
              type: "claimedtask" | "pooltask";
              workflow: WorkflowItem;
            }
          };
        }>;
      };
      page: {
        totalElements: number;
        totalPages: number;
        number: number;
        size: number;
      };
    };
  };
  _links: {
    self: {
      href: string;
    };
  };
}

// Workflow item with task details
export interface WorkflowItem {
  id: number;
  type: string;
  lastModified?: string;
  _links: {
    self: { href: string };
    step?: { href: string };
    action?: { href: string };
    owner?: { href: string };
    workflowitem?: { href: string };
  };
  _embedded: {
    owner?: {
      id: string;
      uuid: string;
      name: string;
      email: string;
      metadata?: {
        "eperson.firstname"?: { value: string }[];
        "eperson.lastname"?: { value: string }[];
      };
      _links?: {
        groups: { href: string };
        self: { href: string };
      };
    };
    action?: {
      id: string;
      options: string[];
      type: string;
      advanced: boolean;
      _links?: {
        self: { href: string };
      };
    };
    workflowitem: {
      id: number;
      lastModified: string;
      sections: {
        license?: {
          url: string;
          acceptanceDate: string;
          granted: boolean;
        };
        upload?: {
          primary: null | string;
          files: {
            uuid: string;
            metadata: {
              'dc.title': { value: string }[];
              [key: string]: { value: string }[];
            };
            accessConditions: any[];
            format?: {
              id: number;
              shortDescription: string;
              mimetype: string;
              description?: string;
              supportLevel?: string;
            };
            sizeBytes?: number;
            checkSum?: {
              checkSumAlgorithm: string;
              value: string;
            };
            url?: string;
          }[];
        };
        collection?: string;
        traditionalpageone?: {
          'dc.title'?: { value: string }[];
          'dc.type'?: { value: string }[];
          'dc.date.issued'?: { value: string }[];
          'dc.contributor.author'?: { value: string }[];
          'dc.publisher'?: { value: string }[];
          'dc.description.abstract'?: { value: string }[];
          [key: string]: { value: string }[] | undefined;
        };
        traditionalpagetwo?: Record<string, any>;
      };
      _links: {
        item: { href: string };
        collection?: { href: string };
        submissionDefinition?: { href: string };
        step?: { href: string };
        submitter?: { href: string };
        self?: { href: string };
      };
      _embedded?: {
        submissionDefinition?: {
          id: string;
          name: string;
          isDefault: boolean;
          _links?: {
            collections: { href: string };
            sections: { href: string };
            self: { href: string };
          };
        };
      };
    };
  };
}

// Extended workflow item with task type
export interface EnhancedWorkflowItem extends WorkflowItem {
  taskType: "claimedtask" | "pooltask";
}

// Filter section definition
export interface Filtervalue {
  id: string;
  label: string;
  defaultExpanded: boolean;
  fieldName: string;
  filterType: 'checkbox' | 'range';
}

// Filter option constant array
export const FilterOption: Filtervalue[] = [
  {
    id: 'namedresourcetype',
    label: 'Status',
    defaultExpanded: true,
    fieldName: 'namedresourcetype',
    filterType: 'checkbox'
  },
  {
    id: 'submitter',
    label: 'Submitter',
    defaultExpanded: false,
    fieldName: 'submitter',
    filterType: 'checkbox'
  },
  {
    id: 'itemtype',
    label: 'Item Type',
    defaultExpanded: false,
    fieldName: 'itemtype',
    filterType: 'checkbox'
  }
];

// Sort options for tasks
export const sortOptions: SortOption[] = [
  { value: 'relevant', label: 'Most Relevant', apiValue: 'lastModified,DESC' },
  { value: 'title-asc', label: 'Title Ascending', apiValue: 'dc.title,ASC' },
  { value: 'title-desc', label: 'Title Descending', apiValue: 'dc.title,DESC' },
  { value: 'date-asc', label: 'Date Issued Ascending', apiValue: 'dc.date.issued,ASC' },
  { value: 'date-desc', label: 'Date Issued Descending', apiValue: 'dc.date.issued,DESC' },
];
