/**
 * Metadata Registry Page
 * Manage metadata schemas and fields
 */

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Database, Plus, Edit, Trash2, Search } from "lucide-react";
import {
  fetchMetadataSchemas,
  addMetadataSchema,
  deleteMetadataSchema,
  fetchMetadataFields,
  addMetadataField,
  deleteMetadataField,
  updateMetadataField,
} from "@/api/metadataApi";

interface Schema {
  id: number;
  prefix: string;
  namespace: string;
}

interface Field {
  id: number;
  element: string;
  qualifier?: string | null;
  scopeNote?: string;
  schema?: {
    prefix: string;
  };
  _embedded?: {
    schema?: {
      id: number;
      prefix: string;
      namespace: string;
      type: string;
    };
  };
}

const MetadataRegistry = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("schemas");
  
  // Schemas state
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [schemasPage, setSchemasPage] = useState(0);
  const [schemasTotalPages, setSchemasTotalPages] = useState(0);
  const [showAddSchemaDialog, setShowAddSchemaDialog] = useState(false);
  const [showDeleteSchemaDialog, setShowDeleteSchemaDialog] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState<Schema | null>(null);
  const [schemaFormData, setSchemaFormData] = useState({
    prefix: "",
    namespace: "",
  });

  // Fields state
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldsPage, setFieldsPage] = useState(0);
  const [fieldsTotalPages, setFieldsTotalPages] = useState(0);
  const [fieldsSearchQuery, setFieldsSearchQuery] = useState("");
  const [selectedSchemaFilter, setSelectedSchemaFilter] = useState("dc");
  const [showAddFieldDialog, setShowAddFieldDialog] = useState(false);
  const [showEditFieldDialog, setShowEditFieldDialog] = useState(false);
  const [showDeleteFieldDialog, setShowDeleteFieldDialog] = useState(false);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [fieldFormData, setFieldFormData] = useState({
    element: "",
    qualifier: "",
    scopeNote: "",
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === "schemas") {
      loadSchemas();
    } else {
      loadFields();
    }
  }, [activeTab, schemasPage, fieldsPage, selectedSchemaFilter, fieldsSearchQuery]);

  const loadSchemas = async () => {
    try {
      setLoading(true);
      const response = await fetchMetadataSchemas(schemasPage, 20);
      setSchemas(response.schemas);
      setSchemasTotalPages(response.page.totalPages);
    } catch (error) {
      console.error("Load schemas error:", error);
      toast({
        title: "Error",
        description: "Failed to load metadata schemas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFields = async () => {
    try {
      setLoading(true);
      const response = await fetchMetadataFields(
        selectedSchemaFilter,
        fieldsSearchQuery,
        fieldsPage,
        20
      );
      setFields(response.fields.map(f => ({
        ...f,
        schema: f._embedded?.schema || f.schema
      })));
      setFieldsTotalPages(response.page.totalPages);
    } catch (error) {
      console.error("Load fields error:", error);
      toast({
        title: "Error",
        description: "Failed to load metadata fields",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchema = async () => {
    try {
      await addMetadataSchema(
        schemaFormData.prefix,
        schemaFormData.namespace
      );

      toast({
        title: "Success",
        description: "Metadata schema added successfully",
      });

      setShowAddSchemaDialog(false);
      setSchemaFormData({ prefix: "", namespace: "" });
      loadSchemas();
    } catch (error) {
      console.error("Add schema error:", error);
      toast({
        title: "Error",
        description: "Failed to add metadata schema",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSchema = async () => {
    if (!selectedSchema) return;

    try {
      await deleteMetadataSchema(selectedSchema.id);

      toast({
        title: "Success",
        description: "Metadata schema deleted successfully",
      });

      setShowDeleteSchemaDialog(false);
      setSelectedSchema(null);
      loadSchemas();
    } catch (error) {
      console.error("Delete schema error:", error);
      toast({
        title: "Error",
        description: "Failed to delete metadata schema",
        variant: "destructive",
      });
    }
  };

  const handleAddField = async () => {
    try {
      const schema = schemas.find((s) => s.prefix === selectedSchemaFilter);
      if (!schema) return;

      await addMetadataField(
        schema.id,
        fieldFormData.element,
        fieldFormData.qualifier || undefined,
        fieldFormData.scopeNote || undefined
      );

      toast({
        title: "Success",
        description: "Metadata field added successfully",
      });

      setShowAddFieldDialog(false);
      setFieldFormData({ element: "", qualifier: "", scopeNote: "" });
      loadFields();
    } catch (error) {
      console.error("Add field error:", error);
      toast({
        title: "Error",
        description: "Failed to add metadata field",
        variant: "destructive",
      });
    }
  };

  const handleEditField = async () => {
    if (!selectedField) return;

    try {
      await updateMetadataField(selectedField.id, {
        scopeNote: fieldFormData.scopeNote,
      });

      toast({
        title: "Success",
        description: "Metadata field updated successfully",
      });

      setShowEditFieldDialog(false);
      setSelectedField(null);
      setFieldFormData({ element: "", qualifier: "", scopeNote: "" });
      loadFields();
    } catch (error) {
      console.error("Update field error:", error);
      toast({
        title: "Error",
        description: "Failed to update metadata field",
        variant: "destructive",
      });
    }
  };

  const handleDeleteField = async () => {
    if (!selectedField) return;

    try {
      await deleteMetadataField(selectedField.id);

      toast({
        title: "Success",
        description: "Metadata field deleted successfully",
      });

      setShowDeleteFieldDialog(false);
      setSelectedField(null);
      loadFields();
    } catch (error) {
      console.error("Delete field error:", error);
      toast({
        title: "Error",
        description: "Failed to delete metadata field",
        variant: "destructive",
      });
    }
  };

  const openDeleteSchemaDialog = (schema: Schema) => {
    setSelectedSchema(schema);
    setShowDeleteSchemaDialog(true);
  };

  const openEditFieldDialog = (field: Field) => {
    setSelectedField(field);
    setFieldFormData({
      element: field.element,
      qualifier: field.qualifier || "",
      scopeNote: field.scopeNote,
    });
    setShowEditFieldDialog(true);
  };

  const openDeleteFieldDialog = (field: Field) => {
    setSelectedField(field);
    setShowDeleteFieldDialog(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="h-6 w-6" />
            Metadata Registry
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage metadata schemas and fields
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="schemas">Schemas</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
          </TabsList>

          {/* Schemas Tab */}
          <TabsContent value="schemas" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Manage metadata schemas (namespaces)
              </div>
              <Button onClick={() => setShowAddSchemaDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Schema
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prefix</TableHead>
                    <TableHead>Namespace</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        Loading schemas...
                      </TableCell>
                    </TableRow>
                  ) : schemas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        No schemas found
                      </TableCell>
                    </TableRow>
                  ) : (
                    schemas.map((schema) => (
                      <TableRow key={schema.id}>
                        <TableCell className="font-medium font-mono">
                          {schema.prefix}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {schema.namespace}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteSchemaDialog(schema)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {schemasTotalPages > 1 && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSchemasPage((p) => Math.max(0, p - 1))}
                  disabled={schemasPage === 0}
                >
                  Previous
                </Button>
                <span className="py-2 px-4">
                  Page {schemasPage + 1} of {schemasTotalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() =>
                    setSchemasPage((p) => Math.min(schemasTotalPages - 1, p + 1))
                  }
                  disabled={schemasPage >= schemasTotalPages - 1}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Fields Tab */}
          <TabsContent value="fields" className="mt-6 space-y-4">
            <div className="flex justify-between items-center gap-4">
              <div className="flex gap-4 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search fields..."
                    value={fieldsSearchQuery}
                    onChange={(e) => {
                      setFieldsSearchQuery(e.target.value);
                      setFieldsPage(0);
                    }}
                    className="pl-10"
                  />
                </div>
                <select
                  className="border rounded-md px-3 py-2"
                  value={selectedSchemaFilter}
                  onChange={(e) => {
                    setSelectedSchemaFilter(e.target.value);
                    setFieldsPage(0);
                  }}
                >
                  {schemas.map((schema) => (
                    <option key={schema.id} value={schema.prefix}>
                      {schema.prefix}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={() => setShowAddFieldDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Field
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Element</TableHead>
                    <TableHead>Qualifier</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Scope Note</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading fields...
                      </TableCell>
                    </TableRow>
                  ) : fields.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        No fields found
                      </TableCell>
                    </TableRow>
                  ) : (
                    fields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">
                          {field.element}
                        </TableCell>
                        <TableCell>{field.qualifier || "—"}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {field.schema?.prefix || field._embedded?.schema?.prefix || 'dc'}.{field.element}
                          {field.qualifier && `.${field.qualifier}`}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {field.scopeNote || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditFieldDialog(field)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteFieldDialog(field)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {fieldsTotalPages > 1 && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setFieldsPage((p) => Math.max(0, p - 1))}
                  disabled={fieldsPage === 0}
                >
                  Previous
                </Button>
                <span className="py-2 px-4">
                  Page {fieldsPage + 1} of {fieldsTotalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() =>
                    setFieldsPage((p) => Math.min(fieldsTotalPages - 1, p + 1))
                  }
                  disabled={fieldsPage >= fieldsTotalPages - 1}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Schema Dialog */}
      <Dialog open={showAddSchemaDialog} onOpenChange={setShowAddSchemaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Metadata Schema</DialogTitle>
            <DialogDescription>Create a new metadata schema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="prefix">Prefix *</Label>
              <Input
                id="prefix"
                value={schemaFormData.prefix}
                onChange={(e) =>
                  setSchemaFormData({ ...schemaFormData, prefix: e.target.value })
                }
                placeholder="e.g., dc, dcterms"
              />
            </div>
            <div>
              <Label htmlFor="namespace">Namespace URL *</Label>
              <Input
                id="namespace"
                value={schemaFormData.namespace}
                onChange={(e) =>
                  setSchemaFormData({
                    ...schemaFormData,
                    namespace: e.target.value,
                  })
                }
                placeholder="e.g., http://purl.org/dc/elements/1.1/"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddSchemaDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddSchema}>Add Schema</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Schema Confirmation */}
      <AlertDialog
        open={showDeleteSchemaDialog}
        onOpenChange={setShowDeleteSchemaDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the schema <strong>{selectedSchema?.prefix}</strong>{" "}
              and all its fields. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSchema}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Field Dialog */}
      <Dialog open={showAddFieldDialog} onOpenChange={setShowAddFieldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Metadata Field</DialogTitle>
            <DialogDescription>
              Add a new field to schema: {selectedSchemaFilter}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="element">Element *</Label>
              <Input
                id="element"
                value={fieldFormData.element}
                onChange={(e) =>
                  setFieldFormData({ ...fieldFormData, element: e.target.value })
                }
                placeholder="e.g., title, creator"
              />
            </div>
            <div>
              <Label htmlFor="qualifier">Qualifier (optional)</Label>
              <Input
                id="qualifier"
                value={fieldFormData.qualifier}
                onChange={(e) =>
                  setFieldFormData({ ...fieldFormData, qualifier: e.target.value })
                }
                placeholder="e.g., alternative, issued"
              />
            </div>
            <div>
              <Label htmlFor="scopeNote">Scope Note</Label>
              <Textarea
                id="scopeNote"
                value={fieldFormData.scopeNote}
                onChange={(e) =>
                  setFieldFormData({ ...fieldFormData, scopeNote: e.target.value })
                }
                placeholder="Describe the purpose of this field"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFieldDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddField}>Add Field</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Field Dialog */}
      <Dialog open={showEditFieldDialog} onOpenChange={setShowEditFieldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Metadata Field</DialogTitle>
            <DialogDescription>
              Update field: {selectedField?.schema?.prefix || selectedField?._embedded?.schema?.prefix || 'dc'}.{selectedField?.element}
              {selectedField?.qualifier && `.${selectedField.qualifier}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-scopeNote">Scope Note</Label>
              <Textarea
                id="edit-scopeNote"
                value={fieldFormData.scopeNote}
                onChange={(e) =>
                  setFieldFormData({ ...fieldFormData, scopeNote: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditFieldDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditField}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Field Confirmation */}
      <AlertDialog
        open={showDeleteFieldDialog}
        onOpenChange={setShowDeleteFieldDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the field{" "}
              <strong>
                {selectedField?.schema?.prefix || selectedField?._embedded?.schema?.prefix || 'dc'}.{selectedField?.element}
                {selectedField?.qualifier && `.${selectedField.qualifier}`}
              </strong>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteField}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default MetadataRegistry;
