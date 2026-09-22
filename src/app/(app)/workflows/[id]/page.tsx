
'use client';

import { useParams } from "next/navigation";
import { WorkflowEditor } from "@/components/workflow/editor";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import { useMemo } from "react";

type Folder = {
  id: string;
  name: string;
};

export default function WorkflowEditorPage() {
  const params = useParams();
  const workflowId = params.id as string;
  
  return (
    <div className="flex flex-col h-full">
      <WorkflowEditor workflowId={workflowId} folders={[]} />
    </div>
  );
}
