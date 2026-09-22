"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Badge } from "@/components/ui/badge";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { getNodeIcon } from "@/lib/nodes";
import type { SubGroup } from "@/lib/subgroup-types";
import type { CustomNode } from "@/lib/custom-nodes-types";
import { useCollection } from "@/firebase/firestore/use-collection";
import { getSocialMediaIcon } from "@/components/icons/social-media-icons";

type SubGroupsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type SubGroupFormData = {
  name: string;
  icon: string;
  color: string;
};

type DeleteMode = "group-only" | "group-and-nodes";

export function SubGroupsModal({ isOpen, onClose }: SubGroupsModalProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isCreating, setIsCreating] = useState(false);
  const [editingSubGroup, setEditingSubGroup] = useState<SubGroup | null>(null);
  const [formData, setFormData] = useState<SubGroupFormData>({
    name: "",
    icon: "Folder",
    color: "#6366f1",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subGroupToDelete, setSubGroupToDelete] = useState<SubGroup | null>(null);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("group-only");
  const [isPopulating, setIsPopulating] = useState(false);

  // Load subGroups from Firestore
  const subGroupsRef = React.useMemo(
    () => collection(firestore, "users", user?.uid || "none", "subGroups"),
    [firestore, user?.uid]
  );
  const { data: subGroups, isLoading } = useCollection<SubGroup>(subGroupsRef);

  // Load custom nodes to count how many use each subGroup
  const nodesRef = React.useMemo(
    () => collection(firestore, "users", user?.uid || "none", "customNodes"),
    [firestore, user?.uid]
  );
  const { data: customNodes } = useCollection<CustomNode>(nodesRef);

  // Count nodes per subGroup
  const subGroupNodeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    customNodes?.forEach((node) => {
      if (node.subGroup) {
        counts[node.subGroup] = (counts[node.subGroup] || 0) + 1;
      }
    });
    return counts;
  }, [customNodes]);

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingSubGroup(null);
    setFormData({
      name: "",
      icon: "Folder",
      color: "#6366f1",
    });
  };

  const handleEdit = (subGroup: SubGroup) => {
    setEditingSubGroup(subGroup);
    setIsCreating(true);
    setFormData({
      name: subGroup.name,
      icon: subGroup.icon,
      color: subGroup.color,
    });
  };

  const handleSave = async () => {
    if (!user || !formData.name.trim()) return;

    setIsSaving(true);
    try {
      if (editingSubGroup) {
        // Update existing subGroup
        const subGroupDocRef = doc(firestore, "users", user.uid, "subGroups", editingSubGroup.id);
        await updateDoc(subGroupDocRef, {
          name: formData.name.trim(),
          icon: formData.icon,
          color: formData.color,
          updatedAt: new Date().toISOString(),
        });

        // Update all nodes that use this subGroup
        const nodesQuery = query(
          collection(firestore, "users", user.uid, "customNodes"),
          where("subGroup", "==", editingSubGroup.name)
        );
        const nodesSnapshot = await getDocs(nodesQuery);
        const updatePromises = nodesSnapshot.docs.map((nodeDoc) =>
          updateDoc(nodeDoc.ref, { subGroup: formData.name.trim() })
        );
        await Promise.all(updatePromises);
      } else {
        // Create new subGroup
        await addDoc(collection(firestore, "users", user.uid, "subGroups"), {
          name: formData.name.trim(),
          icon: formData.icon,
          color: formData.color,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setIsCreating(false);
      setEditingSubGroup(null);
      setFormData({ name: "", icon: "Folder", color: "#6366f1" });
    } catch (error) {
      console.error("Error saving subGroup:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (subGroup: SubGroup) => {
    setSubGroupToDelete(subGroup);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user || !subGroupToDelete) return;

    try {
      // Delete the subGroup document
      await deleteDoc(doc(firestore, "users", user.uid, "subGroups", subGroupToDelete.id));

      if (deleteMode === "group-and-nodes") {
        // Delete all nodes that use this subGroup
        const nodesQuery = query(
          collection(firestore, "users", user.uid, "customNodes"),
          where("subGroup", "==", subGroupToDelete.name)
        );
        const nodesSnapshot = await getDocs(nodesQuery);
        const deletePromises = nodesSnapshot.docs.map((nodeDoc) => deleteDoc(nodeDoc.ref));
        await Promise.all(deletePromises);
      } else {
        // Remove subGroup from nodes (set to undefined)
        const nodesQuery = query(
          collection(firestore, "users", user.uid, "customNodes"),
          where("subGroup", "==", subGroupToDelete.name)
        );
        const nodesSnapshot = await getDocs(nodesQuery);
        const updatePromises = nodesSnapshot.docs.map((nodeDoc) =>
          updateDoc(nodeDoc.ref, { subGroup: "" })
        );
        await Promise.all(updatePromises);
      }

      setDeleteDialogOpen(false);
      setSubGroupToDelete(null);
      setDeleteMode("group-only");
    } catch (error) {
      console.error("Error deleting subGroup:", error);
    }
  };

  const handlePopulateSocialMedia = async () => {
    if (!user) return;

    setIsPopulating(true);
    try {
      // Predefined sub-groups for social media
      const socialMediaSubGroups = [
        { name: "WhatsApp", icon: "WhatsApp", color: "#25D366" },
        { name: "Telegram", icon: "Telegram", color: "#0088cc" },
        { name: "YouTube", icon: "YouTube", color: "#FF0000" },
        { name: "Instagram", icon: "Instagram", color: "#E4405F" },
        { name: "Facebook", icon: "Facebook", color: "#1877F2" },
        { name: "Twitter", icon: "Twitter", color: "#1DA1F2" },
        { name: "LinkedIn", icon: "LinkedIn", color: "#0077B5" }
      ];

      const now = new Date().toISOString();
      const subGroupsCollection = collection(firestore, "users", user.uid, "subGroups");

      // Create all sub-groups
      const promises = socialMediaSubGroups.map((subGroup) =>
        addDoc(subGroupsCollection, {
          ...subGroup,
          createdAt: now,
          updatedAt: now
        })
      );

      await Promise.all(promises);

      console.log(`✅ Created ${socialMediaSubGroups.length} sub-groups successfully`);
    } catch (error) {
      console.error('Error populating sub-groups:', error);
    } finally {
      setIsPopulating(false);
    }
  };

  const renderIcon = (iconName: string, color: string) => {
    // Try social media icon first
    const SocialIcon = getSocialMediaIcon(iconName);
    if (SocialIcon) {
      return <SocialIcon className="h-5 w-5" style={{ color }} />;
    }

    // Fallback to Lucide icon
    const LucideIcon = getNodeIcon({ icon: iconName } as any);
    return <LucideIcon className="h-5 w-5" style={{ color }} />;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Sub-Groups</DialogTitle>
            <DialogDescription>
              Create and manage sub-groups to organize your custom nodes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0">
            {!isCreating ? (
              <>
                <div className="mb-4 space-y-2">
                  <Button onClick={handleCreateNew} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Sub-Group
                  </Button>
                  {(!subGroups || subGroups.length === 0) && (
                    <Button
                      onClick={handlePopulateSocialMedia}
                      disabled={isPopulating}
                      variant="outline"
                      className="w-full"
                    >
                      {isPopulating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Populating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Quick Start: Add Social Media Groups
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <ScrollArea className="flex-1">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : subGroups && subGroups.length > 0 ? (
                    <div className="space-y-2">
                      {subGroups.map((subGroup) => {
                        const nodeCount = subGroupNodeCounts[subGroup.name] || 0;
                        return (
                          <div
                            key={subGroup.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-secondary/50 transition-colors"
                          >
                            <div
                              className="p-2 rounded-md flex-shrink-0"
                              style={{ backgroundColor: `${subGroup.color}15` }}
                            >
                              {renderIcon(subGroup.icon, subGroup.color)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{subGroup.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {nodeCount} {nodeCount === 1 ? "node" : "nodes"}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(subGroup)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(subGroup)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No sub-groups created yet.</p>
                      <p className="text-sm mt-1">Click the button above to create your first sub-group.</p>
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subgroup-name">Name</Label>
                  <Input
                    id="subgroup-name"
                    placeholder="e.g., WhatsApp, Database, Analytics"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subgroup-icon">Icon</Label>
                  <Input
                    id="subgroup-icon"
                    placeholder="Lucide icon name (e.g., Folder, Database, MessageCircle)"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a Lucide icon name or social media platform name (WhatsApp, Telegram, etc.)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subgroup-color">Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="subgroup-color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#6366f1"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setEditingSubGroup(null);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!formData.name.trim() || isSaving}
                    className="flex-1"
                  >
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingSubGroup ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sub-Group</AlertDialogTitle>
            <AlertDialogDescription>
              How would you like to delete "{subGroupToDelete?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-4">
            <button
              onClick={() => setDeleteMode("group-only")}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                deleteMode === "group-only"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <p className="font-semibold text-sm">Delete sub-group only</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nodes will remain but won't be grouped anymore
              </p>
            </button>

            <button
              onClick={() => setDeleteMode("group-and-nodes")}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                deleteMode === "group-and-nodes"
                  ? "border-destructive bg-destructive/5"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <p className="font-semibold text-sm text-destructive">Delete sub-group and all nodes</p>
              <p className="text-xs text-muted-foreground mt-1">
                {subGroupNodeCounts[subGroupToDelete?.name || ""] || 0} nodes will be permanently deleted
              </p>
            </button>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className={deleteMode === "group-and-nodes" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
