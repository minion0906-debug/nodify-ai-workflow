import { notFound } from 'next/navigation';
import { formRegistry } from '@/lib/db/sqlite';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase Client SDK for server-side usage
let clientDb: any = null;

if (!getApps().length) {
  const app = initializeApp(firebaseConfig);
  clientDb = getFirestore(app);
} else {
  const app = getApps()[0];
  clientDb = getFirestore(app);
}

// Helper function to render individual form fields
const renderField = (field: any) => {
  const { name, type, label, placeholder, required, autoComplete, pattern, min, max, options, rows, minLength, maxLength, accept, multiple, defaultValue, style } = field;

  const commonProps = {
    id: name,
    name: name,
    placeholder: placeholder,
    required: required,
    autoComplete: autoComplete,
    pattern: pattern,
    style: style,
    className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  };

  switch (type) {
    case 'textarea':
      return (
        <textarea
          {...commonProps}
          rows={rows}
          minLength={minLength}
          maxLength={maxLength}
        />
      );
    case 'select':
      return (
        <select {...commonProps} multiple={multiple}>
          {placeholder && <option value="">{placeholder}</option>}
          {options?.map((option: any) => (
            <option key={option.value} value={option.value} selected={option.selected}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case 'checkbox':
      return (
        <div className="flex items-center">
          <input
            {...commonProps}
            type="checkbox"
            defaultChecked={defaultValue}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor={name} className="ml-2 block text-sm text-gray-900">
            {label}
          </label>
        </div>
      );
    case 'radio':
      return (
        <div>
          <label className="block text-gray-700 font-medium mb-2">{label}</label>
          {options?.map((option: any) => (
            <div key={option.value} className="flex items-center mb-2">
              <input
                id={`${name}-${option.value}`}
                name={name}
                type="radio"
                value={option.value}
                defaultChecked={option.selected}
                required={required}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor={`${name}-${option.value}`} className="ml-2 block text-sm text-gray-900">
                {option.label}
              </label>
            </div>
          ))}
        </div>
      );
    case 'file':
      return (
        <input
          {...commonProps}
          type="file"
          accept={accept}
        />
      );
    case 'submit':
        return null; // Submit button is handled separately
    default:
      return (
        <input
          {...commonProps}
          type={type || 'text'}
          min={min}
          max={max}
        />
      );
  }
};

async function FormPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;

  if (!formId) {
    return notFound();
  }

  const formInfo = formRegistry.getById(formId);

  if (!formInfo) {
    return notFound();
  }

  const workflowRef = doc(clientDb, 'users', formInfo.user_id, 'workflows', formInfo.workflow_id);
  const workflowSnap = await getDoc(workflowRef);

  if (!workflowSnap.exists()) {
    return notFound();
  }

  const workflowData = workflowSnap.data();
  const formNode = workflowData.nodes.find((n: any) => n.type === 'form_submit_trigger' && n.config?.formId === formId);

  if (!formNode) {
    return notFound();
  }

  const { formName, formFields, successMessage, redirectUrl } = formNode.config;

  let fields = [];
  let styling: any = {};
  let layout: any = {};
  let submitButton: any = null;

  if (typeof formFields === 'string') {
    try {
      const parsed = JSON.parse(formFields);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.fields)) {
          fields = parsed.fields;
        }
        if (parsed.styling) {
          styling = parsed.styling;
        }
        if (parsed.layout) {
            layout = parsed.layout;
        }
      } else if (Array.isArray(parsed)) {
        fields = parsed;
      }
    } catch (e) {
      // ignore
    }
  } else if (formFields && typeof formFields === 'object') {
    if (Array.isArray(formFields.fields)) {
      fields = formFields.fields;
    }
    if (formFields.styling) {
      styling = formFields.styling;
    }
    if (formFields.layout) {
        layout = formFields.layout;
    }
  }

  const submitField = fields.find((f:any) => f.type === 'submit');
  if (submitField) {
    submitButton = (
        <button
            type="submit"
            style={submitField.style}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
            {submitField.label || 'Submit'}
        </button>
    )
  }


  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center" style={styling.background ? {backgroundColor: styling.colors.background} : {}}>
      <div style={styling.container}>
        <h1 className="text-2xl font-bold mb-6 text-center" style={styling.typography ? {fontFamily: styling.typography.fontFamily, fontSize: '2rem'} : {}}>{formName || 'Form'}</h1>
        <form action={`/api/form/prod/${formId}`} method="POST" encType="multipart/form-data">
          <div style={layout.columns ? {display: 'grid', gridTemplateColumns: `repeat(${layout.columns}, 1fr)`, gap: layout.rowGap} : {}}>
            {fields.map((field: any) => (
                field.type !== 'submit' && (
                    <div key={field.name} className="mb-4" style={layout.columns ? {} : {marginBottom: styling.spacing?.fieldGap}}>
                    {field.type !== 'checkbox' && (
                        <label htmlFor={field.name} className="block text-gray-700 font-medium mb-2" style={styling.typography ? {fontFamily: styling.typography.fontFamily, fontSize: styling.typography.labelFontSize, fontWeight: styling.typography.labelFontWeight, marginBottom: styling.spacing?.labelMargin} : {}}>
                        {field.label || field.name}
                        </label>
                    )}
                    {renderField(field)}
                    </div>
                )
            ))}
          </div>
          {submitButton}
        </form>
      </div>
    </div>
  );
}

export default FormPage;