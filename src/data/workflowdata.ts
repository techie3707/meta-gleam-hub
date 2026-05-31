// Type definitions for search results
export interface workflowSearchResult {
  id: string | null;
  scope: string | null;
  query: string | null;
  type: string;
  _embedded: {
    searchResult: {
      _embedded: {
        objects: WorkspaceItem[];
      };
      page: {
        number: number;
        size: number;
        totalPages: number;
        totalElements: number;
      };
    };
  };
}

// Type for individual workspace items
export interface WorkspaceItem {
  type: string;
  _embedded: {
    indexableObject: {
      id: number;
      sections: {
        license: {
          url: string | null;
          acceptanceDate: string | null;
          granted: boolean;
        };
        upload: {
          primary: any | null;
          files: FileMetadata[];
        };
        collection: string;
        traditionalpagetwo: Record<string, any>;
        traditionalpageone: Record<string, any> & {
          "dc.publisher"?: MetadataValue[];
          "dc.contributor.author"?: MetadataValue[];
          "dc.type"?: MetadataValue[];
          "dc.title"?: MetadataValue[];
          "dc.date.issued"?: MetadataValue[];
        };
      };
      type: string;
      _embedded: {
        item: {
          id: string;
          uuid: string;
          metadata: Record<string, MetadataValue[]>;
          entityType: string | null;
          type: string;
        };
      };
    };
  };
}

// File metadata structure
interface FileMetadata {
  uuid: string;
  metadata: {
    "dc.source": MetadataValue[];
    "dc.title": MetadataValue[];
  };
}

// Standard DSpace metadata value
export interface MetadataValue {
  value: string;
  language: string | null;
  authority: string | null;
  confidence: number;
  place: number;
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
    id: 'itemType',
    label: 'Item Type',
    defaultExpanded: false,
    fieldName: 'itemtype',
    filterType: 'checkbox'
  },
  {
    id: 'date',
    label: 'Date',
    defaultExpanded: false,
    fieldName: 'dateIssued',
    filterType: 'range'
  },
  {
    id: 'supervisedBy',
    label: 'Supervised By',
    defaultExpanded: false,
    fieldName: 'supervisedBy',
    filterType: 'checkbox'
  }
];

// Workflow filters interface
export interface workflowFilters {
  [key: string]: string[] | boolean | null | undefined;
  namedresourcetype?: string[];
  submitter?: string[];
  itemType?: string[];
  date?: string[];
  supervisedBy?: string[];
}

// Facet filter result
export interface FacetFilterOption {
  id: string;
  label: string;
  count: number;
}

// Facet API response
export interface FacetResult {
  _embedded: {
    values: Array<{ label: string; count: number }>;
  };
  page?: {
    totalElements: number;
  };
}

// Sort option definition
export interface SortOption {
  value: string;
  label: string;
  apiValue: string;
}

// Sort options for supervision
export const sortOptions: SortOption[] = [
  { value: 'relevant', label: 'Most Relevant', apiValue: 'score,DESC' },
  { value: 'title-asc', label: 'Title Ascending', apiValue: 'dc.title,ASC' },
  { value: 'title-desc', label: 'Title Descending', apiValue: 'dc.title,DESC' },
  { value: 'date-asc', label: 'Date Issued Ascending', apiValue: 'dc.date.issued,ASC' },
  { value: 'date-desc', label: 'Date Issued Descending', apiValue: 'dc.date.issued,DESC' },
];

// Search parameters interface
export interface SearchParams {
  query?: string;
  page?: number;
  size?: number;
  sort?: string;
  scope?: string;
  filters?: workflowFilters;
}
