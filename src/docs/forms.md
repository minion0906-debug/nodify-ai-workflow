# Creating Forms in Nodify

Nodify's form creation capabilities allow you to design and deploy complex, stylish, and functional forms directly from your workflows. This guide provides a comprehensive overview of the form creation process, the JSON structure, and the various features available.

## Overview

Forms are defined within the `form_submit_trigger` node in your workflow. The entire configuration of a form is stored in the `formFields` property of this node as a JSON object. When a form is submitted, the workflow is triggered, and the submitted data (including uploaded files) is passed into the workflow for processing.

## Form JSON Structure

The main form JSON object has the following top-level properties:

- `fields`: An array of objects, where each object represents a form field.
- `styling`: An object that defines the visual style of the form.
- `layout`: An object that controls the layout and structure of the form.
- `validation`: An object that defines the form-wide validation rules.

### Example Structure

```json
{
  "fields": [
    // ... field objects ...
  ],
  "styling": {
    // ... styling rules ...
  },
  "layout": {
    // ... layout rules ...
  },
  "validation": {
    // ... validation rules ...
  }
}
```

## Fields

The `fields` array contains a list of field objects. Each field object can have the following properties:

| Property | Type | Description |
| --- | --- | --- |
| `name` | `string` | **Required.** The unique name of the field. This will be used as the key in the submitted form data. |
| `type` | `string` | **Required.** The type of the field. See [Field Types](#field-types) for a list of available types. |
| `label` | `string` | The label for the form field. |
| `placeholder` | `string` | The placeholder text for the field. |
| `required` | `boolean` | Whether the field is required. |
| `autoComplete` | `string` | The `autocomplete` attribute for the input field. |
| `pattern` | `string` | A regular expression pattern for validation. |
| `min` / `max` | `number` | The minimum and maximum values for a `number` field. |
| `minLength` / `maxLength` | `number` | The minimum and maximum length for a `text` or `textarea` field. |
| `options` | `array` | An array of option objects for `select` and `radio` fields. |
| `defaultValue` | `any` | The default value for the field. |
| `style` | `object` | An object with CSS properties to apply to the field. |
| `accept` | `string` | For `file` fields, a comma-separated list of accepted file types. |
| `multiple` | `boolean` | For `select` fields, whether multiple options can be selected. |

### Field Types

- `text`: A standard text input.
- `email`: An email input with email validation.
- `tel`: A telephone number input.
- `number`: a number input.
- `textarea`: A multi-line text input.
- `select`: A dropdown menu.
- `checkbox`: A checkbox.
- `radio`: A set of radio buttons.
- `file`: A file upload input. **Note:** Uploaded files are stored in Firebase Storage.
- `submit`: The submit button for the form.

## Styling

The `styling` object allows you to customize the look and feel of your form.

| Property | Type | Description |
| --- | --- | --- |
| `container` | `object` | CSS properties for the main form container. |
| `theme` | `string` | The color theme of the form (`light` or `dark`). |
| `colors` | `object` | An object with color definitions for `primary`, `success`, `error`, `text`, etc. |
| `typography` | `object` | An object with typography settings like `fontFamily`, `fontSize`, etc. |
| `spacing` | `object` | An object with spacing settings like `fieldGap`, `labelMargin`, etc. |

## Layout

The `layout` object controls the arrangement of fields in the form.

| Property | Type | Description |
| --- | --- | --- |
| `type` | `string` | The layout type (`vertical` or `grid`). |
| `columns` | `number` | The number of columns for a `grid` layout. |
| `rowGap` | `string` | The gap between rows in a `grid` layout. |
| `responsive` | `object` | An object with responsive layout settings for different screen sizes. |

## Use Cases

- **Contact Forms:** Create simple or complex contact forms to capture user inquiries.
- **Surveys:** Build detailed surveys with different question types.
- **Registration Forms:** Design registration forms for events or services.
- **Job Applications:** Create job application forms with file uploads for resumes.
- **Data Collection:** Collect any kind of data from users in a structured way.

## File Uploads

When using a field of type `file`, the uploaded file will be automatically stored in your project's Firebase Storage. The form submission data will contain a public URL to the stored file. 

To use this feature, make sure you have set the `FIREBASE_STORAGE_BUCKET` environment variable in your project. You can find this value in your Firebase project console, under **Storage**.
