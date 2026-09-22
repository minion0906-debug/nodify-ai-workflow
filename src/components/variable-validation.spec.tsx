import React from 'react';
import { render, screen } from '@testing-library/react';
import CodeEditor from './code-editor';

describe('CodeEditor Variable Validation', () => {
  it('should apply valid and invalid styles to expressions', () => {
    const executionContext = {
      'Start Node': {
        input: {},
        output: { name: 'John Doe', email: 'john.doe@example.com' },
      },
    };

    render(
      <CodeEditor
        value="<p>Hello {{data.name}}!</p><p>Invalid: {{data.nonexistent}}</p>"
        onChange={() => {}}
        node={null}
        allNodes={[]}
        executionContext={executionContext}
        language="nodifyLang"
      />
    );

    // Wait for decorations to be applied
    setTimeout(() => {
      const validExpression = screen.getByText('{{data.name}}');
      const invalidExpression = screen.getByText('{{data.nonexistent}}');

      expect(validExpression).toHaveClass('variable-valid');
      expect(invalidExpression).toHaveClass('variable-invalid');
    }, 500); // Wait for debounce
  });
});
