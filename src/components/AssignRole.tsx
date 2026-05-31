import React, { useState, useEffect } from 'react';
import {
  fetchSubmitterGroup,
  createSubmitterGroup,
  deleteSubmitterGroup,
  fetchReviewerGroup,
  createReviewerGroup,
  deleteReviewerGroup,
  fetchEditorGroup,
  createEditorGroup,
  deleteEditorGroup,
  fetchFinalEditorGroup,
  createFinalEditorGroup,
  deleteFinalEditorGroup,
} from '../api/assignRole';

const AssignRole = ({ collectionId }: { collectionId: string }) => {
  const [roles, setRoles] = useState({
    submitter: null,
    reviewer: null,
    editor: null,
    finalEditor: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);
      try {
        const submitter = await fetchSubmitterGroup(collectionId);
        const reviewer = await fetchReviewerGroup(collectionId);
        const editor = await fetchEditorGroup(collectionId);
        const finalEditor = await fetchFinalEditorGroup(collectionId);
        setRoles({
          submitter: submitter.data,
          reviewer: reviewer.data,
          editor: editor.data,
          finalEditor: finalEditor.data,
        });
      } catch (err) {
        setError('Failed to fetch roles');
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [collectionId]);

  const handleCreate = async (role: string, description: string) => {
    setLoading(true);
    try {
      if (role === 'submitter') await createSubmitterGroup(collectionId, description);
      if (role === 'reviewer') await createReviewerGroup(collectionId, description);
      if (role === 'editor') await createEditorGroup(collectionId, description);
      if (role === 'finalEditor') await createFinalEditorGroup(collectionId, description);
      window.location.reload();
    } catch (err) {
      setError('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (role: string) => {
    setLoading(true);
    try {
      if (role === 'submitter') await deleteSubmitterGroup(collectionId);
      if (role === 'reviewer') await deleteReviewerGroup(collectionId);
      if (role === 'editor') await deleteEditorGroup(collectionId);
      if (role === 'finalEditor') await deleteFinalEditorGroup(collectionId);
      window.location.reload();
    } catch (err) {
      setError('Failed to delete group');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Assign Roles</h1>
      {['submitter', 'reviewer', 'editor', 'finalEditor'].map((role) => (
        <div key={role}>
          <h2>{role.charAt(0).toUpperCase() + role.slice(1)} Role</h2>
          {roles[role as keyof typeof roles] ? (
            <div>
              <p>Group: {roles[role as keyof typeof roles]?.name}</p>
              <button onClick={() => handleDelete(role)}>Delete</button>
            </div>
          ) : (
            <button onClick={() => handleCreate(role, `${role} group`)}>Create</button>
          )}
        </div>
      ))}
    </div>
  );
};

export default AssignRole;