/**
 * Metadata API
 * Handles metadata schema and field operations
 */

import axiosInstance from "./axiosInstance";

export interface MetadataSchema {
  id: number;
  prefix: string;
  namespace: string;
  type: string;
}

export interface MetadataField {
  id: number;
  element: string;
  qualifier?: string;
  scopeNote?: string;
  schema?: {
    prefix: string;
  };
  _embedded?: {
    schema?: MetadataSchema;
  };
}

export interface MetadataSchemaListResponse {
  schemas: MetadataSchema[];
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

export interface MetadataFieldListResponse {
  fields: MetadataField[];
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

/**
 * Fetch metadata schemas
 */
export const fetchMetadataSchemas = async (
  page: number = 0,
  size: number = 20
): Promise<MetadataSchemaListResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/core/metadataschemas?page=${page}&size=${size}`
    );

    const schemas = response.data._embedded?.metadataschemas || [];
    const pageData = response.data.page || {
      size: size,
      totalElements: schemas.length,
      totalPages: 1,
      number: page,
    };

    return {
      schemas: schemas.map((s: any) => ({
        id: s.id,
        prefix: s.prefix,
        namespace: s.namespace,
        type: s.type,
      })),
      page: pageData,
    };
  } catch (error) {
    console.error("Fetch metadata schemas error:", error);
    throw error;
  }
};

/**
 * Add metadata schema
 */
export const addMetadataSchema = async (
  prefix: string,
  namespace: string
): Promise<MetadataSchema> => {
  try {
    const response = await axiosInstance.post("/api/core/metadataschemas", {
      prefix,
      namespace,
    });

    return {
      id: response.data.id,
      prefix: response.data.prefix,
      namespace: response.data.namespace,
      type: response.data.type,
    };
  } catch (error) {
    console.error("Add metadata schema error:", error);
    throw error;
  }
};

/**
 * Delete metadata schema
 */
export const deleteMetadataSchema = async (id: number): Promise<boolean> => {
  try {
    await axiosInstance.delete(`/api/core/metadataschemas/${id}`);
    return true;
  } catch (error) {
    console.error("Delete metadata schema error:", error);
    throw error;
  }
};

/**
 * Fetch metadata fields
 */
export const fetchMetadataFields = async (
  schemaName: string = "dc",
  query: string = "",
  page: number = 0,
  size: number = 20
): Promise<MetadataFieldListResponse> => {
  try {
    const response = await axiosInstance.get(
      `/api/core/metadatafields/search/byFieldName?page=${page}&size=${size}&schema=${schemaName}&query=${query}`
    );

    const fields = response.data._embedded?.metadatafields || [];
    const pageData = response.data.page || {
      size: size,
      totalElements: fields.length,
      totalPages: 1,
      number: page,
    };

    return {
      fields: fields.map((f: any) => ({
        id: f.id,
        element: f.element,
        qualifier: f.qualifier,
        scopeNote: f.scopeNote,
        schema: f._embedded?.schema,
        _embedded: f._embedded,
      })),
      page: pageData,
    };
  } catch (error) {
    console.error("Fetch metadata fields error:", error);
    throw error;
  }
};

/**
 * Add metadata field
 */
export const addMetadataField = async (
  schemaId: number,
  element: string,
  qualifier?: string,
  scopeNote?: string
): Promise<MetadataField> => {
  try {
    const response = await axiosInstance.post(
      `/api/core/metadatafields?schemaId=${schemaId}`,
      {
        element,
        qualifier,
        scopeNote,
      }
    );

    return {
      id: response.data.id,
      element: response.data.element,
      qualifier: response.data.qualifier,
      scopeNote: response.data.scopeNote,
      _embedded: response.data._embedded,
    };
  } catch (error) {
    console.error("Add metadata field error:", error);
    throw error;
  }
};

/**
 * Delete metadata field
 */
export const deleteMetadataField = async (id: number): Promise<boolean> => {
  try {
    await axiosInstance.delete(`/api/core/metadatafields/${id}`);
    return true;
  } catch (error) {
    console.error("Delete metadata field error:", error);
    throw error;
  }
};

/**
 * Update metadata field
 */
export const updateMetadataField = async (
  id: number,
  updates: {
    element?: string;
    qualifier?: string;
    scopeNote?: string;
  }
): Promise<MetadataField> => {
  try {
    const operations = Object.entries(updates)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => ({
        op: "replace",
        path: `/${key}`,
        value: value,
      }));

    const response = await axiosInstance.patch(
      `/api/core/metadatafields/${id}`,
      operations
    );

    return {
      id: response.data.id,
      element: response.data.element,
      qualifier: response.data.qualifier,
      scopeNote: response.data.scopeNote,
      _embedded: response.data._embedded,
    };
  } catch (error) {
    console.error("Update metadata field error:", error);
    throw error;
  }
};
