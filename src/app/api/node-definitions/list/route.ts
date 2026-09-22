
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { CustomNode } from '@/lib/custom-nodes-types';

const nodesDirectory = path.join(process.cwd(), 'src', 'nodes');

// GET handler to list all node definitions
export async function GET() {
  try {
    const files = await fs.readdir(nodesDirectory);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    const allNodes: CustomNode[] = [];

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(nodesDirectory, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const nodeData = JSON.parse(fileContent) as CustomNode;
        allNodes.push(nodeData);
      } catch (parseError) {
        console.error(`[API] Failed to parse node file ${file}:`, parseError);
        // Skip corrupted files
      }
    }

    return NextResponse.json(allNodes);
  } catch (error) {
    console.error('[API] Failed to list nodes:', error);
    // If the directory doesn't exist, return an empty array
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json([]);
    }
    return NextResponse.json({ error: 'Failed to list node definitions' }, { status: 500 });
  }
}

// DELETE handler to delete a node definition
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Node ID is required' }, { status: 400 });
    }

    // Basic validation to prevent directory traversal
    if (id.includes('..') || id.includes('/')) {
        return NextResponse.json({ error: 'Invalid Node ID' }, { status: 400 });
    }

    try {
        const jsonFilePath = path.join(nodesDirectory, `${id}.json`);
        const jsFilePath = path.join(nodesDirectory, `${id}.js`);

        // Delete the JSON file
        await fs.unlink(jsonFilePath);

        // Try to delete the associated JS file, but don't fail if it doesn't exist
        try {
            await fs.unlink(jsFilePath);
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.warn(`[API] Could not delete JS file for node ${id}:`, error);
            }
        }

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return NextResponse.json({ error: 'Node not found' }, { status: 404 });
        }
        console.error(`[API] Failed to delete node ${id}:`, error);
        return NextResponse.json({ error: 'Failed to delete node definition' }, { status: 500 });
    }
}
