/**
 * Script to migrate existing node JSON files to the new slot system
 *
 * This script:
 * 1. Reads all JSON files from src/nodes/
 * 2. Adds 'slot' property to all ports (inputs/outputs)
 * 3. Maps old shapes (rectangle, diamond, hexagon) to new format
 * 4. Saves the updated files back
 */

const fs = require('fs');
const path = require('path');

const NODES_DIR = path.join(__dirname, '..', 'src', 'nodes');

// Map old shapes to new format
const shapeMapping = {
  'rectangle': '2x2',
  'diamond': '2x2',
  'hexagon': '2x2',
  'circle': 'circle',
  '1x1': '1x1',
  '1x2': '1x2',
  '1x3': '1x3',
  '2x2': '2x2',
  '2x3': '2x3',
  '3x3': '3x3',
  // Add more as needed
};

/**
 * Auto-assign slot numbers to ports based on position
 */
function assignSlots(ports, portType) {
  const portsByPosition = {};

  ports.forEach(port => {
    const pos = port.position || (portType === 'inputs' ? 'left' : 'right');
    if (!portsByPosition[pos]) {
      portsByPosition[pos] = [];
    }
    portsByPosition[pos].push(port);
  });

  const updatedPorts = [];

  Object.entries(portsByPosition).forEach(([position, portsAtPosition]) => {
    portsAtPosition.forEach((port, index) => {
      updatedPorts.push({
        ...port,
        position: position,
        slot: index + 1, // 1-based slot numbering
      });
    });
  });

  return updatedPorts;
}

/**
 * Process a single node file
 */
function migrateNodeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const node = JSON.parse(content);

    let modified = false;

    // Update shape if using old format
    if (node.shape && shapeMapping[node.shape] && shapeMapping[node.shape] !== node.shape) {
      console.log(`  ├─ Updating shape: ${node.shape} → ${shapeMapping[node.shape]}`);
      node.shape = shapeMapping[node.shape];
      modified = true;
    }

    // Update inputs with slots
    if (node.inputs && Array.isArray(node.inputs)) {
      const needsUpdate = node.inputs.some(port => !port.slot);
      if (needsUpdate) {
        console.log(`  ├─ Adding slots to ${node.inputs.length} input port(s)`);
        node.inputs = assignSlots(node.inputs, 'inputs');
        modified = true;
      }
    }

    // Update outputs with slots
    if (node.outputs && Array.isArray(node.outputs)) {
      const needsUpdate = node.outputs.some(port => !port.slot);
      if (needsUpdate) {
        console.log(`  ├─ Adding slots to ${node.outputs.length} output port(s)`);
        node.outputs = assignSlots(node.outputs, 'outputs');
        modified = true;
      }
    }

    // Save if modified
    if (modified) {
      const updatedContent = JSON.stringify(node, null, 2);
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`  └─ ✅ Saved changes`);
      return true;
    } else {
      console.log(`  └─ ⏭️  No changes needed`);
      return false;
    }

  } catch (error) {
    console.error(`  └─ ❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Main migration function
 */
function migrateAllNodes() {
  console.log('🚀 Starting node migration to slot system...\n');

  const files = fs.readdirSync(NODES_DIR).filter(file => file.endsWith('.json'));

  console.log(`📁 Found ${files.length} node files in ${NODES_DIR}\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  files.forEach((file, index) => {
    console.log(`[${index + 1}/${files.length}] Processing: ${file}`);
    const filePath = path.join(NODES_DIR, file);

    try {
      const wasUpdated = migrateNodeFile(filePath);
      if (wasUpdated) {
        updatedCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      errorCount++;
      console.error(`  └─ ❌ Failed: ${error.message}`);
    }

    console.log('');
  });

  console.log('═══════════════════════════════════════════════════');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Updated: ${updatedCount} files`);
  console.log(`   ⏭️  Skipped: ${skippedCount} files (already up to date)`);
  console.log(`   ❌ Errors:  ${errorCount} files`);
  console.log('═══════════════════════════════════════════════════');

  if (updatedCount > 0) {
    console.log('\n✨ Migration completed successfully!');
  } else {
    console.log('\n✨ All nodes are already up to date!');
  }
}

// Run the migration
migrateAllNodes();
