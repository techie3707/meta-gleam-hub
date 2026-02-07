import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Save,
  X,
  Shield,
  Plus,
  Loader2,
  FolderTree,
} from "lucide-react";
import {
  fetchTopCommunities,
  fetchSubCommunities,
  fetchCommunityCollections,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  Community,
} from "@/api/communityApi";
import {
  updateCollection,
  deleteCollection,
  createCollection,
  Collection,
} from "@/api/collectionApi";

// Extended types with editing state
interface EditableCommunity extends Community {
  isEditing: boolean;
  editedTitle: string;
}

interface EditableCollection extends Collection {
  isEditing: boolean;
  editedTitle: string;
}

interface DeleteTarget {
  type: "community" | "subcommunity" | "collection";
  uuid: string;
  parentUuid?: string;
  name: string;
}

const EditCommunity = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Core data
  const [communities, setCommunities] = useState<EditableCommunity[]>([]);
  const [collections, setCollections] = useState<Record<string, EditableCollection[]>>({});
  const [subCommunities, setSubCommunities] = useState<Record<string, EditableCommunity[]>>({});
  const [subCommunityCollections, setSubCommunityCollections] = useState<Record<string, EditableCollection[]>>({});

  // UI state
  const [expandedCommunity, setExpandedCommunity] = useState<string | null>(null);
  const [expandedSubCommunity, setExpandedSubCommunity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DeleteTarget | null>(null);

  // Create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<"community" | "collection">("community");
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createParentId, setCreateParentId] = useState<string>("");

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    setLoading(true);
    try {
      const result = await fetchTopCommunities(0, 100);
      setCommunities(
        result.communities.map((c) => ({
          ...c,
          isEditing: false,
          editedTitle: c.metadata?.["dc.title"]?.[0]?.value || c.name,
        }))
      );
    } catch (error) {
      toast({ title: "Error", description: "Failed to load communities", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExpandCommunity = async (uuid: string) => {
    if (expandedCommunity === uuid) {
      setExpandedCommunity(null);
      return;
    }
    setExpandedCommunity(uuid);
    setExpandedSubCommunity(null);

    if (!collections[uuid] && !subCommunities[uuid]) {
      try {
        const [colsResult, subsResult] = await Promise.all([
          fetchCommunityCollections(uuid),
          fetchSubCommunities(uuid),
        ]);
        setCollections((prev) => ({
          ...prev,
          [uuid]: (colsResult as any[]).map((c: any) => ({
            id: c.uuid || c.id,
            uuid: c.uuid || c.id,
            name: c.name || c.metadata?.["dc.title"]?.[0]?.value || "Untitled",
            handle: c.handle,
            metadata: c.metadata || {},
            type: c.type || "collection",
            isEditing: false,
            editedTitle: c.metadata?.["dc.title"]?.[0]?.value || c.name || "",
          })),
        }));
        setSubCommunities((prev) => ({
          ...prev,
          [uuid]: subsResult.communities.map((c) => ({
            ...c,
            isEditing: false,
            editedTitle: c.metadata?.["dc.title"]?.[0]?.value || c.name,
          })),
        }));
      } catch (error) {
        toast({ title: "Error", description: "Failed to load community contents", variant: "destructive" });
      }
    }
  };

  const handleExpandSubCommunity = async (parentUuid: string, subUuid: string) => {
    if (expandedSubCommunity === subUuid) {
      setExpandedSubCommunity(null);
      return;
    }
    setExpandedSubCommunity(subUuid);

    if (!subCommunityCollections[subUuid]) {
      try {
        const colsResult = await fetchCommunityCollections(subUuid);
        setSubCommunityCollections((prev) => ({
          ...prev,
          [subUuid]: (colsResult as any[]).map((c: any) => ({
            id: c.uuid || c.id,
            uuid: c.uuid || c.id,
            name: c.name || c.metadata?.["dc.title"]?.[0]?.value || "Untitled",
            handle: c.handle,
            metadata: c.metadata || {},
            type: c.type || "collection",
            isEditing: false,
            editedTitle: c.metadata?.["dc.title"]?.[0]?.value || c.name || "",
          })),
        }));
      } catch (error) {
        toast({ title: "Error", description: "Failed to load sub-community collections", variant: "destructive" });
      }
    }
  };

  // --- Inline Edit Handlers ---
  const handleCommunityEdit = (uuid: string) => {
    setCommunities((prev) =>
      prev.map((c) => (c.uuid === uuid ? { ...c, isEditing: true } : c))
    );
  };

  const handleCommunityCancelEdit = (uuid: string) => {
    setCommunities((prev) =>
      prev.map((c) =>
        c.uuid === uuid
          ? { ...c, isEditing: false, editedTitle: c.metadata?.["dc.title"]?.[0]?.value || c.name }
          : c
      )
    );
  };

  const handleCommunitySave = async (uuid: string) => {
    const community = communities.find((c) => c.uuid === uuid);
    if (!community) return;

    setActionLoading(true);
    try {
      const success = await updateCommunity(uuid, community.editedTitle);
      if (success) {
        setCommunities((prev) =>
          prev.map((c) =>
            c.uuid === uuid
              ? {
                  ...c,
                  isEditing: false,
                  name: c.editedTitle,
                  metadata: {
                    ...c.metadata,
                    "dc.title": [{ value: c.editedTitle }],
                  },
                }
              : c
          )
        );
        toast({ title: "Success", description: "Community updated successfully!" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update community", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubCommunityEdit = (parentUuid: string, uuid: string) => {
    setSubCommunities((prev) => ({
      ...prev,
      [parentUuid]: prev[parentUuid]?.map((c) =>
        c.uuid === uuid ? { ...c, isEditing: true } : c
      ),
    }));
  };

  const handleSubCommunityCancelEdit = (parentUuid: string, uuid: string) => {
    setSubCommunities((prev) => ({
      ...prev,
      [parentUuid]: prev[parentUuid]?.map((c) =>
        c.uuid === uuid
          ? { ...c, isEditing: false, editedTitle: c.metadata?.["dc.title"]?.[0]?.value || c.name }
          : c
      ),
    }));
  };

  const handleSubCommunitySave = async (parentUuid: string, uuid: string) => {
    const sub = subCommunities[parentUuid]?.find((c) => c.uuid === uuid);
    if (!sub) return;

    setActionLoading(true);
    try {
      const success = await updateCommunity(uuid, sub.editedTitle);
      if (success) {
        setSubCommunities((prev) => ({
          ...prev,
          [parentUuid]: prev[parentUuid]?.map((c) =>
            c.uuid === uuid
              ? {
                  ...c,
                  isEditing: false,
                  name: c.editedTitle,
                  metadata: { ...c.metadata, "dc.title": [{ value: c.editedTitle }] },
                }
              : c
          ),
        }));
        toast({ title: "Success", description: "Sub-community updated successfully!" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update sub-community", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCollectionEdit = (parentUuid: string, uuid: string, isSub: boolean) => {
    const setter = isSub ? setSubCommunityCollections : setCollections;
    setter((prev) => ({
      ...prev,
      [parentUuid]: prev[parentUuid]?.map((c) =>
        c.uuid === uuid ? { ...c, isEditing: true } : c
      ),
    }));
  };

  const handleCollectionCancelEdit = (parentUuid: string, uuid: string, isSub: boolean) => {
    const setter = isSub ? setSubCommunityCollections : setCollections;
    setter((prev) => ({
      ...prev,
      [parentUuid]: prev[parentUuid]?.map((c) =>
        c.uuid === uuid
          ? { ...c, isEditing: false, editedTitle: c.metadata?.["dc.title"]?.[0]?.value || c.name }
          : c
      ),
    }));
  };

  const handleCollectionSave = async (parentUuid: string, uuid: string, isSub: boolean) => {
    const source = isSub ? subCommunityCollections : collections;
    const col = source[parentUuid]?.find((c) => c.uuid === uuid);
    if (!col) return;

    setActionLoading(true);
    try {
      const success = await updateCollection(uuid, col.editedTitle);
      if (success) {
        const setter = isSub ? setSubCommunityCollections : setCollections;
        setter((prev) => ({
          ...prev,
          [parentUuid]: prev[parentUuid]?.map((c) =>
            c.uuid === uuid
              ? {
                  ...c,
                  isEditing: false,
                  name: c.editedTitle,
                  metadata: { ...c.metadata, "dc.title": [{ value: c.editedTitle }] },
                }
              : c
          ),
        }));
        toast({ title: "Success", description: "Collection updated successfully!" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update collection", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  // --- Delete Handlers ---
  const handleDeleteClick = (target: DeleteTarget) => {
    setItemToDelete(target);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    setActionLoading(true);
    try {
      let success = false;
      if (itemToDelete.type === "collection") {
        success = await deleteCollection(itemToDelete.uuid);
        if (success) {
          // Remove from state
          if (itemToDelete.parentUuid) {
            setCollections((prev) => ({
              ...prev,
              [itemToDelete.parentUuid!]: prev[itemToDelete.parentUuid!]?.filter(
                (c) => c.uuid !== itemToDelete.uuid
              ),
            }));
            setSubCommunityCollections((prev) => ({
              ...prev,
              [itemToDelete.parentUuid!]: prev[itemToDelete.parentUuid!]?.filter(
                (c) => c.uuid !== itemToDelete.uuid
              ),
            }));
          }
        }
      } else {
        success = await deleteCommunity(itemToDelete.uuid);
        if (success) {
          if (itemToDelete.type === "community") {
            setCommunities((prev) => prev.filter((c) => c.uuid !== itemToDelete.uuid));
          } else if (itemToDelete.type === "subcommunity" && itemToDelete.parentUuid) {
            setSubCommunities((prev) => ({
              ...prev,
              [itemToDelete.parentUuid!]: prev[itemToDelete.parentUuid!]?.filter(
                (c) => c.uuid !== itemToDelete.uuid
              ),
            }));
          }
        }
      }

      if (success) {
        toast({
          title: "Success",
          description: `${itemToDelete.type === "collection" ? "Collection" : "Community"} deleted successfully!`,
        });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
      setActionLoading(false);
    }
  };

  // --- Create Handlers ---
  const handleOpenCreate = (type: "community" | "collection", parentId: string = "") => {
    setCreateType(type);
    setCreateParentId(parentId);
    setCreateTitle("");
    setCreateDescription("");
    setCreateModalOpen(true);
  };

  const handleCreate = async () => {
    if (!createTitle.trim()) {
      toast({ title: "Validation Error", description: "Title is required", variant: "destructive" });
      return;
    }

    setActionLoading(true);
    try {
      if (createType === "community") {
        const result = await createCommunity(createTitle, createDescription || undefined, createParentId || undefined);
        if (result) {
          if (createParentId) {
            // Sub-community created
            setSubCommunities((prev) => ({
              ...prev,
              [createParentId]: [
                ...(prev[createParentId] || []),
                { ...result, isEditing: false, editedTitle: createTitle },
              ],
            }));
          } else {
            // Top-level community
            setCommunities((prev) => [
              ...prev,
              { ...result, isEditing: false, editedTitle: createTitle },
            ]);
          }
          toast({ title: "Success", description: "Community created successfully!" });
        }
      } else {
        if (!createParentId) {
          toast({ title: "Error", description: "Please select a parent community", variant: "destructive" });
          return;
        }
        const result = await createCollection(createParentId, {
          "dc.title": [{ value: createTitle }],
          ...(createDescription ? { "dc.description": [{ value: createDescription }] } : {}),
        });
        if (result) {
          // Try to add to correct state
          const editableCol: EditableCollection = {
            ...result,
            isEditing: false,
            editedTitle: createTitle,
          };
          setCollections((prev) => ({
            ...prev,
            [createParentId]: [...(prev[createParentId] || []), editableCol],
          }));
          setSubCommunityCollections((prev) => ({
            ...prev,
            [createParentId]: [...(prev[createParentId] || []), editableCol],
          }));
          toast({ title: "Success", description: "Collection created successfully!" });
        }
      }
    } catch {
      toast({ title: "Error", description: "Failed to create", variant: "destructive" });
    } finally {
      setCreateModalOpen(false);
      setActionLoading(false);
    }
  };

  const getTitle = (entity: { metadata?: Record<string, Array<{ value: string }>>; name?: string }) =>
    entity.metadata?.["dc.title"]?.[0]?.value || entity.name || "Untitled";

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderTree className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Edit Community</h1>
              <p className="text-muted-foreground text-sm">Manage communities, sub-communities, and collections</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => handleOpenCreate("community")}>
              <Plus className="w-4 h-4 mr-1" />
              Create Community
            </Button>
            <Button onClick={() => handleOpenCreate("collection", expandedCommunity || "")}>
              <Plus className="w-4 h-4 mr-1" />
              Create Collection
            </Button>
          </div>
        </div>

        {/* Communities Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60%]">Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {communities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                    No communities found. Create your first community to get started.
                  </TableCell>
                </TableRow>
              )}
              {communities.map((community) => (
                <>
                  {/* Top-Level Community Row */}
                  <TableRow
                    key={community.uuid}
                    className="bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleExpandCommunity(community.uuid)}
                        >
                          {expandedCommunity === community.uuid ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        {community.isEditing ? (
                          <Input
                            value={community.editedTitle}
                            onChange={(e) =>
                              setCommunities((prev) =>
                                prev.map((c) =>
                                  c.uuid === community.uuid ? { ...c, editedTitle: e.target.value } : c
                                )
                              )
                            }
                            className="h-8 max-w-sm"
                            autoFocus
                          />
                        ) : (
                          <span className="font-semibold text-primary">{getTitle(community)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {community.isEditing ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCommunitySave(community.uuid)} disabled={actionLoading}>
                              <Save className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCommunityCancelEdit(community.uuid)}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenCreate("community", community.uuid)} title="Add sub-community">
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCommunityEdit(community.uuid)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteClick({ type: "community", uuid: community.uuid, name: getTitle(community) })}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/policies/community/${community.uuid}`)} title="Access policies">
                              <Shield className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded: Sub-communities & Collections */}
                  {expandedCommunity === community.uuid && (
                    <>
                      {/* Sub-communities */}
                      {(subCommunities[community.uuid] || []).map((sub) => (
                        <>
                          <TableRow key={sub.uuid} className="bg-accent/30 hover:bg-accent/50 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-2 pl-8">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExpandSubCommunity(community.uuid, sub.uuid)}>
                                  {expandedSubCommunity === sub.uuid ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                                {sub.isEditing ? (
                                  <Input
                                    value={sub.editedTitle}
                                    onChange={(e) =>
                                      setSubCommunities((prev) => ({
                                        ...prev,
                                        [community.uuid]: prev[community.uuid]?.map((c) =>
                                          c.uuid === sub.uuid ? { ...c, editedTitle: e.target.value } : c
                                        ),
                                      }))
                                    }
                                    className="h-8 max-w-sm"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="font-medium text-accent-foreground">{getTitle(sub)}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {sub.isEditing ? (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSubCommunitySave(community.uuid, sub.uuid)} disabled={actionLoading}>
                                      <Save className="h-4 w-4 text-primary" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSubCommunityCancelEdit(community.uuid, sub.uuid)}>
                                      <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenCreate("collection", sub.uuid)} title="Add collection">
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSubCommunityEdit(community.uuid, sub.uuid)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteClick({ type: "subcommunity", uuid: sub.uuid, parentUuid: community.uuid, name: getTitle(sub) })}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/policies/community/${sub.uuid}`)}>
                                      <Shield className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Sub-community Collections */}
                          {expandedSubCommunity === sub.uuid &&
                            (subCommunityCollections[sub.uuid] || []).map((col) => (
                              <TableRow key={col.uuid} className="bg-secondary/30 hover:bg-secondary/50 transition-colors">
                                <TableCell>
                                  <div className="flex items-center gap-2 pl-20">
                                    {col.isEditing ? (
                                      <Input
                                        value={col.editedTitle}
                                        onChange={(e) =>
                                          setSubCommunityCollections((prev) => ({
                                            ...prev,
                                            [sub.uuid]: prev[sub.uuid]?.map((c) =>
                                              c.uuid === col.uuid ? { ...c, editedTitle: e.target.value } : c
                                            ),
                                          }))
                                        }
                                        className="h-8 max-w-sm"
                                        autoFocus
                                      />
                                    ) : (
                                      <span className="text-secondary-foreground">{getTitle(col)}</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {col.isEditing ? (
                                      <>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCollectionSave(sub.uuid, col.uuid, true)} disabled={actionLoading}>
                                          <Save className="h-4 w-4 text-primary" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCollectionCancelEdit(sub.uuid, col.uuid, true)}>
                                          <X className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCollectionEdit(sub.uuid, col.uuid, true)}>
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteClick({ type: "collection", uuid: col.uuid, parentUuid: sub.uuid, name: getTitle(col) })}>
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/policies/collection/${col.uuid}`)}>
                                          <Shield className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                        </>
                      ))}

                      {/* Direct Collections */}
                      {(collections[community.uuid] || []).map((col) => (
                        <TableRow key={col.uuid} className="bg-secondary/30 hover:bg-secondary/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2 pl-12">
                              {col.isEditing ? (
                                <Input
                                  value={col.editedTitle}
                                  onChange={(e) =>
                                    setCollections((prev) => ({
                                      ...prev,
                                      [community.uuid]: prev[community.uuid]?.map((c) =>
                                        c.uuid === col.uuid ? { ...c, editedTitle: e.target.value } : c
                                      ),
                                    }))
                                  }
                                  className="h-8 max-w-sm"
                                  autoFocus
                                />
                              ) : (
                                <span className="text-secondary-foreground">{getTitle(col)}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {col.isEditing ? (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCollectionSave(community.uuid, col.uuid, false)} disabled={actionLoading}>
                                    <Save className="h-4 w-4 text-primary" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCollectionCancelEdit(community.uuid, col.uuid, false)}>
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCollectionEdit(community.uuid, col.uuid, false)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteClick({ type: "collection", uuid: col.uuid, parentUuid: community.uuid, name: getTitle(col) })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/policies/collection/${col.uuid}`)}>
                                    <Shield className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {itemToDelete?.type === "collection" ? "collection" : "community"}{" "}
                <strong>"{itemToDelete?.name}"</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Dialog */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Create {createType === "community" ? (createParentId ? "Sub-Community" : "Community") : "Collection"}
              </DialogTitle>
              <DialogDescription>
                {createType === "community"
                  ? createParentId
                    ? "Create a new sub-community under the selected community"
                    : "Create a new top-level community"
                  : "Create a new collection"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input
                  placeholder="Enter title"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="Enter description (optional)"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
              </div>
              {createType === "collection" && !createParentId && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Parent Community *</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={createParentId}
                    onChange={(e) => setCreateParentId(e.target.value)}
                  >
                    <option value="">Select a community</option>
                    {communities.map((c) => (
                      <option key={c.uuid} value={c.uuid}>
                        {getTitle(c)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default EditCommunity;
