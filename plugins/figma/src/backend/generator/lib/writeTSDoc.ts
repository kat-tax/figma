import CodeBlockWriter from 'code-block-writer';

const PROPERTY_LIST_START = '[Properties]';

export type TSDocInfo = {
  value: string,
  properties: Record<string, string>,
};

export function writeTSDoc(
  writer: CodeBlockWriter,
  component: ComponentNode,
): TSDocInfo {

  if (!component?.description) return;
  
  const properties: Record<string, string> = {};
  let isInPropertyList = false;
  let lastLineWasEmpty = false;

  // Write start of comment block
  writer.writeLine(`/**`);

  // Process each line of the description
  component.description.split('\n').forEach((line: string, index: number, lines: string[]) => {
    // Entered property list (everything now is a prop entry)
    if (line.trim() === PROPERTY_LIST_START) {
      isInPropertyList = true;
    // Property description parsing
    } else if (isInPropertyList) {
      const {prop, desc} = parsePropsListEntry(line);
      if (prop) {
        properties[prop] = desc;
      }
    // Regular comment block line
    } else {
      const isEmpty = line.trim() === '';
      if (!isEmpty || (!lastLineWasEmpty && !isPropsNext(index, lines)))
        writer.writeLine(` * ${line.trimEnd()}`);
      lastLineWasEmpty = isEmpty;
    }
  });

  // Write documentation link
  if (component?.documentationLinks?.length > 0) {
    writer.writeLine(' *');
    writer.writeLine(` * @link ${component.documentationLinks[0].uri}`);
  }

  // TODO: Generate example (same as doc)

  // Write end of comment block
  writer.writeLine(` */`);

  return {
    value: writer.toString(),
    properties,
  };
}

function parsePropsListEntry(line: string) {
  if (line.trim() === '') return {prop: '', description: []};
  const [prop, ...words] = line.trim().split(' ');
  return {prop, desc: words.join(' ')};
}

function isPropsNext(index: number, lines: string[]) {
  // Check if the next non-empty lines are "[Properties]"
  for (let i = index + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === PROPERTY_LIST_START)
      return true;
    if (line !== '')
      return false;
  }
  return false;
}