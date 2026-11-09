import fs from 'fs';
import path from 'path';
import { ProcedureSchema } from '../src/types/procedure';
import { buildProcedureGraph } from '../src/lib/graphBuilder';

function generatePublicGraphs() {
  const proceduresDir = path.resolve(process.cwd(), 'data', 'procedures');
  const publicGraphsDir = path.resolve(process.cwd(), 'public', 'graphs');
  fs.mkdirSync(publicGraphsDir, { recursive: true });

  const files = fs.readdirSync(proceduresDir).filter((f) => f.endsWith('.json'));
  console.log(`Building static graphs for ${files.length} procedures...`);

  const manifest: Array<{ id: string; title: string; institution: string; file: string }> = [];

  for (const file of files) {
    const rawContent = fs.readFileSync(path.join(proceduresDir, file), 'utf-8');
    const procedure = ProcedureSchema.parse(JSON.parse(rawContent));

    const graph = buildProcedureGraph(procedure);

    const graphOutput = {
      id: procedure.procedure_id,
      title: procedure.title,
      institution: procedure.institution,
      sourceUrl: procedure.source_url,
      retrieved_at: procedure.retrieved_at,
      verified: procedure.verified,
      nodes: graph.nodes,
      edges: graph.edges,
    };

    const outPath = path.join(publicGraphsDir, `${procedure.procedure_id}.json`);
    fs.writeFileSync(outPath, JSON.stringify(graphOutput, null, 2), 'utf-8');
    console.log(`✓ Generated: public/graphs/${procedure.procedure_id}.json (Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length})`);

    manifest.push({
      id: procedure.procedure_id,
      title: procedure.title,
      institution: procedure.institution,
      file: `${procedure.procedure_id}.json`,
    });
  }

  // Also write manifest so UI can easily list all available static graphs
  fs.writeFileSync(
    path.join(publicGraphsDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );
  console.log('✓ Generated public/graphs/manifest.json');
}

generatePublicGraphs();
