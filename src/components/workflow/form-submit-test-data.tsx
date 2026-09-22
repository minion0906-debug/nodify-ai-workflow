import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CodeEditor from '../code-editor';

export function FormSubmitTestData({ formId }: { formId: string }) {
  const [testData, setTestData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTestData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/form-calls/${formId}?limit=5`);
      if (response.ok) {
        const data = await response.json();
        setTestData(data.calls || []);
      }
    } catch (error) {
      console.error('Failed to fetch test data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (formId) {
      fetchTestData();
    }
  }, [formId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Recent Submissions</h3>
        <Button onClick={fetchTestData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>
      {testData.length > 0 ? (
        testData.map((call, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>Submission #{call.id}</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeEditor
                value={JSON.stringify(call.body, null, 2)}
                readOnly
                language="json"
              />
            </CardContent>
          </Card>
        ))
      ) : (
        <p>No recent submissions found.</p>
      )}
    </div>
  );
}
