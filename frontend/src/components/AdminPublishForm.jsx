const FORM_FIELDS = [
  {
    name: "title",
    label: "Story Title",
    placeholder: "Campus placement drive opens for batch 2027",
    helper: "Use a crisp headline. This becomes the story title in Campus Pulse.",
    required: true,
  },
  {
    name: "description",
    label: "Description",
    placeholder:
      "Share the key update in 1-3 sentences, including deadlines or venue if relevant.",
    helper: "Required. Keep it informative and direct so users can scan quickly.",
    required: true,
    multiline: true,
  },
  {
    name: "url",
    label: "Reference URL",
    placeholder: "https://college.edu/notices/placement-drive",
    helper: "Required. Must start with http:// or https://.",
    required: true,
    type: "url",
  },
  {
    name: "sourceName",
    label: "Source Name",
    placeholder: "Placement Cell",
    helper: "Optional. Defaults to Campus Pulse Admin.",
  },
  {
    name: "imageUrl",
    label: "Image URL",
    placeholder: "https://cdn.example.com/placement-drive.jpg",
    helper: "Optional. Article image shown in Campus Pulse cards.",
    type: "url",
  },
  {
    name: "mainImage",
    label: "Main Image URL",
    placeholder: "https://cdn.example.com/cover.jpg",
    helper:
      "Optional fallback image for the story record. Leave empty to reuse Image URL.",
    type: "url",
  },
  {
    name: "publishedAt",
    label: "Publish At",
    helper:
      "Optional. Set a backdated or scheduled timestamp. Leave empty to publish now.",
    type: "datetime-local",
  },
];

export default function AdminPublishForm({
  values,
  errors,
  onFieldChange,
  onSubmit,
  isSubmitting,
}) {
  return (
    <form className="admin-form card" onSubmit={onSubmit} noValidate>
      <div className="admin-form-header">
        <p className="admin-panel-label">// TEMPLATE INPUT</p>
        <p className="admin-panel-subtitle">
          Fill each field to publish a Campus Pulse entry.
        </p>
      </div>

      <div className="admin-form-grid">
        {FORM_FIELDS.map((field) => {
          const hasError = Boolean(errors[field.name]);
          const fieldClassName = `admin-field ${field.multiline ? "admin-field--full" : ""} ${
            field.name === "publishedAt" ? "admin-field--compact" : ""
          }`;

          return (
            <div key={field.name} className={fieldClassName.trim()}>
              <label htmlFor={`admin-${field.name}`} className="admin-field-label">
                {field.label}
                {field.required ? <span className="admin-required"> *</span> : null}
              </label>

              {field.multiline ? (
                <textarea
                  id={`admin-${field.name}`}
                  className={`admin-input admin-textarea ${hasError ? "is-error" : ""}`}
                  value={values[field.name]}
                  placeholder={field.placeholder}
                  rows={4}
                  onChange={(event) => onFieldChange(field.name, event.target.value)}
                  aria-invalid={hasError}
                />
              ) : (
                <input
                  id={`admin-${field.name}`}
                  className={`admin-input ${hasError ? "is-error" : ""}`}
                  type={field.type || "text"}
                  value={values[field.name]}
                  placeholder={field.placeholder}
                  onChange={(event) => onFieldChange(field.name, event.target.value)}
                  aria-invalid={hasError}
                />
              )}

              <p className="admin-field-help">{field.helper}</p>
              {hasError ? <p className="admin-field-error">{errors[field.name]}</p> : null}
            </div>
          );
        })}
      </div>

      <div className="admin-form-actions">
        <button type="submit" className="btn btn--green" disabled={isSubmitting}>
          <span>{isSubmitting ? "Publishing..." : "Publish Campus Pulse"}</span>
        </button>
      </div>
    </form>
  );
}
