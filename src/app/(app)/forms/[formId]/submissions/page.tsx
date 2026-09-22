'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const formId = params.formId as string;

  useEffect(() => {
    if (formId) {
      fetch(`/api/forms/${formId}/submissions`)
        .then((res) => res.json())
        .then((data) => {
          setSubmissions(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching submissions:', error);
          setLoading(false);
        });
    }
  }, [formId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Form Submissions for {formId}</h1>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Submission ID
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Data
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Files
              </th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr key={submission.id}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{submission.id}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">
                    {new Date(submission.timestamp * 1000).toLocaleString()}
                  </p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <pre className="text-gray-900 whitespace-pre-wrap font-mono text-xs">
                    {JSON.stringify(submission.body, null, 2)}
                  </pre>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  {submission.files && Object.keys(submission.files).length > 0 ? (
                    <ul>
                      {Object.entries(submission.files).map(([key, url]: [string, any]) => (
                        <li key={key}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {key}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No files</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
